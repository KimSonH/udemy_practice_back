import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Admin } from './admin.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async getById(id: number): Promise<Admin> {
    const admin = await this.adminRepository.findOneBy({ id });
    if (admin) {
      return admin;
    }
    throw new HttpException(
      'Admin with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async getByEmail(email: string): Promise<Admin> {
    const admin = await this.adminRepository.findOneBy({ email });
    if (admin) {
      return admin;
    }
    throw new HttpException(
      'Admin with this email does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async setCurrentRefreshToken(refreshToken: string, adminId: number) {
    const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.adminRepository.update(adminId, {
      currentHashedRefreshToken,
    });
  }

  async removeRefreshToken(adminId: number) {
    await this.adminRepository.update(adminId, {
      currentHashedRefreshToken: null,
    });
  }

  async getAdminIfRefreshTokenMatches(refreshToken: string, adminId: number) {
    const admin = await this.getById(adminId);
    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      admin.currentHashedRefreshToken,
    );
    if (isRefreshTokenMatching) {
      return admin;
    }
  }
}
