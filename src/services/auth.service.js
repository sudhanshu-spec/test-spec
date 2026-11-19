/**
 * Authentication Service Module
 *
 * The single owner of credential handling: scrypt password hashing and
 * verification, opaque token minting, revocation on logout, and the one user
 * projection every response passes through. It holds no HTTP, SQL or environment
 * access; everything it returns lacks password_hash, password_salt and token_hash
 * (R-4), and no method accepts a user id from a caller (R-5).
 *
 * @module src/services/auth.service
 */

const crypto = require('node:crypto');
const { AppError } = require('../errors');
const { getDb } = require('../db');
const appConfig = require('../config');
const userRepository = require('../repositories/user.repository');
const tokenRepository = require('../repositories/token.repository');

// Salt, key, token and clock dimensions of the hashing and minting schemes.
const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const TOKEN_BYTES = 32;
const DIGEST = 'sha256';
const MS_PER_HOUR = 60 * 60 * 1000;

// The one message an authentication failure carries, shared by both failing paths.
const INVALID_CREDENTIALS_MESSAGE = 'The email or password is incorrect.';

/**
 * Derive the SHA-256 hex digest a raw session token is stored under; the
 * authentication middleware hashes presented tokens with this same function.
 * @param {string} rawToken - The opaque token handed to the client on issue.
 * @returns {string} 64-character hex digest; never the raw token.
 */
function hashToken(rawToken) {
  return crypto.createHash(DIGEST).update(String(rawToken)).digest('hex');
}

/**
 * Project a stored user row onto the four fields a response may carry, picking
 * them explicitly so no hash, salt or token column can reach a body.
 * @param {Object} row - User row as stored, in snake_case.
 * @returns {{id: string, name: string, email: string, created_at: string}|null} The projection.
 */
function toPublicUser(row) {
  return row ? { id: row.id, name: row.name, email: row.email, created_at: row.created_at } : null;
}

// The stored form of an address, matching what the users table compares against.
function normaliseEmail(email) {
  return String(email).trim().toLowerCase();
}

// The duplicate-registration failure, shared by the pre-check and the constraint
// mapping so both answer identically. AppError takes the code key, not its status.
function emailAlreadyRegistered(email) {
  return new AppError('EMAIL_ALREADY_REGISTERED', `An account with the email ${email} is already registered.`);
}

// Constant-time password comparison; the length guard comes first because
// timingSafeEqual throws on buffers of differing length.
function verifyPassword(password, passwordSalt, passwordHash) {
  const derived = crypto.scryptSync(password, Buffer.from(passwordSalt, 'hex'), KEY_LENGTH);
  const expected = Buffer.from(passwordHash, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

// Mint a raw token and the row recording it: only the digest is persisted, so no
// stored row can be replayed as a credential.
function issueToken(userId, issuedAt, ttlHours) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(issuedAt.getTime() + ttlHours * MS_PER_HOUR).toISOString();
  return {
    token,
    row: { id: crypto.randomUUID(), userId, tokenHash: hashToken(token), expiresAt, createdAt: issuedAt.toISOString() }
  };
}

// True for SQLite's unique violation on users.email: a duplicate that slips past
// the pre-check is recognised here, and every other failure is rethrown as is.
function isDuplicateEmailError(error) {
  return Boolean(error) && (error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    /UNIQUE constraint failed: users\.email/.test(String(error.message)));
}

/**
 * Build the authentication service over injected collaborators; `now` and
 * `runInTransaction` are defaulted so a unit suite pins the clock and needs no
 * database, while the singleton below supplies the real ones.
 * @param {Object} deps - { users, tokens, config, now, runInTransaction }.
 * @returns {{register: Function, login: Function, revokeToken: Function}} The service.
 */
function createAuthService({
  users, tokens, config, now = () => new Date(), runInTransaction = (fn) => fn()
}) {
  /**
   * Create an account and its first session token in one transaction.
   * @param {{name: string, email: string, password: string}} input - Registration input.
   * @returns {{user: Object, token: string}} The public user and the raw token.
   * @throws {AppError} 409 EMAIL_ALREADY_REGISTERED for a duplicate address.
   */
  function register({ name, email, password } = {}) {
    const normalisedEmail = normaliseEmail(email);
    if (users.findByEmail(normalisedEmail)) {
      throw emailAlreadyRegistered(normalisedEmail);
    }

    const issuedAt = now();
    const createdAt = issuedAt.toISOString();
    const userId = crypto.randomUUID();
    const passwordSalt = crypto.randomBytes(SALT_BYTES).toString('hex');
    const passwordHash = crypto.scryptSync(password, Buffer.from(passwordSalt, 'hex'), KEY_LENGTH).toString('hex');
    const issued = issueToken(userId, issuedAt, config.tokenTtlHours);
    try {
      // One runner call for both inserts, so a failure leaves neither row behind.
      runInTransaction(() => {
        users.insert({ id: userId, name, email: normalisedEmail, passwordHash, passwordSalt, createdAt, updatedAt: createdAt });
        tokens.insert(issued.row);
      });
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        throw emailAlreadyRegistered(normalisedEmail);
      }
      throw error;
    }
    return { user: toPublicUser({ id: userId, name, email: normalisedEmail, created_at: createdAt }), token: issued.token };
  }

  /**
   * Verify credentials and mint a fresh token. An unknown email and a wrong
   * password share one throw site, so neither is distinguishable in a response.
   * @param {{email: string, password: string}} input - Login input.
   * @returns {{user: Object, token: string}} The public user and the raw token.
   * @throws {AppError} 401 INVALID_CREDENTIALS for either failure.
   */
  function login({ email, password } = {}) {
    const row = users.findByEmail(normaliseEmail(email));
    const verified = Boolean(row) && typeof password === 'string' && password.length > 0 &&
      verifyPassword(password, row.password_salt, row.password_hash);
    if (!verified) {
      throw new AppError('INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
    }

    const issued = issueToken(row.id, now(), config.tokenTtlHours);
    tokens.insert(issued.row);
    return { user: toPublicUser(row), token: issued.token };
  }

  /**
   * Revoke the presented token, checking presence, then validity, then expiry, so
   * a revoked token is never revocable twice and an expired one reports expiry.
   * @param {string} rawToken - The opaque token the caller presented.
   * @returns {void}
   * @throws {AppError} 401 TOKEN_REQUIRED, TOKEN_INVALID or TOKEN_EXPIRED.
   */
  function revokeToken(rawToken) {
    if (!rawToken) {
      throw new AppError('TOKEN_REQUIRED', 'An access token is required.');
    }
    const row = tokens.findByHash(hashToken(rawToken));
    if (!row || row.revoked_at) {
      throw new AppError('TOKEN_INVALID', 'The access token is invalid or has been revoked.');
    }
    if (Date.parse(row.expires_at) <= now().getTime()) {
      throw new AppError('TOKEN_EXPIRED', 'The access token has expired.');
    }

    tokens.revoke(row.id);
  }

  return { register, login, revokeToken };
}

/**
 * The ready-made service the auth router imports; building it opens no database
 * connection and writes nothing.
 * @type {{register: Function, login: Function, revokeToken: Function}}
 */
const authService = createAuthService({
  users: userRepository,
  tokens: tokenRepository,
  config: appConfig,
  now: () => new Date(),
  runInTransaction: (fn) => getDb().transaction(fn)()
});

module.exports = {
  createAuthService,
  authService,
  toPublicUser,
  hashToken
};
