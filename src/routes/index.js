'use strict';

/**
 * Route Aggregator Module
 * 
 * This module aggregates all route modules for clean, centralized imports.
 * It exports a configureRoutes(app) function that mounts all route handlers
 * on the Express application.
 * 
 * Usage in src/app.js:
 *   const { configureRoutes } = require('./routes');
 *   configureRoutes(app);
 * 
 * @module src/routes
 */

const mainRouter = require('./main.routes');

/**
 * Registers all route modules on the Express application
 * @param {import('express').Application} app - The Express application instance
 */
function configureRoutes(app) {
  app.use('/', mainRouter);
}

module.exports = { configureRoutes };
