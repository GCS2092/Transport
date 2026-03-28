import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('platform_ratings')
export class PlatformRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ nullable: true, length: 255 })
  email: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
