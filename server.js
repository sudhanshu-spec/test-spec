/**
 * HTTP/HTTPS Server Entry Point
 *
 * This module binds the Express application to an HTTP or HTTPS server
 * depending on the application configuration. When HTTPS is enabled and
 * valid TLS certificate paths are provided, the server creates an encrypted
 * HTTPS connection using Node.js built-in `https` module. Otherwise, it
 * defaults to standard HTTP.
 *
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
 *   HTTPS_ENABLED=true SSL_KEY_PATH=./key.pem SSL_CERT_PATH=./cert.pem npm start  # HTTPS
 *
 * @module server
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

/**
 * Node.js built-in HTTPS module for creating TLS-encrypted servers.
 * Used when HTTPS_ENABLED is true and SSL certificate paths are configured.
 * @type {import('https')}
 */
const https = require('https');

/**
 * Node.js built-in filesystem module for reading TLS certificate files.
 * Used to load the private key and certificate for HTTPS server creation.
 * @type {import('fs')}
 */
const fs = require('fs');

/**
 * Pre-configured Express application instance.
 * Routes and middleware are already mounted in src/app.js.
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Application configuration settings.
 * Values are sourced from environment variables with sensible defaults.
 * Includes security-related settings for HTTPS, CORS, and rate limiting.
 * @type {{ host: string, port: number, env: string, httpsEnabled: boolean, sslKeyPath: string, sslCertPath: string }}
 */
const config = require('./src/config');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * The active server instance (HTTP or HTTPS).
 * Exposes listen(), close(), and address() methods for lifecycle management.
 * @type {import('http').Server | import('https').Server}
 */
let server;

if (config.httpsEnabled && config.sslKeyPath && config.sslCertPath) {
  /**
   * HTTPS server path: Creates a TLS-encrypted server when HTTPS is enabled
   * and both SSL key and certificate file paths are provided in configuration.
   *
   * Reads TLS credentials synchronously at startup since the server cannot
   * accept connections without valid certificates.
   */
  const key = fs.readFileSync(config.sslKeyPath);
  const cert = fs.readFileSync(config.sslCertPath);

  server = https.createServer({ key, cert }, app);

  server.listen(config.port, config.host, () => {
    // Display startup confirmation with the HTTPS server URL
    console.log(`HTTPS Server running at https://${config.host}:${config.port}/`);
  });
} else {
  /**
   * HTTP server path (default): Binds the Express app to a standard HTTP server.
   * This is the default behavior when HTTPS is not enabled or certificate
   * paths are not configured. The callback fires once the server is ready
   * to accept connections.
   */
  server = app.listen(config.port, config.host, () => {
    // Display startup confirmation with the server URL
    console.log(`Server running at http://${config.host}:${config.port}/`);
  });
}

// =============================================================================
// Module Export
// =============================================================================

/**
 * Exports the active server instance for lifecycle management and testing.
 * The exported object provides access to the underlying Node.js server
 * methods including listen(), close(), and address() regardless of whether
 * the server is running in HTTP or HTTPS mode.
 * @type {import('http').Server | import('https').Server}
 */
module.exports = server;
