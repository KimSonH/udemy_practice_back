import { AttemptStatus, TestMode } from './test-attempt.constants';
import { scorePercent } from './exam-timing';

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
  deadline: Date | null;
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

    // The newest unfinished attempt. Older ones are abandoned; offering the
    // learner a choice of half-finished sittings is not help.
    const running = attempts
      .filter((attempt) => attempt.status === 'in_progress')
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
export function answeredCount(answers: Record<string, string[]>): number {
  return Object.values(answers ?? {}).filter((picked) => picked?.length > 0)
    .length;
}
