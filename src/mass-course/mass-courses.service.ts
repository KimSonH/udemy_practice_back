
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GetCoursesDto } from './dto/createMassCourse';

@Injectable()
export class ExternalCourseService {
  constructor(private readonly httpService: HttpService) {}

  async getMassCourses(query: GetCoursesDto) {
    const { page = '1', limit = '10', search = '' } = query;
    const url = `http://localhost:3304/api/course-service/mass-courses?page=${page}&limit=${limit}&search=${search}`;

    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }
}
