/**
 * Centralized Error Handler Middleware
 * 
 * This module provides a centralized Express error-handling middleware
 * with a 4-argument signature (err, req, res, next) as required by
 * Express for error handler recognition. Errors are logged via Winston
 * and a structured JSON response is returned to the client.
 * 
 * In production, error details are sanitized to prevent information leakage.
 * In development, full error stack traces are included in responses.
 * 
 * @module src/middleware/errorHandler
 */

'use strict';

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Express error-handling middleware
 * 
 * Catches unhandled errors from route handlers, logs them via Winston,
 * and returns a structured JSON error response with appropriate HTTP
 * status codes.
 * 
 * @param {Error} err - The error object thrown or passed via next(err)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error with full stack trace via Winston
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, {
    error: err.message,
    stack: err.stack,
    statusCode: statusCode,
    url: req.originalUrl,
    method: req.method
  });

  // Build response - sanitize in production
  const response = {
    error: config.env === 'production' ? 'Internal Server Error' : message
  };

  // Include stack trace in development/test only
  if (config.env !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  errorHandler
};
