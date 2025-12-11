/**
 * HTTP Server Entry Point
 *
 * This file serves as the application entry point, responsible for:
 * - Starting the HTTP server on the configured host and port
 * - Managing graceful shutdown for zero-downtime deployments
 * - Handling process signals (SIGTERM, SIGINT) for PM2 cluster mode
 * - Catching uncaught exceptions and unhandled promise rejections
 *
 * Express application configuration and routes are separated into their
 * respective modules per Express.js best practices. This separation enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Clean separation of concerns between server and application logic
 * - Environment-based configuration via dotenv
 *
 * Usage:
 *   npm start         - Start in development mode
 *   npm run prod      - Start in production mode
 *   npm run pm2:start - Start with PM2 cluster mode
 *
 * @module server
 */

// =============================================================================
// Module Dependencies
// =============================================================================

const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

// =============================================================================
// Constants
// =============================================================================

/**
 * Shutdown timeout in milliseconds.
 * The server will force exit if graceful shutdown takes longer than this.
 * @constant {number}
 */
const SHUTDOWN_TIMEOUT_MS = 10000;

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * HTTP server instance.
 * Stored at module scope to enable graceful shutdown from signal handlers.
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  logger.info(`Server running at http://${config.host}:${config.port}/`);
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

/**
 * Performs graceful shutdown of the HTTP server.
 *
 * Shutdown sequence:
 * 1. Log the shutdown initiation with the triggering signal
 * 2. Stop accepting new connections (server.close)
 * 3. Wait for existing connections to complete
 * 4. Exit the process with code 0 (success)
 * 5. Force exit with code 1 if timeout is exceeded
 *
 * @param {string} signal - The signal or event that triggered shutdown
 *                          (e.g., 'SIGTERM', 'SIGINT', 'uncaughtException')
 */
function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections and close existing ones
  server.close(() => {
    logger.info('HTTP server closed successfully');
    process.exit(0);
  });

  // Force shutdown if graceful close takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
}

// =============================================================================
// Process Signal Handlers
// =============================================================================

/**
 * SIGTERM handler - Sent by PM2 stop/restart and container orchestration.
 * Enables zero-downtime deployments in cluster mode.
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * SIGINT handler - Sent by Ctrl+C in terminal.
 * Enables clean shutdown during development.
 */
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// Error Handlers
// =============================================================================

/**
 * Uncaught exception handler.
 * Logs the error with full stack trace and initiates graceful shutdown.
 * Prevents the application from continuing in an undefined state.
 *
 * Note: PM2 will automatically restart the application after such events.
 */
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', {
    error: err.message,
    stack: err.stack
  });
  gracefulShutdown('uncaughtException');
});

/**
 * Unhandled promise rejection handler.
 * Logs the rejection reason and initiates graceful shutdown.
 * Ensures async errors don't silently crash the application.
 */
process.on('unhandledRejection', (reason) => {
  const isError = reason instanceof Error;
  logger.error('Unhandled promise rejection', {
    reason: isError ? reason.message : String(reason),
    stack: isError ? reason.stack : undefined
  });
  gracefulShutdown('unhandledRejection');
});

// =============================================================================
// Module Export (for testing purposes)
// =============================================================================

/**
 * Export the server instance for testing and programmatic control.
 * This enables integration tests to start/stop the server as needed.
 */
module.exports = server;
