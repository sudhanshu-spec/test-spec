/**
 * @fileoverview Integration tests for the four authentication contracts of the
 * JSON API — POST /api/auth/register, POST /api/auth/login,
 * GET /api/auth/session and POST /api/auth/logout — driven over the real
 * application pipeline exported by src/app.js.
 *
 * Supertest talks to the exported app in process, so no port is bound, nothing
 * collides with another suite and every request runs through the same stages the
 * server registers: CORS, the JSON body parser, the tutorial router at '/', the
 * API router at '/api', then the '/api'-scoped not-found and error handlers.
 *
 * The database is the suite's own file under the operating system's temporary
 * directory. DB_FILE is set before jest.resetModules() and before any module that
 * reads it is required, so this suite's src/config, src/db and application get
 * their own connection to that file and never touch data/app.db. The file and its
 * WAL and shared-memory companions are removed after the connection closes, and
 * the previous DB_FILE value is restored.
 *
 * @module tests/integration/api-auth
 */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/** DB_FILE as this process found it, restored once the suite ends. @type {string|undefined} */
const previousDbFile = process.env.DB_FILE;

/** This suite's database file: unique per process and per run. @type {string} */
const dbFile = path.join(os.tmpdir(), `burger-api-auth-${process.pid}-${Date.now()}.db`);

process.env.DB_FILE = dbFile;

// Reset before the application is required, so src/config re-evaluates DB_FILE
// against the temporary path instead of a value another module already read.
jest.resetModules();

const request = require('supertest');
const app = require('../../src/app');
const { getDb, closeDb } = require('../../src/db');

/** The four fields a public user projection carries, in alphabetical order. */
const PUBLIC_USER_KEYS = ['created_at', 'email', 'id', 'name'];

/** Column names no response body may carry, in stored or digest form (R-4). */
const SECRET_KEYS = ['password_hash', 'password_salt', 'token_hash'];

/** Shape of the opaque session token the auth endpoints issue. */
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/** Shape of an id minted by crypto.randomUUID(). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A password that breaks none of the registration rules. @type {string} */
const VALID_PASSWORD = 'correct-horse-battery';

/** Number of addresses this suite has minted, so none repeats another's. */
let emailSequence = 0;

/**
 * An address no earlier test in this suite used, so no row of this suite's
 * database collides with another's.
 * @returns {string} A unique email address.
 */
function uniqueEmail() {
  emailSequence += 1;
  return `api-auth-${process.pid}-${Date.now()}-${emailSequence}@example.com`;
}

/**
 * A complete registration payload that satisfies every documented rule, with the
 * fields under test replaced.
 * @param {Object} [overrides] - Fields to replace.
 * @returns {{name: string, email: string, password: string}} The payload.
 */
function newCredentials(overrides = {}) {
  return { name: 'Ada Lovelace', email: uniqueEmail(), password: VALID_PASSWORD, ...overrides };
}

/**
 * Posts a registration body to the API.
 * @param {Object} payload - Body to send.
 * @returns {import('supertest').Test} The pending request.
 */
function register(payload) {
  return request(app).post('/api/auth/register').send(payload);
}

/**
 * Posts a login body to the API.
 * @param {Object} payload - Body to send.
 * @returns {import('supertest').Test} The pending request.
 */
function login(payload) {
  return request(app).post('/api/auth/login').send(payload);
}

/**
 * Formats a raw token as the Authorization header value the API accepts.
 * @param {string} token - Raw opaque token.
 * @returns {string} The Bearer header value.
 */
function authHeader(token) {
  return `Bearer ${token}`;
}

/**
 * Reads the session the given token belongs to.
 * @param {string} token - Raw opaque token to present.
 * @returns {import('supertest').Test} The pending request.
 */
function getSession(token) {
  return request(app).get('/api/auth/session').set('Authorization', authHeader(token));
}

/**
 * Closes the session the given token belongs to.
 * @param {string} token - Raw opaque token to present.
 * @returns {import('supertest').Test} The pending request.
 */
function postLogout(token) {
  return request(app).post('/api/auth/logout').set('Authorization', authHeader(token));
}

/**
 * Derives the SHA-256 hex digest a raw token is stored under, matching
 * hashToken() in src/services/auth.service.js.
 * @param {string} value - Raw token.
 * @returns {string} The 64-character lowercase hex digest.
 */
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Lists the fields a validation failure names.
 * @param {SupertestResponse} response - Response to read.
 * @returns {string[]} One field name per detail entry.
 */
function fieldsOf(response) {
  const details = response.body.error.details;

  return Array.isArray(details) ? details.map((detail) => detail.field) : [];
}

/**
 * Asserts a failure response: its HTTP status, its single `error` envelope, its
 * vocabulary code, and that no field details leak out of a non-validation
 * failure (R-6).
 * @param {SupertestResponse} response - Response to assert.
 * @param {number} status - Expected HTTP status.
 * @param {string} code - Expected `error.code`.
 * @returns {void}
 */
function expectAuthError(response, status, code) {
  expect(response.status).toBe(status);
  expect(Object.keys(response.body)).toEqual(['error']);

  const error = response.body.error;

  expect(error.code).toBe(code);
  expect(typeof error.message).toBe('string');
  expect(error.message.length).toBeGreaterThan(0);

  if (code === 'VALIDATION_ERROR') {
    // A validation failure may or may not name fields: an unparseable body names
    // none. Both shapes are inside the contract, so either key set is accepted.
    const expectedKeys = Array.isArray(error.details) ? ['code', 'details', 'message'] : ['code', 'message'];
    expect(Object.keys(error).sort()).toEqual(expectedKeys);
  } else {
    expect(Object.keys(error).sort()).toEqual(['code', 'message']);
    expect(error.details).toBeUndefined();
  }
}

/**
 * Asserts a 400 VALIDATION_ERROR whose `details` are well-formed `{field, issue}`
 * entries and name the expected field.
 * @param {SupertestResponse} response - Response to assert.
 * @param {string} field - Field the failure must name.
 * @returns {void}
 */
function expectValidationDetail(response, field) {
  expectAuthError(response, 400, 'VALIDATION_ERROR');

  const details = response.body.error.details;

  expect(Array.isArray(details)).toBe(true);
  expect(details.length).toBeGreaterThan(0);

  details.forEach((detail) => {
    expect(Object.keys(detail).sort()).toEqual(['field', 'issue']);
    expect(typeof detail.field).toBe('string');
    expect(typeof detail.issue).toBe('string');
    expect(detail.issue.length).toBeGreaterThan(0);
  });

  expect(fieldsOf(response)).toContain(field);
}

/**
 * Asserts the response carries no stored secret, reading both the wire text and
 * the parsed body so a value nested next to a legitimate key is caught too (R-4).
 * @param {SupertestResponse} response - Response to assert.
 * @returns {void}
 */
function expectNoSecrets(response) {
  const serialised = JSON.stringify(response.body);

  SECRET_KEYS.forEach((key) => {
    expect(response.text).not.toContain(key);
    expect(serialised).not.toContain(key);
  });
}

afterAll(() => {
  // Closing first releases the file and its WAL companions; unlinking an open
  // database would leave the side files behind.
  closeDb();

  [dbFile, `${dbFile}-wal`, `${dbFile}-shm`].forEach((file) => {
    try {
      fs.unlinkSync(file);
    } catch {
      // Already absent: there is nothing to remove.
    }
  });

  if (previousDbFile === undefined) {
    delete process.env.DB_FILE;
  } else {
    process.env.DB_FILE = previousDbFile;
  }
});

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    test('answers 201 with the public user projection and an opaque token', async () => {
      const credentials = newCredentials();

      const response = await register(credentials).expect(201);

      expect(Object.keys(response.body).sort()).toEqual(['token', 'user']);
      expect(Object.keys(response.body.user).sort()).toEqual(PUBLIC_USER_KEYS);
      expect(response.body.user.name).toBe(credentials.name);
      expect(response.body.user.email).toBe(credentials.email);
      expect(response.body.user.id).toMatch(UUID_PATTERN);
      expect(Number.isNaN(Date.parse(response.body.user.created_at))).toBe(false);
      expect(response.body.token).toMatch(TOKEN_PATTERN);
      expectNoSecrets(response);
    });

    test('answers 400 VALIDATION_ERROR for a request that carries no body at all', async () => {
      // Express 5 leaves req.body undefined when nothing was parsed, which is the
      // input a validator starting from an empty object must still reject cleanly.
      const response = await request(app).post('/api/auth/register').expect(400);

      expectAuthError(response, 400, 'VALIDATION_ERROR');
      expect(fieldsOf(response)).toEqual(['name', 'email', 'password']);
    });

    test.each([
      ['a blank name', { name: '' }, 'name'],
      ['a whitespace-only name', { name: '   ' }, 'name'],
      ['a name of 81 characters', { name: 'n'.repeat(81) }, 'name'],
      ['an address that is not an email address', { email: 'not-an-email' }, 'email'],
      ['a 7-character password', { password: 'a'.repeat(7) }, 'password'],
      ['a 73-byte password', { password: 'a'.repeat(73) }, 'password']
    ])('answers 400 VALIDATION_ERROR naming the field for %s', async (_label, overrides, field) => {
      const response = await register(newCredentials(overrides)).expect(400);

      expectValidationDetail(response, field);
      expect(fieldsOf(response)).toEqual([field]);
    });

    test.each([
      ['the same address', (email) => email],
      ['a differently-cased spelling of it', (email) => email.toUpperCase()]
    ])('answers 409 EMAIL_ALREADY_REGISTERED for a second account on %s', async (_label, spell) => {
      const credentials = newCredentials();
      await register(credentials).expect(201);

      const response = await register({ ...credentials, email: spell(credentials.email) }).expect(409);

      expectAuthError(response, 409, 'EMAIL_ALREADY_REGISTERED');
    });
  });

  describe('POST /api/auth/login', () => {
    test('answers 200 with the public user and a token distinct from the registration token', async () => {
      const credentials = newCredentials();
      const registered = await register(credentials).expect(201);

      const response = await login({ email: credentials.email, password: credentials.password }).expect(200);

      expect(Object.keys(response.body).sort()).toEqual(['token', 'user']);
      expect(Object.keys(response.body.user).sort()).toEqual(PUBLIC_USER_KEYS);
      expect(response.body.user.id).toBe(registered.body.user.id);
      expect(response.body.token).toMatch(TOKEN_PATTERN);
      expect(response.body.token).not.toBe(registered.body.token);
      expectNoSecrets(response);
    });

    test('answers one indistinguishable 401 INVALID_CREDENTIALS for a wrong password and an unknown address', async () => {
      const credentials = newCredentials();
      await register(credentials).expect(201);

      const wrongPassword = await login({ email: credentials.email, password: 'not-the-password' }).expect(401);
      const unknownAddress = await login({ email: uniqueEmail(), password: credentials.password }).expect(401);

      expectAuthError(wrongPassword, 401, 'INVALID_CREDENTIALS');
      expectAuthError(unknownAddress, 401, 'INVALID_CREDENTIALS');
      expect(unknownAddress.body).toEqual(wrongPassword.body);
    });

    test('answers 400 VALIDATION_ERROR naming both fields a body-less request leaves out', async () => {
      const response = await request(app).post('/api/auth/login').expect(400);

      expectAuthError(response, 400, 'VALIDATION_ERROR');
      expect(fieldsOf(response)).toEqual(['email', 'password']);
    });

    test.each([
      ['a missing email', { password: VALID_PASSWORD }, 'email'],
      ['an email that is not a string', { email: 42, password: VALID_PASSWORD }, 'email'],
      ['a missing password', { email: 'someone@example.com' }, 'password'],
      ['a password that is not a string', { email: 'someone@example.com', password: 12345678 }, 'password']
    ])('answers 400 VALIDATION_ERROR naming the field for %s', async (_label, payload, field) => {
      const response = await login(payload).expect(400);

      expectValidationDetail(response, field);
      expect(fieldsOf(response)).toEqual([field]);
    });

    test('answers the single 401 INVALID_CREDENTIALS for a present but malformed address', async () => {
      // Login validates presence only, so a mistyped address is answered exactly
      // like an unknown one and the response can never reveal which field was
      // wrong; format rules belong to registration.
      const response = await login({ email: 'not-an-email', password: VALID_PASSWORD }).expect(401);

      expectAuthError(response, 401, 'INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/session', () => {
    test('answers 200 with the public user the presented token belongs to', async () => {
      const credentials = newCredentials();
      const registered = await register(credentials).expect(201);

      const response = await getSession(registered.body.token).expect(200);

      expect(Object.keys(response.body)).toEqual(['user']);
      expect(Object.keys(response.body.user).sort()).toEqual(PUBLIC_USER_KEYS);
      expect(response.body.user.id).toBe(registered.body.user.id);
      expect(response.body.user.email).toBe(credentials.email);
      expectNoSecrets(response);
    });

    test.each([
      ['no Authorization header at all', undefined],
      ['a header that does not carry the bearer scheme', 'Token some-credential'],
      ['a bearer header with no credential after it', 'Bearer']
    ])('answers 401 TOKEN_REQUIRED for %s', async (_label, header) => {
      const pending = request(app).get('/api/auth/session');
      const response = header === undefined
        ? await pending.expect(401)
        : await pending.set('Authorization', header).expect(401);

      expectAuthError(response, 401, 'TOKEN_REQUIRED');
    });

    test.each([
      ['a credential that is not a digest', 'Bearer garbage'],
      ['a well-formed but unknown 64-hex token', `Bearer ${'a'.repeat(64)}`]
    ])('answers 401 TOKEN_INVALID for %s', async (_label, header) => {
      const response = await request(app).get('/api/auth/session').set('Authorization', header).expect(401);

      expectAuthError(response, 401, 'TOKEN_INVALID');
    });

    test('answers 401 TOKEN_EXPIRED for a token whose expires_at has passed', async () => {
      const credentials = newCredentials();
      const registered = await register(credentials).expect(201);
      const token = registered.body.token;
      const pastIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Time is made to pass by rewriting the row on this suite's own database
      // rather than by waiting: no clock is faked and the server keeps its real one.
      const changed = getDb()
        .prepare('UPDATE auth_tokens SET expires_at = ? WHERE token_hash = ?')
        .run(pastIso, sha256(token)).changes;

      // A digest that matched no row would leave the token live, and the assertion
      // below would then fail for a reason unrelated to expiry.
      expect(changed).toBe(1);

      const response = await getSession(token).expect(401);

      expectAuthError(response, 401, 'TOKEN_EXPIRED');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('answers 204 with no body and revokes the presented token', async () => {
      const credentials = newCredentials();
      const registered = await register(credentials).expect(201);
      const token = registered.body.token;

      const response = await postLogout(token).expect(204);

      expect(response.text).toBe('');
      expect(response.body).toEqual({});

      const afterLogout = await getSession(token).expect(401);

      expectAuthError(afterLogout, 401, 'TOKEN_INVALID');
    });

    test('answers 401 TOKEN_INVALID for a second logout with the same token', async () => {
      const credentials = newCredentials();
      const registered = await register(credentials).expect(201);
      const token = registered.body.token;
      await postLogout(token).expect(204);

      const response = await postLogout(token).expect(401);

      expectAuthError(response, 401, 'TOKEN_INVALID');
    });

    test('answers 401 TOKEN_REQUIRED without a credential', async () => {
      const response = await request(app).post('/api/auth/logout').expect(401);

      expectAuthError(response, 401, 'TOKEN_REQUIRED');
    });
  });

  describe('Malformed JSON bodies', () => {
    test('answers 400 VALIDATION_ERROR naming no field for an unparseable registration body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"name":')
        .expect(400);

      expectAuthError(response, 400, 'VALIDATION_ERROR');
      // A syntax error names no field, so the key is absent rather than empty.
      expect(response.body.error.details).toBeUndefined();
    });
  });
});

