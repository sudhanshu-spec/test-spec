/**
 * @fileoverview Integration tests for the reservations table accessor
 * (src/repositories/reservation.repository.js), exercised through its public API
 * { insert, listByUser, findByUserAndSlot } against a real SQLite database: the
 * row stored with every field supplied and the defaults applied when the
 * optional ones are omitted, the date and time bound exactly as received, the
 * driver's own unique-constraint error for a slot the same user already holds
 * and the acceptance of that slot for a different user, the row the insert's
 * statement reads back with RETURNING, the date-then-time listing scoped to one
 * user, and the slot lookup with its null answers. The database file lives in a
 * directory the suite creates under the operating system's temporary directory,
 * outside the checkout.
 *
 * @module tests/integration/reservation-repository
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** Module specifier of the connection the suite replaces in its stubbed test. */
const DATABASE_MODULE = '../../src/db';

/** The reservations columns every returned row carries, in the module's select order. */
const RESERVATION_COLUMNS = [
  'id',
  'user_id',
  'reservation_date',
  'reservation_time',
  'party_size',
  'status',
  'notes',
  'created_at'
];

/** Shape of the UUIDv4 the module mints when a caller omits the id. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** ISO-8601 instant with milliseconds in UTC, the form createdAt defaults to. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Every module instance the suite loaded, closed together once the file ends. */
const loadedModules = [];

/** Temporary directory the suite's database file lives in. */
let workDir;

/** Counter that gives every users row its own id and email. */
let userSequence = 0;

/** The repository under test and the accessor it opens its connection through. */
let repository;
let getDb;

/**
 * Loads a pristine instance of src/repositories/reservation.repository.js
 * configured to open `file`.
 *
 * jest.resetModules() gives the suite its own copies of the configuration, the
 * database module and the repository, so the memoised connection is its own. The
 * configuration object is mutated rather than replaced, because src/db/index.js
 * reads config.dbFile off it on every getDb() call.
 *
 * @param {string} file - Absolute path the module must open as its database.
 * @returns {{repository: Object, getDb: Function}} The repository and the accessor.
 */
function loadReservationRepository(file) {
  jest.resetModules();

  const config = require('../../src/config');
  config.dbFile = file;

  const databaseModule = require('../../src/db');
  loadedModules.push({ closeDb: databaseModule.closeDb });

  return {
    repository: require('../../src/repositories/reservation.repository'),
    getDb: databaseModule.getDb
  };
}

/**
 * Inserts one users row so a reservation has an owner to reference.
 *
 * reservations.user_id is a FOREIGN KEY on users(id) and the connection enforces
 * it, so a booking cannot be stored for a user that does not exist. The row is
 * written directly on the open handle: this suite tests the reservations table,
 * and the users repository has its own suite.
 *
 * @returns {string} The id of the user just created.
 */
function createUser() {
  const index = ++userSequence;
  const id = `user-${index}`;

  getDb()
    .prepare(
      'INSERT INTO users (id, name, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, `Diner ${index}`, `diner.${index}@example.com`, 'a'.repeat(64), 'b'.repeat(32));

  return id;
}

/**
 * Builds the arguments insert() takes, with the date, time and party size a
 * booking commonly carries. Every test overrides what it is about.
 *
 * @param {string} userId - Owner of the booking.
 * @param {Object} [overrides] - Fields that replace the defaults.
 * @returns {Object} The arguments for insert().
 */
const newReservation = (userId, overrides = {}) => ({
  userId,
  reservationDate: '2099-01-01',
  reservationTime: '19:00',
  partySize: 2,
  ...overrides
});

/**
 * Reads one row straight from the table, independently of the repository, so a
 * returned row can be compared with what was actually stored.
 *
 * @param {string} id - Booking id to read.
 * @returns {Object|undefined} The stored row, or undefined when nothing was written.
 */
const storedRow = (id) =>
  getDb()
    .prepare(`SELECT ${RESERVATION_COLUMNS.join(', ')} FROM reservations WHERE id = ?`)
    .get(id);

/**
 * Counts the rows one user holds.
 *
 * @param {string} userId - Owner to count for.
 * @returns {number} Row count.
 */
const countForUser = (userId) =>
  getDb().prepare('SELECT COUNT(*) AS total FROM reservations WHERE user_id = ?').get(userId).total;

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

describe('reservation repository module (src/repositories/reservation.repository.js)', () => {
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzy-reservation-repository-'));
    ({ repository, getDb } = loadReservationRepository(path.join(workDir, 'app.db')));
  });

  afterAll(() => {
    // closeDb() is idempotent, so closing every instance the suite loaded is safe.
    for (const loaded of loadedModules) {
      loaded.closeDb();
    }

    fs.rmSync(workDir, { recursive: true, force: true });
  });

  describe('insert()', () => {
    test('stores every supplied field and returns it under the schema column names', () => {
      const userId = createUser();
      const reservation = newReservation(userId, {
        id: '9d1e64a2-7b3c-4f80-9a15-2c6b8d40e7f1',
        reservationDate: '2099-02-14',
        reservationTime: '19:30',
        partySize: 4,
        status: 'cancelled',
        notes: 'Window table, please.',
        createdAt: '2099-02-01T09:15:00.000Z'
      });

      const row = repository.insert(reservation);

      // The schema's own snake_case columns, in the order the module selects them.
      expect(Object.keys(row)).toEqual(RESERVATION_COLUMNS);
      expect(row).toEqual({
        id: '9d1e64a2-7b3c-4f80-9a15-2c6b8d40e7f1',
        user_id: userId,
        reservation_date: '2099-02-14',
        reservation_time: '19:30',
        party_size: 4,
        status: 'cancelled',
        notes: 'Window table, please.',
        created_at: '2099-02-01T09:15:00.000Z'
      });

      // Read independently of the repository: the returned row is the stored one.
      expect(storedRow(row.id)).toEqual(row);
    });

    test('mints a UUIDv4 and defaults status, notes and created_at when they are omitted', () => {
      const userId = createUser();
      const row = repository.insert(newReservation(userId, { partySize: 3 }));

      expect(Object.keys(row)).toEqual(RESERVATION_COLUMNS);
      expect(row.id).toMatch(UUID_V4);
      expect(row.status).toBe('confirmed');
      expect(row.notes).toBeNull();

      // An ISO-8601 instant, not an epoch number and not a locale-formatted string.
      expect(row.created_at).toMatch(ISO_INSTANT);
      expect(new Date(row.created_at).toISOString()).toBe(row.created_at);

      // The defaults reached the table too, so what was stored is what was returned.
      expect(storedRow(row.id)).toEqual(row);
    });

    test('binds the date and time exactly as received, without reformatting them', () => {
      const userId = createUser();
      const row = repository.insert(
        newReservation(userId, { reservationDate: '2099-12-31', reservationTime: '07:05', partySize: 1 })
      );

      // A leading-zero time and a year-end date survive unchanged: neither value is
      // parsed and re-serialised, which would turn '07:05' into '7:05' or shift the
      // date across a timezone boundary.
      expect(row.reservation_date).toBe('2099-12-31');
      expect(row.reservation_time).toBe('07:05');

      const stored = storedRow(row.id);
      expect(stored.reservation_date).toBe('2099-12-31');
      expect(stored.reservation_time).toBe('07:05');
    });

    test("lets the driver's unique-constraint error through for a slot the user already holds", () => {
      const userId = createUser();
      const original = repository.insert(
        newReservation(userId, { reservationDate: '2099-04-01', reservationTime: '20:00' })
      );
      const before = countForUser(userId);

      const error = captureError(() =>
        repository.insert(
          newReservation(userId, { reservationDate: '2099-04-01', reservationTime: '20:00', partySize: 6 })
        )
      );

      // The driver's own error, neither caught nor wrapped: its prototype is the
      // driver's SqliteError class and its code is SQLite's. instanceof is not
      // asserted, because better-sqlite3's native addon is one process-wide module:
      // when another suite in the same Jest worker loaded the driver first, the error
      // carries that sandbox's Error.prototype.
      expect(error).not.toBeNull();
      expect(Object.getPrototypeOf(error).constructor.name).toBe('SqliteError');
      expect(error.code).toBe('SQLITE_CONSTRAINT_UNIQUE');
      expect(error.message).toMatch(
        /UNIQUE constraint failed: reservations\.user_id, reservations\.reservation_date, reservations\.reservation_time/
      );

      // The constraint that raised it is the table's own named one, and the failed
      // insert wrote nothing while the first booking is untouched.
      const tableSql = getDb()
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'reservations'")
        .get().sql;
      expect(tableSql).toMatch(
        /CONSTRAINT uq_reservations_user_slot\s+UNIQUE \(user_id, reservation_date, reservation_time\)/
      );
      expect(countForUser(userId)).toBe(before);
      expect(repository.findByUserAndSlot(userId, '2099-04-01', '20:00')).toEqual(original);
    });

    test('accepts the same slot for a different user', () => {
      const firstUser = createUser();
      const secondUser = createUser();
      const slot = { reservationDate: '2099-05-01', reservationTime: '21:00' };

      const first = repository.insert(newReservation(firstUser, slot));
      const second = repository.insert(newReservation(secondUser, slot));

      // The uniqueness constraint covers the (user_id, date, time) triple, so two
      // users may hold the same slot and each lookup finds only its own row.
      expect(second.id).not.toBe(first.id);
      expect(second.user_id).toBe(secondUser);
      expect(storedRow(second.id)).toEqual(second);
      expect(repository.findByUserAndSlot(firstUser, slot.reservationDate, slot.reservationTime)).toEqual(
        first
      );
      expect(repository.findByUserAndSlot(secondUser, slot.reservationDate, slot.reservationTime)).toEqual(
        second
      );
    });
  });

  describe('listByUser()', () => {
    test('returns only that user bookings, earliest first, whatever order they were stored in', () => {
      const owner = createUser();
      const otherUser = createUser();

      // Inserted out of chronological order, and the other user holds an earlier
      // date than any of the owner's: a listing that ignored the WHERE clause would
      // put that foreign row first.
      const latest = repository.insert(
        newReservation(owner, { reservationDate: '2099-07-10', reservationTime: '19:00' })
      );
      const sameDateLater = repository.insert(
        newReservation(owner, { reservationDate: '2099-07-01', reservationTime: '20:30', partySize: 4 })
      );
      const sameDateEarlier = repository.insert(
        newReservation(owner, { reservationDate: '2099-07-01', reservationTime: '17:00', partySize: 6 })
      );
      const foreign = repository.insert(
        newReservation(otherUser, { reservationDate: '2099-06-15', reservationTime: '18:00' })
      );

      const rows = repository.listByUser(owner);

      // Date first, then time: the two bookings on one date come in time order.
      expect(rows).toEqual([sameDateEarlier, sameDateLater, latest]);
      expect(rows.map((row) => row.id)).not.toContain(foreign.id);
      expect(rows.every((row) => row.user_id === owner)).toBe(true);
      expect(Object.keys(rows[0])).toEqual(RESERVATION_COLUMNS);

      // The other user's listing holds its own row alone.
      expect(repository.listByUser(otherUser)).toEqual([foreign]);
    });

    test('returns an empty array for a user who holds no booking', () => {
      const userId = createUser();

      expect(repository.listByUser(userId)).toEqual([]);
    });
  });

  describe('findByUserAndSlot()', () => {
    test('returns the matching row for that user, date and time', () => {
      const userId = createUser();
      const otherUser = createUser();
      const booking = repository.insert(
        newReservation(userId, { reservationDate: '2099-08-01', reservationTime: '18:30', partySize: 5 })
      );

      // Neighbouring slots, on the same date and by another user, must not answer
      // for the booking that was asked for.
      repository.insert(newReservation(userId, { reservationDate: '2099-08-01', reservationTime: '21:00' }));
      repository.insert(
        newReservation(otherUser, { reservationDate: '2099-08-01', reservationTime: '18:30' })
      );

      const row = repository.findByUserAndSlot(userId, '2099-08-01', '18:30');

      expect(Object.keys(row)).toEqual(RESERVATION_COLUMNS);
      expect(row).toEqual(booking);
      expect(row).toEqual(storedRow(booking.id));
    });

    test('returns null when the user holds no booking for that slot', () => {
      const userId = createUser();
      repository.insert(newReservation(userId, { reservationDate: '2099-09-01', reservationTime: '19:00' }));

      // Same date, other time; and same time, other date.
      expect(repository.findByUserAndSlot(userId, '2099-09-01', '19:30')).toBeNull();
      expect(repository.findByUserAndSlot(userId, '2099-09-02', '19:00')).toBeNull();
    });

    test('returns null when another user holds that slot', () => {
      const holder = createUser();
      const stranger = createUser();
      repository.insert(
        newReservation(holder, { reservationDate: '2099-09-10', reservationTime: '20:00' })
      );

      // Ownership is a bound parameter of the statement, so a foreign booking is not
      // selectable at all rather than filtered out afterwards.
      expect(repository.findByUserAndSlot(stranger, '2099-09-10', '20:00')).toBeNull();
      expect(repository.findByUserAndSlot(holder, '2099-09-10', '20:00')).not.toBeNull();
    });

    describe('given an argument no stored row can match', () => {
      /**
       * Values that are not the booking's own, each with the label the test title
       * uses. Every one of them is a value the driver can bind, so the statement
       * runs and answers no row.
       */
      const NON_MATCHING_VALUES = [
        ['undefined', undefined],
        ['null', null],
        ['a number', 42],
        ['an empty string', '']
      ];

      let userId;

      beforeAll(() => {
        userId = createUser();
        repository.insert(
          newReservation(userId, { reservationDate: '2099-10-01', reservationTime: '18:00' })
        );
      });

      test.each(NON_MATCHING_VALUES)('returns null for %s as the user id', (_label, value) => {
        expect(repository.findByUserAndSlot(value, '2099-10-01', '18:00')).toBeNull();
      });

      test.each(NON_MATCHING_VALUES)('returns null for %s as the date', (_label, value) => {
        expect(repository.findByUserAndSlot(userId, value, '18:00')).toBeNull();
      });

      test.each(NON_MATCHING_VALUES)('returns null for %s as the time', (_label, value) => {
        expect(repository.findByUserAndSlot(userId, '2099-10-01', value)).toBeNull();
      });

      test('returns null when it is called with no arguments at all', () => {
        expect(repository.findByUserAndSlot()).toBeNull();
      });

      test('raises the driver binding error for a value it cannot bind', () => {
        // The module returns null only when the statement runs and matches nothing.
        // A value the driver cannot bind fails before the statement does, and the
        // module passes that error through rather than answering null — the
        // behaviour its own contract documents.
        // The constructor is named rather than matched with instanceof, because the
        // driver's native addon is one process-wide module: an error it raises can
        // carry another sandbox's Error.prototype.
        const objectError = captureError(() =>
          repository.findByUserAndSlot({ id: userId }, '2099-10-01', '18:00')
        );
        expect(Object.getPrototypeOf(objectError).constructor.name).toBe('RangeError');
        expect(objectError.message).toMatch(/parameter values/i);

        const booleanError = captureError(() => repository.findByUserAndSlot(true, '2099-10-01', '18:00'));
        expect(Object.getPrototypeOf(booleanError).constructor.name).toBe('TypeError');
        expect(booleanError.message).toMatch(
          /can only bind numbers, strings, bigints, buffers, and null/
        );

        // Neither failed call matched, wrote or disturbed the booking that is there.
        expect(repository.findByUserAndSlot(userId, '2099-10-01', '18:00')).not.toBeNull();
      });
    });
  });
});

describe('insert() over a stubbed connection', () => {
  // The module's contract is that the row it answers with is the row its own
  // statement read back, so this block replaces the connection and hands back a
  // row of its own: values that differ from the arguments prove the module does
  // not rebuild the row from what it was given. The stub lives in its own
  // describe and requires the repository in an isolated module registry, so it
  // cannot reach the real-database tests above.
  afterAll(() => {
    jest.dontMock(DATABASE_MODULE);
    jest.resetModules();
  });

  test('reads the stored row back with INSERT ... RETURNING and answers it unchanged', () => {
    const userId = 'user-not-stored';
    const returned = {
      id: '9d1e64a2-7b3c-4f80-9a15-2c6b8d40e7f1',
      user_id: userId,
      reservation_date: '2099-11-01',
      reservation_time: '17:30',
      party_size: 6,
      status: 'confirmed',
      notes: 'Stored note the caller never supplied',
      created_at: '2031-03-04T05:06:07.008Z'
    };
    const get = jest.fn(() => returned);
    const prepare = jest.fn(() => ({ get }));

    jest.doMock(DATABASE_MODULE, () => ({ getDb: () => ({ prepare }) }));

    let stubbedRepository;

    jest.isolateModules(() => {
      stubbedRepository = require('../../src/repositories/reservation.repository');
    });

    const row = stubbedRepository.insert(
      newReservation(userId, { reservationDate: '2099-11-01', reservationTime: '17:30', partySize: 2 })
    );

    // The statement is the module's own insert, reading the contract columns back.
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0][0]).toMatch(/INSERT INTO reservations/);
    expect(prepare.mock.calls[0][0]).toMatch(
      new RegExp(`RETURNING ${RESERVATION_COLUMNS.join(', ')}`)
    );

    // It is executed with the values the caller supplied and the defaults the
    // module fills in for the rest, through .get() — the row is read back.
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]).toEqual([
      expect.stringMatching(UUID_V4),
      userId,
      '2099-11-01',
      '17:30',
      2,
      'confirmed',
      null,
      expect.stringMatching(ISO_INSTANT)
    ]);

    // The row the statement handed back is the answer itself: its party size, note
    // and instant all differ from the values that were bound.
    expect(row).toBe(returned);
  });
});
