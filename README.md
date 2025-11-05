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
                        gateway.pzero.io   │
                                           ▼
                                  ┌──────────────┐
                                  │  Blockchain  │
                                  │ (Nexera)     │
                                  └──────────────┘
                                  User gets rewards!
```


### Getting PZERO API Credentials

To use this boilerplate, you need to register for PZERO API credentials:

👉 **[Register at gateway.pzero.io/register](https://gateway.pzero.io/register)**

You'll receive:
- `PZERO_API_KEY` - Your API authentication key
- `PZERO_CLIENT_ID` - Your unique client identifier
- `PZERO_API_URL` - The PZERO Gateway endpoint

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
- **PZERO API credentials** - [Register at gateway.pzero.io/register](https://gateway.pzero.io/register)
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

**PZERO B2B Integration** (get these from [gateway.pzero.io/register](https://gateway.pzero.io/register)):
```env
PZERO_API_KEY=pzero_live_xxxxxxxxxxxxx
PZERO_CLIENT_ID=your-company-id
PZERO_API_URL=https://api.pzero.io/v1
```

**Blockchain Configuration**:
```env
RPC_URL=https://rpc.testnet.nexera.network
CHAIN_ID=72080
PRIVATE_KEY=0xYourPrivateKeyHere
```

**Smart Contract Addresses** (provided by ProjectZero):
```env
PROMPT_MINER_ADDRESS=0x...
ACTIVITY_POINTS_ADDRESS=0x...
PROMPT_DO_ADDRESS=0x...
DATA_INDEX_ADDRESS=0x...
```

**API Security** (Front-end keys to boilerplate):
```env
API_KEYS=your-api-key-here,another-key-here
REQUIRE_AUTH=true
SPONSORED_TRANSACTIONS=false
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
| `PZERO_API_KEY` | PZERO API authentication key | **Yes** | `pzero_live_xxxxxxxxxxxxx` |
| `PZERO_CLIENT_ID` | Your company's PZERO client ID | **Yes** | `your-company-id` |
| `PZERO_API_URL` | PZERO Gateway API endpoint | **Yes** | `https://api.pzero.io/v1` |

Get these credentials at **[gateway.pzero.io/register](https://gateway.pzero.io/register)**

#### Blockchain Configuration (Required)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | **Yes** | `development`, `production` |
| `PORT` | Server port | **Yes** | `3000` |
| `RPC_URL` | Blockchain RPC endpoint | **Yes** | `https://rpc.nexera.network` |
| `CHAIN_ID` | Blockchain chain ID | **Yes** | `7208` (mainnet), `72080` (testnet) |
| `PROMPT_MINER_ADDRESS` | PromptMiner contract address | **Yes** | `0x...` |
| `ACTIVITY_POINTS_ADDRESS` | ActivityPoints contract address | **Yes** | `0x...` |
| `PROMPT_DO_ADDRESS` | PromptDO contract address | **Yes** | `0x...` |
| `DATA_INDEX_ADDRESS` | DataIndex contract address | **Yes** | `0x...` |
| `PRIVATE_KEY` | Wallet private key for signing | **No**, depends on SPONSORED | `0x...` (NEVER commit!) |

#### API Security (B2C - Your frontend)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `API_KEYS` | Comma-separated list of valid API keys | No | `key1,key2,key3` |
| `REQUIRE_AUTH` | Require authentication globally | Yes | `true`, `false` (default: `true`) |
| `REQUIRE_AUTH_MINT` | Require auth for mint endpoint | No | `true`, `false` (default: `true`) |
| `REQUIRE_AUTH_MIGRATE` | Require auth for migrate endpoint | No | `true`, `false` (default: `true`) |
| `REQUIRE_AUTH_READ` | Require auth for read endpoints | No | `true`, `false` (default: `false`) |

#### Optional Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PZERO_AUTH_TIMEOUT_MS` | Timeout for PZERO API calls | No | `5000` (5 seconds) |
| `PZERO_RETRY_ATTEMPTS` | Number of retry attempts for PZERO | No | `3` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit time window (ms) | No | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No | `100` |
| `RATE_LIMIT_SKIP_AUTHENTICATED` | Skip rate limit for authenticated users | No | `true`, `false` |
| `LOG_LEVEL` | Logging level | No | `info`, `debug`, `warn`, `error` |

**⚠️ Security Warning**: Never commit your `.env` file or expose private keys. Use secure key management systems in production.


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

**✅ All tests passed:**
```
═══════════════════════════════════════
  Configuration Verification Tests
═══════════════════════════════════════

1. Checking Environment Variables...

✓ NODE_ENV: Set
✓ PORT: Set
✓ RPC_URL: Set
✓ PZERO_API_KEY: Set
...

2. Validating Configuration Values...

✓ PZERO_API_KEY format: Valid (starts with pzero_)
✓ PZERO_API_URL format: Valid URL
✓ PROMPT_MINER_ADDRESS: Valid blockchain address
...

3. Testing External Connections...

✓ Blockchain RPC: Connected! Chain ID: 1, Block: 12345678
✓ PZERO API: Connected! PZERO service is healthy
✓ Wallet Balance: 0.5 ETH (Wallet: 0x1234567...)

═══════════════════════════════════════
✅ All tests passed!
═══════════════════════════════════════

Your configuration is ready. You can now run:
  npm run dev     - Start development server
  npm run build   - Build for production
  npm start       - Start production server
```

**❌ Tests failed:**
```
✗ PZERO_API_KEY: Missing!
✗ PZERO_API: Cannot reach PZERO API (ENOTFOUND)

❌ 2 test(s) failed
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
| `POST` | `/api/prompts/mint` | Mint a new prompt and reward user | Configurable (default: Yes) |
| `GET` | `/api/prompts/:hash` | Check if prompt is minted | Configurable (default: No) |

### Mint Prompt

**Endpoint**: `POST /api/prompts/mint`

**Authentication**: Required (configurable via `REQUIRE_AUTH_MINT`)

**Headers**:
```
Content-Type: application/json
x-api-key: your-api-key-here
```

**Request Body**:
```json
{
  "prompt": "What is artificial intelligence?",
  "author": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "activityPoints": "10"
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


## Frontend Integration

This boilerplate provides **two integration modes** for frontend applications, with complete working examples using Metamask.

### 🎯 Integration Modes

#### 1. User-Signed Transaction Mode (Recommended)

**Best for:** Public LLM services, decentralized applications, Web3-native platforms

Users sign blockchain transactions directly with their Metamask wallet. They pay gas fees and own the transaction.

**Flow:**
```
User → Backend (get authorization) → User signs TX with Metamask → Blockchain → Rewards
```

**Example:** [`examples/frontend/user-signed-transaction.html`](examples/frontend/user-signed-transaction.html)

**Pros:**
- ✅ User owns the transaction (true Web3)
- ✅ Transparent on-chain record
- ✅ Decentralized experience

**Cons:**
- ❌ Requires Metamask and gas tokens
- ❌ UX friction (transaction popup)

---

#### 2. Message Signing Authentication (Optional)

**Best for:** Enterprise deployments, onboarding non-crypto users, high-volume services

Users sign a message (free, no gas) to prove wallet ownership. Your backend submits transactions and pays gas fees.

**Flow:**
```
User → Signs message (free) → Backend verifies → Backend submits TX → Rewards
```

**Example:** [`examples/frontend/message-signing-auth.html`](examples/frontend/message-signing-auth.html)

**Pros:**
- ✅ No gas fees for users
- ✅ Seamless UX (no transaction popups)
- ✅ Easy onboarding

**Cons:**
- ❌ Company pays all gas fees
- ❌ Less decentralized

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

**📖 [Full Docker Documentation](docs/DOCKER.md)** - Comprehensive guide with private npm package setup

**⚡ [Quick Start](DOCKER-QUICK-START.md)** - Get running in 30 seconds

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
NODE_ENV=development
RPC_URL=https://rpc.testnet.nexera.network
CHAIN_ID=72080
PZERO_API_KEY=pzero_live_xxxxxxxxxxxxx
```

**Production**: Use Nexera mainnet with production PZERO credentials
```env
NODE_ENV=production
RPC_URL=https://rpc.nexera.network
CHAIN_ID=7208
PZERO_API_KEY=pzero_live_xxxxxxxxxxxxx
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

**Built with ❤️ by ProjectZero**

For support, please open an issue or contact us at support@projectzero.io
