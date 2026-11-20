/**
 * @fileoverview The `reservations` table accessor — insert, listByUser and
 * findByUserAndSlot, and nothing else: it stores one booking, lists the
 * bookings one user holds in date-then-time order, and answers whether that
 * user already holds a given slot.
 *
 * This module owns SQL and row shapes only. The six validation checkpoints, the
 * service-window and horizon arithmetic against an injected clock, and the
 * mapping of a duplicate slot to RESERVATION_CONFLICT all belong to
 * src/services/reservation.service.js, which is the only consumer; no router
 * requires this module.
 *
 * It raises no domain error of its own: a failure leaves as either a SQLite
 * error passed through untouched or a programming error. A duplicate booking is
 * one of those pass-throughs — the table's uq_reservations_user_slot constraint,
 * UNIQUE (user_id, reservation_date, reservation_time), raises
 * SQLITE_CONSTRAINT_UNIQUE and the caller inspects that error to decide between
 * a conflict and a stored row, so nothing here catches, wraps or rewrites it.
 *
 * @module src/repositories/reservation.repository
 */

const { randomUUID } = require('node:crypto');
const { getDb } = require('../db');

/**
 * The contract columns, in schema order. Named once so both read statements
 * below return one identical row shape and a column added to the table cannot
 * reach a caller by accident.
 *
 * @type {string}
 */
const COLUMNS = [
  'id',
  'user_id',
  'reservation_date',
  'reservation_time',
  'party_size',
  'status',
  'notes',
  'created_at'
].join(', ');

/**
 * Status a booking is stored with when the caller supplies none. The column's
 * own default, repeated here because the insert binds every value explicitly.
 *
 * @type {string}
 */
const DEFAULT_STATUS = 'confirmed';

/**
 * Store one booking.
 *
 * `reservationDate` and `reservationTime` are bound exactly as received: the
 * caller has already validated them as YYYY-MM-DD and HH:MM, so they are never
 * parsed, reformatted or timezone-converted here. The row the statement wrote is
 * read back by that same statement through `RETURNING`, so the value a caller
 * projects is the stored row: it cannot disagree with a column default or with
 * the type the column applied. A duplicate booking for the same user, date and
 * time is left to raise SQLITE_CONSTRAINT_UNIQUE so the caller can recognise it.
 *
 * @param {Object} reservation - The booking to store.
 * @param {string} [reservation.id] - Booking identifier; a fresh UUID when omitted.
 * @param {string} reservation.userId - Owner, taken from the authenticated caller.
 * @param {string} reservation.reservationDate - Booking date, YYYY-MM-DD.
 * @param {string} reservation.reservationTime - Booking time, HH:MM.
 * @param {number} reservation.partySize - Number of diners.
 * @param {string} [reservation.status] - Booking status; 'confirmed' when omitted.
 * @param {string|null} [reservation.notes] - Free-text note; null when omitted.
 * @param {string} [reservation.createdAt] - ISO-8601 creation time; now when omitted.
 * @returns {Object} The row as stored, read back by the statement that wrote it.
 * @throws {Error} The SQLite error raised by the statement, unwrapped — notably
 *   SQLITE_CONSTRAINT_UNIQUE for a slot the same user already holds.
 */
function insert(reservation) {
  const {
    id = randomUUID(),
    userId,
    reservationDate,
    reservationTime,
    partySize,
    status = DEFAULT_STATUS,
    notes = null,
    createdAt = new Date().toISOString()
  } = reservation;

  return getDb()
    .prepare(
      `INSERT INTO reservations
        (id, user_id, reservation_date, reservation_time, party_size, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING ${COLUMNS}`
    )
    .get(id, userId, reservationDate, reservationTime, partySize, status, notes, createdAt);
}

/**
 * List the bookings one user holds, earliest booking first.
 *
 * Ownership is a bound parameter of the WHERE clause, so a row belonging to
 * another user is not selectable at all rather than filtered out afterwards.
 * `reservation_date` and `reservation_time` are stored as YYYY-MM-DD and HH:MM
 * text, so their ascending order is chronological.
 *
 * @param {string} userId - Owner whose bookings are listed.
 * @returns {Object[]} The user's bookings in date-then-time order; an empty
 *   array when the user holds none.
 */
function listByUser(userId) {
  return getDb()
    .prepare(
      `SELECT ${COLUMNS} FROM reservations
        WHERE user_id = ?
        ORDER BY reservation_date ASC, reservation_time ASC`
    )
    .all(userId);
}

/**
 * Find the booking one user holds for a given date and time.
 *
 * The slot is scoped to the user in SQL, because the uniqueness constraint is
 * on the (user_id, reservation_date, reservation_time) triple: two different
 * users may hold the same date and time. Every status counts as taken, which is
 * what keeps a later insert from failing on the constraint.
 *
 * @param {string} userId - Owner the lookup is scoped to.
 * @param {string} reservationDate - Booking date, YYYY-MM-DD.
 * @param {string} reservationTime - Booking time, HH:MM.
 * @returns {Object|null} The matching row, or null when the user holds no
 *   booking for that slot.
 */
function findByUserAndSlot(userId, reservationDate, reservationTime) {
  const row = getDb()
    .prepare(
      `SELECT ${COLUMNS} FROM reservations
        WHERE user_id = ? AND reservation_date = ? AND reservation_time = ?`
    )
    .get(userId, reservationDate, reservationTime);

  return row === undefined ? null : row;
}

module.exports = { insert, listByUser, findByUserAndSlot };
