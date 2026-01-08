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
// DEPENDENCIES
// =============================================================================

// Express application factory - routes and middleware pre-configured
const app = require('./src/app');

// Environment-driven configuration (host, port, env)
const config = require('./src/config');

// Structured logger for production-grade logging (replaces console.log)
const { logger } = require('./src/utils/logger');

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

// Start HTTP server and capture instance for graceful shutdown
const server = app.listen(config.port, config.host, () => {
  // Log startup confirmation with server URL and current environment
  logger.info(`Server running at http://${config.host}:${config.port}/`);
  logger.info(`Environment: ${config.env}`);
});

// =============================================================================
// GRACEFUL SHUTDOWN HANDLING
// =============================================================================

// Maximum time (ms) to wait for connections to drain before forced exit
const SHUTDOWN_TIMEOUT_MS = 30000;

// Prevents multiple concurrent shutdown attempts
let isShuttingDown = false;

/**
 * Initiates graceful server shutdown.
 *
 * Shutdown sequence:
 *   1. Stop accepting new connections
 *   2. Wait for existing connections to complete (up to timeout)
 *   3. Exit with appropriate status code
 *
 * @param {string} signal - Signal that triggered shutdown (e.g., 'SIGTERM')
 */
function shutdown(signal) {
  // Guard: Prevent duplicate shutdown attempts
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring duplicate signal');
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal}, initiating graceful shutdown...`);

  // Safety net: Force exit if graceful shutdown takes too long
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  // Allow process to exit even if timer is still pending
  forceShutdownTimer.unref();

  // Close server: Stop new connections, drain existing ones
  server.close((closeError) => {
    clearTimeout(forceShutdownTimer);

    if (closeError) {
      logger.error('Error during server close', { error: closeError.message });
      process.exit(1);
    }

    logger.info('Server closed successfully, all connections drained');
    process.exit(0);
  });
}

// =============================================================================
// PROCESS SIGNAL HANDLERS
// =============================================================================

// SIGTERM: Sent by PM2 for graceful reload/restart
process.on('SIGTERM', () => shutdown('SIGTERM'));

// SIGINT: Sent by Ctrl+C during development
process.on('SIGINT', () => shutdown('SIGINT'));

// Uncaught exceptions: Log and shutdown to prevent undefined state
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  shutdown('uncaughtException');
});

// Unhandled promise rejections: Log and shutdown for async error safety
process.on('unhandledRejection', (reason) => {
  // Normalize reason to extract message and stack consistently
  const isError = reason instanceof Error;
  logger.error('Unhandled promise rejection', {
    reason: isError ? reason.message : String(reason),
    stack: isError ? reason.stack : undefined
  });
  shutdown('unhandledRejection');
});
