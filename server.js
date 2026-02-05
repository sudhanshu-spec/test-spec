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
 * Graceful Shutdown:
 *   The server handles SIGTERM and SIGINT signals for PM2 zero-downtime
 *   reloads and clean shutdown during deployments.
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
 * @type {import('http').Server}
 */
const server = app.listen(config.port, config.host, () => {
  // Display startup confirmation with the server URL
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

// =============================================================================
// Graceful Shutdown Handling
// =============================================================================

/**
 * Gracefully shutdown the HTTP server.
 *
 * This function handles SIGTERM and SIGINT signals to enable:
 *   - PM2 zero-downtime reloads (cluster mode)
 *   - Clean shutdown during deployments
 *   - Proper connection draining before exit
 *
 * The server stops accepting new connections and waits for existing
 * requests to complete. If shutdown takes longer than the timeout,
 * the process is forcefully terminated.
 *
 * @param {string} signal - The signal that triggered the shutdown (e.g., 'SIGTERM', 'SIGINT')
 */
function gracefulShutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);

  // Stop accepting new connections and wait for existing ones to finish
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close after timeout if graceful shutdown fails
  // This prevents the process from hanging indefinitely
  setTimeout(() => {
    console.error('Forcefully shutting down after timeout...');
    process.exit(1);
  }, 10000);
}

/**
 * Register signal handlers for graceful shutdown.
 *
 * SIGTERM: Sent by PM2 and most process managers during reload/stop
 * SIGINT:  Sent when user presses Ctrl+C in terminal
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
