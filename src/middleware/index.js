/**
 * Middleware Barrel Export Module
 *
 * This module provides centralized exports for all middleware modules in the application.
 * It follows the same barrel export pattern as src/routes/index.js for consistency.
 *
 * Exported Middleware:
 * - security: Aggregate security middleware configuration (helmet, rateLimiter, corsConfig)
 * - rateLimiter: IP-based rate limiting middleware (SEC-003)
 * - corsConfig: CORS middleware with configurable origins (SEC-005)
 * - validators: Input validation utilities barrel (SEC-002)
 *
 * Usage in src/app.js:
 *   const { rateLimiter, corsConfig } = require('./middleware');
 *   app.use(rateLimiter);
 *   app.use(corsConfig);
 *
 * Alternative usage with security object:
 *   const { security } = require('./middleware');
 *   app.use(security.rateLimiter);
 *   app.use(security.corsConfig);
 *   app.use(security.helmet);
 *
 * @module src/middleware
 * @see src/middleware/security.js
 * @see src/middleware/rateLimiter.js
 * @see src/middleware/corsConfig.js
 * @see src/middleware/validators/index.js
 */

'use strict';

/**
 * Aggregate security middleware configuration module.
 * Exports configured helmet, rateLimiter, and corsConfig instances.
 *
 * @type {Object}
 * @property {Function} helmet - Helmet middleware for security headers (SEC-001)
 * @property {Function} rateLimiter - Rate limiting middleware (SEC-003)
 * @property {Function} corsConfig - CORS middleware (SEC-005)
 */
const security = require('./security');

/**
 * Rate limiter middleware for IP-based request throttling.
 * Pre-configured with settings from src/config.
 *
 * @type {Function}
 */
const rateLimiter = require('./rateLimiter');

/**
 * CORS middleware with configurable origin restrictions.
 * Pre-configured with settings from src/config.
 *
 * @type {Function}
 */
const corsConfig = require('./corsConfig');

/**
 * Input validation middleware utilities.
 * Provides body, query, param validators and error handling.
 *
 * @type {Object}
 * @property {Function} body - Body parameter validation chain builder
 * @property {Function} query - Query parameter validation chain builder
 * @property {Function} param - URL parameter validation chain builder
 * @property {Function} validationResult - Validation result extractor
 * @property {Function} handleValidationErrors - Error handling middleware
 */
const validators = require('./validators');

module.exports = {
  security,
  rateLimiter,
  corsConfig,
  validators
};
