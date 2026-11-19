/**
 * @fileoverview Unit tests for the Bearer-token authentication middleware
 * (src/middleware/authenticate.js). Every case builds the guard over stubbed
 * repositories and a pinned clock, so no database, no HTTP request and no port
 * is involved.
 * @module tests/unit/authenticate
 */

'use strict';

const crypto = require('node:crypto');

const { authenticate, createAuthenticate } = require('../../src/middleware/authenticate');

/** Pinned instant the expiry comparison is measured against. @type {string} */
const NOW = '2026-01-01T12:00:00.000Z';

/** An instant after {@link NOW}, so a token expiring then is still live. @type {string} */
const FUTURE = '2026-01-02T12:00:00.000Z';

/** An instant before {@link NOW}, so a token expiring then is past. @type {string} */
const PAST = '2026-01-01T00:00:00.000Z';

/** Raw credential presented in the header by every authenticated case. @type {string} */
const RAW_TOKEN = 'raw-token';

/** The user row the stub repository returns, secret columns included. @type {Object} */
const USER_ROW = {
  id: 'user-1',
  name: 'Ada',
  email: 'ada@example.com',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  password_hash: 'stored-hash',
  password_salt: 'stored-salt'
};

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
 * Build one token row shaped exactly as tokenRepository.findByHash returns it.
 *
 * @param {Object} [overrides] - Columns to replace.
 * @returns {Object} Stored token row.
 */
function tokenRow(overrides = {}) {
  return {
    id: 'token-1',
    user_id: 'user-1',
    token_hash: sha256Hex(RAW_TOKEN),
    expires_at: FUTURE,
    revoked_at: null,
    created_at: NOW,
    ...overrides
  };
}

/**
 * Build the guard over stubs, capturing every collaborator call and the single
 * argument `next` receives.
 *
 * @param {Object} [options] - Stub outcomes.
 * @param {Object|null} [options.row] - Row findByHash returns.
 * @param {Object|null} [options.user] - Row findById returns.
 * @param {string} [options.now] - Instant the stubbed clock reports.
 * @returns {{guard: Function, calls: Object, invoke: Function, setClock: Function}}
 *   The guard, its recorded calls, an invocation helper and a clock setter.
 */
function buildGuard({ row = tokenRow(), user = USER_ROW, now = NOW } = {}) {
  const calls = { hashes: [], userIds: [], clockReads: 0 };
  let clock = now;

  const guard = createAuthenticate({
    tokens: {
      findByHash(hash) {
        calls.hashes.push(hash);
        return row;
      }
    },
    users: {
      findById(id) {
        calls.userIds.push(id);
        return user;
      }
    },
    now: () => {
      calls.clockReads += 1;
      return new Date(clock);
    }
  });

  return {
    guard,
    calls,
    setClock(value) {
      clock = value;
    },
    invoke(req) {
      const res = { status: jest.fn(), json: jest.fn(), send: jest.fn(), end: jest.fn() };
      const next = jest.fn();
      guard(req, res, next);
      return { req, res, next };
    }
  };
}

/**
 * A request carrying the given raw credential as a Bearer token.
 *
 * @param {string} token - Credential to present.
 * @returns {Object} Minimal Express-like request.
 */
function bearerRequest(token) {
  return { headers: { authorization: `Bearer ${token}` } };
}

describe('Authentication middleware - authenticate.js', () => {
  test('exports the ready-made guard and its factory', () => {
    expect(Object.keys({ authenticate, createAuthenticate }).sort()).toEqual([
      'authenticate',
      'createAuthenticate'
    ]);
    expect(typeof authenticate).toBe('function');
    expect(typeof createAuthenticate).toBe('function');
  });

  describe('TOKEN_REQUIRED', () => {
    test.each([
      ['no request headers at all', {}],
      ['an empty headers object', { headers: {} }],
      ['an empty header value', { headers: { authorization: '' } }],
      ['a non-Bearer scheme', { headers: { authorization: 'Token abc' } }],
      ['the Basic scheme', { headers: { authorization: 'Basic YWJjOmRlZg==' } }],
      ['a bare Bearer with no credential', { headers: { authorization: 'Bearer' } }],
      ['a Bearer followed only by spaces', { headers: { authorization: 'Bearer    ' } }],
      ['two credentials in one header', { headers: { authorization: 'Bearer abc def' } }],
      ['a repeated header delivered as an array', { headers: { authorization: ['Bearer abc', 'Bearer def'] } }],
      ['a non-string header value', { headers: { authorization: 42 } }]
    ])('answers 401 TOKEN_REQUIRED for %s', (_case, req) => {
      const harness = buildGuard();
      const { next, res } = harness.invoke(req);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('TOKEN_REQUIRED');
      expect(error.status).toBe(401);
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);
      expect(harness.calls.hashes).toEqual([]);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('TOKEN_INVALID', () => {
    test('answers 401 when the digest matches no token row', () => {
      const harness = buildGuard({ row: null });
      const { next } = harness.invoke(bearerRequest(RAW_TOKEN));

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0].code).toBe('TOKEN_INVALID');
      expect(next.mock.calls[0][0].status).toBe(401);
      expect(harness.calls.userIds).toEqual([]);
    });

    test('answers 401 for a revoked token, even when it is also expired', () => {
      const harness = buildGuard({ row: tokenRow({ revoked_at: PAST, expires_at: PAST }) });
      const { next } = harness.invoke(bearerRequest(RAW_TOKEN));

      expect(next.mock.calls[0][0].code).toBe('TOKEN_INVALID');
      expect(harness.calls.userIds).toEqual([]);
    });

    test('answers 401 when the token row names an owner that no longer exists', () => {
      const harness = buildGuard({ user: null });
      const { next } = harness.invoke(bearerRequest(RAW_TOKEN));

      expect(next.mock.calls[0][0].code).toBe('TOKEN_INVALID');
      expect(harness.calls.userIds).toEqual(['user-1']);
    });
  });

  describe('TOKEN_EXPIRED', () => {
    test('answers 401 for a token past its expires_at', () => {
      const harness = buildGuard({ row: tokenRow({ expires_at: PAST }) });
      const { next } = harness.invoke(bearerRequest(RAW_TOKEN));

      expect(next.mock.calls[0][0].code).toBe('TOKEN_EXPIRED');
      expect(next.mock.calls[0][0].status).toBe(401);
      expect(harness.calls.userIds).toEqual([]);
    });

    test('treats a token expiring exactly now as expired', () => {
      const harness = buildGuard({ row: tokenRow({ expires_at: NOW }) });
      const { next } = harness.invoke(bearerRequest(RAW_TOKEN));

      expect(next.mock.calls[0][0].code).toBe('TOKEN_EXPIRED');
    });

    test('reads the injected clock, so advancing it expires a live token', () => {
      const harness = buildGuard();

      expect(harness.invoke(bearerRequest(RAW_TOKEN)).next.mock.calls[0][0]).toBeUndefined();
      expect(harness.calls.clockReads).toBe(1);

      harness.setClock('2026-01-03T00:00:00.000Z');
      expect(harness.invoke(bearerRequest(RAW_TOKEN)).next.mock.calls[0][0].code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('a live token', () => {
    test('assigns the secret-free user projection and continues with no argument', () => {
      const harness = buildGuard();
      const { req, next, res } = harness.invoke(bearerRequest(RAW_TOKEN));

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(Object.keys(req.user).sort()).toEqual(['created_at', 'email', 'id', 'name']);
      expect(req.user).toEqual({
        id: 'user-1',
        name: 'Ada',
        email: 'ada@example.com',
        created_at: '2026-01-01T00:00:00.000Z'
      });
      expect(JSON.stringify(req.user)).not.toMatch(/password_hash|password_salt|token_hash/);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    test('hands the repository the SHA-256 digest rather than the raw credential', () => {
      const harness = buildGuard();
      harness.invoke(bearerRequest(RAW_TOKEN));

      const [hash] = harness.calls.hashes;
      expect(harness.calls.hashes).toHaveLength(1);
      expect(hash).toBe(sha256Hex(RAW_TOKEN));
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).not.toBe(RAW_TOKEN);
    });

    test.each([
      ['a lowercase scheme', 'bearer raw-token'],
      ['an uppercase scheme', 'BEARER raw-token'],
      ['surrounding whitespace', '  Bearer   raw-token  '],
      ['a tab after the scheme', 'Bearer\traw-token']
    ])('accepts %s', (_case, header) => {
      const harness = buildGuard();
      const { req, next } = harness.invoke({ headers: { authorization: header } });

      expect(next).toHaveBeenCalledWith();
      expect(req.user.id).toBe('user-1');
      expect(harness.calls.hashes).toEqual([sha256Hex(RAW_TOKEN)]);
    });

    test('ignores any caller-supplied identity in the body, query or path', () => {
      const harness = buildGuard();
      const { req } = harness.invoke({
        headers: { authorization: `Bearer ${RAW_TOKEN}` },
        body: { user_id: 'attacker', id: 'attacker' },
        query: { user_id: 'attacker', userId: 'attacker' },
        params: { user_id: 'attacker', id: 'attacker' }
      });

      expect(req.user.id).toBe('user-1');
      expect(harness.calls.userIds).toEqual(['user-1']);
    });

    test('falls back to the system clock when no clock is injected', () => {
      const next = jest.fn();
      const req = bearerRequest(RAW_TOKEN);
      const guard = createAuthenticate({
        tokens: { findByHash: () => tokenRow({ expires_at: '2999-01-01T00:00:00.000Z' }) },
        users: { findById: () => USER_ROW }
      });

      guard(req, { status: jest.fn(), json: jest.fn() }, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user.id).toBe('user-1');
    });
  });

  test('calls next exactly once on every outcome', () => {
    const outcomes = [
      { row: null },
      { row: tokenRow({ revoked_at: PAST }) },
      { row: tokenRow({ expires_at: PAST }) },
      { row: tokenRow(), user: null },
      { row: tokenRow() }
    ];

    for (const outcome of outcomes) {
      expect(buildGuard(outcome).invoke(bearerRequest(RAW_TOKEN)).next).toHaveBeenCalledTimes(1);
      expect(buildGuard(outcome).invoke({}).next).toHaveBeenCalledTimes(1);
    }
  });
});
