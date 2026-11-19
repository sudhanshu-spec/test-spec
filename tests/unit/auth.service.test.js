/**
 * @fileoverview Unit tests for the authentication service (src/services/auth.service.js).
 * Every case builds the service over stubbed user and token repositories, a
 * literal configuration and a pinned clock, so no database, no HTTP request and
 * no port is involved. What is pinned here is the scrypt salt-and-hash pair a
 * registration stores, the digest-only token storage, the single indistinguishable
 * login failure, revoking the session row the guard resolved in one statement, and
 * the four-field projection that keeps password_hash, password_salt and token_hash
 * out of every value the service returns (R-4).
 * @module tests/unit/auth.service
 */

'use strict';

const crypto = require('node:crypto');

const { AppError } = require('../../src/errors');

// The module's singleton is built at load over the real repositories, so they are
// replaced for this whole suite. That is what lets the last test pin the clock the
// singleton is wired with without any call reaching SQLite; getDb is stubbed to
// throw, so an accidental database access fails the run that caused it.
jest.mock('../../src/repositories/user.repository', () => ({
  insert: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../../src/repositories/token.repository', () => ({
  insert: jest.fn(),
  findByHash: jest.fn(),
  revoke: jest.fn()
}));

jest.mock('../../src/db', () => ({
  getDb: jest.fn(() => {
    throw new Error('Unit tests must not open the database');
  })
}));

const { getDb } = require('../../src/db');
const userRepository = require('../../src/repositories/user.repository');
const tokenRepository = require('../../src/repositories/token.repository');
const {
  createAuthService,
  authService,
  hashToken,
  toPublicUser
} = require('../../src/services/auth.service');

/** The four contract keys of a public user, sorted for comparison. @type {string[]} */
const USER_KEYS = ['created_at', 'email', 'id', 'name'];

/** The five keys of a token row, sorted for comparison. @type {string[]} */
const TOKEN_ROW_KEYS = ['createdAt', 'expiresAt', 'id', 'tokenHash', 'userId'];

/** Shape crypto.randomUUID produces (RFC 4122 version 4). @type {RegExp} */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Token lifetime the service under test is configured with, in hours. @type {number} */
const TOKEN_TTL_HOURS = 24;

/** One token lifetime expressed in milliseconds. @type {number} */
const TTL_MS = TOKEN_TTL_HOURS * 60 * 60 * 1000;

/** The literal configuration handed to the service. @type {Object} */
const CONFIG = { tokenTtlHours: TOKEN_TTL_HOURS };

/** Instant the stubbed clock reports. @type {string} */
const NOW = '2026-03-01T12:00:00.000Z';

/** Expiry a 24-hour lifetime produces from NOW. @type {string} */
const EXPIRES_AT = '2026-03-02T12:00:00.000Z';

/** The plaintext every stored row in this suite is derived from. @type {string} */
const PASSWORD = 'correct-horse-battery-staple';

/** A raw 64-character token, used where a token is presented rather than minted. @type {string} */
const RAW_TOKEN = '0123456789abcdef'.repeat(4);

/** Id the stored user rows carry. @type {string} */
const USER_ID = '2f1c9e4a-6d3b-4a58-9f21-8c7d5e0b1a34';

/** Email the stored user rows carry, already in its stored lowercased form. @type {string} */
const USER_EMAIL = 'ada@example.com';

/** Creation timestamp the stored user rows carry. @type {string} */
const CREATED_AT = '2026-01-01T00:00:00.000Z';

/**
 * SHA-256 hex digest, computed independently of the module under test.
 *
 * @param {string} value - Text to digest.
 * @returns {string} 64-character lowercase hex digest.
 */
function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * scrypt digest of a password under a stored salt, computed independently of the
 * module under test so a stored hash is verified rather than taken on trust.
 *
 * @param {string} password - Plaintext password.
 * @param {string} passwordSalt - Hex salt the digest is derived with.
 * @returns {string} 128-character lowercase hex digest.
 */
function scryptHex(password, passwordSalt) {
  return crypto.scryptSync(password, Buffer.from(passwordSalt, 'hex'), 64).toString('hex');
}

/**
 * Build a user row shaped as userRepository.findByEmail returns it, carrying the
 * two secret columns a response must never repeat.
 *
 * @param {Object} [overrides] - Columns to replace.
 * @param {string} [overrides.password] - Plaintext the stored hash is derived from.
 * @param {string} [overrides.passwordSalt] - Salt to derive with; a fresh one when omitted.
 * @param {string} [overrides.passwordHash] - Stored hash; derived from the salt when omitted.
 * @returns {Object} Stored user row.
 */
function storedUser({ password = PASSWORD, passwordSalt, passwordHash, ...overrides } = {}) {
  const salt = passwordSalt || crypto.randomBytes(16).toString('hex');

  return {
    id: USER_ID,
    name: 'Ada Lovelace',
    email: USER_EMAIL,
    password_hash: passwordHash || scryptHex(password, salt),
    password_salt: salt,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides
  };
}

/**
 * Build a token row shaped as tokenRepository.findByHash returns it.
 *
 * @param {Object} [overrides] - Columns to replace.
 * @returns {Object} Stored token row.
 */
function storedToken(overrides = {}) {
  return {
    id: 'token-1',
    user_id: USER_ID,
    token_hash: sha256Hex(RAW_TOKEN),
    expires_at: EXPIRES_AT,
    revoked_at: null,
    created_at: NOW,
    ...overrides
  };
}

/**
 * Build the service over stubbed repositories, a literal configuration and a
 * pinned clock, so every collaborator call can be asserted and nothing reaches a
 * database.
 *
 * @param {Object} [options] - Stub outcomes.
 * @param {Object|null} [options.user] - Row users.findByEmail returns.
 * @param {Object|null} [options.token] - Row tokens.findByHash returns.
 * @param {string} [options.now] - Instant the stubbed clock reports.
 * @param {Function} [options.userInsert] - Behaviour of users.insert.
 * @param {Function} [options.tokenInsert] - Behaviour of tokens.insert.
 * @param {Function} [options.transaction] - Runner handed to the service.
 * @returns {{service: Object, repositories: Object, clock: Function, runInTransaction: Function}}
 *   The service, its stubbed collaborators, the fake clock and the runner.
 */
function buildAuthService({
  user = null,
  token = null,
  now = NOW,
  userInsert,
  tokenInsert,
  transaction
} = {}) {
  const repositories = {
    users: {
      findByEmail: jest.fn(() => user),
      insert: jest.fn(userInsert)
    },
    tokens: {
      insert: jest.fn(tokenInsert),
      findByHash: jest.fn(() => token),
      revoke: jest.fn()
    }
  };
  const clock = jest.fn(() => new Date(now));
  const runInTransaction = jest.fn(transaction || ((fn) => fn()));
  const service = createAuthService({
    users: repositories.users,
    tokens: repositories.tokens,
    config: CONFIG,
    now: clock,
    runInTransaction
  });

  return { service, repositories, clock, runInTransaction };
}

/**
 * Await a call that is expected to reject and return the error it rejected with.
 * Registration and login derive their key through the asynchronous KDF, so their
 * failures arrive as rejections rather than throws.
 *
 * @param {Function} invoke - Call expected to reject.
 * @returns {Promise<Error>} The error the call rejected with.
 * @throws {Error} When the call resolves instead of rejecting.
 */
async function captureRejection(invoke) {
  try {
    await invoke();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the call to reject with an AppError, but it resolved');
}

describe('Auth service - auth.service.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exports the factory, the singleton, the projection and the digest', () => {
    expect(typeof createAuthService).toBe('function');
    expect(typeof toPublicUser).toBe('function');
    expect(typeof hashToken).toBe('function');
    expect(Object.keys(authService).sort()).toEqual(['login', 'register', 'revokeSession']);
  });

  describe('hashToken', () => {
    test('returns the 64-character lowercase hex SHA-256 digest, never the raw token', () => {
      const digest = hashToken(RAW_TOKEN);

      expect(digest).toBe(sha256Hex(RAW_TOKEN));
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
      expect(digest).not.toBe(RAW_TOKEN);
      expect(digest).not.toContain(RAW_TOKEN);
    });

    test('is deterministic, so a presented token can be looked up by its digest', () => {
      expect(hashToken(RAW_TOKEN)).toBe(hashToken(RAW_TOKEN));
      expect(hashToken(`${RAW_TOKEN} `)).not.toBe(hashToken(RAW_TOKEN));
    });

    test.each([
      ['a number', 123456],
      ['null', null],
      ['an object whose toString spells the token', { toString: () => RAW_TOKEN }]
    ])('String()s %s instead of throwing', (_case, value) => {
      expect(hashToken(value)).toBe(sha256Hex(String(value)));
    });
  });

  describe('toPublicUser', () => {
    test('projects a stored row onto exactly the four contract keys', () => {
      const row = { ...storedUser(), token_hash: sha256Hex(RAW_TOKEN) };

      const publicUser = toPublicUser(row);

      expect(publicUser).toEqual({
        id: USER_ID,
        name: 'Ada Lovelace',
        email: USER_EMAIL,
        created_at: CREATED_AT
      });
      expect(Object.keys(publicUser).sort()).toEqual(USER_KEYS);
      expect(JSON.stringify(publicUser)).not.toMatch(/password|salt|token/);
    });

    test.each([
      ['null', null],
      ['undefined', undefined]
    ])('returns null for %s rather than inventing a user', (_case, row) => {
      expect(toPublicUser(row)).toBeNull();
    });
  });

  describe('register', () => {
    test('normalises the email before both the duplicate pre-check and the insert', async () => {
      const { service, repositories } = buildAuthService();

      const result = await service.register({
        name: 'Ada Lovelace',
        email: '  Ada.Lovelace@Example.COM ',
        password: PASSWORD
      });

      expect(repositories.users.findByEmail).toHaveBeenCalledTimes(1);
      expect(repositories.users.findByEmail).toHaveBeenCalledWith('ada.lovelace@example.com');
      expect(repositories.users.insert).toHaveBeenCalledTimes(1);
      expect(repositories.users.insert.mock.calls[0][0].email).toBe('ada.lovelace@example.com');
      expect(result.user.email).toBe('ada.lovelace@example.com');
    });

    test('stores a fresh 16-byte hex salt and the scrypt digest of its raw bytes', async () => {
      const { service, repositories } = buildAuthService();

      await service.register({ name: 'Ada Lovelace', email: USER_EMAIL, password: PASSWORD });
      await service.register({ name: 'Grace Hopper', email: 'grace@example.com', password: PASSWORD });

      const [first, second] = repositories.users.insert.mock.calls.map(([row]) => row);

      expect(first.passwordSalt).toMatch(/^[0-9a-f]{32}$/);
      expect(Buffer.from(first.passwordSalt, 'hex')).toHaveLength(16);
      expect(first.passwordHash).toMatch(/^[0-9a-f]{128}$/);
      expect(first.passwordHash).toBe(scryptHex(PASSWORD, first.passwordSalt));
      expect(first.passwordHash).not.toBe(PASSWORD);
      expect(first.passwordSalt).not.toBe(second.passwordSalt);
      expect(first.passwordHash).not.toBe(second.passwordHash);
      expect(JSON.stringify(first)).not.toContain(PASSWORD);
    });

    test('stores a pair that verifies through a later login', async () => {
      const { service, repositories } = buildAuthService();

      await service.register({ name: 'Ada Lovelace', email: USER_EMAIL, password: PASSWORD });
      const stored = repositories.users.insert.mock.calls[0][0];

      const { service: laterLogin } = buildAuthService({
        user: {
          id: stored.id,
          name: stored.name,
          email: stored.email,
          password_hash: stored.passwordHash,
          password_salt: stored.passwordSalt,
          created_at: stored.createdAt
        }
      });

      const session = await laterLogin.login({ email: USER_EMAIL, password: PASSWORD });

      expect(session.user).toEqual({
        id: stored.id,
        name: 'Ada Lovelace',
        email: USER_EMAIL,
        created_at: stored.createdAt
      });
      expect(session.token).toMatch(/^[0-9a-f]{64}$/);
    });

    test('generates the user id as a UUID and stores the row under it', async () => {
      const { service, repositories } = buildAuthService();

      const result = await service.register({ name: 'Ada Lovelace', email: USER_EMAIL, password: PASSWORD });

      const stored = repositories.users.insert.mock.calls[0][0];

      expect(stored.id).toMatch(UUID_PATTERN);
      expect(result.user.id).toBe(stored.id);
      expect(stored.name).toBe('Ada Lovelace');
      expect(stored.createdAt).toBe(NOW);
      expect(stored.updatedAt).toBe(NOW);
    });

    test('mints its own user id instead of trusting one the caller supplies', async () => {
      // R-5: the service mints the identity, so a body carrying an id cannot
      // choose the row a registration is written under.
      const { service, repositories } = buildAuthService();

      const result = await service.register({
        id: 'caller-supplied-id',
        name: 'Ada Lovelace',
        email: USER_EMAIL,
        password: PASSWORD
      });

      const stored = repositories.users.insert.mock.calls[0][0];

      expect(stored.id).toMatch(UUID_PATTERN);
      expect(stored.id).not.toBe('caller-supplied-id');
      expect(result.user.id).toBe(stored.id);
    });

    test('persists only the digest of the token it hands back, expiring in 24 hours', async () => {
      const { service, repositories } = buildAuthService();

      const result = await service.register({ name: 'Ada Lovelace', email: USER_EMAIL, password: PASSWORD });

      const tokenRow = repositories.tokens.insert.mock.calls[0][0];

      expect(result.token).toMatch(/^[0-9a-f]{64}$/);
      expect(tokenRow.tokenHash).toBe(hashToken(result.token));
      expect(tokenRow.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(tokenRow.tokenHash).not.toBe(result.token);
      expect(JSON.stringify(tokenRow)).not.toContain(result.token);
      expect(Object.keys(tokenRow).sort()).toEqual(TOKEN_ROW_KEYS);
      expect(tokenRow.id).toMatch(UUID_PATTERN);
      expect(tokenRow.userId).toBe(result.user.id);
      expect(tokenRow.createdAt).toBe(NOW);
      expect(tokenRow.expiresAt).toBe(EXPIRES_AT);
      expect(Date.parse(tokenRow.expiresAt) - Date.parse(tokenRow.createdAt)).toBe(TTL_MS);
    });

    test('performs both inserts inside one runInTransaction call', async () => {
      const trace = [];
      const { service, repositories, runInTransaction } = buildAuthService({
        transaction: (fn) => {
          trace.push('begin');
          fn();
          trace.push('commit');
        },
        userInsert: () => trace.push('users.insert'),
        tokenInsert: () => trace.push('tokens.insert')
      });

      await service.register({ name: 'Ada Lovelace', email: USER_EMAIL, password: PASSWORD });

      expect(runInTransaction).toHaveBeenCalledTimes(1);
      expect(typeof runInTransaction.mock.calls[0][0]).toBe('function');
      expect(trace).toEqual(['begin', 'users.insert', 'tokens.insert', 'commit']);
      expect(repositories.users.insert).toHaveBeenCalledTimes(1);
      expect(repositories.tokens.insert).toHaveBeenCalledTimes(1);
    });

    test('refuses a duplicate email from the pre-check without writing either row', async () => {
      const { service, repositories, runInTransaction } = buildAuthService({ user: storedUser() });

      const error = await captureRejection(() =>
        service.register({ name: 'Ada Lovelace', email: '  ADA@Example.com  ', password: PASSWORD }));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('EMAIL_ALREADY_REGISTERED');
      expect(error.status).toBe(409);
      expect(error.message).toContain(USER_EMAIL);
      expect(repositories.users.findByEmail).toHaveBeenCalledWith(USER_EMAIL);
      expect(repositories.users.insert).not.toHaveBeenCalled();
      expect(repositories.tokens.insert).not.toHaveBeenCalled();
      expect(runInTransaction).not.toHaveBeenCalled();
    });

    test.each([
      [
        'the driver code SQLITE_CONSTRAINT_UNIQUE',
        { code: 'SQLITE_CONSTRAINT_UNIQUE', message: 'UNIQUE constraint failed: users.email' }
      ],
      [
        'the constraint message alone',
        { code: 'SQLITE_CONSTRAINT_CHECK', message: 'UNIQUE constraint failed: users.email' }
      ]
    ])('maps %s on the insert to the same 409 refusal', async (_case, failure) => {
      const { service, repositories } = buildAuthService({
        userInsert: () => {
          throw failure;
        }
      });

      const error = await captureRejection(() =>
        service.register({ name: 'Ada Lovelace', email: USER_EMAIL, password: PASSWORD }));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('EMAIL_ALREADY_REGISTERED');
      expect(error.status).toBe(409);
      expect(error.message).toContain(USER_EMAIL);
      expect(repositories.users.insert).toHaveBeenCalledTimes(1);
    });

    test('rethrows an unrelated insert failure untouched', async () => {
      const failure = new Error('database is locked');
      const { service, repositories } = buildAuthService({
        tokenInsert: () => {
          throw failure;
        }
      });

      const error = await captureRejection(() =>
        service.register({ name: 'Ada Lovelace', email: USER_EMAIL, password: PASSWORD }));

      expect(error).toBe(failure);
      expect(repositories.users.insert).toHaveBeenCalledTimes(1);
    });

    test('returns exactly the public user and the raw token', async () => {
      const { service } = buildAuthService();

      const result = await service.register({ name: 'Ada Lovelace', email: USER_EMAIL, password: PASSWORD });

      expect(Object.keys(result).sort()).toEqual(['token', 'user']);
      expect(Object.keys(result.user).sort()).toEqual(USER_KEYS);
      expect(JSON.stringify(result)).not.toMatch(/password_hash|password_salt|token_hash/);
    });
  });

  describe('login', () => {
    test('returns the projected user and a fresh token whose stored digest matches', async () => {
      const { service, repositories, clock } = buildAuthService({ user: storedUser() });

      const result = await service.login({ email: ' Ada@Example.com ', password: PASSWORD });

      expect(repositories.users.findByEmail).toHaveBeenCalledWith(USER_EMAIL);
      expect(clock).toHaveBeenCalled();
      expect(result.user).toEqual({
        id: USER_ID,
        name: 'Ada Lovelace',
        email: USER_EMAIL,
        created_at: CREATED_AT
      });
      expect(Object.keys(result.user).sort()).toEqual(USER_KEYS);
      expect(JSON.stringify(result)).not.toMatch(/password_hash|password_salt|token_hash/);

      const tokenRow = repositories.tokens.insert.mock.calls[0][0];

      expect(result.token).toMatch(/^[0-9a-f]{64}$/);
      expect(tokenRow.tokenHash).toBe(hashToken(result.token));
      expect(tokenRow.tokenHash).not.toBe(result.token);
      expect(Object.keys(tokenRow).sort()).toEqual(TOKEN_ROW_KEYS);
      expect(tokenRow.id).toMatch(UUID_PATTERN);
      expect(tokenRow.userId).toBe(USER_ID);
      expect(tokenRow.createdAt).toBe(NOW);
      expect(tokenRow.expiresAt).toBe(EXPIRES_AT);
    });

    test('records the session against the stored row id, not one the caller asserts', async () => {
      // R-5: the identity a session belongs to comes from the row the email
      // resolved to, never from a field the request carries.
      const { service, repositories } = buildAuthService({ user: storedUser() });

      await service.login({ id: 'caller-supplied-id', email: USER_EMAIL, password: PASSWORD });

      const tokenRow = repositories.tokens.insert.mock.calls[0][0];

      expect(tokenRow.userId).toBe(USER_ID);
      expect(tokenRow.userId).not.toBe('caller-supplied-id');
    });

    test('mints a token that differs from the one a previous login returned', async () => {
      const { service, repositories } = buildAuthService({ user: storedUser() });

      const first = await service.login({ email: USER_EMAIL, password: PASSWORD });
      const second = await service.login({ email: USER_EMAIL, password: PASSWORD });

      expect(first.token).not.toBe(second.token);
      expect(repositories.tokens.insert).toHaveBeenCalledTimes(2);
    });

    test.each([
      ['an unknown email', () => null, { email: 'nobody@example.com', password: PASSWORD }],
      ['a wrong password', () => storedUser(), { email: USER_EMAIL, password: 'not-the-password' }],
      ['an empty password', () => storedUser(), { email: USER_EMAIL, password: '' }],
      ['a missing password', () => storedUser(), { email: USER_EMAIL }],
      ['a null password', () => storedUser(), { email: USER_EMAIL, password: null }],
      ['no request body at all', () => storedUser(), undefined],
      ['a truncated stored hash', () => storedUser({ passwordHash: 'abcd' }), { email: USER_EMAIL, password: PASSWORD }]
    ])('rejects %s with a 401 INVALID_CREDENTIALS', async (_case, row, body) => {
      const { service, repositories } = buildAuthService({ user: row() });

      const error = await captureRejection(() => service.login(body));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.status).toBe(401);
      expect(error.message.length).toBeGreaterThan(0);
      expect(repositories.tokens.insert).not.toHaveBeenCalled();
      expect(repositories.tokens.findByHash).not.toHaveBeenCalled();
    });

    test('answers an unknown email and a wrong password indistinguishably', async () => {
      const unknown = await captureRejection(() =>
        buildAuthService().service.login({ email: USER_EMAIL, password: PASSWORD }));
      const wrong = await captureRejection(() =>
        buildAuthService({ user: storedUser() }).service.login({ email: USER_EMAIL, password: 'wrong' }));

      expect(unknown.message).toBe(wrong.message);
      expect(unknown.code).toBe(wrong.code);
      expect(unknown.status).toBe(wrong.status);
      expect(Object.keys(unknown).sort()).toEqual(Object.keys(wrong).sort());
    });
  });

  describe('revokeSession', () => {
    test.each([
      ['the row the guard resolved', storedToken()],
      ['a row carrying another id', storedToken({ id: 'token-2' })]
    ])('revokes the id of %s, with one repository call and no lookup', (_case, session) => {
      const { service, repositories } = buildAuthService();

      service.revokeSession(session);

      expect(repositories.tokens.revoke).toHaveBeenCalledTimes(1);
      expect(repositories.tokens.revoke).toHaveBeenCalledWith(session.id);
      expect(repositories.tokens.revoke.mock.calls[0]).toHaveLength(1);
      expect(repositories.tokens.findByHash).not.toHaveBeenCalled();
      expect(repositories.tokens.insert).not.toHaveBeenCalled();
    });

    test('reads no clock and answers no value, so logout costs the one UPDATE statement', () => {
      const { service, clock } = buildAuthService();

      expect(service.revokeSession(storedToken())).toBeUndefined();
      expect(clock).not.toHaveBeenCalled();
    });
  });

  describe('createAuthService', () => {
    test('defaults the clock to now and the runner to a direct call', async () => {
      const users = { findByEmail: jest.fn(() => null), insert: jest.fn() };
      const tokens = { insert: jest.fn(), findByHash: jest.fn(), revoke: jest.fn() };
      const service = createAuthService({ users, tokens, config: CONFIG });

      const before = Date.now();
      const result = await service.register({ name: 'Ada Lovelace', email: USER_EMAIL, password: PASSWORD });
      const after = Date.now();

      expect(users.insert).toHaveBeenCalledTimes(1);
      expect(tokens.insert).toHaveBeenCalledTimes(1);
      expect(Object.keys(result).sort()).toEqual(['token', 'user']);

      const tokenRow = tokens.insert.mock.calls[0][0];
      const issuedAt = Date.parse(tokenRow.createdAt);

      expect(issuedAt).toBeGreaterThanOrEqual(before);
      expect(issuedAt).toBeLessThanOrEqual(after);
      expect(Date.parse(tokenRow.expiresAt) - issuedAt).toBe(TTL_MS);
    });
  });

  describe('the wired singleton', () => {
    test('verifies a password through its collaborators and opens no database', async () => {
      // The single call this suite makes on the singleton: it pins the clock the
      // singleton is wired with. Both repositories are the module mocks above and
      // getDb throws, so no database file can be created here.
      userRepository.findByEmail.mockReturnValue(storedUser());

      const result = await authService.login({ email: USER_EMAIL, password: PASSWORD });

      expect(result.user).toEqual({
        id: USER_ID,
        name: 'Ada Lovelace',
        email: USER_EMAIL,
        created_at: CREATED_AT
      });
      expect(userRepository.findByEmail).toHaveBeenCalledWith(USER_EMAIL);
      expect(tokenRepository.insert).toHaveBeenCalledTimes(1);

      const tokenRow = tokenRepository.insert.mock.calls[0][0];

      expect(tokenRow.tokenHash).toBe(hashToken(result.token));
      expect(tokenRow.tokenHash).not.toBe(result.token);
      expect(tokenRow.userId).toBe(USER_ID);
      expect(getDb).not.toHaveBeenCalled();
    });
  });
});
