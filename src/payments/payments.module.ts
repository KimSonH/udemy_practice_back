import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { UserCoursesModule } from 'src/user-courses/user-courses.module';
import { CoursesModule } from 'src/courses/courses.module';
import { JwtModule } from '@nestjs/jwt';
import { SepayService } from './sepay.service';

@Module({
  imports: [ConfigModule, UserCoursesModule, CoursesModule, JwtModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, SepayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
