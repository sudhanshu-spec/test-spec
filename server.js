/**
 * @fileoverview Express.js server implementation for Hello World application.
 * 
 * This server provides a simple REST API with two endpoints:
 * - GET / - Returns a greeting message "Hello, World!"
 * - GET /evening - Returns an evening greeting "Good evening"
 * 
 * The server uses Express.js 5.x framework for routing and HTTP handling,
 * replacing the native Node.js http module for cleaner, more maintainable code.
 * 
 * @author hxu
 * @version 1.0.0
 * @license MIT
 * @requires express
 */

'use strict';

// Import the Express.js framework
// Express provides a robust set of features for web and mobile applications
const express = require('express');

/**
 * Server hostname configuration.
 * Using 127.0.0.1 (localhost) restricts access to local machine only.
 * For external access, change to '0.0.0.0' to bind to all network interfaces.
 * 
 * @constant {string}
 * @default '127.0.0.1'
 */
const hostname = '127.0.0.1';

/**
 * Server port configuration.
 * Port 3000 is commonly used for Node.js development servers.
 * Ensure this port is not in use by other applications.
 * 
 * @constant {number}
 * @default 3000
 */
const port = 3000;

/**
 * Express application instance.
 * This is the main application object that handles routing,
 * middleware, and HTTP request/response processing.
 * 
 * @type {import('express').Express}
 */
const app = express();

/**
 * Root endpoint handler.
 * Handles GET requests to the root path ('/') and returns a greeting message.
 * 
 * @name GET /
 * @function
 * @memberof module:server
 * @param {import('express').Request} req - Express request object containing HTTP request information
 * @param {import('express').Response} res - Express response object for sending HTTP responses
 * @returns {void} Sends 'Hello, World!\n' as plain text response with 200 status
 * 
 * @example
 * // Request:
 * // curl http://127.0.0.1:3000/
 * 
 * // Response:
 * // Hello, World!
 */
app.get('/', (req, res) => {
  // Send a simple greeting message as plain text
  // The \n provides a newline for cleaner command-line output
  res.send('Hello, World!\n');
});

/**
 * Evening greeting endpoint handler.
 * Handles GET requests to '/evening' path and returns an evening greeting.
 * 
 * @name GET /evening
 * @function
 * @memberof module:server
 * @param {import('express').Request} req - Express request object containing HTTP request information
 * @param {import('express').Response} res - Express response object for sending HTTP responses
 * @returns {void} Sends 'Good evening' as plain text response with 200 status
 * 
 * @example
 * // Request:
 * // curl http://127.0.0.1:3000/evening
 * 
 * // Response:
 * // Good evening
 */
app.get('/evening', (req, res) => {
  // Send an evening-specific greeting message
  res.send('Good evening');
});

/**
 * Start the Express server and begin listening for incoming connections.
 * The callback function is executed once the server is successfully bound
 * to the specified hostname and port.
 * 
 * @function
 * @param {number} port - The port number to listen on
 * @param {string} hostname - The hostname/IP address to bind to
 * @param {Function} callback - Callback executed when server starts listening
 * 
 * @fires Server#listening
 * @see {@link https://expressjs.com/en/api.html#app.listen|Express app.listen() documentation}
 */
app.listen(port, hostname, () => {
  // Log server startup information to console
  // This confirms the server is running and shows the access URL
  console.log(`Server running at http://${hostname}:${port}/`);
});
