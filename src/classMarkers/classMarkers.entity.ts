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
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  public questionType: QuestionType;

  @Column({ nullable: true })
  public parentCategoryName?: string;

  @Column({ nullable: true })
  public categoryName?: string;

  @Column({ nullable: true })
  public randomAnswer?: string;

  @Column({ nullable: true })
  public correctFeedback?: string;

  @Column({ nullable: true })
  public incorrectFeedback?: string;

  @Column()
  public point: number;

  @Column()
  public question: string;

  @Column()
  public correct: string;

  @Column()
  public answerA: string;

  @Column()
  public answerB: string;

  @Column({ nullable: true })
  public answerC?: string;

  @Column({ nullable: true })
  public answerD?: string;

  @Column({ nullable: true })
  public answerE?: string;

  @Column({ nullable: true })
  public answerF?: string;

  @Column({ nullable: true })
  public answerG?: string;

  @Column({ nullable: true })
  public answerH?: string;

  @Column({ nullable: true })
  public answerI?: string;

  @Column({ nullable: true })
  public answerJ?: string;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  public deletedAt?: Date;
}
