/**
 * @fileoverview Unit tests for the reservation service
 * (src/services/reservation.service.js). Every case builds the service over a
 * stubbed reservation repository with a fixed injected clock, so no database, no
 * HTTP request and no port is involved. What is pinned here is the six
 * checkpoints in the order the service runs them — shape, past datetime, service
 * window and 30-minute slots, party size, horizon, duplicate slot — the first
 * failure deciding the response of a request that breaks several of them, the
 * service window's 17:00 opening, 21:30 last seating and 22:00 closing
 * boundaries, the success path's stored row and public projection, and the
 * per-user listing.
 * @module tests/unit/reservation.service
 */

'use strict';

// The wired singleton is built over the real reservation repository, which
// reaches src/db and loads the native SQLite driver as soon as this suite
// requires it. Replacing the connection module keeps a pure unit suite free of
// that driver — and of any chance of a database file — while the repository
// object the singleton holds stays the real one.
jest.mock('../../src/db', () => ({ getDb: jest.fn(), closeDb: jest.fn() }));

const { AppError, RESERVATION_ISSUES } = require('../../src/errors');
const {
  createReservationService,
  reservationService,
  toPublicReservation
} = require('../../src/services/reservation.service');

/**
 * The four settings the checkpoints read, at the defaults src/config/index.js
 * carries, written out literally so the window boundaries below are the
 * contract's and not the config module's.
 *
 * @type {Object}
 */
const CONFIG = Object.freeze({
  serviceOpenTime: '17:00',
  serviceCloseTime: '22:00',
  maxPartySize: 12,
  reservationHorizonDays: 90
});

/**
 * The instant the injected clock stands still at: local noon on a fixed date, so
 * every slot of that day from 17:00 on is still ahead of the clock and the
 * window cases never depend on when the suite runs.
 *
 * @type {Date}
 */
const NOW = new Date(2026, 4, 12, 12, 0, 0, 0);

/** The caller every case books for, taken from the authenticated request. @type {string} */
const USER_ID = 'user-7c1e4a';

/** The keys the API returns for a reservation, sorted for comparison. @type {string[]} */
const RESERVATION_KEYS = [
  'created_at',
  'id',
  'notes',
  'party_size',
  'reservation_date',
  'reservation_time',
  'status'
];

/** The keys the service hands the repository to insert, sorted for comparison. @type {string[]} */
const STORED_ROW_KEYS = [
  'createdAt',
  'id',
  'notes',
  'partySize',
  'reservationDate',
  'reservationTime',
  'status',
  'userId'
];

/** Shape of the identifier the service generates for a booking: a version-4 UUID. @type {RegExp} */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Format a date's local calendar day as the contract's YYYY-MM-DD.
 *
 * @param {Date} date - Date to format.
 * @returns {string} The date as YYYY-MM-DD.
 */
function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The contract date a whole number of calendar days from the fixed clock, built
 * in local time so the suite reads the same under any timezone.
 *
 * @param {number} days - Days to add; negative for a date before the clock.
 * @returns {string} That day as YYYY-MM-DD.
 */
function dayFromNow(days) {
  return isoDate(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + days));
}

/**
 * A clock stopped at a given local time on the fixed date.
 *
 * @param {number} hours - Local hour the clock reports.
 * @param {number} minutes - Local minute the clock reports.
 * @returns {function(): Date} The clock the service reads `now()` from.
 */
function clockAt(hours, minutes) {
  const at = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), hours, minutes, 0, 0);

  return () => new Date(at.getTime());
}

/**
 * A request that passes every checkpoint, so one field can be replaced to aim a
 * case at a single checkpoint.
 *
 * @param {Object} [overrides] - Fields to replace.
 * @returns {Object} The request the service is called with.
 */
function validRequest(overrides = {}) {
  return {
    userId: USER_ID,
    reservation_date: dayFromNow(1),
    reservation_time: '18:00',
    party_size: 2,
    ...overrides
  };
}

/**
 * A stored row shaped as reservation.repository returns it, carrying the columns
 * the API never exposes so the projection is proven rather than assumed.
 *
 * @param {Object} [overrides] - Columns to replace.
 * @returns {Object} Stored reservation row.
 */
function storedRow(overrides = {}) {
  return {
    id: 'res-1f4c',
    user_id: USER_ID,
    reservation_date: dayFromNow(1),
    reservation_time: '18:00',
    party_size: 2,
    status: 'confirmed',
    notes: null,
    created_at: NOW.toISOString(),
    ...overrides
  };
}

/**
 * The row reservation.repository answers insert() with, derived from the argument
 * the service handed it: the repository reads back the row its statement wrote,
 * so the stub returns the written values under the table's column names.
 *
 * @param {Object} row - The argument the service passed to insert().
 * @returns {Object} The stored row, as the repository returns it.
 */
function insertedRow(row) {
  return storedRow({
    id: row.id,
    user_id: row.userId,
    reservation_date: row.reservationDate,
    reservation_time: row.reservationTime,
    party_size: row.partySize,
    status: row.status,
    notes: row.notes,
    created_at: row.createdAt
  });
}

/**
 * Build a stubbed reservation repository, so every collaborator call can be
 * asserted and nothing reaches a database.
 *
 * @param {Object} [options] - Stub outcomes.
 * @param {function} [options.findByUserAndSlot] - Row the slot lookup returns.
 * @param {function} [options.listByUser] - Rows the listing returns.
 * @param {function} [options.insert] - Row the insert returns.
 * @returns {Object} The stubbed repository.
 */
function stubRepository({
  findByUserAndSlot = () => null,
  listByUser = () => [],
  insert = insertedRow
} = {}) {
  return {
    findByUserAndSlot: jest.fn(findByUserAndSlot),
    listByUser: jest.fn(listByUser),
    insert: jest.fn(insert)
  };
}

/**
 * Build the service over a stubbed repository and a fixed clock.
 *
 * @param {Object} [options] - Stub outcomes and collaborators.
 * @param {Object} [options.config] - Settings the checkpoints read.
 * @param {function} [options.now] - Injected clock.
 * @param {function} [options.findByUserAndSlot] - Row the slot lookup returns.
 * @param {function} [options.listByUser] - Rows the listing returns.
 * @param {function} [options.insert] - Row the insert returns.
 * @returns {{service: Object, reservations: Object}} The service and its stubs.
 */
function buildService({ config = CONFIG, now = clockAt(12, 0), ...stubs } = {}) {
  const reservations = stubRepository(stubs);

  return { service: createReservationService({ reservations, config, now }), reservations };
}

/**
 * Invoke a call that is expected to fail and return the error it raised.
 *
 * @param {Function} invoke - Call expected to throw.
 * @returns {Error} The error the call raised.
 * @throws {Error} When the call returns instead of throwing.
 */
function captureError(invoke) {
  try {
    invoke();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the call to raise an AppError, but it returned a value');
}

/**
 * The shape checkpoint's rejections: the field that is wrong, the issue the
 * failure names and the request field that produces it.
 *
 * @type {Array<{case: string, overrides: Object, field: string, issue: string}>}
 */
const SHAPE_CASES = [
  {
    case: 'a request with no reservation_date',
    overrides: { reservation_date: undefined },
    field: 'reservation_date',
    issue: 'required'
  },
  {
    case: 'a null reservation_date',
    overrides: { reservation_date: null },
    field: 'reservation_date',
    issue: 'required'
  },
  {
    case: 'an empty reservation_date',
    overrides: { reservation_date: '' },
    field: 'reservation_date',
    issue: 'required'
  },
  {
    case: 'a whitespace-only reservation_date',
    overrides: { reservation_date: '   ' },
    field: 'reservation_date',
    issue: 'required'
  },
  {
    case: 'a date without separators',
    overrides: { reservation_date: '20260513' },
    field: 'reservation_date',
    issue: 'invalid_date_format'
  },
  {
    case: 'a date in day-month-year order',
    overrides: { reservation_date: '13-05-2026' },
    field: 'reservation_date',
    issue: 'invalid_date_format'
  },
  {
    case: 'a date carrying a time',
    overrides: { reservation_date: '2026-05-13T18:00' },
    field: 'reservation_date',
    issue: 'invalid_date_format'
  },
  {
    case: 'an impossible calendar date',
    overrides: { reservation_date: '2026-02-30' },
    field: 'reservation_date',
    issue: 'invalid_date_format'
  },
  {
    case: 'a date that is not a string',
    overrides: { reservation_date: 20260513 },
    field: 'reservation_date',
    issue: 'invalid_date_format'
  },
  {
    case: 'a request with no reservation_time',
    overrides: { reservation_time: undefined },
    field: 'reservation_time',
    issue: 'required'
  },
  {
    case: 'a null reservation_time',
    overrides: { reservation_time: null },
    field: 'reservation_time',
    issue: 'required'
  },
  {
    case: 'a whitespace-only reservation_time',
    overrides: { reservation_time: '  ' },
    field: 'reservation_time',
    issue: 'required'
  },
  {
    case: 'an hour written with one digit',
    overrides: { reservation_time: '9:00' },
    field: 'reservation_time',
    issue: 'invalid_time_format'
  },
  {
    case: 'an hour past the 24-hour clock',
    overrides: { reservation_time: '25:00' },
    field: 'reservation_time',
    issue: 'invalid_time_format'
  },
  {
    case: 'a minute past the end of the hour',
    overrides: { reservation_time: '18:60' },
    field: 'reservation_time',
    issue: 'invalid_time_format'
  },
  {
    case: 'a time carrying seconds',
    overrides: { reservation_time: '18:00:00' },
    field: 'reservation_time',
    issue: 'invalid_time_format'
  },
  {
    case: 'a time that is not a string',
    overrides: { reservation_time: 1800 },
    field: 'reservation_time',
    issue: 'invalid_time_format'
  },
  {
    case: 'a request with no party_size',
    overrides: { party_size: undefined },
    field: 'party_size',
    issue: 'invalid_party_size'
  },
  {
    case: 'a null party_size',
    overrides: { party_size: null },
    field: 'party_size',
    issue: 'invalid_party_size'
  },
  {
    case: 'a party size written as text',
    overrides: { party_size: '4' },
    field: 'party_size',
    issue: 'invalid_party_size'
  },
  {
    case: 'a fractional party size',
    overrides: { party_size: 4.5 },
    field: 'party_size',
    issue: 'invalid_party_size'
  }
];

describe('Reservation service - reservation.service.js', () => {
  test('exports the factory, the wired singleton and the public projection', () => {
    expect(typeof createReservationService).toBe('function');
    expect(typeof toPublicReservation).toBe('function');
    expect(Object.keys(reservationService).sort()).toEqual([
      'createReservation',
      'listReservations'
    ]);
  });

  test('wires the singleton to exactly the two operations the router calls', () => {
    // The singleton is bound to the real repository, so it is inspected here and
    // never called: calling it would open the database.
    expect(reservationService).toBeDefined();
    expect(typeof reservationService.createReservation).toBe('function');
    expect(typeof reservationService.listReservations).toBe('function');
  });

  describe('checkpoint 1 - the shape and format of the request', () => {
    test.each(SHAPE_CASES)('rejects $case', ({ overrides, field, issue }) => {
      const { service, reservations } = buildService();

      const error = captureError(() => service.createReservation(validRequest(overrides)));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.details).toEqual([{ field, issue }]);
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);
      // A shape failure is decided before any repository is consulted.
      expect(reservations.findByUserAndSlot).not.toHaveBeenCalled();
      expect(reservations.insert).not.toHaveBeenCalled();
    });

    test('collects one detail per invalid field in the order the fields are declared', () => {
      const { service } = buildService();

      const error = captureError(() =>
        service.createReservation({
          userId: USER_ID,
          reservation_date: 'nope',
          reservation_time: 'evening',
          party_size: 'two'
        })
      );

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual([
        { field: 'reservation_date', issue: 'invalid_date_format' },
        { field: 'reservation_time', issue: 'invalid_time_format' },
        { field: 'party_size', issue: 'invalid_party_size' }
      ]);
      expect(error.details.map((detail) => detail.field)).toEqual([
        'reservation_date',
        'reservation_time',
        'party_size'
      ]);
    });

    test('names only the fields that are invalid', () => {
      const { service } = buildService();

      const error = captureError(() =>
        service.createReservation(validRequest({ reservation_date: '', party_size: 2.5 }))
      );

      expect(error.details).toEqual([
        { field: 'reservation_date', issue: 'required' },
        { field: 'party_size', issue: 'invalid_party_size' }
      ]);
    });

    test('tells a blank field from a malformed one in the same request', () => {
      const { service } = buildService();

      const error = captureError(() =>
        service.createReservation(validRequest({ reservation_date: '   ', reservation_time: '18:5' }))
      );

      expect(error.details).toEqual([
        { field: 'reservation_date', issue: 'required' },
        { field: 'reservation_time', issue: 'invalid_time_format' }
      ]);
    });
  });

  describe('checkpoint 2 - a datetime already in the past', () => {
    test('rejects a slot one minute before the injected clock', () => {
      const { service, reservations } = buildService();

      const error = captureError(() =>
        service.createReservation(
          validRequest({ reservation_date: dayFromNow(0), reservation_time: '11:59' })
        )
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.details).toEqual([
        { field: 'reservation_date', issue: RESERVATION_ISSUES.DATETIME_IN_PAST }
      ]);
      expect(reservations.findByUserAndSlot).not.toHaveBeenCalled();
      expect(reservations.insert).not.toHaveBeenCalled();
    });

    test('rejects a slot of the current day that the clock has already passed', () => {
      const { service } = buildService({ now: clockAt(19, 0) });

      const error = captureError(() =>
        service.createReservation(
          validRequest({ reservation_date: dayFromNow(0), reservation_time: '18:00' })
        )
      );

      expect(error.details).toEqual([
        { field: 'reservation_date', issue: RESERVATION_ISSUES.DATETIME_IN_PAST }
      ]);
    });

    test('rejects yesterday even at a slot inside the window', () => {
      const { service, reservations } = buildService();

      const error = captureError(() =>
        service.createReservation(
          validRequest({ reservation_date: dayFromNow(-1), reservation_time: '21:30' })
        )
      );

      expect(error.details).toEqual([
        { field: 'reservation_date', issue: RESERVATION_ISSUES.DATETIME_IN_PAST }
      ]);
      expect(reservations.insert).not.toHaveBeenCalled();
    });

    test('accepts a slot exactly at the clock, which is not yet in the past', () => {
      const { service, reservations } = buildService({ now: clockAt(19, 0) });

      const created = service.createReservation(
        validRequest({ reservation_date: dayFromNow(0), reservation_time: '19:00' })
      );

      expect(reservations.insert).toHaveBeenCalledTimes(1);
      expect(created.reservation_time).toBe('19:00');
    });

    test('names the past-datetime issue string the API contract fixes', () => {
      expect(RESERVATION_ISSUES.DATETIME_IN_PAST).toBe('reservation_datetime_in_past');
    });
  });

  describe('checkpoint 3 - the service window and the 30-minute slots', () => {
    test.each([
      ['16:59', 'one minute before the window opens'],
      ['21:31', 'one minute past the last seating'],
      ['18:15', 'a time that is not on a 30-minute slot'],
      ['22:00', 'the closing time itself']
    ])('rejects %s, %s', (reservationTime) => {
      const { service, reservations } = buildService();

      const error = captureError(() =>
        service.createReservation(validRequest({ reservation_time: reservationTime }))
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.details).toEqual([
        { field: 'reservation_time', issue: RESERVATION_ISSUES.TIME_OUTSIDE_SERVICE_HOURS }
      ]);
      expect(reservations.insert).not.toHaveBeenCalled();
    });

    test.each([
      ['17:00', 'the opening time'],
      ['21:30', 'the last seating, one slot before closing']
    ])('accepts %s, %s', (reservationTime) => {
      const { service, reservations } = buildService();

      const created = service.createReservation(
        validRequest({ reservation_time: reservationTime })
      );

      expect(reservations.insert).toHaveBeenCalledTimes(1);
      expect(created.reservation_time).toBe(reservationTime);
      expect(created.status).toBe('confirmed');
    });

    test('moves the last seating with the configured closing time', () => {
      const config = { ...CONFIG, serviceCloseTime: '20:00' };

      const lastSeating = buildService({ config });
      const created = lastSeating.service.createReservation(
        validRequest({ reservation_time: '19:30' })
      );
      expect(created.reservation_time).toBe('19:30');

      const pastLastSeating = buildService({ config });
      const error = captureError(() =>
        pastLastSeating.service.createReservation(validRequest({ reservation_time: '19:31' }))
      );
      expect(error.details).toEqual([
        { field: 'reservation_time', issue: RESERVATION_ISSUES.TIME_OUTSIDE_SERVICE_HOURS }
      ]);

      const atClosing = buildService({ config });
      const closingError = captureError(() =>
        atClosing.service.createReservation(validRequest({ reservation_time: '20:00' }))
      );
      expect(closingError.details).toEqual([
        { field: 'reservation_time', issue: RESERVATION_ISSUES.TIME_OUTSIDE_SERVICE_HOURS }
      ]);
    });

    test.each([
      ['serviceOpenTime', '5pm'],
      ['serviceCloseTime', '22-00']
    ])('rejects every time when %s is not a clock time', (setting, value) => {
      const { service, reservations } = buildService({ config: { ...CONFIG, [setting]: value } });

      const error = captureError(() =>
        service.createReservation(validRequest({ reservation_time: '18:00' }))
      );

      expect(error.details).toEqual([
        { field: 'reservation_time', issue: RESERVATION_ISSUES.TIME_OUTSIDE_SERVICE_HOURS }
      ]);
      expect(reservations.insert).not.toHaveBeenCalled();
    });

    test('names the service-window issue string the API contract fixes', () => {
      expect(RESERVATION_ISSUES.TIME_OUTSIDE_SERVICE_HOURS).toBe(
        'reservation_time_outside_service_hours'
      );
    });
  });

  describe('checkpoint 4 - the party size range', () => {
    test.each([
      [0, 'no diner at all'],
      [13, 'one more than the maximum'],
      [-1, 'a negative party size']
    ])('rejects a party size of %i (%s) with out_of_range', (partySize) => {
      const { service, reservations } = buildService();

      const error = captureError(() =>
        service.createReservation(validRequest({ party_size: partySize }))
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.details).toEqual([{ field: 'party_size', issue: 'out_of_range' }]);
      expect(reservations.insert).not.toHaveBeenCalled();
    });

    test.each([
      [1, 'the smallest party'],
      [12, 'the largest party the maximum admits']
    ])('accepts a party size of %i (%s)', (partySize) => {
      const { service, reservations } = buildService();

      const created = service.createReservation(validRequest({ party_size: partySize }));

      expect(reservations.insert).toHaveBeenCalledTimes(1);
      expect(created.party_size).toBe(partySize);
    });

    test('rejects a non-integer party size at the shape checkpoint, above the range', () => {
      // '4' is not an integer, so checkpoint 1 answers with invalid_party_size and
      // the range checkpoint never sees it; the same request with the number 4 is
      // accepted. The two differ on purpose.
      const asText = buildService();
      const error = captureError(() =>
        asText.service.createReservation(validRequest({ party_size: '4' }))
      );
      expect(error.details).toEqual([{ field: 'party_size', issue: 'invalid_party_size' }]);
      expect(asText.reservations.insert).not.toHaveBeenCalled();

      const asNumber = buildService();
      const created = asNumber.service.createReservation(validRequest({ party_size: 4 }));
      expect(created.party_size).toBe(4);
    });

    test('honours a configured maximum', () => {
      const config = { ...CONFIG, maxPartySize: 6 };

      const accepted = buildService({ config });
      expect(accepted.service.createReservation(validRequest({ party_size: 6 })).party_size).toBe(6);

      const rejected = buildService({ config });
      const error = captureError(() =>
        rejected.service.createReservation(validRequest({ party_size: 7 }))
      );
      expect(error.details).toEqual([{ field: 'party_size', issue: 'out_of_range' }]);
      expect(error.message).toContain('6');
    });

    test('caps a configured maximum above the stored column bound at that bound', () => {
      // The configuration refuses a maximum above the schema ceiling when it is
      // read, and this checkpoint bounds the party by that ceiling for whatever
      // configuration it is handed: 20 behaves as 12, so the message agrees.
      const config = { ...CONFIG, maxPartySize: 20 };

      const accepted = buildService({ config });
      expect(accepted.service.createReservation(validRequest({ party_size: 12 })).party_size).toBe(12);

      const rejected = buildService({ config });
      const error = captureError(() =>
        rejected.service.createReservation(validRequest({ party_size: 13 }))
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.details).toEqual([{ field: 'party_size', issue: 'out_of_range' }]);
      expect(error.message).toBe('The party size must be between 1 and 12.');
      expect(rejected.reservations.insert).not.toHaveBeenCalled();
    });
  });

  describe('checkpoint 5 - the reservation horizon', () => {
    test('accepts a date exactly the configured days ahead', () => {
      const { service, reservations } = buildService();

      const created = service.createReservation(validRequest({ reservation_date: dayFromNow(90) }));

      expect(reservations.insert).toHaveBeenCalledTimes(1);
      expect(created.reservation_date).toBe(dayFromNow(90));
    });

    test('rejects a date one day beyond the horizon', () => {
      const { service, reservations } = buildService();

      const error = captureError(() =>
        service.createReservation(validRequest({ reservation_date: dayFromNow(91) }))
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.details).toEqual([
        { field: 'reservation_date', issue: 'outside_reservation_horizon' }
      ]);
      expect(reservations.findByUserAndSlot).not.toHaveBeenCalled();
      expect(reservations.insert).not.toHaveBeenCalled();
    });

    test('counts calendar days, so a late clock does not shorten the horizon', () => {
      const { service, reservations } = buildService({ now: clockAt(23, 59) });

      const created = service.createReservation(validRequest({ reservation_date: dayFromNow(90) }));

      expect(created.reservation_date).toBe(dayFromNow(90));
      expect(reservations.insert).toHaveBeenCalledTimes(1);
    });

    test('honours a configured horizon', () => {
      const config = { ...CONFIG, reservationHorizonDays: 7 };

      const accepted = buildService({ config });
      expect(
        accepted.service.createReservation(validRequest({ reservation_date: dayFromNow(7) }))
          .reservation_date
      ).toBe(dayFromNow(7));

      const rejected = buildService({ config });
      const error = captureError(() =>
        rejected.service.createReservation(validRequest({ reservation_date: dayFromNow(8) }))
      );
      expect(error.details).toEqual([
        { field: 'reservation_date', issue: 'outside_reservation_horizon' }
      ]);
    });
  });

  describe('the order the checkpoints run in', () => {
    test('reports the shape before the past datetime', () => {
      const { service } = buildService();

      const error = captureError(() =>
        service.createReservation({
          userId: USER_ID,
          reservation_date: '2026-02-30',
          reservation_time: '11:59',
          party_size: 2
        })
      );

      expect(error.details).toEqual([
        { field: 'reservation_date', issue: 'invalid_date_format' }
      ]);
    });

    test('reports the past datetime before the service window', () => {
      const { service } = buildService();

      const error = captureError(() =>
        service.createReservation(
          validRequest({ reservation_date: dayFromNow(-1), reservation_time: '16:59' })
        )
      );

      expect(error.details).toEqual([
        { field: 'reservation_date', issue: RESERVATION_ISSUES.DATETIME_IN_PAST }
      ]);
    });

    test('reports the service window before the party size', () => {
      const { service } = buildService();

      const error = captureError(() =>
        service.createReservation(validRequest({ reservation_time: '16:59', party_size: 13 }))
      );

      expect(error.details).toEqual([
        { field: 'reservation_time', issue: RESERVATION_ISSUES.TIME_OUTSIDE_SERVICE_HOURS }
      ]);
    });

    test('reports the party size before the horizon', () => {
      const { service } = buildService();

      const error = captureError(() =>
        service.createReservation(validRequest({ reservation_date: dayFromNow(400), party_size: 13 }))
      );

      expect(error.details).toEqual([{ field: 'party_size', issue: 'out_of_range' }]);
    });

    test('reports the horizon before the duplicate slot', () => {
      const { service, reservations } = buildService({ findByUserAndSlot: () => storedRow() });

      const error = captureError(() =>
        service.createReservation(validRequest({ reservation_date: dayFromNow(400) }))
      );

      expect(error.details).toEqual([
        { field: 'reservation_date', issue: 'outside_reservation_horizon' }
      ]);
      expect(reservations.findByUserAndSlot).not.toHaveBeenCalled();
    });
  });

  describe('checkpoint 6 - the slot the caller already holds', () => {
    test('raises RESERVATION_CONFLICT when the caller holds that slot', () => {
      const { service, reservations } = buildService({ findByUserAndSlot: () => storedRow() });

      const error = captureError(() => service.createReservation(validRequest()));

      expect(reservations.findByUserAndSlot).toHaveBeenCalledWith(USER_ID, dayFromNow(1), '18:00');
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('RESERVATION_CONFLICT');
      expect(error.status).toBe(409);
      expect(error.details).toBeUndefined();
      expect(reservations.insert).not.toHaveBeenCalled();
    });

    test('maps the uniqueness violation the insert raises to the same conflict', () => {
      const violation = Object.assign(
        new Error(
          'UNIQUE constraint failed: reservations.user_id, reservations.reservation_date, reservations.reservation_time'
        ),
        { code: 'SQLITE_CONSTRAINT_UNIQUE' }
      );
      const { service } = buildService({
        insert: () => {
          throw violation;
        }
      });

      const error = captureError(() => service.createReservation(validRequest()));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('RESERVATION_CONFLICT');
      expect(error.status).toBe(409);
      expect(error.details).toBeUndefined();
      expect(error).not.toBe(violation);
    });

    test('maps a unique-constraint message carrying no code to the same conflict', () => {
      const { service } = buildService({
        insert: () => {
          throw new Error(
            'UNIQUE constraint failed: reservations.user_id, reservations.reservation_date, reservations.reservation_time'
          );
        }
      });

      const error = captureError(() => service.createReservation(validRequest()));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('RESERVATION_CONFLICT');
      expect(error.status).toBe(409);
    });

    test('rethrows any other insert failure untouched', () => {
      const failure = new Error('database is locked');
      const { service } = buildService({
        insert: () => {
          throw failure;
        }
      });

      expect(captureError(() => service.createReservation(validRequest()))).toBe(failure);
    });

    test('rethrows a constraint failure on another table untouched', () => {
      const failure = new Error('UNIQUE constraint failed: orders.id');
      const { service } = buildService({
        insert: () => {
          throw failure;
        }
      });

      expect(captureError(() => service.createReservation(validRequest()))).toBe(failure);
    });

    test('rethrows a thrown value that is not an object untouched', () => {
      const { service } = buildService({
        insert: () => {
          throw 'disk I/O error';
        }
      });

      expect(captureError(() => service.createReservation(validRequest()))).toBe('disk I/O error');
    });
  });

  describe('createReservation - the booking it stores', () => {
    test('stores the row the repository contract names and answers with the public shape', () => {
      const { service, reservations } = buildService();

      const created = service.createReservation(validRequest({ notes: '  Window seat  ' }));

      expect(reservations.insert).toHaveBeenCalledTimes(1);
      const stored = reservations.insert.mock.calls[0][0];
      expect(Object.keys(stored).sort()).toEqual(STORED_ROW_KEYS);
      expect(stored).toEqual({
        id: expect.stringMatching(UUID_PATTERN),
        userId: USER_ID,
        reservationDate: dayFromNow(1),
        reservationTime: '18:00',
        partySize: 2,
        status: 'confirmed',
        createdAt: NOW.toISOString(),
        notes: '  Window seat  '
      });
      expect(created).toEqual({
        id: stored.id,
        reservation_date: dayFromNow(1),
        reservation_time: '18:00',
        party_size: 2,
        status: 'confirmed',
        notes: '  Window seat  ',
        created_at: NOW.toISOString()
      });
      expect(Object.keys(created).sort()).toEqual(RESERVATION_KEYS);
    });

    test('answers with the row the repository read back rather than the request it wrote', () => {
      // The insert answers with the stored row, so a value storage supplies — the
      // note and the instant here — is what the response carries, not the request.
      const readBack = storedRow({
        id: 'res-read-back',
        notes: 'Stored note the request never carried',
        created_at: '2030-01-01T00:00:00.000Z'
      });
      const { service } = buildService({ insert: () => readBack });

      const created = service.createReservation(validRequest({ notes: 'Window seat' }));

      expect(created).toEqual(toPublicReservation(readBack));
      expect(created.id).toBe('res-read-back');
      expect(created.notes).toBe('Stored note the request never carried');
      expect(created.created_at).toBe('2030-01-01T00:00:00.000Z');
      expect(Object.keys(created).sort()).toEqual(RESERVATION_KEYS);
    });

    test('gives every booking a version-4 UUID of its own', () => {
      const { service, reservations } = buildService();

      const first = service.createReservation(validRequest());
      const second = service.createReservation(validRequest());
      const [firstStored, secondStored] = reservations.insert.mock.calls.map((call) => call[0]);

      expect(firstStored.id).toMatch(UUID_PATTERN);
      expect(secondStored.id).toMatch(UUID_PATTERN);
      expect(first.id).toBe(firstStored.id);
      expect(second.id).toBe(secondStored.id);
      expect(first.id).not.toBe(second.id);
    });

    test.each([
      ['no notes at all', undefined],
      ['notes that are null', null]
    ])('stores null notes for %s', (_case, notes) => {
      const { service, reservations } = buildService();

      const created = service.createReservation(validRequest({ notes }));

      expect(reservations.insert.mock.calls[0][0].notes).toBeNull();
      expect(created.notes).toBeNull();
    });

    test.each([
      ['notes that are an object', { a: 1 }],
      ['notes that are an array', ['a', 'b']],
      ['notes that are a number', 42],
      ['notes that are a boolean', true]
    ])('stores null notes for %s', (_case, notes) => {
      const readBack = storedRow({ id: 'res-no-note', notes: null });
      const { service, reservations } = buildService({ insert: () => readBack });

      const created = service.createReservation(validRequest({ notes }));

      expect(reservations.insert.mock.calls[0][0].notes).toBeNull();
      expect(created).toEqual(toPublicReservation(readBack));
      expect(created.notes).toBeNull();
      expect(created.id).toBe('res-no-note');
    });

    test('reads the slot before inserting it, and never the listing', () => {
      const { service, reservations } = buildService();

      service.createReservation(validRequest());

      expect(reservations.findByUserAndSlot).toHaveBeenCalledWith(USER_ID, dayFromNow(1), '18:00');
      expect(reservations.listByUser).not.toHaveBeenCalled();
    });

    test('books against the real clock when no clock is injected', () => {
      // Built without `now`, so the service falls back to its own default clock;
      // the date is taken from that same clock, one day ahead of it.
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservations = stubRepository();
      const service = createReservationService({ reservations, config: CONFIG });

      const created = service.createReservation(
        validRequest({ reservation_date: isoDate(tomorrow), reservation_time: '18:00' })
      );

      expect(reservations.insert).toHaveBeenCalledTimes(1);
      expect(new Date(created.created_at).toISOString()).toBe(created.created_at);
      expect(new Date(created.created_at).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('listReservations', () => {
    test('projects every stored row and keeps the order the repository returns', () => {
      const sooner = storedRow({
        id: 'res-sooner',
        reservation_date: dayFromNow(2),
        reservation_time: '18:30'
      });
      const later = storedRow({
        id: 'res-later',
        reservation_date: dayFromNow(9),
        reservation_time: '20:00',
        party_size: 4,
        notes: 'Window seat'
      });
      const { service, reservations } = buildService({ listByUser: () => [sooner, later] });

      const listed = service.listReservations({ userId: USER_ID });

      expect(reservations.listByUser).toHaveBeenCalledTimes(1);
      expect(reservations.listByUser).toHaveBeenCalledWith(USER_ID);
      expect(listed.map((reservation) => reservation.id)).toEqual(['res-sooner', 'res-later']);
      expect(listed).toEqual([
        {
          id: 'res-sooner',
          reservation_date: dayFromNow(2),
          reservation_time: '18:30',
          party_size: 2,
          status: 'confirmed',
          notes: null,
          created_at: NOW.toISOString()
        },
        {
          id: 'res-later',
          reservation_date: dayFromNow(9),
          reservation_time: '20:00',
          party_size: 4,
          status: 'confirmed',
          notes: 'Window seat',
          created_at: NOW.toISOString()
        }
      ]);
      expect(Object.keys(listed[0]).sort()).toEqual(RESERVATION_KEYS);
      expect(JSON.stringify(listed)).not.toMatch(/user_id/);
      expect(reservations.insert).not.toHaveBeenCalled();
    });

    test('is empty, not an error, for a caller holding no reservation', () => {
      const { service } = buildService({ listByUser: () => [] });

      expect(service.listReservations({ userId: USER_ID })).toEqual([]);
    });

    test('asks the repository for the caller it is given', () => {
      const { service, reservations } = buildService();

      service.listReservations({ userId: 'user-someone-else' });

      expect(reservations.listByUser).toHaveBeenCalledWith('user-someone-else');
    });
  });

  describe('toPublicReservation', () => {
    test('names exactly the contract keys, dropping the owner', () => {
      const row = storedRow();

      const projected = toPublicReservation(row);

      expect(Object.keys(projected).sort()).toEqual(RESERVATION_KEYS);
      expect(JSON.stringify(projected)).not.toMatch(/user_id/);
      expect(projected).not.toBe(row);
    });

    test.each([
      ['a booking with no note', { status: 'confirmed', notes: null }],
      ['a booking carrying a note', { status: 'confirmed', notes: 'Window seat' }]
    ])('passes status and notes through for %s', (_case, fields) => {
      const projected = toPublicReservation(storedRow(fields));

      expect(projected.status).toBe(fields.status);
      expect(projected.notes).toBe(fields.notes);
    });

    test('copies the exposed columns through unchanged', () => {
      const row = storedRow({
        id: 'res-9',
        reservation_date: '2026-06-01',
        reservation_time: '19:30',
        party_size: 5,
        created_at: '2026-05-12T12:00:00.000Z'
      });

      expect(toPublicReservation(row)).toEqual({
        id: 'res-9',
        reservation_date: '2026-06-01',
        reservation_time: '19:30',
        party_size: 5,
        status: 'confirmed',
        notes: null,
        created_at: '2026-05-12T12:00:00.000Z'
      });
    });
  });
});
