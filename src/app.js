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
 * @exports {import('express').Application} app - Configured Express application instance
 * @see module:src/routes - Route aggregator providing centralized route definitions
 */

const express = require('express');
const { mainRoutes } = require('./routes');

const app = express();

/**
 * Mount main routes at root path
 * 
 * Design decision: Routes are mounted at the root path '/' to preserve
 * the original URL structure without path prefixes. This allows the
 * application to respond directly to:
 *   - GET '/'        -> Returns "Hello, World!\n"
 *   - GET '/evening' -> Returns "Good evening\n"
 * 
 * The routes module uses the barrel pattern (centralized re-exports)
 * allowing this module to import all routes with a single require statement,
 * promoting clean dependency management and scalability.
 * 
 * @see module:src/routes - Route aggregator using barrel pattern
 * @see module:src/routes/main.routes - Individual route handler implementations
 */
app.use('/', mainRoutes);

module.exports = app;
