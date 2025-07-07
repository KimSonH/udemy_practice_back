import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateUserPremiumDto } from './dto/create-user-premium.dto';
import { UpdateUserPremiumDto } from './dto/update-user-premium.dto';
import { UserPremium } from './entities/user-premium.entity';
import { ILike, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationParams } from 'src/common/pagination.type';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserPremiumsService {
  private logger = new Logger(UserPremiumsService.name);

  private relations = ['user'];

  constructor(
    @InjectRepository(UserPremium)
    private readonly userPremiumRepository: Repository<UserPremium>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserPremiumDto: CreateUserPremiumDto) {
    try {
      const userPremium =
        this.userPremiumRepository.create(createUserPremiumDto);

      await this.userPremiumRepository.save(userPremium);

      return userPremium;
    } catch (error) {
      this.logger.error(`User premium creation failed: ${error.message}`);
      throw new InternalServerErrorException('User premium creation failed');
    }
  }

  async getUserPremiumsByUserId(
    userId: number,
    query: PaginationParams,
    status?: 'pending' | 'completed' | 'failed',
  ) {
    const { page, limit, search, orderBy } = query;
    const offset = (page - 1) * limit;
    const order = {
      DESC: 'DESC',
      ASC: 'ASC',
    };
    try {
      const [userPremiums, total] =
        await this.userPremiumRepository.findAndCount({
          where: { user: { id: userId }, status: status ? status : undefined },
          relations: this.relations,
          order: {
            createdAt: order[orderBy] || 'DESC',
          },
          skip: page === 9999 ? undefined : offset,
          take: page === 9999 ? undefined : limit,
        });
      return {
        items: userPremiums,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting user premiums: ${error.message}`);
      throw new BadRequestException('Error getting user premiums');
    }
  }

  async findAll(
    query: PaginationParams,
    status?: 'pending' | 'completed' | 'failed',
  ) {
    const { page, limit, search, orderBy } = query;
    const offset = (page - 1) * limit;
    const order = {
      DESC: 'DESC',
      ASC: 'ASC',
    };
    try {
      const [items, total] = await this.userPremiumRepository.findAndCount({
        relations: this.relations,
        where: {
          accountEmail: search ? ILike(`%${search}%`) : undefined,
          status: status ? status : undefined,
        },
        order: {
          createdAt: order[orderBy] || 'DESC',
        },
        skip: page === 9999 ? undefined : offset,
        take: page === 9999 ? undefined : limit,
      });
      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting user premiums: ${error.message}`);
      throw new BadRequestException('Error getting user premiums');
    }
  }

  async findOne(id: number, status?: 'pending' | 'completed' | 'failed') {
    try {
      const userPremium = await this.userPremiumRepository.findOne({
        where: { id, status: status ? status : undefined },
        relations: this.relations,
      });

      if (!userPremium) {
        throw new BadRequestException('User premium not found');
      }

      return userPremium;
    } catch (error) {
      this.logger.error(`Error getting user premium: ${error.message}`);
      throw new BadRequestException('Error getting user premium');
    }
  }

  async updateStatusByAccountId(
    userId: number,
    accountId: number,
    accountEmail: string,
    status: 'pending' | 'completed' | 'failed',
  ) {
    try {
      const userPremium = await this.userPremiumRepository.findOne({
        where: {
          user: { id: userId },
          accountId,
          accountEmail,
        },
        relations: this.relations,
      });

      if (!userPremium) {
        throw new BadRequestException(
          'User premium not found for update by account_id',
        );
      }

      userPremium.status = status;
      await this.userPremiumRepository.save(userPremium);
      return userPremium;
    } catch (error) {
      this.logger.error(
        `Error updating status by account_id: ${error.message}`,
      );
      throw new BadRequestException(
        'Error updating user premium status by account_id',
      );
    }
  }

  async findOneWithUserId(
    userId: number,
    id: number,
    status?: 'pending' | 'completed' | 'failed',
  ) {
    const userPremium = await this.userPremiumRepository.findOne({
      where: { user: { id: userId }, id, status: status ? status : undefined },
      relations: this.relations,
    });
    if (!userPremium || userPremium.user.id !== userId) {
      throw new BadRequestException('User premium not found');
    }
    return userPremium;
  }

  async update(id: number, updateUserPremiumDto: UpdateUserPremiumDto) {
    const userPremium = await this.findOne(id);
    try {
      const updatedUserPremium = this.userPremiumRepository.merge(
        userPremium,
        updateUserPremiumDto,
      );
      await this.userPremiumRepository.save(updatedUserPremium);
      return updatedUserPremium;
    } catch (error) {
      this.logger.error(`Error updating user premium: ${error.message}`);
      throw new BadRequestException('Error updating user premium');
    }
  }

  async updateStatus(
    userId: number,
    accountEmail: string,
    status: 'pending' | 'completed' | 'failed',
  ) {
    try {
      const userPremium = await this.userPremiumRepository.findOne({
        where: {
          user: { id: userId },
          accountEmail,
        },
        relations: this.relations,
      });

      if (!userPremium) {
        throw new BadRequestException('User premium not found for update');
      }

      userPremium.status = status;
      await this.userPremiumRepository.save(userPremium);
      return userPremium;
    } catch (error) {
      this.logger.error(`Error updating status: ${error.message}`);
      throw new BadRequestException('Error updating user premium status');
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      await this.userPremiumRepository.softDelete(id);
      return { message: 'User premium deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting user premium: ${error.message}`);
      throw new BadRequestException('Error deleting user premium');
    }
  }

  async getSoldAccountInfo(accountId: number) {
    try {
      const privateKey = this.configService.get('MASS_PRIVATE_KEY');

      const response = await firstValueFrom(
        this.httpService.get(
          `http://localhost:3304/api/account-service/sold-account/${accountId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-Private-key': privateKey,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      throw new Error(
        error?.response?.data?.message ||
          'Failed to fetch sold account information',
      );
    }
  }

async findAllAccountPremium(
  query: PaginationParams,
  status: 'completed' | 'failed' | 'pending' = 'completed',
) {
  const { page, limit, search, orderBy } = query;
  const offset = (page - 1) * limit;

  const order = {
    DESC: 'DESC',
    ASC: 'ASC',
  };

  try {
    const [items, total] = await this.userPremiumRepository.findAndCount({
      where: {
        status,
        accountEmail: search ? ILike(`%${search}%`) : undefined,
      },
      order: {
        createdAt: order[orderBy] || 'DESC',
      },
      skip: page === 9999 ? undefined : offset,
      take: page === 9999 ? undefined : limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  } catch (error) {
    this.logger.error(`Error getting user premium: ${error.message}`);
    throw new BadRequestException('Error getting user premium');
  }
}


}
