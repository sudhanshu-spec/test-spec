/**
 * Rate Limiter Middleware Configuration
 *
 * This module configures and exports the express-rate-limit middleware instance
 * for IP-based rate limiting. It is mounted as the THIRD middleware in the
 * Express middleware chain, after Helmet and CORS, to throttle requests before
 * they reach route handlers.
 *
 * Uses in-memory storage which is acceptable for single-process applications
 * per Constraint C-001. The store resets on server restart.
 *
 * Configuration via environment variables:
 * - RATE_LIMIT_WINDOW_MS: Window duration in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX: Max requests per window per IP (default: 100)
 *
 * Returns HTTP 429 Too Many Requests when the threshold is exceeded, with
 * standard IETF RateLimit headers per draft-8.
 *
 * @module src/middleware/rateLimiter
 */

'use strict';

const { rateLimit } = require('express-rate-limit');
const config = require('../config');

/**
 * Configured rate limiter middleware instance.
 *
 * Options:
 * - windowMs: Rate limit window from config (default 15 minutes)
 * - max: Maximum requests per window per IP from config (default 100)
 * - standardHeaders: Enables IETF RateLimit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
 * - legacyHeaders: Disables deprecated X-RateLimit-* headers
 * - message: Descriptive error message for 429 responses
 *
 * @type {import('express').RequestHandler}
 */
const rateLimiterMiddleware = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.'
  }
});

module.exports = rateLimiterMiddleware;
