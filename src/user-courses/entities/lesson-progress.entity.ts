import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Course } from 'src/courses/entities/courses.entity';

/**
 * Where a learner is in a video course, one row per lesson they opened.
 *
 * Keyed by the lesson's video URL, not its id: saving a video course deletes
 * every lesson and inserts it again under a new id, so an id would lose
 * everyone's progress on each edit. The URL survives renames and reordering,
 * and a replaced video rightly starts over. Names match the
 * CreateLessonProgress migration.
 */
@Entity('lesson_progress')
@Index('IDX_lesson_progress_user_course_url', ['userId', 'courseId', 'url'], {
  unique: true,
})
export class LessonProgress {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'user_id', type: 'int' })
  public userId: number;

  @Column({ name: 'course_id', type: 'int' })
  public courseId: number;

  @Column({ name: 'url' })
  public url: string;

  /** Null while the lesson is opened but not finished. */
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  public completedAt: Date | null;

  /** Last opened; the most recent row is where the learner resumes. */
  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_lesson_progress_user',
  })
  public user?: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'course_id',
    foreignKeyConstraintName: 'FK_lesson_progress_course',
  })
  public course?: Course;
}
