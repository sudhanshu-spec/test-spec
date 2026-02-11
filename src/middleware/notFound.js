/**
 * 404 Not Found Catch-All Middleware
 *
 * This middleware handles any request that does not match a defined route.
 * It is registered in app.js AFTER all route handlers but BEFORE the global
 * error handler, ensuring unmatched requests receive a consistent structured
 * JSON 404 response instead of falling through to Express's default HTML
 * error page.
 *
 * This middleware terminates the request/response cycle — it does NOT call
 * next(). The HTTP logger (Morgan) will have already logged the incoming
 * request before this middleware executes.
 *
 * @module middleware/notFound
 */

'use strict';

// ---------------------------------------------------------------------------
// 404 Not Found Handler
// ---------------------------------------------------------------------------

/**
 * Express middleware that returns a structured JSON 404 response for any
 * request that does not match a defined route.
 *
 * @param {import('express').Request}  req  - Express request object
 * @param {import('express').Response} res  - Express response object
 * @param {import('express').NextFunction} _next - Express next function (unused)
 */
const notFound = (req, res, _next) => {
  res.status(404).json({
    status: 404,
    message: 'Not Found',
  });
};

module.exports = notFound;
