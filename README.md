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

| Method | Endpoint | Response | Description |
|--------|----------|----------|-------------|
| GET | `/` | `Hello, World!\n` | Root greeting endpoint |
| GET | `/evening` | `Good evening` | Evening greeting endpoint |
| GET | `/health` | `{ status: 'ok', timestamp: '...', uptime: 123 }` | Health check for monitoring |

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
```

## Middleware Stack

The application uses the following middleware in order:

1. **Security Headers (Helmet)** - Sets various HTTP headers for security
2. **JSON Body Parser** - Parses incoming JSON request bodies
3. **HTTP Logging (Morgan)** - Logs HTTP requests to Winston
4. **Application Routes** - Business logic handlers
5. **404 Not Found Handler** - Catches unmatched routes
6. **Error Handler** - Centralized error handling

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

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run tests in CI mode
npm run test:ci
```

## License

MIT
