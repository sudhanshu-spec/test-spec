/**
 * 404 Not Found Handler Middleware
 *
 * This module provides a catch-all middleware that intercepts requests
 * matching no defined route and responds with a structured 404 JSON
 * response. It replaces Express's default 'Cannot GET /path' text
 * response with consistent, machine-parseable error formatting.
 *
 * Must be mounted after all route registrations in src/app.js and
 * before the centralized error handler.
 *
 * @module src/middleware/notFoundHandler
 */

/**
 * 404 catch-all middleware
 *
 * Responds with a structured JSON error when no route matches the request.
 * Includes the original request path in the response for debugging.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: {
      status: 404,
      message: 'Not Found',
      path: req.originalUrl
    }
  });
};

module.exports = notFoundHandler;
