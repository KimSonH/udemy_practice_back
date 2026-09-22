import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateUdemyQuestionBankDto } from '../dto/create-udemy-question-bank.dto';

/** A valid payload. Override any field through `overrides`. */
function dto(overrides: Partial<CreateUdemyQuestionBankDto> = {}) {
  return plainToInstance(CreateUdemyQuestionBankDto, {
    question: 'What is 2 + 2?',
    answerOption1: 'Three',
    answerOption2: 'Four',
    correctAnswer: '2',
    ...overrides,
  });
}

async function correctAnswerErrors(value: unknown): Promise<string[]> {
  const errors = await validate(dto({ correctAnswer: value as string }));
  const forField = errors.find((error) => error.property === 'correctAnswer');
  return Object.values(forField?.constraints ?? {});
}

describe('CreateUdemyQuestionBankDto correctAnswer', () => {
  it('accepts a single index', async () => {
    expect(await correctAnswerErrors('2')).toEqual([]);
  });

  it('accepts several comma-separated indexes', async () => {
    // A multiple-response question. The route rejected this while the CSV
    // importer and grading both understood it.
    expect(await correctAnswerErrors('1,3')).toEqual([]);
  });

  it('accepts a long list', async () => {
    expect(await correctAnswerErrors('1,2,3,4,5,6')).toEqual([]);
  });

  it.each([
    ['a letter', 'C'],
    ['a decimal', '2.5'],
    ['an empty string', ''],
    ['a trailing comma', '1,3,'],
    ['a leading comma', ',1'],
    ['a doubled comma', '1,,3'],
    ['spaces around an index', '1, 3'],
    ['a negative index', '-1'],
  ])('rejects %s', async (_label, value) => {
    expect(await correctAnswerErrors(value)).not.toEqual([]);
  });
});
