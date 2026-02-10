/**
 * Route Aggregator Module
 * 
 * This module aggregates all route modules for clean, centralized imports.
 * It serves as the central route registry, allowing src/app.js to import
 * all routes with a single require statement.
 * 
 * Usage in src/app.js:
 *   const { mainRoutes, healthRoutes, apiRoutes } = require('./routes');
 *   app.use('/', mainRoutes);
 *   app.use('/health', healthRoutes);
 *   app.use('/api', apiRoutes);
 * 
 * @module src/routes
 */

const mainRoutes = require('./main.routes');
const healthRoutes = require('./health.routes');
const apiRoutes = require('./api.routes');

module.exports = {
  mainRoutes,
  healthRoutes,
  apiRoutes
};
