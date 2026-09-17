import {
  extractTestNumberFromFilename,
  parseQuestionCsv,
} from '../utils/parse-question-csv.util';

const HEADER = [
  'Question',
  'Question Type',
  'Answer Option 1',
  'Explanation 1',
  'Answer Option 2',
  'Explanation 2',
  'Answer Option 3',
  'Explanation 3',
  'Answer Option 4',
  'Explanation 4',
  'Correct Answers',
  'Overall Explanation',
  'Domain',
].join(',');

/** A complete, valid row. Override any cell through `parts`. */
function row(parts: Partial<Record<string, string>> = {}): string {
  const cells: Record<string, string> = {
    Question: 'What is 2 + 2?',
    'Question Type': '',
    'Answer Option 1': 'Three',
    'Explanation 1': 'Too small',
    'Answer Option 2': 'Four',
    'Explanation 2': 'Correct',
    'Answer Option 3': 'Five',
    'Explanation 3': 'Too big',
    'Answer Option 4': 'Six',
    'Explanation 4': 'Far too big',
    'Correct Answers': '2',
    'Overall Explanation': 'Basic arithmetic',
    Domain: 'Maths',
    ...parts,
  };

  return HEADER.split(',')
    .map((column) => cells[column] ?? '')
    .join(',');
}

function csv(...lines: string[]): Buffer {
  return Buffer.from([HEADER, ...lines].join('\n'), 'utf8');
}

describe('parseQuestionCsv', () => {
  describe('the file as a whole', () => {
    it('reports a CSV whose row does not match the header', () => {
      const broken = Buffer.from('a,b\n1,2,3\n', 'utf8');
      const result = parseQuestionCsv(broken);

      expect(result.rows).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/^Invalid CSV file: /);
    });

    it('reports a file that has a header but no data', () => {
      const result = parseQuestionCsv(csv());

      expect(result.rows).toEqual([]);
      expect(result.errors).toEqual(['The CSV file has no data']);
    });

    it('lists every missing required column in one message', () => {
      const file = Buffer.from(
        'Question,Answer Option 1\nWhat?,Alpha\n',
        'utf8',
      );
      const result = parseQuestionCsv(file);

      expect(result.rows).toEqual([]);
      expect(result.errors).toEqual([
        'The CSV file is missing required columns: Question Type, Answer Option 2, Correct Answers',
      ]);
    });
  });

  describe('a valid row', () => {
    it('keeps Correct Answers as the raw 1-based index string', () => {
      const result = parseQuestionCsv(csv(row({ 'Correct Answers': '3' })));

      expect(result.errors).toEqual([]);
      expect(result.rows).toHaveLength(1);
      // A string, not a number, and an index, not a letter. This is the
      // contract every consumer has to read it by.
      expect(result.rows[0].correctAnswer).toBe('3');
    });

    it('defaults Question Type to multiple-choice when the cell is blank', () => {
      const result = parseQuestionCsv(csv(row({ 'Question Type': '' })));

      expect(result.rows[0].questionType).toBe('multiple-choice');
    });

    it('keeps an explicit Question Type', () => {
      const result = parseQuestionCsv(
        csv(row({ 'Question Type': 'multiple-response' })),
      );

      expect(result.rows[0].questionType).toBe('multiple-response');
    });

    it('carries the options, explanations, overall explanation and domain', () => {
      const result = parseQuestionCsv(csv(row()));

      expect(result.rows[0]).toMatchObject({
        question: 'What is 2 + 2?',
        answerOption1: 'Three',
        explanation1: 'Too small',
        answerOption2: 'Four',
        explanation2: 'Correct',
        answerOption3: 'Five',
        answerOption4: 'Six',
        overallExplanation: 'Basic arithmetic',
        domain: 'Maths',
      });
    });

    it('turns blank optional cells into undefined rather than empty strings', () => {
      const result = parseQuestionCsv(
        csv(
          row({
            'Answer Option 3': '',
            'Explanation 3': '',
            'Answer Option 4': '',
            'Explanation 4': '',
            'Overall Explanation': '',
            Domain: '',
          }),
        ),
      );

      expect(result.errors).toEqual([]);
      expect(result.rows[0].answerOption3).toBeUndefined();
      expect(result.rows[0].explanation3).toBeUndefined();
      expect(result.rows[0].overallExplanation).toBeUndefined();
      expect(result.rows[0].domain).toBeUndefined();
    });
  });

  describe('row validation', () => {
    it('numbers rows by their line in the file, counting the header', () => {
      const result = parseQuestionCsv(csv(row(), row({ Question: '' }), row()));

      // The bad row is the third line of the file.
      expect(result.errors).toEqual(['Row 3: "Question" is missing']);
    });

    it('rejects a row with no question', () => {
      const result = parseQuestionCsv(csv(row({ Question: '   ' })));

      expect(result.errors).toEqual(['Row 2: "Question" is missing']);
    });

    it('requires both of the first two answer options', () => {
      const result = parseQuestionCsv(csv(row({ 'Answer Option 2': '' })));

      expect(result.errors).toEqual([
        'Row 2: "Answer Option 1" and "Answer Option 2" are both required',
      ]);
    });

    it('rejects a letter answer and echoes what it was given', () => {
      // The whole point of the contract: "C" is not an index. Anything that
      // reads answers as letters is reading a format this importer never wrote.
      const result = parseQuestionCsv(csv(row({ 'Correct Answers': 'C' })));

      expect(result.errors).toEqual([
        'Row 2: "Correct Answers" must be an integer such as "3", got "C"',
      ]);
    });

    it('rejects a non-integer Correct Answers', () => {
      const result = parseQuestionCsv(csv(row({ 'Correct Answers': '2.5' })));

      expect(result.errors).toEqual([
        'Row 2: "Correct Answers" must be an integer such as "3", got "2.5"',
      ]);
    });

    it('rejects a blank Correct Answers', () => {
      const result = parseQuestionCsv(csv(row({ 'Correct Answers': '' })));

      expect(result.errors).toEqual([
        'Row 2: "Correct Answers" must be an integer such as "3", got ""',
      ]);
    });

    it('rejects an index past the number of options present', () => {
      const result = parseQuestionCsv(
        csv(
          row({
            'Answer Option 3': '',
            'Answer Option 4': '',
            'Correct Answers': '3',
          }),
        ),
      );

      expect(result.errors).toEqual([
        'Row 2: "Correct Answers" = 3 but only 2 answer options are present',
      ]);
    });

    it('rejects index 0, because the format is 1-based', () => {
      const result = parseQuestionCsv(csv(row({ 'Correct Answers': '0' })));

      expect(result.errors).toEqual([
        'Row 2: "Correct Answers" = 0 but only 4 answer options are present',
      ]);
    });
  });

  describe('all-or-nothing', () => {
    it('returns no rows at all when any row fails', () => {
      const result = parseQuestionCsv(
        csv(row(), row({ 'Correct Answers': 'C' })),
      );

      expect(result.errors).toHaveLength(1);
      // The first row is perfectly good and is still dropped: an import is
      // all-or-nothing per file.
      expect(result.rows).toEqual([]);
    });

    it('collects an error from every bad row, not just the first', () => {
      const result = parseQuestionCsv(
        csv(
          row({ Question: '' }),
          row({ 'Correct Answers': 'C' }),
          row({ 'Answer Option 2': '' }),
        ),
      );

      expect(result.errors).toEqual([
        'Row 2: "Question" is missing',
        'Row 3: "Correct Answers" must be an integer such as "3", got "C"',
        'Row 4: "Answer Option 1" and "Answer Option 2" are both required',
      ]);
    });

    it('returns every row when the whole file is valid', () => {
      const result = parseQuestionCsv(
        csv(row(), row({ Question: 'Second' }), row({ Question: 'Third' })),
      );

      expect(result.errors).toEqual([]);
      expect(result.rows.map((parsed) => parsed.question)).toEqual([
        'What is 2 + 2?',
        'Second',
        'Third',
      ]);
    });
  });

  describe('a gap in the current validation', () => {
    // `optionCount` counts how many option cells are filled, not the highest
    // position that is filled, so a row with a hole in it is judged against the
    // wrong number. Both cases below are wrong; these tests pin today's
    // behaviour so that changing it has to be a deliberate act.
    it('rejects an answer that points at a real option when an earlier one is blank', () => {
      const result = parseQuestionCsv(
        csv(row({ 'Answer Option 3': '', 'Correct Answers': '4' })),
      );

      // Option 4 exists and holds "Six", yet the row is refused.
      expect(result.errors).toEqual([
        'Row 2: "Correct Answers" = 4 but only 3 answer options are present',
      ]);
    });

    it('accepts an answer that points at a blank option', () => {
      const result = parseQuestionCsv(
        csv(row({ 'Answer Option 3': '', 'Correct Answers': '3' })),
      );

      // Imported without complaint, and answerOption3 is undefined — the
      // question can never be answered correctly downstream.
      expect(result.errors).toEqual([]);
      expect(result.rows[0].correctAnswer).toBe('3');
      expect(result.rows[0].answerOption3).toBeUndefined();
    });
  });
});

describe('extractTestNumberFromFilename', () => {
  it.each([
    ['Practice Test 1.csv', 1],
    ['practice test 12.csv', 12],
    ['practice_test_7.csv', 7],
    ['practice-test-3.csv', 3],
    ['PracticeTest5.csv', 5],
    ['AI-102 Practice Test 6 final.csv', 6],
  ])('reads the number out of %s', (filename, expected) => {
    expect(extractTestNumberFromFilename(filename as string)).toBe(expected);
  });

  it('returns null when the filename has no practice test number', () => {
    expect(extractTestNumberFromFilename('questions.csv')).toBeNull();
    expect(extractTestNumberFromFilename('Practice Test.csv')).toBeNull();
  });

  it('does not match when more than one character separates the words', () => {
    // The separator class allows a single character, so this is not a match.
    expect(extractTestNumberFromFilename('practice  test 4.csv')).toBeNull();
  });
});
