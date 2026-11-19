/**
 * Reservation API Module
 *
 * The client's two reservation calls: booking a table for the signed-in caller,
 * and listing the bookings that caller already holds. Authentication belongs to
 * the transport — `client.ts` attaches the session's Bearer token to every
 * request — so nothing here reads a token, sends a user id, or filters by owner:
 * the API scopes both endpoints to the authenticated caller, and this module
 * relays exactly what it answers for that caller.
 *
 * The request body is relayed verbatim. `reservation_date` (`YYYY-MM-DD`),
 * `reservation_time` (`HH:MM`) and `party_size` travel as the form supplies
 * them, no status or user id is added, no slot is computed, and no note is
 * invented when none was given. Validation is server-side only, in the
 * reservation service's six checkpoints; a rejection arrives as an `ApiError`
 * whose `details` carry the API's own `field`/`issue` pairs, and it is rethrown
 * untouched so `ReservationFormView` can compare each `issue` against
 * `RESERVATION_ISSUES` and report the checkpoint that refused the booking. The
 * two fixed `issue` strings live in that constant and in nowhere else, so none
 * is repeated here. Nothing in this module validates, formats, re-sorts,
 * lowercases or re-words anything.
 *
 * Endpoints (both authenticated, both below the `/api/reservations` mount):
 * - POST '/reservations' with {reservation_date, reservation_time, party_size, notes?}
 *   returns 201 {reservation}
 * - GET '/reservations' returns 200 {reservations}, ordered by date then time
 *
 * The API exposes no single-reservation read: there is no GET
 * /reservations/:id, and the reservation surface has no editing or removal
 * route either. `ReservationConfirmationView` therefore selects the requested
 * id from `listReservations()`.
 *
 * @module client/src/api/reservations
 */

import { apiFetch } from './client';
import type {
  CreateReservationInput,
  Reservation,
  ReservationResponse,
  ReservationsResponse,
} from './types';

/**
 * Books a table for the authenticated caller.
 *
 * Only the four contract fields are sent: the date, the time, the party size
 * and a note when the form supplied one. No amount is computed and no identity
 * is sent, because the API prices nothing on a booking and takes the caller from
 * the token alone.
 *
 * @param input - The booking as the form holds it; `reservation_date` is
 *   `YYYY-MM-DD`, `reservation_time` is `HH:MM`, and `notes` is optional.
 * @returns The stored reservation, exactly as the API reported it.
 * @throws {ApiError} `VALIDATION_ERROR` (status 400) when one of the six
 *   checkpoints refuses the booking; its `details` name the offending field, and
 *   the two checkpoints with a fixed `issue` report a value matching
 *   `RESERVATION_ISSUES.DATETIME_IN_PAST` or
 *   `RESERVATION_ISSUES.OUTSIDE_SERVICE_HOURS`. `RESERVATION_CONFLICT` (status
 *   409) when the caller already holds this date and time. `TOKEN_REQUIRED`,
 *   `TOKEN_INVALID` or `TOKEN_EXPIRED` (status 401) when the session is missing,
 *   revoked or past its lifetime.
 */
export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const body = {
    reservation_date: input.reservation_date,
    reservation_time: input.reservation_time,
    party_size: input.party_size,
    ...(input.notes === undefined ? {} : { notes: input.notes }),
  };

  const { reservation } = await apiFetch<ReservationResponse>('/reservations', {
    method: 'POST',
    body,
  });

  return reservation;
}

/**
 * Lists the reservations the authenticated caller holds.
 *
 * `GET /api/reservations` reads only the caller's own bookings and answers an
 * empty array when there are none, so no absence handling is needed beyond
 * rendering the empty list. The server's date-then-time order is preserved: a
 * client-side re-sort would put the list back out of the order the API promised.
 *
 * @returns The caller's reservations in the API's order, possibly empty.
 * @throws {ApiError} `TOKEN_REQUIRED`, `TOKEN_INVALID` or `TOKEN_EXPIRED`
 *   (status 401) when the session is missing, revoked or past its lifetime, and
 *   `INTERNAL_ERROR` (status 500) for any failure the API could not attribute.
 */
export async function listReservations(): Promise<Reservation[]> {
  const { reservations } = await apiFetch<ReservationsResponse>('/reservations');

  return reservations;
}
