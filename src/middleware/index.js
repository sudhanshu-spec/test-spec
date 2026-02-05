/**
 * Middleware Aggregator Module
 * 
 * This module aggregates all middleware modules for clean, centralized imports.
 * It serves as the central middleware registry, allowing src/app.js to import
 * all middleware with a single require statement.
 * 
 * Middleware Registration Order (CRITICAL):
 * Middleware must be registered in app.js in this exact order:
 * 
 * 1. securityMiddleware (Helmet) - FIRST, sets security headers
 * 2. express.json() - Built-in body parser (not exported here)
 * 3. morganMiddleware - HTTP request logging
 * 4. [Application Routes go here]
 * 5. notFoundHandler - 404 for unmatched routes
 * 6. errorHandler - LAST, catches all errors
 * 
 * Usage in src/app.js:
 *   const middleware = require('./middleware');
 *   
 *   // Register middleware in order
 *   app.use(middleware.securityMiddleware);
 *   app.use(express.json());
 *   app.use(middleware.morganMiddleware);
 *   
 *   // ... mount routes ...
 *   
 *   app.use(middleware.notFoundHandler);
 *   app.use(middleware.errorHandler);
 * 
 * @module src/middleware
 */

'use strict';

const { securityMiddleware } = require('./security.middleware');
const { morganMiddleware } = require('./logging.middleware');
const { notFoundHandler, errorHandler } = require('./error.middleware');

module.exports = {
  securityMiddleware,
  morganMiddleware,
  notFoundHandler,
  errorHandler
};
