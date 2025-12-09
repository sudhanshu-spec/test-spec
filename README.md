# Hello World Express Server

A production-ready Node.js HTTP server built with Express.js, featuring comprehensive middleware architecture, structured logging with Winston, environment configuration with dotenv, and PM2 process management for production deployment.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [PM2 Production Deployment](#pm2-production-deployment)
- [API Endpoints](#api-endpoints)
- [Middleware](#middleware)
- [Logging](#logging)
- [License](#license)

## Project Overview

This is an enhanced Express.js server that provides a robust foundation for production applications. The server follows a layered architecture pattern with clear separation of concerns:

- **Entry Layer** (`server.js`): HTTP server bootstrap, network binding, and graceful shutdown handling
- **Application Layer** (`src/app.js`): Express application factory with middleware stack configuration
- **Middleware Layer** (`src/middleware/`): Modular middleware for security, logging, and error handling
- **Routing Layer** (`src/routes/`): Organized route modules with RESTful endpoint patterns
- **Configuration Layer** (`src/config/`): Centralized environment-based configuration management
- **Utilities Layer** (`src/utils/`): Shared utilities including the Winston logger

The application follows the Twelve-Factor App methodology for configuration management and is designed for zero-downtime deployments using PM2 cluster mode.

## Features

- **Middleware Architecture**
  - Security headers with Helmet (OWASP compliance)
  - Cross-Origin Resource Sharing (CORS) support
  - Gzip response compression
  - Rate limiting for DoS protection
  - Request logging middleware
  - Centralized error handling

- **Structured Logging with Winston**
  - Environment-aware log levels and transports
  - JSON format in production for log aggregation
  - Pretty console output in development
  - Configurable log levels (error, warn, info, debug)

- **Environment Configuration with dotenv**
  - Secure environment variable management
  - Configuration validation
  - Sensible defaults for all settings
  - Support for multiple environments

- **Health Check Endpoints**
  - System health monitoring
  - Kubernetes-compatible liveness and readiness probes
  - JSON response format for monitoring tools

- **PM2 Production Deployment**
  - Cluster mode for multi-core utilization
  - Automatic process restart on failure
  - Zero-downtime reloads
  - Built-in monitoring and log management
  - Graceful shutdown handling

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.x
- **npm** (comes with Node.js)

You can verify your installations with:

```bash
node --version
npm --version
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment configuration (see [Environment Configuration](#environment-configuration))

## Environment Configuration

The application uses environment variables for configuration. Create a `.env` file in the project root for local development.

### Quick Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit the `.env` file with your desired settings. The application will work with default values if no `.env` file is present.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Server bind address |
| `PORT` | `3000` | Server port number |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `LOG_LEVEL` | `info` | Logging level (`error`, `warn`, `info`, `debug`) |
| `LOG_FORMAT` | `combined` | Request log format (`combined`, `common`, `dev`, `short`, `tiny`) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in milliseconds (15 minutes) |
| `RATE_LIMIT_MAX` | `100` | Maximum requests per window per IP |
| `CORS_ORIGIN` | `*` | Allowed CORS origins (use comma-separated values for multiple) |

### Example .env File

```env
# Server Configuration
HOST=127.0.0.1
PORT=3000
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# CORS Configuration
CORS_ORIGIN=*
```

## Running the Application

### Development Mode

Start the server in development mode:

```bash
npm start
```

Or use the development alias:

```bash
npm run dev
```

The server will start and display:

```
Server running at http://127.0.0.1:3000
```

### Production Mode (without PM2)

Run the server in production mode:

```bash
npm run prod
```

This sets `NODE_ENV=production` and starts a single server instance.

## PM2 Production Deployment

For production deployments, PM2 provides process management with clustering, monitoring, and automatic restarts.

### Installing PM2 Globally (Optional)

```bash
npm install -g pm2
```

### PM2 Commands

| Command | Description |
|---------|-------------|
| `npm run pm2:start` | Start the application with PM2 in cluster mode |
| `npm run pm2:stop` | Stop all PM2 processes for this application |
| `npm run pm2:restart` | Restart all processes (causes brief downtime) |
| `npm run pm2:reload` | Zero-downtime reload (graceful restart) |
| `npm run pm2:logs` | View real-time logs from all instances |
| `npm run pm2:status` | Display status of all PM2 processes |

### Starting in Production

```bash
# Start the application
npm run pm2:start

# Check status
npm run pm2:status

# View logs
npm run pm2:logs
```

### Graceful Shutdown

The application handles shutdown signals (SIGTERM, SIGINT) gracefully:

1. Stops accepting new connections
2. Completes in-flight requests
3. Closes database connections (if any)
4. Exits cleanly

This enables zero-downtime deployments when using `npm run pm2:reload`.

### PM2 Startup Script

To ensure PM2 restarts on system reboot:

```bash
pm2 startup
pm2 save
```

## API Endpoints

### Main Endpoints

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/` | Hello World greeting | `Hello, World!\n` |
| `GET` | `/evening` | Good evening greeting | `Good evening` |

### Health Check Endpoints

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/health` | Complete health check | JSON with system status |
| `GET` | `/health/live` | Liveness probe | JSON indicating if server is alive |
| `GET` | `/health/ready` | Readiness probe | JSON indicating if server is ready to accept traffic |

### Example Responses

**GET /**
```
Hello, World!
```

**GET /evening**
```
Good evening
```

**GET /health**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123
}
```

**GET /health/live**
```json
{
  "status": "alive"
}
```

**GET /health/ready**
```json
{
  "status": "ready"
}
```

## Middleware

The application uses a carefully ordered middleware stack for optimal security and performance:

| Order | Middleware | Description |
|-------|------------|-------------|
| 1 | **helmet** | Sets security HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.) |
| 2 | **cors** | Enables Cross-Origin Resource Sharing with configurable origins |
| 3 | **compression** | Gzip compression for HTTP responses to reduce bandwidth |
| 4 | **rate-limit** | Protects against brute-force attacks and DoS by limiting requests per IP |
| 5 | **request-logger** | Logs incoming HTTP requests with method, path, status, and response time |
| 6 | **express.json()** | Parses JSON request bodies |
| 7 | **express.urlencoded()** | Parses URL-encoded request bodies |
| 8 | **routes** | Application route handlers |
| 9 | **error-handler** | Centralized error handling with formatted JSON responses |

### Middleware Order Rationale

- **Security middleware first**: Helmet and CORS run before any request processing to ensure all responses have proper headers
- **Performance middleware early**: Compression runs early to benefit all responses
- **Protection before processing**: Rate limiting blocks abusive requests before they consume resources
- **Logging before routes**: Ensures all requests are logged regardless of route handling
- **Error handler last**: Catches any errors from routes and sends formatted responses

## Logging

The application uses Winston for structured logging with environment-aware configuration.

### Log Levels

| Level | Description | Usage |
|-------|-------------|-------|
| `error` | System errors and exceptions | Critical failures requiring immediate attention |
| `warn` | Warning conditions | Degraded service, recoverable issues |
| `info` | Informational messages | Normal operations, startup/shutdown events |
| `debug` | Debug information | Detailed debugging for development |

### Log Output

**Development Mode:**
- Pretty-printed console output
- Colorized log levels
- Human-readable timestamps

**Production Mode:**
- JSON format for log aggregation
- Machine-parseable structure
- ISO 8601 timestamps

### Example Log Output

Development:
```
2024-01-15 10:30:00 [info]: Server running at http://127.0.0.1:3000/
2024-01-15 10:30:05 [info]: { method: 'GET', url: '/', status: 200, duration: '5ms', userAgent: 'curl/8.5.0' }
```

Production:
```json
{"level":"info","message":"Server running at http://127.0.0.1:3000/","timestamp":"2024-01-15T10:30:00.000Z"}
{"level":"info","method":"GET","url":"/","status":200,"duration":"5ms","userAgent":"curl/8.5.0","timestamp":"2024-01-15T10:30:05.000Z"}
```

### Configuring Log Level

Set the `LOG_LEVEL` environment variable to control verbosity:

```bash
# Show only errors
LOG_LEVEL=error npm start

# Show all debug information
LOG_LEVEL=debug npm start
```

## Project Structure

```
/
├── server.js                    # Entry point with graceful shutdown
├── ecosystem.config.js          # PM2 configuration
├── package.json                 # Dependencies and scripts
├── .env                         # Environment variables (not in git)
├── .env.example                 # Environment template
├── src/
│   ├── app.js                   # Express application factory
│   ├── config/
│   │   └── index.js             # Configuration module with dotenv
│   ├── middleware/
│   │   ├── index.js             # Middleware barrel export
│   │   ├── logger.js            # Request logging middleware
│   │   ├── errorHandler.js      # Error handling middleware
│   │   └── security.js          # Security middleware (helmet, cors)
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── main.routes.js       # Main route handlers
│   │   └── health.routes.js     # Health check endpoints
│   └── utils/
│       └── logger.js            # Winston logger configuration
└── README.md                    # This file
```

## License

MIT
