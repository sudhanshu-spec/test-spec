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

This server exposes two HTTP GET endpoints:

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

Health check endpoint for load balancer probes and Kubernetes health checks.

**Request:**
```bash
curl -s http://127.0.0.1:3000/health
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:** `{"status":"ok","timestamp":"2024-01-01T12:00:00.000Z"}`

**Example:**
```bash
curl -s http://127.0.0.1:3000/health
# Output: {"status":"ok","timestamp":"2024-01-01T12:00:00.000Z"}
```

### Verify All Endpoints

Quick health check for all endpoints:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
curl -s http://127.0.0.1:3000/health | jq . && echo " - Health OK"
```

## Project Structure

```
hao-backprop-test/
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment variable template
├── .gitignore                   # Git ignore patterns
├── ecosystem.config.js          # PM2 process manager configuration
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── server.js                    # Entry point - HTTP server binding
├── logs/                        # Log files directory
│   ├── .gitkeep                 # Placeholder for git
│   ├── combined.log             # All application logs
│   └── error.log                # Error-level logs only
└── src/                         # Application source root
    ├── app.js                   # Express application factory with middleware
    ├── config/                  # Configuration module
    │   └── index.js             # Environment variable management
    ├── middleware/              # Custom middleware
    │   ├── error.middleware.js  # Centralized error handling
    │   └── morgan.middleware.js # HTTP request logging
    ├── routes/                  # Routing surface
    │   ├── index.js             # Route aggregator (barrel pattern)
    │   ├── main.routes.js       # Main route handlers
    │   └── health.routes.js     # Health check endpoint
    └── utils/                   # Utility modules
        └── logger.js            # Winston logger configuration
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that loads dotenv, imports the Express app, binds to host/port, and handles graceful shutdown |
| `ecosystem.config.js` | PM2 configuration for cluster mode, environment settings, and restart policies |
| `src/app.js` | Express application factory - creates configured app with middleware stack and mounted routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env, logLevel }` from environment variables |
| `src/middleware/error.middleware.js` | Centralized error handling with 404 handler and error handler |
| `src/middleware/morgan.middleware.js` | HTTP request logging middleware that pipes to Winston |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports |
| `src/routes/main.routes.js` | Main route handlers - implements GET `/` and GET `/evening` endpoints |
| `src/routes/health.routes.js` | Health check route - implements GET `/health` endpoint |
| `src/utils/logger.js` | Winston logger factory with console and file transports |

## Environment Variables

The application supports the following environment variables for configuration:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `LOG_LEVEL` | `'debug'` | Logging verbosity. Options: `error`, `warn`, `info`, `http`, `debug`. Recommended: `debug` for development, `info` for production. |

Environment variables can be set via:
- `.env` file (loaded automatically at startup via dotenv)
- Shell environment variables
- PM2 ecosystem configuration

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

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `dotenv` | ^16.4.7 | Loads environment variables from `.env` file |
| `helmet` | ^8.0.0 | Security middleware for HTTP headers protection |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| `compression` | ^1.7.5 | Response compression middleware (gzip/deflate) |
| `morgan` | ^1.10.0 | HTTP request logging middleware |
| `winston` | ^3.17.0 | Application logging with multiple transports |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `pm2` | ^5.4.3 | Production process manager with cluster mode |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify installations
npm ls
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server |
| `start:dev` | `NODE_ENV=development node server.js` | Start in development mode with verbose logging |
| `start:prod` | `NODE_ENV=production node server.js` | Start in production mode |
| `pm2:start` | `pm2 start ecosystem.config.js` | Start with PM2 in cluster mode |
| `pm2:stop` | `pm2 stop ecosystem.config.js` | Stop all PM2 managed instances |
| `pm2:restart` | `pm2 restart ecosystem.config.js` | Zero-downtime restart |
| `pm2:logs` | `pm2 logs` | View PM2 application logs |

## Middleware Stack

The application configures middleware in the following order:

| Order | Middleware | Purpose |
|-------|------------|---------|
| 1 | `helmet()` | Sets security HTTP headers (XSS, clickjacking, MIME sniffing protection) |
| 2 | `cors()` | Enables Cross-Origin Resource Sharing for all routes |
| 3 | `compression()` | Compresses response bodies using gzip/deflate |
| 4 | `express.json()` | Parses incoming JSON request bodies |
| 5 | `express.urlencoded()` | Parses URL-encoded request bodies |
| 6 | `morganMiddleware` | Logs HTTP requests to Winston |
| 7 | Route handlers | Application and health routes |
| 8 | `notFoundHandler` | Catches unmatched routes (404) |
| 9 | `errorHandler` | Centralized error handling |

## Logging

The application uses a two-layer logging approach:

### Application Logging (Winston)

Winston handles application-level logging with multiple transports:

- **Console**: Colorized output for development visibility
- **File (error.log)**: Error-level logs only
- **File (combined.log)**: All log levels

Log levels (in order of severity): `error`, `warn`, `info`, `http`, `debug`

### HTTP Request Logging (Morgan)

Morgan handles HTTP request logging in two formats:
- **Development**: Concise, colored output (`dev` format)
- **Production**: Apache combined log format

All Morgan output is piped to Winston for unified logging.

### Log Files

```bash
logs/
├── error.log      # Error-level logs only
├── combined.log   # All application and HTTP logs
├── pm2-error.log  # PM2 process errors (when using PM2)
└── pm2-out.log    # PM2 stdout logs (when using PM2)
```

## PM2 Production Deployment

The application supports PM2 for production deployment with cluster mode.

### Starting with PM2

```bash
# Start in cluster mode (uses all CPU cores)
npm run pm2:start

# Start in production environment
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# View logs
npm run pm2:logs

# Stop all instances
npm run pm2:stop

# Zero-downtime restart
npm run pm2:restart
```

### PM2 Configuration

The `ecosystem.config.js` file configures:
- **Cluster mode**: Utilizes all available CPU cores
- **Environment-specific settings**: Different configs for development/production
- **Restart policies**: Auto-restart on crash, memory limit restart
- **Graceful shutdown**: 10-second timeout for connection draining
- **Log management**: Dedicated log files with timestamps

### Graceful Shutdown

The server handles graceful shutdown for zero-downtime deployments:

1. Receives `SIGTERM` (PM2) or `SIGINT` (Ctrl+C)
2. Stops accepting new connections
3. Waits for existing requests to complete
4. Closes server cleanly
5. Forces shutdown after 10 seconds if stuck

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

*This is a tutorial project demonstrating Node.js server development with Express.js framework.*
