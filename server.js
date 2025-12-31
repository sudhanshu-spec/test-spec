/**
 * HTTP/HTTPS Server Entry Point
 *
 * This module serves as the sole entry point for starting the HTTP or HTTPS server.
 * It imports the pre-configured Express application and configuration,
 * then binds the server to the specified host and port with optional TLS encryption.
 *
 * Architecture Overview:
 * ----------------------
 * - Express app configuration lives in: src/app.js
 * - Configuration settings live in: src/config/index.js
 * - Security configuration lives in: src/config/security.config.js
 * - Route handlers live in: src/routes/
 *
 * This separation of concerns enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Easy configuration management via environment variables
 * - Clean, maintainable code structure
 * - Flexible deployment with HTTP or HTTPS support
 *
 * Security Features:
 * ------------------
 * - Optional HTTPS/TLS support for encrypted transport
 * - Graceful shutdown handling for zero-downtime deployments
 * - SIGTERM and SIGINT signal handlers for container orchestration
 *
 * HTTPS Configuration:
 * --------------------
 * To enable HTTPS, set the following environment variables:
 * - HTTPS_ENABLED=true         : Enable HTTPS server mode
 * - TLS_CERT_PATH=/path/cert   : Path to TLS certificate file (PEM format)
 * - TLS_KEY_PATH=/path/key     : Path to TLS private key file (PEM format)
 *
 * Note: When HTTPS is enabled but certificate files are missing or unreadable,
 * the server will gracefully fall back to HTTP mode with a warning.
 *
 * Graceful Shutdown:
 * ------------------
 * The server handles SIGTERM and SIGINT signals for graceful shutdown:
 * - Stops accepting new connections
 * - Allows existing connections to complete
 * - Logs shutdown progress
 * - Exits with code 0 on success
 *
 * Usage:
 * ------
 * Standard HTTP:   npm start
 * Custom port:     HOST=0.0.0.0 PORT=8080 npm start
 * HTTPS mode:      HTTPS_ENABLED=true TLS_CERT_PATH=/etc/ssl/cert.pem TLS_KEY_PATH=/etc/ssl/key.pem npm start
 *
 * @module server
 * @requires https - Node.js built-in HTTPS module for TLS server
 * @requires fs - Node.js built-in filesystem module for reading TLS files
 * @requires ./src/app - The configured Express application instance
 * @requires ./src/config - Application configuration (host, port, env, HTTPS settings)
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

/**
 * Node.js built-in HTTPS module for creating secure TLS/SSL servers.
 * Used when HTTPS_ENABLED is true to enable transport layer security.
 * @type {import('https')}
 */
const https = require('https');

/**
 * Node.js built-in filesystem module for reading TLS certificate and key files.
 * Used to load TLS credentials from disk when HTTPS is enabled.
 * @type {import('fs')}
 */
const fs = require('fs');

/**
 * Import the configured Express application instance.
 * The app is pre-configured with routes and middleware in src/app.js.
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Import the application configuration.
 * Contains host, port, environment, and HTTPS settings.
 * @type {{ host: string, port: number, env: string, httpsEnabled: boolean, tlsCertPath: string, tlsKeyPath: string }}
 */
const config = require('./src/config');

// ---------------------------------------------------------------------------
// Server Initialization
// ---------------------------------------------------------------------------

/**
 * Server instance reference for graceful shutdown handling.
 * Will be assigned to either HTTP or HTTPS server based on configuration.
 * @type {import('http').Server | import('https').Server | null}
 */
let server = null;

/**
 * Reads TLS credentials from the filesystem.
 * Returns null if files cannot be read or do not exist.
 *
 * @returns {{ key: Buffer, cert: Buffer } | null} TLS credentials object or null if unavailable
 */
function loadTlsCredentials() {
  try {
    // Validate that both paths are provided
    if (!config.tlsCertPath || !config.tlsKeyPath) {
      console.warn('HTTPS enabled but TLS certificate or key path not configured');
      return null;
    }

    // Check if certificate file exists and is readable
    if (!fs.existsSync(config.tlsCertPath)) {
      console.warn(`TLS certificate file not found: ${config.tlsCertPath}`);
      return null;
    }

    // Check if key file exists and is readable
    if (!fs.existsSync(config.tlsKeyPath)) {
      console.warn(`TLS private key file not found: ${config.tlsKeyPath}`);
      return null;
    }

    // Read and return credentials
    const credentials = {
      key: fs.readFileSync(config.tlsKeyPath),
      cert: fs.readFileSync(config.tlsCertPath)
    };

    console.log('TLS credentials loaded successfully');
    return credentials;
  } catch (error) {
    console.error(`Failed to load TLS credentials: ${error.message}`);
    return null;
  }
}

/**
 * Gracefully shuts down the server.
 * Stops accepting new connections and waits for existing connections to complete.
 *
 * @param {string} signal - The signal that triggered the shutdown (e.g., 'SIGTERM', 'SIGINT')
 * @returns {void}
 */
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  if (!server) {
    console.log('No server instance to shut down');
    process.exit(0);
    return;
  }

  // Stop accepting new connections
  server.close((error) => {
    if (error) {
      console.error(`Error during server shutdown: ${error.message}`);
      process.exit(1);
      return;
    }

    console.log('Server closed successfully. All connections terminated gracefully.');
    console.log('Graceful shutdown complete. Exiting process.');
    process.exit(0);
  });

  // Set a timeout for forceful shutdown if graceful shutdown takes too long
  // This ensures the process doesn't hang indefinitely
  const shutdownTimeout = setTimeout(() => {
    console.error('Graceful shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, 30000); // 30 second timeout

  // Ensure the timeout doesn't prevent the process from exiting
  shutdownTimeout.unref();
}

/**
 * Register signal handlers for graceful shutdown.
 * SIGTERM: Sent by container orchestrators (Kubernetes, Docker) for graceful termination
 * SIGINT: Sent when user presses Ctrl+C in terminal (development)
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Start the HTTP or HTTPS server based on configuration.
 *
 * Determines whether to start in HTTPS mode based on config.httpsEnabled.
 * If HTTPS is enabled and valid TLS credentials are available, starts HTTPS server.
 * Otherwise, falls back to HTTP server with appropriate logging.
 *
 * Default binding: http://127.0.0.1:3000/
 * Override via HOST, PORT, HTTPS_ENABLED, TLS_CERT_PATH, and TLS_KEY_PATH environment variables.
 */
function startServer() {
  // Determine protocol and create appropriate server
  const protocol = config.httpsEnabled ? 'https' : 'http';

  if (config.httpsEnabled) {
    // Attempt to load TLS credentials for HTTPS
    const credentials = loadTlsCredentials();

    if (credentials) {
      // Create and start HTTPS server with TLS credentials
      server = https.createServer(credentials, app);
      server.listen(config.port, config.host, () => {
        console.log(`HTTPS Server running at https://${config.host}:${config.port}/`);
        console.log('Transport Layer Security (TLS) enabled');
      });
    } else {
      // Fall back to HTTP if TLS credentials unavailable
      console.warn('HTTPS requested but TLS credentials unavailable. Falling back to HTTP.');
      server = app.listen(config.port, config.host, () => {
        console.log(`Server running at http://${config.host}:${config.port}/`);
        console.log('Warning: Running in HTTP mode (TLS not available)');
      });
    }
  } else {
    // Start standard HTTP server
    server = app.listen(config.port, config.host, () => {
      // Log server startup information
      console.log(`Server running at http://${config.host}:${config.port}/`);
    });
  }
}

// Initialize and start the server
startServer();

// Log application initialization complete
console.log('Application module loaded successfully');

// PR test log - added for testing purposes
console.log('Express.js server initialization complete - PR validation log');

// Additional PR validation log - added per user request for testing purposes
console.log('PR update test: Server module fully initialized');
