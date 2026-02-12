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
 * @description Entry point for the Hello World Express server. Responsible for
 * importing the configured Express application and binding it to a network
 * interface for incoming HTTP connections.
 * @requires module:app - Express application factory that creates a fully
 * configured Express instance with routes and middleware
 * @requires module:config - Environment configuration module providing HOST,
 * PORT, and NODE_ENV values
 * @example
 * // Start with defaults (http://127.0.0.1:3000/)
 * // $ node server.js
 * //
 * // Start with custom port
 * // $ PORT=8080 node server.js
 * //
 * // Start with custom host and port for production
 * // $ HOST=0.0.0.0 PORT=80 NODE_ENV=production node server.js
 * @see module:app for Express application creation and middleware configuration
 * @see module:config for environment variable handling and default values
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

/**
 * Pre-configured Express application instance.
 * Routes and middleware are already mounted in src/app.js.
 * @description Fully configured Express application instance created by the app
 * factory module. Pre-loaded with JSON parsing middleware and all route handlers
 * for GET / and GET /evening endpoints.
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Application configuration settings.
 * Values are sourced from environment variables with sensible defaults.
 * @description Server configuration object providing host, port, and env values
 * sourced from environment variables with sensible defaults following
 * Twelve-Factor App methodology.
 * @type {{ host: string, port: number, env: string }}
 * @property {string} host - Network interface to bind to (default: '127.0.0.1')
 * @property {number} port - Port number for the HTTP server (default: 3000)
 * @property {string} env - Runtime environment identifier (default: 'development')
 */
const config = require('./src/config');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Start the HTTP server.
 *
 * Binds the Express app to the configured network interface.
 * The callback fires once the server is ready to accept connections.
 * @listens {http.Server} Binds the Express application to the configured host
 * and port, creating an HTTP server that listens for incoming connections
 */
app.listen(config.port, config.host, () => {
  // The callback arrow function fires once the server is successfully bound to
  // the network interface. It logs the bound address (host:port) to stdout for
  // operational verification, confirming the server is ready to accept HTTP requests.
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
