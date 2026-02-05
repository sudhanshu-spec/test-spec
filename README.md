# Hello World Express Server

A production-ready Node.js/Express HTTP server with middleware, logging, and PM2 deployment support.

## Prerequisites

- Node.js 20.x or higher (recommended)
- npm 10.x or higher

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd hello_world

# Install dependencies
npm install

# Copy environment template (optional)
cp .env.example .env
```

## Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env` to get started.

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Server binding address (use `0.0.0.0` for all interfaces) |
| `PORT` | `3000` | Server binding port |
| `NODE_ENV` | `development` | Application environment (`development`, `production`, `test`) |
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | Winston logging level |
| `LOG_FORMAT` | `combined` | Morgan log format (`combined`, `dev`, `common`, `short`, `tiny`) |

## Running the Server

### Development Mode

```bash
# Start the server
npm start

# Or with custom configuration
HOST=0.0.0.0 PORT=8080 npm start
```

### Running with PM2 (Production)

PM2 is recommended for production deployments as it provides:
- Cluster mode for load balancing across CPU cores
- Automatic crash recovery
- Zero-downtime reloads
- Process monitoring

```bash
# Install PM2 globally (if not installed)
npm install -g pm2

# Start with PM2
npm run start:pm2

# Stop PM2 processes
npm run stop:pm2

# Restart PM2 processes
npm run restart:pm2

# Zero-downtime reload
npm run reload:pm2

# View logs
npm run logs:pm2

# Monitor dashboard
npm run monit:pm2
```

## API Endpoints

### GET `/`

Returns a greeting message.

| Property | Value |
|----------|-------|
| Status Code | `200 OK` |
| Content-Type | `text/html; charset=utf-8` |
| Response Body | `Hello, World!\n` |

### GET `/evening`

Returns an evening greeting message.

| Property | Value |
|----------|-------|
| Status Code | `200 OK` |
| Content-Type | `text/html; charset=utf-8` |
| Response Body | `Good evening` |

### GET `/health`

Returns application health status for monitoring and load balancers.

| Property | Value |
|----------|-------|
| Status Code | `200 OK` |
| Content-Type | `application/json` |
| Response Body | `{ "status": "ok", "timestamp": "ISO8601", "uptime": seconds }` |

**Response Fields:**
- `status`: Always `"ok"` when the server is healthy
- `timestamp`: Current ISO 8601 timestamp
- `uptime`: Server uptime in seconds

### Example Requests

```bash
# Root endpoint
curl http://localhost:3000/
# Output: Hello, World!

# Evening endpoint
curl http://localhost:3000/evening
# Output: Good evening

# Health check
curl http://localhost:3000/health
# Output: {"status":"ok","timestamp":"2025-02-05T12:00:00.000Z","uptime":123.456}

# Health check (formatted)
curl -s http://localhost:3000/health | jq
# {
#   "status": "ok",
#   "timestamp": "2025-02-05T12:00:00.000Z",
#   "uptime": 123.456
# }
```

## Architecture

This project follows a modular Express.js architecture with separation of concerns:

```
Request Flow:
Client → server.js → Express App (src/app.js) → Middleware Chain → Router → Response
                            ↑
                      Configuration           Logger Service
                    (src/config/index.js)   (src/utils/logger.js)
```

### Design Patterns Used

| Pattern | Location | Purpose |
|---------|----------|---------|
| Factory Pattern | `src/app.js` | Creates configured Express app for testability |
| Barrel Pattern | `src/routes/index.js`, `src/middleware/index.js` | Clean imports via aggregated exports |
| Singleton Pattern | `src/utils/logger.js` | Single logger instance shared across app |
| Middleware Chain | `src/app.js` | Standard Express pattern for request processing |
| Twelve-Factor App | `src/config/index.js` | Configuration externalized to environment variables |

## Middleware Stack

The application uses the following middleware in order of execution:

| Order | Middleware | Package | Description |
|-------|------------|---------|-------------|
| 1 | Security Headers | `helmet` | Sets HTTP security headers (Content-Security-Policy, X-XSS-Protection, etc.) |
| 2 | JSON Body Parser | `express.json()` | Parses incoming JSON request bodies (`req.body`) |
| 3 | HTTP Logging | `morgan` | Logs HTTP requests to Winston with configurable format |
| 4 | Application Routes | - | Business logic handlers (`/`, `/evening`, `/health`) |
| 5 | 404 Handler | - | Returns JSON `{ error: 'Not Found' }` for unmatched routes |
| 6 | Error Handler | - | Centralized error handling with environment-aware responses |

### Middleware Order Rationale

- **Security headers first**: Must set headers before any response is sent
- **Body parsing**: Required for JSON request processing
- **HTTP logging**: Log all incoming requests including failures
- **Routes**: Handle application endpoints
- **Error handlers last**: Must be registered after routes to catch errors

## Project Structure

```
hello_world/
├── server.js              # HTTP server entry point with graceful shutdown
├── ecosystem.config.js    # PM2 configuration
├── package.json           # npm manifest
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore patterns
├── jest.config.js         # Jest test configuration
├── README.md              # This file
├── src/
│   ├── app.js             # Express application factory
│   ├── config/
│   │   └── index.js       # Environment configuration with dotenv
│   ├── middleware/
│   │   ├── index.js       # Middleware barrel export
│   │   ├── error.middleware.js    # 404 and error handlers
│   │   ├── logging.middleware.js  # Morgan HTTP logging
│   │   └── security.middleware.js # Helmet security headers
│   ├── routes/
│   │   ├── index.js       # Route aggregator
│   │   ├── main.routes.js # Main route handlers
│   │   └── health.routes.js # Health check endpoint
│   └── utils/
│       └── logger.js      # Winston logger service
├── logs/                  # Log output directory (production)
│   └── .gitkeep
└── tests/
    ├── unit/              # Unit tests
    ├── integration/       # Integration tests
    └── lifecycle/         # Server lifecycle tests
```

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.1.0 | HTTP server framework |
| dotenv | ^16.4.7 | Environment variable loading |
| morgan | ^1.10.0 | HTTP request logging |
| winston | ^3.17.0 | Application logging |
| helmet | ^8.0.0 | Security headers |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^30.2.0 | Testing framework |
| supertest | ^7.1.4 | HTTP testing library |

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the server |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ci` | Run tests in CI mode with coverage |
| `npm run start:pm2` | Start with PM2 |
| `npm run stop:pm2` | Stop PM2 processes |
| `npm run restart:pm2` | Restart PM2 processes |
| `npm run reload:pm2` | Zero-downtime reload |
| `npm run logs:pm2` | View PM2 logs |
| `npm run monit:pm2` | PM2 monitoring dashboard |

## Testing

The project includes a comprehensive test suite built with **Jest 30.x** and **Supertest**.

### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run tests in CI mode
npm run test:ci

# Run specific test file
npx jest tests/unit/config.test.js
```

### Test Structure

```
tests/
├── unit/              # Isolated module tests
│   ├── config.test.js # Configuration module tests
│   ├── middleware.test.js # Middleware unit tests
│   └── logger.test.js # Logger utility tests
├── integration/       # HTTP endpoint tests
│   ├── endpoints.test.js # API contract tests
│   └── health.test.js # Health endpoint tests
└── lifecycle/         # Server lifecycle tests
    └── server.lifecycle.test.js # Startup/shutdown tests
```

### Coverage Targets

| Metric | Target |
|--------|--------|
| Line Coverage | ≥ 80% |
| Branch Coverage | ≥ 75% |
| Function Coverage | ≥ 90% |
| Statement Coverage | ≥ 80% |

## Logging

The application uses **Winston** for structured logging with environment-aware configuration.

### Log Levels

| Environment | Default Level | Description |
|-------------|---------------|-------------|
| `development` | `debug` | Verbose logging for debugging |
| `production` | `info` | Standard operational logging |
| `test` | `silent` | Logging suppressed during tests |

### Log Outputs

| Transport | Environment | Location |
|-----------|-------------|----------|
| Console | All | Colorized output to stdout |
| Combined Log | Production | `logs/combined.log` |
| Error Log | Production | `logs/error.log` |

### Log Directory

The `logs/` directory is automatically created for file-based logging in production. This directory is excluded from git via `.gitignore`.

## Graceful Shutdown

The server handles `SIGTERM` and `SIGINT` signals for graceful shutdown, enabling:

- Zero-downtime PM2 reloads (`pm2 reload`)
- Proper connection draining during restarts
- Clean process termination

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

**PM2 process not starting:**
```bash
# Check PM2 status and logs
pm2 status
pm2 logs hello-world

# Restart with fresh state
pm2 delete all
npm run start:pm2
```

**Module not found:**
```bash
# Error: Cannot find module 'express'
# Solution: Install dependencies
npm install
```

**Logs not appearing:**
```bash
# Ensure logs directory exists
mkdir -p logs

# Check LOG_LEVEL environment variable
LOG_LEVEL=debug npm start
```

## License

MIT
