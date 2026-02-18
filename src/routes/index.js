/**
 * Route Aggregator Module
 *
 * This module implements the Barrel Pattern to aggregate all route modules
 * into a single, clean entry point for centralized imports. Instead of
 * consumers needing to know about individual route files (like `main.routes.js`),
 * they import from this barrel module which re-exports all route resources
 * through a stable API surface.
 *
 * It serves as the central route registry, allowing src/app.js to import
 * all routes with a single require statement.
 *
 * Usage in src/app.js:
 *   const { mainRoutes } = require('./routes');
 *   app.use('/', mainRoutes);
 *
 * @module src/routes
 * @requires module:src/routes/main.routes
 * @see module:src/app — Primary consumer that destructures route exports
 * @see module:src/routes/main.routes — Source module providing the main router
 */

/**
 * Pre-configured Express Router imported from the main routes module.
 * Contains route handlers for GET / and GET /evening endpoints.
 * @type {express.Router}
 */
const mainRoutes = require('./main.routes');

// Named export enables selective destructuring and maintains a stable barrel API surface
module.exports = {
  mainRoutes
};
