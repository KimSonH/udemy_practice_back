import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * What the admin knows about one Gumroad video URL beyond where it is used:
 * whether it was retired, and how the last link check went. Keyed by URL
 * because pasted videos have no gumroad_upload row. Gumroad's API cannot
 * delete an uploaded file, so "retired" is ours: the video may still play,
 * but no lesson may use it again. Names match the CreateGumroadVideoStatus
 * migration.
 */
@Entity('gumroad_video_status')
@Index('IDX_gumroad_video_status_url', ['url'], { unique: true })
export class GumroadVideoStatus {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'url' })
  public url: string;

  @Column({ name: 'retired_at', type: 'timestamp', nullable: true })
  public retiredAt: Date | null;

  @Column({ name: 'checked_at', type: 'timestamp', nullable: true })
  public checkedAt: Date | null;

  /** True when the last check got a video back; null before any check. */
  @Column({ name: 'check_ok', type: 'boolean', nullable: true })
  public checkOk: boolean | null;

  @Column({ name: 'check_status', type: 'int', nullable: true })
  public checkStatus: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;
}
