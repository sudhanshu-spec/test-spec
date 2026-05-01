/**
 * Main Application Routes Module
 * 
 * This module defines the main GET route handlers using Express Router.
 * Route contracts are preserved with exact behavioral fidelity to the
 * historical tutorial server contract.
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
 * Responds with 'Hello, World!\n' (14 bytes, includes trailing newline).
 * 
 * @route GET /
 * @returns {string} 'Hello, World!\n'
 */
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * Responds with 'Good evening' (12 bytes, no trailing newline).
 * 
 * @route GET /evening
 * @returns {string} 'Good evening'
 */
router.get('/evening', (req, res) => {
  res.send('Good evening');
});

module.exports = router;
