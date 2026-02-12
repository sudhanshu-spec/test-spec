/**
 * Main Application Routes Module
 *
 * This module defines the main GET route handlers using Express Router.
 * Routes are extracted from original server.js lines 8-14 with exact
 * behavioral preservation.
 *
 * Input validation middleware (sanitizeQuery, handleValidationErrors) is applied
 * to all route handlers for defense-in-depth against injection attacks. The
 * validation is non-breaking: when no query parameters are present, routes
 * behave identically to before.
 *
 * Route contracts preserved:
 * - GET '/' returns 'Hello, World!\n' (with trailing newline)
 * - GET '/evening' returns 'Good evening' (no trailing newline)
 *
 * @module src/routes/main.routes
 */

'use strict';

const express = require('express');
const { sanitizeQuery, handleValidationErrors } = require('../middleware/validator');

const router = express.Router();

/**
 * Root route handler with input validation.
 * Sanitizes and validates query parameters before processing.
 * Responds with 'Hello, World!\n' - exact match to original server.js line 9.
 *
 * @route GET /
 * @returns {string} 'Hello, World!\n'
 */
router.get('/', sanitizeQuery, handleValidationErrors, (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler with input validation.
 * Sanitizes and validates query parameters before processing.
 * Responds with 'Good evening' - exact match to original server.js line 13.
 *
 * @route GET /evening
 * @returns {string} 'Good evening'
 */
router.get('/evening', sanitizeQuery, handleValidationErrors, (req, res) => {
  res.send('Good evening');
});

module.exports = router;
