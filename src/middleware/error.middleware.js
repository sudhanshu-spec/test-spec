/**
 * Error Handling Middleware Module
 * 
 * This module provides centralized error handling for the Express application.
 * Implements 404 not found handling and global error handling with
 * environment-aware responses per Agent Action Plan section 0.5.5.
 * 
 * Features:
 * - 404 Not Found handler for unmatched routes
 * - Global error handler with environment-aware responses
 * - Development: Full error details including stack traces
 * - Production: Sanitized error responses (no stack traces)
 * - All errors logged before response per R-034
 * 
 * Middleware Order (Critical):
 * 1. notFoundHandler - Mount after all routes
 * 2. errorHandler - Mount last (must be final middleware)
 * 
 * @module src/middleware/error.middleware
 */

'use strict';

const config = require('../config');
const { logger } = require('../utils/logger');

/**
 * Not Found Handler
 * 
 * Handles requests that don't match any route.
 * Creates a 404 error and passes to the global error handler.
 * Must be mounted after all routes per Rule R-030.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error); // Pass to error handler per R-030
};

/**
 * Global Error Handler
 * 
 * Handles all errors passed through the middleware chain.
 * Returns environment-aware responses (detailed in dev, sanitized in prod).
 * 
 * Must have 4 parameters per Express error handler requirements and R-031.
 * The `next` parameter is required by Express to identify this as an error handler
 * even though it may not be used.
 * 
 * Compliance:
 * - R-031: Has (err, req, res, next) signature
 * - R-032: No stack traces in production
 * - R-033: Full details in development
 * - R-034: Errors logged before response
 * 
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function (required for signature)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status set
  const statusCode = err.status || err.statusCode || 500;
  
  // Log the error per R-034 - log before response
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    requestId: req.id // From request-id middleware
  });
  
  // Build response based on environment per R-032, R-033
  const response = {
    status: 'error',
    statusCode,
    message: err.message || 'Internal Server Error'
  };
  
  // Include stack trace only in development per R-032, R-033
  if (config.env === 'development') {
    response.stack = err.stack;
  }
  
  // Include request ID if available
  if (req.id) {
    response.requestId = req.id;
  }
  
  res.status(statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
