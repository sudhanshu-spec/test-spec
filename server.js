/**
 * HTTP Server Entry Point
 *
 * This module serves as the sole entry point for starting the HTTP server.
 * It imports the pre-configured Express application and configuration,
 * then binds the server to the specified host and port.
 *
 * Production Robustness Features:
 * - Graceful shutdown on SIGTERM and SIGINT signals
 * - Process-level error handling for uncaught exceptions and unhandled rejections
 * - Server binding error detection (EADDRINUSE, EACCES)
 * - Configurable shutdown timeout with force-kill safety net
 * - Idempotent shutdown guard to prevent duplicate shutdown sequences
 *
 * Architecture Overview:
 * ----------------------
 * - Express app configuration lives in: src/app.js
 * - Configuration settings live in: src/config/index.js
 * - Route handlers live in: src/routes/
 * - Error-handling middleware lives in: src/middleware/
 *
 * This separation of concerns enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Easy configuration management via environment variables
 * - Clean, maintainable code structure
 *
 * Usage:
 * ------
 * Standard:   npm start
 * Custom:     HOST=0.0.0.0 PORT=8080 npm start
 * Shutdown:   SHUTDOWN_TIMEOUT=10000 npm start
 *
 * @module server
 * @requires ./src/app - The configured Express application instance
 * @requires ./src/config - Application configuration (host, port, env, shutdownTimeout)
 */

'use strict';

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
 * Contains host, port, environment, and shutdown timeout settings.
 * @type {{ host: string, port: number, env: string, shutdownTimeout: number, requestTimeout: number }}
 */
const config = require('./src/config');

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

/**
 * Reference to the HTTP server instance.
 * Declared at module scope and assigned after app.listen() completes
 * to enable server.close() during shutdown.
 * @type {import('http').Server|undefined}
 */
let server;

/**
 * Flag to prevent duplicate shutdown sequences from rapid successive signals.
 * Once set to true, subsequent calls to gracefulShutdown() are no-ops.
 * @type {boolean}
 */
let isShuttingDown = false;

/**
 * Gracefully shut down the server.
 * Stops accepting new connections, drains in-flight requests,
 * and exits the process. Uses an idempotent guard to prevent
 * duplicate shutdown sequences from rapid successive signals.
 *
 * The force-kill timeout ensures the process terminates even if
 * server.close() hangs due to persistent connections. The .unref()
 * call prevents the timer from keeping the event loop alive when
 * all connections have already closed naturally.
 *
 * @param {string} signal - The signal or event that triggered the shutdown
 */
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  // Force-kill timeout to prevent hanging if server.close() never completes.
  // Uses .unref() so the timer does not keep the event loop alive when all
  // connections have already closed naturally.
  const forceTimeout = setTimeout(() => {
    console.error('Forcing shutdown due to timeout');
    process.exit(1);
  }, config.shutdownTimeout);
  forceTimeout.unref();

  // If server has not been initialized yet, exit immediately with error code
  if (!server) {
    process.exit(1);
  }

  server.close(() => {
    console.log('Server closed. Exiting...');
    process.exit(0);
  });
};

// ---------------------------------------------------------------------------
// Process-Level Error Handlers
// ---------------------------------------------------------------------------

/**
 * Handle uncaught synchronous exceptions.
 * Logs the error and initiates graceful shutdown to prevent the process
 * from continuing in an undefined state.
 * Registered before app.listen() to catch errors during module initialization.
 * @param {Error} err - The uncaught exception
 */
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

/**
 * Handle unhandled promise rejections.
 * Logs the rejection reason and initiates graceful shutdown.
 * In Node.js 15+, unhandled rejections crash the process by default,
 * making explicit handling essential for controlled shutdown.
 * @param {*} reason - The rejection reason
 */
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

// ---------------------------------------------------------------------------
// Server Initialization
// ---------------------------------------------------------------------------

/**
 * Start the HTTP server.
 *
 * Binds the Express application to the configured host and port.
 * Captures the http.Server instance for use in graceful shutdown
 * and binding error handling.
 *
 * Default binding: http://127.0.0.1:3000/
 * Override via HOST and PORT environment variables.
 */
server = app.listen(config.port, config.host, () => {
  // Log server startup information
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

/**
 * Handle server binding errors (e.g., EADDRINUSE, EACCES).
 * Logs a descriptive error message and exits with code 1.
 * @param {Error} error - The server binding error
 */
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use`);
  } else if (error.code === 'EACCES') {
    console.error(`Port ${config.port} requires elevated privileges`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Signal Handlers
// ---------------------------------------------------------------------------

/**
 * Handle SIGTERM signal (sent by process managers, Docker, Kubernetes).
 * Initiates graceful shutdown to allow in-flight requests to complete.
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Handle SIGINT signal (sent by Ctrl+C during development).
 * Initiates graceful shutdown to allow in-flight requests to complete.
 */
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Log application initialization complete
console.log('Application module loaded successfully');
