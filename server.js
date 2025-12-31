/**
 * @fileoverview Express.js HTTP Server Application
 * 
 * This module implements a simple Express.js web server that provides two HTTP GET endpoints:
 * - Root endpoint (/) returning a "Hello, World!" greeting
 * - Evening endpoint (/evening) returning a "Good evening" greeting
 * 
 * The server binds to localhost (127.0.0.1) on port 3000 by default.
 * 
 * @module server
 * @requires express
 * @version 1.0.0
 * @author hxu
 * @license MIT
 * 
 * @example
 * // Start the server
 * $ node server.js
 * // Server running at http://127.0.0.1:3000/
 * 
 * @example
 * // Test the endpoints
 * $ curl http://127.0.0.1:3000/
 * // Hello, World!
 * 
 * $ curl http://127.0.0.1:3000/evening
 * // Good evening
 */

'use strict';

// Import the Express.js framework
// Express is a minimal and flexible Node.js web application framework
// that provides robust features for web and mobile applications
const express = require('express');

/**
 * Server hostname configuration
 * @constant {string}
 * @description The IP address the server binds to. Using '127.0.0.1' (localhost)
 * restricts access to the local machine only. For external access, use '0.0.0.0'.
 */
const hostname = '127.0.0.1';

/**
 * Server port configuration
 * @constant {number}
 * @description The TCP port number the server listens on. Port 3000 is commonly
 * used for Node.js development servers. In production, consider using environment
 * variables: process.env.PORT || 3000
 */
const port = 3000;

/**
 * Express application instance
 * @constant {express.Application}
 * @description The main Express application object. This instance is used to
 * configure routes, middleware, and server settings. Created using the Express
 * factory function pattern.
 */
const app = express();

/**
 * Root endpoint handler - Hello World
 * 
 * @name GET /
 * @function
 * @memberof module:server
 * @description Handles HTTP GET requests to the root path ('/').
 * Returns a simple "Hello, World!" greeting as plain text.
 * 
 * @param {express.Request} req - The Express request object containing:
 *   - req.method: HTTP method (GET)
 *   - req.path: Request path (/)
 *   - req.headers: Request headers
 *   - req.query: Query string parameters
 * @param {express.Response} res - The Express response object used to send:
 *   - Status code (200 OK by default with res.send())
 *   - Content-Type header (text/html by default)
 *   - Response body
 * 
 * @returns {void} Sends "Hello, World!\n" as the HTTP response body
 * 
 * @example
 * // Request
 * GET / HTTP/1.1
 * Host: 127.0.0.1:3000
 * 
 * // Response
 * HTTP/1.1 200 OK
 * Content-Type: text/html; charset=utf-8
 * 
 * Hello, World!
 */
app.get('/', (req, res) => {
  // res.send() automatically sets Content-Type and Content-Length headers
  // The string is sent as the response body with HTTP 200 status
  res.send('Hello, World!\n');
});

/**
 * Evening endpoint handler - Good Evening greeting
 * 
 * @name GET /evening
 * @function
 * @memberof module:server
 * @description Handles HTTP GET requests to the '/evening' path.
 * Returns a "Good evening" greeting as plain text. This endpoint
 * demonstrates adding multiple routes to an Express application.
 * 
 * @param {express.Request} req - The Express request object containing:
 *   - req.method: HTTP method (GET)
 *   - req.path: Request path (/evening)
 *   - req.headers: Request headers
 *   - req.query: Query string parameters
 * @param {express.Response} res - The Express response object used to send:
 *   - Status code (200 OK by default with res.send())
 *   - Content-Type header (text/html by default)
 *   - Response body
 * 
 * @returns {void} Sends "Good evening" as the HTTP response body
 * 
 * @example
 * // Request
 * GET /evening HTTP/1.1
 * Host: 127.0.0.1:3000
 * 
 * // Response
 * HTTP/1.1 200 OK
 * Content-Type: text/html; charset=utf-8
 * 
 * Good evening
 */
app.get('/evening', (req, res) => {
  // Send the evening greeting as plain text response
  // Express handles serialization and header configuration automatically
  res.send('Good evening');
});

/**
 * Start the HTTP server
 * 
 * @description Binds and listens for connections on the specified host and port.
 * The callback function is invoked once the server is ready to accept connections.
 * 
 * app.listen() is a convenience method that internally creates an HTTP server
 * using Node.js's http.createServer() and calls server.listen() with the
 * Express app as the request handler.
 * 
 * @param {number} port - The port number to listen on (3000)
 * @param {string} hostname - The hostname to bind to ('127.0.0.1')
 * @param {Function} callback - Function called when server starts listening
 * 
 * @fires server#listening - Emitted when the server has been bound
 * 
 * @example
 * // Server startup output
 * Server running at http://127.0.0.1:3000/
 */
app.listen(port, hostname, () => {
  // Log server startup information to console
  // Template literal provides formatted URL for easy copy/paste testing
  console.log(`Server running at http://${hostname}:${port}/`);
});
