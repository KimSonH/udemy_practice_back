import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserCoursesService } from './user-courses.service';

function setup(course: { type: string } | null, owned = false) {
  const repo = {
    manager: { findOne: jest.fn(async () => course) },
    exists: jest.fn(async () => owned),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
  };
  const service = new UserCoursesService(
    repo as never,
    {} as never,
    {} as never,
  );
  return { service, repo };
}

describe('UserCoursesService.enrollFree', () => {
  it('grants a free course once, outside the revenue gateways', async () => {
    const { service, repo } = setup({ type: 'free' });
    await expect(service.enrollFree(5, 66)).resolves.toEqual({ owned: true });
    expect(repo.save).toHaveBeenCalledWith({
      userId: 5,
      courseId: 66,
      orderBy: 'free',
      status: 'completed',
    });
  });

  it('does not add a second row for an owner', async () => {
    const { service, repo } = setup({ type: 'free' }, true);
    await service.enrollFree(5, 66);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('refuses paid and missing courses', async () => {
    await expect(
      setup({ type: 'paid' }).service.enrollFree(5, 66),
    ).rejects.toThrow(BadRequestException);
    await expect(setup(null).service.enrollFree(5, 66)).rejects.toThrow(
      NotFoundException,
    );
  });
});
