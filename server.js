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
 * @requires ./src/app
 * @requires ./src/config
 *
 * @example
 * // Start the server with default configuration (127.0.0.1:3000)
 * 'use strict';
 * const app = require('./src/app');
 * const config = require('./src/config');
 * app.listen(config.port, config.host, () => {
 *   console.log(`Server running at http://${config.host}:${config.port}/`);
 * });
 *
 * @example
 * // Start with custom environment variables
 * // HOST=0.0.0.0 PORT=8080 NODE_ENV=production node server.js
 */

// Enable strict mode for better error checking, prevention of accidental global
// variable declarations, and alignment with Node.js best practices for CommonJS
// modules. Strict mode disallows silent failures and catches common coding pitfalls.
'use strict';

// =============================================================================
// Dependencies
// =============================================================================

/**
 * Pre-configured Express application instance.
 * Routes and middleware are already mounted in src/app.js.
 * @type {express.Application}
 * @see module:src/app
 */
// Factory Pattern: The Express app is created and configured in src/app.js without
// binding to a port. This separation enables independent testing of routes and
// middleware without starting an HTTP server.
const app = require('./src/app');

/**
 * Application configuration settings.
 * Values are sourced from environment variables with sensible defaults.
 * @type {{ host: string, port: number, env: string }}
 * @see module:src/config
 */
// Twelve-Factor App methodology: Configuration is externalized to environment
// variables (HOST, PORT, NODE_ENV) with sensible defaults, ensuring the application
// adapts to any deployment environment without code changes.
const config = require('./src/config');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Callback invoked once the HTTP server has successfully bound to its TCP endpoint.
 *
 * @callback serverStartupCallback
 * @description Logs the server URL to stdout, confirming that the Express application
 *   is ready to accept incoming HTTP connections. This callback fires only after
 *   the underlying TCP socket has completed binding, guaranteeing that the logged
 *   address is reachable.
 * @example
 * // Expected console output with default configuration:
 * // Server running at http://127.0.0.1:3000/
 * @see module:src/app
 * @see module:src/config
 */

/**
 * Start the HTTP server.
 *
 * Binds the Express app to the configured network interface.
 * The callback fires once the server is ready to accept connections.
 */
// app.listen(port, host, callback) — the argument order is significant:
// - port (config.port, default 3000): TCP port number to listen on
// - host (config.host, default '127.0.0.1'): Network interface to bind to
// - callback: Invoked only after successful TCP binding, confirming the server is ready
app.listen(config.port, config.host, () => {
  // Log the bound server URL using a template literal for operational monitoring.
  // This confirmation message enables process managers (e.g., PM2) and deployment
  // scripts to detect successful startup by watching stdout.
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
