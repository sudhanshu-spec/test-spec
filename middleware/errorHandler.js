/**
 * Global Error Handler Middleware
 * 
 * Express.js error handling middleware that catches all unhandled errors
 * and returns structured JSON responses with appropriate HTTP status codes.
 * Logs errors with full stack traces via Winston logger.
 * 
 * @module middleware/errorHandler
 * @requires ../utils/logger
 */

'use strict';

const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * 
 * Must have 4 parameters to be recognized as error middleware by Express.
 * This middleware should be the LAST middleware in the stack to catch all errors.
 * 
 * Error Response Format:
 * {
 *   "error": "Error message",
 *   "status": 500
 * }
 * 
 * In development mode, also includes:
 * {
 *   "error": "Error message",
 *   "status": 500,
 *   "stack": "Error stack trace..."
 * }
 * 
 * @param {Error} err - The error object thrown or passed to next()
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * 
 * @example
 * // Usage in server.js
 * const errorHandler = require('./middleware/errorHandler');
 * app.use(errorHandler); // Must be last middleware
 * 
 * @example
 * // Throwing errors in routes
 * router.get('/example', (req, res, next) => {
 *   const error = new Error('Something went wrong');
 *   error.status = 400;
 *   next(error);
 * });
 */
const errorHandler = (err, req, res, next) => {
  // Determine status code from error or default to 500
  const statusCode = err.statusCode || err.status || 500;

  // Log the error with full details
  logger.error('Error caught by error handler', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    statusCode: statusCode,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Build error response object
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    status: statusCode
  };

  // Include stack trace only in development for debugging
  // In production, hide implementation details for security
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  // Ensure headers haven't been sent yet
  if (res.headersSent) {
    return next(err);
  }

  // Send JSON error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
