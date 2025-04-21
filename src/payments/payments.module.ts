import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { PayOSService } from './payos.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
