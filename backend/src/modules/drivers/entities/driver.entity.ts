import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DriverStatus } from '../../../common/enums/driver-status.enum';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  phone: string;

  @Column()
  vehicleType: string;

  @Column({ nullable: true })
  vehiclePlate: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: DriverStatus,
    default: DriverStatus.DISPONIBLE,
  })
  status: DriverStatus;

  @Column({ nullable: true })
  userId: string;

  // ← CASCADE au lieu de SET NULL
  @OneToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}