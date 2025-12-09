# Prompt Mining Boilerplate

Production-ready boilerplate for integrating ERC-7208 prompt mining rewards into LLM services.

[![CI](https://github.com/ProjectZero-io/prompt-mining-boilerplate/workflows/CI/badge.svg)](https://github.com/ProjectZero-io/prompt-mining-boilerplate/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

## Features

- **Blockchain Integration**: Built on ERC-7208 standard for data objects
- **Reward System**: Users experience an automatic activity points distribution for quality prompts
- **Privacy-First**: Prompts never leave your infrastructure - only hashes sent for authorization
- **Production Ready**: Docker support, CI/CD, comprehensive testing


## Where Does This Fit?

This boilerplate enables your ai infrastructure to reward your users for contributing quality prompts to your LLM-powered service. Here's how it works:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Your LLM Service                            │
│  ┌──────────┐      ┌──────────────────┐      ┌─────────────────┐    │
│  │   User   │─────▶│  Your Backend    │─────▶│   LLM Provider  │    │
│  │          │◀─────│  (ChatGPT, etc.) │◀─────│ (OpenAI, etc.)  │    │
│  └──────────┘      └──────────────────┘      └─────────────────┘    │
│                              │                                      │
│                              │ Capture prompts                      │
│                              ▼                                      │
│                    ┌───────────────────┐                            │
│                    │ This Boilerplate  │                            │
│                    │   (Your Server)   │                            │
│                    └─────────┬─────────┘                            │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
            Hash Prompt    Get Auth     Mint to
            (keccak256)    from PZERO  Blockchain
                 │             │           │
                 │             ▼           │
                 │      ┌──────────────┐   │
                 │      │ PZERO Gateway│   │
                 └─────▶│ (B2B Service)│   │
                        └──────────────┘   │
               pm-gateway.projectzero.io   │
                                           ▼
                                  ┌──────────────┐
                                  │  Blockchain  │
                                  │ (Nexera)     │
                                  └──────────────┘
                                  User gets rewards!
```


### Getting PZERO API Credentials

To use this boilerplate, you need to register for PZERO API credentials:

 **[Register at pm-api.projectzero.io/register](https://pm-gateway.projectzero.io/register)**

You'll receive:
- `PM_PZERO_API_KEY` - Your API authentication key
- `PM_PZERO_API_URL` - The PZERO Gateway endpoint

## Table of Contents

- [Features](#features)
- [Where Does This Fit?](#where-does-this-fit)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Verifying Your Configuration](#verifying-your-configuration)
- [Local Development & Testing](#local-development--testing)
- [API Documentation](#api-documentation)
- [Frontend Integration](#frontend-integration)
- [Architecture](#architecture)
- [Core Concepts](#core-concepts)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PZERO API credentials** - [Register at pm-gateway.projectzero.io/register](https://pm-gateway.projectzero.io/register)
- **Crypto wallet** with Nexera testnet/mainnet access
- **RPC endpoint** (Nexera RPC or your own node)

## Getting Started

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/ProjectZero-io/prompt-mining-boilerplate.git
cd prompt-mining-boilerplate

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` and configure the following **required** variables:

**PZERO B2B Integration** (get these from [pm-gateway.projectzero.io/register](https://pm-gateway.projectzero.io/register)):
```env
PM_PZERO_API_KEY=pzero_live_xxxxxxxxxxxxx
PM_PZERO_API_URL=https://pm-gateway.projectzero.io/v1
```

**Blockchain Configuration**:
```env
PM_RPC_URL=https://rpc.testnet.nexera.network
PM_CHAIN_ID=72080
PM_PRIVATE_KEY=0xYourPrivateKeyHere
```

**Smart Contract Addresses** (provided by ProjectZero):
```env
PM_PROMPT_MINER_ADDRESS=0x...
PM_ACTIVITY_POINTS_ADDRESS=0x...
PM_PROMPT_DO_ADDRESS=0x...
PM_DATA_INDEX_ADDRESS=0x...
```

**API Security** (Front-end keys to boilerplate):
```env
PM_API_KEYS=your-api-key-here,another-key-here
PM_REQUIRE_AUTH=true
PM_SPONSORED_TRANSACTIONS=false
```

### 3. Start the Server

**Important:** Before starting the server, verify your configuration by running `npm run test:config`. See [Verifying Your Configuration](#verifying-your-configuration) for detailed instructions and expected output.

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### 4. Test Your First Mint

```bash
curl -X POST http://localhost:3000/api/prompts/mint \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "prompt": "What is the capital of France?",
    "author": "0xYourWalletAddress",
    "activityPoints": "10",
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "chain-id":"7208",
    "transactionHash": "0x...",
    "promptHash": "0x...",
    "blockNumber": 12345678
  }
}
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

#### PZERO B2B Integration (Required)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PM_PZERO_API_KEY` | PZERO API authentication key | **Yes** | `pzero_live_xxxxxxxxxxxxx` |
| `PM_PZERO_API_URL` | PZERO Gateway API endpoint | **Yes** | `https://pm-gateway.projectzero.io/v1` |

Get these credentials at **[pm-gateway.projectzero.io/register](https://pm-gateway.projectzero.io/register)**

#### Blockchain Configuration (Required)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PM_NODE_ENV` | Environment mode | **Yes** | `development`, `production` |
| `PM_PORT` | Server port | **Yes** | `3000` |
| `PM_RPC_URL` | Blockchain RPC endpoint | **Yes** | `https://rpc.nexera.network` |
| `PM_CHAIN_ID` | Blockchain chain ID | **Yes** | `7208` (mainnet), `72080` (testnet) |
| `PM_PROMPT_MINER_ADDRESS` | PromptMiner contract address | **Yes** | `0x...` |
| `PM_ACTIVITY_POINTS_ADDRESS` | ActivityPoints contract address | **Yes** | `0x...` |
| `PM_PROMPT_DO_ADDRESS` | PromptDO contract address | **Yes** | `0x...` |
| `PM_DATA_INDEX_ADDRESS` | DataIndex contract address | **Yes** | `0x...` |
| `PM_PRIVATE_KEY` | Wallet private key for signing | **No**, depends on SPONSORED | `0x...` (NEVER commit!) |

#### API Security (B2C - Your frontend)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PM_API_KEYS` | Comma-separated list of valid API keys | No | `key1,key2,key3` |
| `PM_REQUIRE_AUTH` | Require authentication globally | Yes | `true`, `false` (default: `true`) |
| `PM_REQUIRE_AUTH_MINT` | Require auth for mint endpoint | No | `true`, `false` (default: `true`) |
| `PM_REQUIRE_AUTH_MIGRATE` | Require auth for migrate endpoint | No | `true`, `false` (default: `true`) |
| `PM_REQUIRE_AUTH_READ` | Require auth for read endpoints | No | `true`, `false` (default: `false`) |

#### Optional Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PM_PZERO_AUTH_TIMEOUT_MS` | Timeout for PZERO API calls | No | `5000` (5 seconds) |
| `PM_PZERO_RETRY_ATTEMPTS` | Number of retry attempts for PZERO | No | `3` |
| `PM_RATE_LIMIT_WINDOW_MS` | Rate limit time window (ms) | No | `900000` (15 min) |
| `PM_RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No | `100` |
| `PM_RATE_LIMIT_SKIP_AUTHENTICATED` | Skip rate limit for authenticated users | No | `true`, `false` |
| `PM_LOG_LEVEL` | Logging level | No | `info`, `debug`, `warn`, `error` |

**Security Warning**: Never commit your `.env` file or expose private keys. Use secure key management systems in production.


## Verifying Your Configuration

Before running your server, it's critical to verify that all environment variables are correctly configured and that external services are accessible.

### Running Configuration Tests

```bash
npm run test:config
```

This automated verification script will check:

1. **Environment Variables**: Ensures all required variables are set
2. **PZERO API Key Format**: Validates key starts with `pzero_`
3. **PZERO API URL**: Validates URL format
4. **Contract Addresses**: Validates all contract addresses
5. **Private Key Format**: Validates private key structure
6. **Blockchain RPC**: Tests connection to your RPC endpoint
7. **PZERO API**: Tests connection and authentication
8. **Wallet Balance**: Checks wallet has sufficient funds for gas

### Example Output

**All tests passed:**
```
═══════════════════════════════════════
  Configuration Verification Tests
═══════════════════════════════════════

1. Checking Environment Variables...

✓ PM_NODE_ENV: Set
✓ PM_PORT: Set
✓ PM_RPC_URL: Set
✓ PM_PZERO_API_KEY: Set
...

2. Validating Configuration Values...

✓ PM_PZERO_API_KEY format: Valid (starts with pzero_)
✓ PM_PZERO_API_URL format: Valid URL
✓ PM_PROMPT_MINER_ADDRESS: Valid blockchain address
...

3. Testing External Connections...

✓ Blockchain RPC: Connected! Chain ID: 1, Block: 12345678
✓ PZERO API: Connected! PZERO service is healthy
✓ Wallet Balance: 0.5 ETH (Wallet: 0x1234567...)

═══════════════════════════════════════
All tests passed!
═══════════════════════════════════════

Your configuration is ready. You can now run:
  npm run dev     - Start development server
  npm run build   - Build for production
  npm start       - Start production server
```

**Tests failed:**
```
✗ PM_PZERO_API_KEY: Missing!
✗ PM_PZERO_API: Cannot reach PM_PZERO_API (ENOTFOUND)

2 test(s) failed
═══════════════════════════════════════

Please fix the issues above before running the server.
Check your .env file and ensure all values are correct.
```

## Local Development & Testing

### Starting the Development Server

```bash
# Start server with hot reload
npm run dev
```

The server will start on `http://localhost:3000` (or your configured `PORT`).

### Testing Endpoints Locally

#### 1. Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```


## API Documentation

### Authentication

All protected endpoints require an API key to be sent in the `x-api-key` header:

```bash
curl -H "x-api-key: your-api-key-here" http://localhost:3000/api/prompts/mint
```

Authentication requirements per endpoint are configurable via environment variables (see Configuration section).

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Health check endpoint | No |
| `GET` | `/api/activity-points/:address` | Get activity points balance for an address | Configurable (default: No) |
| `GET` | `/api/prompts/:hash` | Check if prompt is minted | Configurable (default: No) |
| `POST` | `/api/prompts/authorize` | Get PZERO authorization for user-signed mint | Configurable (default: Yes) |
| `POST` | `/api/prompts/signable-mint-data` | Get EIP-712 typed data for meta-transaction | Configurable (default: Yes) |
| `POST` | `/api/prompts/execute-metatx` | Execute meta-transaction (relayer mode) | Configurable (default: Yes) |
| `POST` | `/api/prompts/mint-for-user` | Mint on behalf of user (backend-signed) | Configurable (default: Yes) |
| `GET` | `/api/analytics/prompts` | Get paginated list of customer prompts | Configurable (default: Yes) |
| `GET` | `/api/analytics/time-series` | Get time-based analytics for prompts | Configurable (default: Yes) |
| `GET` | `/api/analytics/stats` | Get overall statistics for customer prompts | Configurable (default: Yes) |

### Mint Prompt

There are **three ways** to mint prompts depending on your use case:

---

#### Option 1: User-Signed Transaction (`/api/prompts/authorize`)

**Best for:** Public LLM services, decentralized applications, Web3-native platforms  
**User pays gas** | **User signs transaction** | **Requires wallet (Metamask)**

**Endpoint**: `POST /api/prompts/authorize`

**Request Body**:
```json
{
  "prompt": "What is artificial intelligence?",
  "author": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "activityPoints": "30000000000000000000"
}
```

**Notes:**
- `activityPoints` is optional. If not provided, backend calculates the reward amount.
- `activityPoints` must be in wei (e.g., `"30000000000000000000"` = 30 tokens with 18 decimals).
- Accepts `"0"` as valid amount.

**Response** (user signs this with Metamask):
```json
{
  "success": true,
  "data": {
    "to": "0x...",
    "data": "0x...",
    "value": "0"
  }
}
```

**Example:** See [`examples/frontend/user-signed-transaction.html`](examples/frontend/user-signed-transaction.html)

---

#### Option 2: Meta-Transaction (`/api/prompts/signable-mint-data` + `/api/prompts/execute-metatx`)

**Best for:** Enterprise deployments, onboarding non-crypto users  
**Backend pays gas** | **User signs message (EIP-712)** | **Requires wallet (Metamask)**

**Step 1 - Get Signable Data**: `POST /api/prompts/signable-mint-data`

**Request**:
```json
{
  "prompt": "What is artificial intelligence?",
  "author": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "activityPoints": "30000000000000000000"
}
```

**Notes:**
- `activityPoints` is optional. If not provided, backend calculates the reward amount.
- `activityPoints` must be in wei (e.g., `"30000000000000000000"` = 30 tokens with 18 decimals).
- Accepts `"0"` as valid amount.

**Response** (user signs with Metamask):
```json
{
  "success": true,
  "data": {
    "domain": { ... },
    "types": { ... },
    "message": { ... }
  }
}
```

**Step 2 - Execute**: `POST /api/prompts/execute-metatx`

**Request**:
```json
{
  "typedData": { ... },
  "signature": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "promptHash": "0x...",
    "blockNumber": 12345678
  }
}
```

**Example:** See [`examples/frontend/message-signing-auth.html`](examples/frontend/message-signing-auth.html)

---

#### Option 3: Backend-Signed Mint (`/api/prompts/mint-for-user`)

**Best for:** Rewarding users without wallets, promotional campaigns, onboarding flows  
**Backend pays gas** | **No user signature** | **No wallet required**

**Endpoint**: `POST /api/prompts/mint-for-user`

**Request Body**:
```json
{
  "prompt": "What is artificial intelligence?",
  "author": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "activityPoints": "30000000000000000000"
}
```

**Notes:**
- `activityPoints` is optional. If not provided, backend calculates the reward amount.
- `activityPoints` must be in wei (e.g., `"30000000000000000000"` = 30 tokens with 18 decimals).
- Accepts `"0"` as valid amount.

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "promptHash": "0x...",
    "blockNumber": 12345678
  }
}
```

**Use Cases:**
- Reward users who don't have wallets yet
- Promotional campaigns (mint prompts for all users)
- Onboarding flows (give new users their first prompts)
- Admin operations (retroactive rewards)

**Security Note:** This endpoint allows the backend to mint prompts for any address. Ensure proper access control and validation in production.

---


## Frontend Integration

This boilerplate provides **three integration modes** for frontend applications, with complete working examples using Metamask.

### Integration Modes

#### 1. User-Signed Transaction Mode

**Best for:** Public LLM services, decentralized applications, Web3-native platforms

Users sign blockchain transactions directly with their Metamask wallet. They pay gas fees and own the transaction.

**Flow:**
```
User → Backend (get authorization) → User signs TX with Metamask → Blockchain → Rewards
```

**Endpoint:** `POST /api/prompts/authorize`

**Example:** [`examples/frontend/user-signed-transaction.html`](examples/frontend/user-signed-transaction.html)

**Pros:**
- User owns the transaction (true Web3)
- Transparent on-chain record
- Decentralized experience

**Cons:**
- Requires Metamask and gas tokens
- UX friction (transaction popup)

---

#### 2. Meta-Transaction Mode (EIP-712 Message Signing)

**Best for:** Enterprise deployments, onboarding non-crypto users, high-volume services

Users sign a message (free, no gas) to prove wallet ownership. Your backend submits transactions and pays gas fees.

**Flow:**
```
User → Signs message (free) → Backend verifies → Backend submits TX → Rewards
```

**Endpoints:** 
- `POST /api/prompts/signable-mint-data` (get typed data)
- `POST /api/prompts/execute-metatx` (execute)

**Example:** [`examples/frontend/message-signing-auth.html`](examples/frontend/message-signing-auth.html)

**Pros:**
- No gas fees for users
- Seamless UX (no transaction popups)
- User proves wallet ownership

**Cons:**
- Company pays all gas fees
- Requires user signature (still needs wallet)

---

#### 3. Backend-Signed Mode (No User Interaction)

**Best for:** Rewarding users without wallets, promotional campaigns, onboarding flows

Backend mints prompts directly without any user signature or wallet interaction.

**Flow:**
```
Backend → Blockchain (backend signs & pays gas) → Rewards user address
```

**Endpoint:** `POST /api/prompts/mint-for-user`

**Pros:**
- No wallet required
- Zero user interaction
- Perfect for onboarding and promotions

**Cons:**
- Company pays all gas fees
- User doesn't prove ownership
- Requires strong backend access control

---

### Analytics & Statistics

The boilerplate provides analytics endpoints to track and monitor your prompt minting activity through the PZERO gateway.

**Authentication**: Analytics endpoints require API key authentication by default (configurable via `PM_REQUIRE_AUTH_READ`). Include your API key in the `x-api-key` header.

#### Get Customer Prompts (Paginated)

**Endpoint**: `GET /api/analytics/prompts`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 100)
- `chainId` (string, optional): Filter by chain ID

**Example**:
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/analytics/prompts?page=1&limit=50&chainId=72080
```

**Response**:
```json
{
  "success": true,
  "data": {
    "prompts": [
      {
        "id": "...",
        "promptHash": "0x...",
        "author": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        "activityPoints": "10",
        "chainId": "72080",
        "transactionHash": "0x...",
        "createdAt": "2025-11-19T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

---

#### Get Time-Based Analytics

**Endpoint**: `GET /api/analytics/time-series`

**Query Parameters**:
- `period` (required): `'day'` | `'week'` | `'month'`
- `date` (optional): ISO date string (YYYY-MM-DD, defaults to current period)

**Example**:
```bash
# Current week analytics
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/analytics/time-series?period=week

# Specific day analytics
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/analytics/time-series?period=day&date=2025-11-19
```

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "week",
    "dateRange": {
      "start": "2025-11-13",
      "end": "2025-11-19"
    },
    "data": [
      {
        "date": "2025-11-13",
        "count": 25,
        "totalActivityPoints": "250"
      },
      {
        "date": "2025-11-14",
        "count": 30,
        "totalActivityPoints": "300"
      }
    ],
    "summary": {
      "totalPrompts": 175,
      "totalActivityPoints": "1750"
    }
  }
}
```

---

#### Get Overall Statistics

**Endpoint**: `GET /api/analytics/stats`

**Example**:
```bash
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/analytics/stats
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalPrompts": 1500,
    "totalActivityPoints": "15000",
    "uniqueAuthors": 342,
    "byChain": [
      {
        "chainId": "72080",
        "count": 1200,
        "totalActivityPoints": "12000"
      },
      {
        "chainId": "7208",
        "count": 300,
        "totalActivityPoints": "3000"
      }
    ],
    "firstPromptAt": "2025-01-01T00:00:00Z",
    "lastPromptAt": "2025-11-19T10:00:00Z"
  }
}
```

---

## Architecture

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).


## Core Concepts

* **Prompt Minting**:  is the process of recording a user's prompt as a hash on-chain and rewarding them with activity points (or any other token). Each unique prompt is hashed and stored in the PromptDO contract, indexed by DataPoint (as per [ERC-7208](https://eips.ethereum.org/EIPS/eip-7208))


* **Activity Points System**: Activity Points are awarded to users for contributing quality prompts. The amount awarded is configurable per prompt based on Prompt quality, User contribution history, or Platform-specific rules. The boilerplate must decide how much and when to reward prompts.

* **Prompt Migration**: Prompts can be migrated between different PromptMiner contracts, useful for Upgrading to new reward mechanisms, Changing data point configurations, or Moving to different blockchain networks.


## Development

### Running in Development Mode

```bash
# Start with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type checking
npm run typecheck
```

### Building for Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```


## Deployment

### Localhost Testing

Before deploying to any environment, test locally:

```bash
# 1. Verify configuration
npm run test:config

# 2. Build the application
npm run build

# 3. Start production build locally
npm start
```

Your server will run at `http://localhost:3000` (or your configured `PORT`). Test all endpoints before deploying.

### Docker Deployment

This boilerplate is **100% Dockerized** and production-ready. See the complete Docker deployment guide:

** [Full Docker Documentation](docs/DOCKER.md)** - Comprehensive guide with private npm package setup

** [Quick Start](DOCKER-QUICK-START.md)** - Get running in 30 seconds

#### Quick Docker Setup

```bash
# 1. Set your npm token (required for private @project_zero/prompt-mining-sdk)
export NPM_TOKEN=$(cat ~/.npmrc | grep "_authToken" | cut -d '=' -f 2)

# 2. Build and run with Docker Compose
docker-compose up -d --build

# 3. View logs
docker-compose logs -f

# 4. Test health endpoint
curl http://localhost:3000/health
```

#### Manual Docker Build

```bash
# Build with private npm package support
docker build --build-arg NPM_TOKEN=$NPM_TOKEN -t prompt-mining-api .

# Run container
docker run -p 3000:3000 --env-file .env prompt-mining-api
```

**Note**: This project uses the private npm package `@project_zero/prompt-mining-sdk`. You must provide an NPM authentication token to build the Docker image. See [docs/DOCKER.md](docs/DOCKER.md) for details.

# Or use Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```


**Development/Testing**: Use Nexera testnet
```env
PM_NODE_ENV=development
PM_RPC_URL=https://rpc.testnet.nexera.network
PM_CHAIN_ID=72080
PM_PZERO_API_KEY=pzero_live_xxxxxxxxxxxxx
```

**Production**: Use Nexera mainnet with production PZERO credentials
```env
PM_NODE_ENV=production
PM_RPC_URL=https://rpc.nexera.network
PM_CHAIN_ID=7208
PM_PZERO_API_KEY=pzero_live_xxxxxxxxxxxxx
```


## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow existing code style
- Write comprehensive JSDoc comments
- Include unit tests for new features
- Ensure all tests pass (`npm test`)
- Run linter and formatter (`npm run lint:fix && npm run format`)
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with  by ProjectZero**

For support, please open an issue or contact us at support@projectzero.io
