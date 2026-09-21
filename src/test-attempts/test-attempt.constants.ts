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
