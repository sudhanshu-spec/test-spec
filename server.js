/**
 * Express Server with Comprehensive Security Middleware
 * 
 * This module creates and configures an Express.js application with a complete
 * security middleware chain including:
 * - Helmet.js for HTTP security headers (XSS, clickjacking, MIME sniffing protection)
 * - CORS middleware for cross-origin access control
 * - Rate limiting for DoS and brute force protection
 * - HTTPS server support for encrypted communication
 * - Production-safe error handling
 * 
 * Middleware Order (per security best practices):
 * Helmet → CORS → Rate Limiter → Body Parser → Routes → Error Handler
 * 
 * Environment Variables:
 * - NODE_ENV: 'production' or 'development' (affects security strictness)
 * - PORT: HTTP server port (default: 3000)
 * - HTTPS_PORT: HTTPS server port (default: 443)
 * - SSL_KEY_PATH: Path to SSL private key file
 * - SSL_CERT_PATH: Path to SSL certificate file
 * - ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins
 * - RATE_LIMIT_WINDOW_MS: Rate limit window in milliseconds
 * - RATE_LIMIT_MAX_REQUESTS: Maximum requests per window per IP
 * 
 * @module server
 */

'use strict';

// =============================================================================
// External Dependencies - Security Middleware
// =============================================================================

/**
 * Express.js web application framework
 */
const express = require('express');

/**
 * Helmet.js - HTTP security headers middleware
 * Sets Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
 * and removes X-Powered-By header to protect against XSS, clickjacking,
 * and MIME sniffing attacks
 */
const helmet = require('helmet');

/**
 * CORS middleware - Cross-Origin Resource Sharing policy enforcement
 * Controls which domains can access the API with explicit origin whitelisting
 */
const cors = require('cors');

/**
 * Rate limiting middleware - Request throttling for DoS protection
 * Limits repeated requests from the same IP address to prevent
 * brute force attacks, API abuse, and denial-of-service attempts
 */
const rateLimit = require('express-rate-limit');

/**
 * Node.js built-in HTTPS module
 * Creates secure TLS/SSL encrypted server for HTTPS connections
 * Protects against man-in-the-middle attacks
 */
const https = require('https');

/**
 * Node.js built-in file system module
 * Used for reading SSL certificate and private key files
 */
const fs = require('fs');

// =============================================================================
// Internal Configuration Modules
// =============================================================================

/**
 * Helmet.js security configuration
 * Provides options for Content-Security-Policy, X-Frame-Options,
 * and other HTTP security headers
 */
const securityConfig = require('./config/security');

/**
 * CORS policy configuration
 * Provides explicit origin whitelisting, allowed methods,
 * and credentials support settings
 */
const corsConfig = require('./config/cors');

/**
 * Rate limiting configuration
 * Provides window duration, max requests per IP,
 * and response settings for rate-limited requests
 */
const rateLimitConfig = require('./config/rate-limit');

/**
 * Production-safe error handling middleware
 * Sanitizes error responses to prevent information disclosure
 * and provides appropriate error categorization
 */
const errorHandler = require('./middleware/errorHandler');

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Determines if the application is running in production mode
 * @type {boolean}
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Server hostname - Use '0.0.0.0' in production for all interfaces
 * @type {string}
 */
const hostname = isProduction ? '0.0.0.0' : '127.0.0.1';

/**
 * HTTP server port from environment variable or default
 * @type {number}
 */
const port = parseInt(process.env.PORT, 10) || 3000;

/**
 * HTTPS server port from environment variable or default
 * @type {number}
 */
const httpsPort = parseInt(process.env.HTTPS_PORT, 10) || 443;

/**
 * Path to SSL private key file
 * @type {string|undefined}
 */
const sslKeyPath = process.env.SSL_KEY_PATH;

/**
 * Path to SSL certificate file
 * @type {string|undefined}
 */
const sslCertPath = process.env.SSL_CERT_PATH;

// =============================================================================
// Express Application Setup
// =============================================================================

/**
 * Express application instance
 * Exported for testing and potential programmatic usage
 * @type {express.Application}
 */
const app = express();

// =============================================================================
// Security Middleware Chain
// =============================================================================
// Middleware is registered in the recommended security order:
// 1. Helmet (Security Headers) - First to protect all responses
// 2. CORS - Checked before processing to reject unauthorized origins early
// 3. Rate Limiter - Applied before expensive operations
// 4. Body Parser - Parses request bodies for validation and route handlers
// =============================================================================

/**
 * Security Headers Middleware (Helmet.js)
 * 
 * Sets 15+ HTTP security headers including:
 * - Content-Security-Policy: Controls resource loading to prevent XSS
 * - X-Frame-Options: Prevents clickjacking via iframe embedding
 * - X-Content-Type-Options: Prevents MIME type sniffing
 * - Strict-Transport-Security: Enforces HTTPS connections
 * - X-Powered-By: Removed to prevent fingerprinting
 * 
 * Must be applied first so all responses include security headers
 */
app.use(helmet(securityConfig));

/**
 * CORS Middleware
 * 
 * Enforces Cross-Origin Resource Sharing policy:
 * - Validates request origins against whitelist
 * - Restricts allowed HTTP methods
 * - Controls which headers can be sent/received
 * - Handles preflight OPTIONS requests
 * 
 * Applied early to reject unauthorized cross-origin requests
 * before processing
 */
app.use(cors(corsConfig));

/**
 * Rate Limiting Middleware
 * 
 * Protects against:
 * - Brute force attacks on authentication endpoints
 * - API abuse from automated scripts
 * - Denial-of-service attempts
 * 
 * Limits requests per IP within configurable time windows
 * Returns 429 Too Many Requests when limit exceeded
 */
app.use(rateLimit(rateLimitConfig));

/**
 * Body Parser Middleware
 * 
 * Parses incoming JSON request bodies with:
 * - Size limit of 10kb to prevent payload-based attacks
 * - Automatic rejection of oversized payloads
 * 
 * Placed after rate limiting so expensive parsing only
 * happens for non-rate-limited requests
 */
app.use(express.json({ limit: '10kb' }));

/**
 * URL-encoded body parser
 * 
 * Parses URL-encoded form data with:
 * - Size limit to prevent DoS via large payloads
 * - Extended mode for rich objects and arrays
 */
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// =============================================================================
// Application Routes
// =============================================================================
// Routes are defined after all security middleware to ensure
// all requests are protected regardless of which route handles them
// =============================================================================

/**
 * Root endpoint
 * Returns a simple greeting message
 * 
 * @route GET /
 * @returns {string} Hello, World! greeting
 */
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening greeting endpoint
 * Returns an evening-specific greeting message
 * 
 * @route GET /evening
 * @returns {string} Good evening greeting
 */
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

/**
 * Health check endpoint
 * Returns the health status of the server
 * Used for load balancer health checks and monitoring
 * 
 * @route GET /health
 * @returns {Object} JSON object with status property
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// =============================================================================
// 404 Handler for Unmatched Routes
// =============================================================================
// This middleware catches all requests that don't match any route
// and converts them to 404 errors for proper JSON error response
// Must be placed after all routes but before the error handler
// =============================================================================

/**
 * 404 Not Found Handler
 * Catches requests that don't match any defined route and
 * creates a 404 error to be handled by the error handler middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  error.name = 'NotFoundError';
  next(error);
});

// =============================================================================
// Error Handling Middleware
// =============================================================================
// Error handler MUST be registered last in the middleware chain
// to catch errors from all previous middleware and route handlers
// =============================================================================

/**
 * Production-Safe Error Handler
 * 
 * Catches all errors and returns sanitized responses:
 * - Production: Generic messages without sensitive details
 * - Development: Full error details with stack traces
 * 
 * Prevents information disclosure through error messages
 * Logs errors for security monitoring
 */
app.use(errorHandler);

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * Checks if SSL certificates are configured and accessible
 * 
 * @returns {boolean} True if both SSL key and certificate paths are configured and files exist
 */
function isHttpsConfigured() {
  if (!sslKeyPath || !sslCertPath) {
    return false;
  }
  
  try {
    // Check if certificate files exist and are readable
    fs.accessSync(sslKeyPath, fs.constants.R_OK);
    fs.accessSync(sslCertPath, fs.constants.R_OK);
    return true;
  } catch (error) {
    // Certificates not accessible - log warning but don't fail
    console.warn(
      `[HTTPS] SSL certificates not accessible: ${error.message}. ` +
      'HTTPS server will not be started. HTTP server will continue to run.'
    );
    return false;
  }
}

/**
 * Creates and starts the HTTPS server if certificates are configured
 * 
 * @returns {https.Server|null} HTTPS server instance or null if not configured
 */
function createHttpsServer() {
  if (!isHttpsConfigured()) {
    return null;
  }
  
  try {
    // Read SSL certificate and private key files
    const httpsOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };
    
    // Create HTTPS server with the Express app
    const httpsServer = https.createServer(httpsOptions, app);
    
    // Start HTTPS server
    httpsServer.listen(httpsPort, hostname, () => {
      console.log(
        `[HTTPS] Secure server running at https://${hostname}:${httpsPort}/`
      );
    });
    
    // Handle HTTPS server errors
    httpsServer.on('error', (error) => {
      console.error(`[HTTPS] Server error: ${error.message}`);
    });
    
    return httpsServer;
  } catch (error) {
    console.error(`[HTTPS] Failed to create HTTPS server: ${error.message}`);
    return null;
  }
}

/**
 * Start HTTP server
 * Always starts regardless of HTTPS configuration to ensure the app is accessible
 */
const httpServer = app.listen(port, hostname, () => {
  const environment = isProduction ? 'production' : 'development';
  console.log(`[HTTP] Server running at http://${hostname}:${port}/`);
  console.log(`[INFO] Environment: ${environment}`);
  console.log('[INFO] Security middleware enabled: Helmet, CORS, Rate Limiting');
});

/**
 * HTTP server error handler
 */
httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[HTTP] Port ${port} is already in use`);
  } else {
    console.error(`[HTTP] Server error: ${error.message}`);
  }
  process.exit(1);
});

/**
 * Start HTTPS server if certificates are configured
 * HTTPS is optional - the application will work over HTTP if certificates
 * are not provided, but HTTPS is recommended for production deployments
 */
const httpsServer = createHttpsServer();

// =============================================================================
// Graceful Shutdown Handler
// =============================================================================

/**
 * Handles graceful shutdown of HTTP and HTTPS servers
 * Ensures all active connections are properly closed before exiting
 * 
 * @param {string} signal - The signal that triggered the shutdown
 */
function gracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] ${signal} received. Shutting down gracefully...`);
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('[SHUTDOWN] HTTP server closed');
  });
  
  // Close HTTPS server if running
  if (httpsServer) {
    httpsServer.close(() => {
      console.log('[SHUTDOWN] HTTPS server closed');
    });
  }
  
  // Allow some time for connections to close before forcing exit
  setTimeout(() => {
    console.log('[SHUTDOWN] Forcing shutdown after timeout');
    process.exit(0);
  }, 10000);
}

// Register shutdown handlers for common termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// Module Exports
// =============================================================================

/**
 * Export the Express application instance
 * 
 * This allows:
 * - Integration testing with supertest or similar libraries
 * - Programmatic server control in test environments
 * - Mounting as a sub-application in larger systems
 * 
 * Exported properties and methods:
 * - use: Register middleware
 * - get: Define GET route handlers
 * - post: Define POST route handlers
 * - listen: Start server on specified port
 * 
 * @example
 * const { app } = require('./server');
 * // Use in tests
 * const request = require('supertest');
 * const response = await request(app).get('/');
 */
module.exports = { app };
