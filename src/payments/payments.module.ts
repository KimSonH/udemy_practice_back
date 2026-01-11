import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { UserCoursesModule } from 'src/user-courses/user-courses.module';
import { CoursesModule } from 'src/courses/courses.module';
import { JwtModule } from '@nestjs/jwt';
import { SepayService } from './sepay.service';
import { TBTransactionService } from './tb-transaction.service';
import { TBTransaction } from './entities/tb-transaction.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    UserCoursesModule,
    CoursesModule,
    JwtModule,
    TypeOrmModule.forFeature([TBTransaction]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, SepayService, TBTransactionService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
