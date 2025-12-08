/**
 * HTTP Server Entry Point
 * 
 * This file serves as the application entry point only, responsible for
 * starting the HTTP server and managing graceful shutdown. Express application
 * configuration and routes are separated into their respective modules per
 * Express.js best practices.
 * 
 * This separation enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Clean separation of concerns
 * - Environment-based configuration
 * - Graceful shutdown for zero-downtime deployments
 * - PM2 cluster mode support with proper signal handling
 * 
 * Graceful Shutdown:
 * The server handles SIGTERM (PM2 stop/restart) and SIGINT (Ctrl+C) signals
 * to perform a clean shutdown. It closes the HTTP server to stop accepting
 * new connections and waits for existing requests to complete before exiting.
 * A 10-second timeout ensures the process doesn't hang indefinitely.
 * 
 * Entry point: npm start -> node server.js
 * 
 * @module server
 */

const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

/**
 * Shutdown timeout in milliseconds.
 * If the server doesn't close within this time, force exit.
 * @type {number}
 */
const SHUTDOWN_TIMEOUT = 10000;

/**
 * HTTP server instance.
 * Stored in module scope to enable graceful shutdown.
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  logger.info(`Server running at http://${config.host}:${config.port}/`);
});

/**
 * Performs graceful shutdown of the HTTP server.
 * 
 * This function:
 * 1. Logs the shutdown initiation with the triggering signal
 * 2. Stops accepting new connections
 * 3. Waits for existing connections to complete
 * 4. Exits the process cleanly
 * 5. Forces exit after timeout if server doesn't close
 * 
 * @param {string} signal - The signal or event that triggered shutdown
 *                          (e.g., 'SIGTERM', 'SIGINT', 'uncaughtException')
 */
function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after timeout to prevent hanging
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
}

/**
 * Signal handler for SIGTERM (sent by PM2 stop/restart, container orchestration)
 * Enables zero-downtime deployments in cluster mode.
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Signal handler for SIGINT (sent by Ctrl+C in terminal)
 * Enables clean development shutdown.
 */
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Handler for uncaught exceptions.
 * Logs the error with full stack trace and initiates graceful shutdown.
 * This ensures the application doesn't continue in an undefined state.
 * 
 * Note: In production, consider using a process manager (PM2) that will
 * automatically restart the application after such events.
 */
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

/**
 * Handler for unhandled promise rejections.
 * Logs the rejection reason and initiates graceful shutdown.
 * This ensures async errors don't silently crash the application.
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { 
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
  gracefulShutdown('unhandledRejection');
});
