import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  QuestionStatus,
  gradeQuestion,
  parseCorrectIndexes,
  summarizeByDomain,
} from '../grading';

const CASES_PATH = join(__dirname, 'grading-cases.json');
const raw = readFileSync(CASES_PATH);
const contract = JSON.parse(raw.toString()) as {
  cases: {
    name: string;
    correctAnswer: string | null;
    selected: string[];
    expected: QuestionStatus;
  }[];
};

/**
 * The same digest is asserted in udemy_practice_front. Two implementations of
 * grading exist — this one for signed-in learners, the browser's for guests —
 * and the only thing keeping them honest is that they answer to one file.
 * Editing the contract in one repo alone turns that repo red here, which is
 * the reminder to carry the change across.
 */
const CONTRACT_SHA256 =
  'a5f693f4730f034f1ce032118f4fea7471499bbe81b18c00ced2f74a3069f6f3';

describe('grading contract', () => {
  it('is the same file the front grades against', () => {
    expect(createHash('sha256').update(raw).digest('hex')).toBe(
      CONTRACT_SHA256,
    );
  });

  it.each(contract.cases.map((c) => [c.name, c] as const))(
    '%s',
    (_name, testCase) => {
      expect(
        gradeQuestion(
          { correctAnswer: testCase.correctAnswer ?? undefined },
          testCase.selected,
        ),
      ).toBe(testCase.expected);
    },
  );
});

describe('parseCorrectIndexes', () => {
  it('returns nothing for an absent key', () => {
    expect(parseCorrectIndexes(null)).toEqual([]);
    expect(parseCorrectIndexes(undefined)).toEqual([]);
    expect(parseCorrectIndexes('   ')).toEqual([]);
  });

  it('sorts so comparison does not depend on how the CSV was written', () => {
    expect(parseCorrectIndexes('3,1')).toEqual(['1', '3']);
  });

  it('sorts as strings, which is what grading compares', () => {
    // Both sides of the comparison go through this function, so "10" landing
    // before "2" is consistent rather than wrong.
    expect(parseCorrectIndexes('2,10')).toEqual(['10', '2']);
  });
});

describe('summarizeByDomain', () => {
  const q = (domain: string | undefined) => ({ domain });

  it('returns nothing when no question carries a domain', () => {
    expect(
      summarizeByDomain([
        { question: q(undefined), status: 'correct' },
        { question: q('  '), status: 'incorrect' },
      ]),
    ).toEqual([]);
  });

  it('counts skipped against the domain, like the overall score', () => {
    expect(
      summarizeByDomain([
        { question: q('Plan'), status: 'correct' },
        { question: q('Plan'), status: 'skipped' },
      ]),
    ).toEqual([{ domain: 'Plan', correct: 1, total: 2, percent: 50 }]);
  });

  it('puts the weakest domain first', () => {
    const result = summarizeByDomain([
      { question: q('Strong'), status: 'correct' },
      { question: q('Weak'), status: 'incorrect' },
    ]);

    expect(result.map((entry) => entry.domain)).toEqual(['Weak', 'Strong']);
  });

  it('breaks a tie on percent by the larger domain', () => {
    const result = summarizeByDomain([
      { question: q('Small'), status: 'correct' },
      { question: q('Big'), status: 'correct' },
      { question: q('Big'), status: 'correct' },
    ]);

    // Both are 100%. The bigger sample is the more solid result, so it is
    // reported as the stronger of the two.
    expect(result.map((entry) => entry.domain)).toEqual(['Big', 'Small']);
  });
});
