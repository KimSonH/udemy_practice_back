import { Exclude } from 'class-transformer';
import { Course } from 'src/courses/entities/courses.entity';
import { UdemyQuestionBank } from 'src/udemyQuestionBanks/entities/udemy-question-bank.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class CourseSet {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(() => Course, (course) => course.courseSets)
  public course: Course;

  @ManyToMany(() => UdemyQuestionBank)
  @JoinTable()
  public udemyQuestionBanks: UdemyQuestionBank[];
}
