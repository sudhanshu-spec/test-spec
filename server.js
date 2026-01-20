'use strict';

/**
 * HTTP Server Entry Point
 *
 * This module serves as the sole entry point for starting the HTTP server.
 * It imports the pre-configured Express application and configuration,
 * then binds the server to the specified host and port with robust error
 * handling, graceful shutdown, and configuration validation.
 *
 * Features:
 * ---------
 * - Error handling for EADDRINUSE, EACCES, and other startup errors
 * - Graceful shutdown on SIGTERM and SIGINT signals
 * - Configuration validation before server startup
 * - Timeout mechanism for forced shutdown if graceful shutdown hangs
 *
 * Architecture Overview:
 * ----------------------
 * - Express app configuration lives in: src/app.js
 * - Configuration settings live in: src/config/index.js
 * - Route handlers live in: src/routes/
 *
 * Usage:
 * ------
 * Standard:   npm start
 * Custom:     HOST=0.0.0.0 PORT=8080 npm start
 *
 * @module server
 * @requires ./src/app - The configured Express application instance
 * @requires ./src/config - Application configuration (host, port, env)
 */

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

/**
 * Import the configured Express application instance.
 * The app is pre-configured with routes and middleware in src/app.js.
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Import the application configuration.
 * Contains host, port, and environment settings.
 * @type {{ host: string, port: number, env: string }}
 */
const config = require('./src/config');

// ---------------------------------------------------------------------------
// Server State
// ---------------------------------------------------------------------------

/**
 * HTTP server instance reference.
 * Stored for graceful shutdown operations.
 * @type {import('http').Server|null}
 */
let server = null;

/**
 * Flag to prevent multiple shutdown attempts.
 * @type {boolean}
 */
let isShuttingDown = false;

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

/**
 * Handles server startup errors including EADDRINUSE and EACCES.
 * 
 * @param {Error} error - The error object from server.listen()
 * @throws {Error} Re-throws error if not a listen-related error
 */
function handleServerError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof config.port === 'string'
    ? `Pipe ${config.port}`
    : `Port ${config.port}`;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

/**
 * Handles graceful shutdown of the server.
 * Closes all connections and exits cleanly on SIGTERM/SIGINT signals.
 * Includes a timeout mechanism to force exit if graceful shutdown hangs.
 *
 * @param {string} signal - The signal that triggered shutdown (SIGTERM or SIGINT)
 */
function gracefulShutdown(signal) {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000); // 10 second timeout

  // Unref the timeout so it doesn't keep the event loop alive
  forceExitTimeout.unref();

  if (server) {
    server.close((err) => {
      clearTimeout(forceExitTimeout);
      if (err) {
        console.error('Error during server close:', err.message);
        process.exit(1);
      }
      console.log('Server closed successfully');
      process.exit(0);
    });
  } else {
    clearTimeout(forceExitTimeout);
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Configuration Validation
// ---------------------------------------------------------------------------

/**
 * Validates the server configuration before startup.
 * Ensures port is a valid number within acceptable range.
 *
 * @returns {boolean} True if configuration is valid, false otherwise
 */
function validateConfig() {
  const port = parseInt(config.port, 10);

  if (isNaN(port)) {
    console.error(`Invalid port configuration: "${config.port}" is not a number`);
    return false;
  }

  if (port < 0 || port > 65535) {
    console.error(`Invalid port configuration: ${port} is out of range (0-65535)`);
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Server Initialization
// ---------------------------------------------------------------------------

// Validate configuration before starting
if (!validateConfig()) {
  process.exit(1);
}

// Register signal handlers for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the HTTP server
server = app.listen(config.port, config.host, () => {
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

// Attach error handler for listen errors
server.on('error', handleServerError);

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------

/**
 * Export server instance and gracefulShutdown for testing purposes.
 * @exports {Object} Server instance and shutdown function
 */
module.exports = { server, gracefulShutdown };
