/**
 * Middleware Aggregator Module
 * 
 * This module aggregates all middleware modules for clean, centralized imports.
 * It serves as the central middleware registry, allowing src/app.js to import
 * all middleware with a single require statement.
 * 
 * Exports:
 * - errorMiddleware: Object containing notFoundHandler and errorHandler
 * - requestIdMiddleware: Function for request ID generation
 * 
 * Usage in src/app.js:
 *   const { errorMiddleware, requestIdMiddleware } = require('./middleware');
 *   app.use(requestIdMiddleware);
 *   app.use(errorMiddleware.notFoundHandler);
 *   app.use(errorMiddleware.errorHandler);
 * 
 * @module src/middleware
 */

'use strict';

const errorMiddleware = require('./error.middleware');
const requestIdMiddleware = require('./request-id.middleware');

module.exports = {
  errorMiddleware,
  requestIdMiddleware
};
