/**
 * HTTP Server Entry Point - Production-Ready Implementation
 *
 * This module serves as the sole entry point for starting the HTTP server
 * with comprehensive error handling, graceful shutdown, and process management.
 *
 * Architecture Overview:
 * ----------------------
 * - Express app configuration lives in: src/app.js
 * - Configuration settings live in: src/config/index.js
 * - Route handlers live in: src/routes/
 *
 * Production Features:
 * --------------------
 * - Graceful shutdown on SIGTERM/SIGINT signals
 * - Process-level error handlers (uncaughtException, unhandledRejection)
 * - Server error handling (EADDRINUSE, EACCES, EADDRNOTAVAIL)
 * - Port validation before server start
 * - Configurable shutdown timeout
 *
 * This separation of concerns enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Easy configuration management via environment variables
 * - Clean, maintainable code structure
 * - Production-ready deployment with proper signal handling
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
 * Contains host, port, and environment settings.
 * @type {{ host: string, port: number, env: string }}
 */
const config = require('./src/config');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Shutdown timeout in milliseconds.
 * The server will force exit after this duration if graceful shutdown hangs.
 * @constant {number}
 */
const SHUTDOWN_TIMEOUT_MS = 30000;

/**
 * Minimum valid port number.
 * @constant {number}
 */
const MIN_PORT = 1;

/**
 * Maximum valid port number (2^16 - 1).
 * @constant {number}
 */
const MAX_PORT = 65535;

// ---------------------------------------------------------------------------
// Module State
// ---------------------------------------------------------------------------

/**
 * Reference to the HTTP server instance.
 * Used for graceful shutdown and error handling.
 * @type {import('http').Server|null}
 */
let server = null;

/**
 * Flag to track shutdown state and prevent multiple shutdown attempts.
 * Ensures idempotent shutdown behavior.
 * @type {boolean}
 */
let isShuttingDown = false;

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Validates that a port number is within the valid range.
 *
 * A valid port must be:
 * - A finite integer
 * - Between 1 and 65535 inclusive
 *
 * Port 0 is excluded because while it technically asks the OS to assign
 * an available port, it's not suitable for production configurations.
 *
 * @param {number} port - The port number to validate
 * @returns {boolean} True if the port is valid, false otherwise
 *
 * @example
 * isValidPort(3000);  // true
 * isValidPort(0);     // false
 * isValidPort(70000); // false
 * isValidPort(-1);    // false
 * isValidPort(NaN);   // false
 */
function isValidPort(port) {
  return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT;
}

// ---------------------------------------------------------------------------
// Graceful Shutdown Handler
// ---------------------------------------------------------------------------

/**
 * Performs a graceful shutdown of the HTTP server.
 *
 * This function:
 * 1. Checks if shutdown is already in progress (idempotent)
 * 2. Stops accepting new connections
 * 3. Waits for existing requests to complete
 * 4. Sets a timeout to force exit if shutdown hangs
 * 5. Exits with the appropriate exit code
 *
 * The shutdown timeout is set to 30 seconds by default. If the server
 * doesn't close within this time, the process will forcefully exit.
 *
 * @param {string} signal - The signal that triggered the shutdown (e.g., 'SIGTERM', 'SIGINT')
 * @param {number} [exitCode=0] - The exit code to use when the process terminates
 * @returns {void}
 *
 * @example
 * // Called from signal handler
 * gracefulShutdown('SIGTERM', 0);
 *
 * // Called from error handler
 * gracefulShutdown('uncaughtException', 1);
 */
function gracefulShutdown(signal, exitCode = 0) {
  // Prevent multiple shutdown attempts (idempotent shutdown)
  if (isShuttingDown) {
    console.log(`Shutdown already in progress. Ignoring ${signal} signal.`);
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Starting graceful shutdown...`);

  // Set a hard timeout to force exit if graceful shutdown hangs
  // Using .unref() so the timer doesn't prevent the process from exiting naturally
  const forceExitTimer = setTimeout(() => {
    console.error(`Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS / 1000} seconds. Forcing exit.`);
    process.exit(exitCode || 1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  // Handle case where server was never started or already closed
  if (!server) {
    console.log('Server was not running. Exiting immediately.');
    process.exit(exitCode);
  }

  // Stop accepting new connections and wait for existing connections to close
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err.message);
      process.exit(exitCode || 1);
    }

    console.log('HTTP server closed successfully.');
    console.log(`Graceful shutdown complete. Exiting with code ${exitCode}.`);
    process.exit(exitCode);
  });
}

// ---------------------------------------------------------------------------
// Process Event Handlers
// ---------------------------------------------------------------------------

/**
 * Handle SIGTERM signal (termination request).
 * Typically sent by process managers (PM2, Docker, Kubernetes) during deployment.
 * Initiates graceful shutdown with exit code 0 (normal termination).
 */
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM', 0);
});

/**
 * Handle SIGINT signal (interrupt).
 * Typically sent when user presses Ctrl+C in terminal.
 * Initiates graceful shutdown with exit code 0 (normal termination).
 */
process.on('SIGINT', () => {
  gracefulShutdown('SIGINT', 0);
});

/**
 * Handle uncaught exceptions.
 *
 * This is a last-resort handler for synchronous errors that were not caught
 * by any try-catch block. According to Node.js documentation, it's unsafe
 * to resume normal operation after an uncaught exception.
 *
 * The recommended approach is to:
 * 1. Log the error for debugging
 * 2. Perform cleanup
 * 3. Exit the process
 * 4. Let a process manager restart the application
 *
 * @param {Error} error - The uncaught exception
 * @param {string} origin - Where the exception originated ('uncaughtException' or 'unhandledRejection')
 */
process.on('uncaughtException', (error, origin) => {
  console.error('========================================');
  console.error('UNCAUGHT EXCEPTION - Application will shut down');
  console.error('========================================');
  console.error('Origin:', origin);
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('========================================');

  // Exit with error code 1 to indicate abnormal termination
  gracefulShutdown('uncaughtException', 1);
});

/**
 * Handle unhandled promise rejections.
 *
 * Since Node.js v15+, unhandled promise rejections cause the process to
 * exit by default. This handler provides consistent error logging and
 * cleanup before exiting.
 *
 * @param {*} reason - The rejection reason (usually an Error)
 * @param {Promise} promise - The promise that was rejected
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('========================================');
  console.error('UNHANDLED PROMISE REJECTION - Application will shut down');
  console.error('========================================');
  console.error('Reason:', reason instanceof Error ? reason.message : reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  console.error('========================================');

  // Exit with error code 1 to indicate abnormal termination
  gracefulShutdown('unhandledRejection', 1);
});

// ---------------------------------------------------------------------------
// Server Initialization
// ---------------------------------------------------------------------------

/**
 * Start the HTTP server with comprehensive error handling.
 *
 * This function:
 * 1. Validates the port configuration
 * 2. Creates the HTTP server
 * 3. Attaches error handlers for common startup failures
 * 4. Logs successful startup
 */
function startServer() {
  // Validate port configuration before attempting to start
  if (!isValidPort(config.port)) {
    console.error('========================================');
    console.error('CONFIGURATION ERROR');
    console.error('========================================');
    console.error(`Invalid port configuration: ${config.port}`);
    console.error(`Port must be an integer between ${MIN_PORT} and ${MAX_PORT}.`);
    console.error('========================================');
    process.exit(1);
  }

  // Create the HTTP server and capture the instance for later management
  server = app.listen(config.port, config.host, () => {
    // Log server startup information
    console.log(`Server running at http://${config.host}:${config.port}/`);
    console.log(`Environment: ${config.env}`);
    console.log('Press Ctrl+C to stop.');
  });

  /**
   * Handle server-level errors that occur during startup or operation.
   *
   * Common errors:
   * - EADDRINUSE: Port is already in use by another process
   * - EACCES: Permission denied (usually for ports < 1024)
   * - EADDRNOTAVAIL: The specified address is not available
   */
  server.on('error', (error) => {
    console.error('========================================');
    console.error('SERVER ERROR');
    console.error('========================================');

    switch (error.code) {
      case 'EADDRINUSE':
        console.error(`Port ${config.port} is already in use.`);
        console.error('Please close the other process or use a different port.');
        console.error('');
        console.error('To find the process using this port:');
        console.error(`  Linux/Mac: lsof -i :${config.port}`);
        console.error(`  Windows:   netstat -ano | findstr :${config.port}`);
        break;

      case 'EACCES':
        console.error(`Permission denied to bind to port ${config.port}.`);
        console.error('Ports below 1024 typically require elevated privileges.');
        console.error('');
        console.error('Options:');
        console.error('  1. Use a port number >= 1024');
        console.error('  2. Run with elevated privileges (not recommended for production)');
        console.error('  3. Use a reverse proxy (nginx, Apache) to forward traffic');
        break;

      case 'EADDRNOTAVAIL':
        console.error(`The address ${config.host} is not available on this system.`);
        console.error('');
        console.error('Options:');
        console.error('  1. Use 127.0.0.1 for localhost only');
        console.error('  2. Use 0.0.0.0 to listen on all interfaces');
        console.error('  3. Verify the network interface is properly configured');
        break;

      default:
        console.error('An unexpected error occurred while starting the server.');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    }

    console.error('========================================');

    // Exit with error code 1 for server startup failures
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// Application Entry Point
// ---------------------------------------------------------------------------

// Start the server
startServer();

// Log application initialization complete
console.log('Application module loaded successfully');

// PR test log - added for testing purposes
console.log('Express.js server initialization complete - PR validation log');

// Additional PR validation log - added per user request for testing purposes
console.log('PR update test: Server module fully initialized');
