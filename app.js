/**
 * app.js - Express Application Configuration
 * 
 * This module contains the Express application setup and route definitions,
 * extracted from server.js for testability. By separating the app configuration
 * from server startup, this allows Supertest to manage the server lifecycle
 * during testing without binding to a port.
 * 
 * Exports: Express app instance
 * 
 * Routes:
 *   GET /         - Returns "Hello, World!\n" (with trailing newline)
 *   GET /evening  - Returns "Good evening"
 */

const express = require('express');

// Initialize Express application instance
const app = express();

/**
 * Root route handler
 * GET / - Returns a greeting message with trailing newline
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Sends "Hello, World!\n" as response
 */
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * GET /evening - Returns an evening greeting message
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Sends "Good evening" as response
 */
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

// Export the Express app instance for use by server.js and test files
// This allows Supertest to manage server lifecycle during testing
module.exports = app;
