/**
 * @fileoverview Structural reachability tests for the server tiers.
 *
 * Each row answers one question: is this module actually wired into the running
 * application? The suite walks the chains the design fixes — the routes barrel
 * re-exports the API aggregator, the aggregator mounts four domain routers, each
 * router works through its domain service, each service through its
 * repositories, and the repositories through the single connection src/db hands
 * out. Every mount is proven over HTTP rather than by inspecting Express's own
 * routing internals, because Express 5's path-to-regexp no longer exposes a
 * prefix a caller can probe.
 *
 * Two mechanical scans guard the layering the design requires: the socket is
 * bound in the entry point and nowhere under src/, and SQL lives in the
 * repository layer and nowhere in the routers or the services.
 *
 * The client's own chains belong to the separate client package and its
 * reachability suite, so nothing from client/ is imported here.
 *
 * Every row runs against the suite's own database file under the operating
 * system's temporary directory: DB_FILE is assigned before the module registry
 * is reset and before any module that reads it is loaded, so no run touches
 * data/app.db. The file and its WAL and shared-memory companions are removed once
 * the suite ends, and the previous DB_FILE value is restored.
 *
 * @module tests/integration/reachability
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// DB_FILE is set before the module registry is reset and before src/app is
// required, because the behavioural rows below open the database: the path has
// to be in place before the src/config copy those modules read is evaluated. No
// other variable is set.
const previousDbFile = process.env.DB_FILE;
const dbFile = path.join(os.tmpdir(), `burger-reachability-${process.pid}-${Date.now()}.db`);
process.env.DB_FILE = dbFile;

jest.resetModules();

// Every subject is required after the reset, so the identity assertions below
// compare instances from one module registry rather than two.
const request = require('supertest');
const app = require('../../src/app');
const routes = require('../../src/routes');
const {
  AppError,
  ERROR_CODES,
  RESERVATION_ISSUES
} = require('../../src/errors');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/** Absolute path of the repository root, from this suite's own location. */
const REPOSITORY_ROOT = path.join(__dirname, '..', '..');

/** The one module allowed to bind a socket. */
const SERVER_ENTRY = path.join(REPOSITORY_ROOT, 'server.js');

/** Every module the application runs from, scanned for a socket binding. */
const SOURCE_DIR = path.join(REPOSITORY_ROOT, 'src');

/** The router layer, where SQL must not appear. */
const API_ROUTER_DIR = path.join(SOURCE_DIR, 'routes', 'api');

/** The service layer, where SQL must not appear. */
const SERVICE_DIR = path.join(SOURCE_DIR, 'services');

/** The repository layer, where SQL belongs and therefore does appear. */
const REPOSITORY_DIR = path.join(SOURCE_DIR, 'repositories');

/** A socket binding, whatever object it is called on. */
const LISTEN_PATTERN = /\.listen\s*\(/;

/** A SQL statement that reaches a table, as opposed to prose mentioning one. */
const SQL_PATTERN = /\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b/;

/**
 * The thirteen error codes the API contract fixes, each paired with the HTTP
 * status it is answered with.
 * @type {Array<[string, number]>}
 */
const CONTRACT_ERROR_CODES = [
  ['VALIDATION_ERROR', 400],
  ['INVALID_CREDENTIALS', 401],
  ['TOKEN_REQUIRED', 401],
  ['TOKEN_INVALID', 401],
  ['TOKEN_EXPIRED', 401],
  ['EMAIL_ALREADY_REGISTERED', 409],
  ['CATEGORY_NOT_FOUND', 404],
  ['MENU_ITEM_NOT_FOUND', 404],
  ['MENU_ITEM_UNAVAILABLE', 409],
  ['ORDER_NOT_FOUND', 404],
  ['RESERVATION_CONFLICT', 409],
  ['ROUTE_NOT_FOUND', 404],
  ['INTERNAL_ERROR', 500]
];

/**
 * The two reservation validation issue strings the contract fixes verbatim, in
 * sorted order so they compare directly with the sorted values the module
 * publishes.
 * @type {string[]}
 */
const CONTRACT_RESERVATION_ISSUES = [
  'reservation_datetime_in_past',
  'reservation_time_outside_service_hours'
];

/**
 * Asserts that `target` exposes `name` as a callable member.
 *
 * @param {Object} target - Module or object under assertion
 * @param {string} name - Expected member name
 * @returns {void}
 */
function expectFunction(target, name) {
  expect(typeof target[name]).toBe('function');
}

/**
 * Asserts that every name in `names` is a callable member of `target`.
 *
 * The failure message names the module and the missing method, so a renamed or
 * dropped export points at itself rather than at an anonymous boolean.
 *
 * @param {Object} target - Module or object under assertion
 * @param {string[]} names - Expected member names
 * @param {string} [label] - Human-readable name of the module, used in messages
 * @returns {void}
 */
function expectMethods(target, names, label = 'module') {
  for (const name of names) {
    if (typeof target[name] !== 'function') {
      throw new Error(`${label} does not export ${name} as a function`);
    }
  }
}

/**
 * Lists every `.js` file under `directory`, recursively.
 *
 * Recursive because the trees that are scanned nest — `src/routes/api` sits under
 * `src/routes`, and a shallow walk would leave a module unchecked — and sorted so
 * a failing scan reports its offenders in a stable order.
 *
 * @param {string} directory - Absolute directory to walk
 * @returns {string[]} Absolute paths of the `.js` files found, sorted
 */
function listJsFiles(directory) {
  const found = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      found.push(...listJsFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      found.push(entryPath);
    }
  }

  return found.sort();
}

/**
 * Reads a file as text.
 *
 * The scans work on source text rather than on required modules: requiring
 * server.js would bind a socket, and requiring every src module would execute
 * work this suite only wants to inspect.
 *
 * @param {string} file - Absolute path of the file to read
 * @returns {string} The file's contents
 */
function readSource(file) {
  return fs.readFileSync(file, 'utf8');
}

/**
 * Selects the files whose source text matches `pattern`.
 *
 * @param {RegExp} pattern - Pattern to look for, without the global flag
 * @param {string[]} files - Absolute paths to search
 * @returns {string[]} The matching paths, sorted, as repository-relative names
 */
function matchingFiles(pattern, files) {
  return files
    .filter((file) => pattern.test(readSource(file)))
    .map((file) => path.relative(REPOSITORY_ROOT, file))
    .sort();
}

/**
 * Reads the error code out of a response body's envelope.
 *
 * @param {SupertestResponse} response - Supertest response object
 * @returns {string|undefined} The envelope code, or undefined when absent
 */
function errorCodeOf(response) {
  return response.body && response.body.error ? response.body.error.code : undefined;
}

// The handle must close before any file is unlinked: while it is open, WAL keeps
// the database, its -wal and its -shm files in use.
afterAll(() => {
  require('../../src/db').closeDb();

  for (const target of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
    try {
      fs.unlinkSync(target);
    } catch {
      // Already gone: a clean close removes the WAL sidecars, and the remaining
      // failure mode is a sidecar the operating system has not released yet.
      // No assertion depends on either.
    }
  }

  if (previousDbFile === undefined) {
    delete process.env.DB_FILE;
  } else {
    process.env.DB_FILE = previousDbFile;
  }
});

/**
 * The four domain routers the API aggregator mounts, each with the prefix the
 * aggregator gives it. The prefix is documentation here: the mounts are proven
 * behaviourally below, never by inspecting the router's own layer paths.
 * @type {Array<{domain: string, specifier: string, prefix: string}>}
 */
const DOMAIN_ROUTERS = [
  { domain: 'auth', specifier: '../../src/routes/api/auth.routes', prefix: '/auth' },
  { domain: 'menu', specifier: '../../src/routes/api/menu.routes', prefix: '/' },
  { domain: 'orders', specifier: '../../src/routes/api/orders.routes', prefix: '/orders' },
  { domain: 'reservations', specifier: '../../src/routes/api/reservations.routes', prefix: '/reservations' }
];

/**
 * The export contract of each service module: the factory a unit test builds the
 * service with, the singleton a router works through, the methods its routes
 * call, and the projection or helper the module also publishes.
 * @type {Array<{domain: string, specifier: string, factory: string, singleton: string, methods: string[], exports: string[]}>}
 */
const SERVICE_CONTRACT = [
  {
    domain: 'auth',
    specifier: '../../src/services/auth.service',
    factory: 'createAuthService',
    singleton: 'authService',
    methods: ['register', 'login', 'revokeToken'],
    exports: ['toPublicUser', 'hashToken']
  },
  {
    domain: 'menu',
    specifier: '../../src/services/menu.service',
    factory: 'createMenuService',
    singleton: 'menuService',
    methods: ['listCategories', 'listItems', 'getItem'],
    exports: ['toPublicItem']
  },
  {
    domain: 'order',
    specifier: '../../src/services/order.service',
    factory: 'createOrderService',
    singleton: 'orderService',
    methods: ['createOrder', 'listOrders', 'getOrder'],
    exports: ['toPublicOrder']
  },
  {
    domain: 'reservation',
    specifier: '../../src/services/reservation.service',
    factory: 'createReservationService',
    singleton: 'reservationService',
    methods: ['createReservation', 'listReservations'],
    exports: ['toPublicReservation']
  }
];

/**
 * The statement each repository module must expose. The repositories are the
 * only layer that holds SQL, so these are the functions the services above reach
 * the database through.
 * @type {Array<{name: string, specifier: string, methods: string[]}>}
 */
const REPOSITORY_CONTRACT = [
  {
    name: 'user',
    specifier: '../../src/repositories/user.repository',
    methods: ['insert', 'findByEmail', 'findById']
  },
  {
    name: 'token',
    specifier: '../../src/repositories/token.repository',
    methods: ['insert', 'findByHash', 'revoke']
  },
  {
    name: 'category',
    specifier: '../../src/repositories/category.repository',
    methods: ['listOrdered', 'findBySlug']
  },
  {
    name: 'menu-item',
    specifier: '../../src/repositories/menu-item.repository',
    methods: ['listAvailable', 'listByCategoryId', 'findById', 'findManyByIds']
  },
  {
    name: 'order',
    specifier: '../../src/repositories/order.repository',
    methods: ['createWithLines', 'listByUser', 'findByIdForUser']
  },
  {
    name: 'reservation',
    specifier: '../../src/repositories/reservation.repository',
    methods: ['insert', 'listByUser', 'findByUserAndSlot']
  }
];

describe('route barrel', () => {
  test('re-exports both routers src/app.js mounts', () => {
    expect(routes.mainRoutes).toBeDefined();
    expect(routes.apiRoutes).toBeDefined();
  });

  test('re-exports the API aggregator itself rather than a wrapper around it', () => {
    expect(routes.apiRoutes).toBe(require('../../src/routes/api'));
  });

  test('re-exports the tutorial router src/app.js mounts at the root path', () => {
    expect(routes.mainRoutes).toBe(require('../../src/routes/main.routes'));
  });

  test('adds no third export beside the two routers', () => {
    expect(Object.keys(routes).sort()).toEqual(['apiRoutes', 'mainRoutes']);
  });
});

describe('API aggregator', () => {
  test('is itself a router mounted at /api by src/app.js', () => {
    expect(typeof app).toBe('function');
    expect(typeof routes.apiRoutes).toBe('function');
    expect(Array.isArray(routes.apiRoutes.stack)).toBe(true);
  });

  test.each(DOMAIN_ROUTERS)('registers the $domain router at $prefix', ({ specifier }) => {
    const router = require(specifier);

    expect(typeof router).toBe('function');
    expect(Array.isArray(router.stack)).toBe(true);
    expect(router.stack.length).toBeGreaterThan(0);
  });

  test('holds a layer for every domain router it mounts', () => {
    // Each mount is one layer, and the two protected routers additionally
    // register router-level authentication, so four is the floor.
    expect(routes.apiRoutes.stack.length).toBeGreaterThanOrEqual(DOMAIN_ROUTERS.length);
  });
});

describe('service layer', () => {
  test.each(SERVICE_CONTRACT)('publishes the $domain factory and singleton', ({ specifier, factory, singleton }) => {
    const serviceModule = require(specifier);

    expectFunction(serviceModule, factory);
    expect(serviceModule[singleton]).toBeDefined();
    expect(typeof serviceModule[singleton]).toBe('object');
  });

  test.each(SERVICE_CONTRACT)('implements every $domain method its router calls', ({ specifier, singleton, methods, domain }) => {
    expectMethods(require(specifier)[singleton], methods, `${domain}Service`);
  });

  test.each(SERVICE_CONTRACT)('publishes the $domain projection its module owns', ({ specifier, exports: names, domain }) => {
    expectMethods(require(specifier), names, `${domain} service module`);
  });
});

describe('repository layer', () => {
  test.each(REPOSITORY_CONTRACT)('exposes every statement the $name service reaches', ({ specifier, methods, name }) => {
    expectMethods(require(specifier), methods, `${name} repository`);
  });

  test.each(REPOSITORY_CONTRACT)('lives at the path its service requires', ({ specifier }) => {
    // Resolved the way the service resolves it, so a repository moved or renamed
    // out from under its service fails here rather than at the first query.
    expect(fs.existsSync(require.resolve(specifier))).toBe(true);
  });
});

describe('database tier', () => {
  test('exposes the connection lifecycle its repositories share', () => {
    const dbModule = require('../../src/db');

    expectFunction(dbModule, 'getDb');
    expectFunction(dbModule, 'closeDb');
  });

  test('hands out one memoised connection rather than a new one per call', () => {
    const { getDb } = require('../../src/db');

    expect(getDb()).toBe(getDb());
  });
});

describe('middleware tier', () => {
  test('exposes the authentication guard and the factory a unit test builds it with', () => {
    const authModule = require('../../src/middleware/authenticate');

    expectFunction(authModule, 'authenticate');
    expectFunction(authModule, 'createAuthenticate');
  });

  test('exposes the two API-scoped terminals src/app.js mounts', () => {
    expectFunction(require('../../src/middleware/not-found'), 'notFound');
    expectFunction(require('../../src/middleware/error-handler'), 'errorHandler');
  });
});

describe('error vocabulary', () => {
  test('holds exactly the thirteen contract codes', () => {
    expect(Object.keys(ERROR_CODES)).toHaveLength(CONTRACT_ERROR_CODES.length);
    expect(Object.keys(ERROR_CODES).sort()).toEqual(CONTRACT_ERROR_CODES.map(([code]) => code).sort());
  });

  test.each(CONTRACT_ERROR_CODES)('pairs %s with status %i', (code, status) => {
    const entry = ERROR_CODES[code];

    // The table's storage shape belongs to src/errors.js; the mapping is the
    // contract, so either a bare status or an entry carrying one satisfies it.
    expect(entry === status || (entry !== null && typeof entry === 'object' && entry.status === status)).toBe(true);
  });

  test('fixes exactly the two reservation issue strings and no others', () => {
    // The table may expose each string under more than one member name, so the
    // assertion is over the distinct values it publishes, not over its key count.
    const published = [...new Set(Object.values(RESERVATION_ISSUES))].sort();

    expect(published).toEqual(CONTRACT_RESERVATION_ISSUES);
  });

  test('raises AppError instances carrying the code and status of the vocabulary', () => {
    const failure = new AppError('ORDER_NOT_FOUND', 'Order not found.');

    expect(failure).toBeInstanceOf(Error);
    expect(failure.code).toBe('ORDER_NOT_FOUND');
    expect(failure.status).toBe(ERROR_CODES.ORDER_NOT_FOUND);
  });

  test('refuses a code outside the vocabulary rather than answering it without a status', () => {
    expect(() => new AppError('NOT_A_CONTRACT_CODE', 'unknown')).toThrow(TypeError);
  });
});

describe('API mounts', () => {
  test('answers the auth router mounted at /api/auth', async () => {
    const response = await request(app).post('/api/auth/register').send({});

    expect(response.status).toBe(400);
    expect(errorCodeOf(response)).toBe('VALIDATION_ERROR');
  });

  test('answers the menu router mounted at the API root', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.categories)).toBe(true);
    expect(response.body.categories.length).toBeGreaterThan(0);
  });

  test('answers the orders router mounted at /api/orders behind its router-level guard', async () => {
    const response = await request(app).get('/api/orders');

    expect(response.status).toBe(401);
    expect(errorCodeOf(response)).toBe('TOKEN_REQUIRED');
  });

  test('answers the reservations router mounted at /api/reservations behind its router-level guard', async () => {
    const response = await request(app).get('/api/reservations');

    expect(response.status).toBe(401);
    expect(errorCodeOf(response)).toBe('TOKEN_REQUIRED');
  });

  test('terminates an unmatched API path with the API-scoped not-found handler', async () => {
    const response = await request(app).get('/api/nope');

    expect(response.status).toBe(404);
    expect(errorCodeOf(response)).toBe('ROUTE_NOT_FOUND');
  });
});

describe('layering', () => {
  test('binds the socket in the entry point', () => {
    expect(LISTEN_PATTERN.test(readSource(SERVER_ENTRY))).toBe(true);
  });

  test('binds no socket in any module the application runs from', () => {
    const offenders = matchingFiles(LISTEN_PATTERN, listJsFiles(SOURCE_DIR));

    // The offending paths, not a bare boolean: a module that binds a socket is
    // named in the failure so it can be moved back to the entry point.
    expect(offenders).toEqual([]);
  });

  test('keeps SQL out of the router layer', () => {
    const scanned = listJsFiles(API_ROUTER_DIR);

    expect(scanned.length).toBeGreaterThan(0);
    expect(matchingFiles(SQL_PATTERN, scanned)).toEqual([]);
  });

  test('keeps SQL out of the service layer', () => {
    const scanned = listJsFiles(SERVICE_DIR);

    expect(scanned.length).toBeGreaterThan(0);
    expect(matchingFiles(SQL_PATTERN, scanned)).toEqual([]);
  });

  test('finds the SQL the repository layer owns, so the two scans above can bite', () => {
    expect(matchingFiles(SQL_PATTERN, listJsFiles(REPOSITORY_DIR)).length).toBeGreaterThan(0);
  });
});
