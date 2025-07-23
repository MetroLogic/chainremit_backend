# ChainRemit Backend

A Node.js/Express backend for ChainRemit, written in TypeScript.

## Features
- Structured logging with Winston
- API documentation with Swagger (OpenAPI)
- Environment-based configuration
- Security best practices (Helmet, CORS)
- Static Application Security Testing (SAST) with CodeQL

## Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/MetroLogic/chainremit_backend.git
   cd chainremit_backend
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env.development`, `.env.production`, etc. and set values as needed.

4. **Run the development server:**
   ```sh
   npm run dev
   ```

## Usage

- The server will start on the port specified in your `.env` file (default: 3000).
- Health check endpoint: `GET /health`
- API documentation: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## API Documentation

Interactive API docs are available at `/api-docs` once the server is running. Documentation is generated using Swagger/OpenAPI.

## Static Application Security Testing (SAST)

CodeQL is configured via GitHub Actions to automatically analyze code for security vulnerabilities on push and pull requests to `main`.

## Scripts
- `npm run dev` — Start development server with hot reload
- `npm run build` — Compile TypeScript to JavaScript
- `npm start` — Run compiled app
- `npm test` — Run tests
- `npm run lint` — Lint code
- `npm run format` — Format code

## License

MIT
=======
# ChainRemit Backend API

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/MetroLogic/chainremit_backend)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)](https://github.com/MetroLogic/chainremit_backend)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/MetroLogic/chainremit_backend)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Decentralized microfinance and remittance platform built on StarkNet - Empowering migrant workers and underbanked communities with secure, low-cost cross-border financial services.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Docker](#docker)
- [CI/CD](#cicd)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Support](#support)

## Overview

ChainRemit Backend is the core API service powering the ChainRemit platform - a revolutionary decentralized remittance and microfinance solution built on StarkNet. Our platform combines blockchain scalability, smart contract automation, and AI-driven insights to serve migrant workers and underbanked communities worldwide.

### Mission
To democratize access to financial services by providing secure, affordable, and near-instant cross-border money transfers and microfinance solutions.

### Value Proposition
- **Low Fees**: Reduce transaction costs by up to 90% compared to traditional remittance services
- **Speed**: Near-instant settlements powered by StarkNet L2 technology
- **Security**: Blockchain-based security with comprehensive KYC/AML compliance
- **Accessibility**: Serve the underbanked with minimal barriers to entry
- **Transparency**: Full transaction transparency and audit trails

## Architecture

```mermaid
graph TB
    A[Frontend Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[User Service]
    B --> E[Transaction Service]
    B --> F[KYC Service]
    B --> G[Agent Service]
    
    C --> H[JWT Token Store]
    D --> I[User Database]
    E --> J[Transaction Database]
    F --> K[KYC Database]
    G --> L[Agent Database]
    
    E --> M[StarkNet Contract]
    E --> N[Blockchain Service]
    
    O[External APIs] --> P[Exchange Rate Service]
    O --> Q[Notification Service]
    O --> R[Payment Gateways]
    
    M --> S[StarkNet Network]
```

### Core Components
- **RESTful API**: Express.js-based REST API with comprehensive endpoints
- **StarkNet Integration**: Direct integration with ChainRemit smart contracts
- **Authentication**: Multi-factor authentication with wallet and traditional methods
- **Database**: MongoDB for user data, PostgreSQL for transaction records
- **Real-time**: WebSocket connections for live transaction updates
- **Security**: End-to-end encryption with comprehensive audit logging

## Features

✅ **User Management**
- Multi-method authentication (wallet, email, social)
- Comprehensive user profiles and preferences
- Role-based access control (User, Agent, Admin)

✅ **StarkNet Integration**
- Direct smart contract interaction
- Real-time blockchain event monitoring
- Transaction status synchronization

✅ **Microfinance Operations**
- Peer-to-peer lending
- Community savings groups
- Credit scoring and risk assessment

✅ **Cross-border Remittances**
- Multi-currency support
- Real-time exchange rates
- Agent network for cash-out services

✅ **Security & Compliance**
- Multi-level KYC verification
- AML transaction monitoring
- Comprehensive audit trails

✅ **API Features**
- RESTful design principles
- OpenAPI/Swagger documentation
- Rate limiting and throttling
- Comprehensive error handling

## Quick Start

Get the ChainRemit backend running locally in under 15 minutes:

```bash
# Clone the repository
git clone https://github.com/MetroLogic/chainremit_backend.git
cd chainremit_backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:setup

# Start development server
npm run dev

# Verify installation
curl http://localhost:3000/api/health
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-23T10:30:00.000Z",
  "services": {
    "database": "connected",
    "starknet": "connected",
    "redis": "connected"
  }
}
```

## Prerequisites

### System Requirements
- **Node.js**: v18.x or higher
- **npm**: v8.x or higher
- **MongoDB**: v6.x or higher
- **PostgreSQL**: v14.x or higher
- **Redis**: v6.x or higher (for caching and sessions)

### Development Tools
- **Git**: Latest version
- **Docker**: v20.x or higher (optional)
- **Docker Compose**: v2.x or higher (optional)

### StarkNet Requirements
- StarkNet Sepolia testnet access
- Test STRK tokens for gas fees
- StarkNet RPC endpoint access

### External Services
- Email service provider (SendGrid, AWS SES)
- SMS service provider (Twilio)
- Exchange rate API access

## Installation

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/MetroLogic/chainremit_backend.git
cd chainremit_backend

# Install dependencies
npm install
```

### 2. Database Setup

#### MongoDB Setup
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install mongodb

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongo
> use chainremit
> db.createUser({
    user: "chainremit_user",
    pwd: "your_secure_password",
    roles: ["readWrite"]
  })
```

#### PostgreSQL Setup
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
postgres=# CREATE DATABASE chainremit_transactions;
postgres=# CREATE USER chainremit_user WITH PASSWORD 'your_secure_password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE chainremit_transactions TO chainremit_user;
```

### 3. Redis Setup
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## Configuration

### Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

#### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://chainremit_user:password@localhost:27017/chainremit
POSTGRES_URI=postgresql://chainremit_user:password@localhost:5432/chainremit_transactions
REDIS_URI=redis://localhost:6379

# StarkNet Configuration
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_7
STARKNET_CONTRACT_ADDRESS=0x1234567890abcdef...
STARKNET_PRIVATE_KEY=0xabcdef1234567890...

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-token-secret

# External Services
SENDGRID_API_KEY=SG.your-sendgrid-api-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

### StarkNet Testnet Configuration

1. **Get Testnet Tokens**:
   ```bash
   # Visit StarkNet faucet
   # https://faucet.goerli.starknet.io/
   ```

2. **Setup Wallet**:
   ```bash
   # Install StarkNet CLI
   pip install starknet
   
   # Configure testnet
   export STARKNET_NETWORK=alpha-goerli
   ```

## Running the Application

### Development Mode

```bash
# Start with hot-reload
npm run dev

# Start with debugging
npm run dev:debug

# Start with specific environment
NODE_ENV=development npm run dev
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start

# Start with PM2 (recommended)
npm install -g pm2
pm2 start ecosystem.config.js
```

### Verification Steps

1. **Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Database Connection**:
   ```bash
   curl http://localhost:3000/api/status/database
   ```

3. **StarkNet Connection**:
   ```bash
   curl http://localhost:3000/api/status/blockchain
   ```

## Testing

### Test Structure
```
tests/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for API endpoints
├── e2e/           # End-to-end tests
└── fixtures/      # Test data and mocks
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "User Authentication"

# Watch mode for development
npm run test:watch
```

### Test Examples

#### Unit Test Example
```bash
npm run test:unit -- --grep "UserService"
```

Expected output:
```
  UserService
    ✓ should create a new user
    ✓ should validate user email
    ✓ should hash password correctly
    ✓ should update user profile

  4 passing (45ms)
```

#### Integration Test Example
```bash
npm run test:integration -- --grep "Auth API"
```

Expected output:
```
  Auth API
    POST /api/auth/register
      ✓ should register a new user
      ✓ should return 400 for invalid email
    POST /api/auth/login
      ✓ should login with valid credentials
      ✓ should return 401 for invalid credentials

  4 passing (120ms)
```

### Code Quality

```bash
# Linting
npm run lint

# Code formatting
npm run format

# Type checking
npm run type-check

# Pre-commit hooks
npm run pre-commit
```

## API Documentation

### Authentication Flow

#### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "countryCode": "US"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64f1b2a3c4d5e6f7g8h9i0j1",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "countryCode": "US",
      "kycLevel": "none"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

#### Wallet Authentication
```bash
curl -X POST http://localhost:3000/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890abcdef...",
    "signature": "0xabcdef1234567890...",
    "message": "Sign in to ChainRemit"
  }'
```

### Core API Endpoints

#### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/kyc` - Submit KYC documents

#### Transactions
- `POST /api/transactions/send` - Create new transaction
- `GET /api/transactions/:id` - Get transaction details
- `GET /api/transactions/history` - Get transaction history

#### Agents
- `GET /api/agents/nearby` - Find nearby agents
- `POST /api/agents/register` - Register as agent
- `PUT /api/agents/status` - Update agent status

### Error Handling

All API endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  },
  "timestamp": "2025-07-23T10:30:00.000Z",
  "requestId": "req_1234567890"
}
```

### Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **Transaction endpoints**: 20 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1690200600
```

### Swagger Documentation

Interactive API documentation available at:
- Development: http://localhost:3000/api-docs
- Staging: https://api-staging.chainremit.com/api-docs

## Docker

### Development with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### Production Docker

```bash
# Build production image
docker build -t chainremit-backend:latest .

# Run production container
docker run -d \
  --name chainremit-backend \
  -p 3000:3000 \
  --env-file .env.production \
  chainremit-backend:latest

# Health check
docker exec chainremit-backend curl http://localhost:3000/api/health
```

### Docker Compose Services

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    depends_on:
      - mongodb
      - postgres
      - redis

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password

  postgres:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=chainremit_transactions
      - POSTGRES_USER=chainremit_user
      - POSTGRES_PASSWORD=password

  redis:
    image: redis:6
    ports:
      - "6379:6379"
```

## CI/CD

### GitHub Actions Pipeline

The project uses GitHub Actions for continuous integration and deployment:

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run lint
```

### Deployment Checklist

#### Pre-deployment
- [ ] All tests passing
- [ ] Code coverage > 90%
- [ ] Security audit passed
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates updated

#### Production Deployment
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Backup procedures verified
- [ ] Rollback plan prepared
- [ ] Load balancer configured
- [ ] CDN cache cleared

### Monitoring and Logging

#### Health Check Endpoints
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status
- `GET /api/metrics` - Prometheus metrics

#### Logging Configuration
```javascript
// logs/
├── app.log          # Application logs
├── error.log        # Error logs
├── access.log       # HTTP access logs
└── audit.log        # Security audit logs
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](Contributing.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**:
   ```bash
   # Follow coding standards
   npm run lint
   npm run format
   ```

4. **Add tests**:
   ```bash
   npm run test:watch
   ```

5. **Commit your changes**:
   ```bash
   git commit -m "feat: add user authentication endpoint"
   ```

6. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- Use ESLint and Prettier configurations
- Follow conventional commit messages
- Maintain test coverage above 90%
- Document all public APIs
- Use TypeScript for type safety

### Pull Request Process

1. Update documentation for any API changes
2. Add tests for new functionality
3. Ensure all CI checks pass
4. Request review from maintainers
5. Address feedback promptly

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### Database Connection Issues

**MongoDB Connection Failed**:
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check connection
mongo --eval "db.adminCommand('ismaster')"
```

**PostgreSQL Connection Failed**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
psql -h localhost -U chainremit_user -d chainremit_transactions
```

#### StarkNet Connection Issues

**RPC Endpoint Not Responding**:
```bash
# Test RPC endpoint
curl -X POST https://starknet-sepolia.public.blastapi.io/rpc/v0_7 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"starknet_blockNumber","params":[],"id":1}'
```

**Invalid Contract Address**:
```bash
# Verify contract deployment
starknet get_code --contract_address <CONTRACT_ADDRESS>
```

#### Environment Issues

**Missing Environment Variables**:
```bash
# Validate environment
npm run validate-env

# Check required variables
node -e "console.log(process.env.STARKNET_RPC_URL)"
```

### Getting Help

- **Documentation**: Check our [wiki](https://github.com/MetroLogic/chainremit_backend/wiki)
- **Issues**: Report bugs via [GitHub Issues](https://github.com/MetroLogic/chainremit_backend/issues)
- **Discussions**: Join our [GitHub Discussions](https://github.com/MetroLogic/chainremit_backend/discussions)
- **Discord**: Connect with the community on [Discord](https://discord.gg/chainremit)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

### Community Resources

- **GitHub**: [MetroLogic/chainremit_backend](https://github.com/MetroLogic/chainremit_backend)
- **Documentation**: [docs.chainremit.com](https://docs.chainremit.com)
- **Discord**: [ChainRemit Community](https://discord.gg/chainremit)
- **Twitter**: [@ChainRemit](https://twitter.com/chainremit)

### Professional Support

For enterprise support, integration assistance, or custom development:
- **Email**: support@chainremit.com
- **Enterprise**: enterprise@chainremit.com

---

<p align="center">
  Made with ❤️ by the ChainRemit Team<br>
  <a href="https://chainremit.com">chainremit.com</a> | 
  <a href="https://docs.chainremit.com">Documentation</a> | 
  <a href="https://github.com/MetroLogic">GitHub</a>
</p>
