/**
 * Centralized Error Handling Middleware Module
 * 
 * This module provides centralized error handling for the Express application.
 * It catches all errors propagated through the middleware chain and provides
 * consistent JSON error responses with appropriate HTTP status codes.
 * 
 * IMPORTANT: This middleware MUST be mounted LAST in the middleware stack
 * (after all routes) for Express to properly route errors to it.
 * 
 * Error Response Format:
 * {
 *   "error": {
 *     "message": "Error description",
 *     "status": 500,
 *     "timestamp": "ISO8601"
 *   }
 * }
 * 
 * Environment Behavior:
 * - Production: Hides error details for security (generic message)
 * - Development: Shows full error message and stack trace for debugging
 * 
 * Usage in src/app.js:
 *   const { errorHandler } = require('./middleware');
 *   // After all routes
 *   app.use(errorHandler);
 * 
 * @module src/middleware/errorHandler
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Express error handling middleware
 * 
 * Note: Express error middleware MUST have 4 parameters (err, req, res, next)
 * even if next is not used. This signature tells Express this is an error handler.
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (required for signature)
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with full details
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Build error response
  const errorResponse = {
    error: {
      message: config.env === 'production' 
        ? 'Internal Server Error' 
        : err.message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  };
  
  // Include stack trace in development for debugging
  if (config.env !== 'production') {
    errorResponse.error.stack = err.stack;
  }
  
  // Send JSON error response
  res.status(statusCode).json(errorResponse);
};

module.exports = { errorHandler };
