# Deploying Speech Partner Backend to AWS EC2

This guide walks you through deploying the `backend` Docker container to an **AWS EC2 Virtual Machine**.

---

## 📋 Architecture Overview

- **Host**: AWS EC2 instance (Ubuntu 22.04/24.04 LTS or Amazon Linux 2023)
- **Container Runtime**: Docker & Docker Compose
- **Application**: FastAPI (Python 3.12) with CPU-optimized PyTorch, Silero VAD, and Wav2Vec2
- **Port**: `8000` (Direct) or `80`/`443` (with Caddy SSL reverse proxy)

---

## ⚙️ Step 1: Recommended EC2 Instance Type & RAM

Speech processing involves audio decoding (ffmpeg), Silero VAD, and a quantized `wav2vec2` filler detection head.

| Instance Type | vCPU | RAM | Recommendation | Notes |
|---|---|---|---|---|
| **t3.small** | 2 | **2 GB** | **Recommended (Budget)** | Great balance of cost (~$15/mo) and stability for single-worker ML inference. |
| **t3.medium** | 2 | **4 GB** | **Recommended (Production)** | Smooth inference with ample headroom for simultaneous audio analysis requests. |
| **t2.micro / t3.micro** | 1 / 2 | **1 GB** | Works **only with Swap** | Free-tier eligible. **Must enable 2GB swap space** (see Step 4) to prevent PyTorch Out-Of-Memory (OOM) kills. |

---

## 🔒 Step 2: Configure EC2 Security Group Inbound Rules

In the AWS EC2 Console, navigate to **Instances** → Select your VM → **Security** tab → Click the **Security Group** link → **Edit inbound rules**.

Add the following rules:

| Type | Port Range | Source | Purpose |
|---|---|---|---|
| **SSH** | `22` | `My IP` | Secure SSH terminal access |
| **Custom TCP** | `8000` | `0.0.0.0/0` | Direct backend API access (HTTP) |
| **HTTP** *(Optional)* | `80` | `0.0.0.0/0` | For Caddy / Nginx reverse proxy & ACME challenge |
| **HTTPS** *(Optional)* | `443` | `0.0.0.0/0` | For Caddy / Nginx automated SSL |

> [!TIP]
> If your frontend is hosted on HTTPS (e.g. Vercel), browsers will block plain HTTP calls (`http://<ip>:8000`) due to **Mixed Content**. See [Step 7](#-step-7-solving-https--browser-mixed-content) for the 2-minute SSL fix.

---

## 💻 Step 3: Install Docker on your EC2 VM

SSH into your EC2 instance:
```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### On Ubuntu (22.04 / 24.04 LTS):
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 curl
# Allow your user to run Docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

### On Amazon Linux 2023:
```bash
sudo dnf install -y docker
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker
# Install Docker compose plugin
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Verify Docker works:
```bash
docker --version
docker compose version
```

---

## 🧠 Step 4: Configure Swap Space (Crucial for 1GB - 2GB RAM Instances)

If your EC2 VM has 1GB or 2GB of RAM (e.g. `t2.micro`, `t3.micro`, or `t3.small`), adding a **2GB swap file** prevents the Linux kernel from killing PyTorch when loading model weights into memory:

```bash
# Check if swap is already active
swapon --show

# If empty, create and activate a 2GB swap file:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent across reboots:
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

> [!NOTE]
> The automated script [`deploy-ec2.sh`](./deploy-ec2.sh) will automatically detect low RAM and set this up for you if not already present.

---

## 📦 Step 5: Transfer Backend Files to EC2

### Option A: Clone repository on EC2
```bash
git clone https://github.com/<your-username>/speechPartner.git
cd speechPartner/backend
```

### Option B: Copy only the `backend` folder via SCP from your local machine
From your local computer:
```bash
scp -i your-key.pem -r /path/to/speechPartner/backend ubuntu@<EC2_PUBLIC_IP>:~/backend
```
Then SSH in and enter the folder:
```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
cd ~/backend
```

---

## 🔑 Step 6: Configure Environment Variables

Create your production `.env` file from the example:
```bash
cp .env.example .env
nano .env
```

Fill in your actual production credentials:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-actual-service-role-key
SUPABASE_JWT_SECRET=your-actual-jwt-secret

# Groq (Whisper STT + Drills)
GROQ_API_KEY=gsk_your_actual_key

# Google Gemini (Speech Analyser)
GEMINI_API_KEY=AIza_your_actual_key

# Frontend URL for CORS (set to your Vercel or production domain)
FRONTEND_URL=https://speech-partner-sem-project.vercel.app

# Optional extra origins (or * to allow any origin)
# CORS_ORIGINS=http://localhost:5173

# Container Port (default 8000)
PORT=8000
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 🚀 Step 7: Launch the Backend Container

### Method 1: Using the Automated Helper Script (Recommended)
We provide [`deploy-ec2.sh`](./deploy-ec2.sh) to handle validation, swap check, building, and health check verification:
```bash
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

### Method 2: Using Docker Compose directly
```bash
# Build image and run in detached mode
docker compose up -d --build

# View container logs
docker compose logs -f backend
```

---

## 🩺 Step 8: Verify the Deployment

1. **Local test on the VM**:
   ```bash
   curl http://localhost:8000/health
   # Expected response: {"status":"healthy","service":"Grammar Partner API","version":"2.0.0"}
   ```

2. **Public test from your computer / browser**:
   ```bash
   curl http://<EC2_PUBLIC_IP>:8000/health
   ```
   Open `http://<EC2_PUBLIC_IP>:8000/docs` in your browser to view the interactive OpenAPI/Swagger documentation.

---

## 🔒 Step 9: Solving HTTPS & Browser "Mixed Content" (If Frontend is on Vercel)

If your frontend is hosted on **HTTPS** (e.g. `https://speech-partner-sem-project.vercel.app`), modern browsers **block** requests to plain `http://<EC2_PUBLIC_IP>:8000` with the error:
> `Mixed Content: The page was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint...`

Here are the 3 simplest ways to resolve this:

### Solution A: Automatic Free SSL with Caddy (Built into Docker Compose!)
If you have a domain or subdomain (e.g. `api.yourdomain.com`):
1. In your DNS provider (GoDaddy, Namecheap, Route 53, Cloudflare), add an **A Record**:
   - Host: `api` (or `@`)
   - Value: `<EC2_PUBLIC_IP>`
2. Edit `Caddyfile` in the backend folder:
   ```bash
   nano Caddyfile
   ```
   Replace `api.yourdomain.com` with your domain.
3. Make sure Security Group has ports **80** and **443** open.
4. Launch with SSL profile:
   ```bash
   docker compose --profile ssl up -d
   ```
   Caddy will automatically fetch and manage a free Let's Encrypt certificate!
5. Your API is now available securely at `https://api.yourdomain.com`!

### Solution B: Free Cloudflare Tunnel (No domain configuration on EC2 needed)
1. In Cloudflare Zero Trust (free): Create a Tunnel pointing to `http://localhost:8000`.
2. Run the `cloudflared` container or binary on your EC2.
3. You get `https://api.yourdomain.com` pointing directly to your EC2 backend with SSL managed by Cloudflare.

### Solution C: AWS Application Load Balancer (ALB)
1. Create an ALB with an HTTPS listener (port 443) using an AWS Certificate Manager (ACM) SSL certificate.
2. Target Group targets the EC2 instance on port 8000.

---

## 🔗 Step 10: Connect Frontend to Backend

In your frontend hosting platform (e.g., Vercel):
1. Set the environment variable:
   ```env
   VITE_API_BASE_URL=https://api.yourdomain.com
   # OR http://<EC2_PUBLIC_IP>:8000 (if testing without HTTPS frontend)
   ```
2. Redeploy your frontend.

---

## 🛠️ Handy Operations & Management Commands

| Action | Command |
|---|---|
| **View live logs** | `docker compose logs -f backend` |
| **Restart backend** | `docker compose restart backend` |
| **Stop backend** | `docker compose down` |
| **Update code & rebuild** | `git pull && docker compose up -d --build` |
| **Inspect memory usage** | `docker stats` |
| **Clean up unused Docker images** | `docker image prune -f` |
