#!/usr/bin/env bash
# ==============================================================================
# Speech Partner Backend — AWS EC2 One-Click Deployment Script
# ==============================================================================
# Usage:
#   chmod +x deploy-ec2.sh
#   ./deploy-ec2.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  🎙️  Speech Partner Backend — AWS EC2 Deployment    ${NC}"
echo -e "${BLUE}======================================================${NC}\n"

# 1. Check Docker Installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not installed.${NC}"
    echo -e "Install Docker on Ubuntu with:"
    echo -e "  sudo apt update && sudo apt install -y docker.io docker-compose-v2"
    echo -e "  sudo usermod -aG docker \$USER && newgrp docker"
    echo -e "\nOr on Amazon Linux 2023 with:"
    echo -e "  sudo dnf install -y docker"
    echo -e "  sudo systemctl start docker && sudo systemctl enable docker"
    echo -e "  sudo usermod -aG docker \$USER && newgrp docker"
    exit 1
fi

# 2. Check Docker Compose
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[ERROR] Docker Compose plugin is not installed.${NC}"
    echo -e "Install Docker Compose plugin with:"
    echo -e "  sudo apt install -y docker-compose-v2"
    exit 1
fi
echo -e "${GREEN}[✓] Docker and Docker Compose detected.${NC}"

# 3. Check Memory & Configure Swap if Needed
# PyTorch + Transformers can require ~1.2-1.8GB during model initialization.
# On t2.micro or t3.micro (1GB RAM) or t3.small (2GB RAM), swap prevents OOM kills.
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "0")
SWAP_TOTAL_KB=$(grep SwapTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "0")

if [ "$TOTAL_MEM_KB" -gt 0 ] && [ "$TOTAL_MEM_KB" -lt 2500000 ] && [ "$SWAP_TOTAL_KB" -lt 1000000 ]; then
    echo -e "${YELLOW}[!] Low RAM detected ($((TOTAL_MEM_KB / 1024)) MB) with little or no Swap space ($((SWAP_TOTAL_KB / 1024)) MB).${NC}"
    echo -e "${YELLOW}    Creating a 2GB swap file to prevent PyTorch ML Out-Of-Memory crashes...${NC}"
    if [ "$EUID" -ne 0 ]; then
        if sudo -n true 2>/dev/null || command -v sudo &>/dev/null; then
            sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
            sudo chmod 600 /swapfile
            sudo mkswap /swapfile
            sudo swapon /swapfile
            if ! grep -q '/swapfile' /etc/fstab; then
                echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
            fi
            echo -e "${GREEN}[✓] 2GB Swap file created and activated successfully.${NC}"
        else
            echo -e "${RED}[WARN] Cannot configure swap automatically without sudo. If you experience crashes, create swap manually.${NC}"
        fi
    fi
else
    echo -e "${GREEN}[✓] Memory check passed ($((TOTAL_MEM_KB / 1024)) MB RAM, $((SWAP_TOTAL_KB / 1024)) MB Swap).${NC}"
fi

# 4. Check .env File
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}[!] No .env file found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo -e "${RED}[ACTION REQUIRED] Please edit .env with your actual Supabase, Groq, and Gemini keys:${NC}"
        echo -e "  nano .env"
        echo -e "Then run ./deploy-ec2.sh again.\n"
        exit 1
    else
        echo -e "${RED}[ERROR] No .env or .env.example found in current directory.${NC}"
        exit 1
    fi
fi

# Ensure critical keys are not left as placeholders
if grep -q "your-groq-api-key" .env || grep -q "your-gemini-api-key" .env || grep -q "your-service-role-key" .env; then
    echo -e "${RED}[ERROR] Detected placeholder API keys in .env!${NC}"
    echo -e "Please edit .env and replace placeholders with your actual API credentials:"
    echo -e "  nano .env"
    exit 1
fi
echo -e "${GREEN}[✓] Environment configuration (.env) verified.${NC}"

# 5. Build and Deploy Container
echo -e "\n${BLUE}[...] Building and launching Docker container...${NC}"
$DOCKER_COMPOSE_CMD up -d --build

# 6. Wait for Health Check
echo -e "${BLUE}[...] Waiting for container health check...${NC}"
MAX_WAIT=60
COUNTER=0
HEALTHY=false

while [ $COUNTER -lt $MAX_WAIT ]; do
    if curl -s -f http://localhost:8000/health &> /dev/null; then
        HEALTHY=true
        break
    fi
    sleep 2
    COUNTER=$((COUNTER + 2))
    echo -n "."
done
echo ""

if [ "$HEALTHY" = true ]; then
    echo -e "\n${GREEN}======================================================${NC}"
    echo -e "${GREEN}  ✓ Backend container is HEALTHY and listening on :8000!${NC}"
    echo -e "${GREEN}======================================================${NC}\n"

    # Attempt to discover public IP
    PUBLIC_IP=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s --connect-timeout 2 https://ifconfig.me 2>/dev/null || echo "<YOUR_EC2_PUBLIC_IP>")

    echo -e "Backend Endpoints:"
    echo -e "  - Health Check: http://${PUBLIC_IP}:8000/health"
    echo -e "  - API Docs:     http://${PUBLIC_IP}:8000/docs"
    echo -e "  - Local Test:   curl http://localhost:8000/health\n"

    echo -e "${YELLOW}Important AWS EC2 Security Group Checklist:${NC}"
    echo -e "  1. Make sure EC2 Security Group Inbound Rule allows TCP port 8000 from 0.0.0.0/0 (or your frontend domain)."
    echo -e "  2. If your frontend is on HTTPS (e.g., Vercel), remember browsers block plain HTTP API calls (Mixed Content)."
    echo -e "     See AWS_EC2_DEPLOYMENT_GUIDE.md for setting up free SSL with Caddy or Cloudflare Tunnel.\n"

    echo -e "Useful Commands:"
    echo -e "  - View live logs:     ${DOCKER_COMPOSE_CMD} logs -f backend"
    echo -e "  - Restart container:  ${DOCKER_COMPOSE_CMD} restart backend"
    echo -e "  - Stop container:     ${DOCKER_COMPOSE_CMD} down"
    echo -e "  - Rebuild container:  ${DOCKER_COMPOSE_CMD} up -d --build\n"
else
    echo -e "\n${RED}[ERROR] Container failed health check after ${MAX_WAIT} seconds.${NC}"
    echo -e "Checking recent container logs:\n"
    $DOCKER_COMPOSE_CMD logs --tail=50 backend
    exit 1
fi
