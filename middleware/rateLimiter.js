/**
 * Rate Limiter Middleware Configuration
 * 
 * This module creates and exports a configured rate limiter middleware using
 * express-rate-limit to protect against brute-force attacks and denial-of-service
 * (DoS) attempts. It implements configurable request windows and limits via
 * environment variables.
 * 
 * Security Features:
 * - Configurable time window for rate limiting (default: 15 minutes)
 * - Configurable maximum requests per window per IP (default: 100)
 * - Uses draft-8 standard RateLimit headers for client compatibility
 * - Returns 429 Too Many Requests status when limits are exceeded
 * - Custom error message with retry information
 * 
 * Environment Variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 900000 = 15 min)
 * - RATE_LIMIT_MAX: Maximum requests per window per IP (default: 100)
 * 
 * Usage:
 *   const rateLimiter = require('./middleware/rateLimiter');
 *   app.use(rateLimiter);
 * 
 * Note: This implementation uses an in-memory store which is suitable for
 * single-instance deployments. For distributed deployments with multiple
 * server instances, consider using a Redis store (rate-limit-redis) to
 * share rate limit state across instances.
 * 
 * @module middleware/rateLimiter
 * @see https://www.npmjs.com/package/express-rate-limit
 */

'use strict';

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * Default configuration values for rate limiting.
 * These can be overridden via environment variables.
 */
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const DEFAULT_MAX_REQUESTS = 100; // Maximum 100 requests per window per IP

/**
 * Parse environment variable as integer with fallback to default value.
 * Provides safe parsing with validation to ensure positive integers.
 * 
 * @param {string|undefined} envValue - The environment variable value
 * @param {number} defaultValue - The default value if parsing fails
 * @returns {number} The parsed integer or default value
 */
function parseEnvInt(envValue, defaultValue) {
  if (envValue === undefined || envValue === null || envValue === '') {
    return defaultValue;
  }
  
  const parsed = parseInt(envValue, 10);
  
  // Validate that the parsed value is a positive integer
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(
      `Invalid rate limit configuration value: "${envValue}". ` +
      `Using default: ${defaultValue}`
    );
    return defaultValue;
  }
  
  return parsed;
}

/**
 * Get the configured time window in milliseconds.
 * Reads from RATE_LIMIT_WINDOW_MS environment variable with fallback.
 * 
 * @returns {number} Time window in milliseconds
 */
function getWindowMs() {
  return parseEnvInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
}

/**
 * Get the configured maximum requests per window.
 * Reads from RATE_LIMIT_MAX environment variable with fallback.
 * 
 * @returns {number} Maximum requests per window
 */
function getMaxRequests() {
  return parseEnvInt(process.env.RATE_LIMIT_MAX, DEFAULT_MAX_REQUESTS);
}

/**
 * Custom handler for rate-limited requests.
 * Sends a structured JSON error response with retry information.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @param {Object} options - Rate limiter options containing statusCode and message
 */
function rateLimitHandler(req, res, next, options) {
  // Log rate limit hit for security monitoring (can be enhanced with logging framework)
  const clientIdentifier = req.ip || req.connection.remoteAddress || 'unknown';
  console.warn(
    `[RATE_LIMIT] Request limit exceeded for IP: ${clientIdentifier}, ` +
    `Path: ${req.path}, Method: ${req.method}`
  );
  
  // Send the rate limit error response
  res.status(options.statusCode).json(options.message);
}

/**
 * Generate skip function to optionally bypass rate limiting.
 * Can be customized based on environment or specific conditions.
 * 
 * @returns {Function|undefined} Skip function or undefined if no skip logic needed
 */
function getSkipFunction() {
  // In development mode, optionally skip rate limiting for localhost
  // Uncomment the following to enable development bypass:
  // if (process.env.NODE_ENV === 'development') {
  //   return (req) => {
  //     const localAddresses = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  //     return localAddresses.includes(req.ip);
  //   };
  // }
  
  return undefined;
}

/**
 * Configured rate limiter middleware instance.
 * 
 * Configuration follows IETF RateLimit header fields standard (draft-8).
 * The middleware tracks requests per IP address and returns 429 Too Many Requests
 * when the configured limit is exceeded within the time window.
 * 
 * Response Headers (when rate limiting is active):
 * - RateLimit-Limit: Maximum number of requests allowed
 * - RateLimit-Remaining: Number of requests remaining in current window
 * - RateLimit-Reset: Timestamp when the rate limit window resets
 * - Retry-After: Seconds until the rate limit resets (on 429 responses)
 * 
 * @type {Function} Express middleware function
 */
const rateLimiter = rateLimit({
  // Time window in milliseconds for rate limiting
  // Default: 15 minutes (900000ms)
  windowMs: getWindowMs(),
  
  // Maximum number of requests allowed per IP within the time window
  // Default: 100 requests
  limit: getMaxRequests(),
  
  // Use standardized RateLimit headers (draft-8 IETF standard)
  // This sends: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset headers
  standardHeaders: 'draft-8',
  
  // Disable legacy X-RateLimit-* headers for cleaner responses
  // Legacy headers are non-standard and deprecated
  legacyHeaders: false,
  
  // HTTP status code returned when rate limit is exceeded
  // 429 Too Many Requests is the standard HTTP status for rate limiting
  statusCode: 429,
  
  // Custom message returned in JSON response when rate limited
  // Provides clear information to clients about the rate limit
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the request limit. Please try again later.',
    retryAfter: 'See Retry-After header for wait time in seconds'
  },
  
  // Custom handler for rate-limited requests
  // Logs the event and sends structured JSON response
  handler: rateLimitHandler,
  
  // Optional skip function (returns undefined by default)
  // Can be configured to bypass rate limiting for specific conditions
  skip: getSkipFunction(),
  
  // Key generator function - uses built-in ipKeyGenerator for proper IPv6 subnet handling
  // This provides protection against distributed attacks from IPv6 ranges
  // The ipKeyGenerator helper automatically groups IPv6 addresses into /56 subnets
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind a reverse proxy
    // Otherwise fall back to req.ip (which Express sets based on trust proxy setting)
    const forwarded = req.headers['x-forwarded-for'];
    let clientIp;
    
    if (forwarded) {
      // Take the first IP in the chain (original client)
      clientIp = forwarded.split(',')[0].trim();
    } else {
      // Use req.ip which Express sets based on trust proxy configuration
      clientIp = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
    }
    
    // Use ipKeyGenerator to properly handle IPv6 subnet grouping
    // This ensures IPv6 addresses are grouped into /56 subnets to prevent bypass
    return ipKeyGenerator(clientIp);
  },
  
  // Validate configuration on startup
  validate: {
    // Enable validation to catch configuration errors
    trustProxy: true,
    // Set to true to throw an error if Express trust proxy is not set correctly
    // when running behind a proxy (recommended for production)
    xForwardedForHeader: true
  }
});

/**
 * Export the configured rate limiter middleware as default export.
 * 
 * Usage in server.js or security middleware chain:
 *   const rateLimiter = require('./middleware/rateLimiter');
 *   app.use(rateLimiter);
 * 
 * Or import in security.js for the centralized middleware chain:
 *   const rateLimiter = require('./rateLimiter');
 *   module.exports = { rateLimiter, ... };
 */
module.exports = rateLimiter;
