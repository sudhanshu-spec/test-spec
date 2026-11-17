/**
 * Main Application Routes Module
 *
 * This module defines the main GET route handlers using Express Router.
 * Each route contract below is served by exactly one handler registered
 * on that single router.
 *
 * Route contracts:
 * - GET '/' returns 'Hello, World!\n' as text/html (with trailing newline)
 * - GET '/evening' returns 'Good evening' as text/html (no trailing newline)
 * - GET '/good-evening' returns 'Good evening' as text/plain (no trailing newline)
 *
 * @module src/routes/main.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Root route handler
 * Responds with 'Hello, World!\n' as text/html
 *
 * @route GET /
 * @returns {string} 'Hello, World!\n'
 */
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * Responds with 'Good evening' as text/html
 *
 * @route GET /evening
 * @returns {string} 'Good evening'
 */
router.get('/evening', (req, res) => {
  res.send('Good evening');
});

/**
 * Good evening route handler
 * Responds with 'Good evening' as plain text
 *
 * Deliberately serves the same body as GET /evening under text/plain, while
 * /evening keeps text/html; both registrations stay, so clients of /evening
 * are unaffected.
 *
 * @route GET /good-evening
 * @returns {string} 'Good evening'
 */
router.get('/good-evening', (req, res) => {
  res.type('text/plain').send('Good evening');
});

module.exports = router;
