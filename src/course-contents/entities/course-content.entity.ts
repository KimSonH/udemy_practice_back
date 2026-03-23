import { CourseSession } from 'src/course-sessions/entities/course-session.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
export class CourseContent {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'name' })
  public name: string;

  @Column({ name: 'description', nullable: true })
  public description?: string;

  @Column({ name: 'upload_url', nullable: true })
  public uploadUrl?: string;

  @Column({ name: 'duration', nullable: true })
  public duration?: number;

  @Column({ name: 'is_read', nullable: true })
  public isRead?: boolean;

  @Column({ name: 'is_shown', nullable: true })
  public isShown?: boolean;

  @Column({ name: 'type' })
  public type: string;

  @Column({ name: 'order', nullable: true })
  public order?: number;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(
    () => CourseSession,
    (courseSession) => courseSession.courseContents,
  )
  @JoinColumn({ name: 'course_session_id' })
  public courseSession: CourseSession;
}
