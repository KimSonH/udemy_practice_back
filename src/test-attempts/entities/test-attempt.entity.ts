import { Exclude } from 'class-transformer';
import { Course } from 'src/courses/entities/courses.entity';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
import { User } from 'src/users/entities/user.entity';
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

import { AttemptStatus, TestMode } from '../test-attempt.constants';
import { DomainScore } from '../grading';

/**
 * One sitting of a practice test.
 *
 * Every attempt is kept — a retake does not overwrite the one before it. That
 * is the whole reason this table exists rather than the browser storage it
 * replaces: without a history there is no "best score" and no way to show
 * whether anyone is improving.
 */
@Entity()
@Index(['user', 'course', 'startedAt'])
export class TestAttempt {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'mode' })
  public mode: TestMode;

  @Column({ name: 'status', default: 'in_progress' })
  public status: AttemptStatus;

  @Column({ name: 'current_index', type: 'int', default: 0 })
  public currentIndex: number;

  /**
   * The questions this attempt covers, when they are not simply the set's own
   * — the missed-question drill pools them across sets. Null for a set's
   * attempt, which takes its questions from the set.
   */
  @Column({ name: 'question_ids', type: 'jsonb', nullable: true })
  public questionIds?: string[];

  /**
   * questionId -> option indexes in the order they were shown. Stored rather
   * than recomputed so the review shows the same arrangement the question was
   * answered in: "your answer B" has to keep meaning the same B. Null when the
   * attempt was not shuffled.
   */
  @Column({ name: 'option_order', type: 'jsonb', nullable: true })
  public optionOrder?: Record<string, string[]>;

  /** questionId -> the option indexes picked, e.g. { "40220": ["4"] } */
  @Column({ name: 'answers', type: 'jsonb', default: () => "'{}'::jsonb" })
  public answers: Record<string, string[]>;

  @Column({ name: 'flagged', type: 'jsonb', default: () => "'[]'::jsonb" })
  public flagged: string[];

  /** Practice mode: questions whose answer has already been revealed. */
  @Column({ name: 'revealed', type: 'jsonb', default: () => "'[]'::jsonb" })
  public revealed: string[];

  /**
   * Bumped on every write. A second tab holding an older revision is told to
   * stop syncing rather than allowed to overwrite: merging two tabs' answers
   * has no correct outcome, so the attempt belongs to one of them.
   */
  @Column({ name: 'revision', type: 'int', default: 0 })
  public revision: number;

  @Column({ name: 'started_at', type: 'timestamptz' })
  public startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  public finishedAt?: Date;

  /** Exam mode only; null in practice, which is untimed. */
  @Column({ name: 'deadline', type: 'timestamptz', nullable: true })
  public deadline?: Date;

  @Column({ name: 'timed_out', type: 'boolean', default: false })
  public timedOut: boolean;

  /**
   * Settled here when the attempt is submitted, never sent by the client.
   * Materialised so the progress screen is one query instead of re-grading
   * every question bank the learner has ever touched.
   */
  @Column({ name: 'correct_count', type: 'int', nullable: true })
  public correctCount?: number;

  @Column({ name: 'total_count', type: 'int', nullable: true })
  public totalCount?: number;

  @Column({ name: 'domain_scores', type: 'jsonb', nullable: true })
  public domainScores?: DomainScore[];

  /**
   * When the answers were cleared, leaving only the result. Null while the
   * attempt still has them, which is every attempt until it ages out.
   */
  @Column({ name: 'pruned_at', type: 'timestamptz', nullable: true })
  public prunedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  public user: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'course_id' })
  public course: Course;

  /** Null means the missed-question drill, which belongs to no single set. */
  @ManyToOne(() => CourseSet, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'course_set_id' })
  public courseSet?: CourseSet;
}
