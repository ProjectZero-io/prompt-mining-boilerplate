# Deployment Guide: Development vs Production

## Current Configuration Status

Your current setup is configured for **LOCAL DEVELOPMENT** with a self-hosted PZERO Gateway.

## Configuration Comparison

| Configuration | Development (Current) | Production (Required) |
|---------------|----------------------|----------------------|
| **PZERO URL** | `http://pzero-gateway-app:3001/v1` | `https://gateway.pzero.io/v1` |
| **PZERO Network** | Docker network to local container | Internet (HTTPS) |
| **API Key** | `pzero_test_...` | `pzero_prod_...` |
| **Blockchain** | Testnet (Chain ID: 72080) | Mainnet (Chain ID: 7208) |
| **RPC URL** | `https://rpc.testnet.nexera.network` | `https://rpc.nexera.network` |
| **Auth Required** | `PM_REQUIRE_AUTH_MINT=false` | `PM_REQUIRE_AUTH_MINT=true` |
| **Rate Limits** | Relaxed (100 req/15min) | Strict (1000 req/15min) |

## Development Setup (Current)

### Docker Network Configuration

```yaml
# docker-compose.yml (DEVELOPMENT)
networks:
  - prompt-mining-network
  - prompt-mining-api-gateway_pzero-network  # LOCAL DEV ONLY!
```

### Environment Variables

```env
# .env (DEVELOPMENT)
PM_NODE_ENV=development
PM_PZERO_API_URL=http://pzero-gateway-app:3001/v1
PM_PZERO_API_KEY=pzero_test_49579c2baf5642fe2b3c2501287352c1
PM_CHAIN_ID=72080
PM_RPC_URL=https://rpc.testnet.nexera.network
PM_REQUIRE_AUTH_MINT=false
```

**Why this works locally:**
- `pzero-gateway-app` is a Docker container name on the same network
- The prompt-mining-api container can resolve this hostname via Docker DNS

**Why this WON'T work in production:**
- Production servers don't have `pzero-gateway-app` container running
- The external network `prompt-mining-api-gateway_pzero-network` doesn't exist

## Production Deployment

### Option 1: Use Official PZERO Gateway (Recommended)

**Step 1: Update `.env` for production**

```env
# Production Configuration
PM_NODE_ENV=production
PM_PORT=3000

# PZERO Production - Use official gateway
PM_PZERO_API_URL=https://gateway.pzero.io/v1
PM_PZERO_API_KEY=pzero_prod_your_real_key_here
PM_PZERO_CLIENT_ID=your-production-company-id
PM_PZERO_AUTH_TIMEOUT_MS=10000
PM_PZERO_RETRY_ATTEMPTS=5

# Blockchain Mainnet
PM_CHAIN_ID=7208
PM_RPC_URL=https://rpc.nexera.network

# Production Contract Addresses
PM_PROMPT_MINER_ADDRESS=0xProductionAddress
PM_ACTIVITY_POINTS_ADDRESS=0xProductionAddress
PM_PROMPT_DO_ADDRESS=0xProductionAddress
PM_DATA_INDEX_ADDRESS=0xProductionAddress

# Security
PM_REQUIRE_AUTH=true
PM_REQUIRE_AUTH_MINT=true
PM_API_KEYS=strong-prod-key-1,strong-prod-key-2
```

**Step 2: Use production docker-compose**

```bash
# Deploy using production config
docker-compose -f docker-compose.prod.yml up -d --build
```

Or manually edit `docker-compose.yml` to remove the development network:

```yaml
# Remove this line:
# - prompt-mining-api-gateway_pzero-network
```

**Step 3: Get Production PZERO Credentials**

1. Register at https://gateway.pzero.io/register
2. Get your production API key (starts with `pzero_prod_`)
3. Get your production Client ID
4. Update `.env` with real credentials

### Option 2: Self-Hosted PZERO Gateway in Production

If you're deploying your own PZERO Gateway in production:

**Step 1: Deploy PZERO Gateway first**

```bash
# Deploy PZERO Gateway to your production server
# (Separate deployment)
```

**Step 2: Update `.env` with your gateway URL**

```env
# Self-hosted production gateway
PM_PZERO_API_URL=https://your-pzero-gateway.yourdomain.com/v1
PM_PZERO_API_KEY=your_custom_api_key
PM_PZERO_CLIENT_ID=your-company-id
```

**Step 3: Update `docker-compose.yml`**

```yaml
services:
  app:
    # ... other config ...
    networks:
      - prompt-mining-network
      # Don't reference external networks in production
      # Gateway is accessed via HTTPS URL
```

## Security Checklist for Production

- [ ] Change `PM_NODE_ENV=production`
- [ ] Use real PZERO Gateway URL (`https://gateway.pzero.io/v1`)
- [ ] Use production API keys (not test keys)
- [ ] Enable authentication (`PM_REQUIRE_AUTH=true`)
- [ ] Enable mint authentication (`PM_REQUIRE_AUTH_MINT=true`)
- [ ] Use strong API keys for your users
- [ ] Use mainnet contract addresses
- [ ] Use mainnet RPC URL
- [ ] Secure private key management (use secrets manager)
- [ ] Remove development networks from docker-compose
- [ ] Set appropriate rate limits
- [ ] Configure monitoring and logging
- [ ] Use HTTPS for all connections

## Quick Deployment Commands

### Development (Local)

```bash
# Start with local PZERO Gateway
docker-compose up -d --build
```

### Production (Official PZERO)

```bash
# 1. Copy production env template
cp .env.production.example .env.production

# 2. Edit with your production values
nano .env.production

# 3. Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Verification

### Development

```bash
# Check connection to local PZERO
docker exec prompt-mining-api curl http://pzero-gateway-app:3001/health

# View logs
docker logs -f prompt-mining-api
```

### Production

```bash
# Check connection to production PZERO
curl https://gateway.pzero.io/v1/health

# Test your API
curl https://your-api.yourdomain.com/health
```

## Impact Summary

### What Changed in Your Current Setup (Development):

1. Added external Docker network to connect to local PZERO Gateway
2. Changed `PM_PZERO_API_URL` from `localhost` to Docker container name
3. This works perfectly for **local development**

### What You Must Change for Production:

1. Remove development Docker network reference
2. Change `PM_PZERO_API_URL` to production gateway
3. Use production API credentials
4. Use mainnet blockchain configuration
5. Enable all security features

## Troubleshooting

### "PZERO_UNAVAILABLE" Error

**Development:**
- Check if `pzero-gateway-app` container is running: `docker ps | grep pzero`
- Verify network connection: `docker network inspect prompt-mining-api-gateway_pzero-network`

**Production:**
- Check PZERO Gateway is accessible: `curl https://gateway.pzero.io/v1/health`
- Verify API credentials are correct
- Check firewall/network settings

### "Failed to lookup customer by API key"

- Your API key is not registered in the PZERO Gateway database
- For development: Register in your local gateway database
- For production: Get real credentials from https://gateway.pzero.io/register

## Related Documentation

- [Docker Deployment Guide](docs/DOCKER.md)
- [Quick Start](DOCKER-QUICK-START.md)
- [Architecture Overview](docs/architecture.md)
