/**
 * Middleware Aggregator Module (Barrel Export)
 *
 * This module aggregates all security middleware modules for clean,
 * centralized imports. It serves as the middleware barrel export,
 * allowing src/app.js to import all middleware with a single require
 * statement.
 *
 * Mirrors the aggregator pattern used by src/routes/index.js.
 *
 * Middleware ordering rationale (maintained by src/app.js):
 *   1. Helmet (security headers) - sets response headers first
 *   2. CORS (cross-origin policy) - handles preflight before rate limiting
 *   3. Rate Limiter (throttling) - throttles before reaching routes
 *   4. Validation (input sanitization) - applied at route level
 *
 * Usage in src/app.js:
 *   const { helmetMiddleware, corsMiddleware, rateLimiterMiddleware } = require('./middleware');
 *   app.use(helmetMiddleware);
 *   app.use(corsMiddleware);
 *   app.use(rateLimiterMiddleware);
 *
 * @module src/middleware
 */

'use strict';

/**
 * Helmet.js security headers middleware.
 * Sets 13 protective HTTP response headers including CSP, HSTS, and X-Content-Type-Options.
 * @type {import('express').RequestHandler}
 */
const helmetMiddleware = require('./helmet');

/**
 * CORS policy middleware.
 * Enforces environment-driven origin whitelisting with restrictive defaults.
 * @type {import('express').RequestHandler}
 */
const corsMiddleware = require('./cors');

/**
 * Rate limiter middleware.
 * Enforces 100 requests per 15-minute window per IP with IETF RateLimit headers.
 * @type {import('express').RequestHandler}
 */
const rateLimiterMiddleware = require('./rateLimiter');

/**
 * Input validation middleware exports.
 * Provides sanitizeQuery (chain rules) and handleValidationErrors (error handler).
 * @type {{ sanitizeQuery: import('express-validator').ValidationChain[], handleValidationErrors: import('express').RequestHandler }}
 */
const { sanitizeQuery, handleValidationErrors } = require('./validator');

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  rateLimiterMiddleware,
  sanitizeQuery,
  handleValidationErrors
};
