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

  @Column({ name: 'name' })
  public name: string;

  @Column({ name: 'slug', unique: true })
  public slug: string;

  @Column({ name: 'description', nullable: true })
  public description?: string;

  @Column({ name: 'thumbnail_image_url', nullable: true })
  public thumbnailImageUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;

  @OneToMany(() => Course, (course) => course.organization)
  public courses: Course[];
}
