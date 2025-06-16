import { Module } from '@nestjs/common';
import { UserPremium } from './entities/user-premium.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPremiumsController } from './user-premium.controller';
import { UserPremiumsService } from './user-premium.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([UserPremium]), HttpModule, ConfigModule],
  controllers: [UserPremiumsController],
  providers: [UserPremiumsService],
  exports: [UserPremiumsService],
})
export class UserPremiumModule {}
