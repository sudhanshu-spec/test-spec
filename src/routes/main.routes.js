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
 * @module src/routes/main.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Root route handler
 * Responds with 'Hello, World!\n' - exact match to original server.js line 9
 * 
 * @route GET /
 * @returns {string} 'Hello, World!\n'
 */
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * Responds with 'Good evening' - exact match to original server.js line 13
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
