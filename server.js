/**
 * HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server.
 * Configuration is separated from app creation for better testability.
 * Morgan HTTP request logging is mounted here (rather than in the app
 * factory) to keep Supertest integration test output clean. Startup
 * messages are routed through Winston's structured logging system.
 *
 * Architecture:
 *   - src/app.js       → Express app factory (routes & middleware)
 *   - src/config/      → Environment-driven configuration
 *   - src/routes/      → Route handlers
 *   - src/utils/       → Winston logger utility
 *   - src/middleware/   → Morgan request logging, error handling
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
 * Routes and middleware are already mounted in src/app.js.
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Application configuration settings.
 * Values are sourced from environment variables with sensible defaults.
 * @type {{ host: string, port: number, env: string, logLevel: string }}
 */
const config = require('./src/config');

/**
 * Winston logger singleton for structured logging.
 * @type {import('winston').Logger}
 */
const logger = require('./src/utils/logger');

/**
 * Pre-configured Morgan HTTP request logging middleware.
 * Pipes request logs through Winston's stream interface.
 * @type {import('express').RequestHandler}
 */
const morganMiddleware = require('./src/middleware/morgan.middleware');

// =============================================================================
// Request Logging Middleware
// =============================================================================

/**
 * Mount Morgan HTTP request logging middleware.
 * Intentionally mounted here (not in app.js) to keep Supertest test output clean.
 */
app.use(morganMiddleware);

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
  // Display startup confirmation with the server URL via Winston
  logger.info(`Server running at http://${config.host}:${config.port}/`);
});
