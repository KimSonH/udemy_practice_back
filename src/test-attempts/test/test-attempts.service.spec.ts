import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Course } from 'src/courses/entities/courses.entity';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
import { UdemyQuestionBank } from 'src/udemy-question-banks/entities/udemy-question-bank.entity';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';
import { createMockRepository } from 'src/common/test/mocks';

import { TestAttempt } from '../entities/test-attempt.entity';
import { TestAttemptsService } from '../test-attempts.service';

const USER = 3;
const OTHER_QUESTION = '999';

function question(id: number, correctAnswer: string, domain?: string) {
  return { id, correctAnswer, domain } as UdemyQuestionBank;
}

function course(overrides: Partial<Course> = {}): Course {
  return { id: 7, type: 'free', ...overrides } as Course;
}

describe('TestAttemptsService', () => {
  let service: TestAttemptsService;
  let attempts: ReturnType<typeof createMockRepository>;
  let courses: ReturnType<typeof createMockRepository>;
  let sets: ReturnType<typeof createMockRepository>;
  let questions: ReturnType<typeof createMockRepository>;
  let userCourses: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    attempts = createMockRepository();
    courses = createMockRepository();
    sets = createMockRepository();
    questions = createMockRepository();
    userCourses = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestAttemptsService,
        { provide: getRepositoryToken(TestAttempt), useValue: attempts },
        { provide: getRepositoryToken(Course), useValue: courses },
        { provide: getRepositoryToken(CourseSet), useValue: sets },
        { provide: getRepositoryToken(UdemyQuestionBank), useValue: questions },
        { provide: getRepositoryToken(UserCourse), useValue: userCourses },
      ],
    }).compile();

    service = module.get(TestAttemptsService);

    // create/save stand in for the ORM: whatever the service builds comes
    // straight back, so a test can assert on what it decided to store.
    attempts.create.mockImplementation((input) => input as never);
    attempts.save.mockImplementation((input) =>
      Promise.resolve({ id: 91, ...(input as object) } as never),
    );
  });

  describe('start', () => {
    const setWith = (...qs: UdemyQuestionBank[]) => ({
      id: 12,
      course: { id: 7 },
      udemyQuestionBanks: qs,
    });

    it('refuses a course that does not exist', async () => {
      courses.findOne.mockResolvedValue(null);

      await expect(
        service.start(USER, { courseId: 7, courseSetId: 12, mode: 'exam' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses a paid course the learner has not bought', async () => {
      courses.findOne.mockResolvedValue(course({ type: 'paid' }) as never);
      userCourses.findOne.mockResolvedValue(null);

      // 403, not 404: the course is in the catalogue, so denying its
      // existence would only confuse.
      await expect(
        service.start(USER, { courseId: 7, courseSetId: 12, mode: 'exam' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows a paid course the learner has bought', async () => {
      courses.findOne.mockResolvedValue(course({ type: 'paid' }) as never);
      userCourses.findOne.mockResolvedValue({ id: 1 } as never);
      sets.findOne.mockResolvedValue(setWith(question(1, '1')) as never);

      await expect(
        service.start(USER, { courseId: 7, courseSetId: 12, mode: 'exam' }),
      ).resolves.toMatchObject({ status: 'in_progress' });
    });

    it('does not ask about ownership for a free course', async () => {
      courses.findOne.mockResolvedValue(course({ type: 'free' }) as never);
      sets.findOne.mockResolvedValue(setWith(question(1, '1')) as never);

      await service.start(USER, {
        courseId: 7,
        courseSetId: 12,
        mode: 'practice',
      });

      expect(userCourses.findOne).not.toHaveBeenCalled();
    });

    it('refuses a set belonging to a different course', async () => {
      courses.findOne.mockResolvedValue(course() as never);
      sets.findOne.mockResolvedValue({
        id: 12,
        course: { id: 8 },
        udemyQuestionBanks: [question(1, '1')],
      } as never);

      await expect(
        service.start(USER, { courseId: 7, courseSetId: 12, mode: 'exam' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an attempt with no questions', async () => {
      courses.findOne.mockResolvedValue(course() as never);
      sets.findOne.mockResolvedValue(setWith() as never);

      await expect(
        service.start(USER, { courseId: 7, courseSetId: 12, mode: 'exam' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a drill that lists no questions', async () => {
      courses.findOne.mockResolvedValue(course() as never);

      await expect(
        service.start(USER, { courseId: 7, mode: 'practice' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses questions that belong to another course', async () => {
      courses.findOne.mockResolvedValue(course() as never);
      sets.find.mockResolvedValue([setWith(question(1, '1'))] as never);

      // Without this the drill is a way to pull questions out of a course
      // the learner never bought.
      await expect(
        service.start(USER, {
          courseId: 7,
          mode: 'practice',
          questionIds: ['1', OTHER_QUESTION],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('takes the drill questions from across the course sets', async () => {
      courses.findOne.mockResolvedValue(course() as never);
      sets.find.mockResolvedValue([
        setWith(question(1, '1')),
        setWith(question(2, '2')),
      ] as never);

      await expect(
        service.start(USER, {
          courseId: 7,
          mode: 'practice',
          questionIds: ['2', '1'],
        }),
      ).resolves.toMatchObject({ questionIds: ['2', '1'] });
    });

    it('sets the deadline from the course duration, in exam mode', async () => {
      const now = new Date('2026-09-21T10:00:00.000Z');
      courses.findOne.mockResolvedValue(
        course({ durationMinutes: 100 }) as never,
      );
      sets.findOne.mockResolvedValue(setWith(question(1, '1')) as never);

      const attempt = await service.start(
        USER,
        { courseId: 7, courseSetId: 12, mode: 'exam' },
        now,
      );

      expect(attempt.deadline).toEqual(new Date('2026-09-21T11:40:00.000Z'));
    });

    it('leaves practice mode untimed', async () => {
      courses.findOne.mockResolvedValue(
        course({ durationMinutes: 100 }) as never,
      );
      sets.findOne.mockResolvedValue(setWith(question(1, '1')) as never);

      const attempt = await service.start(USER, {
        courseId: 7,
        courseSetId: 12,
        mode: 'practice',
      });

      expect(attempt.deadline).toBeUndefined();
    });
  });

  describe('saveProgress', () => {
    const stored = (overrides: Partial<TestAttempt> = {}) =>
      ({
        id: 91,
        status: 'in_progress',
        revision: 4,
        answers: {},
        flagged: [],
        revealed: [],
        currentIndex: 0,
        ...overrides,
      }) as TestAttempt;

    it("reports somebody else's attempt as missing", async () => {
      attempts.findOne.mockResolvedValue(null);

      // 404 rather than 403: whether it exists is not theirs to learn.
      await expect(
        service.saveProgress(USER, 91, { revision: 0 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('looks the attempt up by owner, not by id alone', async () => {
      attempts.findOne.mockResolvedValue(stored());

      await service.saveProgress(USER, 91, { revision: 4 });

      // Asserting the rejection above proves nothing on its own: the mock
      // returns whatever the test says regardless of the query. The owner has
      // to be part of the lookup, or any learner reaches any attempt by
      // guessing an id.
      expect(attempts.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 91, user: { id: USER } },
        }),
      );
    });

    it('refuses to write to a submitted attempt', async () => {
      attempts.findOne.mockResolvedValue(stored({ status: 'submitted' }));

      await expect(
        service.saveProgress(USER, 91, { revision: 4 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses a stale revision instead of merging', async () => {
      attempts.findOne.mockResolvedValue(stored({ revision: 5 }));

      await expect(
        service.saveProgress(USER, 91, {
          revision: 4,
          answers: { '1': ['2'] },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(attempts.save).not.toHaveBeenCalled();
    });

    it('tells the loser of a conflict where the record actually is', async () => {
      attempts.findOne.mockResolvedValue(stored({ revision: 5 }));

      await expect(
        service.saveProgress(USER, 91, { revision: 4 }),
      ).rejects.toMatchObject({ response: { revision: 5 } });
    });

    it('stores the answers and moves the revision on', async () => {
      attempts.findOne.mockResolvedValue(stored());

      const saved = await service.saveProgress(USER, 91, {
        revision: 4,
        answers: { '1': ['2'] },
        currentIndex: 3,
      });

      expect(saved).toMatchObject({
        answers: { '1': ['2'] },
        currentIndex: 3,
        revision: 5,
      });
    });

    it('leaves out what the save did not mention', async () => {
      attempts.findOne.mockResolvedValue(
        stored({ flagged: ['9'], currentIndex: 2 }),
      );

      const saved = await service.saveProgress(USER, 91, {
        revision: 4,
        answers: { '1': ['2'] },
      });

      // A save that carries only answers must not wipe the flags.
      expect(saved.flagged).toEqual(['9']);
      expect(saved.currentIndex).toBe(2);
    });
  });

  describe('submit', () => {
    const running = (overrides: Partial<TestAttempt> = {}) =>
      ({
        id: 91,
        status: 'in_progress',
        revision: 2,
        answers: {},
        course: course(),
        courseSet: { id: 12 },
        ...overrides,
      }) as TestAttempt;

    const withQuestions = (...qs: UdemyQuestionBank[]) =>
      sets.findOne.mockResolvedValue({
        id: 12,
        udemyQuestionBanks: qs,
      } as never);

    it('grades against the stored answers', async () => {
      attempts.findOne.mockResolvedValue(
        running({ answers: { '1': ['1'], '2': ['9'] } }),
      );
      withQuestions(question(1, '1'), question(2, '2'), question(3, '3'));
      courses.findOne.mockResolvedValue(course() as never);

      const result = await service.submit(USER, 91, {});

      // One right, one wrong, one never answered.
      expect(result).toMatchObject({
        correctCount: 1,
        totalCount: 3,
        percent: 33,
      });
    });

    it('applies the answers sent with the submit', async () => {
      attempts.findOne.mockResolvedValue(running());
      withQuestions(question(1, '1'));
      courses.findOne.mockResolvedValue(course() as never);

      const result = await service.submit(USER, 91, {
        answers: { '1': ['1'] },
      });

      expect(result.correctCount).toBe(1);
    });

    it('breaks the score down by domain', async () => {
      attempts.findOne.mockResolvedValue(running({ answers: { '1': ['1'] } }));
      withQuestions(question(1, '1', 'Plan'), question(2, '2', 'Build'));
      courses.findOne.mockResolvedValue(course() as never);

      const result = await service.submit(USER, 91, {});

      expect(result.domainScores).toEqual([
        { domain: 'Build', correct: 0, total: 1, percent: 0 },
        { domain: 'Plan', correct: 1, total: 1, percent: 100 },
      ]);
    });

    it('uses the course pass mark to decide the result', async () => {
      attempts.findOne.mockResolvedValue(
        running({
          answers: { '1': ['1'] },
          course: course({ passingPercent: 100 }),
        }),
      );
      withQuestions(question(1, '1'), question(2, '2'));
      courses.findOne.mockResolvedValue(
        course({ passingPercent: 100 }) as never,
      );

      const result = await service.submit(USER, 91, {});

      // 50% is a pass under the default mark and a fail under this course's.
      expect(result).toMatchObject({
        percent: 50,
        passingPercent: 100,
        passed: false,
      });
    });

    it('marks an attempt handed in after the deadline as timed out', async () => {
      attempts.findOne.mockResolvedValue(
        running({ deadline: new Date('2026-09-21T10:00:00.000Z') }),
      );
      withQuestions(question(1, '1'));
      courses.findOne.mockResolvedValue(course() as never);

      const result = await service.submit(
        USER,
        91,
        {},
        new Date('2026-09-21T10:00:01.000Z'),
      );

      // Decided against the server's clock; the browser never says so.
      expect(result.timedOut).toBe(true);
    });

    it('times out an attempt handed in exactly on the deadline', async () => {
      const deadline = new Date('2026-09-21T10:00:00.000Z');
      attempts.findOne.mockResolvedValue(running({ deadline }));
      withQuestions(question(1, '1'));
      courses.findOne.mockResolvedValue(course() as never);

      const result = await service.submit(USER, 91, {}, deadline);

      // The boundary is shared with two other places: the runner's countdown
      // fires at `remaining <= 0`, and progress calls this instant expired.
      // Reaching the deadline is time up in all three.
      expect(result.timedOut).toBe(true);
    });

    it('does not time out an attempt handed in a second early', async () => {
      attempts.findOne.mockResolvedValue(
        running({ deadline: new Date('2026-09-21T10:00:00.000Z') }),
      );
      withQuestions(question(1, '1'));
      courses.findOne.mockResolvedValue(course() as never);

      const result = await service.submit(
        USER,
        91,
        {},
        new Date('2026-09-21T09:59:59.000Z'),
      );

      expect(result.timedOut).toBe(false);
    });

    it('never times out an untimed practice attempt', async () => {
      attempts.findOne.mockResolvedValue(running({ deadline: undefined }));
      withQuestions(question(1, '1'));
      courses.findOne.mockResolvedValue(course() as never);

      const result = await service.submit(
        USER,
        91,
        {},
        new Date('2099-01-01T00:00:00.000Z'),
      );

      expect(result.timedOut).toBe(false);
    });

    it('refuses to submit twice', async () => {
      attempts.findOne.mockResolvedValue(running({ status: 'submitted' }));

      await expect(service.submit(USER, 91, {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('refuses a submit that names a stale revision', async () => {
      attempts.findOne.mockResolvedValue(running({ revision: 5 }));

      await expect(
        service.submit(USER, 91, { revision: 4 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('accepts a submit that names no revision at all', async () => {
      attempts.findOne.mockResolvedValue(running({ revision: 5 }));
      withQuestions(question(1, '1'));
      courses.findOne.mockResolvedValue(course() as never);

      // The timer running out and the page closing both submit without having
      // read the latest revision. Refusing them throws away a finished attempt
      // to protect a record nobody is editing.
      await expect(service.submit(USER, 91, {})).resolves.toMatchObject({
        status: 'submitted',
      });
    });

    it('drops a question deleted since the attempt began', async () => {
      attempts.findOne.mockResolvedValue(
        running({ questionIds: ['1', '2'], answers: { '1': ['1'] } }),
      );
      questions.find.mockResolvedValue([question(1, '1')] as never);
      courses.findOne.mockResolvedValue(course() as never);

      const result = await service.submit(USER, 91, {});

      // Grading the missing one as wrong would punish the learner for an edit
      // made to the question bank.
      expect(result).toMatchObject({ correctCount: 1, totalCount: 1 });
    });

    it('grades a drill from the ids the attempt recorded', async () => {
      attempts.findOne.mockResolvedValue(
        running({ questionIds: ['2', '1'], answers: { '2': ['2'] } }),
      );
      questions.find.mockResolvedValue([
        question(1, '1'),
        question(2, '2'),
      ] as never);
      courses.findOne.mockResolvedValue(course() as never);

      const result = await service.submit(USER, 91, {});

      // A drill has no set to read from, so the ids on the attempt are the
      // only record of what it covered.
      expect(result).toMatchObject({ correctCount: 1, totalCount: 2 });
      expect(sets.findOne).not.toHaveBeenCalled();
    });
  });
});
