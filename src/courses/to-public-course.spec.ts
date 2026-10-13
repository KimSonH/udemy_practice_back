import { toPublicCourse } from './courses.service';
import { Course } from './entities/courses.entity';

describe('toPublicCourse', () => {
  it('keeps only the free previews playable', () => {
    const course = {
      courseSessions: [
        {
          uploadUrl: 'https://public-files.gumroad.com/session',
          courseContents: [
            { isShown: true, uploadUrl: 'https://public-files.gumroad.com/a' },
            { isShown: false, uploadUrl: 'https://public-files.gumroad.com/b' },
          ],
        },
      ],
    } as unknown as Course;

    const [session] = toPublicCourse(course).courseSessions;

    expect(session.uploadUrl).toBeUndefined();
    expect(session.courseContents.map((c) => c.uploadUrl)).toEqual([
      'https://public-files.gumroad.com/a',
      undefined,
    ]);
  });

  it("hides a paid course's questions but keeps the count", () => {
    const course = {
      type: 'paid',
      courseSets: [{ udemyQuestionBanks: [{ correctAnswer: 'A' }, {}] }],
    } as unknown as Course;

    const [set] = toPublicCourse(course).courseSets;

    expect(set.udemyQuestionBanks).toEqual([]);
    expect(set.questionCount).toBe(2);
  });

  it('leaves a free course its questions for the free test page', () => {
    const course = {
      type: 'free',
      courseSets: [{ udemyQuestionBanks: [{ correctAnswer: 'A' }] }],
    } as unknown as Course;

    expect(
      toPublicCourse(course).courseSets[0].udemyQuestionBanks,
    ).toHaveLength(1);
  });
});
