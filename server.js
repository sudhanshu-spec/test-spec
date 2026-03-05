/**
 * HTTP Server Entry Point
 *
 * This module is the main entry point for the Node.js Express application.
 * It imports the pre-configured Express application instance from the app factory
 * (`src/app.js`) and the environment-driven configuration from the config module
 * (`src/config/index.js`), then binds the application to a network interface so
 * it can begin accepting incoming HTTP requests.
 *
 * The deliberate separation between application assembly (performed in `src/app.js`)
 * and server binding (performed here) is a key architectural decision. It follows
 * the Factory pattern, allowing integration tests to import the Express app directly
 * via `require('./src/app')` and issue HTTP assertions with Supertest — without
 * starting a live server or occupying a network port.
 *
 * Architecture overview:
 *   - server.js          → HTTP server binding and process lifecycle (this file)
 *   - src/app.js         → Express app factory (creates app, mounts routes)
 *   - src/config/        → Environment-driven configuration (host, port, env)
 *   - src/routes/        → Route handler definitions (GET /, GET /evening)
 *
 * Startup examples:
 *   npm start                              # Default: http://127.0.0.1:3000/
 *   HOST=0.0.0.0 PORT=8080 npm start       # Custom host and port binding
 *   NODE_ENV=production npm start           # Production environment mode
 *
 * @module server
 * @requires ./src/app
 * @requires ./src/config
 * @see {@link module:src/app} for Express application factory
 * @see {@link module:src/config} for configuration details
 *
 * @example
 * // Start the server with default settings (127.0.0.1:3000)
 * // From the terminal:
 * node server.js
 *
 * @example
 * // Start with custom host and port via environment variables
 * // From the terminal:
 * HOST=0.0.0.0 PORT=8080 node server.js
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

/**
 * The pre-configured Express application instance.
 *
 * This import triggers the Express app factory in `src/app.js`, which:
 *   1. Creates a new Express application via `express()`
 *   2. Imports aggregated route handlers from `src/routes/index.js`
 *   3. Mounts those route handlers at the root path using `app.use('/', mainRoutes)`
 *   4. Returns the fully configured app — ready to listen, but NOT yet bound
 *
 * Because the factory never calls `app.listen()`, this module is responsible for
 * binding the app to a network interface. This separation is what makes the app
 * testable with Supertest without spawning a live HTTP server.
 *
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Application configuration object with environment-driven settings.
 *
 * The config module (`src/config/index.js`) reads from `process.env` and provides
 * fallback defaults following the Twelve-Factor App methodology:
 *   - `config.host` → HOST env var or `'127.0.0.1'` (loopback only)
 *   - `config.port` → PORT env var parsed via `parseInt(value, 10)` or `3000`
 *   - `config.env`  → NODE_ENV env var or `'development'`
 *
 * These values are consumed below to parameterize the `app.listen()` call,
 * ensuring no deployment parameters are hardcoded in this file.
 *
 * @type {{ host: string, port: number, env: string }}
 */
const config = require('./src/config');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Bind the Express application to the configured network interface and start
 * accepting HTTP connections.
 *
 * `app.listen()` is the Express method that creates an underlying Node.js
 * `http.Server` and calls its `.listen()` method. It accepts three arguments:
 *   - `port`     — The TCP port number to listen on (e.g., 3000)
 *   - `host`     — The network interface to bind to (e.g., '127.0.0.1')
 *   - `callback` — A function invoked once the server is ready for connections
 *
 * The callback function below logs a confirmation message to stdout, providing
 * operators with immediate feedback that the server has started successfully
 * and indicating the exact URL where it can be reached.
 *
 * @function listen
 * @param {number} config.port - TCP port to bind (default: 3000)
 * @param {string} config.host - Network interface to bind (default: '127.0.0.1')
 * @param {Function} callback - Invoked when the server is ready for connections
 * @returns {import('http').Server} The underlying Node.js HTTP server instance
 *
 * @example
 * // With default config, the server starts on http://127.0.0.1:3000/
 * // The callback logs: "Server running at http://127.0.0.1:3000/"
 */
app.listen(config.port, config.host, () => {
  // Log the startup confirmation message to stdout so operators can verify
  // that the server is running and know the exact URL to access it.
  // The template literal constructs the full URL from the configured host and port.
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
