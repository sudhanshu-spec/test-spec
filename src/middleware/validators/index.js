/**
 * Input Validation Middleware Barrel Export Module
 *
 * This module provides centralized exports for input validation utilities using
 * express-validator@^7.2.1. It implements SEC-002 (Input Validation) requirement
 * for request data sanitization as specified in the security middleware chain.
 *
 * Security Purpose:
 * - Prevents injection attacks (SQL, NoSQL, Command injection) through proper input validation
 * - Provides request data sanitization capabilities per OWASP A1:2017 guidelines
 * - Enables per-route input validation with chainable validators
 *
 * Features:
 * - Validation chain builders (body, query, param) for different request data sources
 * - validationResult helper for error extraction and validation state checking
 * - handleValidationErrors middleware for standardized error response handling
 *
 * @module src/middleware/validators
 * @see {@link https://express-validator.github.io/docs/} Express Validator Documentation
 * @see {@link https://owasp.org/Top10/} OWASP Top 10 Security Guidelines
 *
 * @example
 * // Usage in route files:
 * const { body, query, param, handleValidationErrors } = require('../middleware/validators');
 *
 * // Validate POST request body
 * router.post('/users',
 *   body('email').isEmail().normalizeEmail(),
 *   body('name').notEmpty().trim().escape(),
 *   body('age').optional().isInt({ min: 0, max: 150 }),
 *   handleValidationErrors,
 *   userController.create
 * );
 *
 * // Validate query parameters
 * router.get('/search',
 *   query('q').notEmpty().trim().escape(),
 *   query('limit').optional().isInt({ min: 1, max: 100 }),
 *   handleValidationErrors,
 *   searchController.search
 * );
 *
 * // Validate URL parameters
 * router.get('/users/:id',
 *   param('id').isInt({ min: 1 }),
 *   handleValidationErrors,
 *   userController.getById
 * );
 */

'use strict';

const { body, query, param, validationResult } = require('express-validator');

/**
 * Middleware that handles validation errors from express-validator chains.
 *
 * This middleware checks for validation errors accumulated from preceding
 * validation chain middleware. If errors exist, it returns a 400 Bad Request
 * response with a JSON body containing the error details. If no errors exist,
 * it passes control to the next middleware/handler.
 *
 * Response Format (on error):
 * {
 *   "errors": [
 *     {
 *       "type": "field",
 *       "value": "invalid-value",
 *       "msg": "Invalid value",
 *       "path": "fieldName",
 *       "location": "body"
 *     }
 *   ]
 * }
 *
 * @function handleValidationErrors
 * @param {import('express').Request} req - Express request object containing validation results
 * @param {import('express').Response} res - Express response object for sending error response
 * @param {import('express').NextFunction} next - Express next function to continue middleware chain
 * @returns {void|import('express').Response} Returns 400 response if errors exist, otherwise calls next()
 *
 * @example
 * // Use after validation chains, before route handler
 * router.post('/resource',
 *   body('field').notEmpty(),
 *   handleValidationErrors,  // Returns 400 if 'field' is empty
 *   resourceController.create
 * );
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }

  next();
};

/**
 * @typedef {Object} ValidatorExports
 * @property {Function} body - Validation chain builder for request body parameters.
 *   Supports methods: isEmail(), isInt(), isLength(), notEmpty(), trim(), escape(), normalizeEmail()
 * @property {Function} query - Validation chain builder for URL query parameters.
 *   Supports methods: isEmail(), isInt(), isLength(), notEmpty(), trim(), escape(), optional()
 * @property {Function} param - Validation chain builder for URL route parameters.
 *   Supports methods: isInt(), isUUID(), isMongoId(), notEmpty(), trim(), escape()
 * @property {Function} validationResult - Extracts validation errors from request.
 *   Supports methods: isEmpty(), array(), mapped(), formatWith()
 * @property {Function} handleValidationErrors - Middleware for standardized error handling.
 */

/**
 * Validation chain builder for request body parameters.
 *
 * Creates a validation chain that validates data from req.body.
 * Chain methods include validators (isEmail, isInt, etc.) and
 * sanitizers (trim, escape, normalizeEmail, etc.).
 *
 * @function body
 * @param {string|string[]} fields - Field name(s) to validate in request body
 * @returns {import('express-validator').ValidationChain} Chainable validation object
 *
 * @example
 * // Single field validation
 * body('email').isEmail().normalizeEmail()
 *
 * // Multiple fields with same validation
 * body(['firstName', 'lastName']).notEmpty().trim()
 *
 * // Chained validators and sanitizers
 * body('password')
 *   .isLength({ min: 8, max: 128 })
 *   .notEmpty()
 *   .trim()
 */

/**
 * Validation chain builder for URL query parameters.
 *
 * Creates a validation chain that validates data from req.query.
 * Commonly used for search parameters, pagination, and filters.
 *
 * @function query
 * @param {string|string[]} fields - Field name(s) to validate in query string
 * @returns {import('express-validator').ValidationChain} Chainable validation object
 *
 * @example
 * // Optional query parameter with default
 * query('page').optional().isInt({ min: 1 }).toInt()
 *
 * // Required search term
 * query('search').notEmpty().trim().escape()
 */

/**
 * Validation chain builder for URL route parameters.
 *
 * Creates a validation chain that validates data from req.params.
 * Used for validating dynamic route segments like IDs.
 *
 * @function param
 * @param {string|string[]} fields - Field name(s) to validate in route parameters
 * @returns {import('express-validator').ValidationChain} Chainable validation object
 *
 * @example
 * // Validate numeric ID parameter
 * param('id').isInt({ min: 1 })
 *
 * // Validate UUID parameter
 * param('uuid').isUUID(4)
 *
 * // Validate MongoDB ObjectId
 * param('mongoId').isMongoId()
 */

/**
 * Extracts validation results from the request object.
 *
 * Returns a Result object containing validation errors (if any)
 * accumulated from all preceding validation chains.
 *
 * @function validationResult
 * @param {import('express').Request} req - Express request object
 * @returns {import('express-validator').Result} Validation result object
 *
 * @example
 * // Check if validation passed
 * const result = validationResult(req);
 * if (result.isEmpty()) {
 *   // No errors, proceed with request handling
 * }
 *
 * // Get errors as array
 * const errors = result.array();
 *
 * // Get errors mapped by field
 * const errorMap = result.mapped();
 *
 * // Format errors with custom formatter
 * const formattedErrors = result.formatWith(err => err.msg);
 */

module.exports = {
  body,
  query,
  param,
  validationResult,
  handleValidationErrors
};
