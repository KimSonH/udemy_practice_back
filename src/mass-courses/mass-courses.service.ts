import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { GetCoursesDto } from './dto/createMassCourse';
import { AxiosError } from 'axios';

@Injectable()
export class MassCoursesService {
  private readonly logger = new Logger(MassCoursesService.name);

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
    const { data } = await firstValueFrom(
      this.httpService
        .get(url, {
          headers: {
            'Content-Type': 'application/json',
            'x-Private-key': privateKey,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new InternalServerErrorException('An error happened!');
          }),
        ),
    );

    const items = data?.data?.items ?? [];

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
    const { data } = await firstValueFrom(
      this.httpService
        .get(url, {
          headers: {
            'Content-Type': 'application/json',
            'x-Private-key': privateKey,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new InternalServerErrorException('An error happened!');
          }),
        ),
    );

    const courses = data?.data?.items || [];

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
      ...data,
      data: {
        ...data.data,
        totalData: data.data?.totalData ?? 0,
        items: enrichedCourses,
      },
    };
  }
}
