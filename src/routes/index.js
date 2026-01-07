/**
 * Route Aggregator Module
 * 
 * This module aggregates all route modules for clean, centralized imports.
 * It serves as the central route registry, allowing src/app.js to import
 * all routes with a single require statement.
 * 
 * Usage in src/app.js:
 *   const { mainRoutes, uiRoutes } = require('./routes');
 *   app.use('/api', mainRoutes);
 *   app.use('/', uiRoutes);
 * 
 * @module src/routes
 */

'use strict';

const mainRoutes = require('./main.routes');
const uiRoutes = require('./ui.routes');

module.exports = {
  mainRoutes,
  uiRoutes
};
