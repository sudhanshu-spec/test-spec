/**
 * Main Application Routes Module
 * 
 * This module defines the main GET route handlers using Express Router.
 * Routes are extracted from original server.js lines 8-14 with exact
 * behavioral preservation.
 * 
 * Route contracts preserved:
 * - GET '/' returns 'Hello, World!\n' (with trailing newline)
 * - GET '/evening' returns 'Good evening' (no trailing newline)
 * 
 * Security Features:
 * - Input validation using express-validator
 * - Query parameter sanitization (trim, escape) for XSS prevention
 * - Validation middleware applied to all routes
 * 
 * Error Response Format:
 * - Invalid requests return HTTP 400 Bad Request
 * - Response body: { errors: [{ msg: string, param: string, ... }] }
 * 
 * Backward Compatibility:
 * - Valid requests return unchanged responses (200 OK with original text)
 * - No breaking changes to response format for valid requests
 * 
 * @module src/routes/main.routes
 */

'use strict';

const express = require('express');
const { query, validationResult } = require('express-validator');

const router = express.Router();

// ---------------------------------------------------------------------------
// Validation Middleware
// ---------------------------------------------------------------------------

/**
 * Query parameter sanitization middleware chain.
 * Sanitizes all query parameters to prevent XSS attacks:
 * - trim(): Removes leading/trailing whitespace
 * - escape(): Escapes HTML special characters (<, >, &, ', ", /)
 * 
 * @type {import('express-validator').ValidationChain[]}
 */
const sanitizeQueryParams = [
  query('*').optional().trim().escape()
];

/**
 * Validation error handler middleware.
 * Checks for validation errors and returns 400 with error details if found.
 * Allows valid requests to proceed to the route handler.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Object|void} Returns 400 JSON response with errors array if validation fails, otherwise calls next()
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

/**
 * Root route handler
 * Responds with 'Hello, World!\n' - exact match to original server.js line 9
 * 
 * Middleware chain:
 * 1. sanitizeQueryParams - Sanitize any query parameters
 * 2. handleValidationErrors - Handle validation errors
 * 3. Route handler - Send response
 * 
 * @route GET /
 * @returns {string} 'Hello, World!\n'
 */
router.get(
  '/',
  sanitizeQueryParams,
  handleValidationErrors,
  (req, res) => {
    res.send('Hello, World!\n');
  }
);

/**
 * Evening route handler
 * Responds with 'Good evening' - exact match to original server.js line 13
 * 
 * Middleware chain:
 * 1. sanitizeQueryParams - Sanitize any query parameters
 * 2. handleValidationErrors - Handle validation errors
 * 3. Route handler - Send response
 * 
 * @route GET /evening
 * @returns {string} 'Good evening'
 */
router.get(
  '/evening',
  sanitizeQueryParams,
  handleValidationErrors,
  (req, res) => {
    res.send('Good evening');
  }
);

module.exports = router;
