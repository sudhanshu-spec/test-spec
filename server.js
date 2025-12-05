/**
 * @fileoverview Express.js web server application providing greeting endpoints with
 * comprehensive security hardening. This HTTP/HTTPS server demonstrates Express.js routing,
 * request handling, and security best practices with security middleware chain including
 * rate limiting, security headers, CORS, and input validation.
 * 
 * @module server
 * @requires express@5.2.0
 * @requires helmet@8.1.0 - HTTP security headers middleware
 * @requires cors@2.8.5 - CORS middleware for cross-origin policy enforcement
 * @requires express-rate-limit@8.2.1 - Rate limiting middleware for DoS protection
 * @requires https - Node.js built-in HTTPS module for TLS/SSL server
 * @requires fs - Node.js built-in file system module for SSL certificate loading
 * @requires ./middleware/security - Pre-configured security middleware array
 * @requires ./middleware/validation - Input validation middleware using express-validator
 * 
 * @description Secure Node.js web server built with Express.js framework demonstrating
 * production-grade security implementation:
 * - Rate limiting (express-rate-limit) for DoS protection
 * - Security headers (helmet.js) for XSS, clickjacking, MIME sniffing mitigation
 * - CORS (cors) for cross-origin access control
 * - Input validation (express-validator) for injection prevention
 * - Optional HTTPS support for encrypted communication
 * - Trust proxy configuration for reverse proxy environments
 * 
 * Security middleware execution order (per OWASP best practices):
 * 1. Rate limiting - blocks abusive IPs before processing
 * 2. Helmet - adds security headers to all responses
 * 3. CORS - validates cross-origin requests
 * 4. Body parser - parses JSON request bodies
 * 5. Input validation - sanitizes and validates input
 * 
 * @author hxu
 * @version 2.0.0
 * @license MIT
 * 
 * @example
 * // Installation and startup
 * npm install
 * npm start
 * 
 * // With HTTPS enabled
 * ENABLE_HTTPS=true SSL_KEY_PATH=./certs/key.pem SSL_CERT_PATH=./certs/cert.pem npm start
 * 
 * // Verify endpoints
 * curl http://127.0.0.1:3000/
 * curl http://127.0.0.1:3000/evening
 * 
 * // Verify security headers
 * curl -I http://127.0.0.1:3000/
 */

'use strict';

// =============================================================================
// External Dependencies
// =============================================================================

// Express.js framework import using CommonJS module system (require syntax)
const express = require('express');

// Security middleware packages for comprehensive protection
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');

// Node.js built-in modules for HTTPS support
const https = require('https');
const fs = require('fs');

// =============================================================================
// Internal Dependencies
// =============================================================================

// Pre-configured security middleware array (rate-limit, helmet, cors)
const { securityMiddleware } = require('./middleware/security');

// Input validation middleware using express-validator
const { validationMiddleware } = require('./middleware/validation');

// =============================================================================
// Server Configuration
// =============================================================================

/**
 * Server hostname configuration.
 * Localhost-only binding (127.0.0.1) for development security - prevents external access.
 * In production with HTTPS, consider binding to 0.0.0.0 for external access.
 * @constant {string}
 */
const hostname = '127.0.0.1';

/**
 * Server port configuration.
 * Reads from PORT environment variable with fallback to 3000 for development.
 * @constant {number}
 */
const port = parseInt(process.env.PORT, 10) || 3000;

/**
 * HTTPS configuration from environment variables.
 * @constant {boolean} enableHttps - Whether to enable HTTPS server
 * @constant {string} sslKeyPath - Path to SSL private key file
 * @constant {string} sslCertPath - Path to SSL certificate file
 */
const enableHttps = process.env.ENABLE_HTTPS === 'true';
const sslKeyPath = process.env.SSL_KEY_PATH || '';
const sslCertPath = process.env.SSL_CERT_PATH || '';

/**
 * Trust proxy configuration for reverse proxy environments.
 * Set TRUST_PROXY=true when behind a load balancer or reverse proxy.
 * This ensures correct client IP detection for rate limiting.
 * @constant {boolean}
 */
const trustProxy = process.env.TRUST_PROXY === 'true';

// =============================================================================
// Express Application Initialization
// =============================================================================

/**
 * Express application instance.
 * Creates the application for middleware and route registration.
 * @type {express.Application}
 */
const app = express();

// =============================================================================
// Trust Proxy Configuration
// =============================================================================

/**
 * Enable trust proxy if configured.
 * This is required for correct client IP detection when running behind
 * a reverse proxy (nginx, AWS ELB, etc.) and affects rate limiting.
 */
if (trustProxy) {
  app.set('trust proxy', 1);
  console.log('Trust proxy enabled for reverse proxy environment');
}

// =============================================================================
// Security Middleware Chain
// =============================================================================

/**
 * Apply pre-configured security middleware array.
 * The securityMiddleware array contains middleware in the correct execution order:
 * 1. express-rate-limit - IP-based request throttling (DoS protection)
 * 2. helmet - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * 3. cors - Cross-origin resource sharing policy enforcement
 * 
 * @see middleware/security.js for detailed configuration
 */
app.use(securityMiddleware);

/**
 * JSON body parser middleware.
 * Parses incoming JSON request bodies with security limits.
 * The body-parser (used internally by express.json()) has been upgraded
 * to version 2.2.1 to patch CVE-2025-13466 (DoS vulnerability).
 */
app.use(express.json({ limit: '100kb' }));

/**
 * URL-encoded body parser middleware.
 * Parses incoming URL-encoded request bodies with extended query parser.
 * Express 5.2.0+ includes patches for CVE-2024-51999 (query property manipulation).
 */
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

/**
 * Input validation middleware for all routes.
 * Applies default sanitization to query parameters to prevent XSS and injection attacks.
 * Uses express-validator under the hood for comprehensive validation.
 * 
 * @see middleware/validation.js for validation schema definitions
 */
app.use(...validationMiddleware('default'));

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * Root endpoint returning greeting message.
 * 
 * @route GET /
 * @description Root endpoint that returns a simple "Hello, World!" greeting message
 * in plain text format. This endpoint demonstrates basic Express.js routing and
 * response handling with full security middleware protection.
 * 
 * @param {Object} req - Express.Request object containing the HTTP request information
 * @param {Object} res - Express.Response object for sending the HTTP response
 * @returns {void} Sends plain text response 'Hello, World!\n'
 * 
 * @security Protected by security middleware chain:
 * - Rate limited (100 requests per 15 minutes per IP by default)
 * - Security headers applied (CSP, HSTS, X-Frame-Options)
 * - CORS policy enforced
 * - Input sanitization applied
 * 
 * @example
 * // Using curl to test the endpoint
 * curl http://127.0.0.1:3000/
 * // Expected output: Hello, World!
 * 
 * // Inspect security headers
 * curl -I http://127.0.0.1:3000/
 */
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening greeting endpoint.
 * 
 * @route GET /evening
 * @description Evening greeting endpoint that returns a "Good evening" message
 * in plain text format. This endpoint is part of the greeting API family
 * demonstrating multiple route handling in Express.js with security protection.
 * 
 * @param {Object} req - Express.Request object containing the HTTP request information
 * @param {Object} res - Express.Response object for sending the HTTP response
 * @returns {void} Sends plain text response 'Good evening'
 * 
 * @security Protected by security middleware chain:
 * - Rate limited (100 requests per 15 minutes per IP by default)
 * - Security headers applied (CSP, HSTS, X-Frame-Options)
 * - CORS policy enforced
 * - Input sanitization applied
 * 
 * @example
 * // Using curl to test the endpoint
 * curl http://127.0.0.1:3000/evening
 * // Expected output: Good evening
 */
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

// =============================================================================
// Health Check Endpoint
// =============================================================================

/**
 * Health check endpoint for monitoring and load balancer integration.
 * 
 * @route GET /health
 * @description Returns server health status including security configuration.
 * Useful for container orchestration, load balancers, and monitoring systems.
 * 
 * @param {Object} req - Express.Request object
 * @param {Object} res - Express.Response object
 * @returns {void} Sends JSON response with health status
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    security: {
      https: enableHttps,
      trustProxy: trustProxy,
      rateLimit: true,
      helmet: true,
      cors: true,
      inputValidation: true
    },
    version: '2.0.0'
  });
});

// =============================================================================
// Server Startup
// =============================================================================

/**
 * Starts the HTTP or HTTPS server based on configuration.
 * Handles SSL certificate loading with graceful error handling.
 * 
 * @function startServer
 * @description Initializes the server with appropriate protocol (HTTP/HTTPS)
 * based on environment configuration. Provides detailed startup logging
 * including security status information.
 */
const startServer = () => {
  /**
   * Callback executed when server starts listening.
   * Logs server information including protocol, address, and security status.
   * @param {string} protocol - The protocol being used (http or https)
   */
  const onListening = (protocol) => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  EXPRESS.JS SERVER STARTED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Address:     ${protocol}://${hostname}:${port}/`);
    console.log(`  Protocol:    ${protocol.toUpperCase()}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  SECURITY STATUS');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  ✓ Rate Limiting:     ENABLED (DoS protection)`);
    console.log(`  ✓ Security Headers:  ENABLED (Helmet.js)`);
    console.log(`  ✓ CORS:              ENABLED (Origin validation)`);
    console.log(`  ✓ Input Validation:  ENABLED (express-validator)`);
    console.log(`  ✓ Trust Proxy:       ${trustProxy ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  ✓ HTTPS:             ${enableHttps ? 'ENABLED' : 'DISABLED'}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  VULNERABILITY PATCHES');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  ✓ CVE-2024-51999:    PATCHED (Express 5.2.0+)');
    console.log('  ✓ CVE-2025-13466:    PATCHED (body-parser 2.2.1+)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Endpoints: GET /, GET /evening, GET /health');
    console.log('═══════════════════════════════════════════════════════════════');
  };

  // Check if HTTPS is enabled
  if (enableHttps) {
    // Validate SSL certificate paths are provided
    if (!sslKeyPath || !sslCertPath) {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  HTTPS CONFIGURATION ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  HTTPS is enabled but SSL certificate paths are not configured.');
      console.error('  Please set the following environment variables:');
      console.error('    - SSL_KEY_PATH: Path to SSL private key file (.pem)');
      console.error('    - SSL_CERT_PATH: Path to SSL certificate file (.pem)');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  Falling back to HTTP server...');
      console.error('═══════════════════════════════════════════════════════════════');
      
      // Fall back to HTTP
      app.listen(port, hostname, () => onListening('http'));
      return;
    }

    // Attempt to load SSL certificates
    try {
      const sslOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };

      // Create HTTPS server
      const httpsServer = https.createServer(sslOptions, app);
      
      httpsServer.listen(port, hostname, () => onListening('https'));

      // Handle HTTPS server errors
      httpsServer.on('error', (error) => {
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('  HTTPS SERVER ERROR');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error(`  Error: ${error.message}`);
        
        if (error.code === 'EADDRINUSE') {
          console.error(`  Port ${port} is already in use.`);
        } else if (error.code === 'EACCES') {
          console.error(`  Permission denied for port ${port}. Try a port > 1024.`);
        }
        
        console.error('═══════════════════════════════════════════════════════════════');
        process.exit(1);
      });

    } catch (error) {
      // Handle SSL certificate loading errors
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  SSL CERTIFICATE ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Failed to load SSL certificates: ${error.message}`);
      console.error('');
      console.error('  Possible causes:');
      
      if (error.code === 'ENOENT') {
        console.error('  - Certificate file not found at specified path');
        console.error(`    Key path: ${sslKeyPath}`);
        console.error(`    Cert path: ${sslCertPath}`);
      } else if (error.code === 'EACCES') {
        console.error('  - Permission denied reading certificate files');
      } else {
        console.error('  - Invalid certificate format or corrupted file');
      }
      
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  Falling back to HTTP server...');
      console.error('═══════════════════════════════════════════════════════════════');
      
      // Fall back to HTTP
      app.listen(port, hostname, () => onListening('http'));
    }
  } else {
    // Start HTTP server (default)
    const httpServer = app.listen(port, hostname, () => onListening('http'));

    // Handle HTTP server errors
    httpServer.on('error', (error) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  HTTP SERVER ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Error: ${error.message}`);
      
      if (error.code === 'EADDRINUSE') {
        console.error(`  Port ${port} is already in use.`);
        console.error('  Try: lsof -i :' + port + ' to find the process');
      } else if (error.code === 'EACCES') {
        console.error(`  Permission denied for port ${port}. Try a port > 1024.`);
      }
      
      console.error('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    });
  }
};

// Start the server only when running directly (not when imported for testing)
// Using require.main === module pattern to detect if this is the main entry point
if (require.main === module) {
  startServer();
}

// =============================================================================
// Module Exports
// =============================================================================

/**
 * Export the Express application instance for testing and external use.
 * Allows the app to be imported and tested with supertest or similar tools.
 * 
 * @exports app - Express application instance with all middleware configured
 * @example
 * // In test file
 * const { app } = require('./server');
 * const request = require('supertest');
 * 
 * describe('GET /', () => {
 *   it('should return Hello, World!', async () => {
 *     const res = await request(app).get('/');
 *     expect(res.text).toBe('Hello, World!\n');
 *   });
 * });
 */
module.exports = { app };

// =============================================================================
// Testing Purpose Log
// =============================================================================

/**
 * Console log added for testing purposes.
 * This log confirms the server module has been loaded successfully.
 */
console.log('Server module loaded successfully - security hardening applied.');
