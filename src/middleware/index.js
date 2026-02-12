'use strict';

/**
 * Middleware Aggregator Module
 *
 * This module aggregates all middleware modules for clean, centralized imports.
 * It follows the Barrel Pattern established in src/routes/index.js, enabling
 * src/app.js to import all middleware with a single require statement.
 *
 * Usage in src/app.js:
 *   const { errorHandler, requestLogger } = require('./middleware');
 *   app.use(requestLogger);
 *   // ... routes ...
 *   app.use(errorHandler);
 *
 * @module src/middleware
 */

const errorHandler = require('./errorHandler');
const requestLogger = require('./requestLogger');

module.exports = {
  errorHandler,
  requestLogger
};
