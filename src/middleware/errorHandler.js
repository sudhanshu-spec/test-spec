'use strict';

/**
 * Centralized Error-Handling Middleware
 *
 * Express error-handling middleware with the required 4-argument signature
 * (err, req, res, next). Catches unhandled errors from route handlers, logs
 * them via Winston structured logging, and returns a standardized JSON error
 * response with appropriate HTTP status codes.
 *
 * Stack traces are included in development mode but omitted in production
 * to prevent information leakage.
 *
 * Must be registered as the LAST middleware in src/app.js (after all routes)
 * per Express conventions.
 *
 * @module src/middleware/errorHandler
 */

const logger = require('../config/logger');
const config = require('../config');

/**
 * Express error-handling middleware.
 *
 * Logs the error via Winston and sends a structured JSON error response.
 * Conditionally includes stack trace based on NODE_ENV.
 *
 * @param {Error} err - The error object caught by Express
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Determine the HTTP status code from the error or default to 500
  const statusCode = err.status || err.statusCode || 500;

  // Log the error with structured metadata via Winston
  logger.error(err.message, {
    stack: err.stack,
    statusCode: statusCode,
    method: req.method,
    url: req.originalUrl
  });

  // Build the JSON error response
  const response = {
    status: 'error',
    statusCode: statusCode,
    message: err.message || 'Internal Server Error'
  };

  // Include stack trace only in non-production environments
  if (config.nodeEnv !== 'production') {
    response.stack = err.stack;
  }

  // Send the structured JSON error response
  res.status(statusCode).json(response);
};

module.exports = errorHandler;
