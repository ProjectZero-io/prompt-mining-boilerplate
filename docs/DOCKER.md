# Docker Deployment Guide

This guide covers deploying the Prompt Mining Boilerplate using Docker, including handling private npm packages.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Private NPM Package Authentication](#private-npm-package-authentication)
- [Building the Docker Image](#building-the-docker-image)
- [Running with Docker](#running-with-docker)
- [Running with Docker Compose](#running-with-docker-compose)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Overview

This repository is **100% Dockerized** and production-ready. The Docker setup includes:

- ✅ Multi-stage build for optimized image size
- ✅ Private npm package support (@project_zero/prompt-mining-sdk)
- ✅ Non-root user for security
- ✅ Health checks built-in
- ✅ Production-optimized Node.js runtime
- ✅ Docker Compose for easy deployment

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+ (optional, for docker-compose usage)
- NPM authentication token (for private @project_zero/prompt-mining-sdk package)
- `.env` file with all required environment variables (see `.env.example`)

## Private NPM Package Authentication

This project uses the private npm package `@project_zero/prompt-mining-sdk`. To build the Docker image, you need an npm authentication token.

### Getting Your NPM Token

1. **Login to npm** (if not already logged in):
   ```bash
   npm login
   ```

2. **Get your npm token**:
   ```bash
   # View your npm token
   cat ~/.npmrc | grep "_authToken"
   
   # Or extract just the token
   cat ~/.npmrc | grep "_authToken" | cut -d '=' -f 2
   ```

3. **Set the token as an environment variable**:
   ```bash
   export NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | cut -d '=' -f 2)
   ```

### Alternative: Create a dedicated npm token

For CI/CD or team deployments, create a dedicated token:

```bash
npm token create --read-only
```

Save this token securely and use it for Docker builds.

## Building the Docker Image

### Option 1: Build with NPM Token (Recommended)

Pass your npm token as a build argument:

```bash
# Set your NPM token
export NPM_TOKEN=npm_yourtokenhere

# Build the image
docker build \
  --build-arg NPM_TOKEN=$NPM_TOKEN \
  -t prompt-mining-api:latest \
  .
```

### Option 2: Build without token (will fail for private packages)

If you don't have access to the private package, the build will fail:

```bash
docker build -t prompt-mining-api:latest .
# ❌ Error: Unable to authenticate with npm registry
```

### Verify the Build

Check that the image was created:

```bash
docker images | grep prompt-mining-api
```

Expected output:
```
prompt-mining-api   latest    abc123def456   2 minutes ago   150MB
```

## Running with Docker

### Run Container with Environment File

```bash
docker run -d \
  --name prompt-mining-api \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  prompt-mining-api:latest
```

### Run Container with Individual Environment Variables

```bash
docker run -d \
  --name prompt-mining-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e RPC_URL=https://rpc.nexera.network \
  -e CHAIN_ID=7208 \
  -e PZERO_API_KEY=pzero_live_xxxxx \
  -e PZERO_CLIENT_ID=your-client-id \
  -e PZERO_API_URL=https://api.pzero.io/v1 \
  -e PRIVATE_KEY=0xYourPrivateKey \
  -e PROMPT_MINER_ADDRESS=0x... \
  -e ACTIVITY_POINTS_ADDRESS=0x... \
  -e PROMPT_DO_ADDRESS=0x... \
  -e DATA_INDEX_ADDRESS=0x... \
  --restart unless-stopped \
  prompt-mining-api:latest
```

### View Container Logs

```bash
# Follow logs in real-time
docker logs -f prompt-mining-api

# View last 100 lines
docker logs --tail 100 prompt-mining-api
```

### Stop and Remove Container

```bash
# Stop container
docker stop prompt-mining-api

# Remove container
docker rm prompt-mining-api

# Stop and remove in one command
docker rm -f prompt-mining-api
```

## Running with Docker Compose

Docker Compose simplifies multi-container deployments and configuration management.

### Setup

1. **Set your NPM token** in the environment:
   ```bash
   export NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | cut -d '=' -f 2)
   ```

2. **Create or verify `.env` file** with all required variables (see `.env.example`)

### Start Services

```bash
# Build and start in detached mode
docker-compose up -d --build

# Or without building (if image already exists)
docker-compose up -d
```

### View Logs

```bash
# Follow all service logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f app
```

### Stop Services

```bash
# Stop containers (keeps containers for restart)
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop, remove containers, and remove volumes
docker-compose down -v
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose up -d --build
```

## Production Deployment

### Important: Development vs Production Configuration

**⚠️ WARNING:** The current `docker-compose.yml` is configured for **LOCAL DEVELOPMENT ONLY**. It connects to a local PZERO Gateway container.

**For production, you MUST:**

1. **Use the real PZERO Gateway** at `https://gateway.pzero.io/v1`
2. **Remove the development network** from docker-compose.yml
3. **Use production environment variables**

### 1. Environment Configuration

**For Production Deployment:**

Create a production `.env.production` file (or use `.env.production.example` as template):

```env
# Production Environment
NODE_ENV=production
PORT=3000

# Blockchain (Mainnet)
RPC_URL=https://rpc.nexera.network
CHAIN_ID=7208

# PZERO Production - USE REAL GATEWAY
PZERO_API_URL=https://gateway.pzero.io/v1
PZERO_API_KEY=pzero_prod_xxxxxxxxxxxxx
PZERO_CLIENT_ID=your-production-company-id
PZERO_AUTH_TIMEOUT_MS=10000
PZERO_RETRY_ATTEMPTS=5

# Smart Contracts (Production)
PROMPT_MINER_ADDRESS=0x...
ACTIVITY_POINTS_ADDRESS=0x...
PROMPT_DO_ADDRESS=0x...
DATA_INDEX_ADDRESS=0x...

# Wallet (Use secure key management!)
PRIVATE_KEY=0xYourProductionPrivateKey

# Security
API_KEYS=prod-key-1,prod-key-2
REQUIRE_AUTH=true
REQUIRE_AUTH_MINT=true
```

### 2. Use Production Docker Compose

For production, use `docker-compose.prod.yml` which removes development-specific networks:

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d --build
```

Or manually edit `docker-compose.yml` to remove:
```yaml
# REMOVE THIS FOR PRODUCTION:
networks:
  - prompt-mining-api-gateway_pzero-network  # ❌ Development only!
```

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 2. Build for Production

```bash
export NPM_TOKEN=npm_yourtokenhere

docker build \
  --build-arg NPM_TOKEN=$NPM_TOKEN \
  -t prompt-mining-api:v1.0.0 \
  -t prompt-mining-api:latest \
  .
```

### 3. Run Production Container

```bash
docker run -d \
  --name prompt-mining-api-prod \
  -p 3000:3000 \
  --env-file .env.production \
  --restart always \
  --health-cmd "node -e \"require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" \
  --health-interval 30s \
  --health-timeout 3s \
  --health-retries 3 \
  prompt-mining-api:v1.0.0
```

### 4. Verify Deployment

```bash
# Check container health
docker ps

# Test health endpoint
curl http://localhost:3000/health

# Check logs
docker logs prompt-mining-api-prod
```

### 5. Production Best Practices

- ✅ Use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.) instead of `.env` files
- ✅ Use a reverse proxy (nginx, Traefik) for SSL/TLS termination
- ✅ Set up monitoring (Prometheus, Grafana, Datadog)
- ✅ Configure log aggregation (ELK, CloudWatch, etc.)
- ✅ Use container orchestration (Kubernetes, Docker Swarm, ECS)
- ✅ Implement automated backups for private keys (encrypted)
- ✅ Set up CI/CD pipelines for automated deployments
- ✅ Use multi-stage builds to minimize image size
- ✅ Scan images for vulnerabilities (`docker scan`)
- ✅ Run containers as non-root user (already configured)

## Troubleshooting

### Build Fails: "npm ERR! 404 Not Found - GET https://registry.npmjs.org/@project_zero/prompt-mining-sdk"

**Cause**: Missing or invalid NPM token for private package.

**Solution**:
```bash
# Ensure you're logged in to npm
npm login

# Get your token
export NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | cut -d '=' -f 2)

# Rebuild with token
docker build --build-arg NPM_TOKEN=$NPM_TOKEN -t prompt-mining-api .
```

### Build Fails: "npm ERR! npm ci can only install with an existing package-lock.json"

**Cause**: Missing package-lock.json (excluded by .dockerignore).

**Solution**: Remove `package-lock.json` from `.dockerignore`:

```bash
# Edit .dockerignore and comment out or remove:
# package-lock.json
```

### Container Exits Immediately

**Cause**: Missing or invalid environment variables.

**Solution**:
```bash
# Check container logs
docker logs prompt-mining-api

# Verify .env file exists and has all required variables
cat .env

# Run configuration test locally first
npm run test:config
```

### Health Check Failing

**Cause**: Application not responding on port 3000.

**Solution**:
```bash
# Check logs for errors
docker logs prompt-mining-api

# Test health endpoint manually
docker exec prompt-mining-api wget -qO- http://localhost:3000/health

# Verify PORT environment variable
docker exec prompt-mining-api env | grep PORT
```

### Cannot Connect to Blockchain RPC

**Cause**: Network connectivity or invalid RPC_URL.

**Solution**:
```bash
# Test RPC from inside container
docker exec prompt-mining-api wget -qO- $RPC_URL

# Verify RPC_URL environment variable
docker exec prompt-mining-api env | grep RPC_URL
```

### Permission Denied Errors

**Cause**: Running as non-root user without proper permissions.

**Solution**: The Dockerfile already creates a non-root user. If you're mounting volumes, ensure proper permissions:

```bash
# Create directory with correct permissions
mkdir -p ./data
chown -R 1001:1001 ./data

# Run with volume mount
docker run -v ./data:/app/data ...
```

---

## Summary: Is This Repo 100% Dockerized?

✅ **YES** - This repository is 100% dockerized and production-ready:

| Feature | Status | Notes |
|---------|--------|-------|
| Dockerfile | ✅ Complete | Multi-stage build, optimized |
| Docker Compose | ✅ Complete | Ready for deployment |
| Private npm packages | ✅ Supported | Requires NPM_TOKEN build arg |
| Health checks | ✅ Built-in | Automatic container health monitoring |
| Security | ✅ Non-root user | Runs as user `nodejs` (UID 1001) |
| Environment config | ✅ .env support | All configs via environment variables |
| Production ready | ✅ Yes | Optimized, secure, monitored |
| Documentation | ✅ Complete | This guide + README.md |

### Quick Start Commands

```bash
# 1. Get your npm token
export NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | cut -d '=' -f 2)

# 2. Build
docker-compose build

# 3. Run
docker-compose up -d

# 4. Check logs
docker-compose logs -f

# 5. Verify
curl http://localhost:3000/health
```

**Everything can be installed and run in Docker!** 🐳
