// Load environment variables from .env file before any other imports
// This ensures all subsequently loaded modules have access to env vars
require('dotenv').config();

/**
 * HTTP Server Entry Point
 *
 * This module serves as the sole entry point for starting the HTTP server.
 * It imports the pre-configured Express application and configuration,
 * then binds the server to the specified host and port.
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
// Server Initialization
// ---------------------------------------------------------------------------

/**
 * Start the HTTP server.
 *
 * Binds the Express application to the configured host and port.
 * Logs a startup message upon successful binding.
 *
 * Default binding: http://127.0.0.1:3000/
 * Override via HOST and PORT environment variables.
 */
const server = app.listen(config.port, config.host, () => {
  // Log server startup information
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

// Log application initialization complete
console.log('Application module loaded successfully');

// PR test log - added for testing purposes
console.log('Express.js server initialization complete - PR validation log');

// Additional PR validation log - added per user request for testing purposes
console.log('PR update test: Server module fully initialized');

// ---------------------------------------------------------------------------
// Graceful Shutdown Handling
// ---------------------------------------------------------------------------

/**
 * Graceful shutdown handler for the HTTP server.
 *
 * This function handles graceful termination of the server when receiving
 * shutdown signals. It stops accepting new connections and waits for
 * existing requests to complete before exiting.
 *
 * Key behaviors:
 * - Logs the received signal for debugging and monitoring
 * - Closes the HTTP server gracefully (stops accepting new connections)
 * - Waits for existing connections to complete
 * - Forces shutdown after 10 second timeout to prevent hanging
 *
 * @param {string} signal - The signal that triggered the shutdown (e.g., 'SIGTERM', 'SIGINT')
 */
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections and wait for existing requests to finish
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds if graceful shutdown hangs
  // This prevents the process from running indefinitely if connections don't close
  setTimeout(() => {
    console.log('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

/**
 * Register signal handlers for graceful shutdown.
 *
 * SIGTERM: Sent by PM2 for graceful reload/stop, also used by Kubernetes
 *          and most process managers for graceful termination.
 *
 * SIGINT:  Sent when pressing Ctrl+C in the terminal during development.
 *          Allows developers to cleanly stop the server.
 */

// PM2 graceful reload signal and Kubernetes termination signal
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Ctrl+C in development terminal
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
