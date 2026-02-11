# sud_manage_newproject

A production-ready HTTP server built with [Express.js 5.x](https://expressjs.com/), featuring structured routing, a comprehensive middleware pipeline, environment-aware configuration, dual-layer logging with Winston and Morgan, and PM2 process management for zero-downtime production deployments.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Middleware Stack](#middleware-stack)
- [Logging](#logging)
- [PM2 Deployment](#pm2-deployment)
- [License](#license)

---

## Prerequisites

Before running this project, ensure the following tools are installed on your system:

| Requirement | Version       | Purpose                                      |
|-------------|---------------|----------------------------------------------|
| Node.js     | >= 18.0.0     | JavaScript runtime (Express 5.x minimum)     |
| npm         | >= 9.0.0      | Package manager for dependency installation   |
| PM2         | >= 6.0.0      | Production process manager (global install)   |

Install PM2 globally for production deployments:

```bash
npm install -g pm2
```

A `.nvmrc` file is included in the project root. If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` to automatically switch to the correct Node.js version.

---

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://gitlab.blitzy.dev/sudhanshu/sud_manage_newproject.git
   cd sud_manage_newproject
   ```

2. **Create your environment file:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` to customize values for your local environment. See [Environment Variables](#environment-variables) for details.

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Start the server:**

   ```bash
   npm start
   ```

   The server will start on the port defined in your `.env` file (default: `3000`).

---

## Available Scripts

| Script              | Command                            | Description                                                       |
|---------------------|------------------------------------|-------------------------------------------------------------------|
| `npm start`         | `node src/server.js`               | Start the server in production mode                               |
| `npm run dev`       | `nodemon src/server.js`            | Start the server in development mode with auto-restart on changes |
| `npm run pm2:start` | `pm2 start ecosystem.config.js`    | Start the application with PM2 in cluster mode                    |
| `npm run pm2:stop`  | `pm2 stop ecosystem.config.js`     | Stop all PM2-managed application instances                        |
| `npm run pm2:reload`| `pm2 reload ecosystem.config.js`   | Perform a zero-downtime reload of all instances                   |
| `npm run pm2:delete`| `pm2 delete ecosystem.config.js`   | Remove the application from the PM2 process list                  |

---

## Project Structure

```
sud_manage_newproject/
├── src/
│   ├── config/
│   │   ├── index.js            # Centralized environment configuration
│   │   └── logger.js           # Winston logger factory
│   ├── middleware/
│   │   ├── errorHandler.js     # Global error-handling middleware
│   │   ├── httpLogger.js       # Morgan-to-Winston HTTP request logger
│   │   └── notFound.js         # 404 catch-all handler
│   ├── routes/
│   │   ├── index.js            # Route aggregator
│   │   └── api.js              # API endpoint definitions
│   ├── app.js                  # Express application factory
│   └── server.js               # HTTP server entry point
├── logs/                        # Runtime log directory (gitignored)
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment variable template
├── .gitignore                   # Version control exclusions
├── .nvmrc                       # Node.js version specification
├── ecosystem.config.js          # PM2 process manager configuration
├── package.json                 # Project manifest and dependencies
└── README.md                    # Project documentation
```

---

## Environment Variables

All environment variables are centralized through `src/config/index.js`. Copy `.env.example` to `.env` and adjust the values for your environment.

| Variable      | Default         | Description                                                                 |
|---------------|-----------------|-----------------------------------------------------------------------------|
| `PORT`        | `3000`          | Port number on which the HTTP server listens                                |
| `NODE_ENV`    | `development`   | Application environment (`development`, `production`, or `test`)            |
| `LOG_LEVEL`   | `debug`         | Minimum log severity level (`error`, `warn`, `info`, `http`, `debug`)       |
| `CORS_ORIGIN` | `*`             | Allowed origins for Cross-Origin requests (use specific origins in production) |

> **Note:** The `.env` file is excluded from version control via `.gitignore`. Never commit sensitive configuration values to the repository. Use `.env.example` as the reference template for required variables.

---

## API Endpoints

All API routes are mounted under the `/api/v1` prefix.

### Health Check

```
GET /api/v1/health
```

Returns the current health status of the server.

**Response:**

```json
{
  "status": "ok",
  "uptime": 12345.678,
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

### Status

```
GET /api/v1/status
```

Returns environment and runtime information.

**Response:**

```json
{
  "status": "ok",
  "environment": "development",
  "nodeVersion": "v20.11.0",
  "memoryUsage": { ... }
}
```

---

## Middleware Stack

The Express middleware pipeline is registered in a specific order within `src/app.js`. The ordering is critical for correct application behavior:

| Order | Middleware         | Package              | Purpose                                                      |
|-------|--------------------|----------------------|--------------------------------------------------------------|
| 1     | Helmet             | `helmet`             | Sets secure HTTP response headers (CSP, HSTS, X-Frame-Options) |
| 2     | CORS               | `cors`               | Handles Cross-Origin Resource Sharing preflight and headers   |
| 3     | Compression        | `compression`        | Compresses response bodies using gzip/deflate                 |
| 4     | Rate Limiting      | `express-rate-limit` | Throttles excessive requests (100 requests per 15 minutes)    |
| 5     | JSON Body Parser   | `express` (built-in) | Parses incoming JSON request bodies                           |
| 6     | URL-Encoded Parser | `express` (built-in) | Parses URL-encoded form submissions                           |
| 7     | HTTP Logger        | `morgan` + `winston` | Logs HTTP requests through Morgan, streamed to Winston        |
| 8     | Routes             | —                    | Application route handlers process matched requests           |
| 9     | Not Found Handler  | —                    | Returns 404 JSON response for unmatched routes                |
| 10    | Error Handler      | —                    | Catches and formats all errors as structured JSON responses   |

---

## Logging

The application uses a dual-layer logging architecture combining **Winston** for application-level structured logging and **Morgan** for HTTP request logging. Morgan output is piped through Winston's stream interface, ensuring all logs flow through a unified transport pipeline.

### Log Levels

| Level   | Priority | Description                              |
|---------|----------|------------------------------------------|
| `error` | 0        | System errors requiring immediate attention |
| `warn`  | 1        | Warning conditions                        |
| `info`  | 2        | General operational events                |
| `http`  | 3        | HTTP request logs (Morgan output)         |
| `debug` | 4        | Diagnostic information for development    |

### Transports

| Transport          | Target                | Environment       | Format                |
|--------------------|-----------------------|-------------------|-----------------------|
| Console            | `stdout`              | All               | Colorized (dev) / JSON (production) |
| Combined File      | `logs/combined.log`   | All               | JSON                  |
| Error File         | `logs/error.log`      | All               | JSON (error level only) |

The `logs/` directory is created automatically at runtime and is excluded from version control.

### Log Level Configuration

Set the `LOG_LEVEL` environment variable to control the minimum severity level. In development, the default is `debug` (all levels visible). In production, use `info` or `warn` to reduce log volume.

---

## PM2 Deployment

The application is configured for production deployment using [PM2](https://pm2.keymetrics.io/) via the `ecosystem.config.js` file.

### Starting with PM2

```bash
# Start in production mode with cluster mode enabled
npm run pm2:start

# Or directly with PM2 CLI
pm2 start ecosystem.config.js --env production
```

### Cluster Mode

PM2 runs the application in **cluster mode** with `instances: "max"`, spawning one worker process per available CPU core. This distributes incoming requests across all cores for maximum throughput. Express.js applications are stateless by default, making them fully cluster-safe.

### Zero-Downtime Reload

To deploy updates without dropping active connections:

```bash
npm run pm2:reload
```

PM2 gracefully restarts each worker sequentially, waiting for existing requests to complete before recycling each process. The application's SIGTERM handler in `src/server.js` ensures in-flight requests are completed before the process exits.

### PM2 Process Management

```bash
# View running processes and their status
pm2 status

# Monitor CPU and memory usage in real time
pm2 monit

# View application logs
pm2 logs sud-manage-newproject

# Stop all instances
npm run pm2:stop

# Remove from PM2 process list
npm run pm2:delete
```

### PM2 Log Management

PM2 collects logs from all cluster workers into unified log files:

| Log File             | Contents                     |
|----------------------|------------------------------|
| `logs/combined.log`  | All application output       |
| `logs/error.log`     | Error-level output only      |
| `logs/out.log`       | Standard output from workers |

The `merge_logs: true` setting in `ecosystem.config.js` combines output from all cluster workers into single log files.

### PM2 Configuration Reference

Key settings in `ecosystem.config.js`:

| Setting              | Value                | Description                                        |
|----------------------|----------------------|----------------------------------------------------|
| `name`               | `sud-manage-newproject` | Application identifier in PM2                   |
| `script`             | `src/server.js`      | Entry point for the application                    |
| `instances`          | `"max"`              | One worker per CPU core                            |
| `exec_mode`          | `"cluster"`          | Enable PM2 cluster mode                            |
| `max_memory_restart` | `"1G"`               | Auto-restart worker if memory exceeds 1 GB         |
| `watch`              | `false`              | Disable file watching in production                |
| `merge_logs`         | `true`               | Combine logs from all cluster workers              |

---

## License

ISC
