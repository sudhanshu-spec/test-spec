# hao-backprop-test

A production-ready Node.js tutorial server demonstrating Express.js integration with middleware pipeline, structured logging, environment configuration, and PM2 process management.

> **Note**: This is a test project for backprop integration.

## Prerequisites

Before running this application, ensure you have the following installed:

| Requirement | Minimum Version | Recommended Version | Purpose |
|-------------|-----------------|---------------------|---------|
| Node.js | 18.x | 20.19.x (LTS) | JavaScript runtime |
| npm | 8.x | 10.8.x | Package manager |
| PM2 | 5.x | 6.0.x | Production process manager (optional) |

### Install PM2 (Optional — for production deployment)

```bash
npm install -g pm2
```

### Verify Installation

```bash
node --version
# Expected: v20.x.x or higher

npm --version
# Expected: 10.x.x or higher

pm2 --version
# Expected: 6.x.x (if installed)
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

3. Configure environment (optional):

```bash
cp .env.example .env
```

Edit `.env` to customize settings for your local environment. The application works without a `.env` file using sensible defaults.

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

### Environment File Configuration

The application supports a `.env` file for convenient configuration. Copy the provided template:

```bash
cp .env.example .env
```

Edit the `.env` file to customize variables such as `HOST`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `APP_NAME`, and `CORS_ORIGIN`. The application works without a `.env` file — all configuration values have sensible defaults defined in `src/config/index.js`.

### Production Mode

Start the server in production mode:

```bash
npm run start:prod
```

This sets `NODE_ENV=production`, which enables file-based logging (`logs/error.log`, `logs/combined.log`) and optimized middleware behavior.

### PM2 Deployment

Start the server with PM2 process manager in cluster mode:

```bash
npm run start:pm2
```

Common PM2 management commands:

```bash
pm2 status              # View process status
pm2 logs                # Stream live logs
pm2 stop hello_world    # Stop the application
pm2 restart hello_world # Restart the application
pm2 delete hello_world  # Remove from PM2 process list
```

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

Returns a JSON health check response for monitoring and load balancer integration.

**Request:**
```bash
curl -s http://127.0.0.1:3000/health
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:**
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "environment": "development"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"ok"` when the server is healthy |
| `uptime` | number | Process uptime in seconds (`process.uptime()`) |
| `timestamp` | string | ISO 8601 timestamp of the response |
| `environment` | string | Current `NODE_ENV` value |

**Example:**
```bash
curl -s http://127.0.0.1:3000/health | jq .
```

### Endpoint Verification

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
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── .env.example                 # Environment variable template
├── jest.config.js               # Jest test framework configuration
├── ecosystem.config.js          # PM2 process manager configuration
├── logs/                        # Log file output directory (git-ignored)
│   └── .gitkeep                 # Placeholder to preserve directory in VCS
├── src/                         # Application source root
│   ├── app.js                   # Express application factory with middleware pipeline
│   ├── config/                  # Configuration module
│   │   └── index.js             # Environment variable management
│   ├── middleware/               # Express middleware modules
│   │   ├── index.js             # Middleware barrel (aggregator)
│   │   ├── errorHandler.js      # Centralized error handling middleware
│   │   ├── notFound.js          # 404 catch-all middleware
│   │   └── requestLogger.js     # Morgan HTTP request logger (via Winston)
│   ├── routes/                  # Routing surface
│   │   ├── index.js             # Route aggregator (barrel pattern)
│   │   ├── main.routes.js       # Main route handlers (GET /, GET /evening)
│   │   └── health.routes.js     # Health check endpoint (GET /health)
│   └── utils/                   # Utility modules
│       └── logger.js            # Winston structured logger
└── tests/                       # Test suite root
    ├── unit/                    # Isolated module tests
    │   ├── config.test.js       # Configuration module tests
    │   ├── routes.test.js       # Route handler tests
    │   ├── middleware.test.js   # Middleware module tests
    │   └── logger.test.js       # Logger module tests
    ├── integration/             # HTTP endpoint tests
    │   ├── endpoints.test.js    # API endpoint contract tests
    │   └── health.test.js       # Health endpoint tests
    └── lifecycle/               # Server lifecycle tests
        └── server.test.js       # Startup/shutdown tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app and binds it to the configured host/port. Loads `.env` via dotenv, uses Winston logger, handles graceful shutdown signals (SIGINT/SIGTERM), and sends PM2 ready signal. |
| `src/app.js` | Express application factory - creates and exports configured Express app with full middleware pipeline and mounted routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env, logLevel, appName, corsOrigin }` from environment variables |
| `src/middleware/index.js` | Middleware barrel - aggregates and exports all middleware modules (errorHandler, notFound, requestLogger) |
| `src/middleware/errorHandler.js` | Centralized Express error-handling middleware (4-argument signature) with structured JSON error responses and Winston logging |
| `src/middleware/notFound.js` | 404 catch-all middleware for unmatched routes, returns structured JSON response |
| `src/middleware/requestLogger.js` | Morgan HTTP request logger middleware configured to stream to the Winston logger |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports (mainRoutes, healthRoutes) |
| `src/routes/main.routes.js` | Route handlers - implements GET `/` and GET `/evening` endpoints |
| `src/routes/health.routes.js` | Health check route - implements GET `/health` returning JSON status, uptime, timestamp, and environment |
| `src/utils/logger.js` | Winston structured logger with console and file transports, configurable log levels, environment-aware formatting |
| `ecosystem.config.js` | PM2 ecosystem configuration with cluster mode, environment-specific settings, log paths, and restart policies |
| `.env.example` | Environment variable template with documented defaults for developer onboarding |

## Environment Variables

The application supports the following environment variables for configuration. All variables have sensible defaults and can be set via a `.env` file or directly in the shell.

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `LOG_LEVEL` | `'info'` | Winston logging level (`error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`). |
| `APP_NAME` | `'hello_world'` | Application identifier used in log entries and PM2 process name. |
| `CORS_ORIGIN` | `'*'` | Allowed CORS origins. Use `*` for all origins or a specific URL for restricted access. |

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

**Verbose logging:**
```bash
LOG_LEVEL=debug npm start
# Enables debug-level log output
```

**Restricted CORS:**
```bash
CORS_ORIGIN=https://example.com npm start
# Only allows requests from https://example.com
```

## Architecture

This project follows a modular Express.js architecture with separation of concerns across six layers:

```
Request Flow:
Client → server.js → Express App (src/app.js)
  → Middleware Pipeline (helmet → cors → compression → body parsing → morgan)
  → Router (src/routes/)
  → Error Handling (notFound → errorHandler)
  → Response

Supporting Layers:
  Configuration ← src/config/index.js ← .env (via dotenv)
  Logging       ← src/utils/logger.js (Winston) ← logs/*.log
  Process Mgmt  ← ecosystem.config.js (PM2) → server.js
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` and `src/middleware/index.js` aggregate module exports for clean imports
- **Middleware Pipeline**: Ordered Express middleware chain for security, parsing, logging, and error handling
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables with `.env` file support
- **Graceful Shutdown**: Signal handlers (SIGINT/SIGTERM) in `server.js` for clean process termination

## Middleware Pipeline

The Express application applies middleware in a specific execution order. Each request passes through the pipeline top-to-bottom:

| Order | Middleware | Source | Purpose |
|-------|-----------|--------|---------|
| 1 | Helmet | `helmet` | Sets security HTTP headers (Content-Security-Policy, X-Frame-Options, etc.) |
| 2 | CORS | `cors` | Enables Cross-Origin Resource Sharing with configurable origins |
| 3 | Compression | `compression` | Applies gzip/deflate response compression |
| 4 | JSON Parser | `express.json()` | Parses incoming JSON request bodies |
| 5 | URL-Encoded Parser | `express.urlencoded()` | Parses incoming URL-encoded form bodies |
| 6 | Request Logger | `morgan` → Winston | Logs HTTP request details (method, URL, status, response time) |
| 7 | Health Routes | `/health` | Health check endpoint for monitoring |
| 8 | Main Routes | `/` | Application routes (GET /, GET /evening) |
| 9 | Not Found | `notFound` | Catches unmatched routes and returns 404 JSON response |
| 10 | Error Handler | `errorHandler` | Centralized error handling with structured JSON responses |

### Error Response Format

**404 Not Found** (unmatched routes):
```json
{
  "error": "Not Found",
  "path": "/unknown-path"
}
```

**500 Internal Server Error** (application errors):
```json
{
  "status": 500,
  "message": "Internal Server Error"
}
```

In development mode (`NODE_ENV=development`), error responses include the stack trace for debugging.

## Logging

The application uses **Winston** for structured application logging and **Morgan** for HTTP request logging.

### Log Levels

Winston log levels follow the npm logging levels hierarchy (highest to lowest priority):

| Level | Priority | Usage |
|-------|----------|-------|
| `error` | 0 | Error conditions requiring immediate attention |
| `warn` | 1 | Warning conditions that may require investigation |
| `info` | 2 | Informational messages (server startup, shutdown) |
| `http` | 3 | HTTP request logs from Morgan middleware |
| `verbose` | 4 | Detailed informational messages |
| `debug` | 5 | Debug-level messages for development |
| `silly` | 6 | Most verbose logging level |

Set the log level via the `LOG_LEVEL` environment variable. All messages at or above the configured level are output.

### Log Transports

| Environment | Transport | Output | Format |
|-------------|-----------|--------|--------|
| Development | Console | stdout/stderr | Colorized, human-readable |
| Production | Console | stdout/stderr | Structured text |
| Production | File | `logs/error.log` | Error-level messages only |
| Production | File | `logs/combined.log` | All log messages |

### Morgan HTTP Request Logging

Morgan logs every HTTP request through the Winston logger at the `http` level. The log format varies by environment:

- **Development**: `dev` format (concise, colorized output)
- **Production**: `combined` format (Apache-style access logs)

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `morgan` | ^1.10.1 | HTTP request logger middleware for Express |
| `winston` | ^3.19.0 | Structured logging library with configurable transports |
| `helmet` | ^8.1.0 | Security HTTP headers middleware (15 security headers) |
| `cors` | ^2.8.6 | Cross-Origin Resource Sharing middleware |
| `compression` | ^1.8.1 | Response compression middleware (gzip/deflate) |
| `dotenv` | ^17.2.4 | Environment variable management from `.env` files |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify express installation
npm ls express
# Expected: express@5.1.0
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server |
| `start:prod` | `NODE_ENV=production node server.js` | Starts the server in production mode with file logging |
| `start:pm2` | `pm2 start ecosystem.config.js` | Starts the server with PM2 process manager in cluster mode |
| `test` | `jest` | Run the complete test suite |
| `test:watch` | `jest --watch` | Run tests in watch mode for development |
| `test:coverage` | `jest --coverage` | Run tests and generate coverage report |
| `test:ci` | `jest --ci --coverage` | Run tests optimized for CI/CD environments |

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
│   └── logger.test.js       # Logger configuration tests
├── integration/             # HTTP endpoint tests
│   ├── endpoints.test.js    # API contract tests using Supertest
│   └── health.test.js       # Health endpoint tests
└── lifecycle/               # Server lifecycle tests
    └── server.test.js       # Startup and shutdown behavior
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

## PM2 Deployment

The application includes PM2 process management configuration for production deployment via `ecosystem.config.js`.

### Features

- **Cluster mode**: Utilizes all available CPU cores for load balancing
- **Auto-restart**: Automatically restarts crashed processes
- **Memory limits**: Restarts processes exceeding 1GB RAM
- **Graceful shutdown**: Waits for in-flight requests to complete before stopping
- **Environment configs**: Separate development and production environment variables
- **Log management**: Structured log output to `logs/pm2-error.log` and `logs/pm2-out.log`

### Usage

```bash
# Start with PM2 (development environment)
npm run start:pm2

# Start with PM2 (production environment)
pm2 start ecosystem.config.js --env production

# View process status
pm2 status

# Stream live logs
pm2 logs

# Restart application
pm2 restart hello_world

# Stop application
pm2 stop hello_world

# Remove from PM2
pm2 delete hello_world

# Zero-downtime reload
pm2 reload hello_world
```

### Graceful Shutdown

The server handles `SIGINT` and `SIGTERM` signals for graceful shutdown:

1. PM2 sends `SIGINT` to the process
2. `server.js` stops accepting new connections via `server.close()`
3. In-flight requests are allowed to complete within the `kill_timeout` (5 seconds)
4. The process exits cleanly

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

**PM2 command not found:**
```bash
# Error: pm2: command not found
# Solution: Install PM2 globally
npm install -g pm2
```

**PM2 processes not starting:**
```bash
# Check PM2 logs for errors
pm2 logs hello_world --err --lines 50

# Verify ecosystem config
pm2 start ecosystem.config.js --no-daemon
```

**PM2 port conflicts in cluster mode:**
```bash
# Stop all PM2 processes before restarting
pm2 delete all
npm run start:pm2
```

**Log files not appearing:**
```bash
# Ensure logs/ directory exists
mkdir -p logs

# Verify NODE_ENV is set to production for file logging
NODE_ENV=production npm start
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating Node.js server development with Express.js framework, middleware pipeline, structured logging, and PM2 production deployment.*
