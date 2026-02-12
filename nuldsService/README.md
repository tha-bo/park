# nuldsService

Fetches park events from the Nulds API and writes dino data to shared storage (SQLite). Runs a cron job every minute.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set NULDS_API_URL and optionally DATABASE_PATH
```

## Run

- **Development:** `npm run start:dev`
- **Production:** `npm run start:prod`

Default port is **3001** (gamesys API uses 3000).

## Shared database

Use the same `DATABASE_PATH` as **gamesys** so both apps share one SQLite file (e.g. `dino-park.db`). nuldsService writes; gamesys serves reads.

## Seed from JSON

From repo root (where `input.json` lives):

```bash
cd nuldsService && npm run seed
```

## Relation to gamesys

- **gamesys** – API that serves dino data (controllers, read-only).
- **nuldsService** – Fetches events and writes to storage (cron + event processing).

Run both when you need live ingestion and API: start nuldsService for writes, gamesys for HTTP endpoints.

## Docker (full stack)

From the **repository root** (parent of `nuldsService` and `gamesys`), run Redis, nuldsService, and gamesys together:

```bash
docker compose up --build
```

- **gamesys API:** http://localhost:3000  
- **nuldsService:** port 3001 (cron + ingestion)  
- **Redis:** localhost:6379  

Both apps share the same SQLite DB and Redis (nuldsService uses Redis for dino locations).

## API specs

- **OpenAPI (Swagger):** UI at [http://localhost:3001/api](http://localhost:3001/api), JSON at `GET /api-json`, YAML at `GET /api-yaml`.
- **JSON:API:** Spec document at `GET /spec/json-api` (conforms to [JSON:API 1.1](https://jsonapi.org/format/)).
