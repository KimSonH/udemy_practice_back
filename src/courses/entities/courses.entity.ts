import { Exclude } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  UpdateDateColumn,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';
import { CourseSession } from 'src/course-sessions/entities/course-session.entity';
import { CourseResource } from 'src/course-resources/entities/course-resource.entity';
import { User } from 'src/users/entities/user.entity';
@Entity()
// Name matches the AddOwnerAndReviewToCourse migration.
@Index('IDX_course_owner_user_id', ['ownerUserId'])
export class Course {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'name' })
  public name: string;

  @Column({ name: 'description', nullable: true })
  public description?: string;

  @Column({ name: 'content', nullable: true })
  public content?: string;

  @Column({ name: 'thumbnail_image_url', nullable: true })
  public thumbnailImageUrl?: string;

  @Column({ name: 'status' })
  public status: string;

  @Column({
    name: 'price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  public price: number;

  @Column({ name: 'type' })
  public type: string;

  @Column({ name: 'creation_mode', default: 'auto' })
  public creationMode: string;

  @Column({ name: 'category_name', nullable: true })
  public categoryName?: string;

  @Column({ name: 'slug', unique: true })
  public slug: string;

  /**
   * How long one of this course's practice tests is allowed to take. Null means
   * the client works it out from the number of questions: real exams are not
   * a fixed number of minutes per question — AI-102 allows 100 minutes for
   * roughly 40 to 60 — so a course that knows its own figure says so.
   */
  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  public durationMinutes?: number;

  /**
   * The percentage needed to pass, not a number of questions. Null means the
   * client falls back to its own default.
   */
  @Column({ name: 'passing_percent', type: 'int', nullable: true })
  public passingPercent?: number;

  /**
   * The learner who created the course; null for admin courses. An id rather
   * than a relation, so a course response can never drag the user row along.
   */
  @Column({ name: 'owner_user_id', type: 'int', nullable: true })
  public ownerUserId?: number | null;

  /**
   * When an admin last looked at a learner course. Null means it changed since
   * (or was never reviewed); the admin is warned about those.
   */
  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  public reviewedAt?: Date | null;

  /**
   * The creator's display name, filled in only on the public course page. Not
   * a column; the owner relation stays excluded so no email can leak.
   */
  public creatorName?: string | null;

  /** Lessons of a video course, filled in only by list endpoints. */
  public lessonCount?: number;

  /** The viewer's finished lessons, filled in only on their own course list. */
  public lessonsCompleted?: number;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;

  @OneToMany(() => CourseSet, (courseSet) => courseSet.course)
  public courseSets: CourseSet[];

  @ManyToOne(() => Organization, (organization) => organization.courses)
  @JoinColumn({ name: 'organization_id' })
  public organization: Organization;

  @OneToMany(() => UserCourse, (userCourse) => userCourse.course)
  public userCourses: UserCourse[];

  @OneToMany(() => CourseSession, (courseSession) => courseSession.course)
  public courseSessions: CourseSession[];

  @OneToMany(() => CourseResource, (courseResource) => courseResource.course)
  public courseResources: CourseResource[];

  /**
   * Declares the owner foreign key; code reads ownerUserId. Excluded so a user
   * row (email, password hash) can never reach a course response, even if a
   * query loads it by mistake.
   */
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'owner_user_id',
    foreignKeyConstraintName: 'FK_course_owner_user',
  })
  @Exclude()
  public owner?: User | null;
}
