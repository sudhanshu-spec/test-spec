/**
 * API Not-Found Middleware Module
 *
 * This module terminates a request whose path matched nothing under the API
 * mount point, answering it with the application's single JSON error envelope
 * instead of Express's default HTML 404 page.
 *
 * It is installed only as `app.use('/api', notFound)`, so a path outside the
 * API mount point keeps Express's own 404 and the tutorial routes at `/`,
 * `/evening` and `/good-evening` are never shadowed. Routing has already
 * failed by the time this middleware runs, so it reads neither the route table
 * nor the request.
 *
 * The envelope it writes is the one `src/middleware/error-handler.js` writes
 * for every other failure; the code and its HTTP status come from
 * `src/errors.js`, so the two can never disagree.
 *
 * @module src/middleware/not-found
 */

const { AppError } = require('../errors');

/**
 * Fixed text for an unmatched API path.
 *
 * It reflects nothing from the request on purpose: the envelope stays stable
 * for assertions and no caller-controlled text is echoed back.
 *
 * @type {string}
 */
const ROUTE_NOT_FOUND_MESSAGE = 'The requested API route does not exist.';

/**
 * Answers an unmatched API path with the JSON error envelope.
 *
 * Terminal by design: it never calls `next()`, being the last handler for a
 * path under the API mount point. A path outside that mount point never
 * reaches it.
 *
 * @param {import('express').Request} req - Incoming request; not inspected.
 * @param {import('express').Response} res - Response the envelope is written to.
 * @param {import('express').NextFunction} next - Continuation; unused, present so
 *   Express registers this as ordinary (not error-handling) middleware.
 * @returns {void}
 */
function notFound(req, res, next) {
  const error = new AppError('ROUTE_NOT_FOUND', ROUTE_NOT_FOUND_MESSAGE);

  res.status(error.status).json({ error: { code: error.code, message: error.message } });
}

module.exports = { notFound };
