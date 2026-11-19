/**
 * User Repository Module
 *
 * The users table accessor: the only module in the codebase that holds SQL
 * touching users. It reads and writes that one table and nothing else — no
 * token, order or reservation statement, no hashing, no response shaping and no
 * error vocabulary. Every statement method returns a plain row keyed by the
 * schema's own column names, or null when no row matches.
 *
 * Beyond those statements it publishes one unit-of-work facility,
 * runInTransaction, so a caller that needs several writes to commit together
 * runs them through this module instead of reaching src/db itself; the
 * connection handle, its pragmas and its lifecycle stay inside src/db, and no
 * statement of this module's is added or moved to provide it.
 *
 * The rows returned here carry password_hash and password_salt, because
 * src/services/auth.service.js needs both to verify a password; keeping those
 * columns out of a response is that service's projection, which is why no
 * method here strips them. A duplicate email raises SQLite's unique-constraint
 * error and this module lets it propagate untouched, so the service can
 * recognise a duplicate registration from the driver's own error code.
 *
 * Exports: insert, findByEmail, findById, runInTransaction.
 *
 * @module src/repositories/user.repository
 */

const { randomUUID } = require('node:crypto');
const { getDb } = require('../db');

/**
 * Persist one user row and return it exactly as stored.
 *
 * The schema declares no AUTOINCREMENT and no default clause on id, so a row
 * cannot be inserted without one; the caller normally supplies the id and
 * one is minted here only when it is absent. created_at and updated_at are
 * written by this same statement, which is how the row records its own creation
 * in a schema that has no audit table, and both default to a single clock
 * reading so created_at can never be later than updated_at.
 *
 * The email is stored lowercased. users.email is UNIQUE, and normalising on
 * write is what makes that constraint case-insensitive in practice; findByEmail
 * normalises its lookup the same way, so the two agree.
 *
 * Statements are prepared per call rather than cached at load, because the
 * connection getDb() returns can be closed and reopened by closeDb() and a
 * statement prepared against a closed handle could not be reused.
 *
 * @param {Object} [user] - The user to persist.
 * @param {string} [user.id] - Row id; a UUIDv4 is minted when omitted.
 * @param {string} user.name - Display name.
 * @param {string} user.email - Email address, stored lowercased.
 * @param {string} user.passwordHash - Already-derived password hash.
 * @param {string} user.passwordSalt - The salt the hash was derived with.
 * @param {string} [user.createdAt] - ISO-8601 UTC creation timestamp.
 * @param {string} [user.updatedAt] - ISO-8601 UTC last-update timestamp.
 * @returns {Object|null} The stored row, including password_hash and
 *   password_salt, or null when it could not be read back.
 */
function insert({ id, name, email, passwordHash, passwordSalt, createdAt, updatedAt } = {}) {
  const timestamp = new Date().toISOString();
  const rowId = id || randomUUID();

  getDb()
    .prepare(
      'INSERT INTO users (id, name, email, password_hash, password_salt, created_at, updated_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      rowId,
      name,
      email.toLowerCase(),
      passwordHash,
      passwordSalt,
      createdAt || timestamp,
      updatedAt || timestamp
    );

  // Read the row back instead of rebuilding it here: the statement above is the
  // only description of what was stored, so the returned row cannot disagree
  // with the database.
  return findById(rowId);
}

/**
 * Find one user by email, ignoring case.
 *
 * The argument is normalised before it is bound, so the comparison is
 * case-insensitive at the storage layer for a caller that passes mixed case,
 * and it matches the lowercased form insert writes. A value that is not a
 * non-empty string cannot match any stored row and is answered with null
 * without issuing a query.
 *
 * @param {string} email - Email address to look up, in any case.
 * @returns {Object|null} The matching row, including password_hash and
 *   password_salt, or null when no user has that email.
 */
function findByEmail(email) {
  if (typeof email !== 'string' || email.length === 0) {
    return null;
  }

  const row = getDb()
    .prepare(
      'SELECT id, name, email, password_hash, password_salt, created_at, updated_at ' +
        'FROM users WHERE email = ?'
    )
    .get(email.toLowerCase());

  return row ?? null;
}

/**
 * Find one user by id.
 *
 * A missing row is null rather than a throw: whether an id that resolves to no
 * user means an invalid session is the caller's decision, not this layer's. The
 * id binds as a parameter and never alters the statement.
 *
 * @param {string} id - Row id to look up.
 * @returns {Object|null} The matching row, including password_hash and
 *   password_salt, or null when no user has that id.
 */
function findById(id) {
  const row = getDb()
    .prepare(
      'SELECT id, name, email, password_hash, password_salt, created_at, updated_at ' +
        'FROM users WHERE id = ?'
    )
    .get(id);

  return row ?? null;
}

/**
 * Run one unit of work inside a single transaction on the shared connection.
 *
 * Registering an account writes a users row and that account's first
 * auth_tokens row, and the two must commit or fail together: a failure has to
 * leave neither row behind. The caller that owns that rule reaches the store
 * through its repositories only, so the unit of work it needs is published here
 * rather than opened by the caller. better-sqlite3 runs the function
 * synchronously and rolls back if it throws, and the throw propagates once the
 * rollback has completed. The transaction is deferred, not immediate, because
 * registration has never taken a reserved write lock; the function is also
 * synchronous by contract, so no caller can hold a write lock across an await.
 *
 * @param {Function} work - The statements to run as one unit of work; called
 *   once, with no arguments.
 * @returns {*} Whatever work returned, once the transaction has committed.
 * @throws {*} Whatever work threw, after the transaction has rolled back.
 */
function runInTransaction(work) {
  return getDb().transaction(work)();
}

module.exports = { insert, findByEmail, findById, runInTransaction };
