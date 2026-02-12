'use strict';

/**
 * Centralized Error-Handling Middleware
 *
 * Provides two-layer error handling for the Express application:
 * 1. notFoundHandler: Catches requests to unmatched routes (404)
 * 2. errorHandler: Final error handler that logs and formats error responses
 *
 * Mounted in src/app.js AFTER all route handlers:
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 *
 * @module src/middleware/error.middleware
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * 404 Not Found Handler
 *
 * Catches all requests that did not match any defined route and
 * passes a standardized 404 error to the next error-handling middleware.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function notFoundHandler(req, res, next) {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
}

/**
 * Centralized Error Handler
 *
 * Final error-handling middleware (4-parameter Express signature) that
 * logs the error via Winston and returns a JSON error response.
 * Stack traces are suppressed in production to prevent information leakage.
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;

  logger.error(err.message, {
    statusCode: statusCode,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  const response = {
    status: 'error',
    statusCode: statusCode,
    message: err.message
  };

  // Include stack trace in non-production environments for debugging
  if (config.env !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
