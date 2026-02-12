# hao-backprop-test

A Node.js tutorial server demonstrating Express.js integration with multiple HTTP endpoints.

> **Note**: This is a test project for backprop integration.

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

3. Set up environment configuration:

```bash
cp .env.example .env
```

Edit `.env` to customize settings for your environment. The application runs with sensible defaults if no `.env` file is present.

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

### PM2 Production Deployment

Run the server under PM2 process management for production use:

```bash
# Start with PM2 (cluster mode, all CPU cores)
npm run pm2:start

# Restart all instances
npm run pm2:restart

# Stop all instances
npm run pm2:stop
```

PM2 reads its configuration from `ecosystem.config.js` at the repository root. See the [PM2 Deployment](#pm2-deployment) section for details.

## API Reference

This server exposes three HTTP GET endpoints:

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

### GET `/health`

Returns a JSON health check response for PM2 and load balancer probing.

**Request:**
```bash
curl -s http://127.0.0.1:3000/health
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:** `{ "status": "ok", "uptime": <seconds>, "timestamp": <epoch_ms> }`

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"ok"` when the server is running |
| `uptime` | number | Process uptime in seconds (`process.uptime()`) |
| `timestamp` | number | Current time in milliseconds since epoch (`Date.now()`) |

**Example:**
```bash
curl -s http://127.0.0.1:3000/health | jq .
# Output:
# {
#   "status": "ok",
#   "uptime": 42.123,
#   "timestamp": 1700000000000
# }
```

### Quick Health Check

Verify all endpoints are operational:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
curl -s http://127.0.0.1:3000/health && echo " - Health OK"
```

## Project Structure

```
hao-backprop-test/
├── server.js                    # Entry point - HTTP server binding, graceful shutdown
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── ecosystem.config.js          # PM2 process manager configuration
├── .env.example                 # Environment variable template
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── jest.config.js               # Jest test framework configuration
├── src/                         # Application source root
│   ├── app.js                   # Express application factory with middleware pipeline
│   ├── config/                  # Configuration layer
│   │   ├── index.js             # Environment variable management
│   │   └── logger.js            # Winston structured logging factory
│   ├── middleware/              # Application middleware
│   │   ├── index.js             # Middleware aggregator (barrel pattern)
│   │   ├── errorHandler.js      # Centralized error-handling middleware
│   │   └── requestLogger.js     # Morgan/Winston HTTP request logger
│   └── routes/                  # Routing surface
│       ├── index.js             # Route aggregator (barrel pattern)
│       ├── main.routes.js       # Main route handlers (/, /evening)
│       └── health.routes.js     # Health check endpoint (/health)
└── tests/                       # Test suite root
    ├── unit/                    # Isolated module tests
    │   ├── config.test.js       # Configuration module tests
    │   ├── routes.test.js       # Route handler tests
    │   ├── logger.test.js       # Winston logger tests
    │   ├── middleware.test.js   # Middleware module tests
    │   └── health.routes.test.js # Health route tests
    ├── integration/             # HTTP endpoint tests
    │   ├── endpoints.test.js    # API endpoint contract tests
    │   └── middleware.test.js   # Middleware pipeline tests
    └── lifecycle/               # Server lifecycle tests
        └── server.test.js       # Startup/shutdown/signal tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that loads dotenv, imports the Express app, binds it to the configured host/port, and handles graceful shutdown signals |
| `ecosystem.config.js` | PM2 ecosystem configuration for cluster mode deployment with environment-specific settings |
| `.env.example` | Template documenting all supported environment variables with default values |
| `src/app.js` | Express application factory - creates and exports configured Express app with middleware pipeline and mounted routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env, logLevel, corsOrigin, nodeEnv }` from environment variables |
| `src/config/logger.js` | Winston logger factory - singleton with Console and File transports for structured logging |
| `src/middleware/index.js` | Middleware aggregator using barrel pattern - centralizes middleware exports |
| `src/middleware/errorHandler.js` | Centralized error-handling middleware - logs errors via Winston, returns structured JSON responses |
| `src/middleware/requestLogger.js` | HTTP request logger - Morgan middleware configured with Winston write stream |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports |
| `src/routes/main.routes.js` | Main route handlers - implements GET `/` and GET `/evening` endpoints |
| `src/routes/health.routes.js` | Health check handler - implements GET `/health` returning JSON status |

## Environment Variables

The application supports the following environment variables for configuration. All variables have sensible defaults and the application runs without a `.env` file.

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `LOG_LEVEL` | `'info'` | Winston logging level. Valid values: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`. |
| `CORS_ORIGIN` | `'*'` | Allowed CORS origin(s) for cross-origin requests. Set to a specific domain in production. |

### Configuration Examples

**Development (default):**
```bash
npm start
# Binds to http://127.0.0.1:3000/
```

**Production deployment:**
```bash
HOST=0.0.0.0 PORT=80 NODE_ENV=production npm start
# Binds to http://0.0.0.0:80/
```

**Custom port:**
```bash
PORT=8080 npm start
# Binds to http://127.0.0.1:8080/
```

## Middleware Pipeline

The Express application processes every request through a layered middleware pipeline registered in `src/app.js`. Middleware executes in the order listed below:

| Order | Middleware | Module | Purpose |
|-------|-----------|--------|---------|
| 1 | **Helmet** | `helmet` | Sets 13 HTTP security headers (CSP, HSTS, X-Content-Type-Options, etc.) |
| 2 | **CORS** | `cors` | Adds `Access-Control-Allow-Origin` and related cross-origin headers |
| 3 | **Morgan/Winston** | `src/middleware/requestLogger.js` | Logs HTTP requests (method, URL, status, response time) via Winston |
| 4 | **Body Parser** | `express.json()` | Parses incoming JSON request bodies (100kb default limit) |
| 5 | **Routes** | `src/routes/` | Matches and handles request to defined endpoints |
| 6 | **Error Handler** | `src/middleware/errorHandler.js` | Catches unhandled errors, logs via Winston, returns structured JSON |

### Request Flow

```
Incoming Request
    │
    ▼
┌─────────────────────┐
│  Helmet (Security)   │  ← Sets security headers on every response
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  CORS (Headers)      │  ← Handles cross-origin preflight and response headers
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Morgan (Logging)    │  ← Logs request to Winston transports
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  express.json()      │  ← Parses JSON request bodies
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Route Matching      │  ← GET /, GET /evening, GET /health
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
 Response   Error Thrown
              │
              ▼
    ┌─────────────────────┐
    │  Error Handler       │  ← Logs error, returns JSON error response
    └─────────┬───────────┘
              ▼
           Response
```

### Error Response Format

When an unhandled error occurs, the error handler returns a structured JSON response:

```json
{
  "status": "error",
  "statusCode": 500,
  "message": "Internal Server Error"
}
```

In development mode (`NODE_ENV=development`), the response includes a `stack` field with the full stack trace. Stack traces are omitted in production to prevent information leakage.

## Architecture

This project follows a modular Express.js architecture with separation of concerns:

```
Request Flow:
Client → server.js → Helmet → CORS → Morgan → express.json() → Router → Response
                                                                    │
                                                              Error Handler
                                                                    │
                                                              Error Response

Layers:
┌──────────────────────────────────────────────────────────────┐
│  Entry Layer        │  server.js (dotenv, listen, shutdown)  │
├──────────────────────────────────────────────────────────────┤
│  Application Layer  │  src/app.js (middleware + routes)      │
├──────────────────────────────────────────────────────────────┤
│  Middleware Layer    │  src/middleware/ (security, logging,   │
│                     │  error handling)                       │
├──────────────────────────────────────────────────────────────┤
│  Routing Layer      │  src/routes/ (endpoint handlers)       │
├──────────────────────────────────────────────────────────────┤
│  Configuration Layer│  src/config/ (env vars, logging)       │
└──────────────────────────────────────────────────────────────┘
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` and `src/middleware/index.js` aggregate module exports for clean single-import interfaces
- **Singleton Pattern**: `src/config/logger.js` exports a single Winston logger instance reused across all modules
- **Middleware Chain Pattern**: Middleware registered in `src/app.js` executes in registration order, forming a request processing pipeline
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables via `dotenv` and `src/config/index.js`

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `cors` | ^2.8.6 | CORS middleware — sets Access-Control-Allow-Origin and related response headers |
| `helmet` | ^8.1.0 | Security middleware — sets 13 HTTP security headers (CSP, HSTS, etc.) |
| `morgan` | ^1.10.1 | HTTP request logger — logs method, URL, status, and response time |
| `winston` | ^3.19.0 | Structured logging — JSON formatting, multiple transports, configurable levels |
| `dotenv` | ^16.4.7 | Environment configuration — parses `.env` files and populates `process.env` |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | JavaScript testing framework and test runner |
| `supertest` | ^7.1.4 | HTTP assertion library for Express endpoint testing |
| `pm2` | ^6.0.14 | Process manager — cluster mode, auto-restart, and log management |

### Dependency Installation

```bash
# Install all dependencies (production + development)
npm install

# Verify key packages
npm ls express cors helmet morgan winston dotenv
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server |
| `test` | `jest` | Run the complete test suite |
| `test:watch` | `jest --watch` | Run tests in watch mode for development |
| `test:coverage` | `jest --coverage` | Run tests and generate coverage report |
| `test:ci` | `jest --ci --coverage` | Run tests optimized for CI/CD environments |
| `pm2:start` | `pm2 start ecosystem.config.js` | Start the application under PM2 process manager |
| `pm2:stop` | `pm2 stop ecosystem.config.js` | Stop all PM2-managed application instances |
| `pm2:restart` | `pm2 restart ecosystem.config.js` | Restart all PM2-managed application instances |

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
├── unit/                        # Isolated module tests
│   ├── config.test.js           # Configuration defaults and parsing
│   ├── routes.test.js           # Route handler exports verification
│   ├── logger.test.js           # Winston logger factory tests
│   ├── middleware.test.js       # Error handler and request logger tests
│   └── health.routes.test.js   # Health route stack inspection tests
├── integration/                 # HTTP endpoint tests
│   ├── endpoints.test.js        # API contract tests using Supertest
│   └── middleware.test.js       # Middleware pipeline integration tests
└── lifecycle/                   # Server lifecycle tests
    └── server.test.js           # Startup, shutdown, and signal handling
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

## Structured Logging

The application uses [Winston](https://github.com/winstonjs/winston) for structured logging, replacing `console.log` with a configurable, transport-based logging system.

### Log Levels

Winston log levels follow the npm logging convention (highest to lowest severity):

| Level | Usage |
|-------|-------|
| `error` | Runtime errors and exceptions |
| `warn` | Warning conditions that may require attention |
| `info` | General operational messages (default level) |
| `http` | HTTP request logging |
| `verbose` | Detailed operational information |
| `debug` | Debug-level diagnostic messages |
| `silly` | Extremely verbose trace-level output |

Set the active log level via the `LOG_LEVEL` environment variable. All messages at and above the configured level are emitted.

### Log Transports

| Transport | File | Contents |
|-----------|------|----------|
| Console | stdout | All log levels. Colorized in development, JSON in production. |
| File (errors) | `logs/error.log` | Error-level messages only |
| File (combined) | `logs/combined.log` | All log levels |

### Log Formats

- **Development** (`NODE_ENV=development`): Colorized, human-readable output on the console for easy debugging.
- **Production** (`NODE_ENV=production`): JSON-formatted output on all transports for machine parsing by log aggregation systems.

### HTTP Access Logging

HTTP requests are logged via [Morgan](https://github.com/expressjs/morgan) integrated with Winston through a custom write stream. Morgan uses the `combined` format in production (full Apache-style access logs) and `dev` format in development (concise, colorized output).

## PM2 Deployment

The application is configured for production deployment with [PM2](https://pm2.keymetrics.io/), a Node.js process manager providing cluster mode, auto-restart, and log management.

### Configuration

PM2 reads its configuration from `ecosystem.config.js` at the repository root:

| Setting | Value | Description |
|---------|-------|-------------|
| `name` | `hello-world` | Application name in PM2 process list |
| `script` | `server.js` | Entry point script |
| `instances` | `max` | Number of worker processes (uses all CPU cores) |
| `exec_mode` | `cluster` | Enables Node.js cluster mode for multi-core utilization |
| `max_memory_restart` | `256M` | Automatically restart if memory exceeds threshold |

### PM2 Commands

```bash
# Start in cluster mode
npm run pm2:start

# View running processes
npx pm2 list

# Monitor in real-time
npx pm2 monit

# View logs
npx pm2 logs

# Restart with zero downtime
npm run pm2:restart

# Stop all instances
npm run pm2:stop
```

### Graceful Shutdown

The server handles `SIGINT` and `SIGTERM` signals for graceful shutdown. When a signal is received:

1. The server stops accepting new connections via `server.close()`
2. In-flight requests are allowed to complete
3. The shutdown event is logged via Winston
4. The process exits cleanly with code `0`

This ensures zero-downtime restarts during PM2 deployments and prevents abrupt connection drops.

### PM2 Log Files

| File | Contents |
|------|----------|
| `logs/pm2-out.log` | Standard output from all instances |
| `logs/pm2-error.log` | Error output from all instances |

All PM2 log files are written to the `logs/` directory, which is gitignored.

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

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating production-grade Node.js server development with Express.js framework, structured logging, and PM2 process management.*
