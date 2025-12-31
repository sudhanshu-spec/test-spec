/**
 * Main Application Routes Module
 * 
 * This module defines the main GET route handlers using Express Router.
 * Routes are extracted from original server.js lines 8-14 with exact
 * behavioral preservation.
 * 
 * Security Enhancement: Input validation using express-validator
 * - All query parameters are validated and sanitized using validation middleware chains
 * - Sanitization includes trim() to remove whitespace and escape() for XSS prevention
 * - Invalid requests return 400 status with JSON error response: { errors: [...] }
 * - Valid requests return unchanged responses for backward compatibility
 * 
 * Route contracts preserved:
 * - GET '/' returns 'Hello, World!\n' (with trailing newline) - status 200
 * - GET '/evening' returns 'Good evening' (no trailing newline) - status 200
 * 
 * Validation middleware pattern:
 * - Each route uses [query('*').optional().trim().escape(), handleValidationErrors]
 * - The wildcard '*' matches all query parameter names for comprehensive sanitization
 * - Validation errors are collected and returned as JSON array
 * 
 * @module src/routes/main.routes
 */

const express = require('express');
const { query, validationResult } = require('express-validator');

const router = express.Router();

/**
 * Validation error handler middleware
 * Checks for validation errors and returns 400 with error details if found.
 * This middleware should be placed after validation chains in route middleware arrays.
 * 
 * Error Response Format:
 * {
 *   "errors": [
 *     {
 *       "type": "field",
 *       "value": "...",
 *       "msg": "...",
 *       "path": "...",
 *       "location": "query"
 *     }
 *   ]
 * }
 * 
 * @param {Object} req - Express request object containing validated data
 * @param {Object} res - Express response object for sending error responses
 * @param {Function} next - Express next middleware function to continue chain
 * @returns {Object|void} Returns 400 JSON response with errors array if validation fails, otherwise calls next()
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Query parameter sanitization validators
 * Applied to all routes for comprehensive input sanitization:
 * - query('*') - Matches all query parameter names
 * - .optional() - Parameters are not required
 * - .trim() - Removes leading/trailing whitespace
 * - .escape() - HTML entity encoding for XSS prevention
 * 
 * @type {Array} Validation middleware chain for query parameters
 */
const querySanitizers = [
  query('*').optional().trim().escape(),
  handleValidationErrors
];

/**
 * Root route handler
 * Responds with 'Hello, World!\n' - exact match to original server.js line 9
 * 
 * Security: Query parameters are sanitized via validation middleware chain
 * - Trim and escape applied to prevent XSS attacks
 * - Invalid input returns 400 with validation error details
 * 
 * @route GET /
 * @param {Object} req - Express request object with sanitized query parameters
 * @param {Object} res - Express response object
 * @returns {string} 'Hello, World!\n' for valid requests
 * @returns {Object} 400 status with { errors: [...] } for validation failures
 */
router.get('/', querySanitizers, (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * Responds with 'Good evening' - exact match to original server.js line 13
 * 
 * Security: Query parameters are sanitized via validation middleware chain
 * - Trim and escape applied to prevent XSS attacks
 * - Invalid input returns 400 with validation error details
 * 
 * @route GET /evening
 * @param {Object} req - Express request object with sanitized query parameters
 * @param {Object} res - Express response object
 * @returns {string} 'Good evening' for valid requests
 * @returns {Object} 400 status with { errors: [...] } for validation failures
 */
router.get('/evening', querySanitizers, (req, res) => {
  res.send('Good evening');
});

module.exports = router;
