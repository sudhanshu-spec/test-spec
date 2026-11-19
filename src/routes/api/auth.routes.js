/**
 * Authentication Routes Module
 *
 * The four authentication endpoints on one Router mounted at '/auth'. Each
 * handler validates the request shape, calls exactly one authentication service
 * method and maps the outcome to one status and the documented body; hashing,
 * tokens, identity and the error envelope belong to the service, the guard and
 * the API-scoped error handler.
 *
 * Route contracts:
 * - POST '/register' returns 201 { user: {id,name,email,created_at}, token } as JSON
 * - POST '/login' returns 200 { user: {id,name,email,created_at}, token } as JSON
 * - GET '/session' returns 200 { user } as JSON (Bearer token required)
 * - POST '/logout' returns 204 with no body (Bearer token required)
 *
 * @module src/routes/api/auth.routes
 */

const express = require('express');

const { AppError } = require('../../errors');
const { authService } = require('../../services/auth.service');
const { authenticate } = require('../../middleware/authenticate');

const router = express.Router();

// Code every rejected input is answered with; AppError resolves its 400 status
// from src/errors.js, so no status literal appears here. `details` names the rules.
const VALIDATION_ERROR = 'VALIDATION_ERROR';
const VALIDATION_MESSAGE = 'The request body failed validation.';

// Name and password limits: 80 characters, and 8 characters but 72 BYTES, since a
// multi-byte character counts once as a character yet several times towards the
// scrypt input limit the byte cap guards.
const NAME_MAX_LENGTH = 80;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

// Deliberately loose: rejects what cannot be an address, leaving the rest to the
// service and the users.email unique index.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Build the one failure a rejected request body is answered with.
 * @param {Array<{field: string, issue: string}>} details - One entry per failing rule.
 * @returns {AppError} The 400 VALIDATION_ERROR the caller throws.
 */
function validationFailure(details) {
  return new AppError(VALIDATION_ERROR, VALIDATION_MESSAGE, details);
}

/**
 * Validate a registration body, collecting every failing rule at once. A value of
 * the wrong type counts as absent, so a number supplied for a name is reported as
 * a missing name rather than reaching the service.
 *
 * @param {Object} body - Request body, already known to be an object.
 * @returns {{name: string, email: string, password: string}} Accepted values: the
 *   trimmed name, the trimmed lowercased address and the password as supplied.
 * @throws {AppError} 400 VALIDATION_ERROR naming each failing field.
 */
function readRegistration(body) {
  const details = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (name.length === 0) {
    details.push({ field: 'name', issue: 'name_required' });
  } else if (name.length > NAME_MAX_LENGTH) {
    details.push({ field: 'name', issue: 'name_too_long' });
  }
  if (email.length === 0) {
    details.push({ field: 'email', issue: 'email_required' });
  } else if (!EMAIL_PATTERN.test(email)) {
    details.push({ field: 'email', issue: 'email_invalid' });
  }
  if (password.length === 0) {
    details.push({ field: 'password', issue: 'password_required' });
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    details.push({ field: 'password', issue: 'password_too_short' });
  } else if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    details.push({ field: 'password', issue: 'password_too_long' });
  }

  if (details.length > 0) {
    throw validationFailure(details);
  }

  return { name, email, password };
}

/**
 * Validate a login body, checking presence only: re-applying the registration
 * rules would answer a mistyped address as a validation failure instead of the one
 * credential failure, and which address exists is the service's decision.
 *
 * @param {Object} body - Request body, already known to be an object.
 * @returns {{email: string, password: string}} Accepted values.
 * @throws {AppError} 400 VALIDATION_ERROR naming each missing field.
 */
function readLogin(body) {
  const details = [];
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (email.length === 0) {
    details.push({ field: 'email', issue: 'email_required' });
  }
  if (password.length === 0) {
    details.push({ field: 'password', issue: 'password_required' });
  }

  if (details.length > 0) {
    throw validationFailure(details);
  }

  return { email, password };
}

/**
 * Create an account and open a session from {name, email, password}: a public user
 * projection and a fresh opaque token, with no hash or salt anywhere in the body.
 *
 * @route POST /register
 */
router.post('/register', async (req, res) => {
  const body = req.body ?? {};
  const { name, email, password } = readRegistration(body);
  const { user, token } = await authService.register({ name, email, password });

  res.status(201).json({ user, token });
});

/**
 * Open a session for an existing account from {email, password}. An unknown
 * address and a wrong password leave the service through one throw site, so no
 * branch here can tell them apart.
 *
 * @route POST /login
 */
router.post('/login', async (req, res) => {
  const body = req.body ?? {};
  const { email, password } = readLogin(body);
  const { user, token } = await authService.login({ email, password });

  res.json({ user, token });
});

/**
 * Report the session the presented credential belongs to. The guard already put
 * the caller-safe projection on `req.user`, so nothing is looked up again here.
 *
 * @route GET /session
 */
router.get('/session', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

/**
 * Close the session the presented credential belongs to. It is revoked rather than
 * deleted, so the row keeps the record of when it stopped being usable. The
 * response carries no body at all: a 204 with JSON would break the contract.
 *
 * @route POST /logout
 */
router.post('/logout', authenticate, async (req, res) => {
  // The guard resolved and validated this request's session row and published it on
  // the request, so revoking it is one statement: neither the header is parsed again
  // nor the row is looked up a second time.
  authService.revokeSession(req.sessionToken);

  res.status(204).end();
});

module.exports = router;
