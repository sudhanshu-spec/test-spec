/**
 * HTTP Server Entry Point
 *
 * This module binds the Express application to an HTTP server.
 * Configuration is separated from app creation for better testability,
 * allowing the Express app to be imported and tested independently
 * without starting an actual HTTP listener.
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
 * @author hxu
 * @version 1.0.0
 * @since 1.0.0
 * @see module:src/app - Express application factory
 * @see module:src/config - Configuration management
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
// This section handles the HTTP server binding process. The initialization
// follows a non-blocking pattern where app.listen() returns immediately,
// and the callback function executes once the server is successfully bound
// to the specified host and port.
// =============================================================================

/**
 * Start the HTTP server.
 *
 * Binds the Express app to the configured network interface and port.
 * The callback fires once the server is ready to accept connections,
 * confirming successful binding to the network interface.
 *
 * The callback pattern is used here for several architectural reasons:
 * 1. Non-blocking: Allows the event loop to continue while binding
 * 2. Confirmation: Provides verification that the port is available
 * 3. Logging: Enables startup message only after successful initialization
 *
 * @fires server:ready - Emitted when the server successfully binds and is
 *   ready to accept incoming HTTP connections. The console.log in the
 *   callback serves as the ready notification.
 */
app.listen(config.port, config.host, () => {
  // Startup confirmation callback - this executes only after the server
  // has successfully bound to the network interface. If the port were
  // unavailable or binding failed, this callback would not execute and
  // an error would be thrown instead.
  //
  // The URL format follows standard convention: http://host:port/
  // This provides operators with immediate verification that the server
  // is ready to accept connections at the specified address.
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
