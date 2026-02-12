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
 * Validates the application configuration before server startup.
 *
 * Ensures that:
 *   - config.port is an integer in the valid TCP range (1–65535)
 *   - config.host is a non-empty string
 *
 * This prevents cryptic low-level bind errors (e.g. RangeError from
 * net.Server.listen()) by failing fast with clear diagnostic messages.
 *
 * @throws {RangeError} If port is not an integer or is outside 1–65535.
 * @throws {TypeError}  If host is not a non-empty string.
 */
function validateConfig() {
  const port = config.port;
  const host = config.host;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError(
      `Invalid port: ${port}. Port must be an integer between 1 and 65535.`
    );
  }

  if (typeof host !== 'string' || host.trim().length === 0) {
    throw new TypeError(
      `Invalid host: "${host}". Host must be a non-empty string.`
    );
  }
}

validateConfig();

// =============================================================================
// Graceful Shutdown Configuration
// =============================================================================

/**
 * Maximum time (in milliseconds) to wait for in-flight requests to complete
 * before forcefully terminating the process during shutdown.
 * A 10-second window accommodates most request-draining scenarios while
 * preventing zombie processes.
 * @type {number}
 */
const SHUTDOWN_TIMEOUT_MS = 10000;

/**
 * Guard flag to prevent duplicate shutdown attempts when multiple signals
 * are received in quick succession (e.g. SIGTERM followed by SIGINT).
 * @type {boolean}
 */
let isShuttingDown = false;

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Start the HTTP server and capture the http.Server instance.
 *
 * Binds the Express app to the configured network interface.
 * The returned server reference enables lifecycle management:
 * error handling, graceful shutdown, and integration testing.
 *
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  // Display startup confirmation with the server URL
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

// =============================================================================
// Server Error Handling
// =============================================================================

/**
 * Handle server-level errors emitted during startup or operation.
 *
 * Provides human-readable messages for common bind failures:
 *   - EADDRINUSE: Another process already occupies the requested port.
 *   - EACCES:     The port requires elevated (root) privileges.
 *
 * Unrecognized errors are re-thrown so they propagate to the
 * uncaughtException handler registered below.
 *
 * @listens http.Server#error
 */
server.on('error', (error) => {
  switch (error.code) {
    case 'EADDRINUSE':
      console.error(
        `Error: Port ${config.port} is already in use. ` +
        'Please choose a different port or stop the other process.'
      );
      process.exit(1);
      break;

    case 'EACCES':
      console.error(
        `Error: Port ${config.port} requires elevated privileges. ` +
        'Run with sudo or choose a port above 1024.'
      );
      process.exit(1);
      break;

    default:
      throw error;
  }
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

/**
 * Performs a graceful shutdown of the HTTP server.
 *
 * Shutdown sequence:
 *   1. Sets the isShuttingDown guard flag to prevent duplicate invocations.
 *   2. Starts a force-exit timer (SHUTDOWN_TIMEOUT_MS) as a safety net
 *      for cases where server.close() hangs. The timer is unref'd so it
 *      does not keep the event loop alive on its own.
 *   3. Calls server.close() to stop accepting new connections and wait
 *      for in-flight requests to complete.
 *   4. Exits with code 0 on success, or code 1 on error.
 *
 * @param {string} signal - The signal or event name that triggered shutdown
 *                          (e.g., 'SIGTERM', 'SIGINT', 'uncaughtException').
 */
function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`Received ${signal}. Starting graceful shutdown...`);

  // Force-exit safety net: if server.close() hangs, terminate after timeout
  const forceExitTimer = setTimeout(() => {
    console.error(
      `Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms. Forcing exit.`
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    console.log('HTTP server closed successfully.');
    process.exit(0);
  });
}

// Register signal handlers for process managers and manual termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// Process-Level Error Handlers
// =============================================================================

/**
 * Catch-all handler for uncaught synchronous exceptions.
 *
 * Logs the error and initiates graceful shutdown. Per Node.js documentation,
 * the process should not attempt to resume normal operation after an
 * uncaught exception — cleanup and exit is the only safe action.
 *
 * @listens process#uncaughtException
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

/**
 * Catch-all handler for unhandled Promise rejections.
 *
 * Logs the rejection reason and initiates graceful shutdown.
 * This prevents silent failures from unguarded async operations
 * outside of Express middleware (where Express 5 auto-catches them).
 *
 * @listens process#unhandledRejection
 */
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

// =============================================================================
// Module Export
// =============================================================================

/**
 * Export the server instance for integration testing and programmatic access.
 * Exposes close(), address(), on(), and listen() methods from http.Server.
 * @type {import('http').Server}
 */
module.exports = server;
