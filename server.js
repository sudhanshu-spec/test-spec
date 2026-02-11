/**
 * HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server with
 * production-ready features including dotenv environment loading,
 * Winston structured logging, graceful shutdown signal handling,
 * and PM2 process manager readiness signaling.
 *
 * Configuration is separated from app creation for better testability.
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
 *   npm run start:pm2                      # PM2 cluster mode
 *
 * @module server
 */

'use strict';

// =============================================================================
// Environment Configuration (MUST be first — populates process.env before
// any other module reads environment variables)
// =============================================================================

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
 * @type {{ host: string, port: number, env: string, logLevel: string, appName: string, corsOrigin: string }}
 */
const config = require('./src/config');

/**
 * Winston structured logger instance.
 * Replaces raw console.log/console.error with level-based,
 * transport-aware logging for production readiness.
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
 * Signals PM2 readiness when running under PM2 process management.
 *
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  // Display startup confirmation with the server URL
  logger.info(`Server running at http://${config.host}:${config.port}/`);

  // Signal PM2 that the application is ready to accept traffic.
  // This works in conjunction with wait_ready: true in ecosystem.config.js.
  // When not running under PM2, process.send is undefined and this is skipped.
  if (process.send) {
    process.send('ready');
  }
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

/**
 * Gracefully shuts down the HTTP server in response to process signals.
 *
 * Stops accepting new connections, allows in-flight requests to complete,
 * and exits the process cleanly. This ensures zero data loss during
 * deployments, restarts, and scaling operations under PM2.
 *
 * @param {string} signal - The process signal that triggered shutdown (e.g., 'SIGINT', 'SIGTERM')
 */
function gracefulShutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

// Register shutdown handlers for common process termination signals:
// - SIGINT:  Sent on Ctrl+C in terminal or by orchestration tools
// - SIGTERM: Sent by PM2, Docker, Kubernetes for graceful shutdown
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// =============================================================================
// Module Export
// =============================================================================

module.exports = server;
