import { Inject, Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

/** Value stored per dinosaur in Redis (location set when placed via setDinosaurLocation) */
interface DinoMapEntry {
  location?: string;
  herbivore?: boolean;
  digestion_period_in_hours?: number;
  last_fed_at?: string | null; // ISO string in Redis
  is_active?: boolean;
}

/** Props that can be set via setDinosaur */
export interface SetDinosaurData {
  herbivore?: boolean;
  digestion_period_in_hours?: number;
  last_fed_at?: Date | null;
  is_active?: boolean;
}

const KEY_DINO = (id: number) => `dino:${id}`;
const KEY_CARNIVORE = (location: string) => `carnivore:${location}`;

@Injectable()
export class DinoLocationRepository {
  private readonly logger = new Logger(DinoLocationRepository.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis
  ) {}

  /**
   * Normalizes location string to uppercase (e.g., "a5" -> "A5")
   */
  normalizeLocation(location: string): string {
    return location.charAt(0).toUpperCase() + location.substring(1);
  }

  /**
   * Gets a dinosaur entry from Redis.
   */
  private async getDinoEntry(dinosaurId: number): Promise<DinoMapEntry | null> {
    const raw = await this.redis.get(KEY_DINO(dinosaurId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DinoMapEntry;
    } catch {
      return null;
    }
  }

  /**
   * Sets a dinosaur's location
   * @param dinosaurId - The ID of the dinosaur
   * @param location - The location (e.g., "A5", "Z15")
   * @param timestamp - Optional timestamp (defaults to now)
   */
  async setDinosaurLocation(
    dinosaurId: number,
    location: string,
    timestamp: Date
  ): Promise<void> {
    const normalizedLocation = this.normalizeLocation(location);

    const previous = await this.getDinoEntry(dinosaurId);
    let previousCarnivoreTimestamp: string | null = null;
    if (previous?.location) {
      previousCarnivoreTimestamp = await this.redis.hget(
        KEY_CARNIVORE(previous.location),
        String(dinosaurId)
      );
    }

    // old timestamp is newer than new timestamp, skip
    if (previousCarnivoreTimestamp) {
      const prevDate = new Date(previousCarnivoreTimestamp);
      if (prevDate > timestamp) return;
    }

    const updatedEntry: DinoMapEntry = {
      ...(previous ?? {}),
      location: normalizedLocation
    };
    await this.redis.set(KEY_DINO(dinosaurId), JSON.stringify(updatedEntry));

    if (previous?.location) {
      await this.redis.hdel(
        KEY_CARNIVORE(previous.location),
        String(dinosaurId)
      );
    }

    // Only add to carnivore location if not herbivore and (hungry or we don't know if hungry)
    if (previous?.herbivore === true || previous?.is_active === false) return;

    const knownHunger =
      previous?.last_fed_at != null &&
      previous?.digestion_period_in_hours != null;
    if (knownHunger && previous?.last_fed_at) {
      const lastFed = new Date(previous.last_fed_at);
      const hoursSinceFed =
        (new Date().getTime() - lastFed.getTime()) / (1000 * 60 * 60);
      if (hoursSinceFed < (previous.digestion_period_in_hours ?? 0)) return;
    }

    await this.redis.hset(
      KEY_CARNIVORE(normalizedLocation),
      String(dinosaurId),
      timestamp.toISOString()
    );
  }

  /**
   * Sets herbivore, digestion_period_in_hours and/or last_fed_at on a dinosaur.
   * If the dinosaur is not in the map, adds a new entry with the given data (no location until setDinosaurLocation is called).
   * If knownHunger shows the dino is no longer hungry, removes it from its carnivore location.
   */
  async setDinosaur(dinosaurId: number, data: SetDinosaurData): Promise<void> {
    const entry = (await this.getDinoEntry(dinosaurId)) ?? {};

    if (data.herbivore != undefined) entry.herbivore = data.herbivore;
    if (data.digestion_period_in_hours != undefined)
      entry.digestion_period_in_hours = data.digestion_period_in_hours;
    if (data.is_active != undefined) entry.is_active = data.is_active;
    if (data.last_fed_at != undefined)
      entry.last_fed_at = data.last_fed_at
        ? (data.last_fed_at as Date).toISOString()
        : null;

    await this.redis.set(KEY_DINO(dinosaurId), JSON.stringify(entry));

    // delete from carnivore location if dino is herbivore or no longer hungry or removed
    if (
      entry.location &&
      (data.herbivore === true ||
        !!entry.last_fed_at ||
        entry.is_active === false)
    ) {
      await this.redis.hdel(KEY_CARNIVORE(entry.location), String(dinosaurId));
    }
  }

  /**
   * Removes a dinosaur from the location tracking
   */
  async removeDinosaur(dinosaurId: number): Promise<boolean> {
    const entry = await this.getDinoEntry(dinosaurId);
    if (!entry) return false;

    if (entry.location) {
      await this.redis.hdel(KEY_CARNIVORE(entry.location), String(dinosaurId));
    }
    await this.redis.del(KEY_DINO(dinosaurId));
    this.logger.log(
      `Dinosaur ${dinosaurId} removed from location ${entry.location ?? "(no location)"}`
    );
    return true;
  }

  /**
   * Deletes all dino-related keys from Redis (dino:* and carnivore:*).
   */
  async clearAll(): Promise<void> {
    const dinoKeys = await this.redis.keys("dino:*");
    const carnivoreKeys = await this.redis.keys("carnivore:*");
    const keys = [...dinoKeys, ...carnivoreKeys];
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    this.logger.log(`Cleared ${keys.length} keys from Redis`);
  }
}
