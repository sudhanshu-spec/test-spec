/**
 * Rate Limiter Middleware Factory
 * 
 * This module provides IP-based request rate limiting middleware to protect
 * the application against abuse, denial-of-service (DoS) attacks, and brute
 * force attempts.
 * 
 * Security Implementation: SEC-003 - Rate Limiting
 * Reference: OWASP API4:2019 - Lack of Resources & Rate Limiting
 * 
 * The rate limiter tracks requests per IP address within a configurable time
 * window. When the limit is exceeded, subsequent requests receive a 429 Too
 * Many Requests response until the window resets.
 * 
 * Configuration (via environment variables):
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX: Maximum requests per window per IP (default: 100)
 * 
 * Response Headers (draft-8 standard):
 * - RateLimit-Limit: Maximum requests allowed
 * - RateLimit-Remaining: Requests remaining in current window
 * - RateLimit-Reset: Seconds until window resets
 * 
 * @module src/middleware/rateLimiter
 * @see {@link https://express-rate-limit.mintlify.app/} express-rate-limit documentation
 */

'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Configured rate limiter middleware instance
 * 
 * Implements IP-based request throttling with the following behavior:
 * - Tracks requests per IP address across the configured time window
 * - Returns 429 Too Many Requests when limit is exceeded
 * - Uses draft-8 RateLimit headers for standard compliance
 * - Disables deprecated X-RateLimit-* legacy headers
 * 
 * Configuration values are sourced from the application config module:
 * - windowMs: config.rateLimitWindowMs (RATE_LIMIT_WINDOW_MS env var, default: 900000ms)
 * - limit: config.rateLimitMax (RATE_LIMIT_MAX env var, default: 100 requests)
 * 
 * @constant {Function} rateLimiter - Express middleware function
 * @example
 * // Usage in app.js
 * const rateLimiter = require('./middleware/rateLimiter');
 * app.use(rateLimiter);
 * 
 * @example
 * // Configure via environment variables
 * // RATE_LIMIT_WINDOW_MS=60000 RATE_LIMIT_MAX=30 npm start
 */
const rateLimiter = rateLimit({
  /**
   * Time window for rate limiting in milliseconds
   * Default: 900000ms (15 minutes) per SEC-003 specification
   * Falls back to 900000ms if config value is not set or invalid
   */
  windowMs: config.rateLimitWindowMs || 900000,

  /**
   * Maximum number of requests allowed per IP within the time window
   * Default: 100 requests per SEC-003 specification
   * Falls back to 100 if config value is not set or invalid
   * 
   * Note: express-rate-limit v8.x uses 'limit' instead of deprecated 'max'
   */
  limit: config.rateLimitMax || 100,

  /**
   * Enable draft-8 standard RateLimit headers
   * Provides: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
   * 
   * Per Section 0.2.2 of the Agent Action Plan, draft-8 headers are
   * the recommended standard for express-rate-limit v8.x
   */
  standardHeaders: 'draft-8',

  /**
   * Disable deprecated X-RateLimit-* headers
   * Legacy headers are disabled to reduce response size and follow
   * modern standards (draft-8 headers are sufficient)
   */
  legacyHeaders: false,

  /**
   * Custom error response for rate limit exceeded (HTTP 429)
   * 
   * Returns a structured JSON response with:
   * - error: Error type identifier
   * - message: Human-readable error description
   * - retryAfter: Seconds until the rate limit window resets
   * 
   * The retryAfter value is calculated from the configured window duration
   */
  message: {
    error: 'TooManyRequests',
    message: 'Rate limit exceeded. Please wait before making more requests.',
    retryAfter: Math.ceil((config.rateLimitWindowMs || 900000) / 1000)
  },

  /**
   * HTTP status code for rate-limited responses
   * 429 Too Many Requests is the standard status code per RFC 6585
   */
  statusCode: 429,

  /**
   * Skip failed requests from the rate limit count
   * Failed requests (status >= 400) are still counted to prevent
   * attackers from bypassing limits by intentionally causing errors
   */
  skipFailedRequests: false,

  /**
   * Skip successful requests from the rate limit count
   * Successful requests are counted to ensure accurate rate limiting
   */
  skipSuccessfulRequests: false

  /**
   * Note: keyGenerator is intentionally omitted to use express-rate-limit's
   * built-in IP-based key generation which properly handles IPv6 addresses
   * and proxy configurations (when app.set('trust proxy', ...) is configured).
   * 
   * The default keyGenerator uses req.ip which respects Express's trust proxy
   * settings and handles IPv6 subnet masking correctly.
   */
});

module.exports = rateLimiter;
