import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Entity } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Course } from 'src/courses/entities/courses.entity';
@Entity()
export class Question {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({ nullable: true })
  public question?: string;

  @Column({ nullable: true })
  public questionType?: string;

  @Column({ nullable: true })
  public categoryName?: string;

  @Column({ nullable: true })
  public answerOption1?: string;

  @Column({ nullable: true })
  public explanation1?: string;

  @Column({ nullable: true })
  public answerOption2?: string;

  @Column({ nullable: true })
  public explanation2?: string;

  @Column({ nullable: true })
  public answerOption3?: string;

  @Column({ nullable: true })
  public explanation3?: string;

  @Column({ nullable: true })
  public answerOption4?: string;

  @Column({ nullable: true })
  public explanation4?: string;

  @Column({ nullable: true })
  public answerOption5?: string;

  @Column({ nullable: true })
  public explanation5?: string;

  @Column({ nullable: true })
  public answerOption6?: string;

  @Column({ nullable: true })
  public explanation6?: string;

  @Column({ nullable: true })
  public correctAnswer?: string;

  @Column({ nullable: true })
  public overallExplanation?: string;

  @Column({ nullable: true })
  public domain?: string;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  public deletedAt?: Date;

  @ManyToMany(() => Course, (course) => course.questions)
  public courses: Course[];
}
