/**
 * Centralized Security Middleware Module
 * 
 * This module consolidates and exports all security middleware components for the
 * Express.js application. It provides a unified interface for security middleware
 * including HTTP request logging, security headers (helmet), CORS policy enforcement,
 * and rate limiting.
 * 
 * Security Features Provided:
 * - Request Logging: Via pino-http middleware with request ID correlation and response time tracking
 * - HTTP Security Headers: Via helmet middleware (Content-Security-Policy, HSTS, X-Frame-Options, etc.)
 * - CORS Policy Enforcement: Via cors middleware with environment-based origin whitelisting
 * - Rate Limiting: Via express-rate-limit to protect against DoS and brute-force attacks
 * 
 * Defense-in-Depth Strategy:
 * This module implements defense-in-depth by layering multiple security controls:
 * 1. Request Logger FIRST - Log all requests before any processing for full visibility
 * 2. Helmet SECOND - Security headers on ALL responses before any processing
 * 3. CORS THIRD - Cross-origin policy enforcement before request handling
 * 4. Rate Limiting FOURTH - Request throttling before expensive operations
 * 
 * Usage Options:
 * 
 * Option 1: Individual middleware imports
 * ```javascript
 * const { helmetMiddleware, corsMiddleware, rateLimiter, createRequestLogger } = require('./middleware/security');
 * const logger = require('./config/logger').createLogger();
 * app.use(createRequestLogger(logger));
 * app.use(helmetMiddleware);
 * app.use(corsMiddleware);
 * app.use(rateLimiter);
 * ```
 * 
 * Option 2: One-liner security setup
 * ```javascript
 * const { applySecurityMiddleware } = require('./middleware/security');
 * const logger = require('./config/logger').createLogger();
 * applySecurityMiddleware(app, { logger });
 * ```
 * 
 * Option 3: Access configurations for customization
 * ```javascript
 * const { helmetConfig, corsOptions } = require('./middleware/security');
 * // Customize as needed...
 * ```
 * 
 * @module middleware/security
 * @see https://helmetjs.github.io/
 * @see https://github.com/expressjs/cors
 * @see https://www.npmjs.com/package/express-rate-limit
 * @see https://github.com/pinojs/pino-http
 */

'use strict';

// ============================================================================
// External Dependencies
// ============================================================================

/**
 * Helmet middleware for HTTP security headers.
 * Sets 15+ security headers including Content-Security-Policy, HSTS,
 * X-Frame-Options, X-Content-Type-Options, and removes X-Powered-By.
 * 
 * @see https://helmetjs.github.io/
 */
const helmet = require('helmet');

/**
 * CORS middleware for Cross-Origin Resource Sharing policy enforcement.
 * Enables origin whitelisting, allowed methods configuration, and credential handling.
 * 
 * @see https://github.com/expressjs/cors
 */
const cors = require('cors');

// ============================================================================
// Internal Dependencies
// ============================================================================

/**
 * Pre-configured rate limiter middleware.
 * Protects against brute-force attacks and DoS attempts by throttling
 * requests per IP address within configurable time windows.
 * 
 * @see middleware/rateLimiter.js
 */
const rateLimiter = require('./rateLimiter');

/**
 * Factory function for creating HTTP request logging middleware.
 * Creates pino-http based middleware with request ID generation,
 * response time tracking, and status-based log levels.
 * 
 * @see middleware/requestLogger.js
 */
const { createRequestLogger } = require('./requestLogger');

/**
 * Helmet security headers configuration object.
 * Contains Content-Security-Policy directives, HSTS settings, X-Frame-Options,
 * X-Content-Type-Options, Referrer-Policy, and other security header configurations
 * following OWASP Secure Headers Project guidelines.
 * 
 * Members exposed:
 * - contentSecurityPolicy: CSP directives for XSS/injection prevention
 * - hsts: HTTP Strict Transport Security configuration
 * - xFrameOptions: Clickjacking protection configuration
 * - xContentTypeOptions: MIME sniffing prevention (boolean)
 * - referrerPolicy: Referrer information control
 * - crossOriginEmbedderPolicy: Cross-origin resource loading control
 * 
 * @see config/helmet.js
 */
const helmetConfig = require('../config/helmet');

/**
 * CORS policy configuration object.
 * Contains origin whitelist, allowed HTTP methods, permitted headers,
 * and credentials handling settings for cross-origin request control.
 * 
 * Members exposed:
 * - origin: Allowed origin(s) parsed from ALLOWED_ORIGINS env var
 * - methods: Allowed HTTP methods array (GET, POST, PUT, DELETE)
 * - allowedHeaders: Permitted request headers (Content-Type, Authorization)
 * - credentials: Whether to include credentials (cookies, auth headers)
 * - optionsSuccessStatus: Status code for successful OPTIONS preflight
 * 
 * @see config/cors.js
 */
const corsOptions = require('../config/cors');

// ============================================================================
// Configured Middleware Instances
// ============================================================================

/**
 * Pre-configured helmet middleware instance.
 * 
 * This middleware sets the following security headers on all responses:
 * - Content-Security-Policy: Prevents XSS and code injection attacks
 * - Strict-Transport-Security: Enforces HTTPS connections
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME-type sniffing
 * - Referrer-Policy: Controls referrer information leakage
 * - Cross-Origin-Opener-Policy: Isolates browsing context
 * - Cross-Origin-Resource-Policy: Controls resource access from other origins
 * - X-DNS-Prefetch-Control: Disables DNS prefetching for privacy
 * - X-Download-Options: Prevents IE from executing downloads in site context
 * - X-Permitted-Cross-Domain-Policies: Controls Adobe plugin access
 * 
 * Additionally, helmet automatically removes the X-Powered-By header
 * to prevent information disclosure about the technology stack.
 * 
 * MIDDLEWARE CHAIN ORDER: Helmet should be SECOND in the middleware chain,
 * after request logging, to ensure security headers are present on ALL responses,
 * including error responses.
 * 
 * @type {Function} Express middleware function
 */
const helmetMiddleware = helmet(helmetConfig);

/**
 * Pre-configured CORS middleware instance.
 * 
 * This middleware enforces Cross-Origin Resource Sharing policies:
 * - Origin validation against environment-configured whitelist
 * - HTTP method restrictions (GET, POST, PUT, DELETE)
 * - Allowed headers validation (Content-Type, Authorization)
 * - Credentials support for authenticated cross-origin requests
 * 
 * MIDDLEWARE CHAIN ORDER: CORS should be THIRD, after request logging
 * and helmet, to ensure CORS headers are set before request processing begins.
 * 
 * @type {Function} Express middleware function
 */
const corsMiddleware = cors(corsOptions);

/**
 * Pre-configured request logger middleware instance.
 * 
 * This variable holds the initialized request logging middleware.
 * It is initialized lazily via initializeRequestLogger() or automatically
 * when applySecurityMiddleware() is called.
 * 
 * MIDDLEWARE CHAIN ORDER: Request logger should be FIRST in the middleware
 * chain to capture all incoming requests, including those blocked by
 * security middleware.
 * 
 * @type {Function|null} Express middleware function or null if not initialized
 */
let requestLoggerMiddleware = null;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Initialize the request logger middleware with a provided logger instance.
 * 
 * This function creates and stores the request logger middleware for use
 * in the security middleware chain. If no logger is provided, a default
 * logger will be created by the createRequestLogger factory function.
 * 
 * The middleware is stored in module scope so it can be reused across
 * multiple calls to applySecurityMiddleware() and directly accessed
 * if needed.
 * 
 * @param {Object} [logger] - Pino logger instance. If not provided, a default
 *   logger will be created using the application's logger configuration.
 * @returns {Function} The initialized request logger middleware function
 * 
 * @example
 * // Initialize with custom logger
 * const { createLogger } = require('./config/logger');
 * const { initializeRequestLogger } = require('./middleware/security');
 * 
 * const logger = createLogger({ name: 'http' });
 * const requestLogger = initializeRequestLogger(logger);
 * 
 * @example
 * // Initialize with default logger
 * const { initializeRequestLogger } = require('./middleware/security');
 * const requestLogger = initializeRequestLogger();
 */
function initializeRequestLogger(logger) {
  // Create request logger middleware with provided or default logger
  requestLoggerMiddleware = createRequestLogger(logger);
  
  return requestLoggerMiddleware;
}

/**
 * Apply all security middleware to an Express application instance.
 * 
 * This helper function provides a convenient one-liner to apply the complete
 * security middleware chain in the correct order:
 * 
 * 1. Request Logger (HTTP request logging) - FIRST
 * 2. Helmet (HTTP security headers) - SECOND
 * 3. CORS (Cross-origin resource sharing) - THIRD
 * 4. Rate Limiter (Request throttling) - FOURTH
 * 
 * The order is critical for defense-in-depth:
 * - Request logger first captures ALL requests for full visibility
 * - Helmet second ensures security headers on ALL responses (including errors)
 * - CORS third validates cross-origin requests before processing
 * - Rate limiting fourth protects against abuse before expensive operations
 * 
 * Usage:
 * ```javascript
 * const express = require('express');
 * const { applySecurityMiddleware } = require('./middleware/security');
 * 
 * const app = express();
 * applySecurityMiddleware(app);
 * 
 * // Continue with route definitions...
 * app.get('/', (req, res) => res.send('Hello'));
 * ```
 * 
 * Usage with custom logger:
 * ```javascript
 * const express = require('express');
 * const { createLogger } = require('./config/logger');
 * const { applySecurityMiddleware } = require('./middleware/security');
 * 
 * const app = express();
 * const logger = createLogger({ name: 'http' });
 * applySecurityMiddleware(app, { logger });
 * ```
 * 
 * @param {Object} app - Express application instance
 * @param {Object} [options={}] - Optional configuration options
 * @param {Object} [options.logger] - Pino logger instance for request logging.
 *   If not provided, a default logger will be created.
 * @throws {TypeError} If app is not provided or is not a valid Express app
 * @returns {Object} The Express app instance for method chaining
 */
function applySecurityMiddleware(app, options = {}) {
  // Validate that app is provided and has the use method (Express app interface)
  if (!app) {
    throw new TypeError(
      'applySecurityMiddleware requires an Express application instance. ' +
      'Usage: applySecurityMiddleware(app)'
    );
  }
  
  if (typeof app.use !== 'function') {
    throw new TypeError(
      'Invalid Express application instance provided. ' +
      'The object must have a "use" method for middleware registration.'
    );
  }
  
  // Initialize request logger if not already initialized
  if (!requestLoggerMiddleware) {
    initializeRequestLogger(options.logger);
  }
  
  // Apply middleware in the correct security order
  // CRITICAL ORDER: requestLogger -> helmet -> cors -> rateLimiter
  
  // 1. Request Logger FIRST - Capture ALL requests for full visibility
  // This ensures all requests are logged, including those blocked by security middleware
  app.use(requestLoggerMiddleware);
  
  // 2. Helmet SECOND - Security headers must be on ALL responses
  // This ensures even error responses include security headers
  app.use(helmetMiddleware);
  
  // 3. CORS THIRD - Validate cross-origin requests early
  // This prevents unauthorized cross-origin access before request processing
  app.use(corsMiddleware);
  
  // 4. Rate Limiter FOURTH - Throttle requests before expensive operations
  // This protects against DoS and brute-force attacks
  app.use(rateLimiter);
  
  // Log security middleware application for debugging/audit purposes
  if (process.env.NODE_ENV === 'development') {
    console.log('[SECURITY] Security middleware chain applied:');
    console.log('  1. requestLogger (HTTP request logging)');
    console.log('  2. helmet (HTTP security headers)');
    console.log('  3. cors (Cross-Origin Resource Sharing)');
    console.log('  4. rateLimiter (Request throttling)');
  }
  
  // Return app for method chaining
  return app;
}

// ============================================================================
// Module Exports
// ============================================================================

/**
 * Export configured security middleware and configurations.
 * 
 * Middleware Exports (pre-configured, ready to use):
 * - helmetMiddleware: Configured helmet middleware function
 * - corsMiddleware: Configured CORS middleware function
 * - rateLimiter: Configured rate limiter middleware function
 * 
 * Middleware Factory Functions:
 * - createRequestLogger: Factory function to create request logging middleware
 * - initializeRequestLogger: Function to initialize request logger with custom logger
 * 
 * Configuration Exports (for inspection or customization):
 * - helmetConfig: Helmet configuration object
 * - corsOptions: CORS configuration object
 * 
 * Helper Functions:
 * - applySecurityMiddleware: One-liner to apply all security middleware (including logging)
 * 
 * @example
 * // Individual middleware usage with request logging
 * const { helmetMiddleware, corsMiddleware, rateLimiter, createRequestLogger } = require('./middleware/security');
 * const logger = require('./config/logger').createLogger();
 * app.use(createRequestLogger(logger));
 * app.use(helmetMiddleware);
 * app.use(corsMiddleware);
 * app.use(rateLimiter);
 * 
 * @example
 * // One-liner usage with custom logger
 * const { applySecurityMiddleware } = require('./middleware/security');
 * const logger = require('./config/logger').createLogger();
 * applySecurityMiddleware(app, { logger });
 * 
 * @example
 * // One-liner usage with default logger
 * const { applySecurityMiddleware } = require('./middleware/security');
 * applySecurityMiddleware(app);
 * 
 * @example
 * // Accessing configuration
 * const { helmetConfig, corsOptions } = require('./middleware/security');
 * console.log('CSP:', helmetConfig.contentSecurityPolicy);
 * console.log('Allowed origins:', corsOptions.origin);
 * 
 * @example
 * // Pre-initialize request logger for reuse
 * const { initializeRequestLogger } = require('./middleware/security');
 * const logger = require('./config/logger').createLogger();
 * const requestLogger = initializeRequestLogger(logger);
 * // requestLogger is now cached for applySecurityMiddleware calls
 */
module.exports = {
  // Pre-configured middleware instances (recommended for most use cases)
  helmetMiddleware,
  corsMiddleware,
  rateLimiter,
  
  // Middleware factory functions for request logging
  createRequestLogger,
  initializeRequestLogger,
  
  // Configuration objects (for inspection or custom middleware creation)
  helmetConfig,
  corsOptions,
  
  // Helper function for convenient one-liner security setup
  applySecurityMiddleware
};
