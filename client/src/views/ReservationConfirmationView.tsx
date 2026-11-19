/**
 * @fileoverview Reservation confirmation and history view — screen 8 of the
 * ten-screen inventory.
 *
 * One component in two modes, chosen by the route it is mounted on:
 * - `/reservations/:id` carries a route parameter, so the view confirms that
 *   single booking.
 * - `/reservations` carries none, so the view lists every booking the caller
 *   holds, in the date-then-time order the API returned them in.
 *
 * The API exposes no single-reservation read, so both modes make exactly one
 * call to `listReservations()` and confirmation mode selects the requested id
 * out of the caller's own list. That selection is also how the user-scoped read
 * rule is honoured on this side: the list only ever holds the caller's bookings,
 * so an id that is absent from it — another account's booking or a stale link —
 * renders the same not-found message, with no client-side ownership check and
 * nothing to distinguish the two cases.
 *
 * The date, the seating time and the `created_at` instant all reach the screen
 * through `client/src/api/format`, so the two stored wall-clock values and the
 * timestamp are presented in one set of formats and nothing here formats one for
 * itself.
 *
 * Four states are rendered explicitly: loading, populated, empty (no bookings,
 * or a booking not in the list) and failure. Every failure is reported as the
 * transport's `ApiError` and by its `code` alone; the session provider owns the
 * 401 redirect, so nothing here reacts to an expired token.
 *
 * Deliberately absent: `fetch`, any route guard or redirect, `Layout`, money
 * formatting (a reservation carries no price), and any cancellation or editing
 * affordance — the reservation surface has no such endpoint.
 *
 * @module client/src/views/ReservationConfirmationView
 */

import { useCallback, useEffect, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { formatCalendarDate, formatClockTime, formatStatusLabel, formatTimestamp } from '../api/format';
import { listReservations } from '../api/reservations';
import type { Reservation } from '../api/types';

/** Reported when a failure arrives as something other than an `ApiError`. */
const LOAD_FAILURE_MESSAGE = 'Your reservations could not be loaded.';

/** The id the page heading carries, so the section's landmark name points at it. */
const HEADING_ID = 'reservation-view-title';

/** The view's four states, kept apart so each one is rendered from its own branch. */
type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; reservations: Reservation[] }
  | { status: 'failed'; error: ApiError };

/**
 * @param error - Whatever a failed request threw.
 * @returns The failure as the client's one error type, so a view never carries a second shape.
 */
function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(LOAD_FAILURE_MESSAGE, 0, 'INTERNAL_ERROR');
}

/**
 * Maps a reservation status onto the badge classes that exist. The API fixes no
 * status vocabulary for reservations, so an unlisted value keeps the neutral
 * badge instead of losing its styling: the status text is always rendered, and
 * colour is never the only thing carrying it.
 *
 * @param status - The status string exactly as the API returned it.
 * @returns The `className` for the status badge.
 */
function statusBadgeClass(status: string): string {
  if (status === 'confirmed') {
    return 'badge badge--available';
  }

  if (status === 'cancelled') {
    return 'badge badge--unavailable';
  }

  return 'badge';
}

/** Props of the internal {@link DetailRow}. */
interface DetailRowProps {
  /** Visible label for the value beside it. */
  label: string;
  /** The value itself, rendered as text so it wraps at the narrowest width. */
  children: ReactNode;
}

/**
 * Renders one label/value line of a booking. The row contributes its label and
 * value cells to the `.detail-list` grid its list declares, so every value in one
 * list — the confirmation's and each history card's alike — begins at the same
 * left edge, and a value too wide for the remaining space wraps instead of
 * widening the card at the narrowest supported width.
 *
 * @param props - The label and the value to show.
 * @returns The row element.
 */
function DetailRow({ label, children }: DetailRowProps): JSX.Element {
  return (
    <p className="detail-row">
      <span className="field__label">{label}</span>
      <span>{children}</span>
    </p>
  );
}

/** Props of the internal {@link ReservationSection}. */
interface ReservationSectionProps {
  /** Page heading text for the mode being rendered. */
  title: string;
  /** The state rendered below the heading. */
  children: ReactNode;
}

/**
 * Wraps every state in the same named section and single `<h1>`, so loading,
 * failure and both populated modes share one landmark instead of each inventing
 * its own heading level.
 *
 * @param props - The heading text and the state to render under it.
 * @returns The section element for the current state.
 */
function ReservationSection({ title, children }: ReservationSectionProps): JSX.Element {
  return (
    <section className="stack" aria-labelledby={HEADING_ID}>
      <h1 className="page-title" id={HEADING_ID}>
        {title}
      </h1>
      {children}
    </section>
  );
}

/** Props of the internal {@link ReservationHistory}. */
interface ReservationHistoryProps {
  /** The caller's bookings, in the order the API returned them. */
  reservations: Reservation[];
}

/**
 * Renders the caller's booking history at `/reservations`, preserving the
 * server's date-then-time order rather than re-sorting it. Each entry links to
 * its own confirmation, which is how single-booking mode is reachable from here.
 *
 * The "Book a table" action that opens the booking form is rendered above the
 * list in this state as it is in the empty one, so a returning customer reaches
 * the form without having to retype its URL.
 *
 * @param props - The bookings to list, possibly none.
 * @returns The history section, or the empty state when there are no bookings.
 */
function ReservationHistory({ reservations }: ReservationHistoryProps): JSX.Element {
  if (reservations.length === 0) {
    return (
      <ReservationSection title="Your reservations">
        <div className="empty-state stack">
          <p>You have not booked a table yet.</p>
          <p>
            <Link className="button" to="/reservations/new">
              Book a table
            </Link>
          </p>
        </div>
      </ReservationSection>
    );
  }

  return (
    <ReservationSection title="Your reservations">
      <div className="stack">
        <div className="row">
          <Link className="button" to="/reservations/new">
            Book a table
          </Link>
        </div>
        {reservations.map((reservation) => (
          <article className="card stack" key={reservation.id}>
            <div className="detail-list">
              <DetailRow label="Date">
                <time dateTime={reservation.reservation_date}>
                  {formatCalendarDate(reservation.reservation_date)}
                </time>
              </DetailRow>
              <DetailRow label="Time">
                <time dateTime={reservation.reservation_time}>
                  {formatClockTime(reservation.reservation_time)}
                </time>
              </DetailRow>
              <DetailRow label="Party size">{reservation.party_size}</DetailRow>
              <DetailRow label="Status">
                <span className={statusBadgeClass(reservation.status)}>

                  {formatStatusLabel(reservation.status)}

                </span>
              </DetailRow>
              {reservation.notes ? <DetailRow label="Notes">{reservation.notes}</DetailRow> : null}
            </div>
            <div className="row">
              <Link className="button button--secondary" to={`/reservations/${reservation.id}`}>
                {`View booking for ${formatCalendarDate(reservation.reservation_date)}`}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </ReservationSection>
  );
}

/**
 * Renders screen 8: the confirmation of one booking at `/reservations/:id`, or
 * the caller's booking history at `/reservations`.
 *
 * @returns The reservation section for the current route and request state.
 */
export function ReservationConfirmationView(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    // One read per mode. The ignore flag keeps a late response from a route
    // the user already left from overwriting the state of the next one.
    let ignore = false;
    setState({ status: 'loading' });

    listReservations()
      .then((reservations) => {
        if (!ignore) {
          setState({ status: 'ready', reservations });
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setState({ status: 'failed', error: toApiError(error) });
        }
      });

    return () => {
      ignore = true;
    };
  }, [id, reloadCount]);

  const retry = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  const confirming = id !== undefined;
  const title = confirming ? 'Your booking' : 'Your reservations';

  if (state.status === 'loading') {
    return (
      <ReservationSection title={title}>
        <p className="empty-state" role="status">
          {confirming ? 'Loading your booking…' : 'Loading your reservations…'}
        </p>
      </ReservationSection>
    );
  }

  if (state.status === 'failed') {
    return (
      <ReservationSection title={title}>
        <div className="error-summary stack" role="alert" data-code={state.error.code}>
          <p>{state.error.message || LOAD_FAILURE_MESSAGE}</p>
          <p>Error code: {state.error.code}</p>
        </div>
        <div className="row">
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
          <Link className="button button--secondary" to="/menu">
            Back to the menu
          </Link>
        </div>
      </ReservationSection>
    );
  }

  if (id === undefined) {
    return <ReservationHistory reservations={state.reservations} />;
  }

  const reservation = state.reservations.find((entry) => entry.id === id);

  if (reservation === undefined) {
    return (
      <ReservationSection title={title}>
        <div className="not-found">
          <p>We could not find that booking among your reservations.</p>
          <Link className="button" to="/reservations">
            See all your bookings
          </Link>
        </div>
      </ReservationSection>
    );
  }

  return (
    <ReservationSection title={title}>
      <div className="card stack">
        <div className="detail-list">
          <DetailRow label="Date">
            <time dateTime={reservation.reservation_date}>
              {formatCalendarDate(reservation.reservation_date)}
            </time>
          </DetailRow>
          <DetailRow label="Time">
            <time dateTime={reservation.reservation_time}>
              {formatClockTime(reservation.reservation_time)}
            </time>
          </DetailRow>
          <DetailRow label="Party size">{reservation.party_size}</DetailRow>
          <DetailRow label="Status">
            <span className={statusBadgeClass(reservation.status)}>

              {formatStatusLabel(reservation.status)}

            </span>
          </DetailRow>
          {reservation.notes ? <DetailRow label="Notes">{reservation.notes}</DetailRow> : null}
          <DetailRow label="Booked on">
            <time dateTime={reservation.created_at}>{formatTimestamp(reservation.created_at)}</time>
          </DetailRow>
        </div>
        <div className="row">
          <Link className="button" to="/reservations">
            See all your bookings
          </Link>
          <Link className="button button--secondary" to="/menu">
            Back to the menu
          </Link>
        </div>
      </div>
    </ReservationSection>
  );
}

export default ReservationConfirmationView;
