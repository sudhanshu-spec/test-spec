# hao-backprop-test
test project for backprop integration. Do not touch!

## Environment Setup

### Prerequisites

- **Node.js**: >= 20.19.x
- **npm**: >= 10.8.x

Verify your versions:

```bash
node --version  # Must be >= v20.19.x
npm --version   # Must be >= 10.8.x
```

### Environment Variables

Copy the environment template to create your local configuration:

```bash
cp .env.example .env
```

Available environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Server bind address | `127.0.0.1` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment identifier | `development` |
| `LOG_LEVEL` | Logging verbosity (error, warn, info, debug) | `info` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit time window in milliseconds | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Maximum requests per window per IP | `100` |

## Installation

Install all dependencies:

```bash
npm install
```

## Development

Start the server in development mode:

```bash
npm start
# or
npm run dev
```

The server will start at `http://127.0.0.1:3000` by default.

## PM2 Deployment

This application is configured for production deployment using PM2 process manager with cluster mode support.

### Starting the Application

**Development environment:**

```bash
pm2 start ecosystem.config.js
# or
npm run start:pm2
```

**Production environment:**

```bash
pm2 start ecosystem.config.js --env production
# or
npm run start:pm2:prod
```

### Managing the Application

| Command | Description |
|---------|-------------|
| `pm2 status` | View application status and metrics |
| `pm2 logs` | View application logs in real-time |
| `pm2 reload ecosystem.config.js` | Zero-downtime reload |
| `pm2 restart ecosystem.config.js` | Restart all instances |
| `pm2 stop ecosystem.config.js` | Stop all instances |
| `pm2 delete ecosystem.config.js` | Remove from PM2 process list |

### npm Scripts for PM2

```bash
npm run start:pm2       # Start in development mode
npm run start:pm2:prod  # Start in production mode
npm run stop:pm2        # Stop application
npm run restart:pm2     # Restart application
npm run reload:pm2      # Zero-downtime reload
npm run delete:pm2      # Remove from PM2
npm run logs:pm2        # View logs
npm run status:pm2      # View status
```

## API Endpoints

### Application Routes

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/` | Root endpoint | `Hello, World!` |
| `GET` | `/evening` | Evening greeting | `Good evening` |

### Health Check Routes

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/health` | Basic health check | `{"status":"ok"}` |
| `GET` | `/health/ready` | Readiness probe for orchestration | `{"status":"ready"}` |
| `GET` | `/health/live` | Liveness probe for orchestration | `{"status":"live"}` |

## Middleware

This application includes a production-ready middleware stack configured in the following order:

### Security Headers (Helmet)

Helmet sets various HTTP headers to protect against common web vulnerabilities including:
- XSS (Cross-Site Scripting) protection
- Clickjacking prevention
- Content type sniffing prevention
- HSTS (HTTP Strict Transport Security)

### Request Logging (Morgan)

HTTP request logging middleware with environment-aware formats:
- **Development**: Colored, detailed output to console
- **Production**: Combined format for comprehensive logging

### Response Compression

Gzip compression for responses to reduce bandwidth and improve load times:
- Threshold: Only compresses responses > 1KB
- Balanced compression level for performance

### CORS (Cross-Origin Resource Sharing)

Enables cross-origin requests with configurable options for API accessibility.

### Rate Limiting

Protects against brute force and DoS attacks:
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Returns standard rate limit headers
