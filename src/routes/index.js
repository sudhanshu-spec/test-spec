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

// Import the main routes router module
// Barrel pattern: centralize route exports for cleaner imports in app.js
// This pattern enables scalability - additional route modules can be added here
// and consumed via a single import statement in app.js
const mainRoutes = require('./main.routes');

/**
 * Route module exports using barrel pattern
 * Provides centralized access to all route modules
 * 
 * This aggregation pattern enables:
 * - Single import statement for all routes in app.js
 * - Easy addition of new route modules (just add to exports)
 * - Clean separation between route definition and route registration
 * 
 * @exports module:src/routes
 * @type {Object}
 * @property {express.Router} mainRoutes - Main application routes (GET /, GET /evening)
 */
module.exports = {
  mainRoutes
};
// Barrel export pattern - enables: const { mainRoutes } = require('./routes')
