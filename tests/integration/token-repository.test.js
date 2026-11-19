/**
 * @fileoverview Integration tests for the auth_tokens table accessor
 * (src/repositories/token.repository.js), exercised through its public API
 * { insert, findByHash, revoke } against a real SQLite database: the row written
 * from a caller-supplied id and the row read back for it, the digest stored
 * verbatim and revoked_at written as NULL, the UUIDv4 and the ISO-8601 creation
 * instant minted when they are omitted, the driver's own unique-constraint error
 * on a repeated digest, the foreign key that binds a token to its users row, the
 * unfiltered lookup that hands revoked and expired rows back intact, and the
 * revocation that records revoked_at and leaves every other column alone. The
 * database file lives in a directory the suite creates under the operating
 * system's temporary directory — outside the repository — so no run writes a
 * database file into the checkout.
 *
 * @module tests/integration/token-repository
 */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** The auth_tokens columns every returned row carries, in the statements' select order. */
const TOKEN_COLUMNS = ['id', 'user_id', 'token_hash', 'expires_at', 'revoked_at', 'created_at'];

/** Shape of the UUIDv4 the module mints when a caller omits the id. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** An expiry no token of this suite has reached, and one every token of it has passed. */
const FUTURE = '2030-01-01T00:00:00.000Z';
const PAST = '2020-01-01T00:00:00.000Z';

/** The users row every token of the suite hangs off, and one no users row carries. */
const OWNER_ID = '8c1d0f5a-2b64-4c8e-9d17-3e5b7a9c0d21';
const UNKNOWN_USER_ID = 'no-such-user';

/** Every module instance the suite loaded, closed together once the file ends. */
const loadedModules = [];

/** Suite state: the temporary directory, the digest sequence, the repository, its db. */
let workDir;
let digestSequence = 0;
let repository;
let getDb;

/**
 * Loads a pristine instance of src/repositories/token.repository.js opening `file`.
 *
 * jest.resetModules() gives the suite its own copies of the configuration, the
 * database module and the repository, so the memoised connection is its own. The
 * configuration object is mutated rather than replaced, because src/db/index.js
 * reads config.dbFile off it on every getDb() call.
 *
 * @param {string} file - Absolute path the module must open as its database.
 * @returns {{repository: Object, getDb: Function}} The repository and the accessor.
 */
function loadTokenRepository(file) {
  jest.resetModules();

  const config = require('../../src/config');
  config.dbFile = file;

  const databaseModule = require('../../src/db');
  loadedModules.push({ closeDb: databaseModule.closeDb });

  return {
    repository: require('../../src/repositories/token.repository'),
    getDb: databaseModule.getDb
  };
}

/**
 * Renders a SHA-256 hex digest the way src/services/auth.service.js does before it
 * calls insert(). The module stores and returns the value untouched, which is what
 * a presented token is hashed to and looked up by.
 *
 * @param {string} label - Text to digest; distinct labels give distinct digests.
 * @returns {string} 64-character lower-case hex digest.
 */
const digest = (label) => crypto.createHash('sha256').update(label).digest('hex');

/**
 * Builds the argument insert() takes, with a digest no earlier test used, because
 * auth_tokens.token_hash is UNIQUE.
 *
 * @param {Object} [overrides] - Fields that replace the defaults.
 * @returns {Object} The argument for insert().
 */
const newToken = (overrides = {}) => ({
  userId: OWNER_ID,
  tokenHash: digest(`session-token-${++digestSequence}`),
  expiresAt: FUTURE,
  ...overrides
});

/**
 * Reads a token row straight from the open handle, independently of the module.
 *
 * @param {string} id - Primary key of the row to read.
 * @returns {Object|undefined} The stored row, or undefined when there is none.
 */
const storedRow = (id) =>
  getDb()
    .prepare(`SELECT ${TOKEN_COLUMNS.join(', ')} FROM auth_tokens WHERE id = ?`)
    .get(id);

/**
 * Writes the users row a token's FOREIGN KEY points at. auth_tokens.user_id
 * REFERENCES users (id), so no token row can be stored before its owner exists.
 *
 * @param {string} id - Primary key of the users row to write.
 * @returns {void}
 */
const insertUser = (id) => {
  getDb()
    .prepare(
      'INSERT INTO users (id, name, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, 'Token Owner', `${id}@example.com`, 'a'.repeat(64), 'b'.repeat(32));
};

/**
 * Runs `operation` and returns the error it threw, or null when it threw nothing.
 *
 * @param {Function} operation - The call expected to throw.
 * @returns {Error|null} The thrown error, or null.
 */
const captureError = (operation) => {
  try {
    operation();
    return null;
  } catch (error) {
    return error;
  }
};

describe('token repository module (src/repositories/token.repository.js)', () => {
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzy-token-repository-'));
    ({ repository, getDb } = loadTokenRepository(path.join(workDir, 'app.db')));
    insertUser(OWNER_ID);
  });

  afterAll(() => {
    // closeDb() is idempotent, so closing every instance the suite loaded is safe.
    for (const loaded of loadedModules) {
      loaded.closeDb();
    }

    fs.rmSync(workDir, { recursive: true, force: true });
  });

  describe('insert()', () => {
    test('persists a row given an explicit id and createdAt and returns it as stored', () => {
      const id = 'b7e2a4c6-1f38-4d90-a5b2-6c8e0f3a7d14';
      const createdAt = '2024-05-01T10:00:00.000Z';
      const token = newToken({ id, createdAt });
      const row = repository.insert(token);

      expect(Object.keys(row)).toEqual(TOKEN_COLUMNS);
      expect(row.id).toBe(id);
      expect(row.user_id).toBe(OWNER_ID);
      // The digest is stored verbatim: minting and hashing the raw token belong to
      // the auth service, so no usable credential can reach this table.
      expect(row.token_hash).toBe(token.tokenHash);
      expect(row.expires_at).toBe(FUTURE);
      // revoked_at NULL is what makes a live row distinguishable from a revoked one.
      expect(row.revoked_at).toBeNull();
      expect(row.created_at).toBe(createdAt);

      // Read independently of the repository: the returned row is the stored one.
      expect(storedRow(id)).toEqual(row);
    });

    test('mints a UUIDv4 and an ISO-8601 creation instant when both are omitted', () => {
      const row = repository.insert(newToken());

      expect(row.id).toMatch(UUID_V4);
      expect(new Date(row.created_at).toISOString()).toBe(row.created_at);
      expect(repository.findByHash(row.token_hash)).toEqual(row);
    });

    test("lets the driver's unique-constraint error through and leaves the row intact", () => {
      const original = repository.insert(newToken());
      const before = storedRow(original.id);
      const error = captureError(() =>
        repository.insert(newToken({ tokenHash: original.token_hash }))
      );

      // The driver's own error, unwrapped: its prototype is the driver's
      // SqliteError class, and both the code and the message are SQLite's own.
      // instanceof is not asserted, because better-sqlite3's native addon is one
      // process-wide module: when another suite in the same Jest worker loaded the
      // driver first, the error carries that sandbox's Error.prototype.
      expect(error).not.toBeNull();
      expect(Object.getPrototypeOf(error).constructor.name).toBe('SqliteError');
      expect(error.code).toBe('SQLITE_CONSTRAINT_UNIQUE');
      expect(error.message).toMatch(/UNIQUE constraint failed: auth_tokens\.token_hash/);
      expect(storedRow(original.id)).toEqual(before);
    });

    test('rejects a row whose user_id names no user and stores nothing', () => {
      const token = newToken({ userId: UNKNOWN_USER_ID });
      const error = captureError(() => repository.insert(token));

      expect(error).not.toBeNull();
      expect(Object.getPrototypeOf(error).constructor.name).toBe('SqliteError');
      expect(error.code).toBe('SQLITE_CONSTRAINT_FOREIGNKEY');
      expect(error.message).toMatch(/FOREIGN KEY constraint failed/);
      expect(repository.findByHash(token.tokenHash)).toBeNull();
    });
  });

  describe('findByHash()', () => {
    test('returns the row the stored digest belongs to', () => {
      const row = repository.insert(newToken());

      expect(repository.findByHash(row.token_hash)).toEqual(row);
    });

    test('returns revoked and expired rows intact so the caller can tell them apart', () => {
      const revokedAt = '2024-06-01T00:00:00.000Z';
      const revoked = repository.insert(newToken());
      const expired = repository.insert(newToken({ expiresAt: PAST }));

      expect(repository.revoke(revoked.id, revokedAt)).toBe(1);

      // Neither row is filtered out: only the caller can tell a revoked digest, an
      // expired one and a live one apart, and only if both columns arrive intact.
      expect(repository.findByHash(revoked.token_hash)).toEqual({
        ...revoked,
        revoked_at: revokedAt
      });
      expect(repository.findByHash(expired.token_hash)).toEqual(expired);
      expect(new Date(expired.expires_at).getTime()).toBeLessThan(Date.now());
      expect(expired.revoked_at).toBeNull();
    });

    test('returns null for a digest no token carries', () => {
      expect(repository.findByHash(digest('a digest this suite never stored'))).toBeNull();
    });

    test.each([undefined, null, 42, ''])('returns null for the unusable digest %p', (tokenHash) => {
      expect(repository.findByHash(tokenHash)).toBeNull();
    });
  });

  describe('revoke()', () => {
    test('returns 1 for a known id and records revoked_at leaving every other column alone', () => {
      const revokedAt = '2024-06-01T00:00:00.000Z';
      const row = repository.insert(newToken());

      expect(repository.revoke(row.id, revokedAt)).toBe(1);

      // A revocation is an event written onto the row, not a shortened lifetime:
      // expires_at, the digest, the owner and the creation instant keep their values.
      expect(storedRow(row.id)).toEqual({ ...row, revoked_at: revokedAt });
    });

    test('returns 0 for an id no token carries', () => {
      expect(repository.revoke('no-such-token')).toBe(0);
    });

    test.each([undefined, null, 42, ''])('returns 0 for the unusable id %p', (id) => {
      expect(repository.revoke(id)).toBe(0);
    });

    test('defaults revoked_at to an ISO-8601 instant when it is omitted', () => {
      const row = repository.insert(newToken());

      expect(repository.revoke(row.id)).toBe(1);

      const revoked = repository.findByHash(row.token_hash);
      expect(revoked.revoked_at).not.toBeNull();
      expect(new Date(revoked.revoked_at).toISOString()).toBe(revoked.revoked_at);
      expect(revoked.expires_at).toBe(row.expires_at);
    });
  });
});
