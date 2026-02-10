/**
 * @fileoverview Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * using the App Factory pattern. It separates application configuration
 * from HTTP server initialization (which remains in server.js), enabling
 * unit testing without starting the actual server.
 *
 * Responsibilities:
 * - Registers the middleware pipeline (helmet, cors, body parsers, Morgan
 *   request logger) via the applyMiddleware orchestrator before any routes
 * - Mounts the main routes at '/' (GET /, GET /evening)
 * - Mounts the health-check route at '/health' (GET /health liveness probe)
 * - Mounts the API namespace routes at '/api' (GET /api/status)
 * - Registers the centralized error-handling middleware after all routes
 *   as the final error boundary
 *
 * Design pattern: Factory pattern — creates configured Express app without
 * calling app.listen(), preserving testability and separation of concerns
 *
 * @module src/app
 */

const express = require('express');
const { applyMiddleware } = require('./middleware');
const { mainRoutes, healthRoutes, apiRoutes } = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

/**
 * Apply middleware pipeline before route handlers.
 * Registers in security-first order: helmet → cors → body parsers → Morgan request logger.
 * @see module:src/middleware~applyMiddleware
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
 * Mount health-check route for production liveness probes
 * - GET '/health' -> healthRoutes handles this
 */
app.use('/health', healthRoutes);

/**
 * Mount API namespace routes
 * - GET '/api/status' -> apiRoutes handles this
 */
app.use('/api', apiRoutes);

/**
 * Register centralized error-handling middleware after all routes.
 * Uses the Express 4-argument signature (err, req, res, next) to catch
 * unhandled errors and return structured JSON error responses.
 * @see module:src/middleware/errorHandler~errorHandler
 */
app.use(errorHandler);

module.exports = app;
