/**
 * HTTP Server Entry Point
 * 
 * This file serves as the application entry point only, responsible for
 * starting the HTTP server. Express application configuration and routes
 * are separated into their respective modules per Express.js best practices.
 * 
 * This separation enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Clean separation of concerns
 * - Environment-based configuration
 * 
 * Features:
 * - Graceful shutdown handling for SIGTERM and SIGINT signals
 * - PM2 integration support for production deployment
 * - Uncaught exception handling for production safety
 * 
 * Entry point: npm start -> node server.js
 * 
 * @module server
 */

const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

/**
 * Start HTTP server and store reference for graceful shutdown
 */
const server = app.listen(config.port, config.host, () => {
  logger.info(`Server running at http://${config.host}:${config.port}/`);
});

/**
 * Graceful shutdown handler
 * Closes HTTP connections and exits cleanly
 * 
 * @param {string} signal - The signal that triggered shutdown
 */
function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after timeout (10 seconds)
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
}

/**
 * Process signal handlers for PM2 and container orchestration
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Uncaught exception handler for production safety
 */
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

/**
 * Unhandled promise rejection handler
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});
