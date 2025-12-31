/**
 * Centralized Error Handling Middleware Module
 * 
 * This module provides centralized error handling for Express applications.
 * It exports two middleware functions:
 * - notFoundHandler: Catches requests that don't match any route (404)
 * - errorHandler: Catches all errors and returns standardized JSON responses
 * 
 * Error handling follows Express conventions:
 * - notFoundHandler uses standard (req, res, next) signature
 * - errorHandler uses error-first (err, req, res, next) signature
 * 
 * Usage in src/app.js (must be last middleware):
 *   const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
 *   // After all routes
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 * 
 * @module src/middleware/error.middleware
 */

'use strict';

const logger = require('../utils/logger');

/**
 * 404 Not Found Handler
 * 
 * Catches requests that don't match any defined route and returns
 * a JSON 404 response. This middleware should be mounted after all
 * route handlers.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
};

/**
 * Centralized Error Handler
 * 
 * Catches all errors thrown in route handlers or other middleware
 * and returns a standardized JSON error response. Logs error details
 * using Winston logger.
 * 
 * Features:
 * - Extracts status code from error object (err.statusCode or err.status)
 * - Logs error details including URL, method, and client IP
 * - Suppresses stack trace in production for security
 * - Returns JSON response with error and message fields
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function (required for Express error handler signature)
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log error details for monitoring and debugging
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // Build error response object
  const errorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
    message: message
  };

  // Include stack trace in development only for debugging
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
