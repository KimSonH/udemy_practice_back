import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CourseResource } from './entities/course-resource.entity';
import { Course } from 'src/courses/entities/courses.entity';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';
import { CreateCourseResourceDto } from './dto/create-course-resource.dto';
import { UpdateCourseResourceDto } from './dto/update-course-resource.dto';
import { ReorderCourseResourcesDto } from './dto/reorder-course-resources.dto';
import { generateUniqueSlug } from 'src/utils/slug';
import { CourseResourceAccessLevel } from './course-resource.constants';

@Injectable()
export class CourseResourcesService {
  private logger = new Logger(CourseResourcesService.name);

  constructor(
    @InjectRepository(CourseResource)
    private readonly courseResourceRepository: Repository<CourseResource>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(UserCourse)
    private readonly userCourseRepository: Repository<UserCourse>,
  ) {}

  private async ensureCourseExists(courseId: number): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course id=${courseId} not found`);
    }
  }

  private async resolveSlug(
    courseId: number,
    title: string,
    requestedSlug?: string,
    ignoreResourceId?: number,
  ): Promise<string> {
    // generateUniqueSlug already runs generateSlug (transliterate + normalize),
    // so pass the raw seed and let it normalize once.
    const seed = requestedSlug || title;
    return generateUniqueSlug(seed, async (slug) => {
      const existing = await this.courseResourceRepository.findOne({
        where: { slug, course: { id: courseId } },
      });
      return !!existing && existing.id !== ignoreResourceId;
    });
  }

  // ---------- Admin ----------

  async create(courseId: number, dto: CreateCourseResourceDto) {
    await this.ensureCourseExists(courseId);
    try {
      const slug = await this.resolveSlug(courseId, dto.title, dto.slug);
      // Dùng max(order)+1 thay vì count() để tránh trùng order sau khi có bản
      // ghi bị soft-delete (count bỏ qua bản đã xóa nên có thể tái dùng order).
      const last = await this.courseResourceRepository.findOne({
        where: { course: { id: courseId } },
        order: { order: 'DESC' },
      });
      const order = dto.order ?? (last ? last.order + 1 : 0);

      const resource = this.courseResourceRepository.create({
        title: dto.title,
        slug,
        html: dto.html ?? '',
        isVisible: dto.isVisible ?? false,
        accessLevel: dto.accessLevel ?? 'private',
        order,
        course: { id: courseId } as Course,
      });
      return await this.courseResourceRepository.save(resource);
    } catch (error) {
      this.logger.error(`Error creating course resource: ${error.message}`);
      throw new BadRequestException('Error creating course resource');
    }
  }

  async findAllByCourseForAdmin(courseId: number) {
    await this.ensureCourseExists(courseId);
    return this.courseResourceRepository.find({
      where: { course: { id: courseId } },
      order: { order: 'ASC', id: 'ASC' },
    });
  }

  async findOneForAdmin(courseId: number, id: number) {
    const resource = await this.courseResourceRepository.findOne({
      where: { id, course: { id: courseId } },
    });
    if (!resource) {
      throw new NotFoundException('Course resource not found');
    }
    return resource;
  }

  async update(courseId: number, id: number, dto: UpdateCourseResourceDto) {
    const resource = await this.findOneForAdmin(courseId, id);
    try {
      if (dto.title !== undefined) resource.title = dto.title;
      if (dto.html !== undefined) resource.html = dto.html;
      if (dto.isVisible !== undefined) resource.isVisible = dto.isVisible;
      if (dto.accessLevel !== undefined) resource.accessLevel = dto.accessLevel;
      if (dto.order !== undefined) resource.order = dto.order;
      if (dto.slug !== undefined || dto.title !== undefined) {
        resource.slug = await this.resolveSlug(
          courseId,
          resource.title,
          dto.slug ?? resource.slug,
          resource.id,
        );
      }
      return await this.courseResourceRepository.save(resource);
    } catch (error) {
      this.logger.error(`Error updating course resource: ${error.message}`);
      throw new BadRequestException('Error updating course resource');
    }
  }

  async setVisibility(courseId: number, id: number, isVisible: boolean) {
    const resource = await this.findOneForAdmin(courseId, id);
    resource.isVisible = isVisible;
    return this.courseResourceRepository.save(resource);
  }

  async reorder(courseId: number, dto: ReorderCourseResourcesDto) {
    const ids = dto.items.map((i) => i.id);
    const resources = await this.courseResourceRepository.find({
      where: { id: In(ids), course: { id: courseId } },
    });
    if (resources.length !== ids.length) {
      throw new BadRequestException(
        'Một số resource không thuộc course này hoặc không tồn tại',
      );
    }
    const orderById = new Map(dto.items.map((i) => [i.id, i.order]));
    for (const resource of resources) {
      resource.order = orderById.get(resource.id) ?? resource.order;
    }
    return this.courseResourceRepository.save(resources);
  }

  async remove(courseId: number, id: number) {
    const resource = await this.findOneForAdmin(courseId, id);
    await this.courseResourceRepository.softRemove(resource);
    return { id };
  }

  // ---------- Public ----------

  private async userOwnsCourse(
    courseId: number,
    userId?: number,
  ): Promise<boolean> {
    if (!userId) return false;
    const owned = await this.userCourseRepository.findOne({
      where: { courseId, userId, status: 'completed' },
    });
    return !!owned;
  }

  // Quyết định quyền truy cập thuần (không I/O): `owns` là kết quả kiểm tra sở
  // hữu đã tính sẵn, để caller chỉ query user_course tối đa 1 lần.
  private hasAccess(
    accessLevel: CourseResourceAccessLevel,
    userId: number | undefined,
    owns: boolean,
  ): boolean {
    switch (accessLevel) {
      case 'public':
        return true;
      case 'logged_in':
        return !!userId;
      case 'paid':
        return owns;
      case 'private':
      default:
        return false;
    }
  }

  async findVisibleByCourse(courseId: number, userId?: number) {
    await this.ensureCourseExists(courseId);
    const resources = await this.courseResourceRepository.find({
      where: { course: { id: courseId }, isVisible: true },
      order: { order: 'ASC', id: 'ASC' },
    });

    // Kiểm tra sở hữu 1 lần cho cả danh sách (tránh N+1 khi có nhiều resource 'paid').
    const owns = resources.some((r) => r.accessLevel === 'paid')
      ? await this.userOwnsCourse(courseId, userId)
      : false;

    return (
      resources
        .filter((r) => this.hasAccess(r.accessLevel, userId, owns))
        // Không trả html trong danh sách để tiết kiệm payload
        .map(({ html: _html, ...rest }) => rest)
    );
  }

  async findVisibleBySlug(courseId: number, slug: string, userId?: number) {
    const resource = await this.courseResourceRepository.findOne({
      where: { course: { id: courseId }, slug, isVisible: true },
    });
    if (!resource) {
      throw new NotFoundException('Course resource not found');
    }
    const owns =
      resource.accessLevel === 'paid'
        ? await this.userOwnsCourse(courseId, userId)
        : false;
    if (!this.hasAccess(resource.accessLevel, userId, owns)) {
      // 'private' là tài liệu chỉ dành cho admin: trả 404 để không lộ sự tồn
      // tại và không gợi ý sai "đăng nhập/mua". Các mức khác trả 403.
      if (resource.accessLevel === 'private') {
        throw new NotFoundException('Course resource not found');
      }
      throw new ForbiddenException(
        'You do not have permission to view this resource',
      );
    }
    return resource;
  }
}
