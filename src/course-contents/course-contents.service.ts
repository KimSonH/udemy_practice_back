import { Injectable } from '@nestjs/common';
import { CreateCourseContentDto } from './dto/create-course-content.dto';
import { UpdateCourseContentDto } from './dto/update-course-content.dto';

/**
 * TODO: scaffold của Nest CLI, chưa implement — mọi method vẫn trả về chuỗi
 * placeholder. Module đang được đăng ký trong AppModule nên các endpoint này
 * đang live. Cần implement hoặc gỡ module đi.
 *
 * Tham số DTO phải giữ trong signature vì controller đang truyền vào, nên
 * no-unused-vars được tắt đúng tại chỗ thay vì nới rule toàn repo.
 */
@Injectable()
export class CourseContentsService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(createCourseContentDto: CreateCourseContentDto) {
    return 'This action adds a new courseContent';
  }

  findAll() {
    return `This action returns all courseContents`;
  }

  findOne(id: number) {
    return `This action returns a #${id} courseContent`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, updateCourseContentDto: UpdateCourseContentDto) {
    return `This action updates a #${id} courseContent`;
  }

  remove(id: number) {
    return `This action removes a #${id} courseContent`;
  }
}
