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
 * @requires module:src/app
 * @requires module:src/config
 * @see module:src/app
 * @see module:src/config
 *
 * @example
 * // Start the server with default settings
 * // $ node server.js
 * // Server running at http://127.0.0.1:3000/
 */

// Enable strict mode to catch common coding errors and prevent use of undeclared variables
'use strict';

// =============================================================================
// Dependencies
// =============================================================================

// Import the Express app instance from the factory module — routes and middleware are pre-configured.
// The factory pattern separates app creation from server binding, enabling independent testability.
/**
 * Pre-configured Express application instance.
 * Routes and middleware are already mounted in src/app.js.
 * @type {import('express').Application}
 * @see module:src/app
 */
const app = require('./src/app');

// Load externalized configuration — follows Twelve-Factor App methodology for environment-driven settings.
// Defaults: HOST=127.0.0.1, PORT=3000, NODE_ENV=development. Override via environment variables.
/**
 * Application configuration settings.
 * Values are sourced from environment variables with sensible defaults.
 * @type {{ host: string, port: number, env: string }}
 * @see module:src/config
 */
const config = require('./src/config');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Callback invoked when the server has successfully bound to the configured host and port.
 * Logs the server URL to stdout for operational visibility.
 *
 * @callback ServerStartCallback
 */

// Bind the Express application to the configured host and port, initiating the HTTP server event loop.
// The callback executes once the server has successfully bound, providing operational visibility via console output.
/**
 * Start the HTTP server.
 *
 * Binds the Express app to the configured network interface.
 * The callback fires once the server is ready to accept connections.
 *
 * @listens {number} config.port
 * @param {number} config.port - The TCP port number to bind the server to
 * @param {string} config.host - The network interface address to bind the server to
 * @param {ServerStartCallback} callback - Invoked once the server is ready to accept connections
 *
 * @example
 * // With default configuration:
 * // $ node server.js
 * // Server running at http://127.0.0.1:3000/
 */
app.listen(config.port, config.host, () => {
  // Display startup confirmation with the server URL
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
