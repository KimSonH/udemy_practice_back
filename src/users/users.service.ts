import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { createUserDto } from './dto/createUser.dto';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { USER_STATUS_ACTIVE, UserStatus } from './user-status';
import { PaginationParams } from 'src/common/pagination.type';
import { resolveSort, toOrderObject } from 'src/common/resolve-sort';

/**
 * Sort keys GET /admin/users accepts. Anything else falls back to the default;
 * a caller never names a column.
 */
const USER_SORT_COLUMNS = {
  id: 'id',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  status: 'status',
  createdAt: 'createdAt',
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async setCurrentRefreshToken(refreshToken: string, userId: number) {
    const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, {
      currentHashedRefreshToken,
    });
  }

  async removeRefreshToken(userId: number) {
    return this.usersRepository.update(userId, {
      currentHashedRefreshToken: null,
    });
  }

  async getByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ email });

    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this email does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async create(body: createUserDto): Promise<User> {
    const user = new User();
    user.email = body.email;
    // Callers pass the plaintext password; hashing happens here, not at the
    // call site. Hashing before calling create would store a double hash.
    user.password = await bcrypt.hash(body.password, 10);
    user.firstName = body.firstName;
    user.lastName = body.lastName;
    return this.usersRepository.save(user);
  }

  async getById(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, userId: number) {
    const user = await this.getById(userId);

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.currentHashedRefreshToken,
    );

    if (isRefreshTokenMatching) {
      return user;
    }
  }

  async findAllForAdmin(query: PaginationParams) {
    const { page, limit, search } = query;
    const offset = (page - 1) * limit;

    const where = search
      ? [
          { firstName: ILike(`%${search}%`) },
          { lastName: ILike(`%${search}%`) },
          { email: ILike(`%${search}%`) },
        ]
      : undefined;

    const [items, total] = await this.usersRepository.findAndCount({
      where,
      order: toOrderObject(
        resolveSort(query.sortBy, query.sortDir, USER_SORT_COLUMNS, {
          column: 'createdAt',
          direction: 'DESC',
        }),
        'id',
      ),
      skip: offset,
      take: limit,
    });

    await this.attachCourseCounts(items);

    return { items, total, page, limit };
  }

  /**
   * How many courses each user on this page actually owns.
   *
   * One grouped query rather than a relation on the paginated find, which
   * would multiply rows. Both halves of the join are filtered on their own
   * soft-delete flag. `c.deleted_at`: an enrolment row outlives the course it
   * points at, so counting `user_course` alone would advertise a course the
   * learner can no longer open. `uc.deleted_at`: revoking an enrolment
   * soft-deletes the row, and a raw query does not apply that filter for us.
   */
  private async attachCourseCounts(users: User[]): Promise<void> {
    if (users.length === 0) return;

    const ids = users.map((user) => user.id);
    const rows: { user_id: number; count: string }[] =
      await this.dataSource.query(
        `SELECT uc.user_id, count(*) AS count
         FROM user_course uc
         JOIN course c ON c.id = uc.course_id
         WHERE uc.user_id = ANY($1)
           AND uc.deleted_at IS NULL
           AND c.deleted_at IS NULL
         GROUP BY uc.user_id`,
        [ids],
      );

    const byUser = new Map(rows.map((row) => [row.user_id, +row.count]));
    for (const user of users) {
      user.courseCount = byUser.get(user.id) ?? 0;
    }
  }

  async findOneForAdmin(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['userCourses', 'userCourses.course'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // TypeORM filters soft-deleted rows out of a joined entity by nulling it,
    // so a live enrolment whose course was deleted arrives with `course: null`.
    // The admin page cannot render such a row and would crash on
    // `course.name`; it is dropped here so the contract stays `course: Course`.
    user.userCourses = (user.userCourses ?? []).filter(
      (userCourse) => userCourse.course,
    );
    return user;
  }

  /**
   * The unique index on `email` keeps its hold on a soft-deleted row, so this
   * has to look past the delete or the collision surfaces as a Postgres 500.
   */
  private async assertEmailFree(email: string, exceptId?: number) {
    const existing = await this.usersRepository.findOne({
      where: { email },
      withDeleted: true,
    });
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('email is already taken');
    }
  }

  async createForAdmin(dto: CreateAdminUserDto): Promise<User> {
    await this.assertEmailFree(dto.email);

    const user = new User();
    user.email = dto.email;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    // Plaintext in, hashed here once: the same contract as `create`.
    user.password = await bcrypt.hash(dto.password, 10);
    user.status = USER_STATUS_ACTIVE;
    return this.usersRepository.save(user);
  }

  async updateForAdmin(id: number, dto: UpdateAdminUserDto): Promise<User> {
    const user = await this.findOneForAdmin(id);
    if (dto.email && dto.email !== user.email) {
      await this.assertEmailFree(dto.email, id);
    }
    // The global ValidationPipe does not whitelist, so the body can carry keys
    // the DTO never declared (`password`, `status`, ...). Copy the editable
    // fields explicitly rather than handing the raw body to `update`.
    const { email, firstName, lastName } = dto;
    await this.usersRepository.update(id, { email, firstName, lastName });
    return this.findOneForAdmin(id);
  }

  async setStatus(id: number, status: UserStatus): Promise<User> {
    await this.findOneForAdmin(id);
    await this.usersRepository.update(id, { status });
    return this.findOneForAdmin(id);
  }

  async removeForAdmin(id: number): Promise<{ message: string }> {
    // `withDeleted` is load-bearing: TypeORM leaves soft-deleted rows out of a
    // relation, and revoking an enrolment soft-deletes it. Without this a user
    // whose enrolments were all revoked would look like they own nothing.
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['userCourses', 'userPremiums'],
      withDeleted: true,
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Both foreign keys are NO ACTION, so a hard delete is impossible anyway;
    // hiding the user would only strand the records pointing at them, revoked
    // ones included. Lock the account instead — that is what the status column
    // is for.
    const owned =
      (user.userCourses?.length ?? 0) + (user.userPremiums?.length ?? 0);
    if (owned > 0) {
      throw new BadRequestException(
        'This user has purchases and cannot be deleted; lock the account instead',
      );
    }

    await this.usersRepository.softDelete(id);
    return { message: 'User deleted successfully' };
  }
}
