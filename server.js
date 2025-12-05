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
 * - Dotenv integration for environment variable loading
 * - Winston logger for structured startup/shutdown logging
 * - Graceful shutdown handling for SIGTERM/SIGINT signals
 * - PM2 compatible process management
 * 
 * Entry point: npm start -> node server.js
 * 
 * @module server
 */

// Load environment variables FIRST before any other imports that use config
require('dotenv').config();

const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

/**
 * Start HTTP server
 * Store reference for graceful shutdown
 */
const server = app.listen(config.port, config.host, () => {
  logger.info(`Server running at http://${config.host}:${config.port}/`);
  logger.info(`Environment: ${config.env}`);
});

/**
 * Graceful shutdown handler
 * 
 * Handles clean shutdown when receiving termination signals.
 * Closes the HTTP server to stop accepting new connections,
 * allows existing requests to complete, and exits cleanly.
 * Forces exit after 10 second timeout if shutdown hangs.
 * 
 * @param {string} signal - The signal received (SIGTERM or SIGINT)
 */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after timeout if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

/**
 * Signal handlers for graceful shutdown
 * SIGTERM: Sent by PM2 on stop/restart, container orchestration
 * SIGINT: Sent when pressing Ctrl+C in terminal
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
