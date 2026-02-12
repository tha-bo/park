# Running with Docker

From this directory, start Redis, nuldsService, and gamesys:

**Deploy:** [DEPLOY.md](./DEPLOY.md) (free VMs e.g. Oracle) · [DEPLOY-AWS.md](./DEPLOY-AWS.md) (AWS EC2 + Docker Compose).

```bash
docker compose up --build
```

| Service       | Port | Description                    |
|---------------|------|--------------------------------|
| **gamesys**   | 3000 | Dino park API                  |
| **nuldsService** | 3001 | Fetches Nulds feed, writes to DB + Redis |
| **Redis**     | 6379 | Dino location cache for nuldsService |

- SQLite DB is shared via the `app-data` volume (`/data/dino-park.db` inside containers).
- Optional: copy `.env.example` to `.env` in this directory and set `NULDS_API_URL`, etc.; they are passed into the app containers.
