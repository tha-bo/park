# Deploy to AWS

This guide deploys the full stack (Redis + nuldsService + gamesys) on **AWS** using **EC2** and **Docker Compose**. You can use the **AWS Free Tier** (t2.micro or t3.micro for 12 months).

---

## Option 1: EC2 + Docker Compose (recommended)

### 1. Prerequisites

- AWS account ([create one](https://aws.amazon.com/free/))
- SSH key pair (create in EC2 or use an existing one)

### 2. Launch an EC2 instance

1. In the AWS Console go to **EC2** → **Instances** → **Launch instance**.

2. **Name**: e.g. `nuxt-dino-park`

3. **AMI**: **Ubuntu Server 22.04 LTS**

4. **Instance type**: **t2.micro** or **t3.micro** (Free tier eligible)

5. **Key pair**: Create a new key pair or select existing. Download the `.pem` file and keep it safe. **Before SSH**, fix permissions (required or you’ll get “Load key: Operation not permitted”):
   ```bash
   chmod 400 your-key.pem
   ```
   If the key is in a restricted folder (e.g. Downloads, iCloud), move it to `~/.ssh/` and use: `ssh -i ~/.ssh/your-key.pem ...`

6. **Network settings** → **Create security group** (or edit existing):
   - **SSH**: Type SSH, Port 22, Source **My IP** (or `0.0.0.0/0` for any IP; less secure).
   - **gamesys**: Custom TCP, Port **3000**, Source `0.0.0.0/0`.
   - **nulds-service**: Custom TCP, Port **3001**, Source `0.0.0.0/0`.

7. **Storage**: 8–20 GB is enough for the app and Docker images.

8. **Launch instance**. Note the **Public IPv4 address** (or use an **Elastic IP** so it doesn’t change after reboot).

### 3. Connect and install Docker

From your machine. **Username depends on AMI**: use `ubuntu` for **Ubuntu**, or `ec2-user` for **Amazon Linux**:

```bash
# Ubuntu AMI
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Amazon Linux AMI
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

On the EC2 instance:

```bash
# Update and install Docker
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
exit
```

Log in again so the `docker` group is applied (use `ec2-user` if you’re on Amazon Linux).

**Troubleshooting SSH:** If you see `Load key "xxx.pem": Operation not permitted`, run `chmod 400 xxx.pem` and try again. If it still fails, move the key to `~/.ssh/` and use that path with `-i`. Avoid keeping the key on iCloud Drive or external drives.

### 4. Deploy the stack

On the EC2 instance:

```bash
# Clone your repo (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/nuxt.git
cd nuxt

# Optional: set env vars
cp nuldsService/.env.example .env
# Edit if needed: nano .env

# Build and run in background
docker compose up -d --build

# Verify
docker compose ps
```

- **gamesys**: `http://YOUR_EC2_PUBLIC_IP:3000`
- **nulds-service**: `http://YOUR_EC2_PUBLIC_IP:3001`

### 5. Optional: Elastic IP and start on boot

**Elastic IP** (so the public IP doesn’t change when the instance stops/restarts):

1. EC2 → **Elastic IPs** → **Allocate Elastic IP address** → **Allocate**.
2. Select the new IP → **Actions** → **Associate Elastic IP address** → choose your instance.

**Start stack on reboot** (optional):

```bash
sudo systemctl enable docker
# Simple option: cron
(crontab -l 2>/dev/null; echo "@reboot cd /home/ubuntu/nuxt && docker compose up -d") | crontab -
# Adjust path if you cloned elsewhere
```

---

## Option 2: AWS Copilot (CLI)

Use the Copilot CLI to run the stack on **ECS Fargate** with a load balancer, service discovery, and no EC2 to manage. You get one **Backend** service (Redis) and two **Load Balanced Web** services (nulds-service, gamesys).

### 1. Install Copilot CLI

```bash
# macOS (Homebrew)
brew install aws/tap/copilot-cli

# Or download the latest release from:
# https://github.com/aws/copilot-cli/releases
```

Ensure [AWS CLI](https://aws.amazon.com/cli/) is configured (`aws configure`).

### 2. Create the app and environment

From your **project root** (where `docker-compose.yml` lives):

```bash
# Create the Copilot application (once)
copilot app init dino-park

# Create an environment (e.g. dev); this creates the VPC and ECS cluster
copilot env init --name dev --profile default
copilot env deploy --name dev
```

### 3. Add Redis as a Backend Service

```bash
copilot svc init --name redis --svc-type "Backend Service" --image redis:7-alpine --port 6379
```

Edit `copilot/redis/manifest.yml` and add a healthcheck and Service Connect so other services can reach Redis at `redis:6379`:

```yaml
# In copilot/redis/manifest.yml, ensure you have:
name: redis
type: Backend Service
image:
  location: redis:7-alpine
  healthcheck:
    command: ["CMD-SHELL", "redis-cli ping || exit 1"]
    interval: 10s
    retries: 2
    timeout: 5s
network:
  connect: true
```

(If `svc init` wrote `image: redis:7-alpine`, replace it with the `image:` map above.)

Deploy Redis first:

```bash
copilot svc deploy --name redis
```

### 4. Add nulds-service and gamesys

```bash
# Nulds service (feed processor)
copilot svc init --name nulds-service --svc-type "Load Balanced Web Service" --dockerfile ./nuldsService/Dockerfile --port 3001

# Gamesys (API)
copilot svc init --name gamesys --svc-type "Load Balanced Web Service" --dockerfile ./gamesys/Dockerfile --port 3000
```

Set Redis URL and DB path via environment variables. Edit **`copilot/nulds-service/manifest.yml`** and **`copilot/gamesys/manifest.yml`** and add under the top-level `variables` (or ensure they exist):

**copilot/nulds-service/manifest.yml:**

```yaml
variables:
  REDIS_URL: redis://redis:6379
  DATABASE_PATH: /data/dino-park.db
  NULDS_API_URL: https://dinoparks.herokuapp.com/nudls/feed
  PORT: "3001"
```

**copilot/gamesys/manifest.yml:**

```yaml
variables:
  REDIS_URL: redis://redis:6379
  DATABASE_PATH: /data/dino-park.db
  PORT: "3000"
```

Enable Service Connect for both so they can resolve `redis`:

```yaml
network:
  connect: true
```

Deploy both services:

```bash
copilot svc deploy --name nulds-service
copilot svc deploy --name gamesys
```

### 5. Get the URLs

```bash
copilot svc show --name gamesys
copilot svc show --name nulds-service
```

Use the **Load Balanced Web Service** URLs (e.g. `https://xxxx.us-east-1.elb.amazonaws.com`) for gamesys and nulds-service. Redis is internal only (no public URL).

### 6. Shared SQLite and Redis data (optional)

- **SQLite**: In Fargate, each task has its own filesystem. To share one SQLite file between nulds-service and gamesys, add an **EFS** volume and mount it at `/data` in both services (see [Copilot storage](https://aws.github.io/copilot-cli/docs/developing/storage/) and the `storage.volumes` / EFS `id` in the manifest). Without EFS, each service has its own DB.
- **Redis**: Data is in the Redis Backend service task; it is ephemeral unless you add persistence (e.g. Redis AOF) or switch to **Amazon ElastiCache** for production.

### 7. Useful Copilot commands

| Command | Description |
|--------|-------------|
| `copilot svc deploy --name <svc>` | Deploy one service |
| `copilot svc logs -n <svc> -e dev` | Tail logs |
| `copilot svc status` | List services and status |
| `copilot app show` | App and env overview |

### Summary (Option 2)

- **Redis**: Backend Service, discoverable as `redis:6379` (Service Connect).
- **nulds-service / gamesys**: Load Balanced Web Services with public URLs; set `REDIS_URL=redis://redis:6379` and enable `network.connect: true`.
- For a single shared SQLite DB, add EFS and mount it in both app services.

---

## Option 3: ECS with Fargate

For a fully managed container setup without managing EC2:

- Push your images to **Amazon ECR**.
- Create an **ECS cluster**, **task definitions** for nulds-service and gamesys, and a **service** for each.
- Use **Amazon ElastiCache** for Redis instead of a Redis container.
- Put an **Application Load Balancer** in front of the services.

This is the most “AWS native” but requires converting your `docker-compose.yml` into ECS task definitions and networking. Suitable once you need scaling and managed Redis.

---

## Quick reference (EC2 + Docker Compose)

| Item        | Value |
|------------|--------|
| **gamesys** | `http://EC2_IP:3000` |
| **nulds-service** | `http://EC2_IP:3001` |
| **Logs** | `docker compose logs -f` |
| **Stop** | `docker compose down` |
| **Restart** | `docker compose up -d --build` |

Data persists in Docker volumes (`app-data`, `redis-data`) on the EC2 instance. For production, consider **EBS backups** or moving the DB to RDS and Redis to ElastiCache.
