# 🐳 Docker Quick Start

**TL;DR**: Yes, this repo is **100% dockerized**. Everything can be installed and run in Docker.

## One-Command Setup

```bash
# 1. Get npm token and build/run everything
export NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | cut -d '=' -f 2) && \
docker-compose up -d --build && \
docker-compose logs -f
```

## Step-by-Step

### 1. Get Your NPM Token

```bash
# Login to npm (if not already)
npm login

# Export your token
export NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | cut -d '=' -f 2)
```

### 2. Configure Environment

```bash
# Copy and edit .env
cp .env.example .env
# Edit .env with your values
```

### 3. Build & Run

```bash
# Using Docker Compose (recommended)
docker-compose up -d --build

# Or using plain Docker
docker build --build-arg NPM_TOKEN=$NPM_TOKEN -t prompt-mining-api .
docker run -d -p 3000:3000 --env-file .env --name prompt-mining-api prompt-mining-api
```

### 4. Verify

```bash
# Check health
curl http://localhost:3000/health

# View logs
docker-compose logs -f
```

## What's Included?

- ✅ Multi-stage Docker build (optimized image size)
- ✅ Private npm package support (@project_zero/prompt-mining-sdk)
- ✅ Docker Compose configuration
- ✅ Health checks
- ✅ Non-root user (security)
- ✅ Production-ready setup

## Full Documentation

See [docs/DOCKER.md](docs/DOCKER.md) for complete deployment guide.

## Common Commands

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Rebuild after changes
docker-compose up -d --build
```

## Troubleshooting

**Build fails with npm 404?**
→ Set your NPM_TOKEN: `export NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | cut -d '=' -f 2)`

**Container exits immediately?**
→ Check logs: `docker-compose logs` and verify your `.env` file

**Health check failing?**
→ Verify all required environment variables are set in `.env`

---

**Need help?** See [docs/DOCKER.md](docs/DOCKER.md) for detailed troubleshooting.
