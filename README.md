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

3. Create environment file:

```bash
cp .env.example .env
```

Edit `.env` to customize configuration for your environment.

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

### Development Mode

Start with development settings and verbose logging:

```bash
npm run start:dev
```

### Production Mode

Start in production mode (without PM2):

```bash
npm run start:prod
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

This server exposes the following HTTP GET endpoints:

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

Returns the health status of the application. Useful for load balancer health checks and Kubernetes probes.

**Request:**
```bash
curl -s http://127.0.0.1:3000/health
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Body:** JSON object with `status` and `timestamp` fields

**Example Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Example:**
```bash
curl -s http://127.0.0.1:3000/health | jq
# Output: { "status": "ok", "timestamp": "..." }
```

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
├── server.js                    # Entry point - HTTP server binding with graceful shutdown
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── ecosystem.config.js          # PM2 configuration for production deployment
├── logs/                        # Log files directory (gitignored)
│   ├── error.log                # Error-level logs only
│   └── combined.log             # All log levels
└── src/                         # Application source root
    ├── app.js                   # Express application factory with middleware stack
    ├── config/                  # Configuration module
    │   └── index.js             # Environment variable management
    ├── middleware/              # Express middleware modules
    │   ├── error.middleware.js  # Centralized error handling (404 + error handler)
    │   └── morgan.middleware.js # HTTP request logging middleware
    ├── routes/                  # Routing surface
    │   ├── index.js             # Route aggregator (barrel pattern)
    │   ├── main.routes.js       # Main route handlers implementation
    │   └── health.routes.js     # Health check endpoint
    └── utils/                   # Utility modules
        └── logger.js            # Winston logger configuration
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app, binds to configured host/port, and handles graceful shutdown |
| `src/app.js` | Express application factory - creates configured Express app with middleware stack and mounted routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env, logLevel }` from environment variables |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports |
| `src/routes/main.routes.js` | Route handlers - implements GET `/` and GET `/evening` endpoints |
| `src/routes/health.routes.js` | Health check route - implements GET `/health` endpoint |
| `src/middleware/error.middleware.js` | Error handling middleware - 404 handler and centralized error handler |
| `src/middleware/morgan.middleware.js` | HTTP logging middleware - Morgan configured to stream to Winston |
| `src/utils/logger.js` | Winston logger - application logging with console and file transports |
| `ecosystem.config.js` | PM2 configuration - cluster mode, environment settings, restart policies |

## Environment Variables

The application supports the following environment variables for configuration:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `LOG_LEVEL` | `'debug'` (dev) / `'info'` (prod) | Logging verbosity level (`error`, `warn`, `info`, `http`, `debug`). |

### Log Levels Hierarchy

| Level | Priority | Description |
|-------|----------|-------------|
| `error` | 0 | Error conditions requiring attention |
| `warn` | 1 | Warning conditions |
| `info` | 2 | Informational messages |
| `http` | 3 | HTTP request logs (Morgan) |
| `debug` | 4 | Debug-level messages |

### Configuration Examples

**Development (default):**
```bash
npm start
# Binds to http://127.0.0.1:3000/
# LOG_LEVEL defaults to 'debug'
```

**Production deployment:**
```bash
HOST=0.0.0.0 PORT=80 NODE_ENV=production npm start
# Binds to http://0.0.0.0:80/
# LOG_LEVEL defaults to 'info'
```

**Custom port:**
```bash
PORT=8080 npm start
# Binds to http://127.0.0.1:8080/
```

**Custom log level:**
```bash
LOG_LEVEL=warn npm start
# Only logs warnings and errors
```

## Middleware Stack

The application uses a comprehensive middleware stack configured in the following order:

| Order | Middleware | Package | Purpose |
|-------|------------|---------|---------|
| 1 | `helmet()` | helmet | Sets security HTTP headers (XSS protection, Content-Security-Policy, etc.) |
| 2 | `cors()` | cors | Handles Cross-Origin Resource Sharing (CORS) preflight requests |
| 3 | `compression()` | compression | Compresses response bodies using gzip/deflate |
| 4 | `express.json()` | express | Parses JSON request bodies |
| 5 | `express.urlencoded()` | express | Parses URL-encoded request bodies |
| 6 | `morganMiddleware` | morgan | Logs HTTP requests to Winston logger |
| 7 | Route handlers | - | Application routes (health, main) |
| 8 | `notFoundHandler` | custom | Catches unmatched routes, returns 404 JSON response |
| 9 | `errorHandler` | custom | Centralized error handling, returns JSON error responses |

### Middleware Configuration

```javascript
// Security headers (helmet)
app.use(helmet());

// CORS configuration
app.use(cors());

// Response compression
app.use(compression());

// Request body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(morganMiddleware);

// Routes
app.use('/health', healthRoutes);
app.use('/', mainRoutes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);
```

## Logging

The application implements structured logging using Winston for application logs and Morgan for HTTP request logs.

### Winston Logger

Winston provides application-level logging with multiple transports:

| Transport | Destination | Log Levels | Format |
|-----------|-------------|------------|--------|
| Console | stdout | All levels | Colorized, human-readable (development) |
| File (error) | `logs/error.log` | error only | JSON format |
| File (combined) | `logs/combined.log` | All levels | JSON format |

### Morgan HTTP Logging

Morgan logs all HTTP requests and pipes output to Winston's `http` level:

```
GET /health 200 5.234 ms - 52
POST /api/data 201 12.456 ms - 128
```

### Log Files

| File | Contents | Rotation |
|------|----------|----------|
| `logs/error.log` | Error-level messages only | Manual or external rotation |
| `logs/combined.log` | All log messages | Manual or external rotation |

### Usage in Application Code

```javascript
const logger = require('./utils/logger');

// Different log levels
logger.error('Database connection failed', { error: err.message });
logger.warn('Deprecated API endpoint called');
logger.info('Server started successfully', { port: 3000 });
logger.http('Request received');
logger.debug('Processing request data', { data: requestData });
```

### Log Output Examples

**Console (Development):**
```
2024-01-15 10:30:00 [info]: Server running at http://127.0.0.1:3000/
2024-01-15 10:30:05 [http]: GET /health 200 2.345 ms
2024-01-15 10:30:10 [error]: Database connection failed
```

**File (JSON format):**
```json
{"level":"info","message":"Server running at http://127.0.0.1:3000/","timestamp":"2024-01-15T10:30:00.000Z"}
{"level":"http","message":"GET /health 200 2.345 ms","timestamp":"2024-01-15T10:30:05.000Z"}
```

## PM2 Deployment

The application is configured for production deployment using PM2 process manager with cluster mode support.

### PM2 Configuration

The `ecosystem.config.js` file defines PM2 deployment settings:

```javascript
module.exports = {
  apps: [{
    name: 'hao-backprop-test',
    script: 'server.js',
    instances: 'max',           // Use all CPU cores
    exec_mode: 'cluster',       // Cluster mode for load balancing
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### PM2 Commands

| Command | npm Script | Description |
|---------|------------|-------------|
| Start | `npm run pm2:start` | Start application with PM2 in cluster mode |
| Stop | `npm run pm2:stop` | Stop all PM2 managed instances |
| Restart | `npm run pm2:restart` | Zero-downtime restart of all instances |
| Logs | `npm run pm2:logs` | View real-time PM2 process logs |

### Starting with PM2

```bash
# Start in development mode
npm run pm2:start

# Start in production mode
npm run pm2:start -- --env production

# Check status
pm2 status

# View logs
npm run pm2:logs
```

### Cluster Mode Benefits

- **Load Balancing**: Requests distributed across all CPU cores
- **Zero-Downtime Restarts**: Rolling restarts maintain availability
- **Auto-Restart**: Crashed processes automatically restarted
- **Process Monitoring**: Built-in monitoring and metrics

### Graceful Shutdown

The application handles SIGTERM and SIGINT signals for graceful shutdown:

1. Stop accepting new connections
2. Wait for existing requests to complete
3. Close server and exit process

This ensures zero-downtime during PM2 restarts and deployments.

### PM2 Monitoring

```bash
# Real-time monitoring dashboard
pm2 monit

# Process list with metrics
pm2 list

# Detailed process info
pm2 show hao-backprop-test
```

## Architecture

This project follows a modular Express.js architecture with separation of concerns:

```
Request Flow:
Client → server.js → Middleware Stack → Express App (src/app.js) → Router (src/routes/) → Response
                           ↓                    ↑
                     Security/Logging      Configuration
                    (src/middleware/)    (src/config/index.js)
                           ↓
                      Winston Logger
                    (src/utils/logger.js)
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` aggregates route exports for clean imports
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables
- **Middleware Pattern**: Layered request processing with dedicated middleware modules

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `dotenv` | ^16.4.7 | Environment variable loading from .env files |
| `winston` | ^3.17.0 | Structured application logging with multiple transports |
| `morgan` | ^1.10.0 | HTTP request logging middleware |
| `helmet` | ^8.0.0 | Security headers middleware (XSS, CSP, etc.) |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing (CORS) middleware |
| `compression` | ^1.7.5 | Gzip/deflate response compression middleware |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `pm2` | ^5.4.3 | Production process manager with cluster mode |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify express installation
npm ls express
# Expected: express@5.1.0

# Verify all production dependencies
npm ls --prod
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server with default settings |
| `start:dev` | `NODE_ENV=development node server.js` | Starts with development settings and verbose logging |
| `start:prod` | `NODE_ENV=production node server.js` | Starts in production mode without PM2 |
| `pm2:start` | `pm2 start ecosystem.config.js` | Starts application with PM2 in cluster mode |
| `pm2:stop` | `pm2 stop ecosystem.config.js` | Stops all PM2 managed instances |
| `pm2:restart` | `pm2 restart ecosystem.config.js` | Zero-downtime restart of all instances |
| `pm2:logs` | `pm2 logs` | View real-time PM2 process logs |

### Script Usage Examples

```bash
# Development workflow
npm run start:dev

# Production deployment with PM2
npm run pm2:start -- --env production

# View logs
npm run pm2:logs

# Restart after code changes (zero-downtime)
npm run pm2:restart

# Stop all instances
npm run pm2:stop
```

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

**Logs directory not found:**
```bash
# Error: ENOENT: no such file or directory 'logs/...'
# Solution: Create logs directory
mkdir -p logs
```

**PM2 not found:**
```bash
# Error: pm2: command not found
# Solution: Install PM2 or use npx
npx pm2 start ecosystem.config.js
# Or install globally
npm install -g pm2
```

**Environment variables not loading:**
```bash
# Solution: Ensure .env file exists
cp .env.example .env
# Verify dotenv is loading
node -e "require('dotenv').config(); console.log(process.env.PORT)"
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating Node.js server development with Express.js framework, featuring production-ready middleware, logging, and PM2 deployment.*
