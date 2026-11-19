/**
 * Bearer Token Authentication Middleware Module
 *
 * The sole place where a presented token becomes a `req.user`: it parses the
 * `Authorization: Bearer <token>` header, digests the credential with SHA-256,
 * looks that digest up through the token repository, checks revocation and then
 * expiry, resolves the owning user and hands the pipeline a secret-free
 * projection of it. Installed inside the API routers only, never globally.
 *
 * It never writes a response: each failure goes to `next()` as an `AppError`
 * from `src/errors.js`, leaving `src/middleware/error-handler.js` the single
 * writer of the envelope. Failure order: TOKEN_REQUIRED, then TOKEN_INVALID
 * (unknown or revoked), then TOKEN_EXPIRED.
 *
 * Exports: createAuthenticate({ tokens, users, now }) - the injectable factory
 * the tests build the guard with - and authenticate, the ready-made guard the
 * API routers import.
 *
 * @module src/middleware/authenticate
 */

const crypto = require('node:crypto');

const { AppError } = require('../errors');
const tokenRepository = require('../repositories/token.repository');
const userRepository = require('../repositories/user.repository');

/** Answered when the request carries no usable Bearer credential. @type {string} */
const TOKEN_REQUIRED_MESSAGE = 'An Authorization: Bearer token is required.';

/**
 * Answered for a credential matching no live token; an unknown digest and a
 * revoked row are indistinguishable to the caller.
 * @type {string}
 */
const TOKEN_INVALID_MESSAGE = 'The presented authentication token is not valid.';

/** Answered for a token that was valid but is past its `expires_at`. @type {string} */
const TOKEN_EXPIRED_MESSAGE = 'The presented authentication token has expired.';

/**
 * The one accepted credential shape: `Bearer`, one or more spaces or tabs, and
 * a single non-space credential, matched case-insensitively. Anything else —
 * `Token …`, `Basic …`, a bare `Bearer`, an empty header — carries no
 * credential, which is why each of them is answered with TOKEN_REQUIRED.
 * @type {RegExp}
 */
const BEARER_PATTERN = /^Bearer[ \t]+(\S+)$/i;

/**
 * The clock the expiry comparison reads when none is injected.
 * @returns {Date} The current instant.
 */
function systemClock() {
  return new Date();
}

/**
 * Extract the credential from the request's `Authorization` header.
 *
 * Node lowercases header names, so only `authorization` is read. An absent
 * header, an array (a repeated header) or any non-string value counts as no
 * credential, as does a string carrying no Bearer credential.
 *
 * @param {import('express').Request} req - Incoming request.
 * @returns {string|null} The presented credential, or null when none was parsed.
 */
function readBearerToken(req) {
  const authorization = req && req.headers ? req.headers.authorization : undefined;

  if (typeof authorization !== 'string') {
    return null;
  }

  const match = BEARER_PATTERN.exec(authorization.trim());

  return match ? match[1] : null;
}

/**
 * Digest the presented credential.
 *
 * Hashing happens before the lookup, so the raw value never leaves this module:
 * the repository is handed the hex digest alone, which is also the only form
 * `auth_tokens.token_hash` holds.
 *
 * @param {string} token - Raw credential presented in the header.
 * @returns {string} 64-character lowercase hex SHA-256 digest.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Copy the caller-safe columns of a stored user row, which carries
 * `password_hash` and `password_salt` and so is never passed downstream.
 *
 * @param {Object} row - Stored user row.
 * @returns {{id: string, name: string, email: string, created_at: string}} The
 *   secret-free user.
 */
function projectUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: row.created_at
  };
}

/**
 * Build the Bearer-token guard over injected repositories and clock.
 *
 * The returned middleware runs these steps and stops at the first failure,
 * calling `next()` exactly once on every path:
 *
 * 1. No Bearer credential in the header - TOKEN_REQUIRED.
 * 2. No row for the credential's digest, or the row is revoked, a revoked token
 *    being invalid rather than expired - TOKEN_INVALID.
 * 3. The row's `expires_at` is at or before the injected clock - TOKEN_EXPIRED.
 * 4. The row's owner no longer exists - TOKEN_INVALID.
 * 5. Otherwise `req.user` is the secret-free projection and `next()` is called
 *    with no argument.
 *
 * Identity comes from the token alone: no user id is read from the body, query,
 * path or any other header, and ownership stays with the repositories, which
 * scope every user-scoped statement by `req.user.id` and so answer 404 rather
 * than 403 for another user's row.
 *
 * @param {Object} dependencies - Injected collaborators.
 * @param {{findByHash: function(string): (Object|null)}} dependencies.tokens -
 *   Token repository; it returns revoked and expired rows intact, which keeps
 *   the three failure modes distinguishable here.
 * @param {{findById: function(string): (Object|null)}} dependencies.users - User
 *   repository; it returns the stored row, secret columns included.
 * @param {function(): Date} [dependencies.now] - Clock the expiry comparison
 *   reads, so a test can pin the instant.
 * @returns {function(import('express').Request, import('express').Response,
 *   import('express').NextFunction): void} Authentication middleware.
 */
function createAuthenticate({ tokens, users, now = systemClock }) {
  /**
   * Authenticate the request, or continue with the reason it failed.
   *
   * @param {import('express').Request} req - Request; `req.user` is set on success.
   * @param {import('express').Response} res - Never written.
   * @param {import('express').NextFunction} next - Continuation, called exactly once.
   * @returns {void}
   */
  return function authenticate(req, res, next) {
    const presented = readBearerToken(req);

    if (!presented) {
      return next(new AppError('TOKEN_REQUIRED', TOKEN_REQUIRED_MESSAGE));
    }

    const record = tokens.findByHash(hashToken(presented));

    if (!record || record.revoked_at) {
      return next(new AppError('TOKEN_INVALID', TOKEN_INVALID_MESSAGE));
    }

    if (new Date(record.expires_at).getTime() <= now().getTime()) {
      return next(new AppError('TOKEN_EXPIRED', TOKEN_EXPIRED_MESSAGE));
    }

    const user = users.findById(record.user_id);

    if (!user) {
      return next(new AppError('TOKEN_INVALID', TOKEN_INVALID_MESSAGE));
    }

    req.user = projectUser(user);

    return next();
  };
}

/**
 * The application's guard, built once over the real repositories and the system
 * clock. Requiring this module performs no I/O: the repositories reach SQLite
 * through the lazy `getDb()`, so no connection opens and no file is created
 * until a request runs.
 *
 * @type {function(import('express').Request, import('express').Response,
 *   import('express').NextFunction): void}
 */
const authenticate = createAuthenticate({
  tokens: tokenRepository,
  users: userRepository,
  now: systemClock
});

module.exports = { authenticate, createAuthenticate };
