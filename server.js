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
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

/**
 * Pre-configured Express application instance.
 *
 * Routes and middleware are already mounted in src/app.js.
 * Using the Factory pattern enables unit testing without HTTP binding.
 *
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Application configuration settings.
 *
 * Values sourced from environment variables with sensible defaults.
 * Follows the Twelve-Factor App methodology for configuration.
 *
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
 */
app.listen(config.port, config.host, () => {
  // Log startup confirmation with the server URL
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
