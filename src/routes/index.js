/**
 * Route Aggregator Module
 *
 * This module aggregates all route modules for clean, centralized imports.
 * It serves as the central route registry, allowing src/app.js to import
 * all routes with a single require statement.
 *
 * Usage in src/app.js:
 *   const { mainRoutes, healthRoutes } = require('./routes');
 *   app.use('/', mainRoutes);
 *   app.use('/', healthRoutes);
 *
 * @module src/routes
 */

const mainRoutes = require('./main.routes');
const healthRoutes = require('./health.routes');

module.exports = {
  mainRoutes,
  healthRoutes
};
