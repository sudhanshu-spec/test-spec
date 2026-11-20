/**
 * Authentication Service Module
 *
 * The single owner of credential handling: scrypt password hashing and
 * verification, opaque token minting, revoking the session the guard resolved, and
 * the one user projection every response passes through. It holds no HTTP, SQL or
 * environment access; everything it returns lacks password_hash, password_salt and
 * token_hash (R-4), and no method accepts a user id from a caller (R-5).
 *
 * @module src/services/auth.service
 */

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { AppError } = require('../errors');
const appConfig = require('../config');
const userRepository = require('../repositories/user.repository');
const tokenRepository = require('../repositories/token.repository');

// The asynchronous KDF R-4 names: scrypt derives in libuv's thread pool so a login cannot
// stall in-flight requests, and at its default cost a stored digest still verifies.
const deriveKey = promisify(crypto.scrypt);

// Salt, key, token and clock dimensions of the hashing and minting schemes.
const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const TOKEN_BYTES = 32;
const DIGEST = 'sha256';
const MS_PER_HOUR = 60 * 60 * 1000;

// The one message an authentication failure carries, shared by both failing paths.
const INVALID_CREDENTIALS_MESSAGE = 'The email or password is incorrect.';

// The account an unknown address is verified against, so it costs the same single
// derivation as a wrong password and response time cannot enumerate addresses.
const UNKNOWN_EMAIL_ACCOUNT = Object.freeze({
  password_salt: 'fedcba9876543210'.repeat(2),
  password_hash: 'fedcba9876543210'.repeat(8)
});

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
// mapping so both answer identically. The text names no address; AppError takes the code key.
function emailAlreadyRegistered() {
  return new AppError('EMAIL_ALREADY_REGISTERED', 'An account with that email is already registered.');
}

// Constant-time password comparison, awaited: the length guard comes first because
// timingSafeEqual throws on buffers of differing length.
async function verifyPassword(password, passwordSalt, passwordHash) {
  const derived = await deriveKey(password, Buffer.from(passwordSalt, 'hex'), KEY_LENGTH);
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
 * Build the authentication service over injected collaborators; `now` is defaulted
 * so a unit suite pins the clock, and the transaction a registration commits in
 * travels with the injected `users` repository, so this module opens none itself.
 * @param {Object} deps - { users, tokens, config, now }.
 * @returns {{register: Function, login: Function, revokeSession: Function}} The service.
 */
function createAuthService({ users, tokens, config, now = () => new Date() }) {
  /**
   * Create an account and its first session token in one transaction, deriving the
   * password digest before the runner is entered so no write lock spans the await.
   * @param {{name: string, email: string, password: string}} input - Registration input.
   * @returns {Promise<{user: Object, token: string}>} The public user and the raw token.
   * @throws {AppError} 409 EMAIL_ALREADY_REGISTERED for a duplicate address.
   */
  async function register({ name, email, password } = {}) {
    const normalisedEmail = normaliseEmail(email);
    if (users.findByEmail(normalisedEmail)) {
      throw emailAlreadyRegistered();
    }

    const issuedAt = now();
    const createdAt = issuedAt.toISOString();
    const userId = crypto.randomUUID();
    const passwordSalt = crypto.randomBytes(SALT_BYTES).toString('hex');
    const passwordHash = (await deriveKey(password, Buffer.from(passwordSalt, 'hex'), KEY_LENGTH)).toString('hex');
    const issued = issueToken(userId, issuedAt, config.tokenTtlHours);
    try {
      // One runner call for both inserts, so a failure leaves neither row behind;
      // the row the insert returns is what the response is projected from.
      const stored = users.runInTransaction(() => {
        const row = users.insert({
          id: userId, name, email: normalisedEmail, passwordHash, passwordSalt, createdAt, updatedAt: createdAt
        });
        tokens.insert(issued.row);
        return row;
      });
      return { user: toPublicUser(stored), token: issued.token };
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        throw emailAlreadyRegistered();
      }
      throw error;
    }
  }

  /**
   * Verify credentials and mint a fresh token. One derivation runs on every path —
   * the stored row or the fixed account — and both failures share one throw site, so
   * neither the payload nor the response time tells the two cases apart.
   * @param {{email: string, password: string}} input - Login input.
   * @returns {Promise<{user: Object, token: string}>} The public user and the raw token.
   * @throws {AppError} 401 INVALID_CREDENTIALS for either failure.
   */
  async function login({ email, password } = {}) {
    const row = users.findByEmail(normaliseEmail(email));
    const presented = typeof password === 'string' ? password : '';
    const account = row || UNKNOWN_EMAIL_ACCOUNT;
    const derived = await verifyPassword(presented, account.password_salt, account.password_hash);
    const verified = Boolean(row) && presented.length > 0 && derived;

    if (!verified) {
      throw new AppError('INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
    }

    const issued = issueToken(row.id, now(), config.tokenTtlHours);
    tokens.insert(issued.row);
    return { user: toPublicUser(row), token: issued.token };
  }

  /**
   * Revoke the session row the guard resolved for this request. Whether the
   * presented credential was absent, invalid or expired is decided in
   * src/middleware/authenticate.js alone, so this is the one statement it costs.
   * @param {Object} session - The token row the guard looked up and validated.
   * @returns {void}
   */
  function revokeSession(session) {
    tokens.revoke(session.id);
  }

  return { register, login, revokeSession };
}

/**
 * The ready-made service the auth router imports; building it opens no database
 * connection and writes nothing.
 * @type {{register: Function, login: Function, revokeSession: Function}}
 */
const authService = createAuthService({
  users: userRepository,
  tokens: tokenRepository,
  config: appConfig,
  now: () => new Date()
});

module.exports = {
  createAuthService,
  authService,
  toPublicUser,
  hashToken
};
