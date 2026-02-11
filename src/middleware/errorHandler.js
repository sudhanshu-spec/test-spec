/**
 * Global Error-Handling Middleware
 *
 * Catches all errors thrown or passed via next(err) throughout the Express
 * application and returns a structured JSON error response. This middleware
 * uses the 4-parameter Express error signature (err, req, res, next) which
 * Express uses to identify error-handling middleware by arity.
 *
 * Error classification:
 *   - Operational errors (4xx): Client-facing issues such as validation
 *     failures, not found, or bad requests. Logged at 'warn' level with
 *     the request path for diagnostics.
 *   - Programming errors (5xx): Unexpected server-side failures. Logged
 *     at 'error' level with the full stack trace for debugging. The client
 *     receives a generic message to avoid leaking implementation details.
 *
 * In development, the stack trace is included in the JSON response for
 * faster debugging. In production, stack traces are logged only via Winston
 * and never exposed to the client.
 *
 * Express 5.x automatically forwards rejected promises from async route
 * handlers to this middleware — no explicit try/catch wrappers are needed.
 *
 * This middleware MUST be registered as the LAST middleware in app.js.
 *
 * @module middleware/errorHandler
 */

'use strict';

const logger = require('../config/logger');

// ---------------------------------------------------------------------------
// Error Handler
// ---------------------------------------------------------------------------

/**
 * Express error-handling middleware.
 *
 * @param {Error}                          err  - Error object
 * @param {import('express').Request}      req  - Express request object
 * @param {import('express').Response}     res  - Express response object
 * @param {import('express').NextFunction} _next - Express next function (unused but required for arity)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Determine HTTP status code from the error or default to 500
  const statusCode = err.statusCode || err.status || 500;

  // Determine the error message
  const message = err.message || 'Internal Server Error';

  // Log at the appropriate severity level
  if (statusCode >= 500) {
    // Programming / server error — log full details including stack trace
    logger.error(message, {
      stack: err.stack,
      statusCode,
      method: req.method,
      path: req.originalUrl,
    });
  } else {
    // Operational / client error — log at warn level with request context
    logger.warn(message, {
      statusCode,
      method: req.method,
      path: req.originalUrl,
    });
  }

  // Build the response payload
  const response = {
    status: statusCode,
    message,
  };

  // In development, include the stack trace for faster debugging
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Send the structured JSON error response
  res.status(statusCode).json(response);
};

module.exports = errorHandler;
