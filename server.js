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
 * - Route handlers live in: src/routes/
 *
 * This separation of concerns enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Easy configuration management via environment variables
 * - Clean, maintainable code structure
 * - Flexible HTTP/HTTPS protocol selection
 *
 * HTTPS Configuration:
 * --------------------
 * To enable HTTPS, set the following environment variables:
 * - HTTPS_ENABLED: Set to 'true' to enable HTTPS mode
 * - SSL_KEY_PATH: Path to the SSL private key file (e.g., ./certs/key.pem)
 * - SSL_CERT_PATH: Path to the SSL certificate file (e.g., ./certs/cert.pem)
 *
 * HTTPS is only enabled when ALL three conditions are met:
 * 1. HTTPS_ENABLED is set to 'true'
 * 2. SSL_KEY_PATH points to a valid, readable private key file
 * 3. SSL_CERT_PATH points to a valid, readable certificate file
 *
 * Usage:
 * ------
 * Standard (HTTP):     npm start
 * Custom Host/Port:    HOST=0.0.0.0 PORT=8080 npm start
 * HTTPS:               HTTPS_ENABLED=true SSL_KEY_PATH=./certs/key.pem SSL_CERT_PATH=./certs/cert.pem npm start
 * Production HTTPS:    NODE_ENV=production HTTPS_ENABLED=true SSL_KEY_PATH=/etc/ssl/key.pem SSL_CERT_PATH=/etc/ssl/cert.pem PORT=443 npm start
 *
 * Self-signed Certificate Generation (Development):
 * -------------------------------------------------
 * mkdir -p certs
 * openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
 *
 * @module server
 * @requires http - Node.js built-in HTTP module for creating HTTP server
 * @requires https - Node.js built-in HTTPS module for creating HTTPS server with TLS
 * @requires fs - Node.js built-in File System module for reading SSL certificates
 * @requires ./src/app - The configured Express application instance
 * @requires ./src/config - Application configuration (host, port, env, SSL settings)
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

/**
 * Node.js built-in HTTP module.
 * Used to create HTTP server instance when HTTPS is disabled.
 * @type {import('http')}
 */
const http = require('http');

/**
 * Node.js built-in HTTPS module.
 * Used to create HTTPS server with TLS/SSL encryption when enabled.
 * @type {import('https')}
 */
const https = require('https');

/**
 * Node.js built-in File System module.
 * Used to synchronously read SSL certificate and private key files.
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
 * Contains host, port, environment, and SSL settings.
 * @type {{ host: string, port: number, env: string, httpsEnabled: boolean, sslKeyPath: string|undefined, sslCertPath: string|undefined }}
 */
const config = require('./src/config');

// ---------------------------------------------------------------------------
// HTTPS Configuration
// ---------------------------------------------------------------------------

/**
 * Determine if HTTPS should be used based on configuration.
 * HTTPS is enabled only when httpsEnabled is true AND both certificate paths are provided.
 * @type {boolean}
 */
const useHttps = config.httpsEnabled && config.sslKeyPath && config.sslCertPath;

/**
 * SSL/TLS credentials for HTTPS server.
 * Contains the private key and certificate if HTTPS is enabled.
 * @type {{ key: Buffer, cert: Buffer } | null}
 */
let credentials = null;

/**
 * Load SSL credentials if HTTPS is enabled.
 * Reads the private key and certificate files synchronously.
 * Wraps in try-catch to provide helpful error messages if certificates cannot be read.
 */
if (useHttps) {
  try {
    credentials = {
      key: fs.readFileSync(config.sslKeyPath),
      cert: fs.readFileSync(config.sslCertPath)
    };
  } catch (error) {
    console.error('Failed to load SSL certificates:');
    console.error(`  Key path: ${config.sslKeyPath}`);
    console.error(`  Cert path: ${config.sslCertPath}`);
    console.error(`  Error: ${error.message}`);
    console.error('');
    console.error('Please ensure:');
    console.error('  1. The SSL_KEY_PATH and SSL_CERT_PATH environment variables point to valid files');
    console.error('  2. The files exist and are readable by the current user');
    console.error('  3. The private key and certificate are in PEM format');
    console.error('');
    console.error('To generate self-signed certificates for development:');
    console.error('  mkdir -p certs');
    console.error('  openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Server Initialization
// ---------------------------------------------------------------------------

/**
 * Create the HTTP or HTTPS server based on configuration.
 *
 * When HTTPS is enabled (HTTPS_ENABLED=true with valid certificate paths):
 *   - Creates an HTTPS server with TLS encryption using https.createServer()
 *   - Requires valid SSL private key and certificate files
 *
 * When HTTPS is disabled or certificates are not provided:
 *   - Creates a standard HTTP server using http.createServer()
 *   - This is the default behavior for development
 *
 * @type {import('http').Server | import('https').Server}
 */
const server = useHttps
  ? https.createServer(credentials, app)
  : http.createServer(app);

/**
 * Start the server.
 *
 * Binds the server (HTTP or HTTPS) to the configured host and port.
 * Logs a startup message upon successful binding with the appropriate protocol.
 *
 * Default binding: http://127.0.0.1:3000/
 * Override via HOST and PORT environment variables.
 * Enable HTTPS via HTTPS_ENABLED, SSL_KEY_PATH, and SSL_CERT_PATH environment variables.
 */
server.listen(config.port, config.host, () => {
  // Determine the protocol based on server type
  const protocol = useHttps ? 'https' : 'http';
  
  // Log server startup information
  console.log(`Server running at ${protocol}://${config.host}:${config.port}/`);
  
  // Log additional information in development mode
  if (config.env === 'development') {
    if (useHttps) {
      console.log('HTTPS mode enabled with TLS encryption');
      console.log(`  Key: ${config.sslKeyPath}`);
      console.log(`  Cert: ${config.sslCertPath}`);
    } else {
      console.log('HTTP mode (no TLS encryption)');
      console.log('To enable HTTPS, set HTTPS_ENABLED=true with SSL_KEY_PATH and SSL_CERT_PATH');
    }
  }
});

/**
 * Handle server errors.
 * Provides meaningful error messages for common server startup issues.
 */
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Error: Port ${config.port} is already in use.`);
    console.error('Please stop the other process or use a different port:');
    console.error(`  PORT=${config.port + 1} npm start`);
  } else if (error.code === 'EACCES') {
    console.error(`Error: Permission denied to bind to port ${config.port}.`);
    console.error('Ports below 1024 require elevated privileges.');
    console.error('Either run with sudo or use a port >= 1024.');
  } else {
    console.error('Server error:', error.message);
  }
  process.exit(1);
});
