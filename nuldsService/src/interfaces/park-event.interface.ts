// Base interface for all park events
export interface BaseParkEvent {
  park_id: number;
  time: string;
}

// Dinosaur Fed Event
export interface DinoFedEvent extends BaseParkEvent {
  kind: 'dino_fed';
  dinosaur_id: number;
}

// Dinosaur Location Updated Event
export interface DinoLocationUpdatedEvent extends BaseParkEvent {
  kind: 'dino_location_updated';
  location: string;
  dinosaur_id: number;
}

// Dinosaur Removed Event
export interface DinoRemovedEvent extends BaseParkEvent {
  kind: 'dino_removed';
  dinosaur_id: number;
}

// Dinosaur Added Event
export interface DinoAddedEvent extends BaseParkEvent {
  kind: 'dino_added';
  name: string;
  species: string;
  gender: 'male' | 'female';
  id: number;
  digestion_period_in_hours: number;
  herbivore: boolean;
}

// Maintenance Performed Event
export interface MaintenancePerformedEvent extends BaseParkEvent {
  kind: 'maintenance_performed';
  location: string;
}

// Union type of all possible events
export type ParkEvent =
  | DinoFedEvent
  | DinoLocationUpdatedEvent
  | DinoRemovedEvent
  | DinoAddedEvent
  | MaintenancePerformedEvent;

// Type guard functions for type narrowing
export function isDinoFedEvent(event: ParkEvent): event is DinoFedEvent {
  return event.kind === 'dino_fed';
}

export function isDinoLocationUpdatedEvent(
  event: ParkEvent,
): event is DinoLocationUpdatedEvent {
  return event.kind === 'dino_location_updated';
}

export function isDinoRemovedEvent(
  event: ParkEvent,
): event is DinoRemovedEvent {
  return event.kind === 'dino_removed';
}

export function isDinoAddedEvent(event: ParkEvent): event is DinoAddedEvent {
  return event.kind === 'dino_added';
}

export function isMaintenancePerformedEvent(
  event: ParkEvent,
): event is MaintenancePerformedEvent {
  return event.kind === 'maintenance_performed';
}
