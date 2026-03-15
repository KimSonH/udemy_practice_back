import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Entity } from 'typeorm';
import { Exclude } from 'class-transformer';
@Entity()
export class UdemyQuestionBank {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({ name: 'question', nullable: true })
  public question?: string;

  @Column({ name: 'question_type', nullable: true })
  public questionType?: string;

  @Column({ name: 'category_name', nullable: true })
  public categoryName?: string;

  @Column({ name: 'answer_option_1', nullable: true })
  public answerOption1?: string;

  @Column({ name: 'explanation_1', nullable: true })
  public explanation1?: string;

  @Column({ name: 'answer_option_2', nullable: true })
  public answerOption2?: string;

  @Column({ name: 'explanation_2', nullable: true })
  public explanation2?: string;

  @Column({ name: 'answer_option_3', nullable: true })
  public answerOption3?: string;

  @Column({ name: 'explanation_3', nullable: true })
  public explanation3?: string;

  @Column({ name: 'answer_option_4', nullable: true })
  public answerOption4?: string;

  @Column({ name: 'explanation_4', nullable: true })
  public explanation4?: string;

  @Column({ name: 'answer_option_5', nullable: true })
  public answerOption5?: string;

  @Column({ name: 'explanation_5', nullable: true })
  public explanation5?: string;

  @Column({ name: 'answer_option_6', nullable: true })
  public answerOption6?: string;

  @Column({ name: 'explanation_6', nullable: true })
  public explanation6?: string;

  @Column({ name: 'correct_answer', nullable: true })
  public correctAnswer?: string;

  @Column({ name: 'overall_explanation', nullable: true })
  public overallExplanation?: string;

  @Column({ name: 'domain', nullable: true })
  public domain?: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;
}
