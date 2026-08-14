import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateCourseSetDto } from './dto/create-course-set.dto';
import { UpdateCourseSetDto } from './dto/update-course-set.dto';
import { CreateCourseSetForCourseDto } from './dto/create-course-set-for-course.dto';
import { MAX_COURSE_SETS } from 'src/courses/dto/create-course.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CourseSet } from './entities/course-set.entity';
import { Course } from 'src/courses/entities/courses.entity';
import { UdemyQuestionBanksService } from 'src/udemy-question-banks/udemy-question-banks.service';
import { UdemyQuestionBank } from 'src/udemy-question-banks/entities/udemy-question-bank.entity';
import {
  extractTestNumberFromFilename,
  parseQuestionCsv,
} from './utils/parse-question-csv.util';

export interface ImportQuestionCsvFile {
  originalname: string;
  buffer: Buffer;
}

export interface ImportQuestionCsvFileResult {
  filename: string;
  matchedOrder: number | null;
  courseSetId: number | null;
  insertedCount: number;
  success: boolean;
  errors: string[];
}

@Injectable()
export class CourseSetsService {
  private logger = new Logger(CourseSetsService.name);

  constructor(
    @InjectRepository(CourseSet)
    private readonly courseSetsRepository: Repository<CourseSet>,
    private readonly udemyQuestionBanksService: UdemyQuestionBanksService,
    private readonly dataSource: DataSource,
  ) {}
  create(createCourseSetDto: CreateCourseSetDto) {
    return this.courseSetsRepository.save(createCourseSetDto);
  }

  async findAll() {
    const [courseSets, total] = await this.courseSetsRepository.findAndCount({
      relations: ['udemyQuestionBanks'],
      where: { deletedAt: null },
    });
    return { courseSets, total };
  }

  findOne(id: number) {
    return this.courseSetsRepository.findOne({
      where: { id, deletedAt: null },
      relations: ['udemyQuestionBanks', 'course'],
    });
  }

  update(id: number, updateCourseSetDto: UpdateCourseSetDto) {
    return this.courseSetsRepository.update(id, updateCourseSetDto);
  }

  async remove(id: number) {
    const courseSet = await this.findOne(id);
    if (courseSet?.course?.creationMode !== 'manual') {
      throw new BadRequestException(
        'Course sets can only be managed individually for courses created in "manual" mode',
      );
    }
    courseSet.udemyQuestionBanks = [];
    return this.courseSetsRepository.softRemove(courseSet);
  }

  private async assertManualMode(courseId: number) {
    const course = await this.dataSource
      .getRepository(Course)
      .findOne({ where: { id: courseId } });
    if (!course) {
      throw new BadRequestException(`Course id=${courseId} không tồn tại`);
    }
    if (course.creationMode !== 'manual') {
      throw new BadRequestException(
        'Course sets can only be managed individually for courses created in "manual" mode',
      );
    }
    return course;
  }

  /** Tạo 1 course set rỗng cho course, dùng ở UI quản lý course set riêng lẻ (tab Practice Test). */
  async createForCourse(courseId: number, dto: CreateCourseSetForCourseDto) {
    await this.assertManualMode(courseId);
    const existing = await this.courseSetsRepository.find({
      where: { course: { id: courseId }, deletedAt: null },
    });
    if (existing.length >= MAX_COURSE_SETS) {
      throw new BadRequestException(
        `A course can have at most ${MAX_COURSE_SETS} course sets`,
      );
    }
    const order =
      dto.order ??
      existing.reduce((max, set) => Math.max(max, set.order), 0) + 1;
    const courseSet = this.courseSetsRepository.create({
      name: dto.name,
      order,
      course: { id: courseId } as any,
    });
    return this.courseSetsRepository.save(courseSet);
  }

  /** Import đúng 1 file CSV vào 1 course set đã biết id, không cần suy luận từ tên file. */
  async importSingleCsv(
    courseSetId: number,
    file: ImportQuestionCsvFile,
  ): Promise<ImportQuestionCsvFileResult> {
    const courseSet = await this.courseSetsRepository.findOne({
      where: { id: courseSetId, deletedAt: null },
      relations: ['course'],
    });
    if (!courseSet) {
      throw new BadRequestException(
        `Course Set id=${courseSetId} không tồn tại`,
      );
    }
    if (courseSet.course.creationMode !== 'manual') {
      throw new BadRequestException(
        'Course sets can only be managed individually for courses created in "manual" mode',
      );
    }

    const { rows, errors } = parseQuestionCsv(file.buffer);
    if (errors.length > 0) {
      return {
        filename: file.originalname,
        matchedOrder: courseSet.order,
        courseSetId: courseSet.id,
        insertedCount: 0,
        success: false,
        errors,
      };
    }

    try {
      const insertedCount = await this.replaceCourseSetQuestions(
        courseSet.id,
        courseSet.course.categoryName,
        rows,
      );
      return {
        filename: file.originalname,
        matchedOrder: courseSet.order,
        courseSetId: courseSet.id,
        insertedCount,
        success: true,
        errors: [],
      };
    } catch (error) {
      this.logger.error(
        `Import CSV thất bại cho courseSetId=${courseSet.id}: ${error.message}`,
      );
      return {
        filename: file.originalname,
        matchedOrder: courseSet.order,
        courseSetId: courseSet.id,
        insertedCount: 0,
        success: false,
        errors: [`Lỗi khi lưu vào DB: ${error.message}`],
      };
    }
  }

  /**
   * Import câu hỏi từ nhiều file CSV vào các CourseSet của 1 course, mỗi file map
   * vào đúng 1 CourseSet dựa theo số "Practice Test N" trong tên file <-> CourseSet.order.
   * Mỗi file là 1 transaction độc lập (all-or-nothing): file lỗi không ảnh hưởng file khác.
   * Import lại 1 set đã có câu hỏi -> THAY THẾ toàn bộ câu hỏi cũ của set đó.
   */
  async importQuestionsFromCsv(
    courseId: number,
    files: ImportQuestionCsvFile[],
  ): Promise<ImportQuestionCsvFileResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Cần ít nhất 1 file CSV');
    }

    const courseSets = await this.courseSetsRepository.find({
      where: { course: { id: courseId }, deletedAt: null },
      relations: ['course'],
    });

    if (courseSets.length === 0) {
      throw new BadRequestException(
        `Course id=${courseId} không tồn tại hoặc chưa có Course Set nào`,
      );
    }

    const course = courseSets[0].course;
    if (course.creationMode !== 'manual') {
      throw new BadRequestException(
        'Course sets can only be managed individually for courses created in "manual" mode',
      );
    }
    const results: ImportQuestionCsvFileResult[] = [];

    for (const file of files) {
      const testNumber = extractTestNumberFromFilename(file.originalname);
      if (testNumber === null) {
        results.push({
          filename: file.originalname,
          matchedOrder: null,
          courseSetId: null,
          insertedCount: 0,
          success: false,
          errors: [
            `Không tìm được số "Practice Test N" trong tên file "${file.originalname}"`,
          ],
        });
        continue;
      }

      const courseSet = courseSets.find((set) => set.order === testNumber);
      if (!courseSet) {
        results.push({
          filename: file.originalname,
          matchedOrder: testNumber,
          courseSetId: null,
          insertedCount: 0,
          success: false,
          errors: [
            `Course id=${courseId} không có Course Set với order=${testNumber} (file "${file.originalname}" map vào Practice Test ${testNumber})`,
          ],
        });
        continue;
      }

      const { rows, errors } = parseQuestionCsv(file.buffer);
      if (errors.length > 0) {
        results.push({
          filename: file.originalname,
          matchedOrder: testNumber,
          courseSetId: courseSet.id,
          insertedCount: 0,
          success: false,
          errors,
        });
        continue;
      }

      try {
        const insertedCount = await this.replaceCourseSetQuestions(
          courseSet.id,
          course.categoryName,
          rows,
        );
        results.push({
          filename: file.originalname,
          matchedOrder: testNumber,
          courseSetId: courseSet.id,
          insertedCount,
          success: true,
          errors: [],
        });
      } catch (error) {
        this.logger.error(
          `Import CSV thất bại cho courseSetId=${courseSet.id}: ${error.message}`,
        );
        results.push({
          filename: file.originalname,
          matchedOrder: testNumber,
          courseSetId: courseSet.id,
          insertedCount: 0,
          success: false,
          errors: [`Lỗi khi lưu vào DB: ${error.message}`],
        });
      }
    }

    return results;
  }

  private async replaceCourseSetQuestions(
    courseSetId: number,
    categoryName: string,
    rows: ReturnType<typeof parseQuestionCsv>['rows'],
  ): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const previousLinks: { udemy_question_bank_id: number }[] =
        await queryRunner.manager.query(
          `SELECT udemy_question_bank_id FROM course_set_udemy_question_bank WHERE course_set_id = $1`,
          [courseSetId],
        );
      const previousQuestionIds = previousLinks.map(
        (row) => row.udemy_question_bank_id,
      );

      await queryRunner.manager.query(
        `DELETE FROM course_set_udemy_question_bank WHERE course_set_id = $1`,
        [courseSetId],
      );

      if (previousQuestionIds.length > 0) {
        const stillLinked: { udemy_question_bank_id: number }[] =
          await queryRunner.manager.query(
            `SELECT DISTINCT udemy_question_bank_id FROM course_set_udemy_question_bank WHERE udemy_question_bank_id = ANY($1)`,
            [previousQuestionIds],
          );
        const stillLinkedIds = new Set(
          stillLinked.map((row) => row.udemy_question_bank_id),
        );
        const orphanIds = previousQuestionIds.filter(
          (id) => !stillLinkedIds.has(id),
        );
        if (orphanIds.length > 0) {
          await queryRunner.manager
            .getRepository(UdemyQuestionBank)
            .softDelete(orphanIds);
        }
      }

      const questionsToInsert = rows.map((row) => ({
        ...row,
        categoryName,
      }));
      const insertResult = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(UdemyQuestionBank)
        .values(questionsToInsert)
        .execute();
      const newQuestionIds: number[] = insertResult.identifiers.map(
        (identifier) => identifier.id,
      );

      const linkRows = newQuestionIds.map((questionId) => ({
        course_set_id: courseSetId,
        udemy_question_bank_id: questionId,
      }));
      if (linkRows.length > 0) {
        await this.batchInsertLinks(linkRows, queryRunner);
      }

      await queryRunner.commitTransaction();
      return newQuestionIds.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async batchInsertLinks(
    relations: { course_set_id: number; udemy_question_bank_id: number }[],
    queryRunner: import('typeorm').QueryRunner,
  ) {
    const BATCH_SIZE = 1000;
    for (let i = 0; i < relations.length; i += BATCH_SIZE) {
      const batch = relations.slice(i, i + BATCH_SIZE);
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into('course_set_udemy_question_bank')
        .values(batch)
        .execute();
    }
  }
}
