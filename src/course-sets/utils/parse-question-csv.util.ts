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

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Parse + validate 1 file CSV theo format "Practice Test" (Question, Question Type,
 * Answer Option 1..6, Explanation 1..6, Correct Answers, Overall Explanation, Domain).
 * Trả về TOÀN BỘ lỗi tìm được (không throw ở dòng đầu tiên) để hiển thị 1 lần cho admin,
 * và KHÔNG trả rows nếu có bất kỳ lỗi nào — import là all-or-nothing theo từng file.
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
    return { rows: [], errors: [`File CSV không hợp lệ: ${error.message}`] };
  }

  if (records.length === 0) {
    return { rows: [], errors: ['File CSV không có dữ liệu'] };
  }

  const headers = Object.keys(records[0]);
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col),
  );
  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [`File CSV thiếu cột bắt buộc: ${missingColumns.join(', ')}`],
    };
  }

  const rows: ParsedQuestionRow[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2; // +1 vì bắt đầu từ 0, +1 vì có dòng header
    const question = emptyToUndefined(record['Question']);
    if (!question) {
      errors.push(`Dòng ${rowNumber}: thiếu "Question"`);
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
    const optionCount = answerOptions.filter(Boolean).length;

    if (!answerOptions[0] || !answerOptions[1]) {
      errors.push(
        `Dòng ${rowNumber}: cần ít nhất "Answer Option 1" và "Answer Option 2"`,
      );
      return;
    }

    const correctAnswerRaw = emptyToUndefined(record['Correct Answers']);
    if (!correctAnswerRaw || !/^\d+$/.test(correctAnswerRaw)) {
      errors.push(
        `Dòng ${rowNumber}: "Correct Answers" phải là 1 số nguyên (ví dụ "3"), giá trị hiện tại: "${record['Correct Answers']}"`,
      );
      return;
    }
    const correctAnswerIndex = parseInt(correctAnswerRaw, 10);
    if (correctAnswerIndex < 1 || correctAnswerIndex > optionCount) {
      errors.push(
        `Dòng ${rowNumber}: "Correct Answers" = ${correctAnswerIndex} nhưng chỉ có ${optionCount} đáp án`,
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
      correctAnswer: correctAnswerRaw,
      overallExplanation: emptyToUndefined(record['Overall Explanation']),
      domain: emptyToUndefined(record['Domain']),
    });
  });

  return { rows: errors.length > 0 ? [] : rows, errors };
}

/** Suy ra số thứ tự "Practice Test N" từ tên file, dùng để map vào CourseSet.order = N */
export function extractTestNumberFromFilename(filename: string): number | null {
  const match = filename.match(/practice[\s_-]?test[\s_-]?(\d+)/i);
  if (!match) return null;
  return parseInt(match[1], 10);
}
