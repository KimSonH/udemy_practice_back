import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Course } from 'src/courses/entities/courses.entity';
import { CourseContent } from 'src/course-contents/entities/course-content.entity';

@Entity()
export class CourseSession {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'name' })
  public name: string;

  @Column({ name: 'description', nullable: true })
  public description?: string;

  @Column({ name: 'upload_url', nullable: true })
  public uploadUrl?: string;

  @Column({ name: 'order', nullable: true })
  public order?: number;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(() => Course, (course) => course.courseSessions)
  @JoinColumn({ name: 'course_id' })
  public course: Course;

  @OneToMany(
    () => CourseContent,
    (courseContent) => courseContent.courseSession,
  )
  public courseContents: CourseContent[];
}
