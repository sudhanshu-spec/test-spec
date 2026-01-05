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
 */

const express = require('express');
const { mainRoutes } = require('./routes');

/**
 * Configured Express application instance
 * 
 * This application instance is pre-configured with all route handlers
 * and middleware. It can be used directly for testing or passed to
 * http.createServer() or app.listen() for HTTP server initialization.
 * 
 * @type {import('express').Application}
 */
const app = express();

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Exports the configured Express application instance
 * 
 * The exported application is fully configured with all routes mounted
 * and ready for HTTP server binding. Import this module in server.js
 * to bind the application to a host and port.
 * 
 * @exports {import('express').Application} The configured Express app ready for HTTP binding
 * @see module:server - For HTTP server initialization
 * @see module:src/routes - For route definitions
 */
module.exports = app;
