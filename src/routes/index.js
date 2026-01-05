/**
 * Route Aggregator Module
 * 
 * This module aggregates all route modules for clean, centralized imports.
 * It serves as the central route registry, allowing src/app.js to import
 * all routes with a single require statement.
 * 
 * Usage in src/app.js:
 *   const { mainRoutes } = require('./routes');
 *   app.use('/', mainRoutes);
 * 
 * @module src/routes
 */

const mainRoutes = require('./main.routes');

/**
 * Route module exports object
 * 
 * Exports all route modules for centralized access from src/app.js.
 * The mainRoutes export provides the Express Router instance containing
 * all main application routes (GET /, GET /evening).
 * 
 * @type {{ mainRoutes: import('express').Router }}
 */
module.exports = {
  mainRoutes
};
