/**
 * Security-Hardened Express.js Server
 * 
 * This server implements comprehensive security hardening following OWASP guidelines
 * and Express.js security best practices. Security features include:
 * 
 * - HTTP Security Headers via helmet.js (CSP, HSTS, X-Frame-Options, etc.)
 * - Cross-Origin Resource Sharing (CORS) policy configuration
 * - Rate limiting to protect against brute-force and DoS attacks
 * - Input validation middleware using Joi schemas
 * - HTTPS/TLS support for encrypted communications
 * - Request body parsing with size limits
 * 
 * Environment Variables:
 * - NODE_ENV: Environment mode ('development' or 'production')
 * - HTTPS_ENABLED: Enable HTTPS server ('true' to enable)
 * - HTTPS_PORT: HTTPS server port (default: 3443)
 * - SSL_KEY_PATH: Path to SSL private key file (default: './certs/key.pem')
 * - SSL_CERT_PATH: Path to SSL certificate file (default: './certs/cert.pem')
 * - ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins
 * - RATE_LIMIT_WINDOW_MS: Rate limit time window in milliseconds
 * - RATE_LIMIT_MAX: Maximum requests per window per IP
 * 
 * @module server
 * @see https://expressjs.com/en/advanced/best-practice-security.html
 */

'use strict';

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

/**
 * Express.js web application framework
 * @see https://expressjs.com/
 */
const express = require('express');

/**
 * helmet.js - HTTP security headers middleware
 * Sets 15+ security headers including CSP, HSTS, X-Frame-Options
 * Also removes X-Powered-By header to reduce information disclosure
 * @see https://helmetjs.github.io/
 */
const helmet = require('helmet');

/**
 * CORS middleware for cross-origin resource sharing control
 * @see https://github.com/expressjs/cors
 */
const cors = require('cors');

/**
 * Express rate limiting middleware for brute-force and DoS protection
 * @see https://www.npmjs.com/package/express-rate-limit
 */
const { rateLimit } = require('express-rate-limit');

/**
 * Joi schema validation library for input validation
 * @see https://joi.dev/
 */
const Joi = require('joi');

/**
 * Node.js built-in HTTPS module for TLS/SSL server
 * @see https://nodejs.org/api/https.html
 */
const https = require('https');

/**
 * Node.js built-in file system module for certificate loading
 * @see https://nodejs.org/api/fs.html
 */
const fs = require('fs');

/**
 * Node.js built-in path module for resolving certificate paths
 * @see https://nodejs.org/api/path.html
 */
const path = require('path');

// =============================================================================
// INTERNAL CONFIGURATION IMPORTS
// =============================================================================

/**
 * Helmet security headers configuration
 * Contains CSP, HSTS, X-Frame-Options, and other security header settings
 */
const helmetConfig = require('./config/helmet');

/**
 * CORS policy configuration
 * Contains origin whitelist, allowed methods, headers, and credentials settings
 */
const corsOptions = require('./config/cors');

/**
 * Pre-configured rate limiter middleware
 * Protects against brute-force attacks and DoS attempts
 */
const rateLimiter = require('./middleware/rateLimiter');

/**
 * Joi-based input validation middleware factory
 * Creates middleware to validate request body, query, and params
 */
const { validate } = require('./middleware/validation');

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

/**
 * HTTP server hostname binding
 * Using 127.0.0.1 limits exposure to localhost only
 * Change to '0.0.0.0' to allow external connections (requires proper firewall rules)
 * @type {string}
 */
const hostname = '127.0.0.1';

/**
 * HTTP server port
 * @type {number}
 */
const port = 3000;

/**
 * HTTPS server enable flag
 * Set HTTPS_ENABLED=true in environment to enable HTTPS server
 * @type {boolean}
 */
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true';

/**
 * HTTPS server port
 * Default port 3443 for HTTPS (standard alternative HTTPS port)
 * @type {number}
 */
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT, 10) || 3443;

/**
 * Path to SSL private key file
 * Required when HTTPS_ENABLED is true
 * @type {string}
 */
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './certs/key.pem';

/**
 * Path to SSL certificate file
 * Required when HTTPS_ENABLED is true
 * @type {string}
 */
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './certs/cert.pem';

/**
 * Current environment mode
 * @type {boolean}
 */
const isProduction = process.env.NODE_ENV === 'production';

// =============================================================================
// EXPRESS APPLICATION INITIALIZATION
// =============================================================================

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();

// =============================================================================
// SECURITY MIDDLEWARE CHAIN
// =============================================================================
// Middleware is applied in a specific order for optimal security:
// 1. Security headers (helmet) - First to ensure all responses have headers
// 2. CORS - Early to handle preflight requests
// 3. Rate limiting - Before processing to protect against abuse
// 4. Body parsing - After rate limiting to prevent large payload attacks
// =============================================================================

/**
 * Apply helmet.js security headers middleware
 * 
 * This must be the FIRST middleware in the chain to ensure all responses
 * include security headers, including error responses.
 * 
 * Headers set include:
 * - Content-Security-Policy: Prevents XSS and data injection
 * - Strict-Transport-Security: Enforces HTTPS (when enabled)
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - X-XSS-Protection: Legacy XSS filter (deprecated but still useful for older browsers)
 * - Referrer-Policy: Controls referrer information
 * 
 * Also removes X-Powered-By header to reduce information disclosure
 */
app.use(helmet(helmetConfig));

/**
 * Apply CORS middleware
 * 
 * Controls cross-origin resource sharing to prevent unauthorized
 * cross-origin data access. Configuration includes:
 * - Origin whitelist from ALLOWED_ORIGINS environment variable
 * - Allowed HTTP methods (GET, POST, PUT, DELETE)
 * - Allowed headers (Content-Type, Authorization)
 * - Credentials support enabled
 * 
 * Defaults to blocking all cross-origin requests if ALLOWED_ORIGINS not set
 */
app.use(cors(corsOptions));

/**
 * Apply rate limiting middleware
 * 
 * Protects against brute-force attacks and denial-of-service attempts
 * by limiting requests per IP address within a configurable time window.
 * 
 * Default configuration:
 * - Window: 15 minutes (RATE_LIMIT_WINDOW_MS)
 * - Limit: 100 requests per window per IP (RATE_LIMIT_MAX)
 * 
 * Returns 429 Too Many Requests when limit is exceeded
 */
app.use(rateLimiter);

/**
 * JSON body parser middleware
 * 
 * Parses incoming JSON payloads with security considerations:
 * - limit: 10kb maximum body size to prevent large payload attacks
 * - strict: true to only accept arrays and objects (no primitives)
 * 
 * Required for input validation on POST/PUT/PATCH endpoints
 */
app.use(express.json({ 
  limit: '10kb',
  strict: true 
}));

/**
 * URL-encoded body parser middleware
 * 
 * Parses incoming form data with security considerations:
 * - extended: true enables rich object and array encoding (qs library)
 * - limit: 10kb maximum body size to prevent large payload attacks
 * - parameterLimit: 100 maximum number of parameters to prevent DoS
 * 
 * Required for form submissions
 */
app.use(express.urlencoded({ 
  extended: true,
  limit: '10kb',
  parameterLimit: 100
}));

// =============================================================================
// ROUTE HANDLERS
// =============================================================================
// Existing routes are preserved with unchanged functionality
// Future routes can use validate() middleware for input validation
// =============================================================================

/**
 * GET / - Home route
 * 
 * Returns a simple greeting message.
 * Functionality preserved from original implementation.
 * 
 * @route GET /
 * @returns {string} Hello, World!\n
 * @example
 * curl http://localhost:3000/
 * // Response: Hello, World!
 */
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * GET /evening - Evening greeting route
 * 
 * Returns an evening greeting message.
 * Functionality preserved from original implementation.
 * 
 * @route GET /evening
 * @returns {string} Good evening
 * @example
 * curl http://localhost:3000/evening
 * // Response: Good evening
 */
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

/**
 * 404 Not Found handler
 * 
 * Catches all unmatched routes and returns a consistent JSON error response.
 * Placed after all route definitions.
 */
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource ${req.path} was not found on this server`,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

/**
 * Global error handler
 * 
 * Catches all errors and returns a consistent JSON error response.
 * In production, error details are hidden to prevent information disclosure.
 * In development, full error stack is included for debugging.
 * 
 * @param {Error} err - The error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
app.use((err, req, res, next) => {
  // Log error for monitoring (can be enhanced with logging framework)
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);
  console.error(err.stack);

  // Determine status code from error or default to 500
  const statusCode = err.statusCode || err.status || 500;

  // Build error response
  const errorResponse = {
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: isProduction ? 'An unexpected error occurred' : err.message,
    timestamp: new Date().toISOString()
  };

  // Include stack trace in development mode only
  if (!isProduction) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

/**
 * Start the HTTP server
 * 
 * Binds to configured hostname and port.
 * Logs server URL and security status on successful start.
 */
app.listen(port, hostname, () => {
  console.log(`[HTTP] Server running at http://${hostname}:${port}/`);
  console.log(`[SECURITY] Helmet security headers: ENABLED`);
  console.log(`[SECURITY] CORS protection: ENABLED`);
  console.log(`[SECURITY] Rate limiting: ENABLED`);
  console.log(`[SECURITY] Body parsing with limits: ENABLED`);
});

/**
 * Start the HTTPS server (conditional)
 * 
 * Creates an HTTPS server when HTTPS_ENABLED environment variable is 'true'.
 * Requires valid SSL certificate and private key files at configured paths.
 * 
 * TLS Configuration:
 * - Minimum TLS version: 1.2 (TLS 1.0 and 1.1 are deprecated)
 * - Maximum TLS version: 1.3 (latest secure protocol)
 * 
 * Graceful degradation: If certificates cannot be loaded, logs warning
 * and continues with HTTP-only operation.
 */
if (HTTPS_ENABLED) {
  try {
    // Resolve certificate paths relative to application root
    const keyPath = path.resolve(SSL_KEY_PATH);
    const certPath = path.resolve(SSL_CERT_PATH);

    // Verify certificate files exist before attempting to load
    if (!fs.existsSync(keyPath)) {
      throw new Error(`SSL private key not found at: ${keyPath}`);
    }
    if (!fs.existsSync(certPath)) {
      throw new Error(`SSL certificate not found at: ${certPath}`);
    }

    // Load SSL certificates synchronously at startup
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      // Enforce minimum TLS 1.2 - TLS 1.0/1.1 are deprecated and insecure
      minVersion: 'TLSv1.2',
      // Allow TLS 1.3 for best security with modern clients
      maxVersion: 'TLSv1.3'
    };

    // Create and start HTTPS server
    https.createServer(httpsOptions, app).listen(HTTPS_PORT, hostname, () => {
      console.log(`[HTTPS] Secure server running at https://${hostname}:${HTTPS_PORT}/`);
      console.log(`[HTTPS] TLS version range: TLSv1.2 - TLSv1.3`);
    });

  } catch (error) {
    // Log certificate loading error and continue with HTTP-only
    console.warn(`[HTTPS] Failed to start HTTPS server: ${error.message}`);
    console.warn(`[HTTPS] Application continues with HTTP only`);
    console.warn(`[HTTPS] To enable HTTPS, ensure SSL certificates are available at:`);
    console.warn(`[HTTPS]   Key: ${path.resolve(SSL_KEY_PATH)}`);
    console.warn(`[HTTPS]   Cert: ${path.resolve(SSL_CERT_PATH)}`);
  }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Export the Express application instance for testing and external use
 * 
 * The app object exposes standard Express methods:
 * - app.get(): Register GET route handlers
 * - app.post(): Register POST route handlers
 * - app.put(): Register PUT route handlers
 * - app.delete(): Register DELETE route handlers
 * - app.use(): Register middleware
 * - app.listen(): Start server on specified port
 * 
 * @type {express.Application}
 */
module.exports = app;
