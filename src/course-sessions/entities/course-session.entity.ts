import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Course } from 'src/courses/entities/courses.entity';
import { CourseContent } from 'src/course-contents/entities/course-content.entity';

@Entity()
export class CourseSession {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;

  @Column({ nullable: true })
  public description?: string;

  @Column({ nullable: true })
  public uploadUrl?: string;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  public deletedAt?: Date;

  @ManyToOne(() => Course, (course) => course.courseSessions)
  public course: Course;

  @OneToMany(
    () => CourseContent,
    (courseContent) => courseContent.courseSession,
  )
  public courseContents: CourseContent[];
}
