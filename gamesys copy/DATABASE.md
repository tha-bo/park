# Dino Park Database

This module provides database functionality for storing and querying dinosaur events.

## Database Setup

The application uses TypeORM with SQLite for local development. The database file (`dino-park.db`) will be automatically created when you start the application.

### Database Schema

#### Dinosaurs Table
- `id`: Dinosaur ID (primary key)
- `name`: Dinosaur name
- `species`: Dinosaur species
- `gender`: Male or Female
- `digestion_period_in_hours`: Digestion period
- `herbivore`: Boolean flag
- `current_location`: Current location code
- `last_fed_at`: Last feeding timestamp
- `added_at`: When the dinosaur was added
- `is_active`: Whether the dinosaur is still in the park
- `removed_at`: When the dinosaur was removed (if applicable)
- `park_id`: Park identifier

#### Dino Events Table
- `id`: Auto-generated event ID (primary key)
- `kind`: Event type (dino_added, dino_fed, dino_location_updated, dino_removed, maintenance_performed)
- `dinosaur_id`: Reference to dinosaur
- `park_id`: Park identifier
- `time`: Event timestamp
- `metadata`: JSON field for event-specific data
- `created_at`: Record creation timestamp

#### Locations Table
- `location`: Location code (primary key, e.g., "A5", "Z15")
- `park_id`: Park identifier
- `maintenance_performed`: Last maintenance timestamp
- `updated_at`: Record update timestamp

## Seeding the Database

To populate the database with sample data from `input.json`:

```bash
npm run seed
```

This will process all events in chronological order and create the appropriate database records.

## API Endpoints

### Dinosaurs

- `GET /dinosaurs` - Get all dinosaurs
  - Query param: `?active=true` - Filter only active dinosaurs
- `GET /dinosaurs/stats` - Get statistics (total dinosaurs, total events)
- `GET /dinosaurs/herbivores` - Get all herbivore dinosaurs
- `GET /dinosaurs/carnivores` - Get all carnivore dinosaurs
- `GET /dinosaurs/needing-food` - Get dinosaurs that need feeding
  - Query param: `?hours=24` - Threshold in hours (default: 24)
- `GET /dinosaurs/species/:species` - Get dinosaurs by species
- `GET /dinosaurs/:id` - Get a specific dinosaur by ID
- `GET /dinosaurs/:id/events` - Get all events for a specific dinosaur

### Events

- `GET /events` - Get all events
- `GET /events/recent` - Get recent events
  - Query param: `?limit=10` - Number of events to return (default: 10)
- `GET /events/kind/:kind` - Get events by type
  - Examples: `/events/kind/dino_fed`, `/events/kind/dino_added`

### Locations

- `GET /locations` - Get all locations
  - Query param: `?park_id=1` - Filter by park ID
- `GET /locations/needing-maintenance` - Get locations that need maintenance
  - Query param: `?hours=168` - Threshold in hours (default: 168 = 1 week)
- `GET /locations/:location` - Get a specific location
  - Query param: `?park_id=1` - Park ID (required)

## Example Usage

### Start the Application

```bash
npm run start:dev
```

### Query Examples

```bash
# Get all active dinosaurs
curl http://localhost:3000/dinosaurs?active=true

# Get dinosaurs that need feeding (haven't been fed in 48 hours)
curl http://localhost:3000/dinosaurs/needing-food?hours=48

# Get all feeding events
curl http://localhost:3000/events/kind/dino_fed

# Get a specific dinosaur with all its events
curl http://localhost:3000/dinosaurs/1032

# Get recent events
curl http://localhost:3000/events/recent?limit=20

# Get locations needing maintenance
curl http://localhost:3000/locations/needing-maintenance?hours=168

# Get a specific location
curl "http://localhost:3000/locations/A5?park_id=1"
```

## Database Queries

The `DinoRepository` service provides methods for querying the database:

```typescript
// Inject the repository
constructor(private readonly dinoRepository: DinoRepository) {}

// Use the methods
const activeDinos = await this.dinoRepository.findActiveDinosaurs();
const hungryDinos = await this.dinoRepository.getDinosaursNeedingFood(48);
const recentEvents = await this.dinoRepository.findRecentEvents(10);
```

## Event Processing

The `DinoEventService` handles incoming events and stores them in the database:

- **dino_added**: Creates a new dinosaur record and event
- **dino_fed**: Updates the dinosaur's `last_fed_at` timestamp and creates an event
- **dino_location_updated**: Updates the dinosaur's `current_location` and creates an event
- **dino_removed**: Soft-deletes the dinosaur (sets `is_active` to false) and creates an event
- **maintenance_performed**: Updates the location's `maintenance_performed` timestamp

## Switching to PostgreSQL/MySQL

To use a different database, update `src/app.module.ts`:

```typescript
TypeOrmModule.forRoot({
  type: 'postgres', // or 'mysql'
  host: 'localhost',
  port: 5432,
  username: 'your_username',
  password: 'your_password',
  database: 'dino_park',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: true, // Disable in production
  logging: true,
}),
```

Then install the appropriate driver:

```bash
npm install pg  # For PostgreSQL
# or
npm install mysql2  # For MySQL
```
