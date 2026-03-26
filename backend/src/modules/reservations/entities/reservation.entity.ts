import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Zone } from '../../zones/entities/zone.entity';
import { Driver } from '../../drivers/entities/driver.entity';
import { ReservationStatus } from '../../../common/enums/reservation-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { TripType } from '../../../common/enums/trip-type.enum';
import { Language } from '../../../common/enums/language.enum';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  clientFirstName: string;

  @Column()
  clientLastName: string;

  @Column()
  clientEmail: string;

  @Column()
  clientPhone: string;

  @Column({ type: 'enum', enum: TripType })
  tripType: TripType;

  @Column({ nullable: true })
  pickupZoneId: string;

  @ManyToOne(() => Zone, { eager: true, nullable: true })
  @JoinColumn({ name: 'pickupZoneId' })
  pickupZone: Zone;

  @Column({ nullable: true })
  pickupCustomAddress: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  pickupLatitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  pickupLongitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  clientLatitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  clientLongitude: number;

  @Column({ nullable: true })
  dropoffZoneId: string;

  @ManyToOne(() => Zone, { nullable: true })
  @JoinColumn({ name: 'dropoffZoneId' })
  dropoffZone: Zone;

  @Column({ nullable: true, type: 'text' })
  dropoffCustomAddress: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  dropoffLatitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  dropoffLongitude: number;

  @Column({ type: 'timestamp' })
  pickupDateTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnDateTime: Date;

  @Column({ nullable: true })
  flightNumber: string;

  @Column({ nullable: true })
  airlineCompany: string;

  @Column({ nullable: true })
  departureTime: string;

  @Column({ nullable: true })
  landingTime: string;

  @Column({ nullable: true, type: 'text' })
  flightDetails: string;

  @Column({ type: 'int', default: 1 })
  vehicleCount: number;

  @Column({ type: 'int', default: 1 })
  passengers: number;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.EN_ATTENTE,
  })
  status: ReservationStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.EN_ATTENTE,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discount: number;

  @Column({ nullable: true })
  promoCode: string;

  @Column({ type: 'enum', enum: Language, default: Language.FR })
  language: Language;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  driverId: string;

  @ManyToOne(() => Driver, { nullable: true, eager: true })
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ nullable: true })
  cancelToken: string;

  @Column({ nullable: true, type: 'timestamp' })
  cancelTokenExpiresAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  startedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
