import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryCourse } from './entities/categories.course.entity';
import { CategoriesCourseAdminController } from './categories.course.admin.controller';
import { CategoriesCourseAdminService } from './categories.course.admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryCourse])],
  controllers: [CategoriesCourseAdminController],
  providers: [CategoriesCourseAdminService],
  exports: [CategoriesCourseAdminService],
})
export class CategoriesModule {}
