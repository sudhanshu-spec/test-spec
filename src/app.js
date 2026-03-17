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
const { configureRoutes } = require('./routes');

const app = express();

/**
 * Mount all routes on the application
 * Delegates to configureRoutes() which registers all route modules.
 * This preserves the original route paths:
 * - GET '/' -> mainRouter handles this
 * - GET '/evening' -> mainRouter handles this
 */
configureRoutes(app);

module.exports = app;
