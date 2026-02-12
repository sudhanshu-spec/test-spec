/**
 * Input Validation Middleware Module
 *
 * This module provides reusable input validation and sanitization middleware
 * using express-validator. It exports query parameter sanitization rules and
 * a validation error handler for defense-in-depth against injection attacks.
 *
 * Exports:
 * - sanitizeQuery: Array of express-validator chain rules that trim and escape
 *   all query parameter values to prevent XSS and injection attacks
 * - handleValidationErrors: Express middleware that checks for validation errors
 *   and returns HTTP 400 with error details if any exist
 *
 * Usage in route handlers:
 *   router.get('/', sanitizeQuery, handleValidationErrors, (req, res) => { ... });
 *
 * When no query parameters are present, routes behave identically to before
 * validation was added (non-breaking, additive middleware).
 *
 * @module src/middleware/validator
 */

'use strict';

const { query, validationResult } = require('express-validator');

/**
 * Array of express-validator chain rules for query parameter sanitization.
 * Trims whitespace and escapes HTML entities in all query parameter values
 * to prevent cross-site scripting (XSS) and injection attacks.
 *
 * Applied as route-level middleware before the route handler callback.
 * When no query parameters are present, this middleware passes through
 * without modification.
 *
 * @type {import('express-validator').ValidationChain[]}
 */
const sanitizeQuery = [
  query('*').optional().trim().escape()
];

/**
 * Express middleware that checks for validation errors from express-validator
 * and returns HTTP 400 Bad Request with error details if any validation
 * rules failed. If no errors are present, calls next() to proceed to the
 * route handler.
 *
 * Response format on validation failure:
 * {
 *   "status": 400,
 *   "error": "Bad Request",
 *   "message": "Input validation failed",
 *   "errors": [ { "type": "field", "msg": "...", "path": "...", "location": "query" } ]
 * }
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Input validation failed',
      errors: errors.array()
    });
  }

  return next();
}

module.exports = {
  sanitizeQuery,
  handleValidationErrors
};
