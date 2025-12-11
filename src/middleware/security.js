/**
 * Security Middleware Factory Module
 * 
 * This module exports a factory function `createSecurityMiddleware` that returns
 * configured instances of security middleware for Express.js applications.
 * The factory pattern enables separation of security concerns from the main
 * Express application configuration and allows for dependency injection of
 * configuration values.
 * 
 * Security Middleware Features:
 * -----------------------------
 * 
 * 1. Helmet (Security Headers - 11+ headers):
 *    - Content-Security-Policy: Prevents XSS and data injection attacks
 *    - Cross-Origin-Opener-Policy: Isolates browsing context
 *    - Cross-Origin-Resource-Policy: Prevents cross-origin reads
 *    - Origin-Agent-Cluster: Requests process isolation
 *    - Referrer-Policy: Controls referrer information
 *    - Strict-Transport-Security: Enforces HTTPS (in production)
 *    - X-Content-Type-Options: Prevents MIME sniffing
 *    - X-DNS-Prefetch-Control: Controls DNS prefetching
 *    - X-Download-Options: Prevents IE from executing downloads
 *    - X-Frame-Options: Prevents clickjacking
 *    - X-Permitted-Cross-Domain-Policies: Controls Adobe Flash/PDF
 *    - Removes X-Powered-By header to prevent framework fingerprinting
 * 
 * 2. CORS (Cross-Origin Resource Sharing):
 *    - Handles preflight OPTIONS requests
 *    - Sets Access-Control-Allow-* headers
 *    - Configurable origin whitelist for restricting cross-origin requests
 * 
 * 3. Rate Limiting (DDoS/Brute-force Protection):
 *    - Limits requests per IP address within configurable time windows
 *    - Returns HTTP 429 Too Many Requests when exceeded
 *    - draft-8 compliant RateLimit headers for modern standards compliance
 * 
 * Environment-Aware Configuration:
 * --------------------------------
 * - Development: Relaxed CSP (allows inline scripts, disables upgrade-insecure-requests)
 * - Production: Strict CSP, full HSTS, restricted CORS origins
 * 
 * Usage:
 * ------
 * const config = require('./config');
 * const { createSecurityMiddleware } = require('./middleware/security');
 * 
 * const { helmetMiddleware, corsMiddleware, rateLimitMiddleware } = createSecurityMiddleware(config);
 * 
 * // Apply middleware in correct order (helmet first, cors second, rateLimit third)
 * app.use(helmetMiddleware);
 * app.use(corsMiddleware);
 * app.use(rateLimitMiddleware);
 * 
 * @module src/middleware/security
 * @requires helmet - Security headers middleware (^8.1.0)
 * @requires cors - CORS handling middleware (^2.8.5)
 * @requires express-rate-limit - Rate limiting middleware (^8.2.1)
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

/**
 * Helmet security headers middleware.
 * Sets 11+ HTTP security headers with secure defaults.
 * Automatically removes X-Powered-By header to prevent Express framework fingerprinting.
 * @external helmet
 * @see {@link https://helmetjs.github.io/}
 */
const helmet = require('helmet');

/**
 * CORS (Cross-Origin Resource Sharing) middleware.
 * Handles preflight OPTIONS requests and sets Access-Control-Allow-* headers.
 * @external cors
 * @see {@link https://www.npmjs.com/package/cors}
 */
const cors = require('cors');

/**
 * Express rate limiting middleware.
 * Limits repeated requests to prevent DDoS and brute-force attacks.
 * Supports draft-8 compliant RateLimit headers.
 * @external express-rate-limit
 * @see {@link https://www.npmjs.com/package/express-rate-limit}
 */
const { rateLimit } = require('express-rate-limit');

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Parses CORS origins configuration string into appropriate format.
 * Supports:
 * - '*' for all origins (development)
 * - Single origin string (e.g., 'https://example.com')
 * - Comma-separated origins (e.g., 'https://example.com,https://app.example.com')
 * 
 * @param {string} originsConfig - The CORS origins configuration string
 * @returns {string|string[]|boolean} Parsed origins suitable for cors middleware
 * @private
 */
function parseCorsOrigins(originsConfig) {
  // Handle undefined or null - default to allow all
  if (originsConfig === undefined || originsConfig === null) {
    return '*';
  }

  // Convert to string if not already
  const originsString = String(originsConfig).trim();

  // Handle wildcard (allow all origins)
  if (originsString === '*') {
    return '*';
  }

  // Handle 'false' string (disable CORS)
  if (originsString.toLowerCase() === 'false') {
    return false;
  }

  // Handle 'true' string (reflect request origin)
  if (originsString.toLowerCase() === 'true') {
    return true;
  }

  // Check if it's a comma-separated list
  if (originsString.includes(',')) {
    // Split by comma, trim whitespace, and filter empty strings
    const origins = originsString
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
    
    // Return array of origins for whitelist
    return origins;
  }

  // Single origin string
  return originsString;
}

/**
 * Creates helmet middleware configuration based on environment.
 * 
 * Development environment:
 * - Relaxed Content-Security-Policy (allows inline scripts/styles)
 * - Disables upgrade-insecure-requests for HTTP development
 * - HSTS disabled (no HTTPS requirement)
 * 
 * Production environment:
 * - Strict Content-Security-Policy
 * - Enables upgrade-insecure-requests
 * - Full HSTS with 1-year max-age, includeSubDomains, and preload
 * 
 * @param {boolean} isDevelopment - Whether running in development environment
 * @param {boolean} isProduction - Whether running in production environment
 * @returns {Object} Helmet configuration options
 * @private
 */
function createHelmetConfig(isDevelopment, isProduction) {
  return {
    // Content Security Policy configuration
    contentSecurityPolicy: isDevelopment
      ? {
          // Relaxed CSP for development - allows inline scripts/styles and HTTP
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            // Disable upgrade-insecure-requests in development for HTTP support
            // Setting to null removes the directive entirely
            upgradeInsecureRequests: null
          }
        }
      : {
          // Strict CSP for production
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            // Enable upgrade-insecure-requests in production
            upgradeInsecureRequests: []
          }
        },

    // Cross-Origin-Opener-Policy: Isolates browsing context
    crossOriginOpenerPolicy: { policy: 'same-origin' },

    // Cross-Origin-Resource-Policy: Prevents cross-origin reads
    crossOriginResourcePolicy: { policy: 'same-origin' },

    // Referrer-Policy: Controls referrer information sent with requests
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // Strict-Transport-Security (HSTS)
    // Only enable in production when HTTPS is expected
    strictTransportSecurity: isProduction
      ? {
          maxAge: 31536000, // 1 year in seconds
          includeSubDomains: true,
          preload: true
        }
      : false,

    // X-Content-Type-Options: nosniff - Prevents MIME type sniffing
    xContentTypeOptions: true,

    // X-DNS-Prefetch-Control: off - Controls DNS prefetching
    xDnsPrefetchControl: { allow: false },

    // X-Download-Options: noopen - Prevents IE from executing downloads in site context
    xDownloadOptions: true,

    // X-Frame-Options: DENY - Prevents clickjacking attacks
    xFrameOptions: { action: 'deny' },

    // X-Permitted-Cross-Domain-Policies: none - Controls Adobe Flash/PDF cross-domain requests
    xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },

    // X-XSS-Protection: Disabled (modern browsers use CSP instead)
    // Setting to false disables the header as it can cause more issues than it solves
    xXssProtection: false,

    // Origin-Agent-Cluster: ?1 - Requests process isolation for better security
    originAgentCluster: true
  };
}

/**
 * Creates CORS middleware options based on configuration.
 * 
 * @param {string|string[]|boolean} parsedOrigins - Parsed CORS origins
 * @param {boolean} isDevelopment - Whether running in development environment
 * @returns {Object} CORS configuration options
 * @private
 */
function createCorsOptions(parsedOrigins, isDevelopment) {
  return {
    // Origin configuration - determines which origins can access resources
    origin: parsedOrigins,

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    // Allowed request headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],

    // Headers exposed to client JavaScript
    exposedHeaders: [
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'Retry-After'
    ],

    // Preflight cache duration (in seconds)
    // Shorter in development for flexibility, longer in production for performance
    maxAge: isDevelopment ? 600 : 86400, // 10 minutes dev, 24 hours prod

    // Status code for successful preflight requests
    optionsSuccessStatus: 204
  };
}

/**
 * Creates rate limiting middleware options based on configuration.
 * 
 * @param {number} windowMs - Time window for counting requests (milliseconds)
 * @param {number} limit - Maximum requests per window per IP
 * @returns {Object} Rate limit configuration options
 * @private
 */
function createRateLimitOptions(windowMs, limit) {
  // Calculate retry-after in seconds
  const retryAfterSeconds = Math.ceil(windowMs / 1000);

  return {
    // Time window for counting requests (milliseconds)
    windowMs: windowMs,

    // Maximum requests per window per IP address
    limit: limit,

    // Return rate limit info in RateLimit-* headers (draft-8 standard)
    // This is the modern standard for rate limit headers
    standardHeaders: 'draft-8',

    // Disable X-RateLimit-* headers (legacy format)
    legacyHeaders: false,

    // Do not skip successful requests - count all requests
    skipSuccessfulRequests: false,

    // Do not skip failed requests - count all requests
    skipFailedRequests: false,

    // HTTP status code when rate limit is exceeded
    statusCode: 429,

    // Response message when rate limit is exceeded
    message: {
      status: 429,
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: retryAfterSeconds
    },

    // Custom handler for rate limit exceeded
    handler: (req, res, next, options) => {
      // Set Retry-After header with seconds until reset
      res.setHeader('Retry-After', retryAfterSeconds);
      
      // Send JSON error response
      res.status(options.statusCode).json(options.message);
    }

    // Note: Intentionally NOT using a custom keyGenerator function.
    // express-rate-limit v8.x uses req.ip by default which correctly handles:
    // - IPv4 addresses
    // - IPv6 addresses (with proper normalization via ipKeyGenerator helper)
    // - Proxy configurations (when 'trust proxy' is set on the Express app)
    // Custom keyGenerators require using the ipKeyGenerator helper for IPv6 support.
    // See: https://express-rate-limit.github.io/ERR_ERL_KEY_GEN_IPV6/
  };
}

// ---------------------------------------------------------------------------
// Security Middleware Factory
// ---------------------------------------------------------------------------

/**
 * Creates and configures security middleware instances.
 * 
 * This factory function accepts a configuration object and returns an object
 * containing three configured middleware instances ready for use with Express.
 * The middleware should be applied in the following order:
 * 1. helmetMiddleware (first - sets security headers)
 * 2. corsMiddleware (second - handles preflight requests)
 * 3. rateLimitMiddleware (third - applies rate limiting)
 * 
 * Configuration Object Properties:
 * - env {string} - Application environment ('development' | 'production')
 * - rateLimitWindowMs {number} - Rate limit window in milliseconds (default: 900000 = 15 min)
 * - rateLimitMax {number} - Maximum requests per window (default: 100)
 * - corsOrigins {string} - CORS origins ('*', 'url', or comma-separated URLs)
 * 
 * @param {Object} config - Configuration object from src/config/index.js
 * @param {string} [config.env='development'] - Application environment
 * @param {number} [config.rateLimitWindowMs=900000] - Rate limit window duration (ms)
 * @param {number} [config.rateLimitMax=100] - Maximum requests per rate limit window
 * @param {string} [config.corsOrigins='*'] - Allowed CORS origins
 * @returns {Object} Object containing configured middleware instances
 * @returns {Function} returns.helmetMiddleware - Helmet security headers middleware
 * @returns {Function} returns.corsMiddleware - CORS handling middleware
 * @returns {Function} returns.rateLimitMiddleware - Rate limiting middleware
 * 
 * @example
 * const config = require('./config');
 * const { createSecurityMiddleware } = require('./middleware/security');
 * 
 * const { helmetMiddleware, corsMiddleware, rateLimitMiddleware } = createSecurityMiddleware(config);
 * 
 * app.use(helmetMiddleware);
 * app.use(corsMiddleware);
 * app.use(rateLimitMiddleware);
 */
function createSecurityMiddleware(config) {
  // Validate config parameter
  if (!config || typeof config !== 'object') {
    throw new Error('createSecurityMiddleware requires a configuration object');
  }

  // Extract configuration values with defaults
  const env = config.env || 'development';
  const rateLimitWindowMs = config.rateLimitWindowMs || 15 * 60 * 1000; // 15 minutes default
  const rateLimitMax = config.rateLimitMax || 100; // 100 requests default
  const corsOrigins = config.corsOrigins || '*'; // Allow all origins by default

  // Determine environment
  const isDevelopment = env === 'development';
  const isProduction = env === 'production';

  // Parse CORS origins (handles comma-separated strings)
  const parsedCorsOrigins = parseCorsOrigins(corsOrigins);

  // Create helmet configuration
  const helmetConfig = createHelmetConfig(isDevelopment, isProduction);

  // Create CORS configuration
  const corsConfig = createCorsOptions(parsedCorsOrigins, isDevelopment);

  // Create rate limit configuration
  const rateLimitConfig = createRateLimitOptions(rateLimitWindowMs, rateLimitMax);

  // Create and return configured middleware instances
  return {
    /**
     * Helmet security headers middleware.
     * Sets 11+ HTTP security headers and removes X-Powered-By.
     * Apply as first middleware for maximum protection.
     * @type {Function}
     */
    helmetMiddleware: helmet(helmetConfig),

    /**
     * CORS handling middleware.
     * Handles preflight OPTIONS requests and sets Access-Control-Allow-* headers.
     * Apply after helmet, before rate limiting.
     * @type {Function}
     */
    corsMiddleware: cors(corsConfig),

    /**
     * Rate limiting middleware.
     * Limits requests per IP to prevent DDoS and brute-force attacks.
     * Apply after CORS, before routes.
     * @type {Function}
     */
    rateLimitMiddleware: rateLimit(rateLimitConfig)
  };
}

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------

module.exports = {
  /**
   * Security middleware factory function.
   * Creates configured instances of helmet, cors, and rate-limit middleware.
   * @function
   */
  createSecurityMiddleware
};
