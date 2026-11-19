/**
 * API Error Handler Middleware Module
 *
 * This module is the single writer of the application's JSON error envelope.
 * Every failure Express routes to it under the `/api` mount point — a domain
 * failure raised by a router or service, a malformed JSON body, or an
 * unexpected throw — leaves through one shape:
 *
 *   { "error": { "code": "<CODE>", "message": "<human readable>",
 *                "details": [{ "field": "<name>", "issue": "<text>" }] } }
 *
 * The `details` key is written only for a validation failure that carries field
 * entries, and is omitted entirely otherwise. It is the last of the request
 * pipeline stages, registered after the API router and after the not-found
 * middleware, so any of them may hand it a failure.
 *
 * @module src/middleware/error-handler
 */

const { AppError, ERROR_CODES } = require('../errors');

/**
 * Message answered when the request body was not valid JSON. Fixed text, so the
 * body parser's own message, the raw body and its stack never reach the client.
 * @type {string}
 */
const PARSE_FAILURE_MESSAGE = 'Request body is not valid JSON.';

/**
 * Message answered for a failure outside the error vocabulary. It states only
 * that something failed, so no stack, SQL text, file path or other internal
 * detail can be read out of a 500 response.
 * @type {string}
 */
const INTERNAL_FAILURE_MESSAGE = 'An unexpected error occurred.';

/**
 * Writes one failure as the error envelope.
 *
 * Field details are copied onto the response only when the failure carries at
 * least one entry; the key is absent otherwise — never null, never an empty
 * array. Each entry keeps the `{ field, issue }` shape it was raised with, so
 * the issue strings the API contract fixes reach the client verbatim.
 *
 * @param {import('express').Response} res - Response being written.
 * @param {AppError} failure - Failure to serialise.
 * @returns {import('express').Response} The response, once sent.
 */
function sendEnvelope(res, failure) {
  const envelope = {
    error: {
      code: failure.code,
      message: failure.message
    }
  };

  if (Array.isArray(failure.details) && failure.details.length > 0) {
    envelope.error.details = failure.details;
  }

  return res.status(failure.status).json(envelope);
}

/**
 * Reports whether a failure came from the JSON body parser rejecting the
 * request body, rather than from the application's own logic.
 *
 * A parser rejection is tagged with `type: 'entity.parse.failed'`; the shape
 * check covers a `SyntaxError` carrying the parsed-body marker, whose status is
 * compared against the vocabulary rather than a status literal of its own.
 *
 * @param {unknown} err - Value an upstream stage passed to the handler.
 * @returns {boolean} True when the request body could not be parsed as JSON.
 */
function isParseFailure(err) {
  if (!err || typeof err !== 'object') {
    return false;
  }

  if (err.type === 'entity.parse.failed') {
    return true;
  }

  return err instanceof SyntaxError
    && err.status === ERROR_CODES.VALIDATION_ERROR
    && 'body' in err;
}

/**
 * Express error-handling middleware for the API: the single writer of the JSON
 * error envelope.
 *
 * The branches run in this order, each returning so that no second response is
 * ever attempted:
 *
 * 1. The response has already started (`res.headersSent`) — delegate to
 *    `next`, which hands the failure to Express's default handler and closes
 *    the connection.
 * 2. The JSON body parser rejected the body — answer `VALIDATION_ERROR` with
 *    the fixed message and no details, since a syntax error names no field.
 * 3. A domain failure (`AppError`) — answer its own status, code and message,
 *    plus its details when it carries field entries. Eleven of the vocabulary's
 *    thirteen codes arrive this way and are passed through unchanged, never
 *    re-valued and never downgraded to a 500.
 * 4. Anything else — log the stack server-side and answer a generic
 *    `INTERNAL_ERROR`. The stack is logged and never returned.
 *
 * The handler is mounted under `/api` only and has no effect on any other
 * path: it does not mount itself, alter non-API responses, or intercept the
 * routes served at the root.
 *
 * @param {unknown} err - Failure Express routed here.
 * @param {import('express').Request} req - Request that failed.
 * @param {import('express').Response} res - Response being written.
 * @param {import('express').NextFunction} next - Continues to Express's default handler.
 * @returns {import('express').Response|void} The sent response, or nothing when delegated.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (isParseFailure(err)) {
    return sendEnvelope(res, new AppError('VALIDATION_ERROR', PARSE_FAILURE_MESSAGE));
  }

  if (err instanceof AppError) {
    return sendEnvelope(res, err);
  }

  console.error(
    `API error while handling ${req.method} ${req.originalUrl || req.url}:`,
    err && err.stack ? err.stack : err
  );

  return sendEnvelope(res, new AppError('INTERNAL_ERROR', INTERNAL_FAILURE_MESSAGE));
}

module.exports = { errorHandler };
