/**
 * Rate Limiting Configuration Module
 * 
 * This module exports configuration options for the express-rate-limit middleware.
 * It provides protection against brute force attacks, API abuse, and DoS attempts
 * by limiting the number of requests a single IP address can make within a time window.
 * 
 * Configuration is customizable via environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX_REQUESTS: Maximum requests per window per IP (default: 100)
 * 
 * @module config/rate-limit
 * @see https://github.com/express-rate-limit/express-rate-limit
 */

'use strict';

/**
 * Default rate limit window in milliseconds (15 minutes)
 * @constant {number}
 */
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 900000ms = 15 minutes

/**
 * Default maximum requests per window per IP
 * @constant {number}
 */
const DEFAULT_MAX_REQUESTS = 100;

/**
 * Parses an environment variable as an integer with a fallback default value.
 * Validates that the parsed value is a positive integer.
 * 
 * @param {string|undefined} envValue - The environment variable value to parse
 * @param {number} defaultValue - The default value if envValue is invalid or undefined
 * @returns {number} The parsed integer or the default value
 */
function parseIntEnv(envValue, defaultValue) {
  if (envValue === undefined || envValue === null || envValue === '') {
    return defaultValue;
  }
  
  const parsed = parseInt(envValue, 10);
  
  // Validate that the parsed value is a positive integer
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(
      `Invalid rate limit configuration value: "${envValue}". ` +
      `Using default value: ${defaultValue}`
    );
    return defaultValue;
  }
  
  return parsed;
}

/**
 * Custom handler for rate-limited requests.
 * Logs the rate limit violation and sends a JSON error response.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @param {Object} options - Rate limiter options object
 */
function rateLimitHandler(req, res, next, options) {
  // Log rate limit violation for security monitoring
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const requestPath = req.originalUrl || req.url || '/';
  const timestamp = new Date().toISOString();
  
  console.warn(
    `[RATE_LIMIT] ${timestamp} - IP: ${clientIP} - Path: ${requestPath} - ` +
    `Rate limit exceeded. Blocked for ${Math.ceil(options.windowMs / 1000)}s window.`
  );
  
  // Send JSON error response
  res.status(options.statusCode).json({
    error: 'Too Many Requests',
    message: options.message,
    retryAfter: Math.ceil(options.windowMs / 1000),
    statusCode: options.statusCode
  });
}

/**
 * Rate limiter configuration options for express-rate-limit middleware.
 * 
 * This configuration provides:
 * - Protection against brute force attacks by limiting request frequency
 * - Protection against API abuse by enforcing request quotas
 * - Protection against DoS attempts by throttling high-frequency requests
 * 
 * Security features:
 * - windowMs: Time window for rate limiting (default: 15 minutes)
 * - max: Maximum requests per IP per window (default: 100)
 * - standardHeaders: Returns RateLimit-* headers per RFC 6585
 * - legacyHeaders: Disables deprecated X-RateLimit-* headers
 * - statusCode: Returns 429 Too Many Requests when limit exceeded
 * 
 * @type {Object}
 * @property {number} windowMs - Time window in milliseconds for rate limiting
 * @property {number} max - Maximum number of requests allowed per window per IP
 * @property {boolean} standardHeaders - Enable standard RateLimit-* headers (RFC 6585)
 * @property {boolean} legacyHeaders - Disable deprecated X-RateLimit-* headers
 * @property {string} message - Error message returned when rate limit is exceeded
 * @property {number} statusCode - HTTP status code returned when rate limit is exceeded
 * @property {boolean} skipSuccessfulRequests - Whether to skip counting successful requests
 * @property {boolean} skipFailedRequests - Whether to skip counting failed requests
 * @property {Function} handler - Custom handler for rate-limited requests
 */
const rateLimitOptions = {
  /**
   * Time window for rate limiting in milliseconds.
   * Configurable via RATE_LIMIT_WINDOW_MS environment variable.
   * Default: 900000ms (15 minutes)
   */
  windowMs: parseIntEnv(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
  
  /**
   * Maximum number of requests allowed per IP address within the time window.
   * Configurable via RATE_LIMIT_MAX_REQUESTS environment variable.
   * Default: 100 requests
   */
  max: parseIntEnv(process.env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_MAX_REQUESTS),
  
  /**
   * Enable standard rate limit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset).
   * These headers follow the IETF draft specification for rate limiting.
   * Set to true for standards-compliant header responses.
   */
  standardHeaders: true,
  
  /**
   * Disable legacy X-RateLimit-* headers.
   * These headers are deprecated in favor of the standard RateLimit-* headers.
   * Set to false to disable sending these deprecated headers.
   */
  legacyHeaders: false,
  
  /**
   * Error message returned to clients when rate limit is exceeded.
   * Provides clear information about the rate limiting policy.
   */
  message: 'Too many requests from this IP address. Please try again later.',
  
  /**
   * HTTP status code returned when rate limit is exceeded.
   * 429 (Too Many Requests) is the standard status code per RFC 6585.
   */
  statusCode: 429,
  
  /**
   * Whether to skip counting successful requests (status < 400).
   * Set to false to count all requests regardless of response status.
   * This ensures comprehensive protection against all types of abuse.
   */
  skipSuccessfulRequests: false,
  
  /**
   * Whether to skip counting failed requests (status >= 400).
   * Set to false to count all requests regardless of response status.
   * This prevents attackers from exploiting error responses to bypass limits.
   */
  skipFailedRequests: false,
  
  /**
   * Custom handler function for rate-limited requests.
   * Logs violations for security monitoring and returns a JSON error response.
   */
  handler: rateLimitHandler
};

// Export the rate limit configuration as the default export
module.exports = rateLimitOptions;
