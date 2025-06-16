import { Module } from '@nestjs/common';
import { PaymentsPremiumService } from './payments-premium.service';
import { PaymentsPremiumController } from './payments-premium.controller';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserPremiumModule } from 'src/user-premium/user-premium.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [ConfigModule, JwtModule, UserPremiumModule, HttpModule],
  controllers: [PaymentsPremiumController],
  providers: [PaymentsPremiumService],
})
export class PaymentsPremiumModule {}
