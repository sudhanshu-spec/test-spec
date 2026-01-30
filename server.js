/**
 * HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server.
 * Configuration is separated from app creation for better testability,
 * following the Factory Pattern established in the application architecture.
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
 * @see module:src/app - Express application factory that creates and configures the app instance
 * @see module:src/config - Configuration module providing host, port, and environment settings
 *
 * @example <caption>Default startup (localhost:3000)</caption>
 * // Terminal command:
 * // npm start
 * //
 * // Expected output:
 * // Server running at http://127.0.0.1:3000/
 *
 * @example <caption>Custom network binding</caption>
 * // Terminal command:
 * // HOST=0.0.0.0 PORT=8080 npm start
 * //
 * // Expected output:
 * // Server running at http://0.0.0.0:8080/
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
 * Design Decision: Separation of App Factory and Server Binding
 * -------------------------------------------------------------
 * The Express application is created in src/app.js (Factory Pattern) and
 * only bound to HTTP here. This architectural separation enables:
 *   - Unit testing of routes without starting an actual HTTP server
 *   - Integration testing using supertest with the app instance directly
 *   - Flexible deployment configurations via environment variables
 *   - Clear separation of concerns: app logic vs. network binding
 *
 * @see Technical Specifications - Factory Pattern requirement for testability
 */
app.listen(config.port, config.host, () => {
  // Startup callback: Executes once the server is actively listening
  // This confirms successful binding to the configured network interface
  // and provides the operator with the URL for accessing the application
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
