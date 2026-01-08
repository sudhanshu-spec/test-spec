# hao-backprop-test

A production-ready Node.js server demonstrating Express.js integration with enterprise-grade middleware, structured logging, and PM2 deployment capabilities.

> **Note**: This is a test project for backprop integration, enhanced with production-ready features.

## Prerequisites

Before running this application, ensure you have the following installed:

| Requirement | Minimum Version | Recommended Version |
|-------------|-----------------|---------------------|
| Node.js | 18.x | 20.19.x (LTS) |
| npm | 8.x | 10.8.x |

### Verify Installation

```bash
node --version
# Expected: v20.x.x or higher

npm --version
# Expected: 10.x.x or higher
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd hao-backprop-test
```

2. Install dependencies:

```bash
npm install
```

This will install Express.js (^5.1.0) and all required dependencies.

## Usage

### Start the Server

Run the server with default configuration:

```bash
npm start
```

**Expected output:**
```
Server running at http://127.0.0.1:3000/
```

### Custom Configuration

Override default settings using environment variables:

```bash
# Custom host and port
HOST=0.0.0.0 PORT=8080 npm start

# Production mode
NODE_ENV=production npm start

# Combined configuration
HOST=0.0.0.0 PORT=8080 NODE_ENV=production npm start
```

## API Reference

This server exposes multiple HTTP endpoints for application functionality and operational health monitoring:

### GET `/`

Returns a greeting message.

**Request:**
```bash
curl -s http://127.0.0.1:3000/
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** `Hello, World!\n` (14 characters, includes trailing newline)

**Example:**
```bash
curl -s http://127.0.0.1:3000/
# Output: Hello, World!
```

### GET `/evening`

Returns an evening greeting message.

**Request:**
```bash
curl -s http://127.0.0.1:3000/evening
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** `Good evening` (12 characters, no trailing newline)

**Example:**
```bash
curl -s http://127.0.0.1:3000/evening
# Output: Good evening
```

### Health Check Endpoints

The application provides dedicated health check endpoints for monitoring and load balancer integration:

#### GET `/health`

Basic liveness check endpoint.

**Request:**
```bash
curl -s http://127.0.0.1:3000/health
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:** `{"status":"ok","timestamp":"<ISO-8601>"}`

#### GET `/health/ready`

Readiness probe for deployment orchestration. Indicates the application is ready to receive traffic.

**Request:**
```bash
curl -s http://127.0.0.1:3000/health/ready
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:** `{"status":"ready","timestamp":"<ISO-8601>"}`

#### GET `/health/live`

Kubernetes-compatible liveness probe.

**Request:**
```bash
curl -s http://127.0.0.1:3000/health/live
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:** `{"status":"live","timestamp":"<ISO-8601>"}`

### Quick Health Verification

Verify all endpoints are operational:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
curl -s http://127.0.0.1:3000/health | jq . && echo " - Health OK"
```

## Project Structure

```
hao-backprop-test/
├── server.js                    # Entry point - HTTP server binding with graceful shutdown
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── .env.example                 # Environment variable template
├── jest.config.js               # Jest test framework configuration
├── ecosystem.config.js          # PM2 process manager configuration
├── src/                         # Application source root
│   ├── app.js                   # Express application factory with middleware stack
│   ├── config/                  # Configuration module
│   │   └── index.js             # Environment variable management with dotenv
│   ├── middleware/              # Express middleware modules
│   │   ├── index.js             # Middleware barrel export
│   │   ├── error.middleware.js  # Centralized error handling (404, 500)
│   │   └── request-id.middleware.js  # UUID request tracking
│   ├── routes/                  # Routing surface
│   │   ├── index.js             # Route aggregator (barrel pattern)
│   │   ├── main.routes.js       # Main route handlers (/, /evening)
│   │   ├── health.routes.js     # Health check endpoints
│   │   └── api.routes.js        # Versioned API routes
│   └── utils/                   # Utility modules
│       └── logger.js            # Winston logger configuration
└── tests/                       # Test suite root
    ├── unit/                    # Isolated module tests
    │   ├── config.test.js       # Configuration module tests
    │   ├── routes.test.js       # Route handler tests
    │   ├── middleware.test.js   # Middleware module tests
    │   └── logger.test.js       # Logger utility tests
    ├── integration/             # HTTP endpoint tests
    │   └── endpoints.test.js    # API endpoint contract tests
    └── lifecycle/               # Server lifecycle tests
        └── server.test.js       # Startup/shutdown/graceful tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app, binds to host/port, handles graceful shutdown signals |
| `ecosystem.config.js` | PM2 process manager configuration for cluster mode and multi-environment deployments |
| `.env.example` | Environment variable template documenting all configuration options |
| `src/app.js` | Express application factory with full middleware stack and route mounting |
| `src/config/index.js` | Configuration module with dotenv - exports `{ host, port, env, logLevel, logFormat, corsOrigin, pm2Instances }` |
| `src/middleware/index.js` | Middleware barrel export - aggregates error and request-id middleware |
| `src/middleware/error.middleware.js` | Centralized error handling - `notFoundHandler` (404) and `errorHandler` (500) |
| `src/middleware/request-id.middleware.js` | UUID request tracking - attaches unique ID to each request for tracing |
| `src/routes/index.js` | Route aggregator using barrel pattern - exports mainRoutes, healthRoutes, apiRoutes |
| `src/routes/main.routes.js` | Main route handlers - implements GET `/` and GET `/evening` endpoints |
| `src/routes/health.routes.js` | Health check routes - `/health`, `/health/ready`, `/health/live` endpoints |
| `src/routes/api.routes.js` | Versioned API routes structure for future API expansion |
| `src/utils/logger.js` | Winston logger configuration with environment-aware transports and morgan integration |

## Environment Variables

The application supports the following environment variables for configuration:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `LOG_LEVEL` | `'info'` | Logging verbosity level (`error`, `warn`, `info`, `http`, `debug`). |
| `LOG_FORMAT` | `'combined'` | Morgan HTTP log format (`combined`, `common`, `dev`, `short`, `tiny`). |
| `CORS_ORIGIN` | `'*'` | Allowed CORS origins. Use specific domain in production. |
| `PM2_INSTANCES` | `0` | Number of PM2 cluster instances. Use `0` for auto-detection (max CPUs). |

### Configuration Examples

**Development (default):**
```bash
npm start
# Binds to http://127.0.0.1:3000/
```

**Development with debug logging:**
```bash
LOG_LEVEL=debug npm run start:dev
# Colorized console output with verbose logging
```

**Production deployment:**
```bash
HOST=0.0.0.0 PORT=80 NODE_ENV=production npm run start:prod
# Binds to http://0.0.0.0:80/ with JSON logging
```

**Production with PM2:**
```bash
npm run pm2:start
# Cluster mode with auto-detected instances
```

**Custom port:**
```bash
PORT=8080 npm start
# Binds to http://127.0.0.1:8080/
```

### Using .env Files

Copy the example file and configure your environment:

```bash
cp .env.example .env
# Edit .env with your configuration
```

The application automatically loads `.env` files via `dotenv` when starting.

## Architecture

This project follows a modular Express.js architecture with separation of concerns:

```
Request Flow:
Client → server.js → Express App (src/app.js) → Router (src/routes/) → Response
                           ↑
                     Configuration
                   (src/config/index.js)
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` aggregates route exports for clean imports
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables
- **Middleware Pattern**: Composable request/response processing pipeline

## Middleware Stack

The application implements a comprehensive middleware stack for security, performance, and observability:

```
Request Flow:
┌─────────────────────────────────────────────────────────────────┐
│                     Incoming HTTP Request                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. helmet()              │ Security headers (CSP, X-Frame, etc.) │
├─────────────────────────────────────────────────────────────────┤
│ 2. compression()         │ gzip/deflate response compression    │
├─────────────────────────────────────────────────────────────────┤
│ 3. cors()                │ Cross-Origin Resource Sharing        │
├─────────────────────────────────────────────────────────────────┤
│ 4. express.json()        │ JSON body parsing (100kb limit)      │
├─────────────────────────────────────────────────────────────────┤
│ 5. express.urlencoded()  │ URL-encoded form parsing             │
├─────────────────────────────────────────────────────────────────┤
│ 6. requestIdMiddleware   │ UUID request tracking (X-Request-ID) │
├─────────────────────────────────────────────────────────────────┤
│ 7. morgan()              │ HTTP request logging → winston       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Route Handlers                              │
│    healthRoutes (/health/*) │ mainRoutes (/, /evening)          │
│    apiRoutes (/api/*)                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. notFoundHandler       │ 404 Not Found responses              │
├─────────────────────────────────────────────────────────────────┤
│ 9. errorHandler          │ 500 Error responses (env-aware)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HTTP Response                                │
└─────────────────────────────────────────────────────────────────┘
```

### Middleware Details

| Middleware | Package | Purpose |
|------------|---------|---------|
| `helmet()` | helmet | Sets secure HTTP headers (Content-Security-Policy, X-Content-Type-Options, X-Frame-Options) |
| `compression()` | compression | Compresses responses using gzip/deflate for performance optimization |
| `cors()` | cors | Handles Cross-Origin Resource Sharing with configurable origins |
| `express.json()` | express | Parses JSON request bodies (Content-Type: application/json) |
| `express.urlencoded()` | express | Parses URL-encoded form data (Content-Type: application/x-www-form-urlencoded) |
| `requestIdMiddleware` | custom + uuid | Generates unique UUID for each request, attaches to `req.id` and `X-Request-ID` header |
| `morgan()` | morgan | HTTP request logging with configurable format, pipes to winston logger |
| `notFoundHandler` | custom | Returns 404 JSON response for unmatched routes |
| `errorHandler` | custom | Centralized error handling with environment-aware responses (stack traces in dev only) |

### Error Handling

**Development mode (`NODE_ENV=development`):**
```json
{
  "error": {
    "message": "Error message",
    "stack": "Full stack trace..."
  },
  "requestId": "uuid-v4"
}
```

**Production mode (`NODE_ENV=production`):**
```json
{
  "error": {
    "message": "Internal Server Error"
  },
  "requestId": "uuid-v4"
}
```

## Logging

The application uses Winston for structured logging with Morgan integration for HTTP request logging.

### Log Levels

| Level | Priority | Usage |
|-------|----------|-------|
| `error` | 0 | Application errors, exceptions, failures |
| `warn` | 1 | Warning conditions, deprecation notices |
| `info` | 2 | Normal operational messages, startup/shutdown |
| `http` | 3 | HTTP request/response logging (via morgan) |
| `debug` | 4 | Detailed debugging information |

### Environment-Specific Formats

| Environment | Format | Output |
|-------------|--------|--------|
| `development` | Colorized | Human-readable console output with colors |
| `production` | JSON | Structured JSON for log aggregation systems |
| `test` | Silent | Minimal output to reduce test noise |

### Log Configuration

```bash
# Set log level
LOG_LEVEL=debug npm start

# Set HTTP log format
LOG_FORMAT=dev npm start  # Colorized, concise output
LOG_FORMAT=combined npm start  # Apache combined format
```

### Logger Usage

```javascript
const { logger } = require('./src/utils/logger');

logger.info('Server started');
logger.error('Database connection failed', { error: err.message });
logger.debug('Request details', { path: req.path, method: req.method });
```

### Morgan Integration

HTTP requests are logged through Morgan, which pipes to the Winston logger:

```
# Development format (LOG_FORMAT=dev)
GET /health 200 2.345 ms - 45

# Production format (LOG_FORMAT=combined)
{"level":"http","message":"::1 - - [01/Jan/2025:00:00:00 +0000] \"GET /health HTTP/1.1\" 200 45","timestamp":"2025-01-01T00:00:00.000Z"}
```

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `dotenv` | ^16.4.7 | Load environment variables from `.env` files |
| `winston` | ^3.17.0 | Structured logging with multiple transports |
| `morgan` | ^1.10.0 | HTTP request logging middleware for Express |
| `helmet` | ^8.0.0 | Security middleware setting secure HTTP headers |
| `compression` | ^1.7.5 | Response compression middleware (gzip/deflate) |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| `uuid` | ^11.0.3 | RFC4122 UUID generation for request IDs |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify key installations
npm ls express winston helmet
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server |
| `start:dev` | `NODE_ENV=development node server.js` | Development mode with debug logging |
| `start:prod` | `NODE_ENV=production node server.js` | Production mode single instance |
| `test` | `jest` | Run the complete test suite |
| `test:watch` | `jest --watch` | Run tests in watch mode for development |
| `test:coverage` | `jest --coverage` | Run tests and generate coverage report |
| `test:ci` | `jest --ci --coverage` | Run tests optimized for CI/CD environments |
| `pm2:start` | `pm2 start ecosystem.config.js` | Start application via PM2 |
| `pm2:stop` | `pm2 stop ecosystem.config.js` | Stop PM2 managed processes |
| `pm2:restart` | `pm2 restart ecosystem.config.js` | Hard restart PM2 processes |
| `pm2:reload` | `pm2 reload ecosystem.config.js` | Zero-downtime reload |
| `pm2:logs` | `pm2 logs` | View PM2 process logs |
| `pm2:monit` | `pm2 monit` | PM2 real-time monitoring dashboard |

## PM2 Deployment

This application is optimized for production deployment using PM2 process manager with cluster mode support.

### Prerequisites

Install PM2 globally:

```bash
npm install -g pm2
```

### Ecosystem Configuration

The `ecosystem.config.js` file defines deployment configurations:

| Parameter | Development | Staging | Production |
|-----------|-------------|---------|------------|
| `instances` | 1 | 2 | `'max'` (auto-detect CPUs) |
| `exec_mode` | `'fork'` | `'cluster'` | `'cluster'` |
| `max_memory_restart` | `'200M'` | `'500M'` | `'1G'` |
| `NODE_ENV` | `'development'` | `'staging'` | `'production'` |
| `LOG_LEVEL` | `'debug'` | `'info'` | `'info'` |

### Starting with PM2

```bash
# Start with default configuration (production)
npm run pm2:start

# Start with specific environment
pm2 start ecosystem.config.js --env development
pm2 start ecosystem.config.js --env staging
pm2 start ecosystem.config.js --env production
```

### Process Management

```bash
# View running processes
pm2 list

# View process details
pm2 show hao-backprop-test

# Stop all processes
npm run pm2:stop

# Restart (hard restart)
npm run pm2:restart

# Reload (zero-downtime)
npm run pm2:reload

# Delete from PM2
pm2 delete ecosystem.config.js
```

### Monitoring

```bash
# Real-time monitoring dashboard
npm run pm2:monit

# View logs
npm run pm2:logs

# View logs for specific process
pm2 logs hao-backprop-test --lines 100
```

### Graceful Shutdown

The application handles `SIGTERM` and `SIGINT` signals for graceful shutdown:

1. Stop accepting new connections
2. Drain existing connections (30-second timeout)
3. Log shutdown completion
4. Exit cleanly

This enables zero-downtime deployments with `pm2 reload`:

```bash
# Zero-downtime deployment
npm run pm2:reload
```

### PM2 Startup Script

To persist PM2 processes across server reboots:

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save

# Restore on reboot (automatic)
```

### Health Check Integration

PM2 monitors the `/health` endpoint for process health:

```javascript
// ecosystem.config.js
{
  wait_ready: true,
  listen_timeout: 3000
}
```

The server sends `process.send('ready')` after successful startup.

## Testing

This project includes a comprehensive test suite built with **Jest 30.x** and **Supertest** for HTTP endpoint testing.

### Test Execution Commands

| Purpose | Command | Description |
|---------|---------|-------------|
| Run all tests | `npm test` | Execute the complete test suite |
| Watch mode | `npm run test:watch` | Re-run tests automatically on file changes |
| Coverage report | `npm run test:coverage` | Generate detailed code coverage metrics |
| CI execution | `npm run test:ci` | Optimized execution for CI/CD pipelines |
| Single file | `npx jest tests/unit/config.test.js` | Run a specific test file |
| Pattern match | `npx jest --testPathPatterns="config"` | Run tests matching a pattern |

### Test Structure

The test suite is organized into three categories based on test scope:

```
tests/
├── unit/                    # Isolated module tests
│   ├── config.test.js       # Configuration defaults and parsing
│   ├── routes.test.js       # Route handler exports verification
│   ├── middleware.test.js   # Middleware module tests
│   └── logger.test.js       # Logger utility tests
├── integration/             # HTTP endpoint tests
│   └── endpoints.test.js    # API contract tests (incl. health checks)
└── lifecycle/               # Server lifecycle tests
    └── server.test.js       # Startup, shutdown, and graceful tests
```

| Directory | Purpose | Test Approach |
|-----------|---------|---------------|
| `tests/unit/` | Test isolated modules without HTTP | Direct module imports with Jest assertions |
| `tests/integration/` | Test HTTP endpoint responses | Supertest requests against the Express app |
| `tests/lifecycle/` | Test server startup/shutdown | Mock-based lifecycle verification |

### Coverage Targets

The project enforces the following code coverage thresholds:

| Coverage Metric | Target | Description |
|-----------------|--------|-------------|
| Line Coverage | ≥ 80% | Percentage of code lines executed by tests |
| Branch Coverage | ≥ 75% | Percentage of conditional branches tested |
| Function Coverage | ≥ 90% | Percentage of functions called by tests |
| Statement Coverage | ≥ 80% | Percentage of statements executed by tests |

**Generate and view coverage report:**
```bash
npm run test:coverage
# Coverage report generated in ./coverage/
# Open ./coverage/lcov-report/index.html for detailed HTML report
```

### Test Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | JavaScript testing framework and test runner |
| `supertest` | ^7.1.4 | HTTP assertion library for Express endpoint testing |

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Error: listen EADDRINUSE: address already in use
# Solution: Use a different port
PORT=3001 npm start
```

**Permission denied on port 80:**
```bash
# Error: listen EACCES: permission denied
# Solution: Use a port above 1024 or run with elevated privileges
PORT=8080 npm start
```

**Module not found:**
```bash
# Error: Cannot find module 'express'
# Solution: Install dependencies
npm install
```

**PM2 not found:**
```bash
# Error: pm2: command not found
# Solution: Install PM2 globally
npm install -g pm2
```

**PM2 processes not starting:**
```bash
# Check PM2 logs for errors
pm2 logs --lines 50

# Check ecosystem.config.js syntax
node -e "require('./ecosystem.config.js')"
```

**Environment variables not loading:**
```bash
# Ensure .env file exists
cp .env.example .env

# Verify dotenv is installed
npm ls dotenv
```

**Graceful shutdown not completing:**
```bash
# Check for long-running connections
# Increase shutdown timeout if needed
# Review server logs for connection drain status
pm2 logs hao-backprop-test
```

**CORS errors in browser:**
```bash
# Set appropriate CORS origin
CORS_ORIGIN=http://localhost:3001 npm start

# For development (allow all)
CORS_ORIGIN=* npm start
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a production-ready Node.js server demonstrating Express.js with enterprise-grade middleware, logging, and PM2 deployment capabilities.*
