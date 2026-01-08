/**
 * Security-Hardened Express.js Server with Production-Grade Logging
 * 
 * This server implements comprehensive security hardening following OWASP guidelines
 * and Express.js security best practices, enhanced with structured logging and
 * graceful shutdown capabilities for production deployment.
 * 
 * Security Features:
 * - HTTP Security Headers via helmet.js (CSP, HSTS, X-Frame-Options, etc.)
 * - Cross-Origin Resource Sharing (CORS) policy configuration
 * - Rate limiting to protect against brute-force and DoS attacks
 * - Input validation middleware using Joi schemas
 * - HTTPS/TLS support for encrypted communications
 * - Request body parsing with size limits
 * 
 * Production Features:
 * - Structured JSON logging via Pino for log aggregation
 * - Request ID correlation for distributed tracing
 * - Graceful shutdown handling for zero-downtime deployments
 * - Modular routing architecture for scalable endpoint management
 * - Health check endpoints for load balancer integration
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
 * - LOG_LEVEL: Logging verbosity (trace, debug, info, warn, error, fatal)
 * - SHUTDOWN_TIMEOUT: Graceful shutdown timeout in milliseconds (default: 10000)
 * 
 * @module server
 * @see https://expressjs.com/en/advanced/best-practice-security.html
 * @see https://getpino.io/
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

/**
 * Pino logger factory for structured logging
 * Creates production-grade JSON logger with request correlation
 * @see ./config/logger.js
 */
const { createLogger } = require('./config/logger');

/**
 * Modular route configuration
 * Provides health endpoints (/health, /ready) and API routes
 * @see ./routes/index.js
 */
const { configureRoutes } = require('./routes');

// =============================================================================
// LOGGER INITIALIZATION
// =============================================================================

/**
 * Application logger instance
 * 
 * Initialized early to capture all application events including startup,
 * errors, and shutdown. Uses structured JSON format for log aggregation
 * compatibility (ELK, CloudWatch, Datadog).
 * 
 * @type {import('pino').Logger}
 */
const logger = createLogger({ name: 'express-server' });

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

/**
 * Graceful shutdown timeout in milliseconds
 * Maximum time to wait for active connections to close before forcing shutdown
 * @type {number}
 */
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT, 10) || 10000;

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
// MODULAR ROUTE CONFIGURATION
// =============================================================================
// Routes are organized in separate modules for maintainability:
// - routes/health.js: Health check endpoints (/health, /ready)
// - routes/api.js: Application API endpoints (/, /evening, /data)
// - routes/index.js: Route aggregator with 404 handler
// =============================================================================

/**
 * Configure modular routes
 * 
 * Applies all route modules to the Express application:
 * 1. Health routes (GET /health, GET /ready) for operational monitoring
 * 2. API routes (GET /, GET /evening, GET /data) for application logic
 * 3. 404 handler for undefined routes
 * 
 * Routes are mounted at root level for simplicity.
 * For larger applications, consider prefixing API routes with '/api'.
 */
configureRoutes(app);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

/**
 * Global error handler
 * 
 * Catches all errors and returns a consistent JSON error response.
 * In production, error details are hidden to prevent information disclosure.
 * In development, full error stack is included for debugging.
 * 
 * Error logging includes:
 * - Request ID for correlation (if available from request logger)
 * - Error message and stack trace
 * - HTTP method and path
 * - Timestamp for troubleshooting
 * 
 * @param {Error} err - The error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
app.use((err, req, res, next) => {
  // Determine status code from error or default to 500
  const statusCode = err.statusCode || err.status || 500;
  
  // Log error with structured data for debugging and monitoring
  // Include request ID from request logger middleware if available
  const errorLogData = {
    err: {
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: statusCode
    },
    req: {
      id: req.id,
      method: req.method,
      path: req.path,
      url: req.url,
      ip: req.ip || req.socket?.remoteAddress
    }
  };
  
  // Log at appropriate level based on status code
  if (statusCode >= 500) {
    logger.error(errorLogData, `Server error: ${err.message}`);
  } else if (statusCode >= 400) {
    logger.warn(errorLogData, `Client error: ${err.message}`);
  } else {
    logger.info(errorLogData, `Error handled: ${err.message}`);
  }

  // Build error response
  const errorResponse = {
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: isProduction ? 'An unexpected error occurred' : err.message,
    timestamp: new Date().toISOString()
  };

  // Include request ID for correlation if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  // Include stack trace in development mode only
  if (!isProduction) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

// =============================================================================
// SERVER REFERENCES
// =============================================================================

/**
 * HTTP server instance reference
 * Used for graceful shutdown
 * @type {import('http').Server|null}
 */
let httpServer = null;

/**
 * HTTPS server instance reference
 * Used for graceful shutdown
 * @type {import('https').Server|null}
 */
let httpsServer = null;

// =============================================================================
// GRACEFUL SHUTDOWN HANDLING
// =============================================================================

/**
 * Graceful Shutdown Handler
 * 
 * Implements clean process termination for zero-downtime deployments.
 * This handler is triggered by SIGTERM (PM2, Docker, Kubernetes) and
 * SIGINT (Ctrl+C, manual termination) signals.
 * 
 * Shutdown sequence:
 * 1. Log shutdown initiation
 * 2. Stop accepting new connections
 * 3. Wait for active connections to complete
 * 4. Close HTTP and HTTPS servers
 * 5. Exit with appropriate code
 * 
 * If connections don't close within SHUTDOWN_TIMEOUT, force exit.
 * 
 * @param {string} signal - The signal that triggered shutdown (SIGTERM, SIGINT)
 */
function gracefulShutdown(signal) {
  logger.info({ signal, pid: process.pid }, `Received ${signal}, initiating graceful shutdown`);
  
  // Track shutdown state
  let httpClosed = !httpServer; // True if no HTTP server
  let httpsClosed = !httpsServer; // True if no HTTPS server
  
  /**
   * Complete shutdown after all servers are closed
   */
  const completeShutdown = () => {
    if (httpClosed && httpsClosed) {
      logger.info({ 
        signal, 
        pid: process.pid,
        uptime: process.uptime()
      }, 'All servers closed, shutdown complete');
      process.exit(0);
    }
  };
  
  /**
   * Force shutdown after timeout
   */
  const forceShutdown = () => {
    logger.warn({ 
      signal, 
      timeout: SHUTDOWN_TIMEOUT,
      pid: process.pid 
    }, 'Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  };
  
  // Set force shutdown timeout
  const shutdownTimer = setTimeout(forceShutdown, SHUTDOWN_TIMEOUT);
  shutdownTimer.unref(); // Don't keep process alive just for timer
  
  // Close HTTP server if running
  if (httpServer) {
    logger.info('Closing HTTP server...');
    httpServer.close((err) => {
      if (err) {
        logger.error({ err }, 'Error closing HTTP server');
      } else {
        logger.info('HTTP server closed successfully');
      }
      httpClosed = true;
      completeShutdown();
    });
  }
  
  // Close HTTPS server if running
  if (httpsServer) {
    logger.info('Closing HTTPS server...');
    httpsServer.close((err) => {
      if (err) {
        logger.error({ err }, 'Error closing HTTPS server');
      } else {
        logger.info('HTTPS server closed successfully');
      }
      httpsClosed = true;
      completeShutdown();
    });
  }
  
  // If no servers were running, complete immediately
  completeShutdown();
}

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

/**
 * Start the HTTP server
 * 
 * Binds to configured hostname and port.
 * Logs server URL and security status on successful start.
 * 
 * Only starts when this file is run directly (not when imported for testing).
 * This prevents Jest from hanging due to open handles.
 */
if (require.main === module) {
  httpServer = app.listen(port, hostname, () => {
    logger.info({
      protocol: 'HTTP',
      hostname,
      port,
      pid: process.pid,
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development'
    }, `HTTP server running at http://${hostname}:${port}/`);
    
    logger.info({
      security: {
        helmet: 'ENABLED',
        cors: 'ENABLED',
        rateLimiting: 'ENABLED',
        bodyParsing: 'ENABLED (10kb limit)'
      }
    }, 'Security middleware stack initialized');
  });
  
  // Register shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception, shutting down');
    gracefulShutdown('uncaughtException');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
  });
}

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
 * 
 * Only starts when this file is run directly (not when imported for testing).
 */
if (require.main === module && HTTPS_ENABLED) {
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
    httpsServer = https.createServer(httpsOptions, app).listen(HTTPS_PORT, hostname, () => {
      logger.info({
        protocol: 'HTTPS',
        hostname,
        port: HTTPS_PORT,
        pid: process.pid,
        tlsVersion: 'TLSv1.2 - TLSv1.3',
        keyPath,
        certPath
      }, `HTTPS server running at https://${hostname}:${HTTPS_PORT}/`);
    });

  } catch (error) {
    // Log certificate loading error and continue with HTTP-only
    logger.warn({
      err: error,
      keyPath: path.resolve(SSL_KEY_PATH),
      certPath: path.resolve(SSL_CERT_PATH)
    }, 'Failed to start HTTPS server, continuing with HTTP only');
    
    logger.info('To enable HTTPS, ensure SSL certificates are available at the configured paths');
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
