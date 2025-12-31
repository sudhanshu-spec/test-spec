/**
 * Input Validation Middleware Module
 * 
 * Provides reusable validation chains and helper functions for sanitizing and
 * validating request data using express-validator@7.3.1.
 * 
 * This module exports:
 * - validateRequest: Generic validation result handler middleware
 * - sanitizeQuery: Array of sanitization rules for query parameters
 * - query, body, param: Express-validator validators (re-exported for convenience)
 * - validationResult: Express-validator result extractor (re-exported)
 * 
 * Error Response Format:
 * - HTTP 400 Bad Request for validation failures
 * - JSON body: { error: 'Validation failed', details: [...] }
 * 
 * Usage example:
 * ```javascript
 * const { validateRequest, sanitizeQuery, query } = require('./middleware/validation');
 * 
 * router.get('/users',
 *   [query('limit').optional().isInt({ min: 1, max: 100 }), ...sanitizeQuery],
 *   validateRequest,
 *   (req, res) => { ... }
 * );
 * ```
 * 
 * @module src/middleware/validation
 * @see https://express-validator.github.io/docs/
 */

'use strict';

const { query, body, param, validationResult } = require('express-validator');

// ---------------------------------------------------------------------------
// Validation Middleware
// ---------------------------------------------------------------------------

/**
 * Generic validation result handler middleware.
 * Checks for validation errors and returns 400 with error details if found.
 * Allows valid requests to proceed to the next middleware/handler.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Object|void} Returns 400 JSON response with errors if validation fails, otherwise calls next()
 * 
 * @example
 * router.get('/api/data',
 *   [query('id').isInt()],
 *   validateRequest,
 *   handler
 * );
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// ---------------------------------------------------------------------------
// Sanitization Rules
// ---------------------------------------------------------------------------

/**
 * Common query parameter sanitization rules.
 * Applies basic XSS prevention to all query parameters:
 * - trim(): Removes leading/trailing whitespace
 * - escape(): Escapes HTML special characters (<, >, &, ', ", /)
 * 
 * @type {import('express-validator').ValidationChain[]}
 * 
 * @example
 * router.get('/search', sanitizeQuery, handler);
 */
const sanitizeQuery = [
  query('*').optional().trim().escape()
];

// ---------------------------------------------------------------------------
// Validation Chain Builders
// ---------------------------------------------------------------------------

/**
 * Creates a validation chain for a query parameter.
 * Factory function for building common query parameter validations.
 * 
 * @param {string} fieldName - Name of the query parameter
 * @param {Object} options - Validation options
 * @param {boolean} [options.required=false] - Whether the field is required
 * @param {boolean} [options.isInt=false] - Validate as integer
 * @param {boolean} [options.isString=false] - Validate as string
 * @param {number} [options.minLength] - Minimum string length
 * @param {number} [options.maxLength] - Maximum string length
 * @returns {import('express-validator').ValidationChain} Validation chain
 * 
 * @example
 * const validatePage = createQueryValidation('page', { isInt: true });
 */
const createQueryValidation = (fieldName, options = {}) => {
  let chain = query(fieldName);
  
  if (!options.required) {
    chain = chain.optional();
  } else {
    chain = chain.notEmpty().withMessage(`${fieldName} is required`);
  }
  
  if (options.isInt) {
    chain = chain.isInt().withMessage(`${fieldName} must be an integer`).toInt();
  }
  
  if (options.isString) {
    chain = chain.isString().withMessage(`${fieldName} must be a string`);
  }
  
  if (options.minLength) {
    chain = chain.isLength({ min: options.minLength })
      .withMessage(`${fieldName} must be at least ${options.minLength} characters`);
  }
  
  if (options.maxLength) {
    chain = chain.isLength({ max: options.maxLength })
      .withMessage(`${fieldName} must be at most ${options.maxLength} characters`);
  }
  
  // Always trim and escape for XSS prevention
  chain = chain.trim().escape();
  
  return chain;
};

/**
 * Creates a validation chain for a body field.
 * Factory function for building common body field validations.
 * 
 * @param {string} fieldName - Name of the body field
 * @param {Object} options - Validation options
 * @param {boolean} [options.required=false] - Whether the field is required
 * @param {boolean} [options.isString=false] - Validate as string
 * @param {boolean} [options.isEmail=false] - Validate as email
 * @param {number} [options.minLength] - Minimum string length
 * @param {number} [options.maxLength] - Maximum string length
 * @returns {import('express-validator').ValidationChain} Validation chain
 * 
 * @example
 * const validateName = createBodyValidation('name', { required: true, maxLength: 100 });
 */
const createBodyValidation = (fieldName, options = {}) => {
  let chain = body(fieldName);
  
  if (!options.required) {
    chain = chain.optional();
  } else {
    chain = chain.notEmpty().withMessage(`${fieldName} is required`);
  }
  
  if (options.isString) {
    chain = chain.isString().withMessage(`${fieldName} must be a string`);
  }
  
  if (options.isEmail) {
    chain = chain.isEmail().withMessage(`${fieldName} must be a valid email`);
  }
  
  if (options.minLength) {
    chain = chain.isLength({ min: options.minLength })
      .withMessage(`${fieldName} must be at least ${options.minLength} characters`);
  }
  
  if (options.maxLength) {
    chain = chain.isLength({ max: options.maxLength })
      .withMessage(`${fieldName} must be at most ${options.maxLength} characters`);
  }
  
  // Always trim and escape for XSS prevention on string fields
  if (options.isString || !options.isEmail) {
    chain = chain.trim().escape();
  }
  
  return chain;
};

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Core middleware
  validateRequest,
  sanitizeQuery,
  
  // Validation chain builders
  createQueryValidation,
  createBodyValidation,
  
  // Re-export express-validator functions for convenience
  query,
  body,
  param,
  validationResult
};
