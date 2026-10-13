import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One video uploaded to Gumroad through this API. Learner courses may only use
 * videos their owner uploaded, and the daily upload cap counts these rows.
 * user_id is null for admin uploads, which carry no such limits. Indexes live
 * in the CreateGumroadUpload migration.
 */
@Entity('gumroad_upload')
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
}
