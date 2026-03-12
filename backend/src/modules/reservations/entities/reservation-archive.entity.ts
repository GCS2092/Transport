import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ReservationStatus } from '../../../common/enums/reservation-status.enum';
import { TripType } from '../../../common/enums/trip-type.enum';
import { Language } from '../../../common/enums/language.enum';

@Entity('reservations_archive')
export class ReservationArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: ReservationStatus })
  status: ReservationStatus;

  @Column({ type: 'enum', enum: TripType })
  tripType: TripType;

  @Column({ type: 'enum', enum: Language, default: Language.FR })
  language: Language;

  @Column({ type: 'timestamp' })
  pickupDateTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  driverId: string;

  @Column({ nullable: true })
  pickupLabel: string;

  @Column({ nullable: true })
  dropoffLabel: string;

  // Hash stable (pas de PII en clair) pour stats uniques si besoin
  @Column({ nullable: true })
  clientHash: string;

  @CreateDateColumn()
  archivedAt: Date;
}

