/**
 * Express.js Application Entry Point
 * 
 * Production-ready Express.js server with modular architecture featuring:
 * - Centralized configuration via environment variables
 * - Comprehensive middleware stack (security, logging, compression)
 * - Modular routing structure for scalability
 * - Structured logging with Winston
 * - Graceful shutdown handling
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

// Load environment variables from .env file FIRST
// This must be called before any other modules that depend on environment variables
require('dotenv').config();

// External dependencies
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

// Internal modules
const config = require('./config');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

/**
 * Create Express application instance
 * @type {import('express').Application}
 */
const app = express();

/**
 * Middleware Stack Configuration
 * 
 * CRITICAL: Middleware order matters for security and functionality.
 * The order below follows Express.js best practices:
 * 
 * 1. helmet() - Security headers (first for protection against common vulnerabilities)
 * 2. cors() - CORS headers (enable cross-origin requests before processing)
 * 3. compression() - Response compression (compress all responses)
 * 4. express.json() - Parse JSON request bodies
 * 5. express.urlencoded() - Parse URL-encoded request bodies
 * 6. requestLogger - HTTP request logging (after body parsers to log complete requests)
 * 7. routes - Application routes
 * 8. errorHandler - Error handling (MUST be last to catch all errors)
 */

// 1. Security headers middleware - protects against common web vulnerabilities
// Sets headers like X-Frame-Options, X-Content-Type-Options, CSP, etc.
app.use(helmet());

// 2. CORS middleware - enables cross-origin resource sharing
// Allows API access from different domains
app.use(cors());

// 3. Response compression middleware - gzip/deflate compression
// Reduces response size for better network performance
app.use(compression());

// 4. JSON body parser middleware - parses JSON request bodies
// Makes req.body available for JSON payloads
app.use(express.json());

// 5. URL-encoded body parser middleware - parses URL-encoded bodies
// Makes req.body available for form submissions
app.use(express.urlencoded({ extended: true }));

// 6. HTTP request logging middleware - logs all incoming requests
// Uses Morgan configured with Winston stream for structured logging
app.use(requestLogger);

// 7. Application routes - mounts all route modules
// Includes GET /, GET /evening, GET /health, and 404 handler
app.use('/', routes);

// 8. Global error handling middleware - catches all unhandled errors
// MUST be the LAST middleware to properly catch errors from routes
app.use(errorHandler);

/**
 * Server instance reference for graceful shutdown
 * @type {import('http').Server|null}
 */
let server = null;

/**
 * Start the Express server
 * 
 * Binds to 0.0.0.0 (all interfaces) for production compatibility
 * with load balancers and container environments.
 */
server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

/**
 * Graceful Shutdown Handler
 * 
 * Handles server shutdown gracefully when receiving termination signals.
 * Closes the server and waits for existing connections to complete.
 * 
 * @param {string} signal - The signal that triggered the shutdown (e.g., 'SIGTERM', 'SIGINT')
 */
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        logger.error('Error during server shutdown', { error: err.message });
        process.exit(1);
      }
      
      logger.info('Server closed successfully. Exiting process.');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds if connections don't close
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Register shutdown handlers for clean process termination
// SIGTERM: Sent by process managers (PM2, Kubernetes, Docker)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// SIGINT: Sent when pressing Ctrl+C in terminal
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Unhandled Rejection Handler
 * 
 * Catches unhandled promise rejections to prevent silent failures.
 * Logs the error and exits gracefully.
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

/**
 * Uncaught Exception Handler
 * 
 * Catches uncaught exceptions that weren't handled by try/catch.
 * Logs the error and initiates graceful shutdown.
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack
  });
  
  // Exit after uncaught exception - the app may be in an undefined state
  gracefulShutdown('uncaughtException');
});

module.exports = app;
