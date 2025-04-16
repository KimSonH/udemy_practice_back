import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Course } from './entities/courses.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository, DataSource, QueryRunner } from 'typeorm';
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
@Injectable()
export class CoursesService {
  private logger = new Logger(CoursesService.name);
  private readonly BATCH_SIZE = 1000;
  private relations = [
    'courseSets',
    'courseSets.udemyQuestionBanks',
    'organization',
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

  async distributeQuestions(
    categoryName: string,
    totalSets: number,
    minQuestionsPerSet: number,
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
    questionsPerSet: number,
    options: QuestionDistributionOptions = {},
  ) {
    // Sử dụng giá trị mặc định hoặc từ cấu hình nếu không được cung cấp
    totalSets = totalSets || 6;
    questionsPerSet = questionsPerSet || 120;

    this.logger.log(
      `Bắt đầu phân phối với: totalSets=${totalSets}, questionsPerSet=${questionsPerSet}`,
    );

    const { questions: allQuestions, total: totalQuestions } =
      await this.udemyQuestionBanksService.findAllByCategoryName(categoryName);

    this.logger.log(`Tổng số câu hỏi có sẵn: ${totalQuestions}`);

    const { allowAutoAdjust = false, maxQuestionPercentage = 0.8 } = options;

    const maxAllowedQuestions = Math.floor(
      totalQuestions * maxQuestionPercentage,
    );
    if (questionsPerSet > totalQuestions) {
      if (allowAutoAdjust) {
        const adjustedQuestionsPerSet = Math.min(
          maxAllowedQuestions,
          totalQuestions,
        );
        this.logger.log(
          `Điều chỉnh số câu hỏi mỗi set từ ${questionsPerSet} xuống ${adjustedQuestionsPerSet}`,
        );
        questionsPerSet = adjustedQuestionsPerSet;
      } else {
        throw new BadRequestException(
          `Required questions (${questionsPerSet}) exceeds available questions (${totalQuestions}). ` +
            `Maximum allowed questions is ${maxAllowedQuestions} (${maxQuestionPercentage * 100}% of total questions).`,
        );
      }
    }

    // Kiểm tra xem có đủ câu hỏi không
    const totalNeeded = totalSets * questionsPerSet;
    const isEnough = totalQuestions >= totalNeeded;

    if (isEnough) {
      this.logger.log(
        `Đủ câu hỏi (${totalQuestions}/${totalNeeded}). Phân phối đều mỗi set ${questionsPerSet} câu.`,
      );

      // Tạo mảng shuffle để phân phối ngẫu nhiên
      const shuffledQuestions = [...allQuestions];
      this.shuffleArray(shuffledQuestions);

      // Tạo một Set để theo dõi câu hỏi đã sử dụng
      const usedQuestions = new Set<number>();

      for (let i = 0; i < totalSets; i++) {
        const setQuestions = [];
        let questionsNeeded = questionsPerSet;

        // Lấy câu hỏi chưa được sử dụng cho set hiện tại
        for (const question of shuffledQuestions) {
          if (setQuestions.length >= questionsPerSet) break;
          if (!usedQuestions.has(question.id)) {
            setQuestions.push(question);
            usedQuestions.add(question.id);
            questionsNeeded--;
          }
        }

        const relations = setQuestions.map((question) => ({
          courseSetId: courseSets[i].id,
          udemyQuestionBankId: question.id,
        }));

        if (relations.length > 0) {
          await this.batchInsertQuestions(relations, queryRunner);
          this.logger.log(
            `Đã phân phối ${relations.length} câu hỏi vào Set ${i + 1}`,
          );
        }
      }
    } else {
      // Trường hợp thiếu câu hỏi: thực hiện chiến lược "mượn"
      this.logger.log(
        `Thiếu câu hỏi (${totalQuestions}/${totalNeeded}). Áp dụng chiến lược mượn.`,
      );

      // Tính toán phân phối ban đầu
      await this.adjustQuestionDistribution(
        categoryName,
        totalSets,
        minQuestionsPerSet,
        courseSets,
        queryRunner,
        questionsPerSet,
      );
    }
  }

  async adjustQuestionDistribution(
    categoryName: string,
    totalSets: number,
    minQuestionsPerSet: number,
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
    questionsPerSet: number,
  ) {
    // 1. Lấy và validate câu hỏi
    const { questions: allQuestions, total: totalQuestions } =
      await this.validateAndGetQuestions(
        categoryName,
        totalSets,
        minQuestionsPerSet,
      );

    // 2. Xóa câu hỏi cũ
    await this.clearExistingQuestions(courseSets, queryRunner);

    // 3. Phân phối câu hỏi ban đầu
    await this.distributeInitialQuestions(
      allQuestions,
      totalQuestions,
      totalSets,
      courseSets,
      queryRunner,
    );

    // 4. Mượn và điều chỉnh câu hỏi
    await this.borrowAndAdjustQuestions(
      courseSets,
      totalSets,
      questionsPerSet,
      categoryName,
      queryRunner,
    );
  }

  // Hàm validate và lấy câu hỏi
  private async validateAndGetQuestions(
    categoryName: string,
    totalSets: number,
    minQuestionsPerSet: number,
  ) {
    const result =
      await this.udemyQuestionBanksService.findAllByCategoryName(categoryName);

    if (result.total < totalSets * minQuestionsPerSet) {
      throw new BadRequestException(
        `Không đủ câu hỏi! Hiện có ${result.total} câu, cần ít nhất ${
          totalSets * minQuestionsPerSet
        } câu để phân phối cho ${totalSets} bộ.`,
      );
    }

    return result;
  }

  // Hàm xóa câu hỏi cũ
  private async clearExistingQuestions(
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    const courseSetIds = courseSets.map((set) => set.id).join(',');
    await queryRunner.manager.query(
      `DELETE FROM course_set_udemy_question_banks_udemy_question_bank 
         WHERE "courseSetId" IN (${courseSetIds})`,
    );
  }

  // Hàm phân phối câu hỏi ban đầu
  private async distributeInitialQuestions(
    allQuestions: any[],
    totalQuestions: number,
    totalSets: number,
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    const baseQuestionsPerSet = Math.floor(totalQuestions / totalSets);
    const remainder = totalQuestions % totalSets;

    this.logger.log(
      `Phân phối ban đầu: ${baseQuestionsPerSet} câu hỏi/set, với ${remainder} câu dư`,
    );

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
        this.logger.warn(`Không có câu hỏi để phân phối cho Set ${i + 1}`);
        continue;
      }

      const relations = setQuestions.map((question) => ({
        courseSetId: courseSets[i].id,
        udemyQuestionBankId: question.id,
      }));

      allRelations.push(...relations);

      // Batch insert khi đạt đến kích thước batch
      if (allRelations.length >= this.BATCH_SIZE) {
        await this.batchInsertQuestions(allRelations, queryRunner);
        allRelations = [];
      }
    }

    // Insert phần còn lại
    if (allRelations.length > 0) {
      await this.batchInsertQuestions(allRelations, queryRunner);
    }
  }

  // Hàm mượn và điều chỉnh câu hỏi
  private async borrowAndAdjustQuestions(
    courseSets: CourseSet[],
    totalSets: number,
    questionsPerSet: number,
    categoryName: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Thực hiện mượn câu hỏi cho từng set
    for (let i = 0; i < totalSets; i++) {
      const shortage = await this.calculateShortage(
        courseSets[i].id,
        questionsPerSet,
        queryRunner,
      );
      if (shortage <= 0) continue;

      this.logger.log(`Set ${i + 1} cần thêm ${shortage} câu hỏi`);

      const borrowedQuestions = await this.borrowQuestionsFromOtherSets(
        courseSets[i].id,
        categoryName,
        shortage,
        queryRunner,
      );

      if (borrowedQuestions.length > 0) {
        await this.batchInsertQuestions(borrowedQuestions, queryRunner);
        this.logger.log(
          `Đã mượn tổng cộng ${borrowedQuestions.length} câu hỏi vào Set ${i + 1}`,
        );
      }

      await this.validateFinalCount(
        courseSets[i].id,
        questionsPerSet,
        i + 1,
        queryRunner,
      );
    }

    // Kiểm tra phân phối cuối cùng
    await this.validateDistribution(courseSets, queryRunner);

    // Thêm kiểm tra trùng lặp sau khi hoàn tất phân phối
    await this.validateDuplicateQuestions(courseSets, queryRunner);
  }

  // Hàm tính toán số câu hỏi còn thiếu
  private async calculateShortage(
    courseSetId: number,
    questionsPerSet: number,
    queryRunner: QueryRunner,
  ): Promise<number> {
    const currentCount = await queryRunner.manager.query(
      `SELECT COUNT(*) FROM course_set_udemy_question_banks_udemy_question_bank 
         WHERE "courseSetId" = $1`,
      [courseSetId],
    );
    return questionsPerSet - parseInt(currentCount[0].count);
  }

  // Hàm mượn câu hỏi từ các set khác
  private async borrowQuestionsFromOtherSets(
    courseSetId: number,
    categoryName: string,
    shortage: number,
    queryRunner: QueryRunner,
  ): Promise<Array<{ courseSetId: number; udemyQuestionBankId: number }>> {
    const availableQuestions = await queryRunner.manager.query(
      `
      WITH CurrentSetQuestions AS (
          -- Lấy tất cả câu hỏi đã được sử dụng trong set hiện tại
          SELECT "udemyQuestionBankId"
          FROM course_set_udemy_question_banks_udemy_question_bank
          WHERE "courseSetId" = $1
      ),
      QuestionUsage AS (
          -- Đếm số lần sử dụng của mỗi câu hỏi trong tất cả các set
          SELECT 
              q.id,
              COUNT(DISTINCT csq."courseSetId") as usage_count
          FROM udemy_question_bank q
          LEFT JOIN course_set_udemy_question_banks_udemy_question_bank csq 
              ON q.id = csq."udemyQuestionBankId"
          WHERE q."categoryName" = $2
          GROUP BY q.id
      )
      SELECT 
          q.id
      FROM udemy_question_bank q
      LEFT JOIN QuestionUsage qu ON q.id = qu.id
      WHERE q."categoryName" = $2
      AND q.id NOT IN (SELECT "udemyQuestionBankId" FROM CurrentSetQuestions)  -- Loại bỏ câu hỏi đã có trong set hiện tại
      AND (qu.usage_count IS NULL OR qu.usage_count < (
          -- Chỉ lấy câu hỏi chưa được sử dụng hoặc được sử dụng ít nhất
          SELECT MIN(usage_count) + 1 
          FROM QuestionUsage 
          WHERE usage_count > 0
      ))
      ORDER BY 
          COALESCE(qu.usage_count, 0) ASC,  -- Ưu tiên câu hỏi chưa được sử dụng
          RANDOM()  -- Random trong cùng mức độ sử dụng
      LIMIT $3
      `,
      [courseSetId, categoryName, shortage],
    );

    // Kiểm tra và log kết quả
    this.logger.log(
      `Tìm thấy ${availableQuestions.length} câu hỏi có thể mượn cho set ${courseSetId}`,
    );

    return availableQuestions.map((q) => ({
      courseSetId: courseSetId,
      udemyQuestionBankId: q.id,
    }));
  }

  // Thêm hàm kiểm tra trùng lặp
  private async validateDuplicateQuestions(
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    const duplicates = await queryRunner.manager.query(`
      WITH DuplicateCheck AS (
          SELECT 
              csq."courseSetId",
              csq."udemyQuestionBankId",
              COUNT(*) OVER (PARTITION BY csq."courseSetId", csq."udemyQuestionBankId") as duplicate_count
          FROM course_set_udemy_question_banks_udemy_question_bank csq
      )
      SELECT *
      FROM DuplicateCheck
      WHERE duplicate_count > 1
    `);

    if (duplicates.length > 0) {
      this.logger.error('Phát hiện câu hỏi trùng lặp trong các set:');
      duplicates.forEach((dup) => {
        this.logger.error(
          `Set ${dup.courseSetId}: Câu hỏi ${dup.udemyQuestionBankId} xuất hiện ${dup.duplicate_count} lần`,
        );
      });
      throw new Error('Phát hiện câu hỏi trùng lặp trong các set');
    }

    this.logger.log('Kiểm tra trùng lặp: OK - Không có câu hỏi trùng lặp');
  }

  // Thêm hàm để kiểm tra phân phối
  private async validateDistribution(
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    const distribution = await queryRunner.manager.query(`
      WITH QuestionDistribution AS (
          SELECT 
              q.id as question_id,
              COUNT(DISTINCT csq."courseSetId") as set_count
          FROM udemy_question_bank q
          JOIN course_set_udemy_question_banks_udemy_question_bank csq 
              ON q.id = csq."udemyQuestionBankId"
          GROUP BY q.id
      )
      SELECT 
          set_count,
          COUNT(*) as question_count
      FROM QuestionDistribution
      GROUP BY set_count
      ORDER BY set_count
    `);

    this.logger.log('Phân phối câu hỏi theo số set:');
    distribution.forEach((d) => {
      this.logger.log(
        `${d.question_count} câu hỏi xuất hiện trong ${d.set_count} set`,
      );
    });
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

  // Hàm kiểm tra số lượng câu hỏi cuối cùng
  private async validateFinalCount(
    courseSetId: number,
    questionsPerSet: number,
    setNumber: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const finalCount = await queryRunner.manager.query(
      `SELECT COUNT(*) FROM course_set_udemy_question_banks_udemy_question_bank 
         WHERE "courseSetId" = $1`,
      [courseSetId],
    );

    if (parseInt(finalCount[0].count) < questionsPerSet) {
      this.logger.warn(
        `Set ${setNumber} vẫn thiếu câu hỏi. Hiện có: ${finalCount[0].count}/${questionsPerSet}`,
      );
    }
  }

  private async generateSlug(title: string) {
    const slug = await generateUniqueSlug(title, async (slug) => {
      const course = await this.coursesRepository.findOne({
        where: { slug },
      });
      return !!course;
    });
    return slug;
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
        minQuestionsPerSet,
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
    const { page, limit, organizationId } = query;
    const offset = (page - 1) * limit;
    try {
      const [items, total] = await this.coursesRepository.findAndCount({
        relations: this.relations,
        where: {
          organization: {
            id: +organizationId,
          },
          status: 'active',
        },
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

  async findAll(query: PaginationParams) {
    const { page, limit, search } = query;
    const offset = (page - 1) * limit;
    try {
      const [items, total] = await this.coursesRepository.findAndCount({
        relations: this.relations,
        where: {
          status: 'active',
          name: search ? Like(`%${search}%`) : undefined,
          deletedAt: null,
        },
        order: {
          createdAt: 'DESC',
        },
        skip: page === 9999 ? undefined : offset,
        take: page === 9999 ? undefined : limit,
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
    } = updateCourse;
    const course = await this.getCourseById(id);
    course.name = name;
    course.description = description;
    course.price = price;
    course.status = status;
    course.type = type;
    course.categoryName = categoryName;
    course.content = content;
    course.slug = await this.generateSlug(name);
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
        minQuestionsPerSet,
        courseSets,
        queryRunner,
        questionsPerSet,
      );
      this.logger.log('Phân phối câu hỏi hoàn tất');

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
}
