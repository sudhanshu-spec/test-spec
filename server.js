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

// Handle server startup errors (e.g., port already in use, invalid host)
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Error: Port ${config.port} is already in use`);
  } else if (error.code === 'EADDRNOTAVAIL') {
    console.error(`Error: Host ${config.host} is not available`);
  } else {
    console.error(`Server error: ${error.message}`);
  }
  process.exit(1);
});
