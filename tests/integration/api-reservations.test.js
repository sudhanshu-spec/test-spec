/**
 * @fileoverview Integration tests for the reservation API — the two
 * authenticated endpoints of `/api/reservations`, driven through the whole
 * pipeline `src/app.js` registers: CORS, the JSON body parser, the tutorial
 * router, the API router, the Bearer guard inside the reservation router, the
 * two handlers and the `/api`-scoped terminal handlers.
 *
 * The suite pins both contracts: booking a table answers 201 with the stored
 * reservation projected to the seven documented keys, and listing answers the
 * caller's own bookings earliest first. It then proves the six checkpoints of
 * the booking rule one row at a time, in the order the service applies them —
 * the request shape, a start that is not in the past, a 30-minute slot inside
 * the 17:00-22:00 window up to the 21:30 last seating, the 1-12 party range
 * (including a configured maximum set above the bound the column stores),
 * the 90-day horizon and the duplicate slot. Two rows are boundary rows (21:30
 * accepted where 21:31 is refused; today+90 accepted where today+91 is
 * refused), and one row proves the past checkpoint decides before the window
 * checkpoint when a request breaks both. The remaining rows pin per-user
 * isolation (two callers may hold one slot, one caller may not hold it twice),
 * the date-then-time listing order, the missing and unknown credentials, and
 * the absence of any per-id read or cancellation verb.
 *
 * The database is the suite's own file under the operating system's temporary
 * directory: `DB_FILE` is set before `jest.resetModules()` and before any module
 * that reads it is loaded, so the application under test, its configuration and
 * its connection belong to this suite alone. The file and its WAL and
 * shared-memory companions are removed, and the previous `DB_FILE` restored,
 * when the suite ends. Every threshold asserted here is a documented default of
 * `src/config/index.js`; the one block that configures a setting above its
 * documented maximum restores the variable when that block ends.
 *
 * @module tests/integration/api-reservations
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * The `DB_FILE` this process started with, restored once the suite ends.
 * @type {string|undefined}
 */
const previousDbFile = process.env.DB_FILE;

/**
 * Absolute path of the SQLite file this suite owns. Built from the process id
 * and the clock so two suites never share a file, and placed outside the
 * checkout so no test artifact can reach the working tree.
 * @type {string}
 */
const dbFile = path.join(os.tmpdir(), `burger-api-reservations-${process.pid}-${Date.now()}.db`);

/*
 * The assignment must precede jest.resetModules() and the require calls below:
 * src/config/index.js reads DB_FILE when it is evaluated, so the registry is
 * reset afterwards to guarantee that every module this suite loads — the app,
 * its configuration, its connection, its repositories — reads this path.
 */
process.env.DB_FILE = dbFile;
jest.resetModules();

const request = require('supertest');
const app = require('../../src/app');

/**
 * The seven keys a reservation projection carries, alphabetically sorted, so a
 * column added to the table cannot reach a response unnoticed.
 * @type {string[]}
 */
const RESERVATION_KEYS = [
  'created_at',
  'id',
  'notes',
  'party_size',
  'reservation_date',
  'reservation_time',
  'status'
];

/** A 30-minute slot comfortably inside the default 17:00-22:00 window. @type {string} */
const BOOKABLE_TIME = '18:00';

/**
 * Last seating of the default window: `serviceCloseTime` (22:00) minus one
 * 30-minute slot.
 * @type {string}
 */
const LAST_SEATING = '21:30';

/** Party size the contract accepts at both ends of its range. @type {number} */
const MIN_PARTY_SIZE = 1;
/** Largest party size the contract accepts. @type {number} */
const MAX_PARTY_SIZE = 12;

/** Reservation horizon, in calendar days, that the boundary rows bracket. @type {number} */
const HORIZON_DAYS = 90;

/** The contract's issue string for a start that is already in the past. @type {string} */
const DATETIME_IN_PAST = 'reservation_datetime_in_past';

/** The contract's issue string for a start outside the service window or off a slot. @type {string} */
const TIME_OUTSIDE_SERVICE_HOURS = 'reservation_time_outside_service_hours';

/** Shape of the id a stored reservation carries. @type {RegExp} */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * The two authenticated collection endpoints, used by the credential rows so
 * each refusal is proven on the method the contract actually serves.
 * @type {Array<[string, string]>}
 */
const COLLECTION_ENDPOINTS = [
  ['get', '/api/reservations'],
  ['post', '/api/reservations']
];

/**
 * Formats one day or month component with a leading zero.
 * @param {number} value - Day or month number.
 * @returns {string} The component, two characters wide.
 */
function pad(value) {
  return String(value).padStart(2, '0');
}

/**
 * Builds the calendar date a number of days from today, in the server's local
 * timezone.
 *
 * Local getters are used deliberately: `toISOString()` converts to UTC and
 * shifts the calendar day in any zone behind Greenwich, which would move both
 * the past guard and the 90-day horizon by a day.
 *
 * @param {number} offsetDays - Days from today; a negative value lies in the past.
 * @returns {string} Calendar date, formatted `YYYY-MM-DD`.
 */
function localIsoDate(offsetDays) {
  const date = new Date();

  date.setDate(date.getDate() + offsetDays);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Number of addresses this suite has minted, so no address repeats another. @type {number} */
let accountSequence = 0;

/**
 * Builds an email address no account in this run holds.
 * @returns {string} Unique address.
 */
function uniqueEmail() {
  accountSequence += 1;

  return `reservation-api-${process.pid}-${Date.now()}-${accountSequence}@example.com`;
}

/**
 * Registers a fresh account through the public endpoint, which also opens a
 * session, and returns the issued credential and public user.
 *
 * @returns {Promise<{token: string, user: Object}>} The session of the new account.
 */
async function registerAndLogin() {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Reservation API Test', email: uniqueEmail(), password: 'booking-passphrase' });

  expect(response.status).toBe(201);
  expect(typeof response.body.token).toBe('string');

  return { token: response.body.token, user: response.body.user };
}

/**
 * Accounts registered so far, by suite-local label.
 * @type {Map<string, {token: string, user: Object}>}
 */
const accounts = new Map();

/**
 * Returns the account held under a label, registering it on first use so each
 * group of rows books as its own caller: a slot one group holds can never make
 * another group's row conflict for the wrong reason.
 *
 * @param {string} label - Suite-local name of the account.
 * @returns {Promise<{token: string, user: Object}>} That account's session.
 */
async function accountFor(label) {
  if (!accounts.has(label)) {
    accounts.set(label, await registerAndLogin());
  }

  return accounts.get(label);
}

/**
 * Builds the header value the API accepts for a session.
 * @param {string} token - Raw session token.
 * @returns {string} Authorization header value.
 */
function authHeader(token) {
  return `Bearer ${token}`;
}

/**
 * Posts a booking for one caller.
 * @param {string} token - The caller's session token.
 * @param {Object} payload - Booking fields exactly as the caller sends them.
 * @returns {SupertestResponse} The response, before it settles.
 */
function createReservation(token, payload) {
  return request(app).post('/api/reservations').set('Authorization', authHeader(token)).send(payload);
}

/**
 * Lists the bookings one caller holds.
 * @param {string} token - The caller's session token.
 * @returns {SupertestResponse} The response, before it settles.
 */
function listReservations(token) {
  return request(app).get('/api/reservations').set('Authorization', authHeader(token));
}

/**
 * Asserts that a response is the documented error envelope for one code: the
 * paired HTTP status, the JSON content type, and a non-empty message.
 *
 * @param {SupertestResponse} response - Response to assert.
 * @param {number} status - HTTP status the code is paired with.
 * @param {string} code - Expected `body.error.code`.
 * @returns {void}
 */
function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.headers['content-type']).toMatch(/application\/json/);
  expect(response.body.error).toBeDefined();
  expect(response.body.error.code).toBe(code);
  expect(typeof response.body.error.message).toBe('string');
  expect(response.body.error.message.length).toBeGreaterThan(0);
}

/**
 * Asserts a `400 VALIDATION_ERROR` carrying exactly one field detail, which is
 * what a request breaking a single rule must produce.
 *
 * @param {SupertestResponse} response - Response to assert.
 * @param {string} field - Field the detail must name.
 * @param {string} issue - Issue string the detail must carry.
 * @returns {void}
 */
function expectValidationDetail(response, field, issue) {
  expectError(response, 400, 'VALIDATION_ERROR');
  expect(Array.isArray(response.body.error.details)).toBe(true);
  expect(response.body.error.details).toHaveLength(1);
  expect(response.body.error.details[0]).toEqual({ field, issue });
}

/**
 * Reads the issue string of the first field detail.
 * @param {SupertestResponse} response - Response carrying validation details.
 * @returns {string} The first detail's issue.
 */
function issueOf(response) {
  return response.body.error.details[0].issue;
}

/**
 * Builds a booking body that satisfies the shape checkpoint, overriding only the
 * fields a row means to exercise.
 * @param {Object} [overrides] - Fields to replace.
 * @returns {Object} Booking payload.
 */
function booking(overrides) {
  return {
    reservation_date: localIsoDate(7),
    reservation_time: BOOKABLE_TIME,
    party_size: 2,
    ...overrides
  };
}

/*
 * Teardown: the connection is closed before the file is unlinked, because an
 * open SQLite handle keeps it locked, and the outer DB_FILE is restored so no
 * later module in this process reads this suite's path.
 */
afterAll(() => {
  require('../../src/db').closeDb();

  for (const file of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
    fs.rmSync(file, { force: true });
  }

  if (previousDbFile === undefined) {
    delete process.env.DB_FILE;
  } else {
    process.env.DB_FILE = previousDbFile;
  }
});

describe('Reservation API', () => {
  describe('POST /api/reservations — the booked table', () => {
    test('answers 201 with the documented reservation projection', async () => {
      const { token } = await accountFor('booker');
      const reservationDate = localIsoDate(7);
      const notes = 'Window seat if one is free.';

      const response = await createReservation(token, {
        reservation_date: reservationDate,
        reservation_time: BOOKABLE_TIME,
        party_size: 2,
        notes
      });

      expect(response.status).toBe(201);
      expect(response.body).not.toHaveProperty('error');

      const { reservation } = response.body;
      expect(Object.keys(reservation).sort()).toEqual(RESERVATION_KEYS);
      expect(reservation.id).toMatch(UUID_PATTERN);
      expect(reservation.reservation_date).toBe(reservationDate);
      expect(reservation.reservation_time).toBe(BOOKABLE_TIME);
      expect(reservation.party_size).toBe(2);
      expect(reservation.status).toBe('confirmed');
      expect(reservation.notes).toBe(notes);
      expect(typeof reservation.created_at).toBe('string');
      expect(Number.isNaN(Date.parse(reservation.created_at))).toBe(false);
    });
  });

  describe('POST /api/reservations — checkpoint 1: the request shape', () => {
    test('rejects a body that carries no reservation date', async () => {
      const { token } = await accountFor('shape');
      const response = await createReservation(token, { reservation_time: BOOKABLE_TIME, party_size: 2 });

      expectValidationDetail(response, 'reservation_date', 'required');
    });

    test('rejects a date that is not a real calendar day', async () => {
      const { token } = await accountFor('shape');
      const response = await createReservation(token, booking({ reservation_date: '2025-13-40' }));

      expectValidationDetail(response, 'reservation_date', 'invalid_date_format');
    });

    test('rejects a time that is not on a 24-hour clock', async () => {
      const { token } = await accountFor('shape');
      const response = await createReservation(token, booking({ reservation_time: '25:00' }));

      expectValidationDetail(response, 'reservation_time', 'invalid_time_format');
    });

    test('rejects a party size that is not an integer', async () => {
      const { token } = await accountFor('shape');
      const response = await createReservation(token, booking({ party_size: 'four' }));

      expectValidationDetail(response, 'party_size', 'invalid_party_size');
    });

    test('names every missing field of a request that carries no body at all', async () => {
      const { token } = await accountFor('shape');
      const response = await request(app).post('/api/reservations').set('Authorization', authHeader(token));

      expectError(response, 400, 'VALIDATION_ERROR');
      expect(response.body.error.details).toEqual([
        { field: 'reservation_date', issue: 'required' },
        { field: 'reservation_time', issue: 'required' },
        { field: 'party_size', issue: 'invalid_party_size' }
      ]);
    });
  });

  describe('POST /api/reservations — checkpoint 2: the start is not in the past', () => {
    test('rejects a slot on yesterday', async () => {
      const { token } = await accountFor('past');
      const response = await createReservation(token, booking({ reservation_date: localIsoDate(-1) }));

      expectValidationDetail(response, 'reservation_date', DATETIME_IN_PAST);
    });

    test('reports the past checkpoint before the service-window checkpoint', async () => {
      const { token } = await accountFor('past');
      const response = await createReservation(
        token,
        booking({ reservation_date: localIsoDate(-1), reservation_time: '03:00' })
      );

      expectValidationDetail(response, 'reservation_date', DATETIME_IN_PAST);
      expect(issueOf(response)).not.toBe(TIME_OUTSIDE_SERVICE_HOURS);
    });
  });

  describe('POST /api/reservations — checkpoint 3: a slot inside the service window', () => {
    test('accepts the last seating, one slot before closing', async () => {
      const { token } = await accountFor('window');
      const response = await createReservation(token, booking({ reservation_time: LAST_SEATING }));

      expect(response.status).toBe(201);
      expect(response.body.reservation.reservation_time).toBe(LAST_SEATING);
    });

    test.each([
      ['21:31', 'one minute past the last seating'],
      ['22:00', 'the closing time itself'],
      ['16:59', 'one minute before opening'],
      ['18:15', 'a time that is not on a 30-minute slot']
    ])('rejects %s (%s) with reservation_time_outside_service_hours', async (time) => {
      const { token } = await accountFor('window');
      const response = await createReservation(token, booking({ reservation_time: time }));

      expectValidationDetail(response, 'reservation_time', TIME_OUTSIDE_SERVICE_HOURS);
    });
  });

  describe('POST /api/reservations — checkpoint 4: the party size range', () => {
    test.each([
      [MIN_PARTY_SIZE, '18:00'],
      [MAX_PARTY_SIZE, '18:30']
    ])('accepts a party of %i at %s', async (partySize, time) => {
      const { token } = await accountFor('party');
      const response = await createReservation(
        token,
        booking({ reservation_date: localIsoDate(10), reservation_time: time, party_size: partySize })
      );

      expect(response.status).toBe(201);
      expect(response.body.reservation.party_size).toBe(partySize);
    });

    test.each([0, 13])('rejects a party of %i with out_of_range', async (partySize) => {
      const { token } = await accountFor('party');
      const response = await createReservation(
        token,
        booking({ reservation_date: localIsoDate(10), reservation_time: '19:00', party_size: partySize })
      );

      expectValidationDetail(response, 'party_size', 'out_of_range');
    });
  });

  describe('POST /api/reservations — checkpoint 5: the reservation horizon', () => {
    test('accepts a date exactly at the horizon edge', async () => {
      const { token } = await accountFor('horizon');
      const reservationDate = localIsoDate(HORIZON_DAYS);
      const response = await createReservation(token, booking({ reservation_date: reservationDate }));

      expect(response.status).toBe(201);
      expect(response.body.reservation.reservation_date).toBe(reservationDate);
    });

    test('rejects a date one day beyond the horizon', async () => {
      const { token } = await accountFor('horizon');
      const response = await createReservation(token, booking({ reservation_date: localIsoDate(HORIZON_DAYS + 1) }));

      expectValidationDetail(response, 'reservation_date', 'outside_reservation_horizon');
    });
  });

  describe('POST /api/reservations — checkpoint 6: the duplicate slot', () => {
    test('answers a slot the caller already holds with RESERVATION_CONFLICT', async () => {
      const { token } = await accountFor('duplicate');
      const payload = booking({ reservation_date: localIsoDate(11) });

      const first = await createReservation(token, payload);
      expect(first.status).toBe(201);

      const second = await createReservation(token, payload);
      expectError(second, 409, 'RESERVATION_CONFLICT');
      expect(second.body.error.details).toBeUndefined();
    });
  });

  describe('GET /api/reservations — per-user isolation', () => {
    const sharedSlot = () =>
      booking({ reservation_date: localIsoDate(12), reservation_time: '19:00', party_size: 4 });

    test('accepts one slot for a second caller while refusing it again for the first', async () => {
      const owner = await accountFor('slot-owner');
      const neighbour = await accountFor('slot-neighbour');

      const ownerBooking = await createReservation(owner.token, sharedSlot());
      expect(ownerBooking.status).toBe(201);

      const neighbourBooking = await createReservation(neighbour.token, sharedSlot());
      expect(neighbourBooking.status).toBe(201);
      expect(neighbourBooking.body.reservation.id).not.toBe(ownerBooking.body.reservation.id);

      const repeat = await createReservation(owner.token, sharedSlot());
      expectError(repeat, 409, 'RESERVATION_CONFLICT');
    });

    test('lists the caller’s own bookings only, and none of another caller’s', async () => {
      const owner = await accountFor('list-owner');
      const neighbour = await accountFor('list-neighbour');
      const idle = await accountFor('idle');

      const ownerBooking = await createReservation(
        owner.token,
        booking({ reservation_date: localIsoDate(13), reservation_time: '18:00' })
      );
      expect(ownerBooking.status).toBe(201);

      const neighbourBooking = await createReservation(
        neighbour.token,
        booking({ reservation_date: localIsoDate(13), reservation_time: '18:30' })
      );
      expect(neighbourBooking.status).toBe(201);

      const ownerList = await listReservations(owner.token);
      const neighbourList = await listReservations(neighbour.token);

      expect(ownerList.status).toBe(200);
      expect(neighbourList.status).toBe(200);

      const ownerIds = ownerList.body.reservations.map((row) => row.id);
      const neighbourIds = neighbourList.body.reservations.map((row) => row.id);

      expect(ownerIds).toContain(ownerBooking.body.reservation.id);
      expect(neighbourIds).toContain(neighbourBooking.body.reservation.id);
      for (const id of neighbourIds) {
        expect(ownerIds).not.toContain(id);
      }
      for (const id of ownerIds) {
        expect(neighbourIds).not.toContain(id);
      }
      for (const row of ownerList.body.reservations) {
        expect(Object.keys(row).sort()).toEqual(RESERVATION_KEYS);
      }

      const idleList = await listReservations(idle.token);
      expect(idleList.status).toBe(200);
      expect(idleList.body.reservations).toEqual([]);
    });
  });

  describe('GET /api/reservations — the listing order', () => {
    test('lists bookings by date and then by time, earliest first', async () => {
      const { token } = await accountFor('history');
      const later = booking({ reservation_date: localIsoDate(20), reservation_time: '19:00' });
      const earlierLate = booking({ reservation_date: localIsoDate(5), reservation_time: '20:00' });
      const earlierEarly = booking({ reservation_date: localIsoDate(5), reservation_time: '18:00' });

      for (const slot of [later, earlierLate, earlierEarly]) {
        const created = await createReservation(token, slot);
        expect(created.status).toBe(201);
      }

      const response = await listReservations(token);
      expect(response.status).toBe(200);
      expect(response.body.reservations.map((row) => `${row.reservation_date} ${row.reservation_time}`)).toEqual([
        `${earlierEarly.reservation_date} ${earlierEarly.reservation_time}`,
        `${earlierLate.reservation_date} ${earlierLate.reservation_time}`,
        `${later.reservation_date} ${later.reservation_time}`
      ]);
    });
  });

  describe('Authentication guard', () => {
    test.each(COLLECTION_ENDPOINTS)('%s %s without an Authorization header answers TOKEN_REQUIRED', async (method, endpoint) => {
      const response = await request(app)[method](endpoint);

      expectError(response, 401, 'TOKEN_REQUIRED');
      expect(response.body.error.details).toBeUndefined();
    });

    test.each(COLLECTION_ENDPOINTS)('%s %s with an unknown bearer token answers TOKEN_INVALID', async (method, endpoint) => {
      const response = await request(app)[method](endpoint).set('Authorization', authHeader('not-a-real-token'));

      expectError(response, 401, 'TOKEN_INVALID');
      expect(response.body.error.details).toBeUndefined();
    });
  });

  describe('Route surface', () => {
    test('answers a per-id read of the caller’s own booking with ROUTE_NOT_FOUND', async () => {
      const { token } = await accountFor('route-surface');
      const created = await createReservation(token, booking({ reservation_date: localIsoDate(15), reservation_time: '19:00' }));
      expect(created.status).toBe(201);

      const response = await request(app)
        .get(`/api/reservations/${created.body.reservation.id}`)
        .set('Authorization', authHeader(token));

      expectError(response, 404, 'ROUTE_NOT_FOUND');
    });

    test.each(['delete', 'put', 'patch'])('answers %s on the collection with ROUTE_NOT_FOUND', async (method) => {
      const { token } = await accountFor('route-surface');
      const response = await request(app)[method]('/api/reservations').set('Authorization', authHeader(token));

      expectError(response, 404, 'ROUTE_NOT_FOUND');
      expect(response.body.error.details).toBeUndefined();
    });
  });

  describe('POST /api/reservations — a maximum party size above the stored column bound', () => {
    /**
     * The `MAX_PARTY_SIZE` this block configures: above the 1..12 bound that
     * `reservations.party_size` carries, which is the setting value that used to
     * let a party of 13 reach the insert and answer 500 instead of 400.
     * @type {string}
     */
    const RAISED_MAX_PARTY_SIZE = '20';

    test('is refused when the configuration is read, naming MAX_PARTY_SIZE', () => {
      // The setting is bounded by the schema's own ceiling when it is read, so a
      // party the column cannot hold is refused before the API can serve it. The
      // registry is isolated so the application this suite already loaded keeps
      // the configuration the other rows run under.
      expect(() =>
        jest.isolateModules(() => {
          const previous = process.env.MAX_PARTY_SIZE;
          process.env.MAX_PARTY_SIZE = RAISED_MAX_PARTY_SIZE;
          try {
            require('../../src/app');
          } finally {
            if (previous === undefined) {
              delete process.env.MAX_PARTY_SIZE;
            } else {
              process.env.MAX_PARTY_SIZE = previous;
            }
          }
        })
      ).toThrow('Invalid MAX_PARTY_SIZE: 20. Expected an integer between 1 and 12.');
    });

    test('answers a party the stored column cannot hold with 400 VALIDATION_ERROR, never 500', async () => {
      const { token } = await accountFor('party-ceiling');
      const response = await createReservation(
        token,
        booking({ reservation_date: localIsoDate(14), reservation_time: '18:00', party_size: 13 })
      );

      expect(response.status).not.toBe(500);
      expectValidationDetail(response, 'party_size', 'out_of_range');
      expect(response.body.error.message).toContain('1 and 12');
    });

    test('accepts the largest party the stored column holds', async () => {
      const { token } = await accountFor('party-ceiling');
      const response = await createReservation(
        token,
        booking({ reservation_date: localIsoDate(14), reservation_time: '19:00', party_size: 12 })
      );

      expect(response.status).toBe(201);
      expect(response.body).not.toHaveProperty('error');
      expect(response.body.reservation.party_size).toBe(12);
    });
  });
});

