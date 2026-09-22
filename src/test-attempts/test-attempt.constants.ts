export const TEST_MODES = ['exam', 'practice'] as const;
export type TestMode = (typeof TEST_MODES)[number];

export const ATTEMPT_STATUSES = ['in_progress', 'submitted'] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

/**
 * An attempt's answers, flags and reveals all together. A few hundred
 * questions is a few KB, so the whole map is sent on each save; a diff would
 * need merging, and merging two devices' answers has no right result.
 */
export const MAX_ATTEMPT_QUESTIONS = 1000;

/**
 * How long a submitted attempt keeps the answers themselves.
 *
 * The result — score, domain breakdown, dates — is kept for good, because
 * "best score" is a permanent claim and expiring it would quietly lower
 * someone's best with a scheduled job. The working data is a different
 * thing: it is 89% of the bytes (measured: 7.2 KB of an 8.1 KB shuffled
 * attempt) and is only read when someone reopens an old attempt question by
 * question. Clearing it changes no figure shown anywhere.
 */
export const DETAIL_RETENTION_DAYS = 180;

/**
 * How long an unfinished attempt is still treated as one someone might come
 * back to.
 *
 * Not about storage. A practice attempt has no deadline, so nothing ever
 * marks it expired, and without this an attempt abandoned last year is
 * offered as "carry on where you left off" forever and counted as unfinished
 * on the dashboard.
 */
export const ABANDONED_ATTEMPT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function retentionCutoffs(now: Date) {
  return {
    /** Submitted before this: the answers go, the result stays. */
    detailsBefore: new Date(now.getTime() - DETAIL_RETENTION_DAYS * DAY_MS),
    /** Untouched since this: the attempt was abandoned. */
    abandonedBefore: new Date(now.getTime() - ABANDONED_ATTEMPT_DAYS * DAY_MS),
  };
}
