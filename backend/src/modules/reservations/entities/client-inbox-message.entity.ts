import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Reservation } from './reservation.entity';

export enum InboxMessageType {
  SYSTEM = 'SYSTEM',
  PRICE_QUOTE = 'PRICE_QUOTE',
  ADMIN = 'ADMIN',
}

@Entity('client_inbox_messages')
export class ClientInboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reservationId: string;

  @ManyToOne(() => Reservation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column({ nullable: true })
  clientEmail: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: InboxMessageType, default: InboxMessageType.SYSTEM })
  messageType: InboxMessageType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  quotedAmount: number | null;

  @Column({ default: false })
  isFromAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
