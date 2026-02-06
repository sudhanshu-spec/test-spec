'use strict';

/**
 * @fileoverview Centralized Error Handling Middleware
 *
 * Express error-handling middleware with the standard 4-argument signature
 * (err, req, res, next). Catches all unhandled errors in the Express
 * middleware chain, logs the full error details via the Winston logger,
 * and returns a structured JSON error response.
 *
 * In production, stack traces are sanitized from responses to prevent
 * information leakage. Must be mounted as the last middleware in the
 * Express pipeline (after all routes) in src/app.js.
 *
 * Express 5.x automatically propagates async errors thrown in route
 * handlers to this middleware, eliminating the need for manual
 * try-catch wrappers in async route handlers.
 *
 * @module src/middleware/error.middleware
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Centralized error-handling middleware for Express.
 *
 * Express identifies this as an error-handling middleware because it has
 * exactly 4 parameters (err, req, res, next). This is a strict Express
 * convention — all four parameters must be declared even if not all are
 * explicitly used in every code path.
 *
 * Behavior:
 * 1. Logs the error with structured context (message, stack, status code,
 *    request URL, HTTP method) via the Winston logger at the 'error' level.
 * 2. If response headers have already been sent (e.g., during streaming),
 *    delegates to Express's built-in error handler via next(err) to avoid
 *    the "Cannot set headers after they are sent" fatal error.
 * 3. Returns a structured JSON response with the error status code, a
 *    human-readable message, and — outside production — the stack trace
 *    for debugging convenience.
 *
 * @param {Error} err - The error object thrown or passed via next(err)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Determine the HTTP status code from the error object, defaulting to 500
  const statusCode = err.status || err.statusCode || 500;

  // Log the error with structured context via Winston for observability
  logger.error(err.message, {
    stack: err.stack,
    statusCode: statusCode,
    url: req.originalUrl,
    method: req.method
  });

  // If response headers have already been sent (e.g., during a streaming
  // response that errored mid-flight), delegate to Express's built-in
  // error handler to gracefully close the connection. Attempting to send
  // another response would throw a fatal "Cannot set headers" error.
  if (res.headersSent) {
    return next(err);
  }

  // Build the structured JSON error response body
  const responseBody = {
    status: 'error',
    statusCode: statusCode,
    message: err.message || 'Internal Server Error'
  };

  // Only include stack traces outside production to aid debugging while
  // preventing sensitive implementation details from leaking in production
  if (config.env !== 'production') {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
