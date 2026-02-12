import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DinoEventService } from './services';
import {
  ParkEvent,
  isDinoAddedEvent,
  isDinoFedEvent,
  isDinoLocationUpdatedEvent,
  isDinoRemovedEvent,
  isMaintenancePerformedEvent,
} from './interfaces';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dinoEventService = app.get(DinoEventService);

  console.log('Loading events from input.json...');
  const eventsPath = path.join(__dirname, '../../input.json');
  const eventsData = fs.readFileSync(eventsPath, 'utf-8');
  const events: ParkEvent[] = JSON.parse(eventsData);

  console.log(`Processing ${events.length} events...`);

  events.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );

  let processedCount = 0;
  for (const event of events) {
    try {
      if (isDinoAddedEvent(event)) {
        await dinoEventService.handleDinoAdded(event);
      } else if (isDinoFedEvent(event)) {
        await dinoEventService.handleDinoFed(event);
      } else if (isDinoLocationUpdatedEvent(event)) {
        await dinoEventService.handleDinoLocationUpdated(event);
      } else if (isDinoRemovedEvent(event)) {
        await dinoEventService.handleDinoRemoved(event);
      } else if (isMaintenancePerformedEvent(event)) {
        await dinoEventService.handleMaintenancePerformed(event);
      }
      processedCount++;
      console.log(
        `Processed ${processedCount}/${events.length}: ${event.kind}`,
      );
    } catch (error) {
      console.error(`Error processing event:`, error);
    }
  }

  console.log(`Successfully seeded ${processedCount} events!`);
  await app.close();
}

bootstrap().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
