import { Module } from '@nestjs/common';
import { UserPremium } from './entities/user-premium.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPremiumsController } from './user-premium.controller';
import { UserPremiumsService } from './user-premium.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserPremium])],
  controllers: [UserPremiumsController],
  providers: [UserPremiumsService],
  exports: [UserPremiumsService],
})
export class UserPremiumModule {}
