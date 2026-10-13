import { BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

const row = (
  userId: number,
  courseId: number,
  price: string,
  sales: string,
) => ({
  user_id: userId,
  user_name: `User ${userId}`,
  email: `u${userId}@test.localhost`,
  course_id: courseId,
  course_name: `Course ${courseId}`,
  price,
  deleted: false,
  sales,
});

function setup(rows: unknown[]) {
  const userCourses = {
    query: jest.fn<Promise<unknown[]>, [string, unknown[]]>(async () => rows),
  };
  const service = new DashboardService(
    {} as never,
    {} as never,
    {} as never,
    userCourses as never,
  );
  return { service, userCourses };
}

describe('DashboardService.getCreatorRevenue', () => {
  it('groups paid sales by creator, richest first, in exact cents', async () => {
    const { service, userCourses } = setup([
      row(1, 10, '4.90', '3'),
      row(1, 11, '0.10', '3'),
      row(2, 20, '19.99', '1'),
    ]);

    const report = await service.getCreatorRevenue('2026-10-01', '2026-10-31');

    expect(report.creators.map((c) => [c.userId, c.sales, c.revenue])).toEqual([
      [2, 1, 19.99],
      [1, 6, 15],
    ]);
    expect(report.creators[1].courses.map((c) => c.revenue)).toEqual([
      14.7, 0.3,
    ]);
    expect(report.totalSales).toBe(7);
    expect(report.totalRevenue).toBe(34.99);
    // Only real gateways count: an admin grant is not a sale.
    expect(userCourses.query.mock.calls[0][1]).toEqual([
      ['paypal', 'sepay', 'vietqr'],
      '2026-10-01',
      '2026-10-31',
    ]);
  });

  it('defaults to this month and rejects malformed or reversed dates', async () => {
    const { service, userCourses } = setup([]);
    const report = await service.getCreatorRevenue();
    expect(report.from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(report.totalRevenue).toBe(0);

    await expect(service.getCreatorRevenue('10/01/2026')).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.getCreatorRevenue('2026-10-31', '2026-10-01'),
    ).rejects.toThrow(BadRequestException);
    // Neither bad call reached the database.
    expect(userCourses.query).toHaveBeenCalledTimes(1);
  });
});
