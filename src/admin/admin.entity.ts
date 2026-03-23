import { Exclude } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({ name: 'email', unique: true })
  public email: string;

  @Column({ name: 'first_name' })
  public firstName: string;

  @Column({ name: 'last_name' })
  public lastName: string;

  @Column({ name: 'password' })
  @Exclude()
  public password: string;

  @Column({ name: 'role' })
  public role: string;

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
}
