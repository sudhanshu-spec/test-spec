# hao-backprop-test

test project for backprop integration. Do not touch!

A security-hardened Express.js server with production-grade logging, PM2 process management, and comprehensive health monitoring capabilities.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development](#development)
  - [Production](#production)
- [Logging](#logging)
  - [Structured JSON Logging](#structured-json-logging)
  - [Request Correlation IDs](#request-correlation-ids)
  - [Log Levels](#log-levels)
  - [Log Redaction](#log-redaction)
- [Health Endpoints](#health-endpoints)
  - [Liveness Probe](#liveness-probe)
  - [Readiness Probe](#readiness-probe)
- [Production Deployment](#production-deployment)
  - [PM2 Ecosystem Configuration](#pm2-ecosystem-configuration)
  - [Cluster Mode](#cluster-mode)
  - [Zero-Downtime Deployments](#zero-downtime-deployments)
  - [PM2 Commands](#pm2-commands)
- [Environment Variables](#environment-variables)
  - [Server Configuration](#server-configuration)
  - [Logging Configuration](#logging-configuration)
  - [PM2 Configuration](#pm2-configuration)
  - [Health Check Configuration](#health-check-configuration)
  - [CORS Configuration](#cors-configuration)
  - [Rate Limiting Configuration](#rate-limiting-configuration)
  - [HTTPS/TLS Configuration](#httpstls-configuration)
- [Security Features](#security-features)
- [API Reference](#api-reference)
- [Testing](#testing)
- [License](#license)

## Features

- **Security Hardening**: Comprehensive security middleware stack with Helmet.js, CORS, and rate limiting
- **Structured Logging**: Production-grade JSON logging with Pino for high-performance log processing
- **Request Tracing**: UUID-based request correlation IDs for distributed tracing and debugging
- **Health Monitoring**: Liveness and readiness probe endpoints for container orchestration
- **PM2 Integration**: Production-ready process management with cluster mode support
- **Graceful Shutdown**: Clean process termination with connection draining
- **Environment Configuration**: Comprehensive environment variable management with validation
- **Input Validation**: Joi-based request validation middleware
- **HTTPS Support**: Built-in TLS/SSL support for encrypted communications

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- PM2 (for production deployments): `npm install -g pm2`

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hao-backprop-test
```

2. Install dependencies:
```bash
npm install
```

3. Create your environment configuration:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env` (see [Environment Variables](#environment-variables))

### Development

Start the development server with pretty-printed logs:

```bash
npm run start:dev
```

This command pipes the JSON log output through `pino-pretty` for human-readable console output during development.

Alternatively, start with standard logging:

```bash
npm start
```

The server will start on `http://localhost:3000` by default.

### Production

For production deployments, use PM2 for process management:

```bash
# Start with PM2 cluster mode
npm run pm2:start

# Or start directly without PM2 (for containerized deployments)
npm run start:prod
```

## Logging

The application uses [Pino](https://github.com/pinojs/pino), one of the fastest JSON loggers for Node.js, providing structured logging optimized for production environments.

### Structured JSON Logging

All logs are output in JSON format for easy parsing by log aggregation tools (ELK Stack, CloudWatch, Datadog, Splunk, etc.):

```json
{
  "level": 30,
  "time": 1704067200000,
  "pid": 12345,
  "hostname": "server-01",
  "reqId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "req": {
    "method": "GET",
    "url": "/api/data",
    "remoteAddress": "::1"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 15,
  "msg": "request completed"
}
```

**Log Output Fields:**

| Field | Description |
|-------|-------------|
| `level` | Numeric log level (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal) |
| `time` | Unix timestamp in milliseconds |
| `pid` | Process ID |
| `hostname` | Server hostname |
| `reqId` | Unique request correlation ID (UUID v4) |
| `req` | Request details (method, URL, headers) |
| `res` | Response details (status code) |
| `responseTime` | Request processing time in milliseconds |
| `msg` | Log message |

### Request Correlation IDs

Every HTTP request is assigned a unique UUID v4 identifier (`reqId`) that is:

- Automatically generated for each incoming request
- Included in all log entries related to that request
- Returned in the `X-Request-Id` response header
- Propagated to downstream services for distributed tracing

**Using Request IDs for Debugging:**

```bash
# Search logs for a specific request
grep "a1b2c3d4-e5f6-7890-abcd-ef1234567890" /var/log/app/*.log

# Using jq to filter JSON logs
cat app.log | jq 'select(.reqId == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")'
```

### Log Levels

Configure the log level via the `LOG_LEVEL` environment variable:

| Level | Value | Description |
|-------|-------|-------------|
| `trace` | 10 | Fine-grained debugging information |
| `debug` | 20 | Debugging information |
| `info` | 30 | General operational information (default) |
| `warn` | 40 | Warning conditions |
| `error` | 50 | Error conditions |
| `fatal` | 60 | Critical errors causing shutdown |

**Automatic Log Level Selection by Status Code:**

- `2xx`, `3xx` responses: `info` level
- `4xx` responses: `warn` level
- `5xx` responses: `error` level

### Log Redaction

Sensitive data is automatically redacted from logs to prevent credential exposure:

```javascript
// Default redaction paths
["req.headers.authorization", "req.headers.cookie", "req.body.password"]
```

Configure additional redaction paths via `LOG_REDACT_PATHS` environment variable (JSON array format).

## Health Endpoints

The application provides health check endpoints for load balancers, container orchestration platforms (Kubernetes, ECS), and monitoring systems.

### Liveness Probe

**Endpoint:** `GET /health`

Indicates whether the application is running. A failed liveness probe typically triggers a container restart.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Response Fields:**

| Field | Description |
|-------|-------------|
| `status` | Health status (`healthy` or `unhealthy`) |
| `timestamp` | ISO 8601 timestamp |
| `uptime` | Process uptime in seconds |
| `version` | Application version from package.json |

### Readiness Probe

**Endpoint:** `GET /ready`

Indicates whether the application is ready to receive traffic. A failed readiness probe removes the instance from load balancer rotation without restarting.

**Response (200 OK):**
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "checks": {
    "server": "ok"
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "not_ready",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "checks": {
    "server": "ok",
    "database": "failed"
  }
}
```

**Kubernetes Configuration Example:**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 15

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Production Deployment

### PM2 Ecosystem Configuration

The application includes a pre-configured `ecosystem.config.js` for PM2 process management:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'express-server',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug',
      LOG_FORMAT: 'pretty'
    },
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
      LOG_FORMAT: 'json'
    }
  }]
};
```

### Cluster Mode

PM2 cluster mode enables the application to utilize all available CPU cores:

- **Automatic load balancing** across worker processes
- **Zero-downtime restarts** via round-robin distribution
- **Automatic worker respawning** on crashes
- **Shared port listening** without reverse proxy

```bash
# Start with maximum CPU utilization
pm2 start ecosystem.config.js --env production

# Start with specific number of instances
pm2 start ecosystem.config.js -i 4 --env production
```

### Zero-Downtime Deployments

Perform seamless deployments without dropping connections:

```bash
# Graceful reload with zero downtime
npm run pm2:reload
# or
pm2 reload ecosystem.config.js
```

**Graceful Shutdown Behavior:**

1. PM2 sends `SIGTERM` to the worker process
2. Worker stops accepting new connections
3. Existing connections are allowed to complete (up to `SHUTDOWN_TIMEOUT`)
4. Worker process exits cleanly
5. PM2 spawns a replacement worker

### PM2 Commands

The following npm scripts are available for PM2 management:

| Command | Description |
|---------|-------------|
| `npm run pm2:start` | Start application with PM2 |
| `npm run pm2:stop` | Stop PM2 managed processes |
| `npm run pm2:restart` | Restart all processes (brief downtime) |
| `npm run pm2:reload` | Zero-downtime reload |
| `npm run pm2:logs` | View real-time logs |
| `npm run pm2:monit` | Open PM2 monitoring dashboard |

**Additional PM2 Commands:**

```bash
# List all processes
pm2 list

# Show detailed process info
pm2 show express-server

# Monitor CPU/Memory usage
pm2 monit

# View logs
pm2 logs express-server

# Flush logs
pm2 flush

# Save current process list for startup
pm2 save

# Configure PM2 to start on system boot
pm2 startup
```

## Environment Variables

Create a `.env` file based on `.env.example` and configure the following variables:

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `PORT` | `3000` | HTTP server port |
| `HOST` | `127.0.0.1` | Server binding address (`0.0.0.0` for all interfaces) |

### Logging Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `LOG_FORMAT` | `json` | Log output format: `json` (production) or `pretty` (development) |
| `LOG_REDACT_PATHS` | `["req.headers.authorization"]` | JSON array of paths to redact from logs |

**Example Configuration:**

```bash
# Development (human-readable logs)
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Production (JSON for log aggregation)
LOG_LEVEL=info
LOG_FORMAT=json
LOG_REDACT_PATHS=["req.headers.authorization","req.headers.cookie","req.body.password","req.body.token"]
```

### PM2 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PM2_INSTANCES` | `max` | Number of cluster instances (`max` for CPU count, or specific number) |
| `PM2_EXEC_MODE` | `cluster` | Execution mode: `cluster` (multi-core) or `fork` (single process) |
| `SHUTDOWN_TIMEOUT` | `10000` | Graceful shutdown timeout in milliseconds |

**Example Configuration:**

```bash
# Maximum CPU utilization
PM2_INSTANCES=max
PM2_EXEC_MODE=cluster

# Specific instance count
PM2_INSTANCES=4
PM2_EXEC_MODE=cluster

# Single process (for debugging)
PM2_INSTANCES=1
PM2_EXEC_MODE=fork

# Extended shutdown timeout for long-running requests
SHUTDOWN_TIMEOUT=30000
```

### Health Check Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HEALTH_CHECK_PATH` | `/health` | Liveness probe endpoint path |
| `READY_CHECK_PATH` | `/ready` | Readiness probe endpoint path |

### CORS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | (empty) | Comma-separated list of allowed origins |

**Example:**
```bash
# Single origin
ALLOWED_ORIGINS=https://myapp.com

# Multiple origins
ALLOWED_ORIGINS=https://myapp.com,https://admin.myapp.com

# Development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Rate Limiting Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Time window in milliseconds (default: 15 minutes) |
| `RATE_LIMIT_MAX` | `100` | Maximum requests per window per IP |

### HTTPS/TLS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTPS_ENABLED` | `false` | Enable HTTPS server |
| `HTTPS_PORT` | `3443` | HTTPS server port |
| `SSL_KEY_PATH` | `./certs/key.pem` | Path to TLS private key |
| `SSL_CERT_PATH` | `./certs/cert.pem` | Path to TLS certificate |

**Generate Development Certificates:**

```bash
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem \
  -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

## Security Features

The server implements a comprehensive security middleware stack:

1. **Helmet.js Security Headers**
   - Content-Security-Policy (CSP)
   - HTTP Strict Transport Security (HSTS)
   - X-Frame-Options (clickjacking protection)
   - X-Content-Type-Options (MIME sniffing prevention)
   - Referrer-Policy

2. **CORS Policy**
   - Origin whitelisting
   - Method restrictions
   - Header validation
   - Credentials support

3. **Rate Limiting**
   - Per-IP request throttling
   - Configurable windows and limits
   - 429 Too Many Requests responses

4. **Input Validation**
   - Joi schema validation
   - Request body size limits
   - Parameter sanitization

5. **Request Logging**
   - Sensitive data redaction
   - Request correlation IDs
   - Audit trail generation

## API Reference

### Health Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/ready` | Readiness probe |

### Application Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Root endpoint |
| `GET` | `/api/data` | Demo data endpoint with validation |

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/security/cors.test.js
```

## License

MIT

---

## References

- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Pino Logger](https://github.com/pinojs/pino)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)
