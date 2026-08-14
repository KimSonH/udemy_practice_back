import { Injectable } from '@nestjs/common';
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
   * Số bản ghi MỚI được tạo mỗi ngày (theo created_at) trong N ngày gần nhất,
   * fill 0 cho ngày không có dữ liệu để chart không bị đứt đoạn.
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
