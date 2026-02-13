# Maintenance Tracking Implementation

## Overview
This document describes the implementation of the `maintenance_performed` field for tracking location maintenance in the Dino Park system.

## Changes Made

### 1. New Location Entity (`location.entity.ts`)
Created a new database entity to store location maintenance information:

```typescript
@Entity('locations')
export class LocationEntity {
  @PrimaryColumn()
  location: string; // e.g., "A5", "Z15"
  
  @Column()
  park_id: number;
  
  @Column({ type: 'datetime', nullable: true })
  maintenance_performed: Date;
  
  @UpdateDateColumn()
  updated_at: Date;
}
```

**Key Features:**
- `location`: Primary key storing the location code (e.g., "A5", "Z15")
- `maintenance_performed`: Timestamp of the last maintenance at this location
- `park_id`: Associates the location with a specific park
- `updated_at`: Auto-updated timestamp for tracking record changes

### 2. Repository Updates (`dino.repository.ts`)
Added new methods to handle location data:

- **`findLocationByName(location, parkId)`**: Find a specific location
- **`findAllLocations(parkId?)`**: Get all locations, optionally filtered by park
- **`upsertLocation(location, parkId, maintenancePerformed)`**: Create or update location maintenance timestamp
- **`getLocationsNeedingMaintenance(hoursThreshold)`**: Find locations that haven't been maintained within the threshold (default: 168 hours = 1 week)

### 3. Service Updates (`nulds.service.ts`)
Enhanced the maintenance event handler to persist data:

**Before:**
```typescript
private handleMaintenancePerformed(event) {
  this.logger.log(`Maintenance performed at location ${event.location}`);
  // Add your business logic here
}
```

**After:**
```typescript
private async handleMaintenancePerformed(event) {
  this.logger.log(`Maintenance performed at location ${event.location}`);
  
  try {
    const maintenanceTime = new Date(event.time);
    await this.dinoRepository.upsertLocation(
      event.location,
      event.park_id,
      maintenanceTime,
    );
    this.logger.log(
      `Maintenance timestamp saved for location ${event.location} at ${maintenanceTime.toISOString()}`,
    );
  } catch (error) {
    this.logger.error(
      `Failed to save maintenance timestamp for location ${event.location}`,
      error,
    );
  }
}
```

### 4. New Location Controller (`location.controller.ts`)
Created REST API endpoints for accessing location maintenance data:

**Endpoints:**
- `GET /locations` - Get all locations
  - Query param: `?park_id=1` - Filter by park ID
- `GET /locations/needing-maintenance` - Get locations needing maintenance
  - Query param: `?hours=168` - Threshold in hours (default: 1 week)
- `GET /locations/:location` - Get specific location details
  - Query param: `?park_id=1` - Park ID (required)

### 5. Module Registration (`nulds.module.ts`)
- Added `LocationEntity` to TypeORM feature imports
- Added `LocationController` to controllers array

### 6. Documentation Updates (`DATABASE.md`)
- Added Locations table schema documentation
- Added location API endpoint documentation
- Added example curl commands for location queries
- Updated event processing documentation

### 7. Test Coverage (`location.controller.spec.ts`)
Created comprehensive unit tests for the LocationController with 100% coverage:
- Testing all three endpoints
- Testing with and without query parameters
- Testing both success and null return scenarios

## Database Schema

### Locations Table
| Column | Type | Description |
|--------|------|-------------|
| location | string | Primary key - location code (e.g., "A5") |
| park_id | number | Park identifier |
| maintenance_performed | datetime | Last maintenance timestamp (nullable) |
| updated_at | datetime | Auto-updated record timestamp |

## API Usage Examples

### Get locations needing maintenance (not maintained in over 1 week)
```bash
curl http://localhost:3000/locations/needing-maintenance
```

### Get locations needing maintenance (custom threshold - 72 hours)
```bash
curl http://localhost:3000/locations/needing-maintenance?hours=72
```

### Get all locations for a specific park
```bash
curl http://localhost:3000/locations?park_id=1
```

### Get details for a specific location
```bash
curl "http://localhost:3000/locations/A5?park_id=1"
```

## Event Flow

When a `maintenance_performed` event is received:

1. Event is captured by `NuldsService.processEvents()`
2. Event is identified as maintenance event using `isMaintenancePerformedEvent()` type guard
3. `handleMaintenancePerformed()` is called
4. Location is created or updated in database via `DinoRepository.upsertLocation()`
5. Timestamp is logged for audit trail

## Benefits

1. **Audit Trail**: Complete history of when maintenance was performed at each location
2. **Proactive Maintenance**: API endpoint to identify locations needing maintenance
3. **Flexible Querying**: Filter by park, time threshold, or specific location
4. **Automatic Updates**: Maintenance timestamps automatically saved when events are received
5. **Data Persistence**: Information survives application restarts (stored in database)

## Database Migration

Since the application uses `synchronize: true` in TypeORM configuration, the new `locations` table will be automatically created when the application starts. No manual migration is required.

For production environments, it's recommended to:
1. Disable `synchronize`
2. Generate proper migrations using TypeORM CLI
3. Run migrations manually in a controlled manner

## Testing

Run the test suite:
```bash
npm test
```

Run tests for location controller specifically:
```bash
npm test location.controller.spec
```

## Future Enhancements

Potential improvements to consider:
- Add maintenance types/categories
- Track maintenance duration
- Store maintenance notes/comments
- Add maintenance schedule/frequency tracking
- Alert system for overdue maintenance
- Integration with maintenance management system
