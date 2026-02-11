/**
 * @fileoverview Centralized Error Handling Middleware
 *
 * This module provides the Express error-handling middleware function using
 * the 4-argument signature (err, req, res, next) required by Express to
 * identify error-handling middleware.
 *
 * Behavior:
 * - Logs the error stack trace via Winston at the 'error' level
 * - Returns a structured JSON response with status code, error message
 * - In development mode, includes the error stack trace for debugging
 * - In production mode, returns only the status code and sanitized message
 *
 * This middleware must be mounted LAST in the Express middleware pipeline,
 * after all routes and the notFound handler.
 *
 * @module src/middleware/errorHandler
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

const logger = require('../utils/logger');
const config = require('../config');

// =============================================================================
// Error Handler Middleware
// =============================================================================

/**
 * Centralized Express error-handling middleware.
 *
 * Catches all errors passed via next(error) from upstream middleware and
 * route handlers. Logs the error details and returns a structured JSON
 * response to the client.
 *
 * @param {Error} err - The error object thrown or passed via next()
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  // Determine the HTTP status code: use err.status, err.statusCode, or default to 500
  const statusCode = err.status || err.statusCode || 500;

  // Determine the error message: use err.message or a generic fallback
  const message = err.message || 'Internal Server Error';

  // Log the error with contextual information
  logger.error(`${statusCode} - ${message}`, {
    method: req.method,
    url: req.originalUrl,
    stack: err.stack
  });

  // Build the response body
  const responseBody = {
    status: statusCode,
    message: message
  };

  // In development mode, include the error stack trace for debugging
  if (config.env === 'development') {
    responseBody.stack = err.stack;
  }

  // Send the JSON error response
  res.status(statusCode).json(responseBody);
}

// =============================================================================
// Module Export
// =============================================================================

module.exports = errorHandler;
