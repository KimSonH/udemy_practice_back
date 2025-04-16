import { Exclude } from 'class-transformer';
import { Course } from 'src/courses/entities/courses.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;

  @Column({ unique: true })
  public slug: string;

  @Column({ nullable: true })
  public description?: string;

  @Column({ nullable: true })
  public thumbnailImageUrl?: string;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  public deletedAt?: Date;

  @OneToMany(() => Course, (course) => course.organization)
  public courses: Course[];
}
