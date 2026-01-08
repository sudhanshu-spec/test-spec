/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 * @exports {import('express').Application} Configured Express application instance
 * 
 * @see module:src/routes - Route definitions mounted on this application
 * @see module:src/config - Configuration values used by server.js when starting this app
 * 
 * @example
 * // Import for integration testing with supertest
 * const request = require('supertest');
 * const app = require('./src/app');
 * 
 * // Test the root endpoint
 * request(app)
 *   .get('/')
 *   .expect(200)
 *   .expect('Hello, World!\n');
 * 
 * @example
 * // Import for custom server setup
 * const app = require('./src/app');
 * const http = require('http');
 * 
 * const server = http.createServer(app);
 * server.listen(3000);
 */

const express = require('express');
const { mainRoutes } = require('./routes');

const app = express();

/**
 * Mount main routes at root path using Express middleware chain
 * 
 * Express processes incoming requests through a middleware stack in registration order.
 * When app.use('/', mainRoutes) is called, the mainRoutes router is mounted at the
 * root path '/'. This means:
 * 
 * 1. All incoming requests first hit the Express app
 * 2. The middleware chain processes the request sequentially
 * 3. When a request path matches '/' (root mount point), mainRoutes takes over
 * 4. mainRoutes then matches the full path against its defined routes
 * 
 * Route preservation from original implementation:
 * - GET '/' -> mainRoutes handles this, returns 'Hello, World!\n'
 * - GET '/evening' -> mainRoutes handles this, returns 'Good evening'
 * 
 * The root mount point '/' ensures routes remain at their original paths.
 * Using a different mount point (e.g., '/api') would prefix all routes.
 */
app.use('/', mainRoutes);

module.exports = app;
