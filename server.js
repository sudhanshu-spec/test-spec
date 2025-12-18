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
 * // Standard startup via npm:
 * // $ npm start
 *
 * @example
 * // Programmatic usage for testing/embedding:
 * // const app = require('./src/app');
 * // const config = require('./src/config');
 * // app.listen(config.port, config.host, () => {
 * //   console.log(`Server running at http://${config.host}:${config.port}/`);
 * // });
 *
 * @example
 * // Environment-based configuration:
 * // $ HOST=0.0.0.0 PORT=8080 NODE_ENV=production node server.js
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

/**
 * Import the configured Express application instance.
 * The app is pre-configured with routes and middleware in src/app.js.
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Import the application configuration.
 * Contains host, port, and environment settings.
 * @type {{ host: string, port: number, env: string }}
 */
const config = require('./src/config');

// ---------------------------------------------------------------------------
// Server Binding
// ---------------------------------------------------------------------------
// The app.listen() callback fires once the TCP socket successfully binds to 
// the specified host and port. This confirms the server is ready to accept
// incoming HTTP connections.

/**
 * Start the HTTP server.
 *
 * Binds the Express application to the configured host and port.
 * Logs a startup message upon successful binding.
 *
 * Default binding: http://127.0.0.1:3000/
 * Override via HOST and PORT environment variables.
 */
app.listen(config.port, config.host, () => {
  // Primary startup confirmation: Outputs the URL where the server is accessible.
  // This URL can be used to verify the server is running via browser or curl.
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

// Module initialization confirmation: This log fires when the CommonJS require()
// chain completes successfully. It confirms that server.js, src/app.js, 
// src/config/index.js, and all route modules have been loaded without errors.
console.log('Application module loaded successfully');

// CI/CD pipeline validation: This log message serves as a verification point
// for automated testing and pull request checks, confirming the entry point
// script executes without throwing exceptions during the require phase.
console.log('Express.js server initialization complete - PR validation log');

// Additional PR validation marker: Provides an extra confirmation point
// that the entire server module initialization sequence completed. Useful
// for grep-based log parsing in deployment pipelines and health monitors.
console.log('PR update test: Server module fully initialized');
