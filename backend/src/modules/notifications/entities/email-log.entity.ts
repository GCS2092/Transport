import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { NotificationType } from '../../../common/enums/notification-type.enum';

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipient: string;

  @Column({ type: 'enum', enum: NotificationType })
  notificationType: NotificationType;

  @Column({ nullable: true })
  reservationId: string;

  @Column({ default: 'ENVOYE' })
  status: string;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn()
  sentAt: Date;
}
