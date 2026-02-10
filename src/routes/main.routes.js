/**
 * Main Application Routes Module
 *
 * Defines the primary GET route handlers for the Express.js application
 * using the Express Router pattern. Each handler is a synchronous arrow
 * function that sends an exact text/html response via res.send().
 *
 * Route contracts:
 * - GET '/' returns 'Hello, World!\n' (14 characters, trailing newline)
 * - GET '/evening' returns 'Good evening' (12 characters, no trailing newline)
 *
 * @module src/routes/main.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Root route handler
 * Responds with 'Hello, World!\n' including trailing newline character.
 * Express res.send() sets Content-Type to text/html; charset=utf-8 automatically.
 *
 * @route GET /
 * @returns {string} 'Hello, World!\n'
 */
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * Responds with 'Good evening' without trailing newline character.
 * Express res.send() sets Content-Type to text/html; charset=utf-8 automatically.
 *
 * @route GET /evening
 * @returns {string} 'Good evening'
 */
router.get('/evening', (req, res) => {
  res.send('Good evening');
});

module.exports = router;
