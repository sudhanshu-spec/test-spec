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
const { errorHandler, notFoundHandler } = require('./middleware');

const app = express();

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount 404 catch-all handler
 * Must be placed after all route registrations to catch unmatched requests.
 * Returns structured JSON 404 responses instead of Express default text.
 */
app.use(notFoundHandler);

/**
 * Mount centralized error handler
 * Must be the LAST middleware in the stack.
 * Uses the 4-argument (err, req, res, next) Express error-handling signature.
 * Produces structured JSON error responses with production-safe stack trace suppression.
 */
app.use(errorHandler);

module.exports = app;
