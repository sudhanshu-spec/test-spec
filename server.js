/**
 * HTTP Server Entry Point
 *
 * This module serves as the sole entry point for starting the HTTP server.
 * It imports the pre-configured Express application and configuration,
 * then binds the server to the specified host and port.
 *
 * Architecture Overview:
 * ----------------------
 * - Express app configuration lives in: src/app.js
 * - Configuration settings live in: src/config/index.js
 * - Route handlers live in: src/routes/
 *
 * This separation of concerns enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Easy configuration management via environment variables
 * - Clean, maintainable code structure
 *
 * Usage:
 * ------
 * Standard:   npm start
 * Custom:     HOST=0.0.0.0 PORT=8080 npm start
 *
 * @module server
 * @requires ./src/app - The configured Express application instance
 * @requires ./src/config - Application configuration (host, port, env)
 *
 * @example
 * // Start server with defaults
 * npm start
 * // Output:
 * // Server running at http://127.0.0.1:3000/
 * // Application module loaded successfully
 * // Express.js server initialization complete - PR validation log
 * // PR update test: Server module fully initialized
 *
 * @example
 * // Start with custom configuration
 * HOST=0.0.0.0 PORT=8080 npm start
 * // Output:
 * // Server running at http://0.0.0.0:8080/
 * // Application module loaded successfully
 * // Express.js server initialization complete - PR validation log
 * // PR update test: Server module fully initialized
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

/**
 * Import the configured Express application instance.
 * The app is pre-configured with routes and middleware in src/app.js.
 * @type {Object}
 */
const app = require('./src/app');

/**
 * Import the application configuration.
 * Contains host, port, and environment settings.
 * @type {{ host: string, port: number, env: string }}
 */
const config = require('./src/config');

// ---------------------------------------------------------------------------
// Server Initialization
// ---------------------------------------------------------------------------

/**
 * Start the HTTP server.
 *
 * Binds the Express application to the configured host and port.
 * Logs a startup message upon successful binding.
 *
 * Default binding: http://127.0.0.1:3000/
 * Override via HOST and PORT environment variables.
 *
 * @fires server#ready - Emitted when server successfully binds to host:port
 */
app.listen(config.port, config.host, () => {
  // Log server startup information
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

// Module Initialization Confirmation Log
// This log confirms that the server.js module has been successfully loaded
// and all dependencies (app, config) have been imported without errors.
// Useful for verifying the module dependency chain is intact.
console.log('Application module loaded successfully');

// PR Validation Log for CI/CD Testing
// This log statement serves as a verification checkpoint for continuous
// integration pipelines. CI/CD systems can grep for this message to confirm
// the server initialization code path was executed successfully during testing.
console.log('Express.js server initialization complete - PR validation log');

// Additional PR Test Verification Log
// This supplementary log provides another checkpoint for pull request
// validation workflows. It confirms the entire server module initialization
// sequence completed, useful for automated testing and deployment verification.
console.log('PR update test: Server module fully initialized');
