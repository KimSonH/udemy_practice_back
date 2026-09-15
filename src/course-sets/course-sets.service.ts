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

/**
 * Arbitrary namespace for the advisory lock, so the CSV import lock cannot
 * collide with any other advisory lock that happens to use the same id.
 */
const COURSE_SET_IMPORT_LOCK_NAMESPACE = 771001;

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
      throw new BadRequestException(`Course id=${courseId} does not exist`);
    }
    if (course.creationMode !== 'manual') {
      throw new BadRequestException(
        'Course sets can only be managed individually for courses created in "manual" mode',
      );
    }
    return course;
  }

  /** Create an empty course set, used by the Practice Test tab in the admin UI. */
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

  /** Import one CSV file into a course set addressed by id, with no filename guessing. */
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
        `Course set id=${courseSetId} does not exist`,
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
        `CSV import failed for courseSetId=${courseSet.id}: ${error.message}`,
      );
      return {
        filename: file.originalname,
        matchedOrder: courseSet.order,
        courseSetId: courseSet.id,
        insertedCount: 0,
        success: false,
        errors: [
          error instanceof BadRequestException
            ? error.message
            : `Error saving to the database: ${error.message}`,
        ],
      };
    }
  }

  /**
   * Import questions from several CSV files into the course sets of one course.
   * Each file maps to one course set by the "Practice Test N" number in its
   * filename <-> CourseSet.order.
   * Each file is its own transaction (all-or-nothing): a failing file does not
   * affect the others.
   * Re-importing a set that already has questions REPLACES all of them.
   */
  async importQuestionsFromCsv(
    courseId: number,
    files: ImportQuestionCsvFile[],
  ): Promise<ImportQuestionCsvFileResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one CSV file is required');
    }

    const courseSets = await this.courseSetsRepository.find({
      where: { course: { id: courseId }, deletedAt: null },
      relations: ['course'],
    });

    if (courseSets.length === 0) {
      throw new BadRequestException(
        `Course id=${courseId} does not exist, or has no course set yet`,
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
            `Could not find a "Practice Test N" number in the filename "${file.originalname}"`,
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
            `Course id=${courseId} has no course set with order=${testNumber} (file "${file.originalname}" maps to Practice Test ${testNumber})`,
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
          `CSV import failed for courseSetId=${courseSet.id}: ${error.message}`,
        );
        results.push({
          filename: file.originalname,
          matchedOrder: testNumber,
          courseSetId: courseSet.id,
          insertedCount: 0,
          success: false,
          errors: [
            error instanceof BadRequestException
              ? error.message
              : `Error saving to the database: ${error.message}`,
          ],
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
      // An import is a "replace": every existing question of the set is deleted
      // before the new ones are inserted. Two concurrent imports into the SAME set
      // would overwrite each other, so lock per course_set. The advisory lock is
      // transaction-scoped: it is released on commit or rollback, so a request
      // that dies midway cannot leave the lock held.
      const [{ locked }]: { locked: boolean }[] =
        await queryRunner.manager.query(
          `SELECT pg_try_advisory_xact_lock($1, $2) AS locked`,
          [COURSE_SET_IMPORT_LOCK_NAMESPACE, courseSetId],
        );
      if (!locked) {
        throw new BadRequestException(
          `Course set id=${courseSetId} is already being imported by another ` +
            'process. Wait for that import to finish and try again.',
        );
      }

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
      throw this.explainDbError(error);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Turn an opaque Postgres error into a message the admin can act on.
   *
   * 23505 (unique_violation) on the udemy_question_bank primary key almost
   * always means the id sequence has fallen behind max(id), so nextval returns
   * an id that already exists. The TypeORM-generated constraint name
   * (PK_b456e1...) says nothing, leaving the admin stuck with the raw message.
   */
  private explainDbError(error: unknown): unknown {
    const pgError = error as { code?: string; message?: string };
    if (pgError?.code === '23505') {
      return new Error(
        'Primary key conflict while inserting questions: the id sequence of ' +
          'udemy_question_bank has fallen behind max(id) and is producing ids that ' +
          'already exist (usually after data was seeded or restored with explicit ' +
          'ids and no setval). ' +
          "Fix: SELECT setval('udemy_question_bank_id_seq', " +
          '(SELECT COALESCE(max(id), 0) + 1 FROM udemy_question_bank), false);',
      );
    }
    return error;
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
