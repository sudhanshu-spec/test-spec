/**
 * Express.js Application Entry Point
 * 
 * Production-ready Express.js server with comprehensive middleware stack,
 * modular routing, structured logging, and graceful shutdown handling.
 * 
 * Middleware Stack (applied in order):
 * 1. helmet - Security headers
 * 2. cors - Cross-Origin Resource Sharing
 * 3. compression - Response compression
 * 4. express.json - JSON body parser
 * 5. express.urlencoded - URL-encoded body parser
 * 6. requestLogger - HTTP request logging
 * 7. routes - Application routes
 * 8. errorHandler - Global error handling (must be last)
 * 
 * @module server
 * @requires dotenv
 * @requires express
 * @requires helmet
 * @requires cors
 * @requires compression
 * @requires ./config
 * @requires ./utils/logger
 * @requires ./middleware/requestLogger
 * @requires ./middleware/errorHandler
 * @requires ./routes
 */

'use strict';

// Load environment variables from .env file
// Must be loaded before other modules that depend on environment variables
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

// Import local modules
const config = require('./config');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

// Initialize Express application
const app = express();

/**
 * Middleware Stack Configuration
 * 
 * CRITICAL: Middleware order matters for security and functionality
 */

// 1. Security headers (first for protection)
// Sets various HTTP headers to protect against common web vulnerabilities
app.use(helmet());

// 2. CORS configuration
// Enables cross-origin requests with configurable options
app.use(cors());

// 3. Response compression
// Compresses response bodies using gzip/deflate for improved performance
app.use(compression());

// 4. JSON body parser
// Parses incoming JSON payloads and makes them available in req.body
app.use(express.json({ limit: '10mb' }));

// 5. URL-encoded body parser
// Parses URL-encoded payloads (form submissions)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. HTTP request logging
// Logs all incoming HTTP requests via Morgan -> Winston
app.use(requestLogger);

// 7. Application routes
// Mount all route modules at root path
app.use('/', routes);

// 8. Global error handler (must be last middleware)
// Catches all unhandled errors and returns structured JSON responses
app.use(errorHandler);

/**
 * Start the HTTP server
 */
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

/**
 * Graceful Shutdown Handler
 * 
 * Handles SIGTERM and SIGINT signals for clean process termination.
 * Closes the HTTP server and allows existing connections to complete.
 * 
 * @param {string} signal - The signal that triggered shutdown
 */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} signal received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }
    
    logger.info('Server closed. Process terminating.');
    process.exit(0);
  });
  
  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason, promise: promise });
});

module.exports = app;
