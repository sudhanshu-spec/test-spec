/**
 * HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server with
 * dotenv-based environment configuration, Winston structured logging,
 * and graceful shutdown signal handling for production readiness.
 *
 * Architecture:
 *   - src/app.js         → Express app factory (routes & middleware)
 *   - src/config/        → Environment-driven configuration
 *   - src/config/logger  → Winston structured logging
 *   - src/routes/        → Route handlers
 *   - src/middleware/     → Middleware pipeline modules
 *
 * Usage:
 *   npm start                              # Default: http://127.0.0.1:3000/
 *   HOST=0.0.0.0 PORT=8080 npm start       # Custom binding
 *
 * @module server
 */

'use strict';

// =============================================================================
// Environment Configuration (must be first, before any config imports)
// =============================================================================

/**
 * Load .env file into process.env before any config module reads it.
 * Does not override existing system environment variables.
 */
require('dotenv').config();

// =============================================================================
// Dependencies
// =============================================================================

/**
 * Pre-configured Express application instance.
 * Routes and middleware are already mounted in src/app.js.
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Application configuration settings.
 * Values are sourced from environment variables with sensible defaults.
 * @type {{ host: string, port: number, env: string, logLevel: string, corsOrigin: string, nodeEnv: string }}
 */
const config = require('./src/config');

/**
 * Winston structured logger instance.
 * Replaces console.log for structured, transport-aware logging.
 * @type {import('winston').Logger}
 */
const logger = require('./src/config/logger');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Start the HTTP server.
 *
 * Binds the Express app to the configured network interface.
 * The server reference is stored for graceful shutdown support.
 * The callback fires once the server is ready to accept connections.
 *
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  // Structured startup confirmation via Winston
  logger.info('Server running', {
    host: config.host,
    port: config.port,
    url: `http://${config.host}:${config.port}/`
  });
});

// =============================================================================
// Graceful Shutdown Handlers
// =============================================================================

/**
 * Handles SIGTERM signal for graceful shutdown.
 * Stops accepting new connections, waits for in-flight requests to complete,
 * then exits cleanly. Used by PM2 and container orchestrators.
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

/**
 * Handles SIGINT signal for graceful shutdown.
 * Triggered by Ctrl+C in terminal or process management signals.
 */
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
