import { NotFoundException } from '@nestjs/common';
import { InstructorsService } from './instructors.service';
import { cleanProfileLinks } from './profile-links';

function setup(results: unknown[][], activeCourses: unknown[] = []) {
  const query = jest.fn<Promise<unknown[]>, [string, unknown[]]>(
    async () => results.shift() ?? [],
  );
  const courses = { findActiveByOwner: jest.fn(async () => activeCourses) };
  const users = {
    update: jest.fn(async () => undefined),
    findOneByOrFail: jest.fn(async () => ({
      id: 7,
      firstName: 'Minh',
      lastName: 'Tran',
    })),
  };
  const service = new InstructorsService(
    { query } as never,
    courses as never,
    users as never,
  );
  return { service, query, courses, users };
}

describe('InstructorsService', () => {
  it('pays 70% of each sale, in exact cents, without naming the buyer', async () => {
    const { service, query } = setup([
      [
        {
          id: 2,
          date: new Date(),
          gateway: 'paypal',
          course_id: 9,
          course_name: 'AWS',
          price: '4.90',
        },
        {
          id: 1,
          date: new Date(),
          gateway: 'vietqr',
          course_id: 9,
          course_name: 'AWS',
          price: '19.99',
        },
      ],
    ]);
    const report = await service.sales(7, '2026-11-01', '2026-11-30');

    expect(report.sales.map((s) => s.earning)).toEqual([3.43, 13.99]);
    expect(report.totalRevenue).toBe(24.89);
    expect(report.totalEarning).toBe(17.42);
    expect(Object.keys(report.sales[0])).not.toContain('userId');
    expect(query.mock.calls[0][1]).toEqual([
      7,
      ['paypal', 'sepay', 'vietqr'],
      '2026-11-01',
      '2026-11-30',
    ]);
  });

  it('adds up the overview across courses and fills empty months', async () => {
    const { service } = setup([
      [
        {
          id: 1,
          name: 'A',
          price: '10.00',
          students: '3',
          sales30: '2',
          sales_prev30: '1',
          deleted: false,
        },
        {
          id: 2,
          name: 'B',
          price: null,
          students: '5',
          sales30: '0',
          sales_prev30: '0',
          deleted: false,
        },
      ],
      [{ students: '6', new_students30: '2' }],
      [{ course_id: 1, attempts: '4', graded: '3', passed: '2' }],
      [],
    ]);
    const o = await service.overview(7);

    expect(o.earning30).toBe(14);
    expect(o.earningPrev30).toBe(7);
    expect(o.students).toBe(6);
    expect(o.courses[0]).toMatchObject({ attempts30: 4, passRate30: 67 });
    expect(o.courses[1]).toMatchObject({
      attempts30: 0,
      passRate30: null,
      price: 0,
    });
    expect(o.months).toHaveLength(12);
    expect(o.months.every((m) => m.earning === 0)).toBe(true);
  });

  it('has no public page for an account with nothing on sale', async () => {
    const { service } = setup(
      [[{ id: 7, name: 'Minh Tran', created_at: new Date() }]],
      [],
    );
    await expect(service.profile(7)).rejects.toThrow(NotFoundException);

    const missing = setup([[]]);
    await expect(missing.service.profile(8)).rejects.toThrow(NotFoundException);
    expect(missing.courses.findActiveByOwner).not.toHaveBeenCalled();
  });

  it('saves only what was sent, blanks as null, tidy paragraphs', async () => {
    const { service, users } = setup([]);
    await service.updateProfile(7, {
      headline: '  ',
      bio: 'One\r\n\r\n\r\n\r\nTwo',
    });
    expect(users.update).toHaveBeenCalledWith(7, {
      headline: null,
      bio: 'One\n\nTwo',
    });
  });
});

describe('cleanProfileLinks', () => {
  it('keeps known links on their own site and drops blanks', () => {
    expect(
      cleanProfileLinks({
        website: 'https://minh.dev',
        linkedin: 'https://vn.linkedin.com/in/minh',
        youtube: '',
        evil: 'https://x.test',
      }),
    ).toEqual({
      website: 'https://minh.dev/',
      linkedin: 'https://vn.linkedin.com/in/minh',
    });
    expect(cleanProfileLinks({ github: '' })).toBeNull();
  });

  it('rejects scripts, other sites and look-alike hosts', () => {
    expect(() =>
      cleanProfileLinks({ website: 'javascript:alert(1)' }),
    ).toThrow();
    expect(() =>
      cleanProfileLinks({ linkedin: 'https://evil.com/linkedin.com' }),
    ).toThrow();
    expect(() => cleanProfileLinks({ x: 'https://notx.com/me' })).toThrow();
    expect(() => cleanProfileLinks({ github: 'nope' })).toThrow();
  });
});
