/**
 * @fileoverview Field-level validation rendering on the four forms that take
 * input — the client-side proof of the one error envelope (rule R-6).
 *
 * The API answers every failure with ``{"error": {"code", "message",
 * "details"}}`` and `details` appears only for a validation failure, one
 * `{field, issue}` entry per offending value. This suite drives `LoginView`,
 * `RegisterView`, the checkout step of `CartView` and `ReservationFormView`
 * against that envelope, stubbing the single transport seam (`fetch`) so a
 * failure is produced without a server, and asserts *where* each message lands:
 *
 * - beside the control the entry names, reached through the label → input →
 *   `aria-describedby` chain rather than through the document at large;
 * - at form level, as exactly one alert, for the failures that name no field —
 *   `INVALID_CREDENTIALS`, `RESERVATION_CONFLICT`, `MENU_ITEM_UNAVAILABLE` and
 *   anything outside the vocabulary;
 * - and never as the other kind, which is what stops an indistinguishable
 *   sign-in failure from leaking which half of the credential was wrong;
 * - and, for the shared feedback primitives, that a field message is inserted
 *   into a polite region that is already on the pristine form and that the
 *   form-level region holds one alert whichever way a failure reached it.
 *
 * Two further contracts are asserted from the request bodies the views build:
 * a cart line carries a menu item id and a quantity and no amount, because the
 * server prices the order from stored menu data (rule R-3), and a reservation
 * carries its date, time, party size and optional note and no owner, because
 * the caller is the session's Bearer token and never a body field (rule R-5).
 *
 * The suite stubs `fetch` and nothing else: no supertest, no mock server and no
 * browser automation (rule R-7), and no import from the CommonJS root package,
 * whose Express tier is frozen (rules R-1 and R-2).
 *
 * @module client/src/__tests__/form-validation.test
 */

import { useEffect, useRef } from 'react';
import type { JSX, ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api/client';
import type { ApiErrorCode, ApiFieldDetail } from '../api/client';
import { RESERVATION_ISSUES } from '../api/types';
import type { ErrorEnvelope, MenuItem, Order, Reservation, User } from '../api/types';
import { FormFeedback } from '../components/FormControls';
import { CartProvider, useCart } from '../state/cart';
import { SessionProvider, TOKEN_STORAGE_KEY } from '../state/session';
import { CartView } from '../views/CartView';
import { LoginView } from '../views/LoginView';
import { RegisterView } from '../views/RegisterView';
import { ReservationFormView } from '../views/ReservationFormView';

// ---------------------------------------------------------------------------
// Text the views render
//
// Copied verbatim from the module under test, so an assertion proves the
// visible sentence rather than merely that some paragraph exists. A view that
// rewords one of these fails here until the assertion is updated with it.
// ---------------------------------------------------------------------------

const LOGIN_EMAIL_REQUIRED_MESSAGE = 'Enter your email address.';
const LOGIN_EMAIL_INVALID_MESSAGE = 'Enter an email address such as name@example.com.';
const LOGIN_PASSWORD_REQUIRED_MESSAGE = 'Enter your password.';
/** The retry sentence the sign-in form offers while a field is highlighted. */
const LOGIN_RETRY_MESSAGE = 'Check the highlighted fields, then submit the form again to retry.';

const REGISTER_NAME_REQUIRED_MESSAGE = 'Enter your name.';
const REGISTER_EMAIL_REQUIRED_MESSAGE = 'Enter your email address.';
const REGISTER_PASSWORD_REQUIRED_MESSAGE = 'Choose a password.';
const REGISTER_PASSWORD_TOO_SHORT_MESSAGE = 'Use at least 8 characters.';
const REGISTER_PASSWORD_TOO_LONG_MESSAGE =
  'Use a shorter password: 72 bytes is the maximum, and accented letters and emoji count as several each.';
const REGISTER_EMAIL_DUPLICATE_MESSAGE =
  'An account already uses this email address. Sign in instead of registering again.';

const RESERVATION_DATE_REQUIRED_MESSAGE = 'Choose the date of your booking.';
const RESERVATION_DATE_INVALID_MESSAGE = 'Enter a real calendar date, for example 2031-05-14.';
/** The hint the shared date control carries: the window it bounds belongs to the restaurant. */
const RESERVATION_DATE_HINT =
  'We take bookings from today onwards; how far ahead is set by the restaurant.';
const RESERVATION_TIME_REQUIRED_MESSAGE = 'Choose a seating time.';
/** The hint the shared time control carries. */
const RESERVATION_TIME_HINT = 'We seat on the half hour.';
/** The form's sentence for a seating time that is not written as `HH:MM`. */
const RESERVATION_TIME_INVALID_MESSAGE = 'Enter a time as HH:MM, for example 19:00.';
const RESERVATION_PARTY_REQUIRED_MESSAGE = 'Enter the number of guests.';
const RESERVATION_PARTY_INVALID_MESSAGE = 'Enter a whole number of guests.';
/** The sentence the booking form announces while its submit is in flight. */
const RESERVATION_SUBMITTING_MESSAGE = 'Sending your booking…';
/**
 * The submit control's own label while the booking is in flight: the same moment in
 * visible text, stated on the control rather than only in the status region.
 */
const RESERVATION_SUBMITTING_LABEL = 'Booking your table…';
/**
 * The sentence the API sends beside `party_size` when its fourth checkpoint — a
 * range this client does not own — refuses the value.
 */
const RESERVATION_PARTY_OUT_OF_RANGE_MESSAGE = 'The party size must be between 1 and 12.';
/** The form's reading of `RESERVATION_ISSUES.DATETIME_IN_PAST`. */
const RESERVATION_PAST_MESSAGE =
  'That date and time has already passed. Choose a later date or a later seating time.';
/**
 * The API's own sentence for `RESERVATION_ISSUES.OUTSIDE_SERVICE_HOURS`, naming the
 * window the server enforces. Written as a real deployment states it — the window
 * of the service this suite runs against, not the client's idea of one — because
 * the form has to render whatever the API sent, unchanged.
 */
const API_OUTSIDE_HOURS_MESSAGE =
  'The reservation time is outside the service hours: we seat from 12:00 to 23:00, ' +
  'with the last seating 30 minutes before we close.';

/** Label text of the four submit controls, as each view renders it. */
const LOGIN_SUBMIT_LABEL = 'Sign in';
const REGISTER_SUBMIT_LABEL = 'Create account';
const PLACE_ORDER_LABEL = 'Place order';
const RESERVE_SUBMIT_LABEL = 'Reserve a table';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** The API path of the session restore and of the two posts under test. */
const SESSION_URL = '/api/auth/session';
const LOGIN_URL = '/api/auth/login';
const REGISTER_URL = '/api/auth/register';
const ORDERS_URL = '/api/orders';
const RESERVATIONS_URL = '/api/reservations';

/** The secret-free account projection every authenticated payload carries (rule R-4). */
const ACCOUNT: User = {
  id: '6f1f9d0e-0000-4000-8000-000000000001',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  created_at: '2031-01-01T09:00:00.000Z',
};

/** The catalog entry the checkout test puts in the cart. */
const MENU_ITEM: MenuItem = {
  id: '6f1f9d0e-0000-4000-8000-000000000002',
  name: 'Chili Cheeseburger',
  description: 'Beef patty, aged cheddar, chili and pickles in a seeded bun.',
  price_cents: 1299,
  image_url: null,
  is_available: true,
  category: {
    id: '6f1f9d0e-0000-4000-8000-000000000003',
    name: 'Burgers',
    slug: 'burgers',
  },
};

/** How many of {@link MENU_ITEM} the checkout test seeds, and therefore orders. */
const SEEDED_QUANTITY = 2;

/** What the order endpoint answers a successful placement with. */
const CREATED_ORDER: Order = {
  id: '6f1f9d0e-0000-4000-8000-000000000004',
  status: 'confirmed',
  total_cents: MENU_ITEM.price_cents * SEEDED_QUANTITY,
  notes: null,
  created_at: '2031-05-14T18:00:00.000Z',
  lines: [
    {
      id: '6f1f9d0e-0000-4000-8000-000000000005',
      menu_item_id: MENU_ITEM.id,
      name: MENU_ITEM.name,
      quantity: SEEDED_QUANTITY,
      unit_price_cents: MENU_ITEM.price_cents,
      line_total_cents: MENU_ITEM.price_cents * SEEDED_QUANTITY,
    },
  ],
};

/** The booking the reservation endpoint answers a successful post with. */
const CREATED_RESERVATION: Reservation = {
  id: '6f1f9d0e-0000-4000-8000-000000000006',
  reservation_date: '2031-05-14',
  reservation_time: '19:00',
  party_size: 4,
  status: 'confirmed',
  notes: 'Window seat preferred.',
  created_at: '2031-05-01T10:00:00.000Z',
};

/** A date in the future, so only the checkpoint under test can reject it. */
const FUTURE_DATE = '2031-05-14';
/** A seating time on the half-hour grid. */
const OFFERED_SLOT = '19:00';
/** A later seating on the grid: the last slot the API's default window seats at. */
const LAST_SEATING = '21:30';
/** One minute past that last seating: the boundary the API's window checkpoint refuses. */
const OFF_GRID_SEATING = '21:31';

/** Valid values for the sign-in form's two courtesy checks. */
const VALID_EMAIL = 'ada@example.com';
const VALID_PASSWORD = 'correct-horse-battery';

/**
 * @param date - Any Date.
 * @returns It as the local `YYYY-MM-DD` string a date control carries.
 */
function localDateString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// The stubbed transport
// ---------------------------------------------------------------------------

/** One response the stubbed `fetch` answers with. */
interface StubReply {
  readonly status: number;
  readonly body?: unknown;
}

/** One request the stubbed `fetch` observed, flattened to what is asserted on. */
interface RecordedCall {
  readonly url: string;
  readonly method: string;
  readonly body: Record<string, unknown> | null;
}

/**
 * @param status - The HTTP status to answer with.
 * @param body - The JSON payload, or nothing for a bodiless reply.
 * @returns The reply.
 */
function successReply(status: number, body: unknown): StubReply {
  return { status, body };
}

/**
 * Builds one failure in the API's single envelope (rule R-6). The code is typed
 * as `ApiErrorCode`, so a stub cannot introduce a fourteenth code by accident.
 *
 * @param status - The HTTP status the code maps to.
 * @param code - One of the documented thirteen codes.
 * @param message - The human-readable sentence the forms render.
 * @param details - One `{field, issue}` entry per offending value; omitted for
 *   every failure that names no field.
 * @returns The reply.
 */
function errorReply(
  status: number,
  code: ApiErrorCode,
  message: string,
  details: readonly ApiFieldDetail[] = [],
): StubReply {
  const envelope: ErrorEnvelope = {
    error: {
      code,
      message,
      ...(details.length === 0 ? {} : { details: details.map(({ field, issue }) => ({ field, issue })) }),
    },
  };

  return { status, body: envelope };
}

/**
 * Builds a failure carrying a code the API never sends, which is what proves the
 * transport down-levels it to `INTERNAL_ERROR` instead of passing it through.
 *
 * @param status - The HTTP status to answer with.
 * @param code - A code outside the documented thirteen.
 * @param message - The sentence the page must show in place of the code.
 * @returns The reply.
 */
function unknownCodeReply(status: number, code: string, message: string): StubReply {
  return { status, body: { error: { code, message } } };
}

/** @returns The request body as a keyed record, or null when none was sent. */
function parseBody(raw: BodyInit | null | undefined): Record<string, unknown> | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const parsed: unknown = JSON.parse(raw);
  return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
}

/** @returns The request as the assertions need it, URL and method included. */
function toRecordedCall(input: RequestInfo | URL, init?: RequestInit): RecordedCall {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return { url, method: init?.method ?? 'GET', body: parseBody(init?.body) };
}

/**
 * Wraps a reply in the parts of `Response` the transport reads, so the stub
 * answers exactly like the network without a server behind it.
 *
 * @param reply - The status and payload to answer with.
 * @returns The response object the transport consumes.
 */
function toResponse(reply: StubReply): Response {
  return {
    ok: reply.status >= 200 && reply.status < 300,
    status: reply.status,
    json: () => Promise.resolve(reply.body),
  } as unknown as Response;
}

/**
 * Replaces the global `fetch` for one test and records every request, which is
 * the whole of this file's networking: `client/src/api/client.ts` is the only
 * call site, so one stub covers every view.
 *
 * @param handler - Maps a recorded request to the reply it is answered with.
 * @returns The requests observed, in order, populated as the test runs.
 */
function stubFetch(handler: (call: RecordedCall) => StubReply): RecordedCall[] {
  const calls: RecordedCall[] = [];

  const mock = vi.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const call = toRecordedCall(input, init);
    calls.push(call);
    return Promise.resolve(toResponse(handler(call)));
  });

  vi.stubGlobal('fetch', mock);
  return calls;
}

/**
 * Replaces the global `fetch` with a request that is never answered, so a form
 * stays in its submitting state while the test reads what it announces. The
 * unanswered reply is discarded when the test ends and nothing waits on it.
 *
 * @returns The requests observed, in order, populated as the test runs.
 */
function stubPendingFetch(): RecordedCall[] {
  const calls: RecordedCall[] = [];

  const mock = vi.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push(toRecordedCall(input, init));
    return new Promise<Response>(() => undefined);
  });

  vi.stubGlobal('fetch', mock);
  return calls;
}

/** @returns An unexpected request as a failure the page will visibly render. */
function unexpectedRequestReply(call: RecordedCall): StubReply {
  return errorReply(500, 'INTERNAL_ERROR', `Unexpected request: ${call.method} ${call.url}`);
}

/**
 * @param calls - Every request observed so far.
 * @param url - The path the request must have been sent to.
 * @param method - The HTTP method the request must have used.
 * @returns That request, asserting exactly one was made.
 */
function onlyCall(calls: readonly RecordedCall[], url: string, method: string): RecordedCall {
  const matching = calls.filter((call) => call.url === url && call.method === method);
  expect(matching).toHaveLength(1);

  const [call] = matching;
  if (call === undefined) {
    throw new Error(`no ${method} ${url} was recorded`);
  }

  return call;
}

// ---------------------------------------------------------------------------
// The DOM assertions
//
// Every lookup walks the wiring the shared controls publish: the label names
// the control, and the control's `aria-describedby` names the message node. No
// assertion finds a message by searching the whole document, so a message that
// landed on the wrong field cannot pass.
// ---------------------------------------------------------------------------

/**
 * @param control - The input inside a `FormControls` field.
 * @returns The field wrapper the control and its message share.
 */
function fieldOf(control: HTMLElement): HTMLElement {
  const field = control.closest('.field');
  expect(field).not.toBeNull();
  return field as HTMLElement;
}

/**
 * @param control - The input to inspect.
 * @returns The message node its `aria-describedby` points at as an error, or
 *   null when the control is described by nothing but its hint.
 */
function queryErrorNode(control: HTMLElement): HTMLElement | null {
  const describedBy = control.getAttribute('aria-describedby');

  if (describedBy === null) {
    return null;
  }

  for (const id of describedBy.split(' ')) {
    if (!id.endsWith('-error')) {
      continue;
    }

    const node = document.getElementById(id);
    if (node !== null) {
      return node;
    }
  }

  return null;
}

/**
 * @param control - The input whose error is being read.
 * @returns That message node, asserting the control currently has one.
 */
function errorNode(control: HTMLElement): HTMLElement {
  const node = queryErrorNode(control);

  expect(node).not.toBeNull();
  return node as HTMLElement;
}

/** @returns The text of the message the control is currently described by. */
function errorText(control: HTMLElement): string {
  return errorNode(control).textContent ?? '';
}

/**
 * @param control - The input to inspect.
 * @returns The live region the shared field wrapper carries its message in,
 *   asserting the field has one — it is rendered before any message arrives.
 */
function feedbackRegion(control: HTMLElement): HTMLElement {
  const region = fieldOf(control).querySelector('.field__feedback');

  expect(region).not.toBeNull();
  return region as HTMLElement;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Props of the local {@link Providers} wrapper. */
interface ProvidersProps {
  /** The screen under test, plus any local harness component it needs. */
  readonly children: ReactNode;
  /** Whether the screen reads the cart, which `CartView` does. */
  readonly withCart?: boolean;
}

/**
 * Mounts a screen the way `client/src/main.tsx` does: inside a router, because
 * every view links or navigates, and inside the session provider, because the
 * auth forms open a session through it. The cart provider is added only for the
 * screen that reads one, since it hides the session status behind a default.
 *
 * @param props - The screen and whether it needs the cart.
 * @returns The provider tree.
 */
function Providers({ children, withCart = false }: ProvidersProps): JSX.Element {
  return (
    <MemoryRouter>
      <SessionProvider>
        {withCart ? <CartProvider>{children}</CartProvider> : children}
      </SessionProvider>
    </MemoryRouter>
  );
}

/** Props of the local {@link CartSeeder}. */
interface CartSeederProps {
  /** The catalog entry to place in the cart. */
  readonly item: MenuItem;
  /** How many of it to place there. */
  readonly quantity: number;
}

/**
 * Puts one line in the cart the way a shopper does, through the provider's own
 * `add`. Local to this file: the checkout test needs a populated cart, and the
 * cart provider keeps one nowhere else.
 *
 * @param props - The item and quantity to seed.
 * @returns Nothing; the line appears in the cart it renders inside.
 */
function CartSeeder({ item, quantity }: CartSeederProps): null {
  const { add } = useCart();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) {
      return;
    }

    seeded.current = true;
    add(item, quantity);
  }, [add, item, quantity]);

  return null;
}

/** @returns Nothing; renders the login screen inside the providers. */
function renderLogin(): void {
  render(<Providers><LoginView /></Providers>);
}

/** @returns Nothing; renders the registration screen inside the providers. */
function renderRegister(): void {
  render(<Providers><RegisterView /></Providers>);
}

/** @returns Nothing; renders the reservation form inside the providers. */
function renderReservationForm(): void {
  render(<Providers><ReservationFormView /></Providers>);
}

/**
 * The destination the form navigates to once the booking exists: enough to prove
 * the success transition happened, without mounting the confirmation screen.
 *
 * @returns A heading naming the reservation the form moved to.
 */
function ReservationConfirmationProbe(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <h1>{`Reservation ${String(id)}`}</h1>;
}

/** The four controls of the reservation form, each found through its label. */
interface ReservationControls {
  readonly date: HTMLInputElement;
  readonly time: HTMLInputElement;
  readonly party: HTMLInputElement;
  readonly notes: HTMLInputElement;
}

/** @returns The reservation form's controls, after rendering it. */
function reservationControls(): ReservationControls {
  return {
    date: screen.getByLabelText<HTMLInputElement>(/^Date/),
    time: screen.getByLabelText<HTMLInputElement>(/^Seating time/),
    party: screen.getByLabelText<HTMLInputElement>(/^Party size/),
    notes: screen.getByLabelText<HTMLInputElement>(/^Notes/),
  };
}

/** A booking as the form collects it. */
interface ReservationValues {
  readonly date?: string;
  readonly time?: string;
  readonly party?: string;
  readonly notes?: string;
}

/**
 * Fills the booking form without submitting it. The date, the seating time and
 * the party size are each set with a change event: jsdom drives no date or time
 * picker, so typing into either depends on a locale the application never reads,
 * while a real change event carries the same `YYYY-MM-DD`, `HH:MM` and count
 * strings a visitor's picker would put on the control and the form posts.
 *
 * @param user - The user-event session driving the form.
 * @param controls - The controls to fill.
 * @param values - The values to fill them with; an absent one is left alone.
 */
async function fillReservation(
  user: ReturnType<typeof userEvent.setup>,
  controls: ReservationControls,
  values: ReservationValues,
): Promise<void> {
  if (values.date !== undefined) {
    fireEvent.change(controls.date, { target: { value: values.date } });
  }

  if (values.time !== undefined) {
    fireEvent.change(controls.time, { target: { value: values.time } });
  }

  if (values.party !== undefined) {
    fireEvent.change(controls.party, { target: { value: values.party } });
  }

  if (values.notes !== undefined) {
    await user.type(controls.notes, values.notes);
  }
}

/** What the checkout test needs from a rendered, populated cart. */
interface CheckoutControls {
  /** Every request the page made, including the session restore. */
  readonly calls: RecordedCall[];
  /** The quantity control of the one seeded line. */
  readonly quantity: HTMLInputElement;
  /** The control that places the order. */
  readonly placeOrder: HTMLElement;
}

/**
 * Mounts `CartView` with one line already in the cart, inside a session.
 *
 * The session is restored from a stored token on purpose: the cart provider
 * empties itself whenever the session reports anonymous, so a cart belongs to a
 * signed-in shopper and is seeded in exactly that state. That is the rule the
 * provider enforces, not a shortcut around it.
 *
 * @param ordersReply - The reply the order endpoint gives.
 * @returns The requests made, the quantity control and the Place order control.
 */
async function renderCheckout(ordersReply: StubReply): Promise<CheckoutControls> {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, 'opaque-session-token');

  const calls = stubFetch((call) => {
    if (call.url === SESSION_URL) {
      return successReply(200, { user: ACCOUNT });
    }

    if (call.url === ORDERS_URL && call.method === 'POST') {
      return ordersReply;
    }

    return unexpectedRequestReply(call);
  });

  render(
    <Providers withCart>
      <CartSeeder item={MENU_ITEM} quantity={SEEDED_QUANTITY} />
      <CartView />
    </Providers>,
  );

  const placeOrder = await screen.findByRole('button', { name: PLACE_ORDER_LABEL });
  const quantity = screen.getByLabelText<HTMLInputElement>(new RegExp(`^Quantity of ${MENU_ITEM.name}`));

  return { calls, quantity, placeOrder };
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// Screen 2: the sign-in form
// ---------------------------------------------------------------------------

describe('LoginView', () => {
  it('reports a missing email and a missing password beside their own controls', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(200, {}));

    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);
    const password = screen.getByLabelText<HTMLInputElement>(/^Password/);

    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    expect(calls).toHaveLength(0);
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(errorText(email)).toBe(LOGIN_EMAIL_REQUIRED_MESSAGE);
    expect(errorText(password)).toBe(LOGIN_PASSWORD_REQUIRED_MESSAGE);
    expect(fieldOf(email).contains(errorNode(email))).toBe(true);
    expect(fieldOf(password).contains(errorNode(password))).toBe(true);
    expect(within(fieldOf(email)).queryByText(LOGIN_PASSWORD_REQUIRED_MESSAGE)).toBeNull();
    expect(within(fieldOf(password)).queryByText(LOGIN_EMAIL_REQUIRED_MESSAGE)).toBeNull();
  });

  it('marks the wrapper of an invalid field so the shared invalid-state rule applies', async () => {
    const user = userEvent.setup();
    stubFetch(() => successReply(200, {}));

    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);

    // A field with nothing wrong carries the plain wrapper class.
    expect(fieldOf(email).className).toBe('field');

    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    // global.css styles an invalid control through `.field--invalid .control`,
    // so the wrapper is what has to carry the state the message describes.
    expect(fieldOf(email).className).toBe('field field--invalid');
    expect(email.getAttribute('aria-invalid')).toBe('true');
  });

  it('reports an address that cannot be one beside the email control only', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(200, {}));

    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);
    const password = screen.getByLabelText<HTMLInputElement>(/^Password/);

    await user.type(email, 'ada-at-example');
    await user.type(password, VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    expect(calls).toHaveLength(0);
    expect(errorText(email)).toBe(LOGIN_EMAIL_INVALID_MESSAGE);
    expect(queryErrorNode(password)).toBeNull();
    expect(password.getAttribute('aria-invalid')).toBe('false');
  });

  it('renders each validation detail beside the field it names and no form-level message', async () => {
    const user = userEvent.setup();
    const EMAIL_ISSUE = 'email_must_be_an_address';
    const PASSWORD_ISSUE = 'password_must_be_at_most_72_bytes';
    stubFetch(() => errorReply(400, 'VALIDATION_ERROR', 'Some of these values need attention.', [
      { field: 'email', issue: EMAIL_ISSUE },
      { field: 'password', issue: PASSWORD_ISSUE },
    ]));

    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);
    const password = screen.getByLabelText<HTMLInputElement>(/^Password/);

    await user.type(email, VALID_EMAIL);
    await user.type(password, VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    expect(await screen.findByText(EMAIL_ISSUE)).not.toBeNull();
    expect(errorText(email)).toBe(EMAIL_ISSUE);
    expect(errorText(password)).toBe(PASSWORD_ISSUE);
    expect(within(fieldOf(email)).queryByText(PASSWORD_ISSUE)).toBeNull();
    expect(within(fieldOf(password)).queryByText(EMAIL_ISSUE)).toBeNull();
    // Every detail landed on its own field, so nothing is repeated at form level.
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('renders an indistinguishable sign-in failure as one form-level message and no field error', async () => {
    const user = userEvent.setup();
    const GENERIC_MESSAGE = 'Those details do not match an account.';
    stubFetch(() => errorReply(401, 'INVALID_CREDENTIALS', GENERIC_MESSAGE));

    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);
    const password = screen.getByLabelText<HTMLInputElement>(/^Password/);

    await user.type(email, VALID_EMAIL);
    await user.type(password, VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    const alert = await screen.findByRole('alert');

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(alert.getAttribute('data-code')).toBe('INVALID_CREDENTIALS');
    expect(alert.textContent).toBe(GENERIC_MESSAGE);
    expect(queryErrorNode(email)).toBeNull();
    expect(queryErrorNode(password)).toBeNull();
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(password.getAttribute('aria-invalid')).toBe('false');
    expect(within(fieldOf(email)).queryByText(GENERIC_MESSAGE)).toBeNull();
    expect(within(fieldOf(password)).queryByText(GENERIC_MESSAGE)).toBeNull();
  });

  it('offers the retry sentence only while a field is highlighted, never after a plain sign-in failure', async () => {
    const user = userEvent.setup();
    const GENERIC_MESSAGE = 'Those details do not match an account.';
    stubFetch(() => errorReply(401, 'INVALID_CREDENTIALS', GENERIC_MESSAGE));

    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);
    const password = screen.getByLabelText<HTMLInputElement>(/^Password/);

    await user.type(email, VALID_EMAIL);
    await user.type(password, VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    const alert = await screen.findByRole('alert');

    // A 401 highlights no field, so a retry sentence would point at nothing: the
    // panel is the whole of what the region says.
    expect(alert.getAttribute('data-code')).toBe('INVALID_CREDENTIALS');
    expect(alert.textContent).toBe(GENERIC_MESSAGE);
    expect(screen.queryByText(LOGIN_RETRY_MESSAGE)).toBeNull();
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(password.getAttribute('aria-invalid')).toBe('false');

    // An empty submit does highlight every field, and the same region then
    // carries the retry sentence in place of a panel.
    await user.clear(email);
    await user.clear(password);
    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    const hint = screen.getByText(LOGIN_RETRY_MESSAGE);
    expect(hint.closest('.form-feedback')).not.toBeNull();
    expect(errorText(email)).toBe(LOGIN_EMAIL_REQUIRED_MESSAGE);
    expect(errorText(password)).toBe(LOGIN_PASSWORD_REQUIRED_MESSAGE);
  });

  it('posts the typed credentials and renders no error when the session is opened', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(200, { user: ACCOUNT, token: 'opaque-session-token' }));

    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);
    const password = screen.getByLabelText<HTMLInputElement>(/^Password/);

    await user.type(email, VALID_EMAIL);
    await user.type(password, VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });

    const call = onlyCall(calls, LOGIN_URL, 'POST');
    expect(call.body).toEqual({ email: VALID_EMAIL, password: VALID_PASSWORD });
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(queryErrorNode(email)).toBeNull();
    expect(queryErrorNode(password)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Screen 1: the registration form
// ---------------------------------------------------------------------------

describe('RegisterView', () => {
  /** @returns The three controls of the registration form, after rendering it. */
  function controls(): { name: HTMLInputElement; email: HTMLInputElement; password: HTMLInputElement } {
    return {
      name: screen.getByLabelText<HTMLInputElement>(/^Name/),
      email: screen.getByLabelText<HTMLInputElement>(/^Email/),
      password: screen.getByLabelText<HTMLInputElement>(/^Password/),
    };
  }

  it('builds the address field as the shared email control', () => {
    renderRegister();

    // Both auth screens build the one address control the shared module owns,
    // so the browser gives each a soft keyboard with the address layout.
    expect(screen.getByLabelText<HTMLInputElement>(/^Email/).getAttribute('type')).toBe('email');
  });

  it('reports a missing name, address and password beside their own controls', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, {}));

    renderRegister();
    const { name, email, password } = controls();

    await user.click(screen.getByRole('button', { name: REGISTER_SUBMIT_LABEL }));

    expect(calls).toHaveLength(0);
    expect(errorText(name)).toBe(REGISTER_NAME_REQUIRED_MESSAGE);
    expect(errorText(email)).toBe(REGISTER_EMAIL_REQUIRED_MESSAGE);
    expect(errorText(password)).toBe(REGISTER_PASSWORD_REQUIRED_MESSAGE);
    expect(fieldOf(name).contains(errorNode(name))).toBe(true);
    expect(within(fieldOf(password)).queryByText(REGISTER_NAME_REQUIRED_MESSAGE)).toBeNull();
    expect(within(fieldOf(name)).queryByText(REGISTER_PASSWORD_REQUIRED_MESSAGE)).toBeNull();
  });

  it('reports a password below the eight-character floor beside the password control', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, {}));

    renderRegister();
    const { name, email, password } = controls();

    await user.type(name, ACCOUNT.name);
    await user.type(email, VALID_EMAIL);
    await user.type(password, 'short12');
    await user.click(screen.getByRole('button', { name: REGISTER_SUBMIT_LABEL }));

    expect(calls).toHaveLength(0);
    expect(errorText(password)).toBe(REGISTER_PASSWORD_TOO_SHORT_MESSAGE);
    expect(queryErrorNode(name)).toBeNull();
    expect(queryErrorNode(email)).toBeNull();
  });

  it('reports a password above the 72-byte ceiling beside the password control', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, {}));

    renderRegister();
    const { name, email, password } = controls();

    await user.type(name, ACCOUNT.name);
    await user.type(email, VALID_EMAIL);
    fireEvent.change(password, { target: { value: 'a'.repeat(73) } });
    await user.click(screen.getByRole('button', { name: REGISTER_SUBMIT_LABEL }));

    expect(calls).toHaveLength(0);
    expect(errorText(password)).toBe(REGISTER_PASSWORD_TOO_LONG_MESSAGE);
    expect(queryErrorNode(email)).toBeNull();
  });

  it('keeps the short-password message until the password reaches the eight-character floor', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, {}));

    renderRegister();
    const { password } = controls();

    await user.click(screen.getByRole('button', { name: REGISTER_SUBMIT_LABEL }));
    expect(errorText(password)).toBe(REGISTER_PASSWORD_REQUIRED_MESSAGE);

    // Six characters is still short of the floor, so the rule the user is acting
    // on stays on screen: the message, the invalid state and the wrapper
    // modifier the stylesheet turns into the red border all survive the edit.
    await user.type(password, 'short1');

    expect(errorText(password)).toBe(REGISTER_PASSWORD_TOO_SHORT_MESSAGE);
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(fieldOf(password).className).toBe('field field--invalid');

    // The eighth character satisfies the rule, and the message, the invalid
    // state and the modifier leave with it.
    await user.type(password, '23');

    expect(queryErrorNode(password)).toBeNull();
    expect(password.getAttribute('aria-invalid')).toBe('false');
    expect(fieldOf(password).className).toBe('field');
    // Typing is not submitting: no correction is sent on its own.
    expect(calls).toHaveLength(0);
  });

  it('renders a duplicate address on the email control and nowhere else', async () => {
    const user = userEvent.setup();
    const SERVER_MESSAGE = 'That email address is already registered.';
    stubFetch(() => errorReply(409, 'EMAIL_ALREADY_REGISTERED', SERVER_MESSAGE));

    renderRegister();
    const { name, email, password } = controls();

    await user.type(name, ACCOUNT.name);
    await user.type(email, VALID_EMAIL);
    await user.type(password, VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: REGISTER_SUBMIT_LABEL }));

    expect(await screen.findByText(REGISTER_EMAIL_DUPLICATE_MESSAGE)).not.toBeNull();
    expect(errorText(email)).toBe(REGISTER_EMAIL_DUPLICATE_MESSAGE);
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(queryErrorNode(name)).toBeNull();
    expect(queryErrorNode(password)).toBeNull();
    expect(within(fieldOf(email)).getByText(REGISTER_EMAIL_DUPLICATE_MESSAGE).textContent)
      .toBe(REGISTER_EMAIL_DUPLICATE_MESSAGE);
    // A duplicate address is a field failure, so it is not repeated as a summary.
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('renders all three validation details beside their own fields', async () => {
    const user = userEvent.setup();
    const NAME_ISSUE = 'name_must_not_be_empty';
    const EMAIL_ISSUE = 'email_must_be_an_address';
    const PASSWORD_ISSUE = 'password_must_be_at_least_8_characters';
    stubFetch(() => errorReply(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', [
      { field: 'name', issue: NAME_ISSUE },
      { field: 'email', issue: EMAIL_ISSUE },
      { field: 'password', issue: PASSWORD_ISSUE },
    ]));

    renderRegister();
    const { name, email, password } = controls();

    await user.type(name, ACCOUNT.name);
    await user.type(email, VALID_EMAIL);
    await user.type(password, VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: REGISTER_SUBMIT_LABEL }));

    expect(await screen.findByText(NAME_ISSUE)).not.toBeNull();
    expect(errorText(name)).toBe(NAME_ISSUE);
    expect(errorText(email)).toBe(EMAIL_ISSUE);
    expect(errorText(password)).toBe(PASSWORD_ISSUE);
    expect(within(fieldOf(name)).queryByText(EMAIL_ISSUE)).toBeNull();
    expect(within(fieldOf(email)).queryByText(NAME_ISSUE)).toBeNull();
    expect(within(fieldOf(password)).queryByText(NAME_ISSUE)).toBeNull();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('posts exactly the name, address and password the form collected', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, { user: ACCOUNT, token: 'opaque-session-token' }));

    renderRegister();
    const { name, email, password } = controls();

    await user.type(name, ACCOUNT.name);
    await user.type(email, VALID_EMAIL);
    await user.type(password, VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: REGISTER_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });

    const call = onlyCall(calls, REGISTER_URL, 'POST');

    // The account is created for whoever holds the token, so no owner travels
    // in the body (rule R-5), and no credential column is echoed back (rule R-4).
    expect(call.body).toEqual({ name: ACCOUNT.name, email: VALID_EMAIL, password: VALID_PASSWORD });
    expect(call.body).not.toHaveProperty('user_id');
  });
});

// ---------------------------------------------------------------------------
// Screen 5: the cart, whose Place order control is the checkout step
// ---------------------------------------------------------------------------

describe('CartView checkout', () => {
  it('reports an unavailable item at form level, naming it, with no field error', async () => {
    const user = userEvent.setup();
    const UNAVAILABLE_MESSAGE = `${MENU_ITEM.name} is not available right now.`;

    const { calls, quantity, placeOrder } = await renderCheckout(
      errorReply(409, 'MENU_ITEM_UNAVAILABLE', UNAVAILABLE_MESSAGE),
    );

    await user.click(placeOrder);

    const alert = await screen.findByRole('alert');

    onlyCall(calls, ORDERS_URL, 'POST');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(alert.getAttribute('data-code')).toBe('MENU_ITEM_UNAVAILABLE');
    expect(alert.textContent).toContain(UNAVAILABLE_MESSAGE);
    expect(alert.textContent).toContain(`Not available right now: ${MENU_ITEM.name}`);
    // Which item is unavailable is a fact about the cart, not about one control.
    expect(quantity.getAttribute('aria-invalid')).toBe('false');
    expect(queryErrorNode(quantity)).toBeNull();
    expect(within(fieldOf(quantity)).queryByText(UNAVAILABLE_MESSAGE)).toBeNull();
  });

  it('reports a validation detail naming the order itself at form level', async () => {
    const user = userEvent.setup();
    const ITEMS_ISSUE = 'items_must_contain_at_least_one_line';
    const VALIDATION_MESSAGE = 'The order could not be validated.';

    const { quantity, placeOrder } = await renderCheckout(
      errorReply(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, [{ field: 'items', issue: ITEMS_ISSUE }]),
    );

    await user.click(placeOrder);

    const detail = await screen.findByText(ITEMS_ISSUE);

    // The view renders no control for `items`, so the entry is surfaced as
    // itself rather than being dropped or pinned to a line it does not describe.
    expect(detail.textContent).toBe(ITEMS_ISSUE);
    expect(detail.getAttribute('data-field')).toBe('items');
    expect(detail.getAttribute('data-issue')).toBe(ITEMS_ISSUE);
    expect(detail.closest('label')).toBeNull();
    expect(fieldOf(quantity).contains(detail)).toBe(false);
    expect(quantity.getAttribute('aria-invalid')).toBe('false');

    const summary = screen.getByRole('alert');
    expect(summary.getAttribute('data-code')).toBe('VALIDATION_ERROR');
    expect(summary.textContent).toBe(VALIDATION_MESSAGE);
  });

  it('marks the quantity field of the line a detail names, leaving an unmentioned field unmarked', async () => {
    const user = userEvent.setup();
    const VALIDATION_MESSAGE = 'The order could not be validated.';
    const QUANTITY_ISSUE = 'must_be_an_integer_between_1_and_20';

    const { quantity, placeOrder } = await renderCheckout(
      errorReply(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, [
        { field: 'items[0].quantity', issue: QUANTITY_ISSUE },
      ]),
    );

    const notes = screen.getByLabelText<HTMLInputElement>(/^Notes/);

    await user.click(placeOrder);

    const detail = await screen.findByText(QUANTITY_ISSUE);

    // The entry names the seeded line's quantity, so it is rendered inside that
    // control's own field rather than at form level.
    expect(errorText(quantity)).toBe(QUANTITY_ISSUE);
    expect(fieldOf(quantity).contains(detail)).toBe(true);
    expect(quantity.getAttribute('aria-invalid')).toBe('true');
    // `.field--invalid .control` is the stylesheet rule that gives an invalid
    // control its visible state, so the wrapper carries the modifier while this
    // field is invalid, and only while it is.
    expect(fieldOf(quantity).className).toBe('field field--invalid');
    expect(fieldOf(notes).className).toBe('field');
    expect(notes.getAttribute('aria-invalid')).toBe('false');
    expect(within(fieldOf(notes)).queryByText(QUANTITY_ISSUE)).toBeNull();
  });

  it('posts only the item id and quantity of every line, so the server prices the order', async () => {
    const user = userEvent.setup();
    const { calls, placeOrder } = await renderCheckout(successReply(201, { order: CREATED_ORDER }));

    await user.click(placeOrder);

    await waitFor(() => {
      expect(calls.filter((call) => call.url === ORDERS_URL)).toHaveLength(1);
    });

    const call = onlyCall(calls, ORDERS_URL, 'POST');

    // Rule R-3: an id and a quantity per line, no amount of any kind and no
    // owner; the totals on the confirmation are the server's own sum.
    expect(call.body).toEqual({
      items: [{ menu_item_id: MENU_ITEM.id, quantity: SEEDED_QUANTITY }],
    });
    expect(call.body).not.toHaveProperty('notes');
    expect(call.body).not.toHaveProperty('user_id');

    const serialised = JSON.stringify(call.body);
    expect(serialised).not.toContain('price');
    expect(serialised).not.toContain('total');
    expect(serialised).not.toContain('cents');
    // Rule R-8: the cart is client state and has no endpoint of its own.
    expect(calls.some((entry) => entry.url.includes('/cart'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Screen 7: the reservation form
// ---------------------------------------------------------------------------

describe('ReservationFormView', () => {
  it('renders the seating time as the shared time control, carrying no window of its own', () => {
    renderReservationForm();

    const time = reservationControls().time;

    // One control, the shared `TimeField`: a labelled time input on the half-hour
    // step a browser's own picker reads, and no list of seatings anywhere on the
    // form — the hours the restaurant seats between are configuration the API owns,
    // so no option and no bound of them is rendered here.
    expect(screen.getAllByLabelText(/^Seating time/)).toHaveLength(1);
    expect(document.querySelectorAll('select')).toHaveLength(0);
    expect(time.tagName).toBe('INPUT');
    expect(time.getAttribute('type')).toBe('time');
    expect(time.getAttribute('step')).toBe('1800');
    expect(time.value).toBe('');
    expect(time.className).toBe('control');
    expect(time.getAttribute('name')).toBe('reservation-time');
    expect(time.hasAttribute('required')).toBe(true);
    expect(time.getAttribute('aria-describedby')).toBe('reservation-time-hint');
    expect(time.hasAttribute('min')).toBe(false);
    expect(time.hasAttribute('max')).toBe(false);
    expect(document.getElementById('reservation-time-hint')?.textContent)
      .toBe(RESERVATION_TIME_HINT);
  });

  it('reports a missing date, seating time and party size beside their own controls', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, {}));

    renderReservationForm();
    const controls = reservationControls();

    // The party size starts at 2, so the field is emptied to be missing.
    fireEvent.change(controls.party, { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    expect(calls).toHaveLength(0);
    expect(errorText(controls.date)).toBe(RESERVATION_DATE_REQUIRED_MESSAGE);
    expect(errorText(controls.time)).toBe(RESERVATION_TIME_REQUIRED_MESSAGE);
    expect(errorText(controls.party)).toBe(RESERVATION_PARTY_REQUIRED_MESSAGE);
    expect(fieldOf(controls.date).contains(errorNode(controls.date))).toBe(true);
    expect(within(fieldOf(controls.time)).queryByText(RESERVATION_DATE_REQUIRED_MESSAGE)).toBeNull();
    expect(within(fieldOf(controls.date)).queryByText(RESERVATION_TIME_REQUIRED_MESSAGE)).toBeNull();
    expect(within(fieldOf(controls.party)).queryByText(RESERVATION_DATE_REQUIRED_MESSAGE)).toBeNull();
  });

  it('reports a conflict at form level with no field error beside any control', async () => {
    const user = userEvent.setup();
    const CONFLICT_MESSAGE = 'You already hold a reservation for that date and time.';
    stubFetch(() => errorReply(409, 'RESERVATION_CONFLICT', CONFLICT_MESSAGE));

    renderReservationForm();
    const controls = reservationControls();

    await fillReservation(user, controls, { date: FUTURE_DATE, time: OFFERED_SLOT, party: '2' });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    const alert = await screen.findByRole('alert');

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(alert.getAttribute('data-code')).toBe('RESERVATION_CONFLICT');
    expect(alert.textContent).toBe(CONFLICT_MESSAGE);
    expect(controls.date.getAttribute('aria-invalid')).toBe('false');
    expect(controls.time.getAttribute('aria-invalid')).toBe('false');
    expect(controls.party.getAttribute('aria-invalid')).toBe('false');
    expect(queryErrorNode(controls.date)).toBeNull();
    expect(queryErrorNode(controls.time)).toBeNull();
    expect(queryErrorNode(controls.party)).toBeNull();
    expect(within(fieldOf(controls.date)).queryByText(CONFLICT_MESSAGE)).toBeNull();
  });

  it('renders the past-datetime issue beside the date control', async () => {
    const user = userEvent.setup();
    stubFetch(() => errorReply(400, 'VALIDATION_ERROR', 'The booking could not be validated.', [
      { field: 'reservation_date', issue: RESERVATION_ISSUES.DATETIME_IN_PAST },
    ]));

    renderReservationForm();
    const controls = reservationControls();

    await fillReservation(user, controls, { date: FUTURE_DATE, time: OFFERED_SLOT, party: '2' });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    expect(await screen.findByText(RESERVATION_PAST_MESSAGE)).not.toBeNull();
    expect(errorText(controls.date)).toBe(RESERVATION_PAST_MESSAGE);
    // The sentence a reader sees is the form's own translation of the issue.
    expect(errorText(controls.date)).not.toBe(RESERVATION_ISSUES.DATETIME_IN_PAST);
    expect(within(fieldOf(controls.date)).getByText(RESERVATION_PAST_MESSAGE).textContent)
      .toBe(RESERVATION_PAST_MESSAGE);
    expect(queryErrorNode(controls.time)).toBeNull();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  // The window is configuration the API reads and this package cannot, so the
  // sentence the server sends is the one the user reads, verbatim: it is the only
  // statement of the hours on the screen.
  it('renders the API\'s own window sentence beside the seating-time control', async () => {
    const user = userEvent.setup();
    stubFetch(() => errorReply(400, 'VALIDATION_ERROR', API_OUTSIDE_HOURS_MESSAGE, [
      { field: 'reservation_time', issue: RESERVATION_ISSUES.OUTSIDE_SERVICE_HOURS },
    ]));

    renderReservationForm();
    const controls = reservationControls();

    await fillReservation(user, controls, { date: FUTURE_DATE, time: OFFERED_SLOT, party: '2' });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    expect(await screen.findByText(API_OUTSIDE_HOURS_MESSAGE)).not.toBeNull();
    expect(errorText(controls.time)).toBe(API_OUTSIDE_HOURS_MESSAGE);
    expect(errorText(controls.time)).not.toBe(RESERVATION_ISSUES.OUTSIDE_SERVICE_HOURS);
    // No window of the client's own is rendered anywhere on the screen.
    expect(screen.queryByText(/service window runs from/)).toBeNull();
    expect(screen.queryByText(/17:00/)).toBeNull();
    expect(controls.time.getAttribute('aria-invalid')).toBe('true');
    expect(queryErrorNode(controls.date)).toBeNull();
    expect(queryErrorNode(controls.party)).toBeNull();
    expect(within(fieldOf(controls.time)).queryByText(RESERVATION_PAST_MESSAGE)).toBeNull();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  // A verdict whose envelope carried no sentence of its own still says something,
  // and what it says is never a window: the hours are the server's to state.
  it('names no hours of its own when that verdict arrives without a message', async () => {
    const user = userEvent.setup();
    stubFetch(() => errorReply(400, 'VALIDATION_ERROR', '', [
      { field: 'reservation_time', issue: RESERVATION_ISSUES.OUTSIDE_SERVICE_HOURS },
    ]));

    renderReservationForm();
    const controls = reservationControls();

    await fillReservation(user, controls, { date: FUTURE_DATE, time: OFFERED_SLOT, party: '2' });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(errorText(controls.time)).not.toBe('');
    });

    expect(errorText(controls.time)).not.toBe(RESERVATION_ISSUES.OUTSIDE_SERVICE_HOURS);
    expect(errorText(controls.time)).not.toMatch(/\d\d:\d\d/);
    expect(controls.time.getAttribute('aria-invalid')).toBe('true');
    expect(queryErrorNode(controls.date)).toBeNull();
    expect(queryErrorNode(controls.party)).toBeNull();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  // The party range is the API's fourth checkpoint, not this form's: the value
  // leaves the form and the server's own sentence lands on the field it names.
  it.each(['0', '13'])(
    'posts a party size of %s and renders the server range verdict beside the party field',
    async (partySize) => {
      const user = userEvent.setup();
      const calls = stubFetch(() => errorReply(400, 'VALIDATION_ERROR', RESERVATION_PARTY_OUT_OF_RANGE_MESSAGE, [
        { field: 'party_size', issue: 'out_of_range' },
      ]));

      renderReservationForm();
      const controls = reservationControls();

      await fillReservation(user, controls, { date: FUTURE_DATE, time: OFFERED_SLOT, party: partySize });
      await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

      expect(await screen.findByText(RESERVATION_PARTY_OUT_OF_RANGE_MESSAGE)).not.toBeNull();

      await waitFor(() => {
        expect(calls).toHaveLength(1);
      });

      const call = onlyCall(calls, RESERVATIONS_URL, 'POST');

      // Rule R-5: the caller is the Bearer token, so no owner is posted. The
      // party size travels as the number that was typed, unclamped.
      expect(call.body).toEqual({
        reservation_date: FUTURE_DATE,
        reservation_time: OFFERED_SLOT,
        party_size: Number(partySize),
      });
      expect(call.body).not.toHaveProperty('user_id');
      expect(errorText(controls.party)).toBe(RESERVATION_PARTY_OUT_OF_RANGE_MESSAGE);
      expect(queryErrorNode(controls.date)).toBeNull();
      expect(queryErrorNode(controls.time)).toBeNull();
      expect(screen.queryAllByRole('alert')).toHaveLength(0);
    },
  );

  it('rejects a party size of 2.5 before any request, because the API takes a whole number', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, {}));

    renderReservationForm();
    const controls = reservationControls();

    await fillReservation(user, controls, { date: FUTURE_DATE, time: OFFERED_SLOT, party: '2.5' });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    expect(calls).toHaveLength(0);
    expect(errorText(controls.party)).toBe(RESERVATION_PARTY_INVALID_MESSAGE);
    expect(queryErrorNode(controls.date)).toBeNull();
    expect(queryErrorNode(controls.time)).toBeNull();
  });

  // The date control's one bound is arithmetic rather than configuration: a date
  // before today has passed. How far ahead the restaurant takes bookings is its own
  // setting, which this package cannot read, so the control carries no `max` and
  // only the API's horizon checkpoint refuses a distant date. The one calendar
  // check the form makes is its own.
  it('bounds the date control at today and refuses an impossible calendar date before any request', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, {}));

    renderReservationForm();
    const controls = reservationControls();

    const today = new Date();

    expect(controls.date.getAttribute('min')).toBe(localDateString(today));
    expect(controls.date.hasAttribute('max')).toBe(false);
    expect(document.getElementById('reservation-date-hint')?.textContent).toBe(RESERVATION_DATE_HINT);

    // A date control sanitises an impossible calendar date to nothing on
    // assignment, exactly as a browser's own picker does, so the value the API's
    // parser refuses is written onto the control to carry it into the change.
    Object.defineProperty(controls.date, 'value', {
      configurable: true,
      get: () => '2031-02-30',
      set: () => undefined,
    });
    fireEvent.change(controls.date);

    fireEvent.change(controls.time, { target: { value: OFFERED_SLOT } });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    expect(calls).toHaveLength(0);
    expect(errorText(controls.date)).toBe(RESERVATION_DATE_INVALID_MESSAGE);
    expect(controls.date.getAttribute('aria-invalid')).toBe('true');
    expect(queryErrorNode(controls.time)).toBeNull();
    expect(queryErrorNode(controls.party)).toBeNull();
  });

  // The window and the half-hour slot grid are the API's third checkpoint, so the
  // form sends whatever was chosen and the server's own verdict is what the field
  // shows. 21:30 is that checkpoint's last seating and 21:31 is the boundary it
  // refuses as outside the service hours, so neither is judged here.
  it.each([LAST_SEATING, OFF_GRID_SEATING])(
    'posts a seating of %s unchanged and renders the API window verdict beside it',
    async (seating) => {
      const user = userEvent.setup();
      const calls = stubFetch(() => errorReply(400, 'VALIDATION_ERROR', API_OUTSIDE_HOURS_MESSAGE, [
        { field: 'reservation_time', issue: RESERVATION_ISSUES.OUTSIDE_SERVICE_HOURS },
      ]));

      renderReservationForm();
      const controls = reservationControls();

      await fillReservation(user, controls, { date: FUTURE_DATE, time: seating, party: '2' });
      await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

      expect(await screen.findByText(API_OUTSIDE_HOURS_MESSAGE)).not.toBeNull();

      await waitFor(() => {
        expect(calls).toHaveLength(1);
      });

      const call = onlyCall(calls, RESERVATIONS_URL, 'POST');

      // The time travels exactly as it was typed: the form judged neither the hours
      // nor the grid, so the sentence on the field is the API's own.
      expect(call.body).toEqual({
        reservation_date: FUTURE_DATE,
        reservation_time: seating,
        party_size: 2,
      });
      expect(errorText(controls.time)).toBe(API_OUTSIDE_HOURS_MESSAGE);
      expect(errorText(controls.time)).not.toBe(RESERVATION_TIME_INVALID_MESSAGE);
      expect(controls.time.getAttribute('aria-invalid')).toBe('true');
      expect(queryErrorNode(controls.date)).toBeNull();
      expect(queryErrorNode(controls.party)).toBeNull();
      expect(screen.queryAllByRole('alert')).toHaveLength(0);
    },
  );

  // The one rule the form keeps for the seating time is the shape the API's own
  // shape checkpoint applies, so a value it would refuse never leaves the form. A
  // time control sanitises a value that is not `HH:MM` away on assignment, exactly
  // as a browser's picker does, so the value is written onto the control to carry
  // it into the change — the technique the impossible-calendar-date case uses.
  it('refuses a seating time that is not written as HH:MM before any request', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, {}));

    renderReservationForm();
    const controls = reservationControls();

    fireEvent.change(controls.date, { target: { value: FUTURE_DATE } });
    Object.defineProperty(controls.time, 'value', {
      configurable: true,
      get: () => 'half past seven',
      set: () => undefined,
    });
    fireEvent.change(controls.time);

    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    expect(calls).toHaveLength(0);
    expect(errorText(controls.time)).toBe(RESERVATION_TIME_INVALID_MESSAGE);
    expect(controls.time.getAttribute('aria-invalid')).toBe('true');
    expect(queryErrorNode(controls.date)).toBeNull();
    expect(queryErrorNode(controls.party)).toBeNull();
  });

  // Nothing the documented default configuration would refuse is refused here:
  // the window, the horizon and the party cap are settings the API reads and this
  // package cannot (R-2), so a value outside the defaults leaves the form unchanged
  // and only the API's own checkpoints decide it.
  it('posts values the API defaults would refuse, so only the API decides them', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, { reservation: CREATED_RESERVATION }));

    renderReservationForm();
    const controls = reservationControls();

    const today = new Date();
    const farAhead = localDateString(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 400),
    );

    // 12:00 is before the default 17:00 opening, 400 days is past the default
    // ninety-day horizon, and 20 guests is above the default party cap.
    await fillReservation(user, controls, { date: farAhead, time: '12:00', party: '20' });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });

    const call = onlyCall(calls, RESERVATIONS_URL, 'POST');

    expect(call.body).toEqual({
      reservation_date: farAhead,
      reservation_time: '12:00',
      party_size: 20,
    });
    expect(queryErrorNode(controls.date)).toBeNull();
    expect(queryErrorNode(controls.time)).toBeNull();
    expect(queryErrorNode(controls.party)).toBeNull();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('posts only the booking the form collected, with the note when one was typed', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, { reservation: CREATED_RESERVATION }));

    renderReservationForm();
    const controls = reservationControls();

    await fillReservation(user, controls, {
      date: FUTURE_DATE,
      time: OFFERED_SLOT,
      party: '4',
      notes: 'Window seat preferred.',
    });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });

    const call = onlyCall(calls, RESERVATIONS_URL, 'POST');

    // Rule R-5: the caller is the Bearer token, so no owner is posted. The
    // party size travels as a number because the column is an integer.
    expect(call.body).toEqual({
      reservation_date: FUTURE_DATE,
      reservation_time: OFFERED_SLOT,
      party_size: 4,
      notes: 'Window seat preferred.',
    });
    expect(call.body).not.toHaveProperty('user_id');
  });

  it('omits the note from the body when none was typed', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, { reservation: CREATED_RESERVATION }));

    renderReservationForm();
    const controls = reservationControls();

    await fillReservation(user, controls, { date: FUTURE_DATE, time: OFFERED_SLOT, party: '2' });
    await user.click(screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });

    const call = onlyCall(calls, RESERVATIONS_URL, 'POST');

    expect(call.body).toEqual({
      reservation_date: FUTURE_DATE,
      reservation_time: OFFERED_SLOT,
      party_size: 2,
    });
    expect(call.body).not.toHaveProperty('notes');
  });

  it('marks the form and the submit control busy while the booking is in flight', async () => {
    const user = userEvent.setup();
    const calls = stubPendingFetch();

    renderReservationForm();
    const controls = reservationControls();

    await fillReservation(user, controls, { date: FUTURE_DATE, time: OFFERED_SLOT, party: '2' });

    const submit = screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL });
    const form = submit.closest('form');

    expect(form).not.toBeNull();
    // The pristine form is neither busy nor saying anything about a wait, and the
    // control offers the action rather than reporting one.
    expect(form?.getAttribute('aria-busy')).toBe('false');
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    expect(submit.getAttribute('aria-busy')).toBe('false');
    expect(submit.textContent).toBe(RESERVE_SUBMIT_LABEL);

    await user.click(submit);

    await waitFor(() => {
      expect(form?.getAttribute('aria-busy')).toBe('true');
    });

    // One status region holding the sentence, on the same form that reports
    // itself busy, and the submit control out of action meanwhile.
    const statuses = screen.getAllByRole('status');

    expect(statuses).toHaveLength(1);
    expect(statuses[0]?.textContent).toBe(RESERVATION_SUBMITTING_MESSAGE);
    // The wait reaches the control itself as well: a reader that does not look at
    // the status region hears it, and the visible text says what is happening
    // rather than only relying on the native disabled attribute.
    expect(submit.getAttribute('aria-busy')).toBe('true');
    expect(submit.textContent).toBe(RESERVATION_SUBMITTING_LABEL);
    expect(submit.hasAttribute('disabled')).toBe(true);
    onlyCall(calls, RESERVATIONS_URL, 'POST');
  });

  // A ref set before the first await is what stops a second submit dispatched in
  // the same task: the rendered `disabled` attribute only arrives with the next
  // render, so two clicks in one task would both pass a state check and post.
  it('posts one booking when two submits are dispatched in the same task', async () => {
    const user = userEvent.setup();
    const calls = stubFetch(() => successReply(201, { reservation: CREATED_RESERVATION }));

    render(
      <MemoryRouter initialEntries={['/reservations/new']}>
        <SessionProvider>
          <Routes>
            <Route path="/reservations/new" element={<ReservationFormView />} />
            <Route path="/reservations/:id" element={<ReservationConfirmationProbe />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>,
    );

    const controls = reservationControls();

    await fillReservation(user, controls, { date: FUTURE_DATE, time: OFFERED_SLOT, party: '2' });

    const submit = screen.getByRole('button', { name: RESERVE_SUBMIT_LABEL });

    // Both clicks in one task: React has not re-rendered between them, so nothing
    // the rendered markup carries can be what stops the second one.
    await act(async () => {
      submit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      submit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // The one booking settles and the form moves to its confirmation.
    expect(await screen.findByRole('heading', { name: `Reservation ${CREATED_RESERVATION.id}` }))
      .not.toBeNull();
    expect(calls.filter((call) => call.url === RESERVATIONS_URL && call.method === 'POST'))
      .toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Rule R-6: one envelope, and a code outside it never reaches a screen
// ---------------------------------------------------------------------------

describe('error envelope discipline', () => {
  it('renders a code outside the documented thirteen as the generic form-level message', async () => {
    const user = userEvent.setup();
    const SERVER_MESSAGE = 'The service is unavailable.';

    // No endpoint answers with this code; the transport must down-level it to
    // INTERNAL_ERROR rather than pass a fourteenth code through to a screen.
    stubFetch(() => unknownCodeReply(503, 'DATABASE_UNAVAILABLE', SERVER_MESSAGE));

    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);
    const password = screen.getByLabelText<HTMLInputElement>(/^Password/);

    await user.type(email, VALID_EMAIL);
    await user.type(password, VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    const alert = await screen.findByRole('alert');

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(alert.getAttribute('data-code')).toBe('INTERNAL_ERROR');
    expect(alert.textContent).toBe(SERVER_MESSAGE);
    expect(screen.queryByText('DATABASE_UNAVAILABLE')).toBeNull();
    expect(queryErrorNode(email)).toBeNull();
    expect(queryErrorNode(password)).toBeNull();
    expect(within(fieldOf(email)).queryByText(SERVER_MESSAGE)).toBeNull();
    expect(within(fieldOf(password)).queryByText(SERVER_MESSAGE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The two feedback regions the shared module owns: the field's polite live
// region, and the form-level region that is on screen before it has a message
// ---------------------------------------------------------------------------

describe('field message announcement', () => {
  it('announces a field message from a polite region that exists before the message', async () => {
    const user = userEvent.setup();
    stubFetch(() => successReply(200, {}));

    renderLogin();

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);
    const region = feedbackRegion(email);

    // A live region created together with its text is not announced, so the
    // region is on the pristine form already and only the message arrives.
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    // The form-level panel owns role="alert"; a role here would announce twice.
    expect(region.getAttribute('role')).toBeNull();
    expect(queryErrorNode(email)).toBeNull();
    expect(region.textContent).toBe('');

    await user.click(screen.getByRole('button', { name: LOGIN_SUBMIT_LABEL }));

    // The message lands inside that region, and aria-describedby still names it.
    expect(region.contains(errorNode(email))).toBe(true);
    expect(region.textContent).toBe(LOGIN_EMAIL_REQUIRED_MESSAGE);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
});

describe('FormFeedback', () => {
  const SERVER_MESSAGE = 'That table is already booked. Choose another seating time.';
  const FIXED_COPY = 'Something went wrong while booking your table. Please try again.';
  const RETRY_HINT = 'Correct the highlighted fields, then submit the form again to retry.';

  it.each([
    {
      source: 'the API error itself',
      error: new ApiError(SERVER_MESSAGE, 409, 'RESERVATION_CONFLICT'),
      message: null,
      expectedCode: 'RESERVATION_CONFLICT',
      expectedText: SERVER_MESSAGE,
    },
    {
      source: 'fixed copy for a failure that is not an ApiError',
      error: null,
      message: FIXED_COPY,
      expectedCode: 'INTERNAL_ERROR',
      expectedText: FIXED_COPY,
    },
  ])('renders $source as the one alert inside the region', ({ error, message, expectedCode, expectedText }) => {
    const { container } = render(<FormFeedback error={error} message={message} hint={RETRY_HINT} />);

    const region = container.querySelector('.form-feedback');
    const alert = screen.getByRole('alert');

    expect(region).not.toBeNull();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(alert.getAttribute('data-code')).toBe(expectedCode);
    expect(alert.textContent).toBe(expectedText);
    expect((region as HTMLElement).contains(alert)).toBe(true);
    // A failure and the invitation to retry are one moment: the hint stands down.
    expect(screen.queryByText(RETRY_HINT)).toBeNull();
  });

  it.each([
    { source: 'the retry hint alone', hint: RETRY_HINT, expectedText: RETRY_HINT },
    { source: 'nothing to report', hint: null, expectedText: '' },
  ])('renders its region with $source and no alert', ({ hint, expectedText }) => {
    const { container } = render(<FormFeedback hint={hint} />);

    // The region is what holds the height global.css reserves, so it is here
    // whether or not it has anything to say.
    const region = container.querySelector('.form-feedback');

    expect(region).not.toBeNull();
    expect(region?.textContent).toBe(expectedText);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
});
