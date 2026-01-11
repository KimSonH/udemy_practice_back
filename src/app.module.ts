import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from '@hapi/joi';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { LoggerMiddleware } from './logger/logger.middleware';
import { AuthenticationModule } from './authentication/authentication.module';
import { CatchEverythingFilter } from './exceptions/catchEverything.filter';
import { APP_FILTER } from '@nestjs/core';
import { ClassMarkersModule } from './classMarkers/classMarkers.module';
import { CategoriesModule } from './categories/categories.module';
import { AdminModule } from './admin/admin.module';
import { CoursesModule } from './courses/courses.module';
import { UdemyQuestionBanksModule } from './udemyQuestionBanks/udemy-question-banks.module';
import { CourseSetsModule } from './course-sets/course-sets.module';
import { OrganizationsModule } from './organizations/organizations.module';
import typeorm from './config/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsModule } from './payments/payments.module';
import { UserCoursesModule } from './user-courses/user-courses.module';
import { MassCoursesModule } from './mass-courses/mass-courses.module';
import { MassAccountsModule } from './mass-account/mass-account.module';
import { UserPremiumModule } from './user-premium/user-premium.module';
import { PaymentsPremiumModule } from './payments-premium/payments-premium.module';
import { CourseContentsModule } from './course-contents/course-contents.module';
import { CourseSessionsModule } from './course-sessions/course-sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        PORT: Joi.number(),
        JWT_ACCESS_TOKEN_SECRET: Joi.string().required(),
        JWT_ACCESS_TOKEN_EXPIRATION_TIME: Joi.string().required(),
        JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
        JWT_REFRESH_TOKEN_EXPIRATION_TIME: Joi.string().required(),
        JWT_VERIFICATION_TOKEN_SECRET: Joi.string().required(),
        JWT_VERIFICATION_TOKEN_EXPIRATION_TIME: Joi.string().required(),
        SITE_URL: Joi.string().required(),
        SEPAY_ENV: Joi.string().valid('sandbox', 'production').required(),
        SEPAY_MERCHANT_ID: Joi.string().required(),
        SEPAY_SECRET_KEY: Joi.string().required(),
        SEPAY_CURRENCY: Joi.string().required(),
        SEPAY_WEBHOOK_SECRET_KEY: Joi.string().required(),
        SEPAY_IPN_SECRET_KEY: Joi.string().required(),
      }),
      isGlobal: true,
      load: [typeorm],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get('typeorm'),
    }),
    UsersModule,
    AdminModule,
    AuthenticationModule,
    ClassMarkersModule,
    CategoriesModule,
    CoursesModule,
    UdemyQuestionBanksModule,
    CourseSetsModule,
    OrganizationsModule,
    PaymentsModule,
    UserCoursesModule,
    MassCoursesModule,
    MassAccountsModule,
    UserPremiumModule,
    PaymentsPremiumModule,
    CourseContentsModule,
    CourseSessionsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
