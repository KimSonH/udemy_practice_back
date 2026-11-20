import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoursesService, toPublicCourse } from 'src/courses/courses.service';
import { PAID_GATEWAYS, dateRange } from 'src/dashboard/dashboard.service';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';
import { USER_STATUS_ACTIVE } from 'src/users/user-status';
import { DEFAULT_PASSING_PERCENT } from 'src/test-attempts/exam-timing';
import { User } from 'src/users/entities/user.entity';
import { UpdateInstructorProfileDto } from './dto/update-instructor-profile.dto';
import { ProfileLinks, cleanProfileLinks } from './profile-links';

/** The instructor's cut of each sale. */
export const INSTRUCTOR_SHARE = 0.7;

const cents = (n: number) => Math.round(n * 100) / 100;
const earning = (price: number) => cents(price * INSTRUCTOR_SHARE);

/** $2 is PAID_GATEWAYS in every query that uses it. */
const PAID_SALE = `uc.status = 'completed' AND uc.order_by = ANY($2)`;

/**
 * What an instructor sees about their own courses, and the page learners see
 * about them. Money is an estimate at each course's current list price, as in
 * the admin's creator revenue: orders do not store the amount paid.
 */
@Injectable()
export class InstructorsService {
  constructor(
    @InjectRepository(UserCourse)
    private readonly userCourses: Repository<UserCourse>,
    private readonly coursesService: CoursesService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async overview(userId: number) {
    const [courseRows, [totals], attemptRows, monthRows] = await Promise.all([
      this.userCourses.query(
        `SELECT c.id, c.name, c.slug, c.status, c.type, c.price,
                c.deleted_at IS NOT NULL AS deleted,
                count(DISTINCT uc.user_id) FILTER (WHERE uc.status = 'completed') AS students,
                count(uc.id) FILTER (WHERE ${PAID_SALE}
                  AND uc.updated_at >= now() - interval '30 days') AS sales30,
                count(uc.id) FILTER (WHERE ${PAID_SALE}
                  AND uc.updated_at >= now() - interval '60 days'
                  AND uc.updated_at < now() - interval '30 days') AS sales_prev30
         FROM course c
         LEFT JOIN user_course uc ON uc.course_id = c.id AND uc.deleted_at IS NULL
         WHERE c.owner_user_id = $1
         GROUP BY c.id
         ORDER BY sales30 DESC, students DESC, c.id DESC`,
        [userId, PAID_GATEWAYS],
      ),
      // Distinct across courses: a learner who bought two counts once.
      this.userCourses.query(
        `SELECT count(DISTINCT uc.user_id) AS students,
                count(DISTINCT uc.user_id) FILTER (
                  WHERE uc.updated_at >= now() - interval '30 days') AS new_students30
         FROM user_course uc JOIN course c ON c.id = uc.course_id
         WHERE c.owner_user_id = $1 AND uc.status = 'completed' AND uc.deleted_at IS NULL`,
        [userId],
      ),
      // The instructor's own test runs are not their learners'.
      this.userCourses.query(
        `SELECT ta.course_id,
                count(*) AS attempts,
                count(*) FILTER (WHERE ta.total_count > 0) AS graded,
                count(*) FILTER (WHERE ta.total_count > 0 AND ta.correct_count * 100
                  >= coalesce(c.passing_percent, $2) * ta.total_count) AS passed
         FROM test_attempt ta JOIN course c ON c.id = ta.course_id
         WHERE c.owner_user_id = $1 AND ta.user_id <> $1 AND ta.deleted_at IS NULL
           AND ta.started_at >= now() - interval '30 days'
         GROUP BY ta.course_id`,
        [userId, DEFAULT_PASSING_PERCENT],
      ),
      this.userCourses.query(
        `SELECT to_char(date_trunc('month', uc.updated_at), 'YYYY-MM') AS month,
                sum(c.price) AS gross
         FROM user_course uc JOIN course c ON c.id = uc.course_id
         WHERE c.owner_user_id = $1 AND ${PAID_SALE} AND uc.deleted_at IS NULL
           AND uc.updated_at >= date_trunc('month', now()) - interval '11 months'
         GROUP BY 1`,
        [userId, PAID_GATEWAYS],
      ),
    ]);

    const attempts = new Map<
      number,
      { attempts: number; passRate: number | null }
    >(
      attemptRows.map((r) => [
        Number(r.course_id),
        {
          attempts: Number(r.attempts),
          passRate: Number(r.graded)
            ? Math.round((Number(r.passed) * 100) / Number(r.graded))
            : null,
        },
      ]),
    );

    const courses = courseRows.map((r) => {
      const price = Number(r.price ?? 0);
      const sales30 = Number(r.sales30);
      return {
        id: Number(r.id),
        name: r.name as string,
        slug: r.slug as string,
        status: r.status as string,
        type: r.type as string,
        price,
        deleted: Boolean(r.deleted),
        students: Number(r.students),
        sales30,
        earning30: cents(earning(price) * sales30),
        earningPrev30: cents(earning(price) * Number(r.sales_prev30)),
        attempts30: attempts.get(Number(r.id))?.attempts ?? 0,
        passRate30: attempts.get(Number(r.id))?.passRate ?? null,
      };
    });

    const byMonth = new Map<string, number>(
      monthRows.map((r) => [r.month as string, Number(r.gross)]),
    );
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1),
      );
      const month = d.toISOString().slice(0, 7);
      return {
        month,
        earning: cents((byMonth.get(month) ?? 0) * INSTRUCTOR_SHARE),
      };
    });

    const sum = (pick: (c: (typeof courses)[number]) => number) =>
      cents(courses.reduce((total, c) => total + pick(c), 0));

    return {
      currency: 'USD',
      share: INSTRUCTOR_SHARE,
      earning30: sum((c) => c.earning30),
      earningPrev30: sum((c) => c.earningPrev30),
      sales30: courses.reduce((total, c) => total + c.sales30, 0),
      students: Number(totals?.students ?? 0),
      newStudents30: Number(totals?.new_students30 ?? 0),
      attempts30: courses.reduce((total, c) => total + c.attempts30, 0),
      months,
      courses,
    };
  }

  /** Paid sales between two dates, newest first. Never says who bought. */
  async sales(userId: number, from?: string, to?: string) {
    const { start, end } = dateRange(from, to);
    const rows = await this.userCourses.query(
      `SELECT uc.id, uc.updated_at AS date, uc.order_by AS gateway,
              c.id AS course_id, c.name AS course_name, c.price
       FROM user_course uc JOIN course c ON c.id = uc.course_id
       WHERE c.owner_user_id = $1 AND ${PAID_SALE} AND uc.deleted_at IS NULL
         AND uc.updated_at >= $3::date AND uc.updated_at < $4::date + 1
       ORDER BY uc.updated_at DESC, uc.id DESC`,
      [userId, PAID_GATEWAYS, start, end],
    );
    const sales = rows.map((r) => {
      const price = Number(r.price ?? 0);
      return {
        id: Number(r.id),
        date: r.date as Date,
        courseId: Number(r.course_id),
        courseName: r.course_name as string,
        gateway: r.gateway as string,
        price,
        earning: earning(price),
      };
    });
    return {
      from: start,
      to: end,
      currency: 'USD',
      share: INSTRUCTOR_SHARE,
      sales,
      totalRevenue: cents(sales.reduce((t, s) => t + s.price, 0)),
      totalEarning: cents(sales.reduce((t, s) => t + s.earning, 0)),
    };
  }

  /**
   * The public page. Only someone with a course on sale has one, so an id
   * cannot be used to look up whether any account exists. No email.
   */
  async profile(id: number) {
    const [user] = await this.userCourses.query(
      `SELECT id, concat_ws(' ', first_name, last_name) AS name, created_at,
              headline, bio, avatar_url, profile_links
       FROM "user" WHERE id = $1 AND deleted_at IS NULL AND status = $2`,
      [id, USER_STATUS_ACTIVE],
    );
    const courses = user ? await this.coursesService.findActiveByOwner(id) : [];
    if (!courses.length) throw new NotFoundException('Instructor not found');

    const [{ students }] = await this.userCourses.query(
      `SELECT count(DISTINCT uc.user_id) AS students
       FROM user_course uc JOIN course c ON c.id = uc.course_id
       WHERE c.owner_user_id = $1 AND c.status = 'active' AND c.deleted_at IS NULL
         AND uc.status = 'completed' AND uc.deleted_at IS NULL`,
      [id],
    );
    return {
      id,
      name: (user.name as string).trim(),
      since: user.created_at as Date,
      headline: (user.headline as string | null) ?? null,
      bio: (user.bio as string | null) ?? null,
      avatarUrl: (user.avatar_url as string | null) ?? null,
      links: (user.profile_links as ProfileLinks | null) ?? {},
      students: Number(students),
      courses: courses.map(toPublicCourse),
    };
  }

  /** The signed-in user's own profile fields, for the edit form. */
  async myProfile(userId: number) {
    const user = await this.users.findOneByOrFail({ id: userId });
    return {
      id: user.id,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      headline: user.headline ?? null,
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl ?? null,
      links: user.profileLinks ?? {},
    };
  }

  /** Fields left out stay as they are; an empty string clears one. */
  async updateProfile(userId: number, dto: UpdateInstructorProfileDto) {
    const blankToNull = (v: string | null | undefined) =>
      v == null ? null : v.trim() || null;
    const patch: Partial<User> = {};
    if (dto.headline !== undefined) patch.headline = blankToNull(dto.headline);
    if (dto.bio !== undefined) {
      // Three or more line breaks are one paragraph break.
      patch.bio = blankToNull(
        dto.bio?.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n'),
      );
    }
    if (dto.links !== undefined)
      patch.profileLinks = cleanProfileLinks(dto.links);
    if (Object.keys(patch).length) await this.users.update(userId, patch);
    return this.myProfile(userId);
  }

  async setAvatar(userId: number, filename: string) {
    await this.users.update(userId, { avatarUrl: filename });
    return this.myProfile(userId);
  }
}
