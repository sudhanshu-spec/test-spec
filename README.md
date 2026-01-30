# Hello World - Production-Ready Express.js Server

A production-ready Express.js server with enterprise-grade capabilities including modular routing, comprehensive middleware stack, structured logging with Winston, environment-based configuration, and PM2 process management.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running in Development](#running-in-development)
- [Production Deployment with PM2](#production-deployment-with-pm2)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** >= 18.0.0
  - Verify with: `node --version`
  - Download from: [https://nodejs.org/](https://nodejs.org/)

- **npm** (comes with Node.js)
  - Verify with: `npm --version`

- **PM2** (for production deployment)
  - Install globally: `npm install -g pm2`
  - Verify with: `pm2 --version`

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hello_world
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment configuration**
   ```bash
   cp .env.example .env
   ```

4. **Verify the logs directory exists**
   ```bash
   mkdir -p logs
   ```

## Environment Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env` and configure the following variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | The port on which the server will listen |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `LOG_LEVEL` | No | `info` | Minimum log level (`error`, `warn`, `info`, `http`, `debug`) |
| `LOG_DIR` | No | `./logs` | Directory for log file output |

### Example `.env` file

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=info
LOG_DIR=./logs
```

### Environment-Specific Settings

- **Development**: Verbose logging, colored console output
- **Production**: JSON-formatted logs, error-level console output, file logging enabled

## Running in Development

For development with automatic restart on file changes:

```bash
npm run dev
```

This uses `nodemon` to watch for file changes and automatically restart the server.

For standard development without auto-reload:

```bash
npm start
```

The server will start on the configured port (default: 3000). You can access it at:
- http://localhost:3000/

## Production Deployment with PM2

PM2 is used for production deployment, providing process management, clustering, and monitoring capabilities.

### Initial Setup

1. **Install PM2 globally** (if not already installed)
   ```bash
   npm install -g pm2
   ```

2. **Start the application with PM2**
   ```bash
   npm run prod
   ```
   
   Or directly with PM2:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

3. **Save the PM2 process list** (to restart on reboot)
   ```bash
   pm2 save
   ```

4. **Configure PM2 startup script** (to start on system boot)
   ```bash
   pm2 startup
   ```
   Follow the instructions provided by the command.

### PM2 Commands Reference

| Command | Description |
|---------|-------------|
| `pm2 status` | View status of all processes |
| `pm2 logs` | View real-time logs |
| `pm2 logs hello-world` | View logs for this application |
| `pm2 monit` | Open the monitoring dashboard |
| `pm2 reload hello-world` | Zero-downtime reload |
| `pm2 restart hello-world` | Restart the application |
| `pm2 stop hello-world` | Stop the application |
| `pm2 delete hello-world` | Remove from PM2 process list |

### Cluster Mode

The application is configured to run in cluster mode by default, utilizing all available CPU cores. This is configured in `ecosystem.config.js`:

```javascript
instances: 'max',       // Use all CPU cores
exec_mode: 'cluster',   // Enable clustering
```

## API Endpoints

### Health Check

```
GET /health
```

Returns the health status of the application.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Root Endpoint

```
GET /
```

Returns a greeting message.

**Response:**
```
Hello, World!
```

### Evening Greeting

```
GET /evening
```

Returns an evening greeting message.

**Response:**
```
Good evening
```

### Error Responses

All error responses follow a consistent JSON format:

```json
{
  "error": "Error message",
  "status": 404
}
```

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid request format |
| 404 | Not Found - Endpoint does not exist |
| 500 | Internal Server Error - Server-side error |

## Project Structure

```
hello_world/
├── config/
│   └── index.js          # Centralized configuration module
├── logs/
│   ├── combined.log      # All logs
│   └── error.log         # Error-level logs only
├── middleware/
│   ├── errorHandler.js   # Global error handling middleware
│   └── requestLogger.js  # HTTP request logging (Morgan + Winston)
├── routes/
│   ├── api.js            # API route definitions
│   └── index.js          # Router aggregator
├── utils/
│   └── logger.js         # Winston logger configuration
├── .env                  # Environment variables (not in version control)
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore patterns
├── ecosystem.config.js   # PM2 configuration
├── package.json          # NPM manifest
├── README.md             # This file
└── server.js             # Application entry point
```

## Troubleshooting

### Common Issues

#### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
1. Find the process using the port:
   ```bash
   lsof -i :3000
   ```
2. Kill the process or change the `PORT` in your `.env` file.

#### PM2 Process Not Starting

**Error:** Process shows as `errored` in `pm2 status`

**Solution:**
1. Check the logs:
   ```bash
   pm2 logs hello-world --lines 50
   ```
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

#### Logs Directory Permission Error

**Error:** `EACCES: permission denied, open './logs/combined.log'`

**Solution:**
1. Create the logs directory with proper permissions:
   ```bash
   mkdir -p logs
   chmod 755 logs
   ```

#### Module Not Found Errors

**Error:** `Cannot find module 'winston'` or similar

**Solution:**
1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
2. Clear npm cache if issues persist:
   ```bash
   npm cache clean --force
   npm install
   ```

#### Environment Variables Not Loading

**Error:** Configuration values showing as `undefined`

**Solution:**
1. Verify `.env` file exists in the project root
2. Check `.env` file syntax (no spaces around `=`)
3. Ensure `dotenv` is loaded at application start

### Getting Help

If you encounter issues not covered here:

1. Check the application logs:
   - Development: Console output
   - Production: `logs/combined.log` and `logs/error.log`

2. Verify your Node.js version:
   ```bash
   node --version  # Should be >= 18.0.0
   ```

3. Check PM2 status and logs:
   ```bash
   pm2 status
   pm2 logs
   ```

## License

ISC

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

For additional information about the middleware stack, logging configuration, or deployment options, refer to the inline documentation in the respective source files.
