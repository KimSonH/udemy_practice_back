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

  @Column()
  userId: number;

  @Column()
  accountEmail: string;

  @Column({ nullable: true })
  orderId?: string;

  @Column({ nullable: true })
  orderData?: string;

  @Column({ nullable: true })
  orderBy?: string;

  @Column({ nullable: true })
  status?: 'pending' | 'completed' | 'failed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  @Exclude()
  deletedAt?: Date;

  @ManyToOne(() => User, (user) => user.userPremiums)
  @JoinColumn({ name: 'userId' })
  user: User;
}
