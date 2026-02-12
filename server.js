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
// Configuration Validation
// =============================================================================

/**
 * Validate the configured port number.
 * Ensures the port is an integer within the valid TCP range (1–65535).
 * Exits the process with a diagnostic message if validation fails.
 * @type {void}
 */
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  console.error(`Invalid port number: ${config.port}. Must be an integer between 1 and 65535.`);
  process.exit(1);
}

/**
 * Validate the configured host string.
 * Ensures the host is a non-empty string suitable for network binding.
 * Exits the process with a diagnostic message if validation fails.
 * @type {void}
 */
if (typeof config.host !== 'string' || config.host.length === 0) {
  console.error(`Invalid host: "${config.host}". Must be a non-empty string.`);
  process.exit(1);
}

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Start the HTTP server.
 *
 * Binds the Express app to the configured network interface.
 * The callback fires once the server is ready to accept connections.
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  // Display startup confirmation with the server URL
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Handle server bind-time errors.
 *
 * Catches errors emitted by the server during binding (e.g., EADDRINUSE,
 * EACCES) and logs a diagnostic message before exiting. This prevents
 * unhandled 'error' events from crashing the process with an uncaught exception.
 *
 * @param {NodeJS.ErrnoException} error - The error emitted by the server.
 */
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use.`);
  } else if (error.code === 'EACCES') {
    console.error(`Port ${config.port} requires elevated privileges.`);
  } else {
    console.error(`Server error: ${error.message}`);
  }
  process.exit(1);
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

/**
 * Initiate a graceful server shutdown.
 *
 * Stops accepting new connections and waits for in-flight requests to complete.
 * If connections do not drain within 5 seconds, forces termination to prevent
 * indefinite hangs. Registered for both SIGTERM (process managers, Docker,
 * Kubernetes) and SIGINT (developer Ctrl+C).
 *
 * @param {string} signal - The signal that triggered the shutdown (e.g., 'SIGTERM', 'SIGINT').
 */
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('Server closed. Exiting.');
    process.exit(0);
  });

  /**
   * Forced-shutdown timeout.
   * If the server cannot close all connections within 5 seconds, force
   * termination to prevent the process from hanging indefinitely.
   * The .unref() call ensures this timeout does not keep the event loop alive.
   * @type {NodeJS.Timeout}
   */
  const forceTimeout = setTimeout(() => {
    console.error('Forced shutdown: could not close connections in time.');
    process.exit(1);
  }, 5000);
  forceTimeout.unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// Module Export
// =============================================================================

/**
 * Export the HTTP server instance.
 *
 * Provides the http.Server instance for external programmatic control
 * and test integration. Enables callers to invoke server.close(),
 * server.on(), and server.address() for lifecycle management.
 *
 * @type {import('http').Server}
 */
module.exports = server;
