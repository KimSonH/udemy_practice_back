import { Exclude } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Admin {
  @ApiProperty({ description: 'The unique identifier of the admin' })
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({ unique: true })
  @ApiProperty({ description: 'User email address' })
  public email: string;

  @Column()
  @ApiProperty({ description: 'User first name' })
  public firstName: string;

  @Column()
  @ApiProperty({ description: 'User last name' })
  public lastName: string;

  @Column()
  @Exclude()
  @ApiProperty({ description: 'User password (hashed)' })
  public password: string;

  @Column()
  @ApiProperty({ description: 'User role' })
  public role: string;

  @Column({
    nullable: true,
  })
  @Exclude()
  @ApiProperty({ description: 'Current hashed refresh token' })
  public currentHashedRefreshToken?: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'User creation date' })
  public createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'User update date' })
  public updatedAt!: Date;

  @DeleteDateColumn()
  @Exclude()
  @ApiProperty({ description: 'User deletion date' })
  public deletedAt?: Date;
}
