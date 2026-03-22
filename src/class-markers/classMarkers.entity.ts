import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiplechoice',
  TRUE_FALSE = 'truefalse',
  MULTIPLE_RESPONSE = 'multipleresponse',
  SHORT_ANSWER = 'shortanswer',
}

@Entity()
export class ClassMarker {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({
    name: 'question_type',
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  public questionType: QuestionType;

  @Column({ name: 'parent_category_name', nullable: true })
  public parentCategoryName?: string;

  @Column({ name: 'category_name', nullable: true })
  public categoryName?: string;

  @Column({ name: 'random_answer', nullable: true })
  public randomAnswer?: string;

  @Column({ name: 'correct_feedback', nullable: true })
  public correctFeedback?: string;

  @Column({ name: 'incorrect_feedback', nullable: true })
  public incorrectFeedback?: string;

  @Column({ name: 'point' })
  public point: number;

  @Column({ name: 'question' })
  public question: string;

  @Column({ name: 'correct' })
  public correct: string;

  @Column({ name: 'answer_a' })
  public answerA: string;

  @Column({ name: 'answer_b' })
  public answerB: string;

  @Column({ name: 'answer_c', nullable: true })
  public answerC?: string;

  @Column({ name: 'answer_d', nullable: true })
  public answerD?: string;

  @Column({ name: 'answer_e', nullable: true })
  public answerE?: string;

  @Column({ name: 'answer_f', nullable: true })
  public answerF?: string;

  @Column({ name: 'answer_g', nullable: true })
  public answerG?: string;

  @Column({ name: 'answer_h', nullable: true })
  public answerH?: string;

  @Column({ name: 'answer_i', nullable: true })
  public answerI?: string;

  @Column({ name: 'answer_j', nullable: true })
  public answerJ?: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;
}
