/**
 * @fileoverview Middleware Aggregator Module
 *
 * This module aggregates all application middleware for clean, centralized
 * imports. It follows the Barrel Pattern established in src/routes/index.js,
 * providing a single import point for all middleware modules.
 *
 * Usage in src/app.js:
 *   const { errorHandler, notFound, requestLogger } = require('./middleware');
 *   app.use(requestLogger);
 *   // ... routes ...
 *   app.use(notFound);
 *   app.use(errorHandler);
 *
 * @module src/middleware
 */

'use strict';

const errorHandler = require('./errorHandler');
const notFound = require('./notFound');
const requestLogger = require('./requestLogger');

module.exports = {
  errorHandler,
  notFound,
  requestLogger
};
