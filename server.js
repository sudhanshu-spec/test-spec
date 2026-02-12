/**
 * HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server.
 * Configuration is separated from app creation for better testability.
 *
 * Architecture:
 *   - src/app.js       → Express app factory (routes & middleware)
 *   - src/config/      → Environment-driven configuration
 *   - src/routes/      → Route handlers
 *   - src/utils/       → Utility modules (Winston logger)
 *   - src/middleware/   → Express middleware (Morgan, error handling)
 *
 * Usage:
 *   npm start                              # Default: http://127.0.0.1:3000/
 *   HOST=0.0.0.0 PORT=8080 npm start       # Custom binding
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
 * @type {{ host: string, port: number, env: string, logLevel: string, corsOrigin: string }}
 */
const config = require('./src/config');

/**
 * Winston structured logger singleton instance.
 * Used for startup messages and graceful shutdown logging.
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
 * Handle SIGTERM signal for graceful shutdown.
 * PM2 sends SIGTERM when stopping or restarting processes.
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

/**
 * Handle SIGINT signal for graceful shutdown.
 * Triggered by Ctrl+C in terminal.
 */
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});
