/**
 * @fileoverview Centralized Express Error-Handling Middleware
 *
 * Provides a centralized error-handling middleware for the Express application
 * using the standard 4-argument signature (err, req, res, next) required by
 * Express for error handler recognition. This middleware serves as the final
 * catch-all error boundary, registered AFTER all route handlers in src/app.js.
 *
 * Responsibilities:
 * - Catches all unhandled errors from route handlers and upstream middleware
 * - Logs errors via the Winston structured logging pipeline with full context
 *   (message, stack trace, HTTP status code, request method, request URL)
 * - Returns a structured JSON error response ({ error: message }) to the client
 * - Assigns appropriate HTTP status codes (err.status, err.statusCode, or 500)
 * - In production, sanitizes 500-level error messages to a generic
 *   'Internal Server Error' to prevent information leakage of server internals
 * - In non-production environments, returns the original error message for
 *   developer-friendly debugging
 *
 * Without this middleware, unhandled route errors would fall through to
 * Express's default error handler, which returns HTML responses instead of
 * the structured JSON required by API consumers.
 *
 * @module src/middleware/errorHandler
 */

'use strict';

const logger = require('../utils/logger');

/**
 * Centralized Express error-handling middleware function.
 *
 * Intercepts errors passed via next(err) or thrown in async route handlers,
 * logs them through Winston at the 'error' severity level with full diagnostic
 * context, and sends a structured JSON response to the client.
 *
 * In production environments, error messages for 500-level (server) errors are
 * sanitized to the generic 'Internal Server Error' string to prevent leakage
 * of internal implementation details, stack traces, or sensitive data. Client
 * error messages (4xx status codes) are passed through unchanged since they
 * describe issues with the request itself, not server internals.
 *
 * @param {Error} err - The error object thrown or passed via next(err)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function (required for Express error handler signature recognition)
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  // Extract HTTP status code from the error object, falling back to 500
  // if neither err.status nor err.statusCode is set
  const statusCode = err.status || err.statusCode || 500;

  // Log the error through Winston with full diagnostic context for
  // observability and debugging. The structured metadata object enables
  // log aggregation systems to index and search by status code, method, and URL.
  logger.error(err.message, {
    stack: err.stack,
    statusCode,
    method: req.method,
    url: req.originalUrl
  });

  // Determine the error message to include in the client response.
  // In production, 500-level errors are sanitized to prevent information
  // leakage of server internals (stack traces, database errors, etc.).
  // Client errors (4xx) pass through unchanged since they describe
  // request-level issues that the client needs to understand and correct.
  let message;
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal Server Error';
  } else {
    message = err.message || 'Internal Server Error';
  }

  // Send the structured JSON error response with the appropriate status code.
  // This ensures API consumers always receive a consistent { error: message }
  // response shape regardless of the error origin.
  res.status(statusCode).json({ error: message });
}

module.exports = { errorHandler };
