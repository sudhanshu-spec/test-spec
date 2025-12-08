/**
 * Middleware Aggregator Module
 * 
 * This module aggregates all middleware modules for clean, centralized imports.
 * It serves as the central middleware registry, allowing src/app.js to import
 * all middleware with a single require statement.
 * 
 * Usage in src/app.js:
 *   const { loggerMiddleware, errorHandler, securityMiddleware } = require('./middleware');
 *   app.use(loggerMiddleware);
 *   // ... routes ...
 *   app.use(errorHandler);
 * 
 * @module src/middleware
 */

const { loggerMiddleware } = require('./logger');
const { errorHandler } = require('./errorHandler');
const { securityMiddleware } = require('./security');

module.exports = {
  loggerMiddleware,
  errorHandler,
  securityMiddleware
};
