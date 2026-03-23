import { Exclude } from 'class-transformer';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('user_premium')
export class UserPremium {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'account_email' })
  accountEmail: string;

  @Column({ name: 'account_id', nullable: true })
  accountId: number;

  @Column({ name: 'order_id', nullable: true })
  orderId?: string;

  @Column({ name: 'order_data', nullable: true })
  orderData?: string;

  @Column({ name: 'order_by', nullable: true })
  orderBy?: string;

  @Column({ name: 'status', nullable: true })
  status?: 'pending' | 'completed' | 'failed';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  deletedAt?: Date;

  @ManyToOne(() => User, (user) => user.userPremiums)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
