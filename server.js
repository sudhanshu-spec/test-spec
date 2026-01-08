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
 * @requires ./src/app - Pre-configured Express application instance with routes and middleware mounted
 * @requires ./src/config - Application configuration settings sourced from environment variables
 *
 * @example <caption>Default startup (localhost only)</caption>
 * // Start with default configuration (127.0.0.1:3000)
 * // Terminal:
 * node server.js
 * // Output: Server running at http://127.0.0.1:3000/
 *
 * @example <caption>Custom configuration via environment variables</caption>
 * // Bind to all interfaces on port 8080
 * // Terminal:
 * HOST=0.0.0.0 PORT=8080 node server.js
 * // Output: Server running at http://0.0.0.0:8080/
 *
 * @see module:src/app - Express application factory module
 * @see module:src/config - Configuration management module
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
// Server Initialization
// =============================================================================

/**
 * Start the HTTP server.
 *
 * Binds the Express app to the configured network interface.
 * The callback fires once the server is ready to accept connections.
 *
 * The callback execution timing is important:
 * - It fires AFTER the server has successfully bound to the port
 * - It fires BEFORE any HTTP requests are processed
 * - If the port is already in use, the callback never fires (error is thrown instead)
 */
app.listen(config.port, config.host, () => {
  // Startup confirmation callback:
  // This executes once the underlying TCP socket is bound and listening.
  // The log message serves as visual confirmation that the server is ready
  // to accept incoming HTTP connections on the specified host:port.
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
