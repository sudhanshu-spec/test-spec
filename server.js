'use strict';

/**
 * @fileoverview HTTP Server Entry Point
 *
 * Binds the Express application to an HTTP server and wires up the final
 * runtime concerns that should not live inside the testable app factory.
 * Morgan HTTP request logging is mounted here (rather than in src/app.js)
 * so that Supertest integration tests stay free of noisy request output.
 * Startup messages are emitted through Winston's structured logging system.
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

// =============================================================================
// Dependencies
// =============================================================================

/** Express app with routes and middleware already mounted in src/app.js. */
const app = require('./src/app');

/** Environment-driven settings: host, port, env, logLevel. */
const config = require('./src/config');

/** Winston logger singleton — used for structured startup messages. */
const logger = require('./src/utils/logger');

/** Morgan middleware that pipes HTTP request logs through Winston's stream. */
const morganMiddleware = require('./src/middleware/morgan.middleware');

// =============================================================================
// Request Logging
// =============================================================================

// Mount Morgan here (not in app.js) so Supertest tests stay clean.
app.use(morganMiddleware);

// =============================================================================
// Server Initialization
// =============================================================================

// Bind the Express app to the configured host and port.
// The callback fires once the server is ready to accept connections.
app.listen(config.port, config.host, () => {
  logger.info(`Server running at http://${config.host}:${config.port}/`);
});
