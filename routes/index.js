/**
 * @fileoverview Central Route Aggregator Module
 * 
 * This module consolidates and exports all route modules for the Express.js
 * application. It provides a unified interface for route configuration including
 * health check endpoints and API routes.
 * 
 * Routes Provided:
 * - Health Routes: /health (liveness probe), /ready (readiness probe)
 * - API Routes: /, /evening, /data (extracted from server.js)
 * 
 * Route Organization Strategy:
 * This module implements modular routing by organizing routes into separate files:
 * 1. Health routes at root level for easy monitoring access
 * 2. API routes mounted at root (can be prefixed with /api if needed)
 * 
 * Usage Options:
 * 
 * Option 1: Using configureRoutes helper function (recommended)
 * ```javascript
 * const { configureRoutes } = require('./routes');
 * configureRoutes(app);
 * ```
 * 
 * Option 2: Individual route imports
 * ```javascript
 * const { healthRoutes, apiRoutes } = require('./routes');
 * app.use(healthRoutes);
 * app.use(apiRoutes);
 * ```
 * 
 * @module routes/index
 * @requires routes/health
 * @requires routes/api
 * @version 1.0.0
 * @see {@link https://expressjs.com/en/guide/routing.html} Express Routing Guide
 */

'use strict';

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

/**
 * Health check routes module.
 * Provides /health and /ready endpoints for operational monitoring
 * and orchestration integration (load balancers, Kubernetes, PM2).
 * 
 * Routes provided:
 * - GET /health - Liveness probe (returns status, timestamp, uptime)
 * - GET /ready - Readiness probe (includes dependency checks)
 * 
 * @see routes/health.js
 */
const healthRoutes = require('./health');

/**
 * API routes module.
 * Contains application API routes extracted from server.js for modular organization.
 * 
 * Routes provided:
 * - GET / - Home route returning 'Hello, World!'
 * - GET /evening - Evening greeting route
 * - GET /data - Sample validated endpoint with pagination
 * 
 * @see routes/api.js
 */
const apiRoutes = require('./api');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Configure all routes for an Express application instance.
 * 
 * This helper function provides a convenient one-liner to apply all
 * application routes in the correct order:
 * 
 * 1. Health routes at root level (for easy monitoring access)
 * 2. API routes (application business logic)
 * 3. 404 handler for undefined routes
 * 
 * Route Mounting Strategy:
 * - Health endpoints (/health, /ready) are mounted at root level
 *   to ensure they are always accessible regardless of any route prefixes
 * - API routes are mounted at root level (can be changed to '/api' prefix)
 * 
 * Usage:
 * ```javascript
 * const express = require('express');
 * const { configureRoutes } = require('./routes');
 * 
 * const app = express();
 * // Apply middleware first...
 * configureRoutes(app);
 * 
 * // Start server...
 * app.listen(3000);
 * ```
 * 
 * @param {Object} app - Express application instance
 * @throws {TypeError} If app is not provided or is not a valid Express app
 * @returns {Object} The Express app instance for method chaining
 * 
 * @example
 * // Basic usage
 * const app = express();
 * configureRoutes(app);
 * 
 * @example
 * // With method chaining
 * const app = express();
 * configureRoutes(app).listen(3000);
 */
function configureRoutes(app) {
  // Validate that app is provided and has the use method (Express app interface)
  if (!app) {
    throw new TypeError(
      'configureRoutes requires an Express application instance. ' +
      'Usage: configureRoutes(app)'
    );
  }
  
  if (typeof app.use !== 'function') {
    throw new TypeError(
      'Invalid Express application instance provided. ' +
      'The object must have a "use" method for route registration.'
    );
  }
  
  // ==========================================================================
  // Route Mounting
  // ==========================================================================
  
  // 1. Health routes FIRST - Mounted at root level for monitoring access
  // These endpoints are used by load balancers, orchestration systems, and PM2
  // to determine application health and readiness
  app.use(healthRoutes);
  
  // 2. API routes SECOND - Application business logic routes
  // Mounted at root level (demo routes: /, /evening, /data)
  // For a larger application, consider mounting at '/api' prefix:
  // app.use('/api', apiRoutes);
  app.use(apiRoutes);
  
  // 3. 404 handler LAST - Catches all unmatched routes
  // This must be after all valid routes to properly catch undefined paths
  app.use(create404Handler());
  
  // Log route configuration for debugging/audit purposes
  if (process.env.NODE_ENV === 'development') {
    console.log('[ROUTES] Route modules configured:');
    console.log('  1. healthRoutes (GET /health, GET /ready)');
    console.log('  2. apiRoutes (GET /, GET /evening, GET /data)');
    console.log('  3. 404 handler (catch-all for undefined routes)');
  }
  
  // Return app for method chaining
  return app;
}

/**
 * Create a 404 Not Found handler middleware.
 * 
 * Returns a middleware function that catches all unmatched routes
 * and returns a consistent JSON error response with request details.
 * 
 * Response format:
 * ```json
 * {
 *   "error": "Not Found",
 *   "message": "The requested resource /path was not found on this server",
 *   "path": "/path",
 *   "method": "GET",
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 * ```
 * 
 * @returns {Function} Express middleware function for 404 handling
 * 
 * @example
 * // Usage in route configuration
 * app.use(create404Handler());
 */
function create404Handler() {
  return (req, res, next) => {
    res.status(404).json({
      error: 'Not Found',
      message: `The requested resource ${req.path} was not found on this server`,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  };
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Export route modules and configuration helpers.
 * 
 * Route Module Exports (pre-configured routers):
 * - healthRoutes: Health check router (/health, /ready)
 * - apiRoutes: API router (/, /evening, /data)
 * 
 * Helper Functions:
 * - configureRoutes: One-liner to configure all routes
 * - create404Handler: Factory for 404 not found handler
 * 
 * @example
 * // Using configureRoutes helper (recommended)
 * const { configureRoutes } = require('./routes');
 * configureRoutes(app);
 * 
 * @example
 * // Individual route module usage
 * const { healthRoutes, apiRoutes } = require('./routes');
 * app.use(healthRoutes);
 * app.use('/api', apiRoutes);
 * 
 * @example
 * // Custom 404 handler usage
 * const { create404Handler } = require('./routes');
 * app.use(create404Handler());
 */
module.exports = {
  // Route module exports (Express routers)
  healthRoutes,
  apiRoutes,
  
  // Helper functions
  configureRoutes,
  create404Handler
};
