/**
 * Centralized Error Handling Middleware
 * 
 * This module provides a centralized error handler for the Express application.
 * It implements the Express four-parameter error middleware pattern and provides
 * environment-aware error responses for security and debugging purposes.
 * 
 * Features:
 * - Structured error logging with Winston
 * - Environment-aware responses (stack traces in dev, generic messages in prod)
 * - HTTP status code preservation from thrown errors
 * - JSON-formatted error responses for API consistency
 * 
 * Security considerations:
 * - Never exposes stack traces in production
 * - Sanitizes error messages for production responses
 * - Logs full error details for debugging regardless of environment
 * 
 * Usage in src/app.js:
 *   const { errorHandler } = require('./middleware');
 *   // After all routes
 *   app.use(errorHandler);
 * 
 * Throwing errors in routes:
 *   const error = new Error('Not found');
 *   error.statusCode = 404;
 *   throw error;
 * 
 * @module src/middleware/errorHandler
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Express error handling middleware
 * 
 * Handles all errors passed to next(err) or thrown in async routes.
 * Logs error details and returns appropriate JSON response based on environment.
 * 
 * @param {Error} err - Error object with optional statusCode/status property
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
const errorHandler = (err, req, res, next) => {
  // Determine HTTP status code
  // Use error's statusCode if provided, otherwise default to 500
  let statusCode = err.statusCode || err.status || 500;
  
  // Ensure status code is a valid HTTP status code
  if (statusCode < 100 || statusCode > 599) {
    statusCode = 500;
  }

  // Log error details for debugging and monitoring
  // Always log full details regardless of environment
  logger.error('Error occurred', {
    message: err.message,
    statusCode: statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isProduction = config.env === 'production';
  
  // Build error response
  const errorResponse = {
    status: 'error',
    statusCode: statusCode,
    message: isProduction ? getProductionMessage(statusCode) : err.message
  };

  // Include stack trace only in non-production environments
  if (!isProduction) {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  // Send JSON response
  res.status(statusCode).json(errorResponse);
};

/**
 * Get a generic, safe error message for production
 * 
 * @param {number} statusCode - HTTP status code
 * @returns {string} Generic error message
 */
const getProductionMessage = (statusCode) => {
  const messages = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };

  return messages[statusCode] || 'Internal Server Error';
};

module.exports = errorHandler;
