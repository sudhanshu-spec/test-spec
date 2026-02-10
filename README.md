# hao-backprop-test

A production-ready Node.js server built with Express.js, featuring a middleware pipeline (Helmet, CORS, body parsing), structured Winston logging, environment configuration via dotenv, expanded routing with health-check and API endpoints, and PM2 process management for production deployment.

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

3. Create your environment file (optional):

```bash
cp .env.example .env
# Edit .env with your desired configuration
```

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

This server exposes the following HTTP endpoints:

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

Returns a JSON health-check response for production liveness probes.

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
  "uptime": 123.456
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Application health status (`"ok"`) |
| `uptime` | number | Process uptime in seconds via `process.uptime()` |

### GET `/api/status`

Returns a JSON status response with the current application environment.

**Request:**
```bash
curl -s http://127.0.0.1:3000/api/status
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:**
```json
{
  "status": "running",
  "environment": "development"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Application running status (`"running"`) |
| `environment` | string | Current `NODE_ENV` value (e.g., `"development"`, `"production"`) |

### Health Check

Verify all endpoints are operational:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
curl -s http://127.0.0.1:3000/health | jq .status
# Output: "ok"
curl -s http://127.0.0.1:3000/api/status | jq .status
# Output: "running"
```

## Project Structure

```
hao-backprop-test/
├── server.js                    # Entry point - HTTP server binding with graceful shutdown
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── .env.example                 # Environment variable template for onboarding
├── jest.config.js               # Jest test framework configuration
├── ecosystem.config.js          # PM2 process manager configuration
├── src/                         # Application source root
│   ├── app.js                   # Express application factory
│   ├── config/                  # Configuration module
│   │   └── index.js             # Environment variable management
│   ├── middleware/               # Middleware pipeline
│   │   ├── index.js             # Middleware aggregator/orchestrator
│   │   ├── requestLogger.js     # Morgan HTTP request logger (Winston stream)
│   │   └── errorHandler.js      # Centralized error-handling middleware
│   ├── routes/                  # Routing surface
│   │   ├── index.js             # Route aggregator (barrel pattern)
│   │   ├── main.routes.js       # Main route handlers (GET /, GET /evening)
│   │   ├── health.routes.js     # Health-check endpoint (GET /health)
│   │   └── api.routes.js        # API namespace routes (GET /api/status)
│   └── utils/                   # Utility modules
│       └── logger.js            # Winston structured logger configuration
├── logs/                        # Runtime log files (git-ignored)
│   ├── error.log                # Error-level log output
│   └── combined.log             # All-level combined log output
└── tests/                       # Test suite root
    ├── unit/                    # Isolated module tests
    │   ├── config.test.js       # Configuration module tests
    │   ├── routes.test.js       # Route handler tests
    │   ├── logger.test.js       # Winston logger tests
    │   ├── middleware.test.js    # Middleware pipeline tests
    │   ├── health-routes.test.js # Health route tests
    │   └── api-routes.test.js   # API route tests
    ├── integration/             # HTTP endpoint tests
    │   └── endpoints.test.js    # API endpoint contract tests
    └── lifecycle/               # Server lifecycle tests
        └── server.test.js       # Startup/shutdown tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app and binds it to the configured host/port, with dotenv loading and graceful shutdown signal handlers |
| `src/app.js` | Express application factory - creates and exports configured Express app with middleware pipeline and mounted routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env, logLevel, corsOrigin }` from environment variables |
| `src/middleware/index.js` | Middleware pipeline aggregator - applies helmet, cors, body parsers, and request logger to the Express app |
| `src/middleware/requestLogger.js` | Morgan HTTP request logging middleware configured with Winston stream integration |
| `src/middleware/errorHandler.js` | Centralized Express error-handling middleware (4-argument signature) with structured error logging via Winston |
| `src/utils/logger.js` | Winston logger configuration with console and file transports, severity levels, and environment-aware verbosity |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports for main, health, and API routes |
| `src/routes/main.routes.js` | Route handlers - implements GET `/` and GET `/evening` endpoints |
| `src/routes/health.routes.js` | Health-check route handler - implements GET `/health` returning JSON status with uptime |
| `src/routes/api.routes.js` | API namespace route handler - implements GET `/api/status` returning JSON status with environment |
| `ecosystem.config.js` | PM2 process manager configuration with cluster mode, environment blocks, and log management |
| `.env.example` | Environment variable template documenting all configurable variables with placeholder values |

## Environment Variables

The application supports the following environment variables for configuration. Variables can be set directly or via a `.env` file (loaded by dotenv):

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `LOG_LEVEL` | `'info'` | Winston logging severity threshold (`error`, `warn`, `info`, `http`, `debug`). |
| `CORS_ORIGIN` | `'*'` | Allowed CORS origin. Use `'*'` for all origins or specify a domain (e.g., `'https://example.com'`). |

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

**Using a `.env` file:**
```bash
cp .env.example .env
# Edit .env with your values, then:
npm start
```

## Architecture

This project follows a modular Express.js architecture with separation of concerns:

```
Request Flow:
Client → server.js → Express App (src/app.js) → Middleware Pipeline → Router (src/routes/) → Response
                           ↑                          |                        |
                     Configuration              ┌─────┴──────┐          ┌─────┴──────┐
                   (src/config/index.js)        │  helmet()   │          │ main.routes │
                           ↑                    │  cors()     │          │ health.routes│
                     dotenv (.env)              │  json()     │          │ api.routes   │
                                                │  urlencoded │          └─────┬──────┘
                                                │  morgan()   │                |
                                                └─────────────┘                ↓
                                                                        Error Handler
                                                                    (errorHandler.js)
                                                                           |
                                                                     Winston Logger
                                                                    (src/utils/logger.js)
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` aggregates route exports for clean imports
- **Pipeline Pattern**: `src/middleware/index.js` orchestrates middleware in a defined execution order
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables via dotenv

## Middleware

The application applies a middleware pipeline in a specific order before route handlers execute. Middleware is orchestrated by `src/middleware/index.js` and registered in `src/app.js`.

### Middleware Pipeline Order

| Order | Middleware | Module | Purpose |
|-------|-----------|--------|---------|
| 1 | `helmet()` | `helmet` | Sets security-related HTTP response headers (CSP, COOP, X-Content-Type-Options, disables X-Powered-By) |
| 2 | `cors()` | `cors` | Enables Cross-Origin Resource Sharing with configurable origin via `CORS_ORIGIN` |
| 3 | `express.json()` | `express` | Parses incoming JSON request bodies (`Content-Type: application/json`) |
| 4 | `express.urlencoded()` | `express` | Parses URL-encoded request bodies (`Content-Type: application/x-www-form-urlencoded`) |
| 5 | Morgan request logger | `morgan` | Logs all incoming HTTP requests through Winston stream |
| Post-routes | Error handler | `src/middleware/errorHandler.js` | Catches unhandled errors, logs via Winston, returns structured JSON error response |

### Security Headers (Helmet)

Helmet automatically sets the following protective HTTP headers on all responses:

- **Content-Security-Policy** — Prevents XSS and data injection attacks
- **Cross-Origin-Opener-Policy** — Isolates browsing context
- **Cross-Origin-Resource-Policy** — Controls cross-origin resource loading
- **X-Content-Type-Options: nosniff** — Prevents MIME type sniffing
- **X-Powered-By** — Removed to prevent framework fingerprinting

### CORS Configuration

CORS is configured via the `CORS_ORIGIN` environment variable:

```bash
# Allow all origins (default)
CORS_ORIGIN=* npm start

# Restrict to a specific domain
CORS_ORIGIN=https://example.com npm start
```

### Error Handling

The centralized error handler (`src/middleware/errorHandler.js`) is registered after all routes and:

- Catches unhandled errors from route handlers
- Logs errors via Winston with full stack trace
- Returns a structured JSON response: `{ "error": "<message>" }`
- Sanitizes error details in production to prevent information leakage

## Logging

The application uses a structured logging system built on **Winston** with **Morgan** integration for HTTP request logging.

### Log Levels

Winston severity levels (from highest to lowest priority):

| Level | Value | Description |
|-------|-------|-------------|
| `error` | 0 | Critical errors requiring immediate attention |
| `warn` | 1 | Warning conditions that may need investigation |
| `info` | 2 | Informational messages about application state (default) |
| `http` | 3 | HTTP request/response logging via Morgan |
| `debug` | 4 | Detailed debugging information for development |

Set the minimum log level via the `LOG_LEVEL` environment variable:

```bash
# Show all logs including debug
LOG_LEVEL=debug npm start

# Show only warnings and errors
LOG_LEVEL=warn npm start
```

### Log Transports

| Transport | Target | Active When | Content |
|-----------|--------|-------------|---------|
| Console | `stdout` | Always | All log levels, colorized in development |
| Error file | `logs/error.log` | Non-test environments | Error-level messages only |
| Combined file | `logs/combined.log` | Non-test environments | All log levels |

### HTTP Request Logging

Morgan middleware logs all incoming HTTP requests through the Winston stream interface, producing unified log output. HTTP request logs are recorded at the `http` severity level.

### Log File Locations

```
logs/
├── error.log      # Error-level messages only
└── combined.log   # All severity levels
```

Log files are created automatically by Winston. The `logs/` directory is git-ignored and does not need to be created manually.

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `winston` | ^3.19.0 | Structured application logging with multiple transports and severity levels |
| `morgan` | ^1.10.1 | HTTP request logger middleware for Express with Winston stream integration |
| `helmet` | ^8.1.0 | Security middleware — sets protective HTTP response headers |
| `cors` | ^2.8.6 | CORS middleware — enables configurable cross-origin resource sharing |
| `dotenv` | ^17.2.4 | Loads environment variables from `.env` file into `process.env` |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | JavaScript testing framework and test runner |
| `supertest` | ^7.1.4 | HTTP assertion library for Express endpoint testing |
| `pm2` | ^6.0.14 | Production process manager with cluster mode, monitoring, and log management |

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
| `start:dev` | `NODE_ENV=development node server.js` | Starts the server in development mode with verbose logging |
| `start:prod` | `NODE_ENV=production node server.js` | Starts the server in production mode |
| `test` | `jest` | Run the complete test suite |
| `test:watch` | `jest --watch` | Run tests in watch mode for development |
| `test:coverage` | `jest --coverage` | Run tests and generate coverage report |
| `test:ci` | `jest --ci --coverage` | Run tests optimized for CI/CD environments |
| `pm2:start` | `pm2 start ecosystem.config.js` | Start the application via PM2 in cluster mode |
| `pm2:stop` | `pm2 stop ecosystem.config.js` | Stop the PM2-managed application |

## PM2 Deployment

The application includes PM2 process management configuration for production deployment via `ecosystem.config.js`.

### Features

- **Cluster Mode** — Leverages multi-core CPUs by spawning one worker per CPU core
- **Zero-Downtime Reload** — Rolling restarts with `pm2 reload` keep the application available during deployments
- **Automatic Restart** — Restarts workers on crash or when memory exceeds the configured threshold (256 MB)
- **Log Management** — Centralized log file output managed by PM2
- **Environment Configuration** — Separate environment variable blocks for development and production

### PM2 Commands

```bash
# Start the application in cluster mode
npm run pm2:start

# Stop the application
npm run pm2:stop

# Reload with zero downtime
pm2 reload ecosystem.config.js

# View running processes
pm2 list

# Monitor processes in real time
pm2 monit

# View application logs
pm2 logs
```

### Ecosystem Configuration

The `ecosystem.config.js` file defines:

| Setting | Value | Description |
|---------|-------|-------------|
| `exec_mode` | `cluster` | Enables cluster mode for multi-core utilization |
| `instances` | `max` | Spawns one worker per available CPU core |
| `max_memory_restart` | `256M` | Automatically restarts a worker exceeding 256 MB memory |
| `kill_timeout` | `5000` | Allows 5 seconds for graceful shutdown before force-killing |
| `env` | Development defaults | `NODE_ENV=development`, default host/port |
| `env_production` | Production settings | `NODE_ENV=production`, configurable host/port |

### Graceful Shutdown

The server handles `SIGTERM` and `SIGINT` signals for graceful shutdown. When PM2 sends a termination signal, the server drains active connections via `server.close()` before exiting, enabling zero-downtime reload during deployments.

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
│   ├── logger.test.js           # Winston logger configuration tests
│   ├── middleware.test.js       # Middleware pipeline registration tests
│   ├── health-routes.test.js    # Health route handler tests
│   └── api-routes.test.js       # API route handler tests
├── integration/                 # HTTP endpoint tests
│   └── endpoints.test.js       # API contract tests using Supertest
└── lifecycle/                   # Server lifecycle tests
    └── server.test.js           # Startup and shutdown behavior
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

**Logs directory not created:**
```
Winston file transports create the logs/ directory automatically.
If issues persist, manually create it: mkdir -p logs
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating Node.js server development with Express.js framework, middleware, structured logging, and PM2 production deployment.*
