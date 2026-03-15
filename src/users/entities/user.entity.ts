import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserCourse } from 'src/user-courses/entities/user-course.entity';
import { UserPremium } from 'src/user-premium/entities/user-premium.entity';

@Entity()
export class User {
  @ApiProperty({ description: 'The unique identifier of the user' })
  @PrimaryGeneratedColumn()
  public id?: number;

  @ApiProperty({ description: 'User email address' })
  @Column({ name: 'email', unique: true })
  public email: string;

  @Column({ name: 'first_name' })
  public firstName: string;

  @Column({ name: 'last_name' })
  public lastName: string;

  @ApiProperty({ description: 'User password (hashed)' })
  @Column({ name: 'password' })
  @Exclude()
  public password: string;

  @Column({
    name: 'current_hashed_refresh_token',
    nullable: true,
  })
  @Exclude()
  public currentHashedRefreshToken?: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  public deletedAt?: Date;

  @OneToMany(() => UserCourse, (userCourse) => userCourse.user)
  public userCourses: UserCourse[];

  @OneToMany(() => UserPremium, (premium) => premium.user)
  public userPremiums: UserPremium[];
}
