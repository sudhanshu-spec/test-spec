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
 * @type {{ host: string, port: number, env: string }}
 */
const config = require('./src/config');

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
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Handle server binding errors.
 *
 * Catches EADDRINUSE and other binding errors to prevent
 * unhandled exceptions from crashing the process.
 * See: Tech Spec §4.4.2 — Server Startup Error Recovery (PROC-06)
 */
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${config.port} is already in use. ` +
      'Please free the port or use a different one.'
    );
  } else {
    console.error(`Server error: ${error.message}`);
  }
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

/**
 * Initiate graceful server shutdown.
 *
 * Stops accepting new connections and waits for existing
 * connections to drain before exiting the process.
 * See: Tech Spec §4.5.2 — Graceful Shutdown Flow (PROC-07)
 */
const shutdown = () => {
  console.log('Shutdown signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// =============================================================================
// Module Export
// =============================================================================

/**
 * Export the HTTP server instance for external access.
 * Enables graceful shutdown from test suites and process managers.
 *
 * @type {import('http').Server}
 */
module.exports = server;
