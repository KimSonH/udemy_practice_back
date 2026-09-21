import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Course } from 'src/courses/entities/courses.entity';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
import { UdemyQuestionBank } from 'src/udemy-question-banks/entities/udemy-question-bank.entity';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';

import { CreateTestAttemptDto } from './dto/create-test-attempt.dto';
import { SubmitTestAttemptDto } from './dto/submit-test-attempt.dto';
import { UpdateTestAttemptDto } from './dto/update-test-attempt.dto';
import { TestAttempt } from './entities/test-attempt.entity';
import {
  deadlineFrom,
  hasPassed,
  passingPercent,
  scorePercent,
} from './exam-timing';
import { DomainScore, gradeQuestion, summarizeByDomain } from './grading';
import {
  CourseProgress,
  ProgressRow,
  answeredCount,
  summarizeProgress,
} from './progress';

export type SubmitResult = {
  id: number;
  status: string;
  correctCount: number;
  totalCount: number;
  percent: number;
  passingPercent: number;
  passed: boolean;
  timedOut: boolean;
  finishedAt: Date;
  domainScores: DomainScore[];
};

@Injectable()
export class TestAttemptsService {
  constructor(
    @InjectRepository(TestAttempt)
    private readonly attemptRepository: Repository<TestAttempt>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseSet)
    private readonly courseSetRepository: Repository<CourseSet>,
    @InjectRepository(UdemyQuestionBank)
    private readonly questionRepository: Repository<UdemyQuestionBank>,
    @InjectRepository(UserCourse)
    private readonly userCourseRepository: Repository<UserCourse>,
  ) {}

  async start(
    userId: number,
    dto: CreateTestAttemptDto,
    now: Date = new Date(),
  ): Promise<TestAttempt> {
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    await this.assertCanSit(course, userId);

    const questions = await this.resolveQuestions(course.id, dto);
    if (questions.length === 0) {
      throw new BadRequestException('This attempt has no questions');
    }

    const attempt = this.attemptRepository.create({
      user: { id: userId } as never,
      course: { id: course.id } as never,
      courseSet: dto.courseSetId ? ({ id: dto.courseSetId } as never) : null,
      mode: dto.mode,
      status: 'in_progress',
      currentIndex: 0,
      questionIds: dto.questionIds ?? null,
      optionOrder: dto.optionOrder ?? null,
      answers: {},
      flagged: [],
      revealed: [],
      revision: 0,
      startedAt: now,
      // Known from the moment the questions are dealt, and recorded now
      // rather than at submit: the progress screen needs "41 of 60" for an
      // attempt still running, and counting a set's questions per attempt
      // per page load is a query nobody should pay for. Submit recomputes
      // it, since a question deleted meanwhile drops out.
      totalCount: questions.length,
      // Practice mode is untimed. The deadline is set here and never accepted
      // from the client: a client that supplies its own can decline to expire.
      deadline:
        dto.mode === 'exam'
          ? (deadlineFrom(now, questions.length, course) ?? undefined)
          : undefined,
      timedOut: false,
    });

    return this.attemptRepository.save(attempt);
  }

  async saveProgress(
    userId: number,
    attemptId: number,
    dto: UpdateTestAttemptDto,
  ): Promise<TestAttempt> {
    const attempt = await this.findOwned(userId, attemptId);

    if (attempt.status === 'submitted') {
      throw new ConflictException('This attempt has already been submitted');
    }
    if (dto.revision !== attempt.revision) {
      // Another tab wrote since this one last read. Merging two tabs' answers
      // has no correct outcome, so the later reader is told to stop rather
      // than allowed to overwrite.
      throw new ConflictException({
        message: 'This attempt was changed elsewhere',
        revision: attempt.revision,
      });
    }

    if (dto.answers !== undefined) attempt.answers = dto.answers;
    if (dto.flagged !== undefined) attempt.flagged = dto.flagged;
    if (dto.revealed !== undefined) attempt.revealed = dto.revealed;
    if (dto.currentIndex !== undefined) attempt.currentIndex = dto.currentIndex;
    attempt.revision += 1;

    return this.attemptRepository.save(attempt);
  }

  async submit(
    userId: number,
    attemptId: number,
    dto: SubmitTestAttemptDto,
    now: Date = new Date(),
  ): Promise<SubmitResult> {
    const attempt = await this.findOwned(userId, attemptId);

    if (attempt.status === 'submitted') {
      throw new ConflictException('This attempt has already been submitted');
    }
    if (dto.revision !== undefined && dto.revision !== attempt.revision) {
      throw new ConflictException({
        message: 'This attempt was changed elsewhere',
        revision: attempt.revision,
      });
    }

    if (dto.answers !== undefined) attempt.answers = dto.answers;

    const questions = await this.attemptQuestions(attempt);
    const graded = questions.map((question) => ({
      question,
      status: gradeQuestion(
        question,
        attempt.answers[String(question.id)] ?? [],
      ),
    }));

    const correctCount = graded.filter(
      (entry) => entry.status === 'correct',
    ).length;
    const totalCount = graded.length;

    attempt.status = 'submitted';
    attempt.finishedAt = now;
    attempt.correctCount = correctCount;
    attempt.totalCount = totalCount;
    attempt.domainScores = summarizeByDomain(graded);
    // Decided against the server's clock, not the browser's. Reaching the
    // deadline is time up, not one millisecond short of it: the runner's own
    // countdown submits at `remaining <= 0`, and progress calls the same
    // instant expired. Three places disagreeing on one boundary is how an
    // attempt ends up timed out on one screen and not on another.
    attempt.timedOut = !!attempt.deadline && now >= attempt.deadline;
    attempt.revision += 1;

    const saved = await this.attemptRepository.save(attempt);
    const timing = saved.course ?? (await this.courseOf(saved));

    return {
      id: saved.id,
      status: saved.status,
      correctCount,
      totalCount,
      percent: scorePercent(correctCount, totalCount),
      passingPercent: passingPercent(timing),
      passed: hasPassed(correctCount, totalCount, timing),
      timedOut: saved.timedOut,
      finishedAt: saved.finishedAt as Date,
      domainScores: saved.domainScores ?? [],
    };
  }

  /** Every course this learner has touched, most recently active first. */
  async progress(
    userId: number,
    now: Date = new Date(),
  ): Promise<CourseProgress[]> {
    const attempts = await this.attemptRepository.find({
      where: { user: { id: userId } },
      relations: ['course', 'courseSet'],
      order: { startedAt: 'DESC' },
    });
    if (attempts.length === 0) return [];

    // One count per course, not per attempt: a learner with twenty attempts
    // at one course would otherwise ask the same question twenty times.
    const courseIds = [
      ...new Set(attempts.map((attempt) => attempt.course.id)),
    ];
    const setsTotal = new Map<number, number>();
    await Promise.all(
      courseIds.map(async (id) =>
        setsTotal.set(
          id,
          await this.courseSetRepository.count({
            where: { course: { id } },
          }),
        ),
      ),
    );

    const rows: ProgressRow[] = attempts.map((attempt) => ({
      courseId: attempt.course.id,
      courseName: attempt.course.name,
      setsTotal: setsTotal.get(attempt.course.id) ?? 0,
      attemptId: attempt.id,
      courseSetId: attempt.courseSet?.id ?? null,
      courseSetName: attempt.courseSet?.name ?? null,
      mode: attempt.mode,
      status: attempt.status,
      answered: answeredCount(attempt.answers),
      // Attempts started before totalCount was recorded fall back to their
      // own question list, and to zero when they have neither.
      questionCount: attempt.totalCount ?? attempt.questionIds?.length ?? 0,
      correctCount: attempt.correctCount ?? null,
      startedAt: attempt.startedAt,
      deadline: attempt.deadline ?? null,
    }));

    return summarizeProgress(rows, now);
  }

  findByCourse(userId: number, courseId: number): Promise<TestAttempt[]> {
    return this.attemptRepository.find({
      where: { user: { id: userId }, course: { id: courseId } },
      relations: ['courseSet'],
      order: { startedAt: 'DESC' },
    });
  }

  // ---------- internals ----------

  private async findOwned(
    userId: number,
    attemptId: number,
  ): Promise<TestAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, user: { id: userId } },
      relations: ['course', 'courseSet'],
    });
    // 404 rather than 403 for someone else's attempt: whether it exists is
    // not theirs to learn.
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  private async assertCanSit(course: Course, userId: number): Promise<void> {
    if (course.type !== 'paid') return;

    const owned = await this.userCourseRepository.findOne({
      where: { courseId: course.id, userId, status: 'completed' },
    });
    // 403, not 404: the learner can see this course in the catalogue, so
    // pretending it does not exist would only be confusing.
    if (!owned) throw new ForbiddenException('This course has not been bought');
  }

  /** The questions a new attempt will cover, validated against the course. */
  private async resolveQuestions(
    courseId: number,
    dto: CreateTestAttemptDto,
  ): Promise<UdemyQuestionBank[]> {
    if (dto.courseSetId !== undefined) {
      const set = await this.courseSetRepository.findOne({
        where: { id: dto.courseSetId },
        relations: ['course', 'udemyQuestionBanks'],
      });
      if (!set || set.course?.id !== courseId) {
        throw new BadRequestException(
          'This course set does not belong to that course',
        );
      }
      return dto.questionIds
        ? this.pickWithin(set.udemyQuestionBanks ?? [], dto.questionIds)
        : (set.udemyQuestionBanks ?? []);
    }

    // The drill: questions pooled across the course's sets, chosen by the
    // client. Their ids are checked against the course, or an attempt could
    // be stuffed with questions from a course the learner never bought.
    if (!dto.questionIds?.length) {
      throw new BadRequestException(
        'A drill attempt must list its question ids',
      );
    }
    const sets = await this.courseSetRepository.find({
      where: { course: { id: courseId } },
      relations: ['udemyQuestionBanks'],
    });
    const withinCourse = sets.flatMap((set) => set.udemyQuestionBanks ?? []);
    return this.pickWithin(withinCourse, dto.questionIds);
  }

  private pickWithin(
    available: UdemyQuestionBank[],
    requested: string[],
  ): UdemyQuestionBank[] {
    const byId = new Map(
      available.map((question) => [String(question.id), question]),
    );
    const picked = requested.map((id) => byId.get(id));
    if (picked.some((question) => question === undefined)) {
      throw new BadRequestException(
        'Some questions do not belong to that course',
      );
    }
    return picked as UdemyQuestionBank[];
  }

  /** The questions an existing attempt covers, for grading. */
  private async attemptQuestions(
    attempt: TestAttempt,
  ): Promise<UdemyQuestionBank[]> {
    if (attempt.questionIds?.length) {
      const found = await this.questionRepository.find({
        where: { id: In(attempt.questionIds.map(Number)) },
      });
      // A question deleted since the attempt began simply drops out; grading
      // it as wrong would punish the learner for an edit to the bank. The
      // order is the database's, not the order the attempt was dealt —
      // grading and the domain summary are both order-independent, and a
      // caller that needs the dealt order should sort by questionIds itself.
      return found;
    }

    if (!attempt.courseSet) return [];
    const set = await this.courseSetRepository.findOne({
      where: { id: attempt.courseSet.id },
      relations: ['udemyQuestionBanks'],
    });
    return set?.udemyQuestionBanks ?? [];
  }

  private async courseOf(attempt: TestAttempt): Promise<Course | undefined> {
    const found = await this.courseRepository.findOne({
      where: { id: attempt.course?.id },
    });
    return found ?? undefined;
  }
}
