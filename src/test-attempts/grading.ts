import { UdemyQuestionBank } from 'src/udemy-question-banks/entities/udemy-question-bank.entity';

export type QuestionStatus = 'correct' | 'incorrect' | 'skipped';

export type DomainScore = {
  domain: string;
  correct: number;
  total: number;
  /** Whole-number percentage of `total`. Skipped questions count against it. */
  percent: number;
};

/**
 * Grading, ported from the front's `src/lib/question-utils.ts`.
 *
 * Both copies exist on purpose: a guest takes free tests without an account,
 * so the browser must be able to grade, while a signed-in learner's score is
 * settled here where it cannot be forged. The two must not drift, which is
 * what `test/grading-cases.json` is for — the same file, byte for byte, runs
 * against both implementations.
 */

/**
 * `correctAnswer` holds 1-based option indexes, comma separated: "4" or "1,3".
 * The CSV importer enforces `/^\d+$/` per index, so anything non-numeric is
 * corrupt data and is dropped rather than guessed at.
 */
export function parseCorrectIndexes(
  correctAnswer: string | null | undefined,
): string[] {
  if (!correctAnswer?.trim()) return [];
  return [
    ...new Set(
      correctAnswer
        .split(',')
        .map((part) => part.trim())
        .filter((part) => /^\d+$/.test(part)),
    ),
  ].sort();
}

export function gradeQuestion(
  question: Pick<UdemyQuestionBank, 'correctAnswer'>,
  selected: string[],
): QuestionStatus {
  const picked = [...new Set(selected)].sort();
  if (picked.length === 0) return 'skipped';

  const expected = parseCorrectIndexes(question.correctAnswer);
  // A question with no recorded answer cannot be passed. Grading it "correct"
  // would inflate the score on broken data.
  if (expected.length === 0) return 'incorrect';

  return picked.join(',') === expected.join(',') ? 'correct' : 'incorrect';
}

/**
 * Score an attempt per exam domain, weakest first.
 *
 * Questions with no domain are dropped rather than collected into an "other"
 * bucket, which would read as a real exam area the learner should study.
 * Skipped counts as wrong, matching the overall score of correct/total.
 */
export function summarizeByDomain(
  graded: {
    question: Pick<UdemyQuestionBank, 'domain'>;
    status: QuestionStatus;
  }[],
): DomainScore[] {
  const tally = new Map<string, { correct: number; total: number }>();

  for (const entry of graded) {
    const domain = (entry.question.domain ?? '').trim();
    if (domain.length === 0) continue;

    const bucket = tally.get(domain) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (entry.status === 'correct') bucket.correct += 1;
    tally.set(domain, bucket);
  }

  return [...tally.entries()]
    .map(([domain, { correct, total }]) => ({
      domain,
      correct,
      total,
      percent: Math.round((correct / total) * 100),
    }))
    .sort(
      (a, b) =>
        a.percent - b.percent ||
        b.total - a.total ||
        a.domain.localeCompare(b.domain),
    );
}
