import { Exclude } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { ClassMarker } from 'src/classMarkers/classMarkers.entity';
import { JoinTable, ManyToMany } from 'typeorm';
import { CategoryCourse } from 'src/categories/entities/categories.course.entity';

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;

  @Column({ nullable: true })
  public description?: string;

  @Column({ nullable: true })
  public thumbnailImageUrl?: string;

  @Column()
  public status: boolean;

  @Column()
  public price: number;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  public deletedAt?: Date;

  @ManyToMany(() => ClassMarker)
  @JoinTable()
  public questions: ClassMarker[];

  @ManyToMany(() => CategoryCourse, (categoryCourse) => categoryCourse.courses)
  @JoinTable()
  public categoryCourses: CategoryCourse[];
}
