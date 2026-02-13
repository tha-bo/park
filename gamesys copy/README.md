# Dinosaur Park Management System

A NestJS application for managing dinosaur events in a park, with database persistence using TypeORM and SQLite.

## Features

- Track dinosaur additions, removals, locations, and feedings
- Store all events in a relational database
- REST API to query dinosaurs and events
- Automatic event processing with scheduled cron jobs

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to configure:

- `PORT` - Application port (default: 3000)
- `NULDS_API_URL` - External API endpoint for fetching dinosaur events

### 3. Seed the Database

Populate the database with sample data from `input.json`:

```bash
npm run seed
```

This creates:

- 4 dinosaurs (Nina, Anne, Jeff, McGroggity)
- 18 dinosaur events (feedings, location updates, additions, removals)
- SQLite database file: `dino-park.db`

### 4. Start the Application

```bash
npm run start:dev
```

The application runs on `http://localhost:3000` (or the port specified in `.env`)

## API Endpoints

### Dinosaurs

- `GET /dinosaurs` - Get all dinosaurs
  - `?active=true` - Filter only active dinosaurs
- `GET /dinosaurs/stats` - Get statistics
- `GET /dinosaurs/herbivores` - Get herbivores
- `GET /dinosaurs/carnivores` - Get carnivores
- `GET /dinosaurs/needing-food?hours=24` - Get hungry dinosaurs
- `GET /dinosaurs/species/:species` - Get by species
- `GET /dinosaurs/:id` - Get specific dinosaur
- `GET /dinosaurs/:id/events` - Get dinosaur's events

### Events

- `GET /events` - Get all events
- `GET /events/recent?limit=10` - Get recent events
- `GET /events/kind/:kind` - Get events by type

## Example API Calls

```bash
# Get all active dinosaurs
curl http://localhost:3000/dinosaurs?active=true

# Get statistics
curl http://localhost:3000/dinosaurs/stats

# Get dinosaurs needing food (not fed in 48 hours)
curl http://localhost:3000/dinosaurs/needing-food?hours=48

# Get recent events
curl http://localhost:3000/events/recent?limit=5

# Get all feeding events
curl http://localhost:3000/events/kind/dino_fed

# Get specific dinosaur details
curl http://localhost:3000/dinosaurs/1032
```

## Database Schema

### Dinosaurs Table

- Tracks each dinosaur's details, location, and feeding status
- Soft-delete support (marks as inactive instead of deleting)

### Dino Events Table

- Records all dinosaur-related events
- Stores event metadata in JSON format
- Links to dinosaur records via foreign key

## Project Structure

```
src/
├── modules/
│   └── nulds/
│       ├── controllers/        # REST API endpoints
│       │   ├── dinosaur.controller.ts
│       ├── entities/           # Database models
│       │   ├── dinosaur.entity.ts
│       │   └── dino-event.entity.ts
│       ├── interfaces/         # TypeScript interfaces
│       ├── services/          # Business logic
│       │   ├── dino-event.service.ts    # Event handlers
│       │   └── dino.repository.ts       # Database queries
│       ├── nulds.module.ts
│       └── nulds.service.ts   # Scheduled tasks
├── app.module.ts              # Main application module
├── main.ts                    # Application entry point
└── seed.ts                    # Database seeding script
```

## Viewing the Database

### Option 1: Interactive Script (Recommended)

```bash
./view-db.sh
```

This opens an interactive menu where you can:

- View all tables
- View all dinosaurs
- View active dinosaurs only
- View recent events
- View locations with maintenance data
- Run custom SQL queries
- Open SQLite interactive shell

### Option 2: Command Line Queries

```bash
# View all tables
sqlite3 dino-park.db ".tables"

# View all dinosaurs (formatted)
sqlite3 -header -column dino-park.db "SELECT * FROM dinosaurs;"

# View all locations with maintenance
sqlite3 -header -column dino-park.db "SELECT * FROM locations ORDER BY maintenance_performed DESC;"

# View recent events
sqlite3 -header -column dino-park.db "SELECT * FROM dino_events ORDER BY time DESC LIMIT 10;"

# Interactive shell
sqlite3 dino-park.db
```

### Option 3: GUI Tools

Install a SQLite viewer:

- **DB Browser for SQLite** (Free): https://sqlitebrowser.org/
- **TablePlus** (Freemium): https://tableplus.com/
- **VS Code Extension**: Search for "SQLite" in VS Code extensions

## Technologies

- **NestJS** - Progressive Node.js framework
- **TypeORM** - Object-relational mapping
- **SQLite** - Embedded database (easily switchable to PostgreSQL/MySQL)
- **TypeScript** - Type-safe development

## Docker (full stack)

From the **repository root** (parent of `gamesys` and `nuldsService`), run Redis, nuldsService, and gamesys together:

```bash
docker compose up --build
```

- **gamesys API:** http://localhost:3000
- **nuldsService:** port 3001
- **Redis:** localhost:6379

Both apps share the same SQLite database.

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm run start:prod
```

### Linting

```bash
npm run lint
```

## Documentation

See `DATABASE.md` for detailed database documentation, including:

- Schema details
- Query methods
- Switching to PostgreSQL/MySQL
- Advanced usage examples
- remove sub repository
