import { Injectable } from '@nestjs/common';
import { CreateCourseContentDto } from './dto/create-course-content.dto';
import { UpdateCourseContentDto } from './dto/update-course-content.dto';

@Injectable()
export class CourseContentsService {
  create(createCourseContentDto: CreateCourseContentDto) {
    return 'This action adds a new courseContent';
  }

  findAll() {
    return `This action returns all courseContents`;
  }

  findOne(id: number) {
    return `This action returns a #${id} courseContent`;
  }

  update(id: number, updateCourseContentDto: UpdateCourseContentDto) {
    return `This action updates a #${id} courseContent`;
  }

  remove(id: number) {
    return `This action removes a #${id} courseContent`;
  }
}
