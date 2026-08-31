import { Exclude } from 'class-transformer';
import { Course } from 'src/courses/entities/courses.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseResourceAccessLevel } from '../course-resource.constants';

@Entity()
@Index(['course', 'slug'], { unique: true, where: '"deleted_at" IS NULL' })
export class CourseResource {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'title' })
  public title: string;

  @Column({ name: 'slug' })
  public slug: string;

  @Column({ name: 'html', type: 'text', nullable: true })
  public html?: string;

  @Column({ name: 'is_visible', type: 'boolean', default: false })
  public isVisible: boolean;

  @Column({ name: 'access_level', default: 'private' })
  public accessLevel: CourseResourceAccessLevel;

  @Column({ name: 'order', type: 'int', default: 0 })
  public order: number;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(() => Course, (course) => course.courseResources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  public course: Course;
}
