import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('locations')
export class LocationEntity {
  @PrimaryColumn()
  location: string; // e.g., "A5", "Z15"

  @PrimaryColumn()
  park_id: number;

  @Column({ type: 'datetime', nullable: true })
  maintenance_performed: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
