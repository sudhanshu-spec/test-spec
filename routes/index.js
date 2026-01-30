/**
 * Routes Aggregator Module
 * 
 * Express Router aggregator that serves as the entry point for all route modules.
 * Imports and mounts the api.js router to combine all application routes into
 * a single exported router.
 * 
 * This modular structure enables:
 * - Scalable API organization
 * - Easy addition of new route modules (e.g., /api/v2, /admin)
 * - Separation of concerns
 * - Easier testing of individual route modules
 * 
 * @module routes/index
 * @requires express
 * @requires ./api
 */

'use strict';

const express = require('express');
const router = express.Router();

// Import route modules
const apiRoutes = require('./api');

/**
 * Mount API routes at root level
 * 
 * The api routes handle:
 * - GET / - Hello World response
 * - GET /evening - Evening greeting
 * - GET /health - Health check endpoint
 */
router.use('/', apiRoutes);

/**
 * 404 Not Found Handler
 * 
 * Catch-all for undefined routes. Creates an error with 404 status
 * and passes it to the error handler middleware.
 * 
 * This must be the last route definition before error handlers.
 */
router.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

module.exports = router;
