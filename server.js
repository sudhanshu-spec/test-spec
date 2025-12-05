/**
 * Load environment variables from .env file
 * MUST be first line before any other imports that use configuration
 * This ensures environment variables are available throughout the application
 */
require('dotenv').config();

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
 * Entry point: npm start -> node server.js
 * 
 * @module server
 */

const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

/**
 * Start the HTTP server and listen on configured host and port
 * Server instance is stored to enable graceful shutdown
 */
const server = app.listen(config.port, config.host, () => {
  logger.info(`Server running at http://${config.host}:${config.port}/`);
});

/**
 * Graceful shutdown handler
 * 
 * Handles process termination signals by:
 * 1. Stopping acceptance of new connections
 * 2. Allowing in-flight requests to complete
 * 3. Forcing shutdown after timeout to prevent hanging
 * 
 * @param {string} signal - The signal received (SIGTERM or SIGINT)
 */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after timeout to prevent hanging indefinitely
  // Allows 10 seconds for in-flight requests to complete
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

/**
 * Register signal handlers for graceful shutdown
 * 
 * SIGTERM: Sent by PM2 on stop/restart, container orchestration
 * SIGINT: Sent when user presses Ctrl+C in terminal
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
