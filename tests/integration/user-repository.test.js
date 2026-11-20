/**
 * @fileoverview Integration tests for the users table accessor
 * (src/repositories/user.repository.js), exercised through its public API
 * { insert, findByEmail, findById } against a real SQLite database: the row
 * written from a caller-supplied id and the row read back for it, the UUIDv4
 * minted when the id is omitted, the lowercased email on write and in the
 * lookup, the two timestamps the statement fills, the driver's own
 * unique-constraint error, and the null answers of both finders. The database
 * file lives in a directory the suite creates under the operating system's
 * temporary directory, outside the checkout.
 *
 * @module tests/integration/user-repository
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** The users columns every returned row carries, in the statements' select order. */
const USER_COLUMNS = [
  'id', 'name', 'email', 'password_hash', 'password_salt', 'created_at', 'updated_at'
];

/** Shape of the UUIDv4 the module mints when a caller omits the id. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Every module instance the suite loaded, closed together once the file ends. */
const loadedModules = [];

/** Suite state: the temporary directory, the email suffix, the repository, its db. */
let workDir;
let emailSequence = 0;
let repository;
let getDb;

/**
 * Loads a pristine instance of src/repositories/user.repository.js opening `file`.
 *
 * jest.resetModules() gives the suite its own copies of the configuration, the
 * database module and the repository, so the memoised connection is its own. The
 * configuration object is mutated rather than replaced, because src/db/index.js
 * reads config.dbFile off it on every getDb() call.
 *
 * @param {string} file - Absolute path the module must open as its database.
 * @returns {{repository: Object, getDb: Function}} The repository and the accessor.
 */
function loadUserRepository(file) {
  jest.resetModules();

  const config = require('../../src/config');
  config.dbFile = file;

  const databaseModule = require('../../src/db');
  loadedModules.push({ closeDb: databaseModule.closeDb });

  return {
    repository: require('../../src/repositories/user.repository'),
    getDb: databaseModule.getDb
  };
}

/**
 * Builds the arguments insert() takes, with an email no earlier test used. The
 * hash and salt stand in for what src/services/auth.service.js derives; the module
 * stores and returns both untouched, which is what a password is verified against.
 *
 * @param {Object} [overrides] - Fields that replace the defaults.
 * @returns {Object} The arguments for insert().
 */
const newUser = (overrides = {}) => ({
  name: 'Ada Lovelace',
  email: `user.${++emailSequence}@example.com`,
  passwordHash: 'a'.repeat(64),
  passwordSalt: 'b'.repeat(32),
  ...overrides
});

/**
 * Runs `operation` and returns the error it threw, or null when it threw nothing.
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

describe('user repository module (src/repositories/user.repository.js)', () => {
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzy-user-repository-'));
    ({ repository, getDb } = loadUserRepository(path.join(workDir, 'app.db')));
  });

  afterAll(() => {
    // closeDb() is idempotent, so closing every instance the suite loaded is safe.
    for (const loaded of loadedModules) {
      loaded.closeDb();
    }

    fs.rmSync(workDir, { recursive: true, force: true });
  });

  describe('insert()', () => {
    test('persists a row supplied with an explicit id and returns it as stored', () => {
      const id = '3f4b1c8e-9a2d-4e51-8b6f-0c7d2a5e9f13';
      const user = newUser({ id });
      const row = repository.insert(user);

      expect(Object.keys(row)).toEqual(USER_COLUMNS);
      expect(row.id).toBe(id);
      expect(row.name).toBe(user.name);
      expect(row.email).toBe(user.email);
      // The hash and salt survive unchanged, so the auth service can verify a
      // password against the row this repository hands back.
      expect(row.password_hash).toBe(user.passwordHash);
      expect(row.password_salt).toBe(user.passwordSalt);

      // Read independently of the repository: the returned row is the stored one.
      const stored = getDb()
        .prepare(`SELECT ${USER_COLUMNS.join(', ')} FROM users WHERE id = ?`)
        .get(id);
      expect(row).toEqual(stored);
    });

    test('mints a UUIDv4 when the id is omitted and stores the email lowercased', () => {
      const row = repository.insert(newUser({ email: 'Mixed.Case@Example.COM' }));

      expect(row.id).toMatch(UUID_V4);
      expect(row.email).toBe('mixed.case@example.com');
      expect(repository.findById(row.id)).toEqual(row);
    });

    test('defaults both timestamps to one clock reading and stores supplied values', () => {
      const defaulted = repository.insert(newUser());
      expect(defaulted.created_at).toBe(defaulted.updated_at);
      expect(new Date(defaulted.created_at).toISOString()).toBe(defaulted.created_at);

      const createdAt = '2024-05-01T10:00:00.000Z';
      const updatedAt = '2024-05-02T11:30:00.000Z';
      const supplied = repository.insert(newUser({ createdAt, updatedAt }));
      expect(supplied.created_at).toBe(createdAt);
      expect(supplied.updated_at).toBe(updatedAt);
    });

    test("lets the driver's unique-constraint error through and leaves the row intact", () => {
      const original = repository.insert(newUser({ email: 'Duplicate.Case@Example.com' }));
      const before = repository.findById(original.id);
      const error = captureError(() =>
        repository.insert(newUser({ email: 'duplicate.case@EXAMPLE.com' }))
      );

      // The driver's own error, unwrapped: its prototype is the driver's
      // SqliteError class, and both the code and the message are SQLite's own.
      // instanceof is not asserted, because better-sqlite3's native addon is one
      // process-wide module: when another suite in the same Jest worker loaded the
      // driver first, the error carries that sandbox's Error.prototype.
      expect(error).not.toBeNull();
      expect(Object.getPrototypeOf(error).constructor.name).toBe('SqliteError');
      expect(error.code).toBe('SQLITE_CONSTRAINT_UNIQUE');
      expect(error.message).toMatch(/UNIQUE constraint failed: users\.email/);
      expect(repository.findById(original.id)).toEqual(before);
    });

    test('fails without writing a row when called with no user object', () => {
      const countUsers = () => getDb().prepare('SELECT COUNT(*) AS total FROM users').get().total;
      const before = countUsers();
      expect(() => repository.insert()).toThrow(TypeError);
      expect(countUsers()).toBe(before);
    });
  });

  describe('findByEmail()', () => {
    test('finds the row by its exact email and by a differently-cased spelling', () => {
      const row = repository.insert(newUser({ email: 'Grace.Hopper@Example.com' }));

      expect(repository.findByEmail('grace.hopper@example.com')).toEqual(row);
      expect(repository.findByEmail('Grace.Hopper@Example.com')).toEqual(row);
      expect(repository.findByEmail('GRACE.HOPPER@EXAMPLE.COM')).toEqual(row);
    });

    test.each([undefined, null, 42, '', 'nobody@example.com'])('returns null for %p', (email) => {
      expect(repository.findByEmail(email)).toBeNull();
    });
  });

  describe('findById()', () => {
    test('returns the matching row and null for an id no user has', () => {
      const row = repository.insert(newUser());
      expect(repository.findById(row.id)).toEqual(row);
      expect(repository.findById('no-such-user')).toBeNull();
    });
  });
});
