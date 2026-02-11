/**
 * @fileoverview HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server with production-ready
 * features including dotenv environment loading, Winston structured logging,
 * graceful shutdown signal handling (SIGINT/SIGTERM), and PM2 process readiness.
 *
 * Configuration is separated from app creation for better testability.
 *
 * Architecture:
 *   - src/app.js        → Express app factory (routes & middleware)
 *   - src/config/       → Environment-driven configuration
 *   - src/routes/       → Route handlers
 *   - src/middleware/    → Middleware pipeline
 *   - src/utils/        → Logging and utility modules
 *
 * Usage:
 *   npm start                              # Default: http://127.0.0.1:3000/
 *   HOST=0.0.0.0 PORT=8080 npm start       # Custom binding
 *   npm run start:prod                     # Production mode
 *   npm run start:pm2                      # PM2 cluster mode
 *
 * @module server
 */

'use strict';

// =============================================================================
// Environment Configuration (MUST be first, before any other imports)
// =============================================================================

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
 * @type {{ host: string, port: number, env: string, logLevel: string, appName: string, corsOrigin: string }}
 */
const config = require('./src/config');

/**
 * Winston structured logger instance.
 * Replaces raw console.log/console.error with level-based logging.
 * @type {import('winston').Logger}
 */
const logger = require('./src/utils/logger');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Start the HTTP server.
 *
 * Binds the Express app to the configured network interface.
 * The callback fires once the server is ready to accept connections.
 *
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  // Display startup confirmation with the server URL
  logger.info(`Server running at http://${config.host}:${config.port}/`);

  // Signal PM2 that the application is ready to accept traffic
  // This is used with wait_ready: true in ecosystem.config.js
  if (process.send) {
    process.send('ready');
  }
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

/**
 * Handles graceful shutdown of the HTTP server.
 *
 * Stops accepting new connections, allows in-flight requests to complete,
 * then exits the process cleanly. Used by PM2 and container orchestrators
 * for zero-downtime deployments.
 *
 * @param {string} signal - The signal name that triggered shutdown (e.g., 'SIGINT', 'SIGTERM')
 */
function gracefulShutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

// Register signal handlers for graceful shutdown
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// =============================================================================
// Module Export
// =============================================================================

module.exports = server;
