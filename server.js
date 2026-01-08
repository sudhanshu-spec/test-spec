/**
 * HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server.
 * Configuration is separated from app creation for better testability.
 * Includes graceful shutdown handling for PM2 deployment support.
 *
 * Architecture:
 *   - src/app.js       → Express app factory (routes & middleware)
 *   - src/config/      → Environment-driven configuration
 *   - src/routes/      → Route handlers
 *   - src/middleware/  → Request processing middleware
 *   - src/utils/       → Shared utilities (logger)
 *
 * Usage:
 *   npm start                              # Default: http://127.0.0.1:3000/
 *   HOST=0.0.0.0 PORT=8080 npm start       # Custom binding
 *   npm run pm2:start                      # PM2 cluster mode
 *
 * Graceful Shutdown:
 *   - Handles SIGTERM (PM2 reload) and SIGINT (Ctrl+C)
 *   - Drains existing connections before exit
 *   - 30-second timeout for connection draining
 *
 * @module server
 */

'use strict';

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
 * @type {{ host: string, port: number, env: string }}
 */
const config = require('./src/config');

/**
 * Structured logger for operational messages.
 * Replaces console.log per Rule R-023.
 * @type {{ info: Function, warn: Function, error: Function }}
 */
const { logger } = require('./src/utils/logger');

// =============================================================================
// Graceful Shutdown Configuration
// =============================================================================

/**
 * Shutdown timeout in milliseconds.
 * Maximum time to wait for existing connections to close
 * before forcing a shutdown.
 * @type {number}
 */
const SHUTDOWN_TIMEOUT = 30000;

/**
 * Flag to prevent multiple shutdown attempts.
 * @type {boolean}
 */
let isShuttingDown = false;

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * HTTP server instance.
 * Captured for graceful shutdown handling.
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  // Log startup confirmation with server URL per R-043
  logger.info(`Server running at http://${config.host}:${config.port}/`);
  logger.info(`Environment: ${config.env}`);
});

// =============================================================================
// Graceful Shutdown Handling
// =============================================================================

/**
 * Graceful Shutdown Handler
 *
 * Performs a clean shutdown of the HTTP server:
 * 1. Stops accepting new connections
 * 2. Waits for existing connections to close
 * 3. Forces shutdown after timeout
 *
 * Supports PM2 reload operations per Rule R-051.
 *
 * @param {string} signal - The signal that triggered shutdown (SIGTERM, SIGINT)
 */
const shutdown = (signal) => {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress...');
    return;
  }
  isShuttingDown = true;

  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Create timeout for forced shutdown
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Shutdown timeout exceeded. Forcing exit...');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  // Prevent timeout from keeping process alive
  forceShutdownTimer.unref();

  // Close server - stops accepting new connections
  server.close((err) => {
    clearTimeout(forceShutdownTimer);

    if (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }

    logger.info('Server closed. All connections drained.');
    logger.info('Graceful shutdown complete.');
    process.exit(0);
  });
};

/**
 * Register signal handlers for graceful shutdown.
 * - SIGTERM: Sent by PM2 for graceful reload
 * - SIGINT: Sent by Ctrl+C in terminal
 */
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Handle uncaught exceptions.
 * Logs the error and initiates graceful shutdown.
 */
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

/**
 * Handle unhandled promise rejections.
 * Logs the error for monitoring purposes.
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = server;
