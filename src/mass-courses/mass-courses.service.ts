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

  private async fetchAccountsRecursively(
    baseUrl: string,
    privateKey: string,
    page = 1,
    limit = 1000,
  ): Promise<any[]> {
    const url = `${baseUrl}/account-service/mass-account?page=${page}&limit=${limit}`;
    const res = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-Private-key': privateKey,
        },
      }),
    );

    const items = res.data?.data?.items ?? [];

    if (items.length === limit) {
      const nextItems = await this.fetchAccountsRecursively(
        baseUrl,
        privateKey,
        page + 1,
        limit,
      );
      return [...items, ...nextItems];
    }

    return items;
  }

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

    const allAccounts = await this.fetchAccountsRecursively(
      baseUrl,
      privateKey,
    );

    const emailToAccount = new Map(
      allAccounts
        .filter((acc) => acc.email)
        .map((acc) => [acc.email.toLowerCase(), acc]),
    );

    const enrichedCourses = courses.map((course: any) => {
      const enrichedEnrolled = (course.MassEnrolled ?? []).map(
        (enroll: any) => {
          const email = enroll.account?.email?.toLowerCase();
          const account = email ? emailToAccount.get(email) : null;

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
