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
 * @example
 * // Default configuration - starts server on localhost:3000
 * // From terminal:
 * // $ node server.js
 * // Server running at http://127.0.0.1:3000/
 *
 * @example
 * // Custom host and port configuration via environment variables
 * // Useful for binding to all network interfaces or alternative ports
 * // From terminal:
 * // $ HOST=0.0.0.0 PORT=8080 node server.js
 * // Server running at http://0.0.0.0:8080/
 *
 * @example
 * // Production mode with optimized Express settings
 * // Enables Express production optimizations (view caching, less verbose errors)
 * // From terminal:
 * // $ NODE_ENV=production node server.js
 * // Server running at http://127.0.0.1:3000/
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
 * Callback Behavior:
 * - The callback function executes ONLY after the server successfully binds
 *   to the specified host and port, confirming the server is ready for requests.
 * - If binding fails (e.g., port in use, permission denied), the callback
 *   will NOT execute and Node.js will emit an 'error' event instead.
 *
 * Error Handling Considerations:
 * - EADDRINUSE: Port is already in use by another process
 * - EACCES: Insufficient permissions (ports < 1024 require elevated privileges)
 * - EADDRNOTAVAIL: The specified host address is not available on this machine
 *
 * For production deployments, consider attaching an error handler:
 * server.on('error', (err) => { ... });
 *
 * @see module:src/config - Configuration source for host and port values
 */
app.listen(config.port, config.host, () => {
  // Callback execution confirms successful server binding to the network interface.
  // This message indicates the server is now actively listening for incoming
  // HTTP requests on the configured host:port combination.
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
