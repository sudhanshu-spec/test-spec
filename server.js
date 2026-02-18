/**
 * HTTP Server Entry Point
 *
 * @module server
 * @description Application entry point that bootstraps the Express HTTP server.
 * This module imports the pre-configured Express application from
 * {@link module:src/app} and the environment-driven configuration from
 * {@link module:src/config}, then binds the app to the configured network
 * interface and port. Once bound, it logs the startup URL to confirm the
 * server is ready to accept incoming HTTP connections.
 *
 * Configuration is separated from app creation for better testability — the
 * Express application can be imported independently by test frameworks (e.g.,
 * Supertest) without starting an HTTP server.
 *
 * Architecture:
 *   - src/app.js       → Express app factory (routes & middleware)
 *   - src/config/      → Environment-driven configuration
 *   - src/routes/      → Route handlers
 *
 * @requires module:src/app
 * @requires module:src/config
 *
 * @example <caption>Start with defaults</caption>
 * // npm start
 * // → Server running at http://127.0.0.1:3000/
 *
 * @example <caption>Custom host and port</caption>
 * // HOST=0.0.0.0 PORT=8080 node server.js
 * // → Server running at http://0.0.0.0:8080/
 *
 * @see module:src/app — Express application factory with pre-mounted routes
 * @see module:src/config — Environment-driven configuration (host, port, env)
 */

'use strict'; // Enforce strict JavaScript parsing to catch silent errors and prevent unsafe actions

// =============================================================================
// Dependencies
// =============================================================================

/**
 * Pre-configured Express application instance.
 * Created via the Factory Pattern in src/app.js with routes pre-mounted,
 * enabling both production server binding and test-framework consumption
 * without starting an HTTP listener.
 * @type {import('express').Application}
 * @requires module:src/app
 */
const app = require('./src/app');

/**
 * Application configuration settings following the Twelve-Factor App methodology.
 * Values are sourced from environment variables with sensible defaults,
 * enabling deployment-specific configuration without code changes.
 * @type {{ host: string, port: number, env: string }}
 * @requires module:src/config
 */
const config = require('./src/config');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Start the HTTP server.
 *
 * @description Binds the Express application to the configured network interface
 * and port, creating an HTTP server that accepts incoming TCP connections. The
 * callback function fires once the underlying TCP socket is bound and the server
 * is ready to accept connections, logging the startup URL to stdout.
 * @fires server:listening — Emitted when the server has been bound after calling app.listen()
 * @listens {number} config.port — The TCP port number on which the server accepts connections
 * @see module:src/app — Provides the Express application instance
 * @see module:src/config — Provides host and port configuration values
 */
app.listen(config.port, config.host, () => {
  // Display startup confirmation with the server URL
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
