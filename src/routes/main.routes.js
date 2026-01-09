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
 * Endpoint Summary:
 * | Endpoint  | Method | Response        | Content-Type |
 * |-----------|--------|-----------------|--------------|
 * | /         | GET    | Hello, World!\n | text/html    |
 * | /evening  | GET    | Good evening    | text/html    |
 * 
 * @module src/routes/main.routes
 */

const express = require('express');

// ---------------------------------------------------------------------------
// Router Initialization
// ---------------------------------------------------------------------------
// Create Express Router instance to define modular route handlers.
// The Router acts as a mini Express application capable of performing
// middleware and routing functions, enabling route modularity.
const router = express.Router();

/**
 * Root route handler
 * Responds with 'Hello, World!\n' - exact match to original server.js line 9
 * 
 * @route GET /
 * @param {Express.Request} req - Express request object
 * @param {Express.Response} res - Express response object
 * @returns {void} Sends response directly to client
 * @example
 * // Test root endpoint
 * curl -s http://127.0.0.1:3000/
 * // Output: Hello, World!
 */
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * Responds with 'Good evening' - exact match to original server.js line 13
 * 
 * @route GET /evening
 * @param {Express.Request} req - Express request object
 * @param {Express.Response} res - Express response object
 * @returns {void} Sends response directly to client
 * @example
 * // Test evening endpoint
 * curl -s http://127.0.0.1:3000/evening
 * // Output: Good evening
 */
router.get('/evening', (req, res) => {
  res.send('Good evening');
});

// ---------------------------------------------------------------------------
// Route Origin Reference
// ---------------------------------------------------------------------------
// Route handlers above originate from original server.js lines 8-14.
// Response strings preserved exactly for behavioral compatibility.

/**
 * @exports {express.Router} Express router instance with registered routes
 */
module.exports = router;
