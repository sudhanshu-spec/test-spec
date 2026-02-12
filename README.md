# hao-backprop-test

A production-ready Node.js server built with Express.js, featuring a comprehensive middleware pipeline (Helmet, CORS, body parsing, Morgan), structured logging with Winston, centralized error handling, and PM2 deployment support.

> **Note**: This is a test project for backprop integration — enhanced with production-grade middleware, structured logging, and process management.

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

This will install Express.js (^5.1.0) and all required dependencies, including Helmet, CORS, Morgan, Winston, and dotenv.

3. Create your environment configuration:

```bash
cp .env.example .env
# Edit .env with your preferred settings
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

Returns system health status for operational monitoring, load balancer checks, and PM2 health verification.

**Request:**
```bash
curl -s http://127.0.0.1:3000/health
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:** JSON object with `status`, `uptime`, and `timestamp` fields

**Example:**
```bash
curl -s http://127.0.0.1:3000/health | jq .
# Output:
# {
#   "status": "ok",
#   "uptime": 123.456,
#   "timestamp": "2025-01-15T10:30:00.000Z"
# }
```

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Always `"ok"` when the server is running |
| `uptime` | `number` | Process uptime in seconds (`process.uptime()`) |
| `timestamp` | `string` | ISO 8601 timestamp of the response (`new Date().toISOString()`) |

### Verify Endpoints

Verify all endpoints are operational:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
curl -s http://127.0.0.1:3000/health | jq .status && echo " - Health OK"
```

## Project Structure

```
hao-backprop-test/
├── server.js                    # Entry point - HTTP server binding and graceful shutdown
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── .env.example                 # Environment variable template
├── jest.config.js               # Jest test framework configuration
├── ecosystem.config.js          # PM2 process manager configuration
├── src/                         # Application source root
│   ├── app.js                   # Express application factory with middleware pipeline
│   ├── config/                  # Configuration module
│   │   └── index.js             # Environment variable management (dotenv integration)
│   ├── middleware/               # Express middleware modules
│   │   ├── morgan.middleware.js  # HTTP request logger (Morgan → Winston stream)
│   │   └── error.middleware.js   # Centralized error handling (404 + error handler)
│   ├── utils/                   # Utility modules
│   │   └── logger.js            # Winston structured logger (console + file transports)
│   └── routes/                  # Routing surface
│       ├── index.js             # Route aggregator (barrel pattern)
│       ├── main.routes.js       # Route handlers implementation
│       └── health.routes.js     # Health check endpoint
├── logs/                        # Application log files (gitignored)
│   ├── error.log                # Error-level logs only
│   ├── combined.log             # All log levels
│   ├── pm2-error.log            # PM2 error output
│   ├── pm2-out.log              # PM2 standard output
│   └── pm2-combined.log         # PM2 combined logs
└── tests/                       # Test suite root
    ├── unit/                    # Isolated module tests
    │   ├── config.test.js       # Configuration module tests
    │   ├── routes.test.js       # Route handler tests
    │   ├── logger.test.js       # Winston logger utility tests
    │   └── middleware.test.js   # Middleware module tests
    ├── integration/             # HTTP endpoint tests
    │   ├── endpoints.test.js    # API endpoint contract tests
    │   └── health.test.js       # Health check endpoint tests
    └── lifecycle/               # Server lifecycle tests
        └── server.test.js       # Startup/shutdown/signal tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app, binds it to the configured host/port, and handles graceful shutdown signals (`SIGTERM`, `SIGINT`) |
| `src/app.js` | Express application factory — creates and exports a configured Express app with full middleware pipeline (Helmet, CORS, body parsers, Morgan) and error handlers |
| `src/config/index.js` | Configuration module — loads `.env` via dotenv and exports `{ host, port, env, logLevel, corsOrigin }` from environment variables |
| `src/utils/logger.js` | Winston structured logger singleton — console and file transports with environment-aware formatting and Morgan stream interface |
| `src/middleware/morgan.middleware.js` | Morgan HTTP request logger configured to pipe request logs through Winston's stream interface |
| `src/middleware/error.middleware.js` | Centralized error-handling middleware — 404 not-found handler and error handler (4-parameter Express signature) |
| `src/routes/index.js` | Route aggregator using barrel pattern — centralizes route exports for main and health routes |
| `src/routes/main.routes.js` | Route handlers — implements GET `/` and GET `/evening` endpoints |
| `src/routes/health.routes.js` | Health check route — implements GET `/health` returning JSON status, uptime, and timestamp |
| `ecosystem.config.js` | PM2 ecosystem configuration — cluster mode, environment-specific settings, and log file paths |
| `.env.example` | Environment variable template documenting all supported configuration variables |

## Environment Variables

The application uses [dotenv](https://www.npmjs.com/package/dotenv) to load environment variables from a `.env` file. Copy `.env.example` to `.env` and customize values as needed:

```bash
cp .env.example .env
```

The following environment variables are supported:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `LOG_LEVEL` | `'info'` | Winston logging level. Options: `error`, `warn`, `info`, `http`, `debug`. |
| `CORS_ORIGIN` | `'*'` | Allowed CORS origin. Use `'*'` for any origin, or specify a domain (e.g., `'https://example.com'`). |

### Configuration Examples

**Development (default):**
```bash
npm start
# Binds to http://127.0.0.1:3000/
```

**Production deployment:**
```bash
HOST=0.0.0.0 PORT=80 NODE_ENV=production LOG_LEVEL=warn npm start
# Binds to http://0.0.0.0:80/ with warn-level logging
```

**Custom port with debug logging:**
```bash
PORT=8080 LOG_LEVEL=debug npm start
# Binds to http://127.0.0.1:8080/ with verbose debug output
```

**Restricted CORS origin:**
```bash
CORS_ORIGIN=https://myapp.com npm start
# Only allows requests from https://myapp.com
```

## Architecture

This project follows a modular Express.js architecture with separation of concerns and a layered middleware pipeline:

```
Request Flow (Middleware Pipeline):

Client Request
    ↓
server.js (Entry Point)
    ↓
Express App (src/app.js)
    ↓
┌─────────────────────────────────────────┐
│           Middleware Pipeline            │
│                                         │
│  1. Helmet     → Security headers       │
│  2. CORS       → Cross-origin handling  │
│  3. JSON       → Body parsing (10kb)    │
│  4. URL-Encoded → Form data parsing     │
│  5. Morgan     → HTTP request logging   │
│                                         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│           Route Handlers                │
│                                         │
│  GET /         → "Hello, World!\n"      │
│  GET /evening  → "Good evening"         │
│  GET /health   → JSON status response   │
│                                         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│           Error Handlers                │
│                                         │
│  404 Handler   → Not found catch-all    │
│  Error Handler → Centralized errors     │
│                                         │
└─────────────────────────────────────────┘
    ↓
Client Response

Supporting Services:
  Configuration ← src/config/index.js (dotenv + environment variables)
  Logging       ← src/utils/logger.js (Winston → console + file transports)
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Middleware Pipeline Pattern**: Sequential middleware registration with `app.use()` in defined order — security, CORS, parsing, logging, routes, errors
- **Singleton Pattern**: `src/utils/logger.js` exports a single Winston logger instance shared across all modules
- **Barrel Pattern**: `src/routes/index.js` aggregates route exports for clean imports
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables via dotenv

## Middleware

The application mounts a production-grade middleware pipeline in `src/app.js`. Middleware is applied in the following order (order matters):

### Helmet — Security Headers

[Helmet](https://helmetjs.github.io/) sets security-related HTTP response headers to protect against common web vulnerabilities:

| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | Controls resources the browser is allowed to load |
| `X-Content-Type-Options` | Prevents MIME type sniffing (`nosniff`) |
| `X-Frame-Options` | Prevents clickjacking by disabling iframe embedding |
| `Strict-Transport-Security` | Enforces HTTPS connections (HSTS) |
| `X-XSS-Protection` | Legacy XSS filter header |

### CORS — Cross-Origin Resource Sharing

[CORS](https://www.npmjs.com/package/cors) middleware enables cross-origin requests with a configurable origin policy:

- **Default**: Allows all origins (`*`)
- **Configuration**: Set `CORS_ORIGIN` environment variable to restrict allowed origins
- **Example**: `CORS_ORIGIN=https://myapp.com` restricts to a single domain

### Body Parsers

Express built-in body parsing middleware:

| Parser | Configuration | Purpose |
|--------|---------------|---------|
| `express.json()` | `{ limit: '10kb' }` | Parses JSON request bodies with a 10kb size limit to prevent abuse |
| `express.urlencoded()` | `{ extended: true }` | Parses URL-encoded form data with rich object/array support |

### Morgan — HTTP Request Logging

[Morgan](https://www.npmjs.com/package/morgan) provides HTTP request logging, piped through Winston's stream interface for unified log management:

- **Production format**: `combined` — Apache-style access logs with full request/response details
- **Development format**: `dev` — Colorized concise output with response time and status codes
- **Integration**: All Morgan output flows through `logger.http()` for consistent formatting and transport

### Error Handling

Centralized error-handling middleware registered after all route handlers:

| Handler | Purpose |
|---------|---------|
| **404 Not Found Handler** | Catches requests to undefined routes and returns a structured JSON error response |
| **Error Handler** | Centralized error handler (4-parameter Express signature) that logs errors via Winston and returns JSON error responses. Stack traces are hidden in production. |

## Logging

The application uses a dual-layer logging architecture combining [Winston](https://www.npmjs.com/package/winston) for structured application logging and [Morgan](https://www.npmjs.com/package/morgan) for HTTP request logging.

### Winston — Structured Application Logger

The Winston logger (`src/utils/logger.js`) is a singleton instance used throughout the application:

**Log Levels** (npm standard, from highest to lowest priority):

| Level | Priority | Usage |
|-------|----------|-------|
| `error` | 0 | Error conditions requiring immediate attention |
| `warn` | 1 | Warning conditions that may need investigation |
| `info` | 2 | Informational messages (startup, shutdown, key events) |
| `http` | 3 | HTTP request logs (Morgan output) |
| `debug` | 4 | Detailed debug information for development |

**Transports:**

| Transport | Target | Content |
|-----------|--------|---------|
| Console | `stdout` | All log levels — colorized simple format in development |
| File | `logs/error.log` | Error-level messages only |
| File | `logs/combined.log` | All log levels |

**Environment-Aware Formatting:**

- **Production**: JSON format with timestamps — optimized for log aggregation and parsing
- **Development**: Colorized simple format — human-readable console output

**Configuration:**

Set the `LOG_LEVEL` environment variable to control the minimum log level:

```bash
# Show all logs including debug
LOG_LEVEL=debug npm start

# Show only warnings and errors
LOG_LEVEL=warn npm start

# Default: info level (info, warn, error)
npm start
```

### Morgan — HTTP Request Logger

Morgan is configured as Express middleware in `src/middleware/morgan.middleware.js` and pipes all HTTP request logs through Winston's stream interface:

- **Stream integration**: Morgan writes to `logger.stream`, which calls `logger.http()` ensuring all request logs flow through Winston's formatting and transports
- **Production**: Uses `combined` format for comprehensive Apache-style access logs
- **Development**: Uses `dev` format for concise, colorized output with response times

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `dotenv` | ^17.2.4 | Loads environment variables from `.env` file into `process.env` |
| `helmet` | ^8.1.0 | Sets security-related HTTP response headers (CSP, HSTS, X-Frame-Options) |
| `cors` | ^2.8.6 | Enables Cross-Origin Resource Sharing with configurable origin policy |
| `morgan` | ^1.10.1 | HTTP request logger middleware for Express |
| `winston` | ^3.19.0 | Multi-transport structured logging library with leveled log support |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | JavaScript testing framework and test runner |
| `supertest` | ^7.1.4 | HTTP assertion library for Express endpoint testing |
| `pm2` | ^6.0.14 | Production process manager with cluster mode, monitoring, and auto-restart |

### Dependency Installation

```bash
# Install all dependencies (production + development)
npm install

# Verify key packages
npm ls express helmet cors morgan winston dotenv
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server directly |
| `start:dev` | `node server.js` | Starts the server in development mode |
| `start:prod` | `pm2 start ecosystem.config.js` | Starts the server via PM2 in cluster mode |
| `test` | `jest` | Run the complete test suite |
| `test:watch` | `jest --watch` | Run tests in watch mode for development |
| `test:coverage` | `jest --coverage` | Run tests and generate coverage report |
| `test:ci` | `jest --ci --coverage` | Run tests optimized for CI/CD environments |

## PM2 Deployment

The application includes [PM2](https://pm2.keymetrics.io/) process manager configuration for production deployment, enabling cluster mode, automatic restarts, and centralized log management.

### Configuration

PM2 is configured via `ecosystem.config.js` at the project root:

| Setting | Value | Description |
|---------|-------|-------------|
| `name` | `'hello_world'` | Application name in PM2 process list |
| `script` | `'server.js'` | Entry point script |
| `instances` | `2` | Number of cluster instances (adjustable) |
| `exec_mode` | `'cluster'` | Enables Node.js cluster mode for multi-core utilization |
| `watch` | `false` | File watching disabled in production |
| `max_memory_restart` | `'1G'` | Auto-restart if memory exceeds 1GB |

### Usage

```bash
# Start in production with PM2 (cluster mode)
npm run start:prod

# Check process status
npx pm2 status

# View real-time logs
npx pm2 logs

# Stop all processes
npx pm2 stop all

# Restart with zero-downtime reload
npx pm2 reload ecosystem.config.js

# Delete all PM2 processes
npx pm2 delete all
```

### Environment-Specific Configuration

PM2 supports environment-specific configuration blocks:

**Development (default):**

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `development` |
| `HOST` | `127.0.0.1` |
| `PORT` | `3000` |
| `LOG_LEVEL` | `debug` |

**Production** (`--env production`):

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `3000` |
| `LOG_LEVEL` | `info` |

```bash
# Start with production environment
npx pm2 start ecosystem.config.js --env production
```

### Log Files

PM2 writes process logs to the `logs/` directory:

| Log File | Content |
|----------|---------|
| `logs/pm2-error.log` | PM2 process error output |
| `logs/pm2-out.log` | PM2 process standard output |
| `logs/pm2-combined.log` | PM2 combined log output |

> **Note**: The `logs/` directory is gitignored. PM2 logs are separate from Winston application logs (`logs/error.log`, `logs/combined.log`).

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
│   ├── config.test.js       # Configuration defaults, dotenv, and parsing
│   ├── routes.test.js       # Route handler exports verification
│   ├── logger.test.js       # Winston logger utility tests
│   └── middleware.test.js   # Morgan and error middleware tests
├── integration/             # HTTP endpoint tests
│   ├── endpoints.test.js    # API contract tests using Supertest
│   └── health.test.js       # Health endpoint integration tests
└── lifecycle/               # Server lifecycle tests
    └── server.test.js       # Startup, shutdown, and signal handling
```

| Directory | Purpose | Test Approach |
|-----------|---------|---------------|
| `tests/unit/` | Test isolated modules without HTTP | Direct module imports with Jest assertions |
| `tests/integration/` | Test HTTP endpoint responses | Supertest requests against the Express app |
| `tests/lifecycle/` | Test server startup/shutdown and signal handling | Mock-based lifecycle verification |

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

> See the [Dependencies](#dependencies) section for the full list of production and development dependencies.

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

*This is a production-ready Node.js server demonstrating Express.js development with middleware, structured logging, and PM2 deployment.*
