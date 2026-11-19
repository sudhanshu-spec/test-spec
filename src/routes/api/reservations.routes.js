/**
 * Reservation API Routes Module
 *
 * The two endpoints of the `/api/reservations` mount point: booking a table for
 * the authenticated caller, and listing the bookings that caller already holds.
 * Each handler reads the request, calls exactly one `reservationService` method
 * and maps its result to one status and the documented JSON body. SQL, the
 * error envelope and every reservation rule live below this layer.
 *
 * Every route on this router is authenticated: `router.use(authenticate)` is the
 * router's first registration, so a path added here cannot be reached without a
 * Bearer token. Identity comes only from `req.user.id`, which the guard sets; no
 * id is read from the body, the query string or the path, so a booking held by
 * another caller is simply absent from every read rather than refused with 403.
 *
 * The six checkpoints of the reservation contract — shape, a start that is not
 * in the past, a 30-minute slot inside the service window up to the last
 * seating, the party size range, the booking range and the duplicate slot — are
 * enforced once, in src/services/reservation.service.js, and are not repeated
 * here. The five request fields are relayed to the service untouched, including
 * when they are missing or of the wrong type, and its decision — the stored
 * reservation, a `VALIDATION_ERROR` carrying the field details, or a conflict
 * for a slot the caller already holds — becomes the response, so the earliest
 * failing checkpoint is what the caller sees.
 *
 * A rejection is forwarded by Express 5 to the `/api`-scoped error handler,
 * which is the only writer of the envelope; no handler here catches one.
 *
 * Route contracts (mounted at `/api/reservations`, every route authenticated):
 * - POST '/' returns 201 {reservation} as JSON
 * - GET '/' returns 200 {reservations} as JSON
 *
 * @module src/routes/api/reservations.routes
 */

const express = require('express');

const { reservationService } = require('../../services/reservation.service');
const { authenticate } = require('../../middleware/authenticate');

const router = express.Router();

/** Guard first: no path can be added to this router without the Bearer token. */
router.use(authenticate);

/**
 * Book a table for the authenticated caller.
 *
 * The body is defaulted rather than destructured, because Express 5 leaves
 * `req.body` undefined when nothing was parsed; without the default a body-less
 * request would raise a TypeError and be answered 500 instead of 400. The five
 * fields then reach the service exactly as received and its first checkpoint
 * names whatever is missing or malformed.
 *
 * @route POST /
 * @param {import('express').Request} req - Request whose body carries the booking.
 * @param {import('express').Response} res - Response the created booking is written to.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
router.post('/', async (req, res) => {
  const body = req.body ?? {};

  const reservation = await reservationService.createReservation({
    userId: req.user.id,
    reservation_date: body.reservation_date,
    reservation_time: body.reservation_time,
    party_size: body.party_size,
    notes: body.notes
  });

  res.status(201).json({ reservation });
});

/**
 * List the reservations the authenticated caller holds.
 *
 * Only the caller's own bookings are read, ordered by date and then by time; a
 * caller who holds none receives an empty array rather than a 404.
 *
 * @route GET /
 * @param {import('express').Request} req - Request; `req.user` was set by the guard.
 * @param {import('express').Response} res - Response the list is written to.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
router.get('/', async (req, res) => {
  const reservations = await reservationService.listReservations({ userId: req.user.id });

  res.json({ reservations });
});

module.exports = router;
