/**
 * Error Handling Middleware Module
 * 
 * This module provides centralized error handling for the Express application.
 * It exports two middleware functions:
 * 
 * 1. notFoundHandler - Catches requests that don't match any route (404)
 * 2. errorHandler - Catches all errors passed via next(err)
 * 
 * Express 5 Note:
 * In Express 5, middleware functions that return a Promise will call next(value)
 * when they reject or throw an error. This means async route handlers
 * automatically forward errors to the error handler.
 * 
 * IMPORTANT: These middlewares MUST be registered LAST in the middleware chain,
 * after all route handlers, with notFoundHandler before errorHandler.
 * 
 * Usage in app.js:
 *   const { notFoundHandler, errorHandler } = require('./middleware');
 *   // ... routes ...
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 * 
 * @module src/middleware/error.middleware
 */

'use strict';

const logger = require('../utils/logger');
const config = require('../config');

/**
 * 404 Not Found Handler
 * 
 * Catches requests that don't match any defined route.
 * Must be registered after all route handlers.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: 'Not Found'
  });
};

/**
 * Generic Error Handler
 * 
 * Catches all errors passed via next(err) or thrown in async handlers.
 * Provides environment-aware responses:
 * - Development: Full error details with stack trace
 * - Production: Sanitized generic error message
 * 
 * MUST be the last middleware registered (has 4 parameters which Express
 * uses to identify it as an error handler).
 * 
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function (required for error handler signature)
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with stack trace and request context
  logger.error(err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Determine status code from error or default to 500
  const statusCode = err.statusCode || err.status || 500;

  // Build response based on environment
  const response = {
    error: config.env === 'production' ? 'Internal Server Error' : err.message
  };

  // Include stack trace only in development
  if (config.env !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
