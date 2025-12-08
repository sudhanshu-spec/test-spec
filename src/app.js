/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance with
 * a production-ready middleware stack. It separates application configuration
 * from HTTP server initialization (which remains in server.js), enabling unit
 * testing without starting the actual server.
 * 
 * Middleware Stack Order (Critical for Security and Performance):
 * 1. helmet() - Security headers first (OWASP compliance)
 * 2. cors() - Cross-Origin Resource Sharing configuration
 * 3. compression() - Gzip compression for responses
 * 4. rateLimit - Rate limiting for DoS protection
 * 5. loggerMiddleware - HTTP request logging
 * 6. express.json() - JSON body parser
 * 7. express.urlencoded() - URL-encoded body parser
 * 8. Routes (mainRoutes, healthRoutes)
 * 9. errorHandler - Centralized error handling (must be LAST)
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * Routes Mounted:
 * - GET '/' -> "Hello, World!" (mainRoutes)
 * - GET '/evening' -> "Good evening" (mainRoutes)
 * - GET '/health' -> Health check endpoints (healthRoutes)
 * - GET '/health/live' -> Liveness probe (healthRoutes)
 * - GET '/health/ready' -> Readiness probe (healthRoutes)
 * 
 * @module src/app
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { loggerMiddleware, errorHandler, securityMiddleware } = require('./middleware');
const { mainRoutes, healthRoutes } = require('./routes');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * Create Express application instance
 */
const app = express();

/**
 * Configure rate limiter middleware using application configuration values.
 * Rate limiting protects API endpoints from brute-force attacks and DoS attempts
 * by limiting the number of requests per time window.
 * 
 * Configuration:
 * - windowMs: Time window in milliseconds (default: 15 minutes)
 * - max: Maximum requests per window (default: 100)
 * - standardHeaders: Return rate limit info in RateLimit-* headers
 * - legacyHeaders: Disable X-RateLimit-* headers (deprecated)
 * 
 * @type {Function}
 */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests, please try again later.',
      status: 429
    }
  },
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded',
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: {
        message: 'Too many requests, please try again later.',
        status: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Mount middleware stack in correct order for production-ready Express application.
 * 
 * MIDDLEWARE ORDER IS CRITICAL:
 * - Security middleware first to protect all subsequent processing
 * - Compression early to reduce response size for all routes
 * - Rate limiting before request processing to prevent DoS
 * - Logger after security to avoid logging blocked requests
 * - Body parsers before routes that need request body
 * - Error handler MUST be last to catch all errors
 */

// 1. Security headers middleware (helmet)
// Sets various HTTP headers to protect against common web vulnerabilities
// Includes X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.
app.use(helmet());

// 2. CORS middleware
// Enables Cross-Origin Resource Sharing with configurable origin policy
// Allows API access from different domains based on config.cors.origin
app.use(cors({ origin: config.cors.origin }));

// 3. Response compression middleware
// Applies gzip compression to HTTP responses to reduce bandwidth and improve load times
// Compresses responses above ~1KB by default
app.use(compression());

// 4. Rate limiting middleware
// Protects endpoints from brute-force attacks and DoS by limiting requests per time window
// Uses config.rateLimit.windowMs and config.rateLimit.max for configuration
app.use(limiter);

// 5. Request logging middleware
// Logs HTTP requests with timestamp, method, URL, status, and response time
// Uses Winston logger with environment-aware formatting
app.use(loggerMiddleware);

// 6. Body parser middleware - JSON
// Parses incoming requests with JSON payloads
// Makes req.body available for JSON content-type requests
app.use(express.json());

// 7. Body parser middleware - URL-encoded
// Parses incoming requests with URL-encoded payloads (form submissions)
// extended: true allows for rich objects and arrays to be encoded
app.use(express.urlencoded({ extended: true }));

/**
 * Mount application routes
 * 
 * Route mounting order:
 * 1. Main routes at root path - preserves existing API endpoints
 * 2. Health routes at /health path - production monitoring endpoints
 */

// Mount main routes at root path
// Preserves original route paths:
// - GET '/' -> Returns "Hello, World!"
// - GET '/evening' -> Returns "Good evening"
app.use('/', mainRoutes);

// Mount health check routes for production monitoring
// Endpoints:
// - GET '/health' -> Basic health check
// - GET '/health/live' -> Liveness probe for orchestrators
// - GET '/health/ready' -> Readiness probe for orchestrators
app.use('/health', healthRoutes);

/**
 * Mount error handling middleware LAST
 * 
 * This middleware catches all errors from route handlers and other middleware.
 * It must be registered after all routes to properly catch errors.
 * Express.js 5.x automatically forwards async errors to this handler.
 */
app.use(errorHandler);

// Log successful application initialization
logger.info({
  message: 'Express application initialized',
  middleware: ['helmet', 'cors', 'compression', 'rateLimit', 'loggerMiddleware', 'json', 'urlencoded'],
  routes: ['mainRoutes', 'healthRoutes'],
  errorHandling: 'centralized'
});

module.exports = app;
