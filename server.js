/**
 * HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server.
 * Configuration is separated from app creation for better testability.
 * Includes graceful shutdown handling for PM2 integration.
 *
 * Architecture:
 *   - src/app.js       → Express app factory (routes & middleware)
 *   - src/config/      → Environment-driven configuration
 *   - src/routes/      → Route handlers
 *   - src/utils/       → Utility modules (logger)
 *
 * Usage:
 *   npm start                              # Default: http://127.0.0.1:3000/
 *   HOST=0.0.0.0 PORT=8080 npm start       # Custom binding
 *
 * PM2 Deployment:
 *   pm2 start ecosystem.config.js          # Cluster mode with graceful shutdown
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
 * Structured logger instance for operational logging.
 * Replaces console.log per Rule R-023 for production-grade logging.
 * @type {{ info: Function, error: Function, warn: Function, debug: Function }}
 */
const { logger } = require('./src/utils/logger');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * HTTP server instance.
 * Captured for graceful shutdown handling.
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  // Display startup confirmation with the server URL
  logger.info(`Server running at http://${config.host}:${config.port}/`);
  logger.info(`Environment: ${config.env}`);
});

// =============================================================================
// Graceful Shutdown Handling
// =============================================================================

/**
 * Shutdown timeout in milliseconds.
 * Per section 0.5.5: 30-second timeout for connection draining.
 * @type {number}
 */
const SHUTDOWN_TIMEOUT = 30000;

/**
 * Flag to prevent multiple shutdown attempts.
 * @type {boolean}
 */
let isShuttingDown = false;

/**
 * Graceful shutdown function.
 *
 * Handles server shutdown by:
 * 1. Stopping acceptance of new connections
 * 2. Allowing existing connections to drain within timeout
 * 3. Logging shutdown progress
 * 4. Exiting process with appropriate code
 *
 * Per Rule R-051: Supports PM2 graceful reload and restart.
 *
 * @param {string} signal - The signal that triggered shutdown (e.g., 'SIGTERM', 'SIGINT')
 */
const shutdown = (signal) => {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring duplicate signal');
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal}, initiating graceful shutdown...`);

  // Set timeout for forced shutdown
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  // Prevent timeout from keeping process alive
  forceShutdownTimer.unref();

  // Stop accepting new connections and drain existing ones
  server.close((err) => {
    if (err) {
      logger.error('Error during server close', { error: err.message });
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }

    logger.info('Server closed successfully, all connections drained');
    clearTimeout(forceShutdownTimer);
    process.exit(0);
  });
};

/**
 * SIGTERM signal handler.
 * Triggered by PM2 for graceful reload/restart operations.
 * Per Rule R-051: Supports PM2 kill_timeout configuration.
 */
process.on('SIGTERM', () => shutdown('SIGTERM'));

/**
 * SIGINT signal handler.
 * Triggered by Ctrl+C during development.
 * Provides consistent shutdown behavior across environments.
 */
process.on('SIGINT', () => shutdown('SIGINT'));
