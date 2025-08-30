import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GetCoursesDto } from './dto/createMassCourse';

@Injectable()
export class MassCoursesService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getMassCourses(query: GetCoursesDto) {
    const { page = '0', limit = '12', search = '', category = '' } = query;

    const baseUrl = this.configService.get<string>('MASS_BASE_API_URL');
    const privateKey = this.configService.get<string>('MASS_PRIVATE_KEY');

    const url = `${baseUrl}/course-service/mass-courses?page=${page}&limit=${limit}&search=${search}&category=${category}`;
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-Private-key': privateKey,
        },
      }),
    );

    const courses = response.data?.data?.items || [];

    const emails = new Set<string>();
    courses.forEach((course: any) => {
      (course.MassEnrolled ?? []).forEach((enroll: any) => {
        if (enroll.account?.email) {
          emails.add(enroll.account.email);
        }
      });
    });

    const accountResults = await Promise.allSettled(
      Array.from(emails).map(async (email) => {
        const accUrl = `${baseUrl}/account-service/mass-account?search=${email}`;
        const accRes = await firstValueFrom(
          this.httpService.get(accUrl, {
            headers: {
              'Content-Type': 'application/json',
              'x-Private-key': privateKey,
            },
          }),
        );
        const account = accRes.data?.data?.items?.[0] ?? null;
        return { email, account };
      }),
    );

    const emailToAccount = new Map<string, any>();
    accountResults.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.account) {
        emailToAccount.set(r.value.email, r.value.account);
      }
    });

    const enrichedCourses = courses.map((course: any) => {
      const enrichedEnrolled = (course.MassEnrolled ?? []).map(
        (enroll: any) => {
          const account = emailToAccount.get(enroll.account?.email);
          return {
            account: {
              ...enroll.account,
              account_id: account?.id ?? null,
              email: account?.email ?? enroll.account?.email,
              isMatched: !!account,
            },
          };
        },
      );
      return { ...course, MassEnrolled: enrichedEnrolled };
    });

    return {
      ...response.data,
      data: {
        ...response.data.data,
        totalData: response.data.data?.totalData ?? 0,
        items: enrichedCourses,
      },
    };
  }
}
