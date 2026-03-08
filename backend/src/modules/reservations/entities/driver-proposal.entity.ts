import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Driver } from '../../drivers/entities/driver.entity';

export enum ProposalStatus {
  PENDING = 'PENDING',       // En attente de réponse
  ACCEPTED = 'ACCEPTED',   // Chauffeur a confirmé
  DECLINED = 'DECLINED',   // Chauffeur a décliné
  EXPIRED = 'EXPIRED',     // 10 minutes écoulées sans réponse
  SKIPPED = 'SKIPPED',     // Passé au suivant (réservé pour usage interne)
}

@Entity('driver_proposals')
@Index(['reservationId', 'status'])
@Index(['token'])
export class DriverProposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reservationId: string;

  @ManyToOne(() => Reservation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column({ type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.PENDING,
  })
  status: ProposalStatus;

  @Column({ unique: true, length: 64 })
  token: string; // Token unique pour les boutons Accepter/Décliner

  @Column({ type: 'int' })
  position: number; // Position dans la queue (1 = plus proche, 2 = 2ème, etc.)

  @Column({ type: 'float' })
  distance: number; // Distance en km entre chauffeur et pickup

  @Column({ type: 'timestamp' })
  expiresAt: Date; // Date d'expiration (10 minutes après envoi)

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date; // Date de réponse (si accepté ou décliné)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
