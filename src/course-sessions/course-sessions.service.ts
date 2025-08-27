import { Injectable } from '@nestjs/common';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto';

@Injectable()
export class CourseSessionsService {
  create(createCourseSessionDto: CreateCourseSessionDto) {
    return 'This action adds a new courseSession';
  }

  findAll() {
    return `This action returns all courseSessions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} courseSession`;
  }

  update(id: number, updateCourseSessionDto: UpdateCourseSessionDto) {
    return `This action updates a #${id} courseSession`;
  }

  remove(id: number) {
    return `This action removes a #${id} courseSession`;
  }
}
