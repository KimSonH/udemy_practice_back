import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  CreateCourseDto,
  MAX_DURATION_MINUTES,
} from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';

/** A payload that passes every other rule, so only the field under test fails. */
function payload(overrides: Partial<CreateCourseDto> = {}) {
  return {
    name: 'AI-102',
    price: 24.99,
    status: 'active',
    type: 'paid',
    organizationId: '2',
    courseSets: 6,
    creationMode: 'manual',
    content: '<p>x</p>',
    ...overrides,
  };
}

async function errorsFor(
  overrides: Partial<CreateCourseDto> = {},
): Promise<string[]> {
  const dto = plainToInstance(CreateCourseDto, payload(overrides));
  const errors = await validate(dto);
  return errors.map((error) => error.property);
}

describe('CreateCourseDto exam timing', () => {
  it('accepts a payload that leaves both out', async () => {
    await expect(errorsFor()).resolves.toEqual([]);
  });

  describe('durationMinutes', () => {
    it('accepts a whole number of minutes', async () => {
      await expect(errorsFor({ durationMinutes: 100 })).resolves.toEqual([]);
    });

    it('accepts the maximum', async () => {
      await expect(
        errorsFor({ durationMinutes: MAX_DURATION_MINUTES }),
      ).resolves.toEqual([]);
    });

    it('rejects anything past the maximum', async () => {
      await expect(
        errorsFor({ durationMinutes: MAX_DURATION_MINUTES + 1 }),
      ).resolves.toEqual(['durationMinutes']);
    });

    it('rejects zero, because a test with no time cannot be sat', async () => {
      await expect(errorsFor({ durationMinutes: 0 })).resolves.toEqual([
        'durationMinutes',
      ]);
    });

    it('rejects a negative duration', async () => {
      await expect(errorsFor({ durationMinutes: -30 })).resolves.toEqual([
        'durationMinutes',
      ]);
    });

    it('rejects a fraction of a minute', async () => {
      await expect(errorsFor({ durationMinutes: 90.5 })).resolves.toEqual([
        'durationMinutes',
      ]);
    });
  });

  describe('passingPercent', () => {
    it('accepts a percentage', async () => {
      await expect(errorsFor({ passingPercent: 70 })).resolves.toEqual([]);
    });

    it('accepts 100', async () => {
      await expect(errorsFor({ passingPercent: 100 })).resolves.toEqual([]);
    });

    it('rejects more than 100, which is not a percentage', async () => {
      // The trap this guards: reading the field as a number of questions.
      await expect(errorsFor({ passingPercent: 700 })).resolves.toEqual([
        'passingPercent',
      ]);
    });

    it('rejects zero', async () => {
      await expect(errorsFor({ passingPercent: 0 })).resolves.toEqual([
        'passingPercent',
      ]);
    });

    it('rejects a fractional percentage', async () => {
      await expect(errorsFor({ passingPercent: 69.5 })).resolves.toEqual([
        'passingPercent',
      ]);
    });
  });
});

describe('UpdateCourseDto exam timing', () => {
  it('carries the same bounds as the create payload', async () => {
    const dto = plainToInstance(UpdateCourseDto, {
      durationMinutes: MAX_DURATION_MINUTES + 1,
      passingPercent: 101,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property).sort()).toEqual([
      'durationMinutes',
      'passingPercent',
    ]);
  });

  it('accepts an update that mentions neither', async () => {
    const dto = plainToInstance(UpdateCourseDto, { name: 'Renamed' });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
