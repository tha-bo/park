import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  DinoAddedEvent,
  DinoFedEvent,
  DinoLocationUpdatedEvent,
  DinoRemovedEvent,
  MaintenancePerformedEvent
} from "../interfaces";
import { DinosaurEntity, DinoEventEntity, LocationEntity } from "../entities";
import { DinoLocationRepository } from "./dino-location.repository";

@Injectable()
export class DinoEventService {
  private readonly logger = new Logger(DinoEventService.name);

  constructor(
    @InjectRepository(DinosaurEntity)
    private readonly dinosaurRepository: Repository<DinosaurEntity>,
    @InjectRepository(DinoEventEntity)
    private readonly dinoEventRepository: Repository<DinoEventEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationRepository: Repository<LocationEntity>,
    private readonly dinoLocationRepository: DinoLocationRepository
  ) {}

  async handleDinoAdded(event: DinoAddedEvent) {
    this.logger.log(
      `Dinosaur added: ${event.name} (${event.species}) - ID: ${event.id}, Gender: ${event.gender}, Herbivore: ${event.herbivore}`
    );

    // Do not reactivate a dinosaur that was already removed
    const existing = await this.dinosaurRepository.findOne({
      where: { id: event.id }
    });
    const isActive = existing ? existing.is_active : true;

    // Upsert dinosaur record to handle out-of-order events
    const dinosaur = this.dinosaurRepository.create({
      id: event.id,
      name: event.name,
      species: event.species,
      gender: event.gender,
      digestion_period_in_hours: event.digestion_period_in_hours,
      herbivore: event.herbivore,
      added_at: new Date(event.time),
      park_id: event.park_id,
      is_active: isActive
    });

    await this.dinosaurRepository.save(dinosaur);

    const dinoEvent = this.dinoEventRepository.create({
      kind: event.kind,
      dinosaur_id: event.id,
      park_id: event.park_id,
      time: new Date(event.time),
      metadata: {
        name: event.name,
        species: event.species,
        gender: event.gender,
        digestion_period_in_hours: event.digestion_period_in_hours,
        herbivore: event.herbivore
      }
    });

    await this.dinoEventRepository.save(dinoEvent);

    await this.dinoLocationRepository.setDinosaur(event.id, {
      herbivore: event.herbivore,
      digestion_period_in_hours: event.digestion_period_in_hours,
      is_active: isActive
    });
  }

  async handleDinoFed(event: DinoFedEvent) {
    this.logger.log(`Dinosaur fed: ID ${event.dinosaur_id} at ${event.time}`);

    const result = await this.dinosaurRepository.update(
      { id: event.dinosaur_id },
      { last_fed_at: new Date(event.time) }
    );
    if (result.affected === 0) {
      await this.dinosaurRepository.save({
        id: event.dinosaur_id,
        park_id: event.park_id,
        last_fed_at: new Date(event.time)
      });
    }

    const dinoEvent = this.dinoEventRepository.create({
      kind: event.kind,
      dinosaur_id: event.dinosaur_id,
      park_id: event.park_id,
      time: new Date(event.time)
    });

    await this.dinoEventRepository.save(dinoEvent);

    await this.dinoLocationRepository.setDinosaur(event.dinosaur_id, {
      last_fed_at: new Date(event.time)
    });
  }

  async handleDinoLocationUpdated(event: DinoLocationUpdatedEvent) {
    this.logger.log(
      `Dinosaur location updated: ID ${event.dinosaur_id} moved to ${event.location}`
    );

    const eventTime = new Date(event.time);

    const result = await this.dinosaurRepository.update(
      { id: event.dinosaur_id },
      { current_location: event.location }
    );
    if (result.affected === 0) {
      await this.dinosaurRepository.save({
        id: event.dinosaur_id,
        park_id: event.park_id,
        current_location: event.location
      });
    }

    await this.dinoLocationRepository.setDinosaurLocation(
      event.dinosaur_id,
      event.location,
      eventTime
    );

    const dinoEvent = this.dinoEventRepository.create({
      kind: event.kind,
      dinosaur_id: event.dinosaur_id,
      park_id: event.park_id,
      time: eventTime,
      metadata: {
        location: event.location
      }
    });

    await this.dinoEventRepository.save(dinoEvent);
  }

  async handleDinoRemoved(event: DinoRemovedEvent) {
    this.logger.log(`Dinosaur removed: ID ${event.dinosaur_id}`);

    const result = await this.dinosaurRepository.update(
      { id: event.dinosaur_id },
      { is_active: false, removed_at: new Date(event.time) }
    );
    if (result.affected === 0) {
      await this.dinosaurRepository.save({
        id: event.dinosaur_id,
        park_id: event.park_id,
        is_active: false,
        removed_at: new Date(event.time)
      });
    }

    await this.dinoLocationRepository.removeDinosaur(event.dinosaur_id);

    const dinoEvent = this.dinoEventRepository.create({
      kind: event.kind,
      dinosaur_id: event.dinosaur_id,
      park_id: event.park_id,
      time: new Date(event.time)
    });

    await this.dinoEventRepository.save(dinoEvent);
  }

  async handleMaintenancePerformed(event: MaintenancePerformedEvent) {
    this.logger.log(`Maintenance performed at location ${event.location}`);

    try {
      const maintenanceTime = new Date(event.time);
      await this.locationRepository.upsert(
        {
          location: event.location,
          park_id: event.park_id,
          maintenance_performed: maintenanceTime
        },
        ["location", "park_id"]
      );
      this.logger.log(
        `Maintenance timestamp saved for location ${event.location} at ${maintenanceTime.toISOString()}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to save maintenance timestamp for location ${event.location}`,
        error
      );
    }
  }

  /**
   * Deletes all data from Redis and the database (dino events, dinosaurs, locations).
   */
  async deleteAllData(): Promise<void> {
    await this.dinoLocationRepository.clearAll();
    await this.dinoEventRepository.delete({});
    await this.dinosaurRepository.delete({});
    await this.locationRepository.delete({});
    this.logger.log("All data deleted from Redis and database");
  }
}
