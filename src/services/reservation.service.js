/**
 * Reservation Service Module
 *
 * The table-booking rules, isolated from HTTP: the six checkpoints a booking
 * passes in the order the API contract states — shape, not in the past, a
 * 30-minute slot inside the service window at or before the last seating, the
 * party size range, the horizon, uniqueness and persistence — and the projection
 * of the stored row a booking answers with. The first failing checkpoint decides
 * the response, and times compare in the server's local timezone on slots
 * counted in minutes from midnight.
 *
 * @module src/services/reservation.service
 */

const crypto = require('node:crypto');
const { AppError, RESERVATION_ISSUES } = require('../errors');

/** Length of a reservable slot, in minutes. @type {number} */
const SLOT_MINUTES = 30;
/** Milliseconds in one day, used to count the horizon in calendar days. @type {number} */
const MS_PER_DAY = 86400000;
/** Largest party size stored: mirrors the reservations CHECK (party_size BETWEEN 1 AND 12). @type {number} */
const MAX_STORED_PARTY_SIZE = 12;
/** Shape of a reservation date: YYYY-MM-DD. @type {RegExp} */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Shape of a reservation time: HH:MM on a 24-hour clock. @type {RegExp} */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Messages of the fixed failures this service raises. @type {Object<string, string>} */
const MESSAGES = Object.freeze({
  past: 'The reservation date and time must not be in the past.',
  duplicate: 'You already hold a reservation for that date and time.'
});

/** `true` when a value carries no text at all. */
function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/** Parse a YYYY-MM-DD string; an impossible date such as 2025-02-30 is rejected, never rolled over. */
function parseDateParts(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map((part) => parseInt(part, 10));
  const probe = new Date(year, month - 1, day);
  const isRealDate = probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day;
  return isRealDate ? { year, month, day } : null;
}

/** Parse an HH:MM string into its parts and its offset from midnight. */
function parseTimeParts(value) {
  const match = typeof value === 'string' ? TIME_PATTERN.exec(value) : null;
  if (match === null) {
    return null;
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return { hours, minutes, totalMinutes: hours * 60 + minutes };
}

/** Build the datetime a booking starts at, in the server's local timezone. */
function toLocalDateTime({ year, month, day }, { hours, minutes }) {
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/** Count whole calendar days between two dates, flattening both to their UTC date. */
function calendarDaysBetween(fromDate, toDate) {
  const from = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const to = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.round((to - from) / MS_PER_DAY);
}

/** Recognise the constraint violation a duplicate slot raises; the same conflict as an existing check. */
function isDuplicateSlot(err) {
  const isObject = err !== null && typeof err === 'object';
  return isObject &&
    (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed: reservations/.test(String(err.message)));
}

/** Throw a VALIDATION_ERROR carrying one field detail; the code names a key of the errors table. */
function failValidation(field, issue, message) {
  throw new AppError('VALIDATION_ERROR', message, [{ field, issue }]);
}

/**
 * Project a stored reservation into the shape the API returns, listing the keys
 * so no other column reaches a response; a caller never sees another's booking.
 * @param {Object} row - Stored reservation, in the contract's key names.
 * @returns {Object} `{id, reservation_date, reservation_time, party_size, status, notes, created_at}`.
 */
function toPublicReservation(row) {
  return {
    id: row.id, reservation_date: row.reservation_date, reservation_time: row.reservation_time,
    party_size: row.party_size, status: row.status, notes: row.notes, created_at: row.created_at
  };
}

/**
 * Build a reservation service over injected dependencies: the reservation
 * repository, the settings the checkpoints read and the clock they read.
 * @param {{reservations: Object, config: Object, now: (function(): Date|undefined)}} deps - Collaborators.
 * @returns {{createReservation: Function, listReservations: Function}} The service.
 */
function createReservationService({ reservations, config, now = () => new Date() }) {
  /**
   * Book one table for the authenticated caller, running the six checkpoints in
   * order and storing the booking when all of them pass.
   * @param {Object} input - `{userId, reservation_date, reservation_time, party_size, notes}`.
   *   A `notes` value that is not a string is stored as null.
   * @returns {Object} The row the repository stored, in the public shape.
   * @throws {AppError} VALIDATION_ERROR, or RESERVATION_CONFLICT for a slot the caller already holds.
   */
  function createReservation({ userId, reservation_date, reservation_time, party_size, notes }) {
    const dateParts = parseDateParts(reservation_date);
    const timeParts = parseTimeParts(reservation_time);
    const dateIssue = isBlank(reservation_date) ? 'required' : 'invalid_date_format';
    const timeIssue = isBlank(reservation_time) ? 'required' : 'invalid_time_format';
    const details = [
      dateParts === null && { field: 'reservation_date', issue: dateIssue },
      timeParts === null && { field: 'reservation_time', issue: timeIssue },
      !Number.isInteger(party_size) && { field: 'party_size', issue: 'invalid_party_size' }
    ].filter(Boolean);

    if (details.length > 0) {
      throw new AppError('VALIDATION_ERROR', 'The reservation request is not valid.', details);
    }

    const requestedStart = toLocalDateTime(dateParts, timeParts);
    const currentInstant = now();
    if (requestedStart.getTime() < currentInstant.getTime()) {
      failValidation('reservation_date', RESERVATION_ISSUES.DATETIME_IN_PAST, MESSAGES.past);
    }

    // Last seating is one slot before the configured close; an unparsable configured time closes the window.
    const openTime = parseTimeParts(config.serviceOpenTime);
    const closeTime = parseTimeParts(config.serviceCloseTime);
    const minutes = timeParts.totalMinutes;
    const onSlot = minutes % SLOT_MINUTES === 0;
    const inWindow = openTime !== null && closeTime !== null &&
      minutes >= openTime.totalMinutes && minutes <= closeTime.totalMinutes - SLOT_MINUTES;
    if (!onSlot || !inWindow) {
      failValidation('reservation_time', RESERVATION_ISSUES.TIME_OUTSIDE_SERVICE_HOURS,
        `The reservation time is outside the service hours: we seat from ${config.serviceOpenTime} to `
        + `${config.serviceCloseTime}, with the last seating ${SLOT_MINUTES} minutes before we close.`);
    }
    const partyLimit = Math.min(config.maxPartySize, MAX_STORED_PARTY_SIZE);
    if (party_size < 1 || party_size > partyLimit) {
      failValidation('party_size', 'out_of_range', `The party size must be between 1 and ${partyLimit}.`);
    }
    if (calendarDaysBetween(currentInstant, requestedStart) > config.reservationHorizonDays) {
      failValidation('reservation_date', 'outside_reservation_horizon',
        `The reservation date is more than ${config.reservationHorizonDays} days ahead of today.`);
    }
    if (reservations.findByUserAndSlot(userId, reservation_date, reservation_time)) {
      throw new AppError('RESERVATION_CONFLICT', MESSAGES.duplicate);
    }

    const row = {
      id: crypto.randomUUID(), userId, reservationDate: reservation_date, reservationTime: reservation_time,
      partySize: party_size, status: 'confirmed', createdAt: now().toISOString(),
      // A note is free text: a non-string stores no note at all, exactly as the order path does.
      notes: typeof notes === 'string' ? notes : null
    };
    let stored;
    try {
      stored = reservations.insert(row);
    } catch (err) {
      if (!isDuplicateSlot(err)) {
        throw err;
      }
      throw new AppError('RESERVATION_CONFLICT', MESSAGES.duplicate);
    }

    return toPublicReservation(stored);
  }

  /**
   * List the reservations the authenticated caller holds, in the repository's
   * earliest-first order.
   */
  function listReservations({ userId }) {
    return reservations.listByUser(userId).map(toPublicReservation);
  }

  return { createReservation, listReservations };
}

/**
 * The reservation service over the real repository, settings and clock; it opens no connection until first use.
 * @type {{createReservation: Function, listReservations: Function}}
 */
const reservationService = createReservationService({
  reservations: require('../repositories/reservation.repository'),
  config: require('../config'),
  now: () => new Date()
});

module.exports = { createReservationService, reservationService, toPublicReservation };
