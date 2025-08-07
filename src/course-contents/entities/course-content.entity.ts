import { CourseSession } from 'src/course-sessions/entities/course-session.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
export class CourseContent {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;

  @Column({ nullable: true })
  public description?: string;

  @Column({ nullable: true })
  public uploadUrl?: string;

  @Column({ nullable: true })
  public duration?: number;

  @Column({ nullable: true })
  public isRead?: boolean;

  @Column({ nullable: true })
  public isShown?: boolean;

  @Column()
  public type: string;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(
    () => CourseSession,
    (courseSession) => courseSession.courseContents,
  )
  public courseSession: CourseSession;
}
