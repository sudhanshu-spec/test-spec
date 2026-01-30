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
 * @exports {Object} routes
 * @property {import('express').Router} mainRoutes - The main application router
 * @see module:./main.routes
 */

const mainRoutes = require('./main.routes');

module.exports = {
  mainRoutes
};
