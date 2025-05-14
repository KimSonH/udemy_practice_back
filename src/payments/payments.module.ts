import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { UserCoursesModule } from 'src/user-courses/user-courses.module';
import { CoursesModule } from 'src/courses/courses.module';

@Module({
  imports: [ConfigModule, UserCoursesModule, CoursesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
