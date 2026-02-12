# Deploy Docker stack to a free virtual server

This guide deploys the full stack (Redis + nuldsService + gamesys) using **Docker Compose** on a free VM.

## Best free option: Oracle Cloud Free Tier

Oracle offers **always-free** VMs (no time limit):

- **2 AMD instances** (1/8 OCPU, 1 GB RAM each) or **4 ARM instances** (4 OCPU, 24 GB RAM total)
- 200 GB block storage
- No credit card charges if you stay within free tier

### 1. Create an Oracle Cloud account and VM

1. Sign up: [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Create a VM instance:
   - **Image**: Ubuntu 22.04
   - **Shape**: Ampere (ARM) or AMD – pick one of the always-free shapes
   - **SSH keys**: Generate or upload your public key so you can `ssh` in
3. In the VM’s **Subnet** → **Security List**, add **Ingress** rules so your apps are reachable:
   - Source `0.0.0.0/0`, TCP **22** (SSH)
   - Source `0.0.0.0/0`, TCP **3000** (gamesys)
   - Source `0.0.0.0/0`, TCP **3001** (nulds-service)

### 2. Install Docker on the VM

SSH into the VM, then:

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
sudo usermod -aG docker $USER
# Log out and back in (or new SSH session) so docker runs without sudo
```

### 3. Deploy your stack

On the VM (after logging back in):

```bash
# Clone your repo (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/nuxt.git
cd nuxt

# Optional: set env vars (e.g. NULDS_API_URL)
cp nuldsService/.env.example .env
# Edit .env if needed: nano .env

# Run the full stack in the background
docker compose up -d --build

# Check that containers are up
docker compose ps
```

- **gamesys**: `http://YOUR_VM_PUBLIC_IP:3000`
- **nulds-service**: `http://YOUR_VM_PUBLIC_IP:3001`

### 4. Optional: run on reboot

```bash
sudo systemctl enable docker
# Docker Compose (with -d) will not auto-start after reboot by default.
# To start on boot, add a systemd service or use:
# echo "@reboot cd /home/ubuntu/nuxt && docker compose up -d" | crontab -e
# (adjust path and user as needed)
```

---

## Other free options

| Provider        | What you get                    | Notes                                      |
|----------------|----------------------------------|--------------------------------------------|
| **Google Cloud** | 1 e2-micro VM (free tier)       | Limited to certain regions; check quotas   |
| **Fly.io**     | Small VMs, free allowance        | Good for single-service or multi-region    |
| **Render**     | Free web services                | Docker supported; one service per app      |
| **Railway**    | Free tier with monthly limit     | Docker supported; simple deploy from Git   |

For **Oracle**, use the steps above. For **GCP**, create an e2-micro VM, install Docker the same way, then run the same `docker compose up -d --build` from your project directory.

---

## Quick reference

- **Stack**: Redis (6379), nuldsService (3001), gamesys (3000).
- **Data**: SQLite and Redis data persist in Docker volumes (`app-data`, `redis-data`).
- **Logs**: `docker compose logs -f`
- **Stop**: `docker compose down`
- **Restart**: `docker compose up -d --build`
