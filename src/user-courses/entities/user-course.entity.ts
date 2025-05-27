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

  @Column()
  public userId: number;

  @Column()
  public courseId: number;

  @Column({ nullable: true })
  public orderId?: string;

  @Column({ nullable: true })
  public orderData?: string;

  @Column({ nullable: true })
  public orderBy?: string;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(() => User, (user) => user.userCourses)
  @JoinColumn({ name: 'userId' })
  public user: User;

  @ManyToOne(() => Course, (course) => course.userCourses)
  @JoinColumn({ name: 'courseId' })
  public course: Course;
}
