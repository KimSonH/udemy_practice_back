import { NotFoundException } from '@nestjs/common';
import { UserCoursesService } from './user-courses.service';

function setup({ owned = true, lessonInCourse = true } = {}) {
  const userCourses = { exists: jest.fn(async () => owned) };
  const progress = {
    query: jest.fn<Promise<unknown[]>, [string, unknown[]]>(async (sql) =>
      sql.includes('FROM course_content') ? (lessonInCourse ? [{}] : []) : [],
    ),
    find: jest.fn(async () => [
      { url: 'b', completedAt: null },
      { url: 'a', completedAt: new Date() },
    ]),
  };
  const service = new UserCoursesService(
    userCourses as never,
    progress as never,
    {} as never,
  );
  return { service, progress };
}

describe('lesson progress', () => {
  it('returns finished lessons and the last one opened', async () => {
    const { service } = setup();
    await expect(service.getProgress(5, 66)).resolves.toEqual({
      completed: ['a'],
      lastUrl: 'b',
    });
  });

  it('saves a lesson of the course and passes completed through', async () => {
    const { service, progress } = setup();
    await service.saveProgress(5, 66, 'a', true);
    const upsert = progress.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO lesson_progress'),
    );
    expect(upsert?.[1]).toEqual([5, 66, 'a', true]);
  });

  it('refuses a course the learner does not own', async () => {
    const { service, progress } = setup({ owned: false });
    await expect(service.saveProgress(5, 66, 'a')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.getProgress(5, 66)).rejects.toThrow(NotFoundException);
    expect(progress.query).not.toHaveBeenCalled();
  });

  it('refuses a URL that is not a lesson of the course', async () => {
    const { service, progress } = setup({ lessonInCourse: false });
    await expect(
      service.saveProgress(5, 66, 'https://example.com/x'),
    ).rejects.toThrow('Lesson not found');
    expect(
      progress.query.mock.calls.some(([sql]) => sql.includes('INSERT')),
    ).toBe(false);
  });
});
