/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Middleware pipeline is registered before route mounting:
 * helmet, cors, body parsers, Morgan request logger
 * 
 * Error-handling middleware is registered after all routes.
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 */

const express = require('express');
const { applyMiddleware } = require('./middleware');
const { mainRoutes, healthRoutes, apiRoutes } = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

/**
 * Register middleware pipeline before routes
 * Applies helmet, cors, body parsers, and Morgan request logger
 */
applyMiddleware(app);

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount health check route
 * - GET '/health' -> healthRoutes handles this
 */
app.use('/health', healthRoutes);

/**
 * Mount API namespace routes
 * - GET '/api/status' -> apiRoutes handles this
 */
app.use('/api', apiRoutes);

/**
 * Register error-handling middleware after all routes
 * Must have 4-argument signature for Express to recognize as error handler
 */
app.use(errorHandler);

module.exports = app;
