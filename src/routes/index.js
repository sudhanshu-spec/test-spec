/**
 * Route Aggregator Module
 * 
 * This module aggregates all route modules for clean, centralized imports.
 * It serves as the central route registry, allowing src/app.js to import
 * all routes with a single require statement.
 * 
 * Exports:
 * - mainRoutes: API route handlers returning plain text responses (GET /api/, GET /api/evening)
 * - uiRoutes: UI page route handlers rendering EJS templates (GET /, GET /evening)
 * 
 * Usage in src/app.js:
 *   const { mainRoutes, uiRoutes } = require('./routes');
 *   app.use('/', uiRoutes);       // UI pages at root namespace (mounted first)
 *   app.use('/api', mainRoutes);  // API endpoints under /api namespace
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
