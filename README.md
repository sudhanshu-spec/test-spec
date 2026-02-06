# hao-backprop-test

A production-ready Node.js HTTP server built with Express.js 5.x, featuring enterprise-grade middleware (Helmet, CORS, JSON parsing), structured Winston logging, dotenv-backed environment configuration, and PM2 process management for reliable deployment.

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

This will install Express.js (^5.1.0) and all required dependencies including Helmet, CORS, Winston, Morgan, and dotenv.

3. Set up environment configuration:

```bash
cp .env.example .env
```

Edit `.env` to customize settings for your local environment. The defaults in `.env.example` are suitable for development.

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

Override default settings using environment variables or by editing the `.env` file:

```bash
# Custom host and port
HOST=0.0.0.0 PORT=8080 npm start

# Production mode
NODE_ENV=production npm start

# Combined configuration
HOST=0.0.0.0 PORT=8080 NODE_ENV=production npm start
```

Alternatively, set values in your `.env` file:

```dotenv
HOST=0.0.0.0
PORT=8080
NODE_ENV=production
LOG_LEVEL=info
```

## Middleware Stack

The Express application mounts middleware in a specific order following production best practices. Security-related middleware runs first, followed by parsing, request logging, application routes, and error handling last.

### Middleware Pipeline Order

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `helmet()` | Sets security-related HTTP response headers (CSP, HSTS, X-Frame-Options, etc.) |
| 2 | `cors()` | Configures Cross-Origin Resource Sharing (CORS) policy headers |
| 3 | `express.json()` | Parses incoming JSON request bodies |
| 4 | Morgan (HTTP logger) | Logs HTTP request details (mounted in `server.js` for test cleanliness) |
| 5 | Application Routes | `mainRoutes` (`GET /`, `GET /evening`) and `healthRoutes` (`GET /health`) |
| 6 | Error Handler | Centralized error-handling middleware returning structured JSON error responses |

### Middleware Ordering Rationale

- **Security headers first**: Helmet runs before any request processing to ensure every response includes security headers, even for error responses.
- **CORS second**: CORS headers must be set before route handlers to allow preflight requests to succeed.
- **Body parsing third**: JSON parsing occurs before routes so that request handlers have access to parsed request bodies.
- **Request logging fourth**: Morgan logs all incoming requests, including those that result in errors.
- **Routes fifth**: Application route handlers process the request and generate responses.
- **Error handler last**: The centralized error handler catches any unhandled errors from the route pipeline and returns a structured JSON error response. It uses Express's 4-argument middleware signature `(err, req, res, next)`.

### Request Flow

```
Incoming Request
  → helmet() — Security Headers
    → cors() — CORS Policy
      → express.json() — Body Parsing
        → Morgan — Request Logging
          → mainRoutes — GET /, GET /evening
          → healthRoutes — GET /health
            → errorHandler — Centralized Error Response
              → HTTP Response
```

> **Note**: Morgan middleware is intentionally mounted in `server.js` rather than `src/app.js` to keep test output clean when Supertest uses the app factory directly.

## Logging

The application uses a structured logging system built on Winston with Morgan for HTTP request logging.

### Winston Logger

The Winston-based logger (`src/utils/logger.js`) provides structured, environment-aware logging across the entire application.

**Log Levels:**

| Environment | Default Level | Description |
|-------------|---------------|-------------|
| `development` | `debug` | Verbose output for local development and debugging |
| `production` | `info` | Standard operational logging for production systems |
| Custom | Set via `LOG_LEVEL` | Override the default level using the `LOG_LEVEL` environment variable |

**Transports:**

| Transport | Environments | Output | Description |
|-----------|-------------|--------|-------------|
| Console | All | `stdout` | Colorized output in development; JSON-formatted in production |
| File (`logs/all.log`) | Production | `logs/all.log` | All log messages at the configured level and above |
| File (`logs/error.log`) | Production | `logs/error.log` | Error-level messages only for quick issue identification |

**Format:**
- All log entries include timestamps and structured JSON formatting.
- Console output in development is colorized for readability.
- Production logs use JSON format for machine parsing and log aggregation tools.

### Morgan HTTP Request Logging

Morgan (`src/middleware/morgan.middleware.js`) provides automatic HTTP request logging for every incoming request. Morgan's output is piped through Winston's stream interface at the `http` log level, ensuring all request logs flow through the same structured logging pipeline.

- **Development**: Uses a concise format for readability.
- **Production**: Uses the combined format for comprehensive request details.

### Log Files

Log files are stored in the `logs/` directory (excluded from version control):

| File | Contents |
|------|----------|
| `logs/all.log` | All log messages (production only) |
| `logs/error.log` | Error-level messages only (production only) |
| `logs/pm2-out.log` | PM2 stdout output (when using PM2) |
| `logs/pm2-error.log` | PM2 stderr output (when using PM2) |

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

Returns a JSON health-check response with server status, uptime, and timestamp. Designed for use as a readiness probe by load balancers and monitoring systems.

**Request:**
```bash
curl -s http://127.0.0.1:3000/health
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json; charset=utf-8
- **Body:** JSON object with `status`, `uptime`, and `timestamp` fields

**Example:**
```bash
curl -s http://127.0.0.1:3000/health | jq .
# Output:
# {
#   "status": "ok",
#   "uptime": 123.456,
#   "timestamp": 1700000000000
# }
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Server status indicator (`"ok"`) |
| `uptime` | number | Server uptime in seconds (`process.uptime()`) |
| `timestamp` | number | Current Unix timestamp in milliseconds (`Date.now()`) |

### Health Check

Verify all endpoints are operational:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
curl -s http://127.0.0.1:3000/health && echo " - Health OK"
```

## Project Structure

```
hao-backprop-test/
├── server.js                              # Entry point - HTTP server binding, Morgan & Winston integration
├── package.json                           # npm manifest and dependencies
├── package-lock.json                      # Dependency lockfile
├── README.md                              # Project documentation (this file)
├── .gitignore                             # Git ignore patterns
├── .env                                   # Environment variables (local, not committed)
├── .env.example                           # Environment variable template (committed)
├── jest.config.js                         # Jest test framework configuration
├── ecosystem.config.js                    # PM2 process manager configuration
├── src/                                   # Application source root
│   ├── app.js                             # Express application factory with middleware pipeline
│   ├── config/                            # Configuration module
│   │   └── index.js                       # Dotenv-backed environment variable management
│   ├── routes/                            # Routing surface
│   │   ├── index.js                       # Route aggregator (barrel pattern)
│   │   ├── main.routes.js                 # Main route handlers (GET /, GET /evening)
│   │   └── health.routes.js               # Health-check endpoint (GET /health)
│   ├── middleware/                         # Express middleware modules
│   │   ├── error.middleware.js             # Centralized error-handling middleware
│   │   └── morgan.middleware.js            # Morgan HTTP request logging middleware
│   └── utils/                             # Utility modules
│       └── logger.js                      # Winston structured logging utility
├── logs/                                  # Log file output directory (not committed)
│   └── .gitkeep                           # Placeholder to track empty directory
└── tests/                                 # Test suite root
    ├── unit/                              # Isolated module tests
    │   ├── config.test.js                 # Configuration module tests
    │   ├── routes.test.js                 # Route handler and barrel export tests
    │   ├── logger.test.js                 # Winston logger utility tests
    │   └── error-middleware.test.js        # Error-handling middleware tests
    ├── integration/                       # HTTP endpoint tests
    │   └── endpoints.test.js              # API endpoint contract tests
    └── lifecycle/                         # Server lifecycle tests
        └── server.test.js                 # Startup/shutdown tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app and config, mounts Morgan middleware, binds the HTTP listener, and logs startup via Winston |
| `src/app.js` | Express application factory — creates app with Helmet, CORS, JSON parsing, route mounting, and centralized error handling |
| `src/config/index.js` | Configuration module — loads `.env` via dotenv, exports `{ host, port, env, logLevel }` from environment variables |
| `src/routes/index.js` | Route aggregator using barrel pattern — exports `mainRoutes` and `healthRoutes` |
| `src/routes/main.routes.js` | Route handlers — implements GET `/` and GET `/evening` endpoints |
| `src/routes/health.routes.js` | Health-check route — implements GET `/health` returning JSON status, uptime, and timestamp |
| `src/middleware/error.middleware.js` | Centralized error handler — logs errors via Winston, returns structured JSON error responses |
| `src/middleware/morgan.middleware.js` | Morgan middleware — pipes HTTP request logs through Winston's stream interface |
| `src/utils/logger.js` | Winston logger singleton — environment-aware levels, console and file transports, JSON formatting |
| `ecosystem.config.js` | PM2 configuration — cluster-mode deployment, environment-specific settings, memory limits, log paths |
| `.env.example` | Environment variable template — developer onboarding reference with default values and comments |

## Environment Variables

The application uses a dotenv-backed configuration system following the Twelve-Factor App methodology. Environment variables are loaded from a `.env` file at application startup via the `dotenv` package.

### Setup

Copy the template and customize for your environment:

```bash
cp .env.example .env
```

### Supported Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `LOG_LEVEL` | `'info'` | Winston log level (`error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`). Overrides the environment-based default. |

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

**Debug logging:**
```bash
LOG_LEVEL=debug npm start
# Enables debug-level log output
```

> **Note**: The `.env` file is excluded from version control via `.gitignore`. The `.env.example` file is committed as a template for developer onboarding.

## PM2 Deployment

The application includes a PM2 ecosystem configuration (`ecosystem.config.js`) for production-grade process management with cluster mode, automatic restarts, and memory-bounded operation.

### Features

- **Cluster Mode**: Runs multiple worker processes (one per CPU core) for load distribution and zero-downtime reloads.
- **Automatic Restart**: Automatically restarts the process on crash or unexpected exit.
- **Memory Limits**: Restarts the process if memory usage exceeds 1GB to prevent memory leaks from affecting availability.
- **Graceful Shutdown**: Allows 5 seconds for graceful shutdown during restarts.
- **Environment Configurations**: Separate settings for development and production environments.
- **Log Management**: Dedicated PM2 log files with date-formatted timestamps.

### PM2 Scripts

```bash
# Start the server with PM2
npm run pm2:start

# Stop the PM2-managed server
npm run pm2:stop

# Restart the PM2-managed server
npm run pm2:restart

# View PM2 log output
npm run pm2:logs
```

### Production Deployment

```bash
# Start in production mode
NODE_ENV=production npm run pm2:start

# Monitor running processes
npx pm2 monit

# View process list
npx pm2 list

# Graceful reload (zero-downtime)
npx pm2 reload ecosystem.config.js
```

### PM2 Environment Configuration

| Setting | Development | Production |
|---------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `HOST` | `127.0.0.1` | `0.0.0.0` |
| `PORT` | `3000` | `3000` |
| `LOG_LEVEL` | `debug` | `info` |

## Architecture

This project follows a modular Express.js architecture with separation of concerns and a layered middleware pipeline:

```
Request Flow:

Client Request
  → server.js (Entry Point)
    → Morgan Middleware (HTTP Request Logging)
      → Express App (src/app.js)
        → helmet() (Security Headers)
          → cors() (CORS Policy)
            → express.json() (Body Parsing)
              → Router (src/routes/)
                → mainRoutes (GET /, GET /evening)
                → healthRoutes (GET /health)
              → Error Handler (src/middleware/error.middleware.js)
        → HTTP Response
                    ↑
              Configuration            Logger
           (src/config/index.js)   (src/utils/logger.js)
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` aggregates route exports for clean imports
- **Singleton Pattern**: `src/utils/logger.js` creates and exports a single Winston logger instance shared across the application
- **Middleware Chain Pattern**: Express middleware pipeline with ordered security, parsing, logging, routing, and error handling
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables via dotenv

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `cors` | ^2.8.5 | Cross-origin resource sharing middleware for Express |
| `dotenv` | ^17.2.3 | Loads environment variables from `.env` file into `process.env` |
| `helmet` | ^8.1.0 | Security headers middleware (CSP, HSTS, X-Frame-Options, etc.) |
| `morgan` | ^1.10.1 | HTTP request logger middleware for Express |
| `winston` | ^3.19.0 | Structured logging with configurable transports and levels |

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
| `test` | `jest` | Run the complete test suite |
| `test:watch` | `jest --watch` | Run tests in watch mode for development |
| `test:coverage` | `jest --coverage` | Run tests and generate coverage report |
| `test:ci` | `jest --ci --coverage` | Run tests optimized for CI/CD environments |
| `pm2:start` | `pm2 start ecosystem.config.js` | Start the server using PM2 with ecosystem config |
| `pm2:stop` | `pm2 stop ecosystem.config.js` | Stop the PM2-managed server |
| `pm2:restart` | `pm2 restart ecosystem.config.js` | Restart the PM2-managed server |
| `pm2:logs` | `pm2 logs` | View PM2 log output |

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
├── unit/                              # Isolated module tests
│   ├── config.test.js                 # Configuration defaults and parsing
│   ├── routes.test.js                 # Route handler and barrel exports verification
│   ├── logger.test.js                 # Winston logger utility tests
│   └── error-middleware.test.js       # Error-handling middleware tests
├── integration/                       # HTTP endpoint tests
│   └── endpoints.test.js             # API contract tests using Supertest
└── lifecycle/                         # Server lifecycle tests
    └── server.test.js                 # Startup and shutdown behavior
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

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | JavaScript testing framework and test runner |
| `supertest` | ^7.1.4 | HTTP assertion library for Express endpoint testing |
| `pm2` | ^6.0.14 | Production process manager with cluster mode and monitoring |

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

**Missing .env file:**
```bash
# Warning: dotenv cannot find .env file
# Solution: Copy the example template
cp .env.example .env
```

**PM2 not found:**
```bash
# Error: pm2: command not found
# Solution: Use npx or install dependencies
npx pm2 list
# Or reinstall dependencies
npm install
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating production-ready Node.js server development with Express.js 5.x framework, enterprise middleware, structured logging, and PM2 process management.*
