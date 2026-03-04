import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Zone } from '../../zones/entities/zone.entity';

@Entity('tariffs')
@Unique(['zoneFromId', 'zoneToId'])
export class Tariff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  zoneFromId: string;

  @ManyToOne(() => Zone, { eager: true })
  @JoinColumn({ name: 'zoneFromId' })
  zoneFrom: Zone;

  @Column()
  zoneToId: string;

  @ManyToOne(() => Zone, { eager: true })
  @JoinColumn({ name: 'zoneToId' })
  zoneTo: Zone;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
