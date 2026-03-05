import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  label: string;

  @Column()
  value: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ nullable: true })
  href: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
