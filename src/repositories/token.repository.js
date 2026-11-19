/**
 * Authentication Token Repository Module
 *
 * This module is the only accessor of the auth_tokens table. It persists opaque
 * session tokens as SHA-256 hex digests, looks a token up by that digest, and
 * records a revocation on the row it already holds.
 *
 * Exports:
 * - insert({ id, userId, tokenHash, expiresAt, createdAt }) writes one token row
 *   and returns it as stored.
 * - findByHash(tokenHash) returns the row carrying that digest, or null.
 * - revoke(id, revokedAt) records a revocation and reports how many rows changed.
 *
 * Only a digest is ever stored: minting the raw token and hashing it belong to
 * the authentication service, so no call path here can persist a usable
 * credential. A raw token is never a parameter of any method below.
 *
 * The module raises nothing of its own. Callers get exactly what the SQLite
 * driver reports — a constraint violation in particular is left untouched — and
 * whether a row is live, revoked or expired at a given instant is the caller's
 * judgement from the returned columns, not this module's.
 *
 * @module src/repositories/token.repository
 */

const { randomUUID } = require('node:crypto');
const { getDb } = require('../db');

/**
 * Column list every read and every write hands back, so callers always receive
 * the full row shape regardless of which method produced it.
 *
 * @type {string}
 */
const COLUMNS = 'id, user_id, token_hash, expires_at, revoked_at, created_at';

/**
 * Persist one session token.
 *
 * The value received in tokenHash is already a SHA-256 hex digest; this method
 * stores it verbatim. revoked_at is written as NULL, which is what makes a live
 * row distinguishable from a revoked one. A single statement is atomic on its
 * own, so no transaction is opened here: the caller may already hold one for the
 * registration write, and a nested transaction would be the wrong shape.
 *
 * @param {Object} token - The token row to write.
 * @param {string} [token.id] - Primary key; a fresh UUIDv4 when omitted.
 * @param {string} token.userId - Issuing user's id, stored as user_id and bound
 *   by the FOREIGN KEY to users(id).
 * @param {string} token.tokenHash - 64-character hex SHA-256 digest of the token.
 * @param {string} token.expiresAt - ISO-8601 UTC instant the token stops being
 *   accepted, computed by the caller from the configured lifetime.
 * @param {string} [token.createdAt] - ISO-8601 UTC issue instant; defaults to the
 *   current instant.
 * @returns {{id: string, user_id: string, token_hash: string, expires_at: string,
 *   revoked_at: string|null, created_at: string}} The row as stored.
 * @throws {Error} Whatever the driver raises; a duplicate token_hash surfaces as
 *   SQLite's UNIQUE constraint error and is deliberately not caught here.
 */
function insert(token) {
  const { id, userId, tokenHash, expiresAt, createdAt } = token;
  const db = getDb();
  const rowId = id || randomUUID();
  const created = createdAt || new Date().toISOString();

  return db
    .prepare(
      'INSERT INTO auth_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at) ' +
        `VALUES (?, ?, ?, ?, NULL, ?) RETURNING ${COLUMNS}`
    )
    .get(rowId, userId, tokenHash, expiresAt, created);
}

/**
 * Return the token row a SHA-256 digest belongs to, or null when none does.
 *
 * This is the only token lookup in the codebase. It is deliberately unfiltered:
 * revoked and expired rows come back too, because the caller has to tell an
 * unknown or revoked digest apart from one that was valid until its expires_at,
 * and it can only do that if revoked_at and expires_at arrive intact. The single
 * equality predicate is served by idx_auth_tokens_token_hash.
 *
 * @param {string} tokenHash - 64-character hex SHA-256 digest of a presented token.
 * @returns {{id: string, user_id: string, token_hash: string, expires_at: string,
 *   revoked_at: string|null, created_at: string}|null} The matching row, or null
 *   when the digest is unknown or the argument is not a usable digest string.
 */
function findByHash(tokenHash) {
  if (typeof tokenHash !== 'string' || tokenHash.length === 0) {
    return null;
  }

  const db = getDb();

  return db
    .prepare(`SELECT ${COLUMNS} FROM auth_tokens WHERE token_hash = ?`)
    .get(tokenHash) ?? null;
}

/**
 * Record a revocation on an existing token row.
 *
 * expires_at is left exactly as it was: a revocation is an event written onto
 * the row, not a shortened lifetime, and revoked_at is the only record of when
 * it happened. The row is updated rather than deleted so that record survives.
 *
 * @param {string} id - Primary key of the token row to revoke.
 * @param {string} [revokedAt] - ISO-8601 UTC instant to record; defaults to the
 *   current instant. Supplied by callers that need a pinned clock.
 * @returns {number} Rows changed: 1 when the token row was found, 0 when the id
 *   matches nothing or is not a usable id string, so a revocation can be told
 *   apart from a no-op without a second query.
 */
function revoke(id, revokedAt) {
  if (typeof id !== 'string' || id.length === 0) {
    return 0;
  }

  const db = getDb();
  const revoked = revokedAt || new Date().toISOString();

  return db
    .prepare('UPDATE auth_tokens SET revoked_at = ? WHERE id = ?')
    .run(revoked, id).changes;
}

module.exports = { insert, findByHash, revoke };
