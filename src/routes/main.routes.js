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
 * @requires express - Express framework for Router creation
 */

// Import Express to access Router factory method
// Router provides modular, mountable route handlers
const express = require('express');

// Create router instance - Router is a mini Express app for route handling
// Allows routes to be defined in isolation and mounted in app.js
const router = express.Router();

/**
 * Root route handler
 * Responds with 'Hello, World!\n' - exact match to original server.js line 9
 * 
 * @route GET /
 * @returns {string} 'Hello, World!\n'
 * @example
 * // Test with curl:
 * // curl -s http://127.0.0.1:3000/
 * // Returns: "Hello, World!\n"
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
 * @example
 * // Test with curl:
 * // curl -s http://127.0.0.1:3000/evening
 * // Returns: "Good evening"
 */
router.get('/evening', (req, res) => {
  res.send('Good evening');
});

/**
 * Express Router with registered route handlers
 * @exports module:src/routes/main.routes
 * @type {express.Router}
 */
// Export router for mounting in app.js
module.exports = router;
