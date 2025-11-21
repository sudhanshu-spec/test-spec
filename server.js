/**
 * @fileoverview Express.js web server application providing greeting endpoints.
 * This simple HTTP server demonstrates Express.js routing and request handling
 * with two GET endpoints for greeting messages.
 * 
 * @module server
 * @requires express@5.1.0
 * @description Simple Node.js web server built with Express.js framework,
 * demonstrating routing, request handling, and API endpoint implementation.
 * The server binds to localhost (127.0.0.1) on port 3000 for development security.
 * 
 * @author hxu
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Installation and startup
 * npm install
 * npm start
 * 
 * // Verify endpoints
 * curl http://127.0.0.1:3000/
 * curl http://127.0.0.1:3000/evening
 */

// Express.js framework import using CommonJS module system (require syntax)
const express = require('express');

// Localhost-only binding (127.0.0.1) for development security - prevents external access
const hostname = '127.0.0.1';
// Standard development port 3000, configurable via PORT environment variable
const port = 3000;

// Express app initialization - creates application instance for middleware and route registration
const app = express();

/**
 * Root endpoint returning greeting message.
 * 
 * @route GET /
 * @description Root endpoint that returns a simple "Hello, World!" greeting message
 * in plain text format. This endpoint demonstrates basic Express.js routing and
 * response handling.
 * 
 * @param {Object} req - Express.Request object containing the HTTP request information
 * @param {Object} res - Express.Response object for sending the HTTP response
 * @returns {void} Sends plain text response 'Hello, World!\n'
 * 
 * @example
 * // Using curl to test the endpoint
 * curl http://127.0.0.1:3000/
 * // Expected output: Hello, World!
 */
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening greeting endpoint.
 * 
 * @route GET /evening
 * @description Evening greeting endpoint that returns a "Good evening" message
 * in plain text format. This endpoint is part of the greeting API family
 * demonstrating multiple route handling in Express.js.
 * 
 * @param {Object} req - Express.Request object containing the HTTP request information
 * @param {Object} res - Express.Response object for sending the HTTP response
 * @returns {void} Sends plain text response 'Good evening'
 * 
 * @example
 * // Using curl to test the endpoint
 * curl http://127.0.0.1:3000/evening
 * // Expected output: Good evening
 */
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

/**
 * Server startup - binds the Express application to the specified hostname and port.
 * The callback function executes when the server is ready to accept connections.
 * Server runs continuously until the process is terminated (Ctrl+C).
 */
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
