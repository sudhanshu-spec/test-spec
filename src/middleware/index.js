/**
 * Middleware Barrel Export Module
 * 
 * This module provides centralized exports of all middleware modules,
 * enabling clean single-import access for consumers like src/app.js.
 * 
 * Exports:
 * 
 * Security Middleware (from ./security.js):
 * - helmet: HTTP security headers middleware (helmet@8.1.0)
 * - cors: CORS policy enforcement middleware (cors@2.8.5)
 * - rateLimiter: Request rate limiting middleware (express-rate-limit@8.2.1)
 * 
 * Validation Middleware (from ./validation.js):
 * - validateRequest: Factory function for creating validation middleware chains
 * - validationErrorHandler: Middleware for handling validation errors
 * - commonValidators: Object containing reusable validation chains
 * - body, param, query, validationResult: Re-exported express-validator functions
 * 
 * Usage:
 * ```javascript
 * // Import security middleware
 * const { helmet, cors, rateLimiter } = require('./middleware');
 * 
 * // Import validation middleware
 * const { validateRequest, commonValidators } = require('./middleware');
 * 
 * // Or import everything
 * const middleware = require('./middleware');
 * app.use(middleware.rateLimiter);
 * ```
 * 
 * Security Middleware Order (per Section 0.12.3):
 * 1. rateLimiter - Block abusive requests first
 * 2. cors - Reject unauthorized origins early
 * 3. helmet - Set security headers on all responses
 * 
 * Configuration for security middleware is sourced from src/config/index.js.
 * 
 * Pattern Reference: Follows existing barrel export pattern from src/routes/index.js
 * 
 * @module src/middleware
 */

'use strict';

// Import security middleware
const { helmet, cors, rateLimiter } = require('./security');

// Import validation middleware
const {
  validateRequest,
  validationErrorHandler,
  commonValidators,
  body,
  param,
  query,
  validationResult,
  matchedData
} = require('./validation');

/**
 * Export all middleware modules
 * 
 * Security middleware should be used in specific order:
 * rateLimiter → cors → helmet
 * 
 * @exports helmet - HTTP security headers middleware
 * @exports cors - CORS policy enforcement middleware
 * @exports rateLimiter - Rate limiting middleware for DoS prevention
 * @exports validateRequest - Factory function for creating validation middleware
 * @exports validationErrorHandler - Middleware for handling validation errors
 * @exports commonValidators - Object containing reusable validation chains
 * @exports body - express-validator body validation chain
 * @exports param - express-validator param validation chain
 * @exports query - express-validator query validation chain
 * @exports validationResult - express-validator result extraction function
 * @exports matchedData - express-validator matched data extraction function
 */
module.exports = {
  // Security middleware
  helmet,
  cors,
  rateLimiter,
  
  // Validation middleware
  validateRequest,
  validationErrorHandler,
  commonValidators,
  
  // Re-exported express-validator functions for custom validations
  body,
  param,
  query,
  validationResult,
  matchedData
};
