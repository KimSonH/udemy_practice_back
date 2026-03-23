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

  @Column({ name: 'gateway', type: 'varchar', length: 100 })
  gateway: string;

  @Column({
    name: 'transaction_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  transactionDate: Date;

  @Column({
    name: 'account_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  accountNumber: string | null;

  @Column({ name: 'sub_account', type: 'varchar', length: 250, nullable: true })
  subAccount: string | null;

  @Column({
    name: 'amount_in',
    type: 'decimal',
    precision: 20,
    scale: 2,
    default: 0,
  })
  amountIn: number;

  @Column({
    name: 'amount_out',
    type: 'decimal',
    precision: 20,
    scale: 2,
    default: 0,
  })
  amountOut: number;

  @Column({
    name: 'accumulated',
    type: 'decimal',
    precision: 20,
    scale: 2,
    default: 0,
  })
  accumulated: number;

  @Column({ name: 'code', type: 'varchar', length: 250, nullable: true })
  code: string | null;

  @Column({ name: 'transaction_content', type: 'text', nullable: true })
  transactionContent: string | null;

  @Column({
    name: 'reference_number',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  referenceNumber: string | null;

  @Column({ name: 'body', type: 'text', nullable: true })
  body: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
