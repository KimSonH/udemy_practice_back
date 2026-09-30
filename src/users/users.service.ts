import {
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
   * would multiply rows. The join to `course` with `deleted_at IS NULL` is the
   * part that matters: an enrolment row outlives the course it points at, so
   * counting `user_course` alone would advertise a course the learner can no
   * longer open.
   */
  private async attachCourseCounts(users: User[]): Promise<void> {
    if (users.length === 0) return;

    const ids = users.map((user) => user.id);
    const rows: { user_id: number; count: string }[] =
      await this.dataSource.query(
        `SELECT uc.user_id, count(*) AS count
         FROM user_course uc
         JOIN course c ON c.id = uc.course_id
         WHERE uc.user_id = ANY($1) AND c.deleted_at IS NULL
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
    return user;
  }
}
