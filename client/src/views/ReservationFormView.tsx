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
 * The seating slots are a fixed convenience matching the documented default
 * service window (open 17:00, close 22:00, last seating one slot earlier). They
 * are not a configuration read: whatever the server's window, it decides, and the
 * time a user picks is sent as nothing but the chosen `HH:MM` string.
 *
 * @module client/src/views/ReservationFormView
 */

import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import type { ApiFieldDetail } from '../api/client';
import { createReservation } from '../api/reservations';
import { RESERVATION_ISSUES } from '../api/types';
import { DateField, FieldError, FormMessage, NumberField, TextField } from '../components/FormControls';

/** Length of one seating slot in minutes; the API accepts times on the same step. */
const SLOT_MINUTES = 30;
/** Minutes from midnight at which the documented window opens (17:00). */
const SERVICE_OPEN_MINUTES = 17 * 60;
/** Minutes from midnight at which the documented window closes (22:00). */
const SERVICE_CLOSE_MINUTES = 22 * 60;
/** Last seating: one slot before closing, which is what the API enforces (21:30). */
const LAST_SEATING_MINUTES = SERVICE_CLOSE_MINUTES - SLOT_MINUTES;

/** Smallest party the booking form offers. */
const MIN_PARTY_SIZE = 1;
/** Largest party the booking form offers, matching the documented maximum. */
const MAX_PARTY_SIZE = 12;
/** Party size the form starts at, so the common case needs no edit. */
const DEFAULT_PARTY_SIZE = '2';

/** Shape of a date as the API's `reservation_date` field states it. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DATE_REQUIRED_MESSAGE = 'Choose the date of your booking.';
const DATE_INVALID_MESSAGE = 'Enter a real calendar date, for example 2031-05-14.';
const TIME_REQUIRED_MESSAGE = 'Choose a seating time.';
const TIME_INVALID_MESSAGE = 'Choose one of the seating times we offer.';
const PARTY_REQUIRED_MESSAGE = 'Enter the number of guests.';
const PARTY_INVALID_MESSAGE = `Enter a whole number of guests between ${MIN_PARTY_SIZE} and ${MAX_PARTY_SIZE}.`;
const UNEXPECTED_FAILURE_MESSAGE = 'Something went wrong while booking your table. Please try again.';
const SUBMIT_LABEL = 'Reserve a table';
const SUBMITTING_MESSAGE = 'Booking your table…';

/** `@returns` A minute offset from midnight rendered on the 24-hour clock as `HH:MM`. */
function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

/** Wall-clock bounds of the offered window, formatted for the messages and hints. */
const SERVICE_OPEN_TIME = formatMinutes(SERVICE_OPEN_MINUTES);
const LAST_SEATING_TIME = formatMinutes(LAST_SEATING_MINUTES);
const SERVICE_CLOSE_TIME = formatMinutes(SERVICE_CLOSE_MINUTES);

/** Every seating time the form offers: 17:00 through 21:30 in 30-minute steps. */
const SEATING_SLOTS: readonly string[] = Array.from(
    { length: (LAST_SEATING_MINUTES - SERVICE_OPEN_MINUTES) / SLOT_MINUTES + 1 },
    (_unused, index) => formatMinutes(SERVICE_OPEN_MINUTES + index * SLOT_MINUTES),
);

/**
 * Message for a booking whose date and time have already passed — the server's
 * second checkpoint, reported against `reservation_date`.
 */
const PAST_MESSAGE = 'That date and time has already passed. Choose a later date or a later seating time.';

/**
 * Message for a booking outside the service window — the server's third
 * checkpoint, reported against `reservation_time`.
 */
const OUTSIDE_SERVICE_HOURS_MESSAGE =
    'This time is outside our service hours: the service window runs from ' +
    `${SERVICE_OPEN_TIME} to ${LAST_SEATING_TIME}, with the last seating ` +
    `${SLOT_MINUTES} minutes before we close at ${SERVICE_CLOSE_TIME}.`;

/** One field of this form that the API validates. */
type ValidatedField = 'reservation_date' | 'reservation_time' | 'party_size';

/** Inline messages, keyed by the API's own field names. */
type FieldMessages = Partial<Record<ValidatedField, string>>;

/** `@returns` Whether the API's field name is one this form renders an input for. */
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

/** `@returns` Whether the value is a real calendar date written as `YYYY-MM-DD`. */
function isCalendarDate(value: string): boolean {
    if (!DATE_PATTERN.test(value)) {
        return false;
    }
    const parsed = new Date(`${value}T00:00:00`);
    // Round-tripping rejects a rolled-over value such as 2031-02-30, which the
    // API's own parser refuses too.
    return !Number.isNaN(parsed.getTime()) && toDateInputValue(parsed) === value;
}

/** `@returns` Whether the value is a whole party size the form offers. */
function isPartySize(value: number): boolean {
    return Number.isInteger(value) && value >= MIN_PARTY_SIZE && value <= MAX_PARTY_SIZE;
}

/**
 * The text a checkpoint's failure shows against its field.
 *
 * The two `issue` values the API fixes are translated here, in one place, and
 * compared through `RESERVATION_ISSUES`; any other issue keeps the API's own
 * sentence, so no client wording stands in for a rule the server reported.
 */
function messageForIssue(detail: ApiFieldDetail, serverMessage: string): string {
    if (detail.issue === RESERVATION_ISSUES.DATETIME_IN_PAST) {
        return PAST_MESSAGE;
    }
    if (detail.issue === RESERVATION_ISSUES.OUTSIDE_SERVICE_HOURS) {
        return OUTSIDE_SERVICE_HOURS_MESSAGE;
    }
    return serverMessage;
}

/** Props of the local {@link SelectField}: one field plus the options it offers. */
interface SelectFieldProps {
    id: string;
    label: string;
    options: readonly string[];
    value: string;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string | null;
    onChange(event: ChangeEvent<HTMLSelectElement>): void;
}

/**
 * Renders the seating-time select.
 *
 * `FormControls` exports the labelled inputs this form needs and no select, so
 * the one control it lacks is built here on the same markup: the shared `.field`
 * wrapper, a real `<label htmlFor>`, `.control` for the 44x44px touch target, an
 * optional hint, and the failure announced through `aria-describedby`.
 *
 * @param props - The field's label, options, value and failure.
 * @returns The labelled select field.
 */
function SelectField({ id, label, options, value, hint, required, disabled, error, onChange }: SelectFieldProps): JSX.Element {
    const hasError = Boolean(error);
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = hasError ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter((entry): entry is string => entry !== undefined).join(' ');

    return (
        <div className="field">
            <label className="field__label" htmlFor={id}>
                {label}
                {required ? <span className="visually-hidden"> (required)</span> : null}
            </label>
            <select
                id={id}
                name={id}
                className="control control--select"
                value={value}
                required={required}
                disabled={disabled}
                aria-invalid={hasError}
                aria-describedby={describedBy === '' ? undefined : describedBy}
                onChange={onChange}
            >
                <option value="">Select a time</option>
                {options.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                ))}
            </select>
            {hint ? <p className="field__hint" id={`${id}-hint`}>{hint}</p> : null}
            <FieldError id={`${id}-error`} message={error ?? null} />
        </div>
    );
}

/**
 * Screen 7: the reservation form.
 *
 * Four states are explicit: the initial form, which offers the way to the
 * caller's existing bookings; the populated form once values are typed; the
 * submitting state, announced through `role="status"` with the submit control
 * disabled; and a failure state that reports each checkpoint against the field
 * it names and leaves the submit control live so the booking can be retried.
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
    // Today comes from the browser clock at mount: it only hints the earliest
    // date a user should pick. Whether a booking is in the past is the server's
    // second checkpoint, so nothing here rejects the value.
    const earliestDate = useMemo(() => toDateInputValue(new Date()), []);

    /**
     * Drops any failure a user edit has made stale: the message of the field
     * being edited, and every form-level message.
     *
     * @param field - The field whose inline message is no longer accurate.
     */
    function clearFailure(field?: ValidatedField): void {
        if (field !== undefined) {
            setMessages((current) => {
                if (current[field] === undefined) {
                    return current;
                }
                const next = { ...current };
                delete next[field];
                return next;
            });
        }
        setSummary(null);
        setUnexpectedFailure(false);
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
     * The courtesy checks: presence, the shape of the date, one of the offered
     * slots and a whole party size in range. Deliberately silent on the past, the
     * window, the horizon and uniqueness, which the API decides.
     *
     * @returns A message per offending field; empty when every value looks usable.
     */
    function courtesyMessages(): FieldMessages {
        const found: FieldMessages = {};
        const date = reservationDate.trim();

        if (date === '') {
            found.reservation_date = DATE_REQUIRED_MESSAGE;
        } else if (!isCalendarDate(date)) {
            found.reservation_date = DATE_INVALID_MESSAGE;
        }

        if (reservationTime === '') {
            found.reservation_time = TIME_REQUIRED_MESSAGE;
        } else if (!SEATING_SLOTS.includes(reservationTime)) {
            found.reservation_time = TIME_INVALID_MESSAGE;
        }

        const size = partySize.trim();
        if (size === '') {
            found.party_size = PARTY_REQUIRED_MESSAGE;
        } else if (!isPartySize(Number(size))) {
            found.party_size = PARTY_INVALID_MESSAGE;
        }

        return found;
    }

    /**
     * Books the table and moves to its confirmation, or renders why it was not
     * booked.
     *
     * @param event - The form submission.
     */
    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();

        if (submitting) {
            return;
        }

        const found = courtesyMessages();
        setMessages(found);
        setSummary(null);
        setUnexpectedFailure(false);

        if (Object.keys(found).length > 0) {
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
            navigate(`/reservations/${reservation.id}`, { replace: true });
        } catch (error) {
            reportFailure(error);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="stack" aria-labelledby="reservation-form-title">
            <h1 className="page-title" id="reservation-form-title">Reserve a table</h1>
            <p className="field__hint">
                {`We seat ${MIN_PARTY_SIZE} to ${MAX_PARTY_SIZE} guests, from ${SERVICE_OPEN_TIME} to ${LAST_SEATING_TIME}.`}
            </p>

            <form className="stack" onSubmit={handleSubmit} noValidate>
                {unexpectedFailure ? (
                    <p className="error-summary" role="alert" data-code="INTERNAL_ERROR">
                        {UNEXPECTED_FAILURE_MESSAGE}
                    </p>
                ) : null}
                {summary ? <FormMessage error={summary} /> : null}

                <DateField
                    id="reservation-date"
                    label="Date"
                    required
                    min={earliestDate}
                    autoComplete="off"
                    value={reservationDate}
                    error={messages.reservation_date ?? null}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        setReservationDate(event.target.value);
                        clearFailure('reservation_date');
                    }}
                />

                <SelectField
                    id="reservation-time"
                    label="Seating time"
                    required
                    hint={`Seatings run from ${SERVICE_OPEN_TIME} to ${LAST_SEATING_TIME}.`}
                    options={SEATING_SLOTS}
                    value={reservationTime}
                    error={messages.reservation_time ?? null}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                        setReservationTime(event.target.value);
                        clearFailure('reservation_time');
                    }}
                />

                <NumberField
                    id="party-size"
                    label="Party size"
                    required
                    min={MIN_PARTY_SIZE}
                    max={MAX_PARTY_SIZE}
                    value={partySize}
                    error={messages.party_size ?? null}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        setPartySize(event.target.value);
                        clearFailure('party_size');
                    }}
                />

                <TextField
                    id="reservation-notes"
                    label="Notes (optional)"
                    autoComplete="off"
                    value={notes}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        setNotes(event.target.value);
                        clearFailure();
                    }}
                />

                {submitting ? <p className="field__hint" role="status">{SUBMITTING_MESSAGE}</p> : null}

                <div className="row">
                    <button className="button" type="submit" disabled={submitting}>
                        {SUBMIT_LABEL}
                    </button>
                </div>
            </form>

            <p className="field__hint">
                Already booked a table? <Link to="/reservations">View your reservations</Link>
            </p>
        </section>
    );
}

export default ReservationFormView;

