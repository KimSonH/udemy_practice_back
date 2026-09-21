import {
  DEFAULT_PASSING_PERCENT,
  deadlineFrom,
  durationMinutes,
  hasPassed,
  passingPercent,
  scorePercent,
} from '../exam-timing';

describe('durationMinutes', () => {
  it('derives from the question count when the course states nothing', () => {
    expect(durationMinutes(60)).toBe(90);
  });

  it('rounds a fractional derivation up, never down', () => {
    // 45 * 1.5 = 67.5. Rounding down would hand back half a minute of exam.
    expect(durationMinutes(45)).toBe(68);
  });

  it('prefers the course figure over the derivation', () => {
    expect(durationMinutes(60, { durationMinutes: 100 })).toBe(100);
  });

  it.each([[0], [-30], [null], [undefined]])(
    'ignores an unusable stated duration (%s)',
    (value) => {
      // The column is nullable and nothing else guards it. A zero here would
      // be an exam with no time to sit it.
      expect(durationMinutes(60, { durationMinutes: value })).toBe(90);
    },
  );

  it('has no duration for an empty set', () => {
    expect(durationMinutes(0)).toBe(0);
  });
});

describe('passingPercent', () => {
  it('falls back to the default', () => {
    expect(passingPercent()).toBe(DEFAULT_PASSING_PERCENT);
    expect(passingPercent({ passingPercent: null })).toBe(
      DEFAULT_PASSING_PERCENT,
    );
  });

  it('honours a stated mark', () => {
    expect(passingPercent({ passingPercent: 85 })).toBe(85);
  });

  it('ignores a mark above 100, which nobody could reach', () => {
    expect(passingPercent({ passingPercent: 101 })).toBe(
      DEFAULT_PASSING_PERCENT,
    );
  });

  it('accepts exactly 100', () => {
    expect(passingPercent({ passingPercent: 100 })).toBe(100);
  });
});

describe('scorePercent', () => {
  it('is zero for an empty attempt rather than NaN', () => {
    expect(scorePercent(0, 0)).toBe(0);
  });

  it('rounds to a whole percent', () => {
    expect(scorePercent(2, 3)).toBe(67);
  });
});

describe('hasPassed', () => {
  it('passes exactly on the mark', () => {
    expect(hasPassed(70, 100)).toBe(true);
  });

  it('fails one below it', () => {
    expect(hasPassed(69, 100)).toBe(false);
  });

  it('cannot pass an attempt with no questions', () => {
    expect(hasPassed(0, 0)).toBe(false);
  });
});

describe('deadlineFrom', () => {
  const start = new Date('2026-09-21T10:00:00.000Z');

  it('adds the stated duration to the start', () => {
    expect(deadlineFrom(start, 60, { durationMinutes: 100 })).toEqual(
      new Date('2026-09-21T11:40:00.000Z'),
    );
  });

  it('adds the derived duration when the course states none', () => {
    expect(deadlineFrom(start, 60)).toEqual(
      new Date('2026-09-21T11:30:00.000Z'),
    );
  });

  it('has no deadline when there is nothing to time', () => {
    expect(deadlineFrom(start, 0)).toBeNull();
  });
});
