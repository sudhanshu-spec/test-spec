/**
 * Route Aggregator Module
 * 
 * This module aggregates all route modules for clean, centralized imports.
 * It serves as the central route registry, allowing src/app.js to import
 * all routes with a single require statement.
 * 
 * It exports two routers: the tutorial router, which keeps the three greeting
 * routes mounted at '/', and the API router, which serves the JSON API mounted
 * at '/api'. This module only re-exports them; path prefixes belong to the
 * router that owns the route and to the mounting call in src/app.js.
 * 
 * Usage in src/app.js:
 *   const { mainRoutes, apiRoutes } = require('./routes');
 *   app.use('/', mainRoutes);
 *   app.use('/api', apiRoutes);
 * 
 * @module src/routes
 */

const mainRoutes = require('./main.routes');
const apiRoutes = require('./api');

module.exports = {
  mainRoutes,
  apiRoutes
};
