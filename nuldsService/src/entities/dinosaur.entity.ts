import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { DinoEventEntity } from './dino-event.entity';

@Entity('dinosaurs')
export class DinosaurEntity {
  @PrimaryColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  species: string;

  @Column({ nullable: true })
  gender: 'male' | 'female';

  @Column({ nullable: true })
  digestion_period_in_hours: number;

  @Column({ nullable: true })
  herbivore: boolean;

  @Column({ nullable: true })
  current_location: string;

  @Column({ type: 'datetime', nullable: true })
  last_fed_at: Date;

  @Column({ type: 'datetime', nullable: true })
  added_at: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'datetime', nullable: true })
  removed_at: Date;

  @Column({ nullable: true })
  park_id: number;

  @OneToMany(() => DinoEventEntity, (event) => event.dinosaur)
  events: DinoEventEntity[];
}
