/**
 * HTTP Server Entry Point
 *
 * Production-ready server module with comprehensive error handling, graceful
 * shutdown capabilities, input validation, and resource cleanup.
 *
 * Architecture:
 *   - src/app.js       → Express app factory (routes & middleware)
 *   - src/config/      → Environment-driven configuration
 *   - src/routes/      → Route handlers
 *
 * Production Features:
 *   - Graceful shutdown on SIGTERM/SIGINT signals
 *   - Comprehensive error handling for server errors (EADDRINUSE, EACCES, etc.)
 *   - Global handlers for uncaughtException and unhandledRejection
 *   - Input validation for configuration values
 *   - Shutdown timeout to prevent hanging
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
 * Node.js built-in HTTP module for explicit server lifecycle control.
 * Using http.createServer() instead of app.listen() enables better error
 * handling, graceful shutdown, and server instance capture.
 * @type {import('http')}
 */
const http = require('http');

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
// Input Validation
// =============================================================================

/**
 * Validates configuration values before server startup.
 * 
 * Ensures that port and host values are within acceptable bounds.
 * Throws an error with a clear message if validation fails.
 * 
 * @throws {Error} If port is not a number between 1 and 65535
 * @throws {Error} If host is not a non-empty string
 */
function validateConfig() {
  // Validate port is a number and within valid range (1-65535)
  if (typeof config.port !== 'number' || isNaN(config.port)) {
    throw new Error(
      `Invalid port configuration: "${config.port}" is not a valid number.\n` +
      'Solution: Set the PORT environment variable to a number between 1 and 65535.'
    );
  }

  if (config.port < 1 || config.port > 65535) {
    throw new Error(
      `Invalid port configuration: ${config.port} is out of valid range.\n` +
      'Solution: Set the PORT environment variable to a number between 1 and 65535.'
    );
  }

  // Validate host is a non-empty string
  if (typeof config.host !== 'string' || config.host.trim() === '') {
    throw new Error(
      `Invalid host configuration: "${config.host}" is not a valid host.\n` +
      'Solution: Set the HOST environment variable to a valid hostname or IP address.'
    );
  }
}

// Run validation immediately
validateConfig();

// =============================================================================
// Global State
// =============================================================================

/**
 * Flag to prevent multiple shutdown attempts.
 * Set to true when graceful shutdown is initiated.
 * @type {boolean}
 */
let isShuttingDown = false;

/**
 * HTTP server instance created with explicit http.createServer().
 * This provides better lifecycle control compared to app.listen().
 * @type {import('http').Server}
 */
const server = http.createServer(app);

/**
 * Shutdown timeout in milliseconds.
 * Forces exit if graceful shutdown takes too long.
 * @type {number}
 */
const SHUTDOWN_TIMEOUT = 10000;

// =============================================================================
// Graceful Shutdown
// =============================================================================

/**
 * Performs graceful shutdown of the HTTP server.
 * 
 * This function:
 * 1. Prevents multiple shutdown attempts via isShuttingDown flag
 * 2. Sets a timeout to force exit if graceful shutdown hangs
 * 3. Closes the HTTP server, allowing in-flight requests to complete
 * 4. Exits the process with the specified exit code
 * 
 * @param {number} [exitCode=0] - Exit code for the process (0 = success, 1 = error)
 */
function gracefulShutdown(exitCode = 0) {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    console.log('Shutdown already in progress, ignoring additional signal.');
    return;
  }

  isShuttingDown = true;
  console.log('Shutdown initiated...');

  // Set a timeout to force exit if graceful shutdown hangs
  const shutdownTimeout = setTimeout(() => {
    console.error('Shutdown timeout exceeded, forcing exit.');
    process.exit(exitCode);
  }, SHUTDOWN_TIMEOUT);

  // Prevent the timeout from keeping the process alive
  shutdownTimeout.unref();

  // Close the HTTP server
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err.message);
      process.exit(1);
    }

    console.log('Cleanup complete.');
    process.exit(exitCode);
  });
}

// =============================================================================
// Global Error Handlers
// =============================================================================

/**
 * Handler for uncaught exceptions.
 * 
 * This is a last-resort error handler that logs the exception before
 * initiating graceful shutdown. In production, this should be rare as
 * errors should be caught and handled appropriately.
 * 
 * @param {Error} err - The uncaught exception
 * @param {string} origin - The origin of the exception
 */
process.on('uncaughtException', (err, origin) => {
  console.error('='.repeat(60));
  console.error('UNCAUGHT EXCEPTION');
  console.error('='.repeat(60));
  console.error(`Origin: ${origin}`);
  console.error(`Error: ${err.message}`);
  console.error('Stack:', err.stack);
  console.error('='.repeat(60));

  // Initiate graceful shutdown with error exit code
  gracefulShutdown(1);
});

/**
 * Handler for unhandled promise rejections.
 * 
 * In Node.js 15+, unhandled promise rejections crash the application by default.
 * This handler logs the rejection and initiates graceful shutdown.
 * 
 * @param {*} reason - The rejection reason
 * @param {Promise} promise - The rejected promise
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('='.repeat(60));
  console.error('UNHANDLED PROMISE REJECTION');
  console.error('='.repeat(60));
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('='.repeat(60));

  // Initiate graceful shutdown with error exit code
  gracefulShutdown(1);
});

// =============================================================================
// Signal Handlers
// =============================================================================

/**
 * SIGTERM signal handler.
 * 
 * SIGTERM is sent by process managers (PM2), container orchestrators (Docker, 
 * Kubernetes), and system shutdown procedures to request graceful termination.
 */
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal.');
  gracefulShutdown(0);
});

/**
 * SIGINT signal handler.
 * 
 * SIGINT is sent when the user presses Ctrl+C in the terminal.
 * This allows developers to gracefully stop the server during development.
 */
process.on('SIGINT', () => {
  console.log('Received SIGINT signal (Ctrl+C).');
  gracefulShutdown(0);
});

// =============================================================================
// Server Error Handler
// =============================================================================

/**
 * Server error event handler.
 * 
 * Handles common server errors with helpful messages and solution suggestions.
 * This handler must be attached BEFORE calling server.listen().
 * 
 * Common error codes:
 * - EADDRINUSE: Port is already in use by another process
 * - EACCES: Permission denied (port < 1024 requires root)
 * - EADDRNOTAVAIL: The specified address is not available
 */
server.on('error', (error) => {
  // Handle specific error codes with helpful messages
  switch (error.code) {
    case 'EADDRINUSE':
      console.error('='.repeat(60));
      console.error('SERVER STARTUP ERROR');
      console.error('='.repeat(60));
      console.error(`Error: Port ${config.port} is already in use.`);
      console.error('');
      console.error('Possible solutions:');
      console.error(`  1. Stop the process using port ${config.port}:`);
      console.error(`     lsof -i :${config.port} | grep LISTEN`);
      console.error(`     kill -9 <PID>`);
      console.error('');
      console.error('  2. Use a different port:');
      console.error('     PORT=3001 npm start');
      console.error('='.repeat(60));
      break;

    case 'EACCES':
      console.error('='.repeat(60));
      console.error('SERVER STARTUP ERROR');
      console.error('='.repeat(60));
      console.error(`Error: Permission denied to bind to port ${config.port}.`);
      console.error('');
      console.error('Possible solutions:');
      console.error('  1. Use a port number above 1024 (non-privileged ports):');
      console.error('     PORT=3000 npm start');
      console.error('');
      console.error('  2. Run with elevated privileges (not recommended):');
      console.error('     sudo npm start');
      console.error('='.repeat(60));
      break;

    case 'EADDRNOTAVAIL':
      console.error('='.repeat(60));
      console.error('SERVER STARTUP ERROR');
      console.error('='.repeat(60));
      console.error(`Error: Address ${config.host} is not available on this system.`);
      console.error('');
      console.error('Possible solutions:');
      console.error('  1. Use localhost or 127.0.0.1:');
      console.error('     HOST=127.0.0.1 npm start');
      console.error('');
      console.error('  2. Use 0.0.0.0 to bind to all interfaces:');
      console.error('     HOST=0.0.0.0 npm start');
      console.error('');
      console.error('  3. Verify the host address is correct and available.');
      console.error('='.repeat(60));
      break;

    default:
      console.error('='.repeat(60));
      console.error('SERVER STARTUP ERROR');
      console.error('='.repeat(60));
      console.error(`Error: ${error.message}`);
      console.error(`Code: ${error.code || 'N/A'}`);
      console.error('Stack:', error.stack);
      console.error('='.repeat(60));
      break;
  }

  // Exit with error code
  process.exit(1);
});

// =============================================================================
// Server Listening Handler
// =============================================================================

/**
 * Server listening event handler.
 * 
 * Fires when the server is successfully bound and ready to accept connections.
 * Displays startup information including URL, environment, and process ID.
 */
server.on('listening', () => {
  const address = server.address();
  const host = typeof address === 'string' ? address : address.host || config.host;
  const port = typeof address === 'string' ? config.port : address.port;

  console.log('='.repeat(60));
  console.log('SERVER STARTED');
  console.log('='.repeat(60));
  console.log(`Server running at http://${host}:${port}/`);
  console.log(`Environment: ${config.env}`);
  console.log(`Process ID: ${process.pid}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('Press Ctrl+C to stop the server.');
});

// =============================================================================
// Start Server
// =============================================================================

/**
 * Start the HTTP server.
 * 
 * Binds the server to the configured network interface.
 * The 'listening' event handler fires once the server is ready.
 * The 'error' event handler fires if binding fails.
 */
server.listen(config.port, config.host);

// =============================================================================
// Module Exports
// =============================================================================

/**
 * Export the server instance for testing and external control.
 * 
 * This allows tests to:
 * - Access server.address() to get the actual bound port
 * - Call server.close() to shut down the server
 * - Use server.on() to listen for events
 * 
 * @type {import('http').Server}
 */
module.exports = server;
