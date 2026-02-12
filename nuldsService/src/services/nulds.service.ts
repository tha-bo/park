import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { writeFile } from "fs/promises";
import { join } from "path";
import {
  ParkEvent,
  isDinoAddedEvent,
  isDinoFedEvent,
  isDinoLocationUpdatedEvent,
  isDinoRemovedEvent,
  isMaintenancePerformedEvent
} from "../interfaces";
import { DinoEventService } from "./dino-event.service";

@Injectable()
export class NuldsService {
  private readonly logger = new Logger(NuldsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly dinoEventService: DinoEventService
  ) {}

  // @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    try {
      await this.fetchData();
    } catch (error) {
      this.logger.error(`${NuldsService.name}.handleCron`, error);
    }
  }

  private async fetchData(): Promise<ParkEvent[]> {
    const apiUrl = process.env.NULDS_API_URL || "https://api.example.com/data";

    try {
      const response = await firstValueFrom(
        this.httpService.get<ParkEvent[]>(apiUrl)
      );

      const dateTime = new Date();
      const filename = dateTime.toISOString().replace(/[:.]/g, "-") + ".txt";
      const filepath = join(process.cwd(), filename);
      await writeFile(
        filepath,
        JSON.stringify(response.data, null, 2),
        "utf-8"
      );
      this.logger.debug(`Wrote JSON result to ${filepath}`);

      await this.processEvents(response.data);

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch data from ${apiUrl}`,
        JSON.stringify(error)
      );
      throw error;
    }
  }

  /**
   * Deletes all data in Redis and the database (dinosaurs, events, locations).
   */
  async deleteAllData(): Promise<void> {
    await this.dinoEventService.deleteAllData();
  }

  private async processEvents(events: ParkEvent[]) {
    this.logger.debug(`Processing ${events.length} events...`);

    for (const event of events) {
      try {
        if (isDinoAddedEvent(event)) {
          await this.dinoEventService.handleDinoAdded(event);
        } else if (isDinoFedEvent(event)) {
          await this.dinoEventService.handleDinoFed(event);
        } else if (isDinoLocationUpdatedEvent(event)) {
          await this.dinoEventService.handleDinoLocationUpdated(event);
        } else if (isDinoRemovedEvent(event)) {
          await this.dinoEventService.handleDinoRemoved(event);
        } else if (isMaintenancePerformedEvent(event)) {
          await this.dinoEventService.handleMaintenancePerformed(event);
        }
      } catch (error) {
        const eventId =
          "dinosaur_id" in event
            ? `dino ${event.dinosaur_id}`
            : "location" in event
              ? `location ${event.location}`
              : "";
        this.logger.error(
          `Error processing event ${event.kind}${eventId ? ` for ${eventId}` : ""}`,
          error
        );
      }
    }
  }
}
