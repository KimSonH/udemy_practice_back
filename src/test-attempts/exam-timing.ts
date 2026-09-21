/**
 * How long an exam runs and what counts as a pass, ported from the front's
 * `src/lib/test-config.ts`.
 *
 * The server owns both. A deadline supplied by the client would make
 * "this attempt has run out of time" a claim the client could simply decline
 * to make, and a pass mark decided in the browser is a pass mark anyone can
 * award themselves.
 */

/**
 * Real exams are not a fixed number of minutes per question — AI-102 allows
 * 100 minutes for roughly 40 to 60 — so a course that knows better states its
 * own figures and this is only the fallback.
 */
export const MINUTES_PER_QUESTION = 1.5;
export const DEFAULT_PASSING_PERCENT = 70;

export type ExamTiming = {
  durationMinutes?: number | null;
  passingPercent?: number | null;
};

/**
 * A stated figure is honoured only when it is a usable one. Both columns are
 * nullable and nothing but this guard stops a zero from meaning an exam with
 * no time to sit it.
 */
function stated(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function durationMinutes(
  questionCount: number,
  timing?: ExamTiming,
): number {
  const override = stated(timing?.durationMinutes);
  if (override !== null) return Math.ceil(override);
  if (questionCount <= 0) return 0;
  return Math.ceil(questionCount * MINUTES_PER_QUESTION);
}

export function passingPercent(timing?: ExamTiming): number {
  const override = stated(timing?.passingPercent);
  // Above 100 would be a pass mark nobody can reach.
  if (override !== null && override <= 100) return Math.round(override);
  return DEFAULT_PASSING_PERCENT;
}

export function scorePercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function hasPassed(
  correct: number,
  total: number,
  timing?: ExamTiming,
): boolean {
  if (total <= 0) return false;
  return scorePercent(correct, total) >= passingPercent(timing);
}

/**
 * When an exam started now would run out. Null in practice mode, which is
 * untimed, and null for an exam with no questions, which has nothing to time.
 */
export function deadlineFrom(
  startedAt: Date,
  questionCount: number,
  timing?: ExamTiming,
): Date | null {
  const minutes = durationMinutes(questionCount, timing);
  if (minutes <= 0) return null;
  return new Date(startedAt.getTime() + minutes * 60_000);
}
