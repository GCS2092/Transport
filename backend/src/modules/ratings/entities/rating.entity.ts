import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Driver } from '../../drivers/entities/driver.entity';

@Entity('ratings')
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reservationId: string;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column()
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'int' })
  rating: number; // 1 à 5 étoiles

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column()
  clientName: string;

  @CreateDateColumn()
  createdAt: Date;
}
