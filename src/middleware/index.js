/**
 * Middleware Aggregator Module (Barrel)
 * 
 * Centralizes exports for all security middleware modules, following the
 * CommonJS barrel pattern used elsewhere in the codebase (similar to
 * src/routes/index.js).
 * 
 * This module provides a single import point for security middleware:
 * - rateLimiter: Rate limiting middleware for DoS protection
 * - validateRequest: Validation error handling middleware
 * - sanitizeQuery: Query parameter sanitization rules
 * 
 * Usage:
 * ```javascript
 * const { rateLimiter, validateRequest, sanitizeQuery } = require('./middleware');
 * 
 * // Apply rate limiting globally
 * app.use(rateLimiter);
 * 
 * // Use validation in routes
 * router.get('/api', sanitizeQuery, validateRequest, handler);
 * ```
 * 
 * Security configuration is loaded from src/config/security.config.js
 * 
 * @module src/middleware
 */

'use strict';

// ---------------------------------------------------------------------------
// Middleware Imports
// ---------------------------------------------------------------------------

/**
 * Rate limiting middleware.
 * Pre-configured using express-rate-limit with environment-driven settings.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const rateLimiter = require('./rateLimiter');

/**
 * Input validation middleware and utilities.
 * Provides validation error handling and sanitization helpers.
 */
const {
  validateRequest,
  sanitizeQuery,
  createQueryValidation,
  createBodyValidation,
  createParamValidation,
  query,
  body,
  param,
  validationResult
} = require('./validation');

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Rate limiting
  rateLimiter,
  
  // Validation middleware
  validateRequest,
  sanitizeQuery,
  
  // Validation chain builders (configuration helpers)
  createQueryValidation,
  createBodyValidation,
  createParamValidation,
  
  // Re-exported express-validator functions for convenience
  query,
  body,
  param,
  validationResult
};
