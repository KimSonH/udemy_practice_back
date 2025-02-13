import { Exclude } from 'class-transformer';
import { Category } from 'src/categories/categories.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiplechoice',
  TRUE_FALSE = 'truefalse',
  MULTIPLE_RESPONSE = 'multipleresponse',
  SHORT_ANSWER = 'shortanswer',
}

@Entity()
export class ClassMarker {
  @ApiProperty({ description: 'The unique identifier of the class marker' })
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  public questionType: QuestionType;

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

  @ManyToMany(() => Category)
  @JoinTable()
  public categories: Category[];
}
