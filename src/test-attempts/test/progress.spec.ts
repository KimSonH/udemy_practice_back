import {
  ProgressRow,
  answeredCount,
  recentResults,
  summarizeProgress,
} from '../progress';

const NOW = new Date('2026-09-21T12:00:00.000Z');
const at = (iso: string) => new Date(iso);

function row(overrides: Partial<ProgressRow> = {}): ProgressRow {
  return {
    courseId: 3,
    courseName: 'AI-102',
    setsTotal: 6,
    attemptId: 1,
    courseSetId: 7,
    courseSetName: 'Course Set 1',
    mode: 'exam',
    status: 'submitted',
    answered: 0,
    questionCount: 100,
    correctCount: 50,
    startedAt: at('2026-09-20T10:00:00.000Z'),
    finishedAt: at('2026-09-20T11:00:00.000Z'),
    deadline: null,
    passingPercent: null,
    ...overrides,
  };
}

describe('answeredCount', () => {
  it('counts only questions with something picked', () => {
    expect(answeredCount({ '1': ['2'], '2': [], '3': ['1', '3'] })).toBe(2);
  });

  it('survives an attempt that has no answers object yet', () => {
    expect(
      answeredCount(undefined as unknown as Record<string, string[]>),
    ).toBe(0);
  });
});

describe('recentResults', () => {
  it('returns nothing when nothing has been graded', () => {
    expect(
      recentResults([row({ status: 'in_progress', finishedAt: null })], 10),
    ).toEqual([]);
  });

  it('leaves out an attempt still being taken', () => {
    const results = recentResults(
      [
        row({ attemptId: 1 }),
        row({ attemptId: 2, status: 'in_progress', finishedAt: null }),
      ],
      10,
    );

    // Plotting an ungraded attempt as zero would draw a collapse that never
    // happened.
    expect(results.map((r) => r.attemptId)).toEqual([1]);
  });

  it('puts the newest result first', () => {
    const results = recentResults(
      [
        row({ attemptId: 1, finishedAt: at('2026-09-18T10:00:00.000Z') }),
        row({ attemptId: 2, finishedAt: at('2026-09-20T10:00:00.000Z') }),
      ],
      10,
    );

    expect(results.map((r) => r.attemptId)).toEqual([2, 1]);
  });

  it('orders by when it was handed in, not when it was begun', () => {
    const results = recentResults(
      [
        row({
          attemptId: 1,
          startedAt: at('2026-09-01T10:00:00.000Z'),
          finishedAt: at('2026-09-20T10:00:00.000Z'),
        }),
        row({
          attemptId: 2,
          startedAt: at('2026-09-19T10:00:00.000Z'),
          finishedAt: at('2026-09-19T11:00:00.000Z'),
        }),
      ],
      10,
    );

    // An attempt left open for a fortnight and handed in today is the most
    // recent result, whatever day it was opened.
    expect(results.map((r) => r.attemptId)).toEqual([1, 2]);
  });

  it('honours the limit', () => {
    const results = recentResults(
      [row({ attemptId: 1 }), row({ attemptId: 2 }), row({ attemptId: 3 })],
      2,
    );

    expect(results).toHaveLength(2);
  });

  it('returns nothing for a limit of zero', () => {
    expect(recentResults([row()], 0)).toEqual([]);
  });

  it('judges a pass against the default mark', () => {
    const results = recentResults(
      [row({ correctCount: 70, questionCount: 100 })],
      10,
    );

    expect(results[0]).toMatchObject({ percent: 70, passed: true });
  });

  it("judges a pass against the course's own mark when it has one", () => {
    const results = recentResults(
      [row({ correctCount: 70, questionCount: 100, passingPercent: 80 })],
      10,
    );

    // 70% passes by default and fails this course. Reporting the default
    // would tell a learner they passed something they did not.
    expect(results[0]).toMatchObject({ percent: 70, passed: false });
  });
});

describe('summarizeProgress', () => {
  it('returns nothing for a learner who has taken nothing', () => {
    expect(summarizeProgress([], NOW)).toEqual([]);
  });

  it('reports the best and the latest separately', () => {
    const result = summarizeProgress(
      [
        row({
          attemptId: 1,
          correctCount: 80,
          startedAt: at('2026-09-19T10:00:00.000Z'),
        }),
        row({
          attemptId: 2,
          correctCount: 40,
          startedAt: at('2026-09-20T10:00:00.000Z'),
        }),
      ],
      NOW,
    );

    // A learner who did worse on the retake still has their best result, and
    // collapsing the two into one figure hides whichever they wanted to see.
    expect(result[0]).toMatchObject({ bestPercent: 80, lastPercent: 40 });
  });

  it('counts distinct sets, not attempts', () => {
    const result = summarizeProgress(
      [
        row({ attemptId: 1, courseSetId: 7 }),
        row({ attemptId: 2, courseSetId: 7 }),
        row({ attemptId: 3, courseSetId: 8 }),
      ],
      NOW,
    );

    expect(result[0].setsAttempted).toBe(2);
  });

  it('does not let the drill count towards the sets covered', () => {
    const result = summarizeProgress(
      [row({ attemptId: 1, courseSetId: null, courseSetName: null })],
      NOW,
    );

    // The drill belongs to no set. Counting it would let a course of six
    // report seven covered.
    expect(result[0].setsAttempted).toBe(0);
  });

  it('ignores an unfinished attempt when scoring', () => {
    const result = summarizeProgress(
      [row({ status: 'in_progress', correctCount: null })],
      NOW,
    );

    // Nothing has been graded, so there is no score to report — not zero,
    // which would read as a failed attempt.
    expect(result[0]).toMatchObject({ bestPercent: null, lastPercent: null });
  });

  it('offers the unfinished attempt to carry on with', () => {
    const result = summarizeProgress(
      [
        row({ attemptId: 1 }),
        row({
          attemptId: 2,
          status: 'in_progress',
          correctCount: null,
          answered: 41,
          startedAt: at('2026-09-21T11:00:00.000Z'),
        }),
      ],
      NOW,
    );

    expect(result[0].inProgress).toMatchObject({
      attemptId: 2,
      answered: 41,
      total: 100,
      expired: false,
    });
  });

  it('offers only the newest unfinished attempt', () => {
    const result = summarizeProgress(
      [
        row({
          attemptId: 1,
          status: 'in_progress',
          startedAt: at('2026-09-18T10:00:00.000Z'),
        }),
        row({
          attemptId: 2,
          status: 'in_progress',
          startedAt: at('2026-09-21T10:00:00.000Z'),
        }),
      ],
      NOW,
    );

    // Older ones are abandoned. A choice of half-finished sittings is not help.
    expect(result[0].inProgress?.attemptId).toBe(2);
  });

  it('marks an attempt whose clock has run out', () => {
    const result = summarizeProgress(
      [
        row({
          status: 'in_progress',
          correctCount: null,
          deadline: at('2026-09-21T11:59:59.000Z'),
        }),
      ],
      NOW,
    );

    // Calling this "carry on" would be a lie: there is no time left in it.
    expect(result[0].inProgress?.expired).toBe(true);
  });

  it('expires an attempt exactly on its deadline', () => {
    const result = summarizeProgress(
      [row({ status: 'in_progress', correctCount: null, deadline: NOW })],
      NOW,
    );

    expect(result[0].inProgress?.expired).toBe(true);
  });

  it('never expires an untimed practice attempt', () => {
    const result = summarizeProgress(
      [
        row({
          status: 'in_progress',
          mode: 'practice',
          correctCount: null,
          deadline: null,
        }),
      ],
      NOW,
    );

    expect(result[0].inProgress?.expired).toBe(false);
  });

  it('puts the course touched most recently first', () => {
    const result = summarizeProgress(
      [
        row({
          courseId: 1,
          courseName: 'Older',
          startedAt: at('2026-09-01T10:00:00.000Z'),
        }),
        row({
          courseId: 2,
          courseName: 'Newer',
          startedAt: at('2026-09-20T10:00:00.000Z'),
        }),
      ],
      NOW,
    );

    // The question this answers is "where was I", and the answer is nearly
    // always the thing last touched.
    expect(result.map((course) => course.courseName)).toEqual([
      'Newer',
      'Older',
    ]);
  });

  it('ranks a course by its newest attempt, finished or not', () => {
    const result = summarizeProgress(
      [
        row({
          courseId: 1,
          courseName: 'Submitted long ago, resumed today',
          startedAt: at('2026-09-01T10:00:00.000Z'),
        }),
        row({
          courseId: 1,
          courseName: 'Submitted long ago, resumed today',
          attemptId: 9,
          status: 'in_progress',
          correctCount: null,
          startedAt: at('2026-09-21T09:00:00.000Z'),
        }),
        row({
          courseId: 2,
          courseName: 'Finished yesterday',
          startedAt: at('2026-09-20T10:00:00.000Z'),
        }),
      ],
      NOW,
    );

    expect(result[0].courseName).toBe('Submitted long ago, resumed today');
  });

  it('does not divide by a question count of zero', () => {
    const result = summarizeProgress(
      [row({ questionCount: 0, correctCount: 0 })],
      NOW,
    );

    expect(result[0].bestPercent).toBeNull();
    expect(result[0].lastPercent).toBe(0);
  });
});
