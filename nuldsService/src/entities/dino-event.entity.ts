import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { DinosaurEntity } from './dinosaur.entity';

@Entity('dino_events')
export class DinoEventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kind: string;

  @Column()
  dinosaur_id: number;

  @Column()
  park_id: number;

  @Column({ type: 'datetime' })
  time: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => DinosaurEntity, (dinosaur) => dinosaur.events)
  @JoinColumn({ name: 'dinosaur_id' })
  dinosaur: DinosaurEntity;
}
