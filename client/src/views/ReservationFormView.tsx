/**
 * Reservation Form View — screen 7 of the ten-screen inventory
 *
 * The booking form served at '/reservations/new'. It collects a date, a seating
 * time, a party size and an optional note, posts them through
 * `createReservation` and moves to the booking confirmation. Route protection
 * belongs to the route table, an expired session to the session provider's
 * unauthorized hook, and every reservation rule to the API, so none of the three
 * is repeated here.
 *
 * Three boundaries this file keeps:
 * - The server is authoritative. The form checks only that a value is present
 *   and well formed, so a booking the API would accept is never blocked, and the
 *   six checkpoints' verdicts arrive as `ApiError.details` and are rendered
 *   against the field each one names.
 * - The two fixed `issue` literals are read from `RESERVATION_ISSUES` and never
 *   retyped, so a translated message cannot drift from the code it explains.
 * - A booking is never priced, cancelled or edited: no money is formatted and no
 *   cancel, delete or update control exists, because the API has no such route.
 *
 * The seating time is the shared time control, sent as nothing but the `HH:MM`
 * string it holds. The booking window — the hours the restaurant seats, the
 * half-hour slots it seats on and how far ahead it takes bookings — is
 * configuration the API reads and this package cannot, so the form judges none of
 * it and refuses only a missing time or one not written as `HH:MM`. The past, the
 * window and its slot grid, the horizon, the party cap and uniqueness are the
 * API's checkpoints, and each verdict arrives in `details` rendered against the
 * field it names.
 *
 * @module client/src/views/ReservationFormView
 */

import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import type { ApiFieldDetail } from '../api/client';
import { createReservation } from '../api/reservations';
import { RESERVATION_ISSUES } from '../api/types';
import { BusyStatus, DateField, FormFeedback, NumberField, TextField, TimeField } from '../components/FormControls';

/** Smallest party the form states: the floor the stored column itself enforces. */
const MIN_PARTY_SIZE = 1;
/** Party size the form starts at, so the common case needs no edit. */
const DEFAULT_PARTY_SIZE = '2';

/** Shape of a date as the API's `reservation_date` field states it. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/**
 * Shape of a time as the API's `reservation_time` field states it: `HH:MM` on a
 * 24-hour clock, which is the pattern the server's own shape checkpoint applies.
 * The form reads it to refuse a value that checkpoint would refuse and to decide
 * nothing else: which hours the window runs between, and which minutes of an hour
 * it seats at, are rules the API applies.
 */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DATE_REQUIRED_MESSAGE = 'Choose the date of your booking.';
const DATE_INVALID_MESSAGE = 'Enter a real calendar date, for example 2031-05-14.';
const TIME_REQUIRED_MESSAGE = 'Choose a seating time.';
const PARTY_REQUIRED_MESSAGE = 'Enter the number of guests.';
const PARTY_INVALID_MESSAGE = 'Enter a whole number of guests.';
const UNEXPECTED_FAILURE_MESSAGE = 'Something went wrong while booking your table. Please try again.';
const SUBMIT_LABEL = 'Reserve a table';
/** The Reserve a table control's own label while the booking is in flight. */
const SUBMITTING_LABEL = 'Booking your table…';
/**
 * The sentence the form announces while the booking is in flight. It is deliberately
 * not the control's label: the same words twice would be announced twice — once as the
 * control's new name and once from this region — so the region says what is happening
 * to the booking rather than repeating the button.
 */
const SUBMITTING_MESSAGE = 'Sending your booking…';

/**
 * Message for a seating time the form cannot send: one not written as `HH:MM`.
 * The window and the half-hour slot grid are the server's third checkpoint, so
 * neither is named here and no time this form sends is judged by them.
 */
const TIME_INVALID_MESSAGE = 'Enter a time as HH:MM, for example 19:00.';

/**
 * Message for a booking whose date and time have already passed — the server's
 * second checkpoint, reported against `reservation_date`.
 */
const PAST_MESSAGE = 'That date and time has already passed. Choose a later date or a later seating time.';

/**
 * Fallback for the server's third checkpoint, read only when its envelope carried
 * no sentence of its own: the API states the window it enforces in that sentence,
 * which is the one place the hours are known, and this copy names none.
 */
const OUTSIDE_SERVICE_HOURS_FALLBACK = 'This time is outside the hours the restaurant serves.';

/** One field of this form that the API validates. */
type ValidatedField = 'reservation_date' | 'reservation_time' | 'party_size';

/** Inline messages, keyed by the API's own field names. */
type FieldMessages = Partial<Record<ValidatedField, string>>;

/** @returns Whether the API's field name is one this form renders an input for. */
function isValidatedField(field: string): field is ValidatedField {
  return field === 'reservation_date' || field === 'reservation_time' || field === 'party_size';
}

/** Format a Date as the local calendar date a date input and the API both expect. */
function toDateInputValue(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** @returns Whether the value is a real calendar date written as `YYYY-MM-DD`. */
function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00`);
  // Round-tripping rejects a rolled-over value such as 2031-02-30, which the
  // API's own parser refuses too.
  return !Number.isNaN(parsed.getTime()) && toDateInputValue(parsed) === value;
}

/**
 * The courtesy check for the date, applied to the value as it stands: trimmed
 * exactly as the request body is, present, and a real calendar date. Whether the
 * date is in the past, inside the horizon or already taken is not the form's to
 * judge.
 *
 * @param value - The date as typed.
 * @returns The message the field shows while the value is unusable, or
 *   undefined when the value may be sent.
 */
function dateMessage(value: string): string | undefined {
  const trimmed = value.trim();

  if (trimmed === '') {
    return DATE_REQUIRED_MESSAGE;
  }

  return isCalendarDate(trimmed) ? undefined : DATE_INVALID_MESSAGE;
}

/**
 * The courtesy check for the seating time, applied to the value as typed: a time
 * has to be present and written as `HH:MM`. Which hours the restaurant seats
 * between, and which minutes of an hour it seats at, are the API's third
 * checkpoint rather than the form's, so a time off the half-hour grid is sent
 * unchanged and the API's own verdict for that boundary is what the visitor reads.
 *
 * @param value - The seating time as typed.
 * @returns The message the field shows while the value cannot be sent, or
 *   undefined when the value may be sent.
 */
function timeMessage(value: string): string | undefined {
  if (value === '') {
    return TIME_REQUIRED_MESSAGE;
  }

  return TIME_PATTERN.test(value) ? undefined : TIME_INVALID_MESSAGE;
}

/**
 * The courtesy check for the party size: trimmed as the request body is,
 * present, and a whole number. The range the value must fall in is the server's
 * fourth checkpoint.
 *
 * @param value - The party size as typed.
 * @returns The message the field shows while the value is unusable, or
 *   undefined when the value may be sent.
 */
function partySizeMessage(value: string): string | undefined {
  const size = value.trim();

  if (size === '') {
    return PARTY_REQUIRED_MESSAGE;
  }

  return Number.isInteger(Number(size)) ? undefined : PARTY_INVALID_MESSAGE;
}

/** The courtesy rule each field of this form is held to, keyed the API's way. */
const FIELD_RULES: Record<ValidatedField, (value: string) => string | undefined> = {
  reservation_date: dateMessage,
  reservation_time: timeMessage,
  party_size: partySizeMessage,
};

/** @returns The map with the field's entry removed, or the same map when it had none. */
function withoutField(current: FieldMessages, field: ValidatedField): FieldMessages {
  if (current[field] === undefined) {
    return current;
  }
  const next = { ...current };
  delete next[field];
  return next;
}

/**
 * Re-checks a message that is already on screen against the value that replaced
 * it, so the rule a user is being shown stays visible for as long as the value
 * breaks it. A message the field kept passes through unchanged, the message is
 * dropped the moment the value satisfies the rule, and a field with no message
 * gets none — nothing is checked before the first submit.
 *
 * A sentence the server put on the field survives only while it is also what the
 * courtesy rule says about the new value: a verdict about the value that was
 * submitted cannot be re-checked here, so it is not carried over to a value it
 * was never about.
 *
 * @param current - The messages on screen.
 * @param field - The field being edited.
 * @param value - The value that replaced what the message was about.
 * @returns The messages after the re-check, or the same map when the field had
 *   no message of its own.
 */
function revisedMessages(
  current: FieldMessages,
  field: ValidatedField,
  value: string,
): FieldMessages {
  if (current[field] === undefined) {
    return current;
  }

  const message = FIELD_RULES[field](value);

  if (message === undefined) {
    return withoutField(current, field);
  }

  if (message === current[field]) {
    return current;
  }

  const next: FieldMessages = { ...current };
  next[field] = message;
  return next;
}

/**
 * The text a checkpoint's failure shows against its field.
 *
 * The two `issue` values the API fixes are translated here, in one place, and
 * compared through `RESERVATION_ISSUES`; any other issue keeps the API's own
 * sentence, so no client wording stands in for a rule the server reported. The
 * window verdict keeps the API's own sentence for the same reason: it is the one
 * place the hours and the half-hour slots the server enforces are stated, since
 * both are configuration this package cannot read.
 *
 * @param detail - The `{field, issue}` entry the API returned.
 * @param serverMessage - The API's own sentence, used for every other issue.
 * @returns The sentence to show against the field.
 */
function messageForIssue(detail: ApiFieldDetail, serverMessage: string): string {
  if (detail.issue === RESERVATION_ISSUES.DATETIME_IN_PAST) {
    return PAST_MESSAGE;
  }
  if (detail.issue === RESERVATION_ISSUES.OUTSIDE_SERVICE_HOURS) {
    return serverMessage || OUTSIDE_SERVICE_HOURS_FALLBACK;
  }
  return serverMessage;
}

/**
 * Screen 7: the reservation form.
 *
 * Four states are explicit: the initial form, which offers the way to the
 * caller's existing bookings; the populated form once values are typed; the
 * submitting state, carried by the form's `aria-busy`, one `role="status"`
 * sentence and the submit control's own `aria-busy` and in-flight label while the
 * control is disabled; and a failure state that reports each checkpoint against
 * the field it names and leaves the submit control live so the booking can be
 * retried.
 *
 * A rejection that names a field this form renders is shown inline only, so the
 * same failure is never reported twice; anything else keeps the single
 * form-level envelope message. A 401 is not handled here — the session
 * provider's unauthorized hook owns it.
 *
 * @returns The booking form.
 */
export function ReservationFormView(): JSX.Element {
  const navigate = useNavigate();
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [partySize, setPartySize] = useState(DEFAULT_PARTY_SIZE);
  const [notes, setNotes] = useState('');
  const [messages, setMessages] = useState<FieldMessages>({});
  const [summary, setSummary] = useState<ApiError | null>(null);
  const [unexpectedFailure, setUnexpectedFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // The submit guard is a ref rather than the `submitting` state: the rendered
  // `disabled` attribute only arrives with the next render, so two submits
  // dispatched in the same task would both pass a state check and post twice. The
  // ref is released on every exit — the courtesy failure and the settled request.
  const inFlight = useRef(false);
  // The one bound is arithmetic rather than configuration: a date before today
  // has already passed. It only hints the range a user should pick from — the
  // form keeps `noValidate`, so whether a booking is in the past or beyond the
  // horizon is the server's second and fifth checkpoints, and how far ahead the
  // restaurant takes bookings is a setting this package cannot read, so the
  // control carries no `max` at all.
  const today = useMemo(() => new Date(), []);
  const earliestDate = useMemo(() => toDateInputValue(today), [today]);

  /**
   * Clears the form-level failures a submit produced, for an edit no field rule
   * covers: the note is not a value the API's checkpoints judge, so nothing on
   * screen is being described by a message about it.
   */
  function clearFormFailure(): void {
    setSummary(null);
    setUnexpectedFailure(false);
  }

  /**
   * Applies a user edit to the failures on screen: the edited field's message is
   * re-checked against the new value instead of being discarded, and every
   * form-level message a submit produced is cleared. The other fields keep
   * their own, so correcting one value does not hide the rest.
   *
   * @param field - The field being edited.
   * @param value - The value it now holds.
   */
  function handleEdit(field: ValidatedField, value: string): void {
    setMessages((current) => revisedMessages(current, field, value));
    clearFormFailure();
  }

  /**
   * Renders a failed booking: the fields the API named inline, everything else
   * as the form-level message of the one error envelope.
   *
   * @param error - Whatever `createReservation` threw.
   */
  function reportFailure(error: unknown): void {
    if (!(error instanceof ApiError)) {
      setMessages({});
      setSummary(null);
      setUnexpectedFailure(true);
      return;
    }

    const inline: FieldMessages = {};
    let formLevel = error.details.length === 0 || error.code !== 'VALIDATION_ERROR';
    for (const detail of error.details) {
      if (isValidatedField(detail.field)) {
        inline[detail.field] = messageForIssue(detail, error.message);
      } else {
        // A field this form does not render would otherwise be dropped.
        formLevel = true;
      }
    }

    setMessages(inline);
    setSummary(formLevel ? error : null);
    setUnexpectedFailure(false);
  }

  /**
   * The courtesy checks and nothing else: every value present, a real calendar
   * date, a seating time written as `HH:MM`, and a whole number of guests.
   * Deliberately silent on the past, the service window and the half-hour slots it
   * seats on, the party cap, the horizon and uniqueness, which the API decides — no
   * value the API still judges is refused here, so no booking the server would
   * accept is blocked and no verdict it would give is pre-empted. The field rules
   * are the ones the same fields are re-checked against while they are edited, so a
   * message reads the same whether it arrived on submit or stayed through a
   * correction.
   *
   * @returns A message per offending field; empty when every value looks usable.
   */
  function courtesyMessages(): FieldMessages {
    const found: FieldMessages = {};
    const dateFailure = dateMessage(reservationDate);
    const timeFailure = timeMessage(reservationTime);
    const partyFailure = partySizeMessage(partySize);

    if (dateFailure !== undefined) {
      found.reservation_date = dateFailure;
    }

    if (timeFailure !== undefined) {
      found.reservation_time = timeFailure;
    }

    if (partyFailure !== undefined) {
      found.party_size = partyFailure;
    }

    return found;
  }

  /**
   * Books the table and moves to its confirmation, or renders why it was not
   * booked. One booking per submission: a second submit that arrives before the
   * first settles is dropped instead of posted.
   *
   * @param event - The form submission.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (inFlight.current) {
      return;
    }
    // Set before the first await, so the guard is in place for a second submit
    // dispatched in the same task rather than only once React has re-rendered.
    inFlight.current = true;

    const found = courtesyMessages();
    setMessages(found);
    setSummary(null);
    setUnexpectedFailure(false);

    if (Object.keys(found).length > 0) {
      inFlight.current = false;
      return;
    }

    const trimmedNotes = notes.trim();
    setSubmitting(true);
    try {
      const reservation = await createReservation({
        reservation_date: reservationDate.trim(),
        reservation_time: reservationTime,
        party_size: Number(partySize.trim()),
        ...(trimmedNotes === '' ? {} : { notes: trimmedNotes }),
      });
      navigate(`/reservations/${encodeURIComponent(reservation.id)}`, { replace: true });
    } catch (error) {
      reportFailure(error);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="stack" aria-labelledby="reservation-form-title">
      <h1 className="page-title" tabIndex={-1} id="reservation-form-title">Reserve a table</h1>
      <p className="field__hint">
        Choose a date, a seating time and the number of guests joining you. The booking window —
        the hours the restaurant seats and how far ahead it takes bookings — is the restaurant's
        own, and a date or time outside it is answered here with the reason.
      </p>

      <form className="stack" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
        <FormFeedback error={summary} message={unexpectedFailure ? UNEXPECTED_FAILURE_MESSAGE : null} />

        <DateField
          id="reservation-date"
          label="Date"
          required
          min={earliestDate}
          hint="We take bookings from today onwards; how far ahead is set by the restaurant."
          autoComplete="off"
          value={reservationDate}
          error={messages.reservation_date ?? null}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setReservationDate(event.target.value);
            handleEdit('reservation_date', event.target.value);
          }}
        />

        <TimeField
          id="reservation-time"
          label="Seating time"
          required
          hint="We seat on the half hour."
          autoComplete="off"
          value={reservationTime}
          error={messages.reservation_time ?? null}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setReservationTime(event.target.value);
            handleEdit('reservation_time', event.target.value);
          }}
        />

        <NumberField
          id="party-size"
          label="Party size"
          required
          min={MIN_PARTY_SIZE}
          value={partySize}
          error={messages.party_size ?? null}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setPartySize(event.target.value);
            handleEdit('party_size', event.target.value);
          }}
        />

        <TextField
          id="reservation-notes"
          label="Notes (optional)"
          autoComplete="off"
          value={notes}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setNotes(event.target.value);
            clearFormFailure();
          }}
        />

        <BusyStatus message={submitting ? SUBMITTING_MESSAGE : null} />

        <div className="row">
          {/*
           * The wait is stated on the control itself as well as in the status sentence
           * above it: the label says in visible text what is happening, aria-busy says
           * it to a reader that does not read the label, and disabled keeps a second
           * submit from reaching the handler.
           */}
          <button className="button" type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
          </button>
        </div>
      </form>

      <p className="field__hint">
        Already booked a table? <Link className="inline-link" to="/reservations">View your reservations</Link>
      </p>
    </section>
  );
}

export default ReservationFormView;

