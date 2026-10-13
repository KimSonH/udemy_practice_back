import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

/**
 * One video uploaded to Gumroad through this API. Learner courses may only use
 * videos their owner uploaded, and the daily upload cap counts these rows.
 * user_id is null for admin uploads, which carry no such limits. Constraint
 * and index names match the CreateGumroadUpload migration.
 */
@Entity('gumroad_upload')
@Index('IDX_gumroad_upload_url', ['url'], { unique: true })
@Index('IDX_gumroad_upload_user_created', ['userId', 'createdAt'])
export class GumroadUpload {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  public userId: number | null;

  @Column({ name: 'url' })
  public url: string;

  @Column({ name: 'size', type: 'bigint' })
  public size: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  /** Declares the foreign key; code reads userId. */
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_gumroad_upload_user',
  })
  public user?: User | null;
}
