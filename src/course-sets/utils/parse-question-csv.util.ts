import { parse } from 'csv-parse/sync';

export interface ParsedQuestionRow {
  question: string;
  questionType: string;
  answerOption1: string;
  explanation1?: string;
  answerOption2: string;
  explanation2?: string;
  answerOption3?: string;
  explanation3?: string;
  answerOption4?: string;
  explanation4?: string;
  answerOption5?: string;
  explanation5?: string;
  answerOption6?: string;
  explanation6?: string;
  correctAnswer: string;
  overallExplanation?: string;
  domain?: string;
}

export interface ParseQuestionCsvResult {
  rows: ParsedQuestionRow[];
  errors: string[];
}

const REQUIRED_COLUMNS = [
  'Question',
  'Question Type',
  'Answer Option 1',
  'Answer Option 2',
  'Correct Answers',
];

const ANSWER_INDEXES = [1, 2, 3, 4, 5, 6];

/** `Answer Option 7`, `Answer Option 12` — anything past the six columns. */
const ANSWER_OPTION_COLUMN = /^Answer Option (\d+)$/;

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Option columns the file has and the schema has nowhere to put.
 *
 * A source export with seven options used to import with the seventh quietly
 * dropped, leaving a question easier than it was written and no trace that
 * anything was lost. It only came to light when the answer key pointed at the
 * missing option; when the key happened to stay within the first six, the row
 * looked perfectly good. 948 questions sit at the six-option ceiling and only
 * 32 of them ever revealed themselves that way.
 */
function unsupportedOptionColumns(headers: string[]): string[] {
  return headers.filter((header) => {
    const match = ANSWER_OPTION_COLUMN.exec(header);
    return match ? +match[1] > ANSWER_INDEXES.length : false;
  });
}

/**
 * Parse + validate 1 file CSV theo format "Practice Test" (Question, Question Type,
 * Answer Option 1..6, Explanation 1..6, Correct Answers, Overall Explanation, Domain).
 * Returns EVERY error found rather than throwing on the first bad row, so the
 * admin sees them all at once, and returns no rows if there is any error at all:
 * an import is all-or-nothing per file.
 */
export function parseQuestionCsv(buffer: Buffer): ParseQuestionCsvResult {
  const errors: string[] = [];

  let records: Record<string, string>[];
  try {
    records = parse(buffer, {
      columns: true,
      bom: true,
      trim: true,
      skip_empty_lines: true,
    });
  } catch (error) {
    return { rows: [], errors: [`Invalid CSV file: ${error.message}`] };
  }

  if (records.length === 0) {
    return { rows: [], errors: ['The CSV file has no data'] };
  }

  const headers = Object.keys(records[0]);
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col),
  );
  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [
        `The CSV file is missing required columns: ${missingColumns.join(', ')}`,
      ],
    };
  }

  const rows: ParsedQuestionRow[] = [];
  const extraOptionColumns = unsupportedOptionColumns(headers);

  records.forEach((record, index) => {
    const rowNumber = index + 2; // +1 because the index is 0-based, +1 for the header row
    const question = emptyToUndefined(record['Question']);
    if (!question) {
      errors.push(`Row ${rowNumber}: "Question" is missing`);
      return;
    }

    const questionType =
      emptyToUndefined(record['Question Type']) ?? 'multiple-choice';

    const answerOptions = ANSWER_INDEXES.map((i) =>
      emptyToUndefined(record[`Answer Option ${i}`]),
    );
    const explanations = ANSWER_INDEXES.map((i) =>
      emptyToUndefined(record[`Explanation ${i}`]),
    );
    if (!answerOptions[0] || !answerOptions[1]) {
      errors.push(
        `Row ${rowNumber}: "Answer Option 1" and "Answer Option 2" are both required`,
      );
      return;
    }

    // Refuse rather than truncate. This does not `return`, so the row's other
    // problems are reported in the same pass and the file only has to be fixed
    // once. Recording the error is enough to keep the row out: an import is
    // all-or-nothing, so no row survives a file with any error in it.
    const loses = extraOptionColumns.filter(
      (column) => emptyToUndefined(record[column]) !== undefined,
    );
    for (const column of loses) {
      errors.push(
        `Row ${rowNumber}: "${column}" has content but only ${ANSWER_INDEXES.length} options are supported, so importing this row would drop it`,
      );
    }

    // "Correct Answers" holds one 1-based index for a single-answer question
    // and several, comma separated, for a multiple-response one: "3" or "1,3".
    // grading.ts has read it that way from the start; this parser accepted only
    // a bare integer, so every multiple-response row was refused — and because
    // an import is all-or-nothing, one such row failed the whole file.
    //
    // Blank parts are dropped rather than refused: a trailing comma says
    // nothing ambiguous, and failing a file over punctuation costs more than it
    // catches. At least one index has to survive, and every part that is there
    // must be an integer.
    const correctAnswerRaw = emptyToUndefined(record['Correct Answers']);
    const answerParts = (correctAnswerRaw ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '');
    if (
      answerParts.length === 0 ||
      answerParts.some((part) => !/^\d+$/.test(part))
    ) {
      errors.push(
        `Row ${rowNumber}: "Correct Answers" must be one or more 1-based option indexes, comma separated, such as "3" or "1,3", got "${record['Correct Answers']}"`,
      );
      return;
    }

    const correctAnswerIndexes = [
      ...new Set(answerParts.map((part) => parseInt(part, 10))),
    ].sort((a, b) => a - b);

    const outOfRange = correctAnswerIndexes.find(
      (index) => index < 1 || index > ANSWER_INDEXES.length,
    );
    if (outOfRange !== undefined) {
      errors.push(
        `Row ${rowNumber}: "Correct Answers" = ${outOfRange} is outside 1-${ANSWER_INDEXES.length}`,
      );
      return;
    }

    // Every index has to land on an option that actually has text. Comparing it
    // against the *count* of filled options is a different question, and it
    // answered both of these wrong: a row filling options 1, 2 and 4 had a
    // correct answer of 4 refused, while a correct answer of 3 was accepted
    // even though option 3 is blank — a question nobody could ever get right.
    const blankIndex = correctAnswerIndexes.find(
      (index) => !answerOptions[index - 1],
    );
    if (blankIndex !== undefined) {
      errors.push(
        `Row ${rowNumber}: "Correct Answers" = ${blankIndex} but "Answer Option ${blankIndex}" is empty`,
      );
      return;
    }

    rows.push({
      question,
      questionType,
      answerOption1: answerOptions[0],
      explanation1: explanations[0],
      answerOption2: answerOptions[1],
      explanation2: explanations[1],
      answerOption3: answerOptions[2],
      explanation3: explanations[2],
      answerOption4: answerOptions[3],
      explanation4: explanations[3],
      answerOption5: answerOptions[4],
      explanation5: explanations[4],
      answerOption6: answerOptions[5],
      explanation6: explanations[5],
      // Stored canonically — sorted and de-duplicated — so the review screen
      // and the expected-answer count cannot disagree about the same row.
      correctAnswer: correctAnswerIndexes.join(','),
      overallExplanation: emptyToUndefined(record['Overall Explanation']),
      domain: emptyToUndefined(record['Domain']),
    });
  });

  return { rows: errors.length > 0 ? [] : rows, errors };
}

/** Read the "Practice Test N" number out of a filename, to map it onto CourseSet.order = N */
export function extractTestNumberFromFilename(filename: string): number | null {
  const match = filename.match(/practice[\s_-]?test[\s_-]?(\d+)/i);
  if (!match) return null;
  return parseInt(match[1], 10);
}
