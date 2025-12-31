/**
 * Rate Limiting Middleware Module
 * 
 * Provides a pre-configured rate limiter middleware using express-rate-limit@8.2.1.
 * Protects against brute-force and denial-of-service attacks by limiting repeated
 * requests per IP address within configurable time windows.
 * 
 * Configuration via environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX: Maximum requests per window (default: 100)
 * 
 * Headers:
 * - Uses draft-8 standard headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
 * - Legacy X-RateLimit-* headers are disabled
 * 
 * Response when limit exceeded:
 * - HTTP 429 Too Many Requests
 * - JSON body: { error: 'Too many requests, please try again later.' }
 * 
 * Usage in src/app.js:
 * ```javascript
 * const rateLimiter = require('./middleware/rateLimiter');
 * app.use(rateLimiter);
 * ```
 * 
 * @module src/middleware/rateLimiter
 */

'use strict';

const { rateLimit } = require('express-rate-limit');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Rate limiter configuration object.
 * Exported for testing and inspection purposes.
 * 
 * @type {Object}
 * @property {number} windowMs - Time window for rate limiting in milliseconds
 * @property {number} limit - Maximum number of requests per window
 * @property {string} standardHeaders - Rate limit headers standard to use
 * @property {boolean} legacyHeaders - Whether to use legacy X-RateLimit-* headers
 * @property {Object} message - Response message when rate limit exceeded
 * @property {Function} handler - Custom handler for rate-limited requests
 */
const rateLimiterConfig = {
  /**
   * Time window for rate limiting in milliseconds.
   * Default: 15 minutes (900000ms) per OWASP recommendations.
   */
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

  /**
   * Maximum number of requests allowed per window.
   * Default: 100 requests per 15-minute window.
   */
  limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  /**
   * Use the modern draft-8 standard for rate limit headers.
   * Sets RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset headers.
   */
  standardHeaders: 'draft-8',

  /**
   * Disable deprecated X-RateLimit-* headers.
   */
  legacyHeaders: false,

  /**
   * Response message when rate limit is exceeded.
   */
  message: { error: 'Too many requests, please try again later.' },

  /**
   * Custom handler for rate-limited requests.
   * Returns 429 with JSON error response.
   * 
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   */
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
};

// ---------------------------------------------------------------------------
// Middleware Export
// ---------------------------------------------------------------------------

/**
 * Configured rate limiter middleware instance.
 * Apply to Express app or specific routes.
 * 
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const rateLimiter = rateLimit(rateLimiterConfig);

// Export both the configured middleware and config for testing
module.exports = rateLimiter;
module.exports.rateLimiterConfig = rateLimiterConfig;
