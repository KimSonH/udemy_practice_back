import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from 'src/courses/entities/courses.entity';
import { User } from 'src/users/entities/user.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';

export interface DashboardStats {
  totalCourses: number;
  totalUsers: number;
  totalOrganizations: number;
  totalCompletedEnrollments: number;
}

export interface CreatorCourseRevenue {
  courseId: number;
  name: string;
  /** Current list price; see getCreatorRevenue on why that is the basis. */
  price: number;
  sales: number;
  revenue: number;
  deleted: boolean;
}

export interface CreatorRevenue {
  userId: number;
  name: string;
  email: string;
  sales: number;
  revenue: number;
  courses: CreatorCourseRevenue[];
}

/** Gateways that take money. Anything else (an admin grant) is not a sale. */
const PAID_GATEWAYS = ['paypal', 'sepay', 'vietqr'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export interface TrendPoint {
  date: string;
  count: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserCourse)
    private readonly userCourseRepository: Repository<UserCourse>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    const [
      totalCourses,
      totalUsers,
      totalOrganizations,
      totalCompletedEnrollments,
    ] = await Promise.all([
      this.courseRepository.count({ where: { deletedAt: null } }),
      this.userRepository.count({ where: { deletedAt: null } }),
      this.organizationRepository.count({ where: { deletedAt: null } }),
      this.userCourseRepository.count({ where: { status: 'completed' } }),
    ]);

    return {
      totalCourses,
      totalUsers,
      totalOrganizations,
      totalCompletedEnrollments,
    };
  }

  getCourseTrend(days: number): Promise<TrendPoint[]> {
    return this.getDailyTrend(this.courseRepository, days);
  }

  getUserTrend(days: number): Promise<TrendPoint[]> {
    return this.getDailyTrend(this.userRepository, days);
  }

  getOrganizationTrend(days: number): Promise<TrendPoint[]> {
    return this.getDailyTrend(this.organizationRepository, days);
  }

  getEnrollmentTrend(days: number): Promise<TrendPoint[]> {
    return this.getDailyTrend(this.userCourseRepository, days, {
      condition: 'e.status = :status',
      params: { status: 'completed' },
    });
  }

  /**
   * Paid sales of learner-created courses per creator, between two dates
   * (inclusive, by when the purchase was last updated, i.e. completed).
   *
   * Revenue is an estimate at each course's current list price: PayPal and
   * VietQR orders do not store the amount paid, so there is no recorded figure
   * to add up. A price changed mid-period shifts the estimate accordingly.
   * Soft-deleted courses still count; their sales happened.
   */
  async getCreatorRevenue(from?: string, to?: string) {
    const today = new Date().toISOString().slice(0, 10);
    const start = from || `${today.slice(0, 8)}01`;
    const end = to || today;
    if (!DATE_ONLY.test(start) || !DATE_ONLY.test(end) || start > end) {
      throw new BadRequestException(
        '"from" and "to" must be YYYY-MM-DD dates, "from" not after "to"',
      );
    }

    const rows: {
      user_id: number;
      user_name: string;
      email: string;
      course_id: number;
      course_name: string;
      price: string;
      deleted: boolean;
      sales: string;
    }[] = await this.userCourseRepository.query(
      `SELECT u.id AS user_id,
              concat_ws(' ', u.first_name, u.last_name) AS user_name,
              u.email,
              c.id AS course_id,
              c.name AS course_name,
              c.price,
              c.deleted_at IS NOT NULL AS deleted,
              count(uc.id) AS sales
       FROM user_course uc
       JOIN course c ON c.id = uc.course_id
       JOIN "user" u ON u.id = c.owner_user_id
       WHERE uc.status = 'completed'
         AND uc.order_by = ANY($1)
         AND uc.updated_at >= $2::date
         AND uc.updated_at < $3::date + 1
       GROUP BY u.id, c.id
       ORDER BY u.id, c.id`,
      [PAID_GATEWAYS, start, end],
    );

    const creators = new Map<number, CreatorRevenue>();
    for (const row of rows) {
      const price = Number(row.price);
      const sales = Number(row.sales);
      const course: CreatorCourseRevenue = {
        courseId: row.course_id,
        name: row.course_name,
        price,
        sales,
        // Rounded to cents so sums of prices like 4.9 stay exact.
        revenue: Math.round(price * sales * 100) / 100,
        deleted: row.deleted,
      };
      const creator = creators.get(row.user_id) ?? {
        userId: row.user_id,
        name: row.user_name,
        email: row.email,
        sales: 0,
        revenue: 0,
        courses: [],
      };
      creator.sales += course.sales;
      creator.revenue =
        Math.round((creator.revenue + course.revenue) * 100) / 100;
      creator.courses.push(course);
      creators.set(row.user_id, creator);
    }

    const list = [...creators.values()].sort((a, b) => b.revenue - a.revenue);
    return {
      from: start,
      to: end,
      currency: 'USD',
      creators: list,
      totalSales: list.reduce((sum, c) => sum + c.sales, 0),
      totalRevenue:
        Math.round(list.reduce((sum, c) => sum + c.revenue, 0) * 100) / 100,
    };
  }

  /**
   * Number of records created per day (by created_at) over the last N days,
   * filling 0 for empty days so the chart has no gaps.
   */
  private async getDailyTrend(
    repository: Repository<any>,
    days: number,
    extraWhere?: { condition: string; params: Record<string, unknown> },
  ): Promise<TrendPoint[]> {
    const safedays = Math.min(Math.max(days || 30, 1), 365);

    const qb = repository
      .createQueryBuilder('e')
      .select('CAST(e.createdAt AS DATE)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where("e.createdAt >= NOW() - (INTERVAL '1 day' * :days)", {
        days: safedays,
      });
    if (extraWhere) {
      qb.andWhere(extraWhere.condition, extraWhere.params);
    }

    const rows: { date: string; count: string }[] = await qb
      .groupBy('CAST(e.createdAt AS DATE)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const countByDate = new Map<string, number>();
    for (const row of rows) {
      const key = new Date(row.date).toISOString().slice(0, 10);
      countByDate.set(key, parseInt(row.count, 10));
    }

    const result: TrendPoint[] = [];
    const today = new Date();
    for (let i = safedays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: countByDate.get(key) ?? 0 });
    }
    return result;
  }
}
