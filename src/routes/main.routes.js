/**
 * Main Application Routes Module
 *
 * @description Primary route handler module that defines Express Router GET endpoints
 * for the application. This module creates and configures an Express Router instance
 * with two GET route handlers, following the Express Router pattern for modular route
 * definition. The router is exported for mounting by the application factory
 * (`src/app.js`) via the routes barrel (`src/routes/index.js`).
 *
 * Route contracts preserved:
 * - GET '/' returns 'Hello, World!\n' (with trailing newline)
 * - GET '/evening' returns 'Good evening' (no trailing newline)
 *
 * @module src/routes/main.routes
 * @requires express
 */

/** @requires express - Express 5.1.0 framework, used for Router factory */
const express = require('express');

/**
 * Express Router instance for main application routes.
 * @type {express.Router}
 */
const router = express.Router();

/**
 * Root route handler
 * Responds with 'Hello, World!\n' - exact match to original server.js line 9
 *
 * @route GET /
 * @param {express.Request} req - Express Request object (not used in handler body but part of the handler signature)
 * @param {express.Response} res - Express Response object used to send the greeting response
 * @returns {string} 'Hello, World!\n'
 * @example
 * // Request:
 * // curl -s http://127.0.0.1:3000/
 * //
 * // Response (200 OK):
 * // Hello, World!
 */
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * Responds with 'Good evening' - exact match to original server.js line 13
 *
 * @route GET /evening
 * @param {express.Request} req - Express Request object (not used in handler body but part of the handler signature)
 * @param {express.Response} res - Express Response object used to send the evening greeting
 * @returns {string} 'Good evening'
 * @example
 * // Request:
 * // curl -s http://127.0.0.1:3000/evening
 * //
 * // Response (200 OK):
 * // Good evening
 */
router.get('/evening', (req, res) => {
  res.send('Good evening');
});

// Export the configured Express Router instance for mounting in src/app.js via the routes barrel (src/routes/index.js)
module.exports = router;
