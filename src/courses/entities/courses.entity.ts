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
} from 'typeorm';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;

  @Column({ nullable: true })
  public description?: string;

  @Column({ nullable: true })
  public content?: string;

  @Column({ nullable: true })
  public thumbnailImageUrl?: string;

  @Column()
  public status: string;

  @Column()
  public price: number;

  @Column()
  public type: string;

  @Column()
  public categoryName: string;

  @Column({ unique: true })
  public slug: string;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  public deletedAt?: Date;

  @OneToMany(() => CourseSet, (courseSet) => courseSet.course)
  public courseSets: CourseSet[];

  @ManyToOne(() => Organization, (organization) => organization.courses)
  public organization: Organization;
}
