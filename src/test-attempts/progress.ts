import { AttemptStatus, TestMode } from './test-attempt.constants';
import { hasPassed, scorePercent } from './exam-timing';
import { retentionCutoffs } from './test-attempt.constants';

/**
 * One attempt, flattened for summarising. The service does the loading; this
 * file does the arithmetic and nothing else, so the rules can be tested
 * without a database.
 */
export type ProgressRow = {
  courseId: number;
  courseName: string;
  /** How many sets the course has, so "3 of 6" can be said. */
  setsTotal: number;
  attemptId: number;
  courseSetId: number | null;
  courseSetName: string | null;
  mode: TestMode;
  status: AttemptStatus;
  /** Questions with at least one option picked. */
  answered: number;
  /** Questions in the attempt. Known while running too, unlike the score. */
  questionCount: number;
  correctCount: number | null;
  startedAt: Date;
  /** Last touched. What decides whether an unfinished attempt was abandoned. */
  updatedAt: Date;
  finishedAt: Date | null;
  deadline: Date | null;
  /** The course's own pass mark, or null to fall back to the default. */
  passingPercent: number | null;
};

/** One graded sitting, for the progress history on the dashboard. */
export type RecentResult = {
  attemptId: number;
  courseId: number;
  courseName: string;
  courseSetName: string | null;
  correctCount: number;
  totalCount: number;
  percent: number;
  passed: boolean;
  finishedAt: string;
};

export type InProgressSummary = {
  attemptId: number;
  courseSetId: number | null;
  courseSetName: string | null;
  mode: TestMode;
  answered: number;
  total: number;
  deadline: string | null;
  /** True once the clock has run out. Never call an expired attempt resumable. */
  expired: boolean;
};

export type CourseProgress = {
  courseId: number;
  courseName: string;
  setsTotal: number;
  /** Distinct sets with at least one submitted attempt. The drill is not one. */
  setsAttempted: number;
  bestPercent: number | null;
  lastPercent: number | null;
  lastAttemptAt: string | null;
  inProgress: InProgressSummary | null;
};

/**
 * What every course the learner has touched looks like right now.
 *
 * Ordered by most recent activity: the question this answers is "where was
 * I", and the answer is almost always the thing last touched.
 */
export function summarizeProgress(
  rows: ProgressRow[],
  now: Date,
): CourseProgress[] {
  const byCourse = new Map<number, ProgressRow[]>();
  for (const row of rows) {
    const bucket = byCourse.get(row.courseId) ?? [];
    bucket.push(row);
    byCourse.set(row.courseId, bucket);
  }

  const courses: (CourseProgress & { sortKey: number })[] = [];

  for (const [courseId, attempts] of byCourse) {
    const submitted = attempts.filter(
      (attempt) => attempt.status === 'submitted',
    );
    const percents = submitted
      .filter((attempt) => attempt.questionCount > 0)
      .map((attempt) =>
        scorePercent(attempt.correctCount ?? 0, attempt.questionCount),
      );

    // Most recent first, so "last" means last started.
    const byRecency = [...submitted].sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
    const latest = byRecency[0];

    // Only a real set counts towards "3 of 6": the drill belongs to no set,
    // and counting it would let the strip claim a seventh of six.
    const setsAttempted = new Set(
      submitted
        .filter((attempt) => attempt.courseSetId !== null)
        .map((attempt) => attempt.courseSetId),
    ).size;

    // The newest unfinished attempt, and only if it was touched recently.
    // Older ones are abandoned: offering a choice of half-finished sittings
    // is not help, and an untimed practice attempt is never marked expired,
    // so without the cutoff one left last year is offered as "carry on"
    // forever. Judged on when it was last touched, not when it was opened —
    // an attempt begun a month ago and answered this morning is live.
    const { abandonedBefore } = retentionCutoffs(now);
    const running = attempts
      .filter(
        (attempt) =>
          attempt.status === 'in_progress' &&
          attempt.updatedAt > abandonedBefore,
      )
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

    const first = attempts[0];
    courses.push({
      courseId,
      courseName: first.courseName,
      setsTotal: first.setsTotal,
      setsAttempted,
      bestPercent: percents.length ? Math.max(...percents) : null,
      lastPercent: latest
        ? scorePercent(latest.correctCount ?? 0, latest.questionCount)
        : null,
      lastAttemptAt: latest ? latest.startedAt.toISOString() : null,
      inProgress: running
        ? {
            attemptId: running.attemptId,
            courseSetId: running.courseSetId,
            courseSetName: running.courseSetName,
            mode: running.mode,
            answered: running.answered,
            total: running.questionCount,
            deadline: running.deadline ? running.deadline.toISOString() : null,
            // Decided here, against the server's clock. A browser whose clock
            // is wrong would otherwise be invited to resume a finished exam.
            expired: !!running.deadline && running.deadline <= now,
          }
        : null,
      sortKey: Math.max(
        ...attempts.map((attempt) => attempt.startedAt.getTime()),
      ),
    });
  }

  courses.sort((a, b) => b.sortKey - a.sortKey);
  // sortKey is scaffolding for the ordering above, not part of the answer.
  return courses.map((course) => {
    const summary: CourseProgress = { ...course };
    delete (summary as Partial<typeof course>).sortKey;
    return summary;
  });
}

/** Questions with at least one option picked. */
/**
 * The graded sittings, newest first — the line a progress chart is drawn
 * from.
 *
 * Only submitted attempts appear. One still being taken has no score, and
 * plotting it as zero would draw a collapse that never happened.
 */
export function recentResults(
  rows: ProgressRow[],
  limit: number,
): RecentResult[] {
  return rows
    .filter(
      (row): row is ProgressRow & { finishedAt: Date } =>
        row.status === 'submitted' && row.finishedAt !== null,
    )
    .sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime())
    .slice(0, Math.max(0, limit))
    .map((row) => {
      const correct = row.correctCount ?? 0;
      return {
        attemptId: row.attemptId,
        courseId: row.courseId,
        courseName: row.courseName,
        courseSetName: row.courseSetName,
        correctCount: correct,
        totalCount: row.questionCount,
        percent: scorePercent(correct, row.questionCount),
        passed: hasPassed(correct, row.questionCount, {
          passingPercent: row.passingPercent,
        }),
        finishedAt: row.finishedAt.toISOString(),
      };
    });
}

export function answeredCount(answers: Record<string, string[]>): number {
  return Object.values(answers ?? {}).filter((picked) => picked?.length > 0)
    .length;
}
