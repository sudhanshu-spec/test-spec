/**
 * HTTP Server Entry Point
 *
 * This module serves as the sole entry point for starting the HTTP server.
 * It imports the pre-configured Express application and configuration,
 * then binds the server to the specified host and port with comprehensive
 * error handling, graceful shutdown, and configuration validation.
 *
 * Architecture Overview:
 * ----------------------
 * - Express app configuration lives in: src/app.js
 * - Configuration settings live in: src/config/index.js
 * - Route handlers live in: src/routes/
 *
 * This separation of concerns enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Easy configuration management via environment variables
 * - Clean, maintainable code structure
 * - Graceful shutdown handling for production deployments
 * - Comprehensive error handling for all server errors
 *
 * Usage:
 * ------
 * Standard:   npm start
 * Custom:     HOST=0.0.0.0 PORT=8080 npm start
 *
 * Features:
 * ---------
 * - Server error handling (EADDRINUSE, EACCES, EADDRNOTAVAIL)
 * - Graceful shutdown on SIGTERM/SIGINT signals
 * - Process-level error handlers for uncaughtException/unhandledRejection
 * - Configuration validation before server start
 * - Forced exit timeout for hung shutdowns
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
// Module-level State
// ---------------------------------------------------------------------------

/**
 * Reference to the HTTP server instance.
 * Stored for programmatic shutdown capability.
 * @type {import('http').Server|null}
 */
let server = null;

/**
 * Flag to prevent duplicate shutdown attempts.
 * Ensures graceful shutdown is only initiated once.
 * @type {boolean}
 */
let isShuttingDown = false;

/**
 * Default timeout for forced exit during shutdown (in milliseconds).
 * If graceful shutdown takes longer than this, force exit.
 * @type {number}
 */
const SHUTDOWN_TIMEOUT = 10000;

// ---------------------------------------------------------------------------
// Configuration Validation
// ---------------------------------------------------------------------------

/**
 * Validates the server configuration.
 *
 * Checks that:
 * - Port is a valid number between 0 and 65535
 * - Host is a non-empty string
 *
 * @returns {{ success: boolean, error: string|null }} Validation result
 *
 * @example
 * const result = validateConfig();
 * if (!result.success) {
 *   console.error(result.error);
 *   process.exit(1);
 * }
 */
function validateConfig() {
  // Validate port is a number
  if (typeof config.port !== 'number' || isNaN(config.port)) {
    return {
      success: false,
      error: `Invalid port number: Port must be a valid number, received "${config.port}"`
    };
  }

  // Validate port is in valid range (0-65535)
  // Port 0 is valid as it lets the OS assign an available port
  if (config.port < 0 || config.port > 65535) {
    return {
      success: false,
      error: `Invalid port number: Port must be between 0 and 65535, received "${config.port}"`
    };
  }

  // Validate host is a non-empty string
  if (typeof config.host !== 'string' || config.host.trim() === '') {
    return {
      success: false,
      error: `Invalid host: Host must be a non-empty string, received "${config.host}"`
    };
  }

  return {
    success: true,
    error: null
  };
}

// ---------------------------------------------------------------------------
// Server Error Handling
// ---------------------------------------------------------------------------

/**
 * Handles server errors during startup and operation.
 *
 * Provides specific error messages for common network errors:
 * - EADDRINUSE: Port is already in use by another process
 * - EACCES: Permission denied (typically for privileged ports < 1024)
 * - EADDRNOTAVAIL: The specified address is not available on this machine
 *
 * @param {Error & { code?: string, syscall?: string }} error - The error object
 * @returns {void}
 *
 * @example
 * server.on('error', handleServerError);
 */
function handleServerError(error) {
  // Only handle listen errors
  if (error.syscall !== 'listen') {
    console.error('Server error:', error.message);
    process.exit(1);
  }

  const bind = `${config.host}:${config.port}`;

  // Handle specific error codes with descriptive messages
  switch (error.code) {
    case 'EADDRINUSE':
      console.error(`Error: Port ${config.port} is already in use.`);
      console.error(`Another process is using ${bind}.`);
      console.error('Please stop the other process or use a different port.');
      process.exit(1);
      break;

    case 'EACCES':
      console.error(`Error: Permission denied for port ${config.port}.`);
      console.error(`Binding to ${bind} requires elevated privileges.`);
      console.error('Try using a port number above 1024 or run with sudo.');
      process.exit(1);
      break;

    case 'EADDRNOTAVAIL':
      console.error(`Error: Address ${config.host} is not available.`);
      console.error(`The address ${bind} cannot be assigned to this machine.`);
      console.error('Please check the HOST configuration.');
      process.exit(1);
      break;

    default:
      console.error(`Server error: ${error.message}`);
      console.error(`Failed to bind to ${bind}`);
      process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

/**
 * Initiates graceful shutdown of the server.
 *
 * This function:
 * 1. Prevents duplicate shutdown attempts
 * 2. Stops accepting new connections
 * 3. Waits for existing connections to complete
 * 4. Exits the process cleanly
 * 5. Forces exit if shutdown takes too long
 *
 * @param {string} signal - The signal that triggered the shutdown (e.g., 'SIGTERM', 'SIGINT')
 * @returns {void}
 *
 * @example
 * process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
 * process.on('SIGINT', () => gracefulShutdown('SIGINT'));
 */
function gracefulShutdown(signal) {
  // Prevent duplicate shutdown attempts
  if (isShuttingDown) {
    console.log('Shutdown already in progress, ignoring duplicate signal');
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received, starting graceful shutdown...`);

  // Set up forced exit timeout in case graceful shutdown hangs
  const forceExitTimeout = setTimeout(() => {
    console.error('Forced exit: Graceful shutdown timed out');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  // Prevent the timeout from keeping the process alive
  forceExitTimeout.unref();

  // Check if server exists and is running
  if (!server) {
    console.log('No server instance to close');
    clearTimeout(forceExitTimeout);
    process.exit(0);
  }

  // Close the server gracefully
  server.close((err) => {
    clearTimeout(forceExitTimeout);

    if (err) {
      console.error('Error during server close:', err.message);
      process.exit(1);
    }

    console.log('Server closed successfully');
    console.log('Graceful shutdown complete');
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// Process-level Error Handlers
// ---------------------------------------------------------------------------

/**
 * Handle uncaught exceptions at the process level.
 * Logs the error and initiates graceful shutdown.
 */
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:');
  console.error(err.stack || err.message || err);
  gracefulShutdown('uncaughtException');
});

/**
 * Handle unhandled promise rejections at the process level.
 * Logs the reason and initiates graceful shutdown.
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// ---------------------------------------------------------------------------
// Signal Handlers
// ---------------------------------------------------------------------------

/**
 * Handle SIGTERM signal (sent by process managers like PM2, Docker, Kubernetes).
 * Initiates graceful shutdown.
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Handle SIGINT signal (sent when user presses Ctrl+C).
 * Initiates graceful shutdown.
 */
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Server Initialization
// ---------------------------------------------------------------------------

/**
 * Starts the HTTP server.
 *
 * This function:
 * 1. Validates the configuration
 * 2. Creates and starts the HTTP server
 * 3. Attaches error handlers
 * 4. Returns the server instance
 *
 * @returns {Promise<import('http').Server>} Promise that resolves with the server instance
 * @throws {Error} If configuration is invalid
 *
 * @example
 * // Start the server
 * const serverInstance = await startServer();
 *
 * @example
 * // Start server and handle errors
 * startServer()
 *   .then((server) => console.log('Server started'))
 *   .catch((err) => console.error('Failed to start:', err));
 */
async function startServer() {
  // Validate configuration before starting
  const validation = validateConfig();
  if (!validation.success) {
    console.error('Configuration Error:', validation.error);
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    // Start the HTTP server
    server = app.listen(config.port, config.host, () => {
      // Log server startup information
      console.log(`Server running at http://${config.host}:${config.port}/`);
      console.log(`Environment: ${config.env}`);
      console.log('Application module loaded successfully');
      
      // PR test log - added for testing purposes
      console.log('Express.js server initialization complete - PR validation log');
      
      // Additional PR validation log - added per user request for testing purposes
      console.log('PR update test: Server module fully initialized');
      
      resolve(server);
    });

    // Attach error handler for server errors
    server.on('error', (error) => {
      handleServerError(error);
      reject(error);
    });
  });
}

/**
 * Returns the current server instance.
 *
 * Useful for testing and programmatic server management.
 *
 * @returns {import('http').Server|null} The server instance or null if not started
 *
 * @example
 * const server = getServer();
 * if (server) {
 *   console.log('Server is running');
 * }
 */
function getServer() {
  return server;
}

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------

/**
 * Export functions for testing and programmatic usage.
 *
 * - startServer: Starts the HTTP server
 * - gracefulShutdown: Initiates graceful shutdown
 * - validateConfig: Validates the server configuration
 * - getServer: Returns the current server instance
 */
module.exports = {
  startServer,
  gracefulShutdown,
  validateConfig,
  getServer
};

// ---------------------------------------------------------------------------
// Auto-start Logic
// ---------------------------------------------------------------------------

/**
 * Auto-start the server if this file is the main entry point.
 *
 * This check allows:
 * - Direct execution: `node server.js` starts the server
 * - Import for testing: `require('./server')` does not auto-start
 */
if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}
