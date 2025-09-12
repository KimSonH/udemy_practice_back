import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { GetCoursesDto } from './dto/createMassCourse';
import {
  Account,
  Course,
  Enrolled,
  PaginatedResponse,
} from './types/mass-courses.types';

@Injectable()
export class MassCoursesService {
  private readonly logger = new Logger(MassCoursesService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private async fetchAllAccounts(
    baseUrl: string,
    privateKey: string,
    limit = 200,
  ): Promise<Account[]> {
    const firstUrl = `${baseUrl}/account-service/mass-account?page=1&limit=${limit}`;
    const firstRes = await firstValueFrom(
      this.httpService
        .get<PaginatedResponse<Account>>(firstUrl, {
          headers: {
            'Content-Type': 'application/json',
            'x-Private-key': privateKey,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new InternalServerErrorException(
              'Error fetching accounts (page 1)',
            );
          }),
        ),
    );

    const firstItems = firstRes.data?.data?.items ?? [];
    const totalData = firstRes.data?.data?.totalData ?? firstItems.length;
    const totalPages = Math.ceil(totalData / limit);

    if (totalPages <= 1) {
      return firstItems;
    }

    const requests: Promise<Account[]>[] = [];
    for (let page = 2; page <= totalPages; page++) {
      const url = `${baseUrl}/account-service/mass-account?page=${page}&limit=${limit}`;
      requests.push(
        firstValueFrom(
          this.httpService
            .get<PaginatedResponse<Account>>(url, {
              headers: {
                'Content-Type': 'application/json',
                'x-Private-key': privateKey,
              },
            })
            .pipe(
              catchError((error: AxiosError) => {
                this.logger.error(
                  `Error fetching accounts (page ${page}):`,
                  error.response?.data,
                );
                throw new InternalServerErrorException(
                  `Error fetching accounts (page ${page})`,
                );
              }),
            ),
        ).then((res) => res.data?.data?.items ?? []),
      );
    }

    const results = await Promise.all(requests);
    return [...firstItems, ...results.flat()];
  }

  async getMassCourses(query: GetCoursesDto) {
    const { page = '0', limit = '12', search = '', category = '' } = query;
    const baseUrl = this.configService.get<string>('MASS_BASE_API_URL');
    const privateKey = this.configService.get<string>('MASS_PRIVATE_KEY');

    const url = `${baseUrl}/course-service/mass-courses?page=${page}&limit=${limit}&search=${search}&category=${category}`;
    const response = await firstValueFrom(
      this.httpService
        .get<PaginatedResponse<Course>>(url, {
          headers: {
            'Content-Type': 'application/json',
            'x-Private-key': privateKey,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new InternalServerErrorException('Error fetching courses');
          }),
        ),
    );

    const courses: Course[] = response.data?.data?.items || [];

    const allAccounts = await this.fetchAllAccounts(baseUrl, privateKey);

    const emailToAccount = new Map<string, Account>(
      allAccounts
        .filter((acc) => acc.email)
        .map((acc) => [acc.email.toLowerCase(), acc]),
    );

    const enrichedCourses: Course[] = courses.map((course) => {
      const enrichedEnrolled: Enrolled[] = (course.MassEnrolled ?? []).map(
        (enroll) => {
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
