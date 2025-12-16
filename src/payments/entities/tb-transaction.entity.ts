import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tb_transactions')
export class TBTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  gateway: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  transaction_date: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  account_number: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  sub_account: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  amount_in: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  amount_out: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  accumulated: number;

  @Column({ type: 'varchar', length: 250, nullable: true })
  code: string | null;

  @Column({ type: 'text', nullable: true })
  transaction_content: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference_number: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
