import { Exclude } from 'class-transformer';
import { User } from 'src/users/entities/user.entity';
import { Course } from 'src/courses/entities/courses.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
@Entity()
export class UserCourse {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'user_id' })
  public userId: number;

  @Column({ name: 'course_id' })
  public courseId: number;

  @Column({ name: 'order_id', nullable: true })
  public orderId?: string;

  @Column({ name: 'order_data', nullable: true })
  public orderData?: string;

  @Column({ name: 'order_by', nullable: true })
  public orderBy?: string;

  @Column({ name: 'status', nullable: true })
  public status?: 'pending' | 'completed' | 'failed';

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(() => User, (user) => user.userCourses)
  @JoinColumn({ name: 'user_id' })
  public user: User;

  @ManyToOne(() => Course, (course) => course.userCourses)
  @JoinColumn({ name: 'course_id' })
  public course: Course;
}
