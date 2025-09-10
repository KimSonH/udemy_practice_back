import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Course } from './entities/courses.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  QueryRunner,
  ILike,
  In,
  Brackets,
} from 'typeorm';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UdemyQuestionBanksService } from 'src/udemyQuestionBanks/udemy-question-banks.service';
import { CourseSetsService } from 'src/course-sets/course-sets.service';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
import { PaginationParams } from 'src/common/pagination.type';
import { QuestionDistributionOptions } from './interface';
import { normalize, join } from 'path';
import * as fs from 'fs';
import { Organization } from 'src/organizations/entities/organization.entity';
import { generateUniqueSlug } from 'src/utils/slug';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { VideoCourseDto } from './dto/create-video-course.dto';
import { CourseSession } from 'src/course-sessions/entities/course-session.entity';
import { CourseContent } from 'src/course-contents/entities/course-content.entity';
@Injectable()
export class CoursesService {
  private logger = new Logger(CoursesService.name);
  private readonly BATCH_SIZE = 1000;
  private relations = [
    'courseSets',
    'courseSets.udemyQuestionBanks',
    'organization',
    'courseSessions',
    'courseSessions.courseContents',
  ];

  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    private readonly courseSetsService: CourseSetsService,
    private readonly udemyQuestionBanksService: UdemyQuestionBanksService,
    private readonly organizationsService: OrganizationsService,
    private readonly dataSource: DataSource,
  ) {}

  // Helper method để shuffle mảng (Fisher-Yates algorithm)
  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Refactored: Phân phối và mượn câu hỏi trong 1 hàm duy nhất, loại bỏ các hàm phụ không cần thiết
  async distributeQuestions(
    categoryName: string,
    totalSets: number,
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
    questionsPerSet: number,
  ) {
    totalSets = totalSets || 6;
    questionsPerSet = questionsPerSet || 120;
    this.logger.log(
      `Bắt đầu phân phối với: totalSets=${totalSets}, questionsPerSet=${questionsPerSet}`,
    );
    const { questions: allQuestions, total: totalQuestions } =
      await this.udemyQuestionBanksService.findAllByCategoryName(categoryName);
    this.logger.log(`Tổng số câu hỏi có sẵn: ${totalQuestions}`);
    const totalNeeded = totalSets * questionsPerSet;
    const minNeeded = Math.floor(totalNeeded * 0.8);
    if (totalQuestions < minNeeded) {
      throw new BadRequestException(
        `Bạn đang yêu cầu ${totalNeeded} câu hỏi, cần ít nhất 80% của ${totalQuestions} câu hỏi.`,
      );
    }
    // Xóa câu hỏi cũ nếu có (dành cho update)
    const courseSetIds = courseSets.map((set) => set.id).join(',');
    await queryRunner.manager.query(
      `DELETE FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" IN (${courseSetIds})`,
    );
    // Phân phối đều nếu đủ
    if (totalQuestions >= totalNeeded) {
      const shuffledQuestions = [...allQuestions];
      this.shuffleArray(shuffledQuestions);
      let usedIdx = 0;
      for (let i = 0; i < totalSets; i++) {
        const setQuestions = shuffledQuestions.slice(
          usedIdx,
          usedIdx + questionsPerSet,
        );
        if (setQuestions.length < questionsPerSet) {
          throw new BadRequestException(
            `Không đủ câu hỏi không trùng lặp cho set ${i + 1}`,
          );
        }
        usedIdx += questionsPerSet;
        const relations = setQuestions.map((question) => ({
          courseSetId: courseSets[i].id,
          udemyQuestionBankId: question.id,
        }));
        await this.batchInsertQuestions(relations, queryRunner);
      }
      return;
    }
    // Nếu thiếu, phân phối đều nhất có thể, sau đó mượn
    const baseQuestionsPerSet = Math.floor(totalQuestions / totalSets);
    const remainder = totalQuestions % totalSets;
    let allRelations = [];
    let questionIndex = 0;
    for (let i = 0; i < totalSets; i++) {
      const setQuestionCount = baseQuestionsPerSet + (i < remainder ? 1 : 0);
      const setQuestions = allQuestions.slice(
        questionIndex,
        questionIndex + setQuestionCount,
      );
      questionIndex += setQuestionCount;
      if (setQuestions.length === 0) {
        throw new BadRequestException(
          `Không có câu hỏi để phân phối cho Set ${i + 1}`,
        );
      }
      const relations = setQuestions.map((question) => ({
        courseSetId: courseSets[i].id,
        udemyQuestionBankId: question.id,
      }));
      allRelations.push(...relations);
    }
    if (allRelations.length > 0) {
      await this.batchInsertQuestions(allRelations, queryRunner);
    }
    // Mượn cho từng set nếu thiếu
    for (let i = 0; i < totalSets; i++) {
      const currentCountRes = await queryRunner.manager.query(
        `SELECT COUNT(*) FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
        [courseSets[i].id],
      );
      let shortage = questionsPerSet - parseInt(currentCountRes[0].count);
      if (shortage <= 0) continue;
      // Mượn câu hỏi chưa có trong set này, ưu tiên câu hỏi ít xuất hiện nhất
      const availableQuestions = await queryRunner.manager.query(
        `WITH CurrentSetQuestions AS (
            SELECT "udemyQuestionBankId" FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1
        ),
        QuestionUsage AS (
            SELECT q.id, COUNT(DISTINCT csq."courseSetId") as usage_count
            FROM udemy_question_bank q
            LEFT JOIN course_set_udemy_question_banks_udemy_question_bank csq ON q.id = csq."udemyQuestionBankId"
            WHERE q."categoryName" = $2
            GROUP BY q.id
        )
        SELECT q.id FROM udemy_question_bank q
        LEFT JOIN QuestionUsage qu ON q.id = qu.id
        WHERE q."categoryName" = $2
        AND q.id NOT IN (SELECT "udemyQuestionBankId" FROM CurrentSetQuestions)
        ORDER BY COALESCE(qu.usage_count, 0) ASC, RANDOM()
        LIMIT $3`,
        [courseSets[i].id, categoryName, shortage],
      );
      if (availableQuestions.length < shortage) {
        throw new BadRequestException(
          `Không thể mượn đủ câu hỏi cho set ${i + 1}. Còn thiếu ${shortage - availableQuestions.length} câu hỏi.`,
        );
      }
      const borrowRelations = availableQuestions.map((q) => ({
        courseSetId: courseSets[i].id,
        udemyQuestionBankId: q.id,
      }));
      await this.batchInsertQuestions(borrowRelations, queryRunner);
    }
    // Kiểm tra trùng lặp trong từng set
    const duplicates = await queryRunner.manager.query(`
      WITH DuplicateCheck AS (
          SELECT csq."courseSetId", csq."udemyQuestionBankId", COUNT(*) OVER (PARTITION BY csq."courseSetId", csq."udemyQuestionBankId") as duplicate_count
          FROM course_set_udemy_question_banks_udemy_question_bank csq
      )
      SELECT * FROM DuplicateCheck WHERE duplicate_count > 1
    `);
    if (duplicates.length > 0) {
      throw new BadRequestException(
        'Phát hiện câu hỏi trùng lặp trong các set!',
      );
    }
  }

  private async generateSlug(title: string) {
    try {
      const slug = await generateUniqueSlug(title, async (slug) => {
        const course = await this.coursesRepository.findOne({
          where: { slug },
        });
        return !!course;
      });
      return slug;
    } catch (error) {
      this.logger.error(`Error generating slug: ${error.message}`);
      throw new BadRequestException('Error generating slug');
    }
  }

  async createCourse(createCourse: CreateCourseDto) {
    const {
      categoryName,
      content,
      courseSets: totalSets,
      description,
      name,
      organizationId,
      price,
      status,
      type,
      udemyQuestionBanks: questionsPerSet,
      thumbnailImageUrl,
    } = createCourse;
    const course = new Course();
    course.name = name;
    course.description = description;
    course.price = price;
    course.status = status;
    course.type = type;
    course.categoryName = categoryName;
    course.content = content;
    course.slug = await this.generateSlug(name);
    course.thumbnailImageUrl = thumbnailImageUrl;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      course.organization = await queryRunner.manager
        .getRepository(Organization)
        .findOne({
          where: { id: Number(organizationId) },
        });

      const courseSets: CourseSet[] = [];
      for (let i = 0; i < totalSets; i++) {
        const courseSet = new CourseSet();
        courseSet.name = `Course Set ${i + 1}`;
        const courseSetSaved = await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(CourseSet)
          .values(courseSet)
          .execute();
        courseSets.push(courseSetSaved.raw[0]);
      }
      course.courseSets = courseSets;

      await this.distributeQuestions(
        categoryName,
        totalSets,
        courseSets,
        queryRunner,
        questionsPerSet,
      );

      // Commit transaction if everything is successful / Commit transaction nếu mọi thứ thành công
      await queryRunner.manager.save(course);
      await queryRunner.commitTransaction();

      // Check the final result / Kiểm tra kết quả cuối cùng
      this.logger.log('Phân phối câu hỏi hoàn tất');
      return course;
    } catch (error) {
      // Rollback if there is an error / Rollback nếu có lỗi
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to distribute questions: ${error.message}`);
      throw error;
    } finally {
      // Release queryRunner / Giải phóng queryRunner
      await queryRunner.release();
    }
  }

  async deleteThumbnail(filename: string) {
    try {
      if (!filename) return;

      const baseFilename = filename.includes('/')
        ? filename.split('/').pop()
        : filename;

      const filePath = normalize(
        join(process.cwd(), 'uploads', 'courses', baseFilename),
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Failed to delete article thumbnail, please try again',
      );
    }
  }

  async uploadThumbnail(id: number, filename: string) {
    const course = await this.getCourseById(id);
    try {
      if (course.thumbnailImageUrl) {
        await this.deleteThumbnail(course.thumbnailImageUrl);
      }
      return this.coursesRepository.update(
        { id },
        { thumbnailImageUrl: filename },
      );
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Failed to upload article thumbnail, please try again',
      );
    }
  }

  async findAllByCategoryName(query: PaginationParams) {
    const { page, limit } = query;
    const offset = (page - 1) * limit;
    const organizations = await this.organizationsService.findAll({
      page: 9999,
      limit: 9999,
      search: '',
    });
    let total = 0;
    let items: Course[] = [];
    try {
      for (const organization of organizations.items) {
        const [courses, totalCourse] =
          await this.coursesRepository.findAndCount({
            relations: this.relations,
            where: {
              organization: { id: organization.id },
              status: 'active',
            },
            order: {
              createdAt: 'DESC',
            },
            take: limit,
            skip: offset,
          });
        items = [...items, ...courses];
        total += totalCourse;
      }
      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting courses: ${error.message}`);
      throw new BadRequestException('Error getting courses');
    }
  }

  async findAllByOrganization(query: PaginationParams) {
    const { page, limit, organizationId, organizationSlug } = query;
    const offset = (page - 1) * limit;
    try {
      const [items, total] = await this.coursesRepository.findAndCount({
        relations: this.relations,
        where: {
          organization: {
            id: organizationId ? +organizationId : undefined,
            slug: organizationSlug ? organizationSlug : undefined,
          },
          status: 'active',
        },
        order: {
          createdAt: 'DESC',
        },
        take: page === 9999 ? undefined : limit,
        skip: page === 9999 ? undefined : offset,
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting courses: ${error.message}`);
      throw new BadRequestException('Error getting courses');
    }
  }

  async findAll(query: PaginationParams) {
    const {
      page,
      limit,
      search,
      orderBy,
      type,
      organizationId,
      organizationSlug,
    } = query;
    const offset = (page - 1) * limit;
    const order = {
      DESC: 'DESC',
      ASC: 'ASC',
    };
    const typeWhere = {
      free: 'free',
      paid: 'paid',
    };
    const orderByOrder = order[orderBy];
    try {
      const query = this.coursesRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.organization', 'organization')
        .leftJoinAndSelect('course.courseSets', 'courseSets')
        .leftJoinAndSelect(
          'courseSets.udemyQuestionBanks',
          'udemyQuestionBanks',
        )
        .leftJoinAndSelect('course.courseSessions', 'courseSessions')
        .leftJoinAndSelect('courseSessions.courseContents', 'courseContents')
        .where('course.status = :status', { status: 'active' })
        .andWhere('course.deletedAt IS NULL')
        .andWhere(
          new Brackets((qb) => {
            if (search) {
              qb.andWhere('course.name ILIKE :search', {
                search: `%${search}%`,
              });
            }
            if (type) {
              qb.andWhere('course.type = :type', { type: typeWhere[type] });
            }
            if (organizationId) {
              qb.andWhere('organization.id = :organizationId', {
                organizationId: +organizationId,
              });
            }
            if (organizationSlug) {
              qb.andWhere('organization.slug = :organizationSlug', {
                organizationSlug,
              });
            }
          }),
        )
        .orderBy('course.createdAt', orderByOrder || 'DESC')
        .skip(page === 9999 ? undefined : offset)
        .take(page === 9999 ? undefined : limit);
      const [items, total] = await query.getManyAndCount();
      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting courses: ${error.message}`);
      throw new BadRequestException('Error getting courses');
    }
  }

  async getRandomCourses() {
    const limit = 6;
    const page = 1;
    try {
      const randomCourseIds = await this.coursesRepository
        .createQueryBuilder('course')
        .select('course.id')
        .where('course.status = :status', { status: 'active' })
        .andWhere('course.deletedAt IS NULL')
        .orderBy('RANDOM()')
        .limit(limit)
        .getRawMany();

      const ids = randomCourseIds.map((row) => row.course_id);

      if (ids.length === 0) return [];

      const [items, total] = await this.coursesRepository.findAndCount({
        where: { id: In(ids) },
        relations: this.relations,
        order: { createdAt: 'DESC' },
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting random courses: ${error.message}`);
      throw new BadRequestException('Error getting random courses');
    }
  }

  async getCourses(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [items, total] = await this.coursesRepository.findAndCount({
        relations: this.relations,
        order: {
          createdAt: 'DESC',
        },
        take: limit,
        skip: offset,
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting courses: ${error.message}`);
      throw new BadRequestException('Error getting courses');
    }
  }

  async getCourseById(id: number) {
    try {
      const course = await this.coursesRepository.findOne({
        where: { id },
        relations: this.relations,
      });

      if (!course) {
        throw new BadRequestException('Course not found');
      }

      return course;
    } catch (error) {
      this.logger.error(`Error getting course by id: ${error.message}`);
      throw new BadRequestException('Error getting course by id');
    }
  }

  async findOneWithStatus(id: number) {
    try {
      const course = await this.coursesRepository.findOne({
        where: { id, status: 'active' },
        relations: this.relations,
      });

      if (!course) {
        throw new BadRequestException('Course not found');
      }

      return course;
    } catch (error) {
      this.logger.error(`Error getting course by id: ${error.message}`);
      throw new BadRequestException('Error getting course by id');
    }
  }

  async getGroupCategoryName(): Promise<
    { categoryName: string; count: number }[]
  > {
    try {
      const groupCategoryName = await this.coursesRepository
        .createQueryBuilder('course')
        .select('course.categoryName', 'categoryName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('course.categoryName')
        .getRawMany();

      return groupCategoryName;
    } catch (error) {
      this.logger.error(`Error getting group category name: ${error.message}`);
      throw new BadRequestException('Error getting group category name');
    }
  }

  async getGroupOrganizationName(): Promise<
    { organizationName: string; count: number }[]
  > {
    try {
      const groupOrganizationName = await this.coursesRepository
        .createQueryBuilder('course')
        .select('course.organizationName', 'organizationName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('course.organizationName')
        .getRawMany();

      return groupOrganizationName;
    } catch (error) {
      this.logger.error(
        `Error getting group organization name: ${error.message}`,
      );
      throw new BadRequestException('Error getting group organization name');
    }
  }

  async updateCourse(id: number, updateCourse: UpdateCourseDto) {
    const {
      categoryName,
      content,
      courseSets: totalSets,
      description,
      name,
      organizationId,
      price,
      status,
      type,
      udemyQuestionBanks: questionsPerSet,
      thumbnailImageUrl,
    } = updateCourse;
    const course = await this.getCourseById(id);
    course.name = name;
    course.description = description;
    course.price = price;
    course.status = status;
    course.type = type;
    course.content = content;
    course.slug = await this.generateSlug(name);
    course.thumbnailImageUrl = thumbnailImageUrl;
    // Minimum reasonable threshold when there are not enough questions / Ngưỡng tối thiểu hợp lý khi không đủ câu hỏi
    const minQuestionsPerSet = 100;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      course.organization = await queryRunner.manager
        .getRepository(Organization)
        .findOne({
          where: { id: Number(organizationId) },
        });
      if (
        course.categoryName !== categoryName ||
        course.courseSets.length !== totalSets ||
        course.courseSets[0].udemyQuestionBanks.length !== questionsPerSet
      ) {
        for (const set of course.courseSets) {
          await queryRunner.manager.query(
            `DELETE FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
            [set.id],
          );
          await queryRunner.manager
            .getRepository(CourseSet)
            .createQueryBuilder()
            .softDelete()
            .where('id = :id', { id: set.id })
            .execute();
        }
        const courseSets: CourseSet[] = [];
        for (let i = 0; i < totalSets; i++) {
          const courseSet = new CourseSet();
          courseSet.name = `${course.name} Set ${i + 1}`;
          courseSet.course = course;
          courseSets.push(courseSet);
        }
        const courseSetSaved = await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(CourseSet)
          .values(courseSets)
          .execute();
        course.courseSets = courseSetSaved.raw;

        await this.distributeQuestions(
          categoryName,
          totalSets,
          // minQuestionsPerSet,
          courseSets,
          queryRunner,
          questionsPerSet,
        );
        this.logger.log('Phân phối câu hỏi hoàn tất');
      }
      course.categoryName = categoryName;

      await queryRunner.manager.save(course);
      // Commit transaction if everything is successful / Commit transaction nếu mọi thứ thành công
      await queryRunner.commitTransaction();

      // Check the final result / Kiểm tra kết quả cuối cùng
      return course;
    } catch (error) {
      // Rollback if there is an error / Rollback nếu có lỗi
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update course: ${error.message}`);
      throw error;
    } finally {
      // Release queryRunner / Giải phóng queryRunner
      await queryRunner.release();
    }
  }

  async deleteCourse(id: number) {
    try {
      const course = await this.getCourseById(id);
      for (const set of course.courseSets) {
        await this.courseSetsService.remove(set.id);
      }
      return this.coursesRepository.softDelete(id);
    } catch (error) {
      this.logger.error(`Error deleting course: ${error.message}`);
      throw new BadRequestException('Error deleting course');
    }
  }

  // Hàm insert theo batch
  private async batchInsertQuestions(
    relations: Array<{ courseSetId: number; udemyQuestionBankId: number }>,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into('course_set_udemy_question_banks_udemy_question_bank')
      .values(relations)
      .execute();
  }

  private async batchInsertVideoCourse(
    course: Course,
    insertCourse: VideoCourseDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const {
      content,
      description,
      name,
      price,
      status,
      type,
      thumbnailImageUrl,
      courseSessions: createCourseSessions,
    } = insertCourse;
    course.name = name;
    course.description = description;
    course.price = price;
    course.status = status;
    course.type = type;
    course.categoryName = '';
    course.content = content;
    course.slug = await this.generateSlug(name);
    course.thumbnailImageUrl = thumbnailImageUrl;
    try {
      if (course.courseSessions?.length > 0) {
        for (const session of course.courseSessions) {
          await queryRunner.manager.softDelete(CourseSession, {
            id: session.id,
          });

          for (const content of session.courseContents) {
            await queryRunner.manager.softDelete(CourseContent, {
              id: content.id,
            });
          }
        }
      }

      const courseSessions: CourseSession[] = [];
      for (const [index, sessionData] of createCourseSessions.entries()) {
        const courseSession = new CourseSession();
        courseSession.name = sessionData.name;
        courseSession.description = sessionData.description;
        courseSession.uploadUrl = sessionData.uploadUrl;
        courseSession.order = index + 1;

        const courseContents: CourseContent[] = [];
        for (const [
          indx,
          contentData,
        ] of sessionData.courseContents.entries()) {
          const courseContent = new CourseContent();
          courseContent.name = contentData.name;
          courseContent.description = contentData.description;
          courseContent.uploadUrl = contentData.uploadUrl;
          courseContent.type = contentData.type;
          courseContent.duration = contentData.duration;
          courseContent.isRead = contentData.isRead;
          courseContent.isShown = contentData.isShown;
          courseContent.order = indx + 1;

          const courseContentSaved =
            await queryRunner.manager.save(courseContent);
          courseContents.push(courseContentSaved);
        }
        courseSession.courseContents = courseContents;
        courseSessions.push(courseSession);
      }
      const courseSessionsSaved =
        await queryRunner.manager.save(courseSessions);
      course.courseSessions = courseSessionsSaved;

      await queryRunner.manager.save(course);
      await queryRunner.commitTransaction();
      return course;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      this.logger.error(`Failed to transaction video course: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createVideoCourse(createCourse: VideoCourseDto) {
    const courseEntity = new Course();
    const course = await this.batchInsertVideoCourse(
      courseEntity,
      createCourse,
    );
    return course;
  }

  async updateVideoCourse(id: number, updateCourse: VideoCourseDto) {
    const courseEntity = await this.getCourseById(id);
    delete updateCourse.id;
    const course = await this.batchInsertVideoCourse(
      courseEntity,
      updateCourse,
    );
    return course;
  }
}
