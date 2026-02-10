/**
 * HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server.
 * Configuration is separated from app creation for better testability.
 *
 * Features:
 *   - dotenv environment variable loading
 *   - Winston structured logging for startup messages
 *   - Graceful shutdown handlers (SIGTERM/SIGINT) for PM2 compatibility
 *
 * Architecture:
 *   - src/app.js       → Express app factory (routes & middleware)
 *   - src/config/      → Environment-driven configuration
 *   - src/routes/      → Route handlers
 *   - src/middleware/   → Middleware pipeline (helmet, cors, parsers, logging)
 *   - src/utils/       → Utilities (Winston logger)
 *
 * Usage:
 *   npm start                              # Default: http://127.0.0.1:3000/
 *   HOST=0.0.0.0 PORT=8080 npm start       # Custom binding
 *
 * @module server
 */

'use strict';

// Load environment variables from .env file before any other imports
// Gracefully does nothing if .env file is missing
require('dotenv').config();

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
 * @type {{ host: string, port: number, env: string, logLevel: string, corsOrigin: string }}
 */
const config = require('./src/config');

/**
 * Winston structured logger instance.
 * Replaces console.log for production-grade logging with severity levels.
 * @type {import('winston').Logger}
 */
const logger = require('./src/utils/logger');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Start the HTTP server.
 *
 * Binds the Express app to the configured network interface.
 * The callback fires once the server is ready to accept connections.
 */
const server = app.listen(config.port, config.host, () => {
  // Display startup confirmation with the server URL
  logger.info(`Server running at http://${config.host}:${config.port}/`);
});

// =============================================================================
// Graceful Shutdown Handlers
// =============================================================================

/**
 * Handle SIGTERM signal for graceful shutdown
 * Enables zero-downtime reload with PM2
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

/**
 * Handle SIGINT signal for graceful shutdown
 * Handles Ctrl+C in terminal
 */
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});
