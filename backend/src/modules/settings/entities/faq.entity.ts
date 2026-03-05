import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Language } from '../../../common/enums/language.enum';

@Entity('faqs')
export class Faq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'enum', enum: Language, default: Language.FR })
  language: Language;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
