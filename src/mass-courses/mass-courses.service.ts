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
    const { page = '1', limit = '10', search = '' } = query;
    const baseUrl = this.configService.get<string>('MASS_BASE_API_URL');
    const privateKey = this.configService.get<string>('MASS_PRIVATE_KEY');

    const url = `${baseUrl}/course-service/mass-courses?page=${page}&limit=${limit}&search=${search}`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-Private-key': privateKey,
        },
      }),
    );
    return response.data;
  }
}
