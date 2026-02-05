/**
 * HTTP/HTTPS Server Entry Point
 *
 * This module binds the Express application to an HTTP or HTTPS server.
 * Configuration is separated from app creation for better testability.
 * 
 * HTTPS Support:
 *   When SSL certificates are configured and available, the server will
 *   automatically start with TLS/SSL encryption. If certificates are
 *   unavailable or fail to load, the server gracefully falls back to HTTP.
 *
 * Architecture:
 *   - src/app.js       → Express app factory (routes & middleware)
 *   - src/config/      → Environment-driven configuration
 *   - src/routes/      → Route handlers
 *
 * Usage:
 *   npm start                              # Default: http://127.0.0.1:3000/
 *   HOST=0.0.0.0 PORT=8080 npm start       # Custom binding
 *   HTTPS_ENABLED=true SSL_KEY_PATH=./certs/server.key SSL_CERT_PATH=./certs/server.cert npm start  # HTTPS
 *
 * Environment Variables for HTTPS:
 *   - HTTPS_ENABLED    → Set to 'true' to enable HTTPS (default: false)
 *   - SSL_KEY_PATH     → Path to SSL private key file
 *   - SSL_CERT_PATH    → Path to SSL certificate file
 *
 * @module server
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

/**
 * Node.js built-in HTTPS module.
 * Used for creating TLS/SSL encrypted server when certificates are available.
 * @type {import('https')}
 */
const https = require('https');

/**
 * Node.js built-in file system module.
 * Used for synchronously reading SSL certificate and private key files.
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
 * Includes HTTPS configuration: httpsEnabled, sslKeyPath, sslCertPath.
 * @type {{ host: string, port: number, env: string, httpsEnabled: boolean, sslKeyPath: string, sslCertPath: string }}
 */
const config = require('./src/config');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Start the HTTP or HTTPS server.
 *
 * Server creation follows this logic:
 * 1. If HTTPS is enabled and certificate paths are configured:
 *    - Attempt to read SSL certificates from the file system
 *    - If successful, create and start HTTPS server with TLS encryption
 *    - If certificate loading fails, log warning and fallback to HTTP
 * 2. If HTTPS is not enabled or certificate paths are missing:
 *    - Start standard HTTP server
 *
 * Graceful Fallback:
 *   When certificate files cannot be read (missing, permissions, etc.),
 *   the server falls back to HTTP rather than crashing, ensuring the
 *   application remains available during development or misconfiguration.
 *
 * @fires Server#listening - When server is ready to accept connections
 */
if (config.httpsEnabled && config.sslKeyPath && config.sslCertPath) {
  try {
    // Attempt to load SSL credentials from configured paths
    const credentials = {
      key: fs.readFileSync(config.sslKeyPath),
      cert: fs.readFileSync(config.sslCertPath)
    };

    // Create HTTPS server with TLS/SSL encryption
    https.createServer(credentials, app).listen(config.port, config.host, () => {
      // Display startup confirmation with the secure server URL
      console.log(`HTTPS Server running at https://${config.host}:${config.port}/`);
    });
  } catch (error) {
    // Certificate loading failed - gracefully fallback to HTTP
    console.warn('Failed to load SSL certificates, falling back to HTTP:', error.message);
    
    app.listen(config.port, config.host, () => {
      // Display startup confirmation with the HTTP server URL
      console.log(`Server running at http://${config.host}:${config.port}/`);
    });
  }
} else {
  // HTTPS not enabled or certificate paths not configured - start HTTP server
  app.listen(config.port, config.host, () => {
    // Display startup confirmation with the server URL
    console.log(`Server running at http://${config.host}:${config.port}/`);
  });
}
