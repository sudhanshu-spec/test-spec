/**
 * Route Aggregator Module
 * 
 * This module aggregates all route modules for clean, centralized imports.
 * It serves as the central route registry, allowing src/app.js to import
 * all routes with a single require statement.
 * 
 * Exports:
 * - mainRoutes: Main application routes (/, /evening)
 * - healthRoutes: Health check endpoint for PM2 and load balancer monitoring
 * 
 * Usage in src/app.js:
 *   const { mainRoutes, healthRoutes } = require('./routes');
 *   app.use('/', mainRoutes);
 *   app.use('/health', healthRoutes);
 * 
 * @module src/routes
 */

const mainRoutes = require('./main.routes');
const healthRoutes = require('./health.routes');

module.exports = {
  mainRoutes,
  healthRoutes
};
