/**
 * Middleware Aggregator Module
 * 
 * This module aggregates all middleware modules for clean, centralized imports.
 * It serves as the central middleware registry, allowing src/app.js to import
 * all middleware with a single require statement.
 * 
 * Usage in src/app.js:
 *   const { errorHandler } = require('./middleware');
 *   // After all routes
 *   app.use(errorHandler);
 * 
 * @module src/middleware
 */

const errorHandler = require('./errorHandler');

module.exports = {
  errorHandler
};
