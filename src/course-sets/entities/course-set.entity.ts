import { Exclude } from 'class-transformer';
import { Course } from 'src/courses/entities/courses.entity';
import { UdemyQuestionBank } from 'src/udemyQuestionBanks/entities/udemy-question-bank.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
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

  @Column({ name: 'name' })
  public name: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(() => Course, (course) => course.courseSets)
  @JoinColumn({ name: 'course_id' })
  public course: Course;

  @ManyToMany(() => UdemyQuestionBank)
  @JoinTable({
    name: 'course_set_udemy_question_bank',
    joinColumn: { name: 'course_set_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'udemy_question_bank_id',
      referencedColumnName: 'id',
    },
  })
  public udemyQuestionBanks: UdemyQuestionBank[];
}
