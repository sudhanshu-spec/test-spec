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

/**
 * Express module import
 * @type {import('express')}
 */
const express = require('express');
const { mainRoutes } = require('./routes');

/**
 * Configured Express application instance
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
 * Export the configured Express application
 * @exports src/app
 * @type {import('express').Application}
 */
module.exports = app;
