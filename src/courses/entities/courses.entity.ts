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
} from 'typeorm';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';
import { CourseSession } from 'src/course-sessions/entities/course-session.entity';
@Entity()
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

  @Column({ name: 'category_name' })
  public categoryName: string;

  @Column({ name: 'slug', unique: true })
  public slug: string;

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
}
