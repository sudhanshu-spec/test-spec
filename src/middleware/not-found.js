/**
 * API Not-Found Middleware Module
 *
 * This module terminates a request whose path matched nothing under the API
 * mount point, answering it with the application's single JSON error envelope
 * instead of Express's default HTML 404 page. It does so by handing a
 * `ROUTE_NOT_FOUND` failure to `src/middleware/error-handler.js` — the single
 * writer of that envelope, mounted immediately after this module — and writes
 * no response itself, so an unmatched API path and every other failure leave
 * through one shape and one owner.
 *
 * It is installed only as `app.use('/api', notFound)`, so a path outside the
 * API mount point keeps Express's own 404 and the tutorial routes at `/`,
 * `/evening` and `/good-evening` are never shadowed. Routing has already
 * failed by the time this middleware runs, so it reads neither the route table
 * nor the request.
 *
 * The code and its HTTP status come from `src/errors.js`, so the failure and
 * the status the error handler answers with can never disagree.
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
 * Reports an unmatched API path as a `ROUTE_NOT_FOUND` failure.
 *
 * A path outside the API mount point never reaches it. Nothing is written
 * here: the failure is passed to `next`, and the error-handler middleware
 * mounted right after this one answers it with the 404 JSON envelope.
 *
 * @param {import('express').Request} req - Incoming request; not inspected.
 * @param {import('express').Response} res - Never written.
 * @param {import('express').NextFunction} next - Continuation, called exactly
 *   once with the failure; present so Express registers this as ordinary (not
 *   error-handling) middleware.
 * @returns {void}
 */
function notFound(req, res, next) {
  return next(new AppError('ROUTE_NOT_FOUND', ROUTE_NOT_FOUND_MESSAGE));
}

module.exports = { notFound };
