import { Injectable } from '@nestjs/common';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto';

/**
 * TODO: scaffold của Nest CLI, chưa implement — mọi method vẫn trả về chuỗi
 * placeholder. Module đang được đăng ký trong AppModule nên các endpoint này
 * đang live. Cần implement hoặc gỡ module đi.
 *
 * Tham số DTO phải giữ trong signature vì controller đang truyền vào, nên
 * no-unused-vars được tắt đúng tại chỗ thay vì nới rule toàn repo.
 */
@Injectable()
export class CourseSessionsService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(createCourseSessionDto: CreateCourseSessionDto) {
    return 'This action adds a new courseSession';
  }

  findAll() {
    return `This action returns all courseSessions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} courseSession`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, updateCourseSessionDto: UpdateCourseSessionDto) {
    return `This action updates a #${id} courseSession`;
  }

  remove(id: number) {
    return `This action removes a #${id} courseSession`;
  }
}
