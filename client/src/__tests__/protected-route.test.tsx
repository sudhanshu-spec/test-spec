/**
 * @fileoverview Guard suite for `client/src/components/ProtectedRoute.tsx` and the six protected
 * entries of the route table declared in `client/src/main.tsx`.
 *
 * Every case drives the real route table through `createMemoryRouter`, so the guard under test is
 * the one production mounts: `ProtectedRoute` is applied by the manifest's `requiresAuth` rows, the
 * session comes from the real `SessionProvider` and the cart from the real `CartProvider`.
 *
 * Seven concerns, one module (rule R-10):
 *
 * 1. An anonymous visitor is sent to `/login` from each of the six guarded paths, and the guarded
 *    screen is never mounted, so its data is never requested. The three token codes the API answers
 *    a rejected session with are each exercised, so every anonymous route is covered at the API
 *    level as well as in the client.
 * 2. A session still being restored renders the `role="status"` placeholder and does NOT redirect:
 *    a returning visitor must not be bounced to the login form on reload merely because the stored
 *    token has not been verified yet.
 * 3. A verified session renders each guarded screen, which is what proves the guard is not simply
 *    always redirecting.
 * 4. The guard's own contract: an authenticated child renders unchanged and unboxed, `/login` is
 *    the only address of the login screen, and the guarded paths are exactly the manifest's
 *    `requiresAuth` rows.
 * 5. A refused sign-in keeps everything the guard handed over: the `from` parameter, the notice and
 *    the history entry survive the 401 a wrong password is answered with, and the corrected sign-in
 *    still returns the visitor to the guarded screen. A credential refusal is not a session expiry,
 *    so the shell has nothing to navigate away from.
 * 6. The hand-over is refused when resuming it would leave the application: a `from` value a prefix
 *    test alone accepts but URL resolution turns into another origin shows no notice and lands on
 *    the menu, where a plain `/login` visit goes.
 * 7. The two order-id failures stay distinct: an id the API refuses as malformed renders its own
 *    state echoing the API's message, while an id that names no order keeps the not-found copy.
 *
 * No request leaves the process (rule R-7): `fetch` is replaced through `vi.stubGlobal` in every
 * case and answers from a canned table, and an unsanctioned URL is answered with the documented 500
 * envelope instead of reaching a network. Account fixtures carry only the API's secret-free
 * projection (rule R-4), every stubbed failure uses the one envelope with one of its thirteen codes
 * (rule R-6), the cart is never requested (rule R-8), and the guard decides nothing about
 * ownership: another account's record is the API's 404, stubbed and asserted as such rather than as
 * a 403 (rule R-5). Nothing here imports from or asserts about the CommonJS root package (rules
 * R-1, R-2).
 *
 * @module client/src/__tests__/protected-route.test
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Order,
  OrderResponse,
  OrdersResponse,
  Reservation,
  ReservationsResponse,
  SessionResponse,
  User,
} from '../api/types';
import { ProtectedRoute, RETURN_PATH_PARAM } from '../components/ProtectedRoute';
import { routeManifest, routes } from '../main';
import { CartProvider } from '../state/cart';
import { SessionProvider, TOKEN_STORAGE_KEY } from '../state/session';

// ---------------------------------------------------------------------------
// Fixtures: UUID-shaped ids, integer cents and the API's secret-free account (rule R-4)
// ---------------------------------------------------------------------------

/** 64 hex characters, the shape of the opaque tokens the API mints. */
const STORED_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/** Level-one heading of the login screen, which is what an anonymous visit must land on. */
const LOGIN_HEADING = 'Sign in';

/** Level-one heading of the registration screen, asserted absent to pin the target to `/login`. */
const REGISTER_HEADING = 'Create your account';

/** Level-one heading of the catalog screen, the destination a completed sign-in lands on. */
const MENU_HEADING = 'Our menu';

const USER: User = {
  id: '3f2b9c1e-0d4a-4b6f-9c8e-1a2b3c4d5e6f',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  created_at: '2024-05-01T12:00:00.000Z',
};

const SESSION_RESPONSE: SessionResponse = { user: USER };

const MENU_ITEM_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const ORDER_ID = 'b7c8d9e0-1f2a-4b3c-9d4e-5f6a7b8c9d0e';
const ORDER_LINE_ID = 'c8d9e0f1-2a3b-4c4d-ae5f-6a7b8c9d0e1f';
const RESERVATION_ID = 'd9e0f1a2-3b4c-4d5e-8f60-7a8b9c0d1e2f';

/** An order id the API refuses as malformed: `GET /api/orders/:id` validates the id before it looks. */
const MALFORMED_ORDER_ID = 'not-a-uuid-142857';

/** An id in the shape the API mints that names no order, which the API answers with its not-found code. */
const UNKNOWN_ORDER_ID = '51c5e571-d8c0-4eba-a498-e21b0ce35629';

/** The message the API answers a malformed order id with; the screen echoes it verbatim. */
const INVALID_ORDER_ID_MESSAGE = 'The order id must be a valid UUID.';

/** One stored line, priced by the server: the client sends only an id and a quantity (rule R-3). */
const ORDER: Order = {
  id: ORDER_ID,
  status: 'confirmed',
  total_cents: 2498,
  notes: null,
  created_at: '2024-05-02T18:30:00.000Z',
  lines: [
    {
      id: ORDER_LINE_ID,
      menu_item_id: MENU_ITEM_ID,
      name: 'Classic Cheeseburger',
      quantity: 2,
      unit_price_cents: 1249,
      line_total_cents: 2498,
    },
  ],
};

const ORDER_RESPONSE: OrderResponse = { order: ORDER };
const ORDERS_RESPONSE: OrdersResponse = { orders: [ORDER] };

const RESERVATION: Reservation = {
  id: RESERVATION_ID,
  reservation_date: '2024-06-01',
  reservation_time: '19:00',
  party_size: 4,
  status: 'confirmed',
  notes: null,
  created_at: '2024-05-02T19:00:00.000Z',
};

const RESERVATIONS_RESPONSE: ReservationsResponse = { reservations: [RESERVATION] };

// ---------------------------------------------------------------------------
// The six guarded paths: the route manifest's requiresAuth rows, with a real UUID where a row
// declares a parameter, so a failure can never be blamed on path syntax
// ---------------------------------------------------------------------------

interface GuardedPath {
  /** Path pattern exactly as `routeManifest` declares it. */
  readonly pattern: string;
  /** Concrete URL rendered, with a UUID wherever the pattern carries a parameter. */
  readonly url: string;
  /** Level-one heading of the guarded screen: absent while the guard keeps it unmounted. */
  readonly heading: string;
  /** Path below `/api` the guard must keep unrequested while the visitor is not verified. */
  readonly resourcePath: string;
  /** Paths below `/api` the screen issues once it renders for a verified session. */
  readonly requests: readonly string[];
}

const GUARDED_PATHS: readonly GuardedPath[] = [
  {
    pattern: '/cart',
    url: '/cart',
    heading: 'Your cart',
    resourcePath: '/cart',
    requests: [],
  },
  {
    pattern: '/orders',
    url: '/orders',
    heading: 'Your orders',
    resourcePath: '/orders',
    requests: ['/orders'],
  },
  {
    pattern: '/orders/:id',
    url: `/orders/${ORDER_ID}`,
    heading: 'Order details',
    resourcePath: `/orders/${ORDER_ID}`,
    requests: [`/orders/${ORDER_ID}`],
  },
  {
    pattern: '/reservations/new',
    url: '/reservations/new',
    heading: 'Reserve a table',
    resourcePath: '/reservations',
    requests: [],
  },
  {
    pattern: '/reservations',
    url: '/reservations',
    heading: 'Your reservations',
    resourcePath: '/reservations',
    requests: ['/reservations'],
  },
  {
    pattern: '/reservations/:id',
    url: `/reservations/${RESERVATION_ID}`,
    heading: 'Your booking',
    resourcePath: '/reservations',
    requests: ['/reservations'],
  },
];

/** The two guarded paths whose screens load nothing, reused by the loading case. */
const LOADING_CASES: readonly GuardedPath[] = GUARDED_PATHS.filter(
  (guarded) => guarded.pattern === '/cart' || guarded.pattern === '/reservations/new',
);

/** The token codes the API answers a rejected session with; each stands for one anonymous route. */
const TOKEN_CODES = ['TOKEN_REQUIRED', 'TOKEN_INVALID', 'TOKEN_EXPIRED'] as const;

// ---------------------------------------------------------------------------
// Network double: a canned answer per request path, nothing reaching a network
// ---------------------------------------------------------------------------

/** Path prefix of the JSON API; `apiFetch` passes it with the request path appended. */
const API_PREFIX = '/api';

/** The `fetch` signature the transport calls: `apiFetch` always passes a relative URL string. */
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** One canned answer; a pending session is answered with a promise that never settles. */
type ApiAnswer = () => Promise<Response> | Response;

/** What {@link installApi} returns: every request the client made, for the assertions on absence. */
interface ApiRecorder {
  /** Path below `/api` of every request, in the order it was made. */
  paths(): readonly string[];
}

/**
 * @param url - A URL the transport built.
 * @returns Its path below `/api`, without a query string, so an answer is keyed independently of
 * the query a view happens to send.
 */
function pathBelowApi(url: string): string {
  const path = url.startsWith(API_PREFIX) ? url.slice(API_PREFIX.length) : url;
  const queryStart = path.indexOf('?');
  return queryStart === -1 ? path : path.slice(0, queryStart);
}

/**
 * Builds the response shape `apiFetch` reads: `status`, `ok` and `json`. Only those three members
 * are touched, so the double need not be a platform `Response`.
 *
 * @param status - HTTP status, which also decides `ok`.
 * @param body - The value the body reader resolves with.
 * @returns The response double.
 */
function jsonResponse(status: number, body: unknown): Response {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async (): Promise<unknown> => body,
  };

  return response as unknown as Response;
}

/**
 * Installs the stubbed API as the global `fetch` and records what the client asks for.
 *
 * A path the table does not answer is answered with the documented 500 envelope instead of
 * rejecting: a rejection would look like a network failure and would let an unverified session
 * resolve to 'anonymous' for the wrong reason, whereas a 500 surfaces in the rendered error state
 * and is therefore visible to whichever assertion fails.
 *
 * @param answers - One canned answer per path below `/api`.
 * @returns The recorder of every request made.
 */
function installApi(answers: Readonly<Record<string, ApiAnswer>>): ApiRecorder {
  const urls: string[] = [];

  const fetchMock = vi.fn<FetchLike>((input) => {
    urls.push(input);
    const path = pathBelowApi(input);
    const answer = answers[path];

    if (answer === undefined) {
      return Promise.resolve(
        jsonResponse(500, {
          error: { code: 'INTERNAL_ERROR', message: `Unexpected request: ${path}` },
        }),
      );
    }

    return Promise.resolve(answer());
  });

  vi.stubGlobal('fetch', fetchMock);

  return { paths: () => urls.map(pathBelowApi) };
}

/**
 * @param code - One of the token codes the API answers a rejected session with.
 * @returns The answers of a visitor whose stored token the API will not accept.
 */
function rejectedSessionAnswers(code: string): Record<string, ApiAnswer> {
  return {
    '/auth/session': () => jsonResponse(401, { error: { code, message: 'Sign in to continue.' } }),
  };
}

/** @returns The answers of a visitor whose stored token is still being verified, never answered. */
function pendingSessionAnswers(): Record<string, ApiAnswer> {
  return {
    '/auth/session': () =>
      new Promise<Response>(() => {
        // Never settles: the session provider stays 'loading' for the whole test.
      }),
  };
}

/**
 * @returns The answers a verified session's screens need: the account, one order, its history and
 * one booking. Every guarded screen reads only from this table, so a screen requesting anything
 * else is answered with the 500 envelope and fails loudly.
 */
function verifiedSessionAnswers(): Record<string, ApiAnswer> {
  return {
    '/auth/session': () => jsonResponse(200, SESSION_RESPONSE),
    '/orders': () => jsonResponse(200, ORDERS_RESPONSE),
    [`/orders/${ORDER_ID}`]: () => jsonResponse(200, ORDER_RESPONSE),
    '/reservations': () => jsonResponse(200, RESERVATIONS_RESPONSE),
  };
}

// ---------------------------------------------------------------------------
// Render helpers: the providers and the router `client/src/main.tsx` composes in production
// ---------------------------------------------------------------------------

/**
 * Renders the real route table at one URL, inside the providers the entry point nests it in.
 *
 * @param url - The URL to mount, as a concrete path.
 * @returns The rendered container, which is where an unboxed child element lands.
 */
function renderApp(url: string): HTMLElement {
  const router = createMemoryRouter(routes, { initialEntries: [url] });

  const { container } = render(
    <SessionProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </SessionProvider>,
  );

  return container;
}

/**
 * Waits for the login screen and checks the three things that identify it: its heading and the two
 * labelled fields of its form. The registration screen is asserted absent so the destination is
 * pinned to `/login` rather than to "some public screen".
 *
 * @returns A promise that settles once the login screen is on the page.
 */
async function expectLoginScreen(): Promise<void> {
  const heading = await screen.findByRole('heading', { name: LOGIN_HEADING, level: 1 });
  expect(heading.tagName).toBe('H1');
  // `getByLabelText` resolves the label to the input it names, so this reads the rendered control.
  expect(screen.getByLabelText(/^Email/).getAttribute('id')).toBe('login-email');
  expect(screen.getByLabelText(/^Password/).getAttribute('id')).toBe('login-password');
  expect(screen.queryByRole('heading', { name: REGISTER_HEADING, level: 1 })).toBeNull();
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
// An anonymous visitor
// ---------------------------------------------------------------------------

describe('anonymous session', () => {
  for (const guarded of GUARDED_PATHS) {
    it(`${guarded.pattern}: lands on the login screen without mounting the guarded screen`, async () => {
      // No stored token means nothing to verify, so the guard answers on the first render; the 401
      // is still stubbed so an unexpected restore is answered with the documented envelope.
      const api = installApi(rejectedSessionAnswers('TOKEN_REQUIRED'));

      const container = renderApp(guarded.url);
      await expectLoginScreen();

      expect(screen.queryByText(guarded.heading)).toBeNull();
      expect(container.textContent ?? '').not.toContain(guarded.heading);
      // The guard answers before the screen mounts, so its data is never requested.
      expect(api.paths()).toEqual([]);
      expect(api.paths().filter((path) => path.startsWith(guarded.resourcePath))).toEqual([]);
    });
  }

  for (const code of TOKEN_CODES) {
    it(`answers the stored token with 401 ${code}, ending the session and landing on login`, async () => {
      // A stored token is what makes the provider verify it, so each documented token code is
      // exercised through the real restore path rather than assumed.
      window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
      const api = installApi(rejectedSessionAnswers(code));

      renderApp('/cart');
      await expectLoginScreen();

      expect(screen.queryByText('Your cart')).toBeNull();
      // The rejected restore is the only request; the session is gone and the cart screen with it.
      expect(api.paths()).toEqual(['/auth/session']);
      expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  }
});

// ---------------------------------------------------------------------------
// A session still being restored
// ---------------------------------------------------------------------------

describe('loading session', () => {
  it('covers the two guarded paths that load no data of their own', () => {
    expect(LOADING_CASES).toHaveLength(2);
  });

  for (const guarded of LOADING_CASES) {
    it(`${guarded.pattern}: shows the restoring status and does not redirect while loading`, async () => {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
      const api = installApi(pendingSessionAnswers());

      renderApp(guarded.url);

      // The guard's placeholder is the only status region on the page.
      expect((await screen.findByRole('status')).getAttribute('role')).toBe('status');
      // No redirect: the session is neither verified nor absent yet, so bouncing a returning
      // visitor to the login form on reload would be wrong.
      expect(screen.queryByRole('heading', { name: LOGIN_HEADING, level: 1 })).toBeNull();
      expect(screen.queryByText(guarded.heading)).toBeNull();
      // The restore is in flight and no screen has mounted behind the placeholder.
      expect(api.paths()).toEqual(['/auth/session']);
      expect(api.paths().filter((path) => path.startsWith(guarded.resourcePath))).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// A verified session
// ---------------------------------------------------------------------------

describe('authenticated session', () => {
  for (const guarded of GUARDED_PATHS) {
    it(`${guarded.pattern}: renders the guarded screen instead of login`, async () => {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
      const api = installApi(verifiedSessionAnswers());

      renderApp(guarded.url);

      const heading = await screen.findByRole('heading', { name: guarded.heading, level: 1 });
      expect(heading.tagName).toBe('H1');
      expect(screen.queryByRole('heading', { name: LOGIN_HEADING, level: 1 })).toBeNull();
      // The restore, then exactly the reads that screen makes: nothing more is requested. The
      // heading a guarded screen publishes while its read is in flight (the reservation screen
      // renders its `<h1>` beside its loading status) is on the page before the effect that issues
      // the read has run, so the recorder is awaited rather than read once the heading resolves:
      // the list asserted is the screen's completed one, never the restore's alone.
      await waitFor(() => {
        expect(api.paths()).toEqual(['/auth/session', ...guarded.requests]);
      });
      // The cart is client state and has no endpoint (rule R-8), signed in or not.
      expect(api.paths().filter((path) => path.startsWith('/cart'))).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// The guard's own contract
// ---------------------------------------------------------------------------

describe('guard contract', () => {
  it('renders an authenticated child unchanged and adds no element around it', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
    installApi(verifiedSessionAnswers());

    const child = <p data-guard-child="kept">only a verified session reads this</p>;

    const container = render(
      <SessionProvider>
        <ProtectedRoute>{child}</ProtectedRoute>
      </SessionProvider>,
    ).container;

    const rendered = await screen.findByText('only a verified session reads this');
    expect(rendered.tagName).toBe('P');
    expect(rendered.getAttribute('data-guard-child')).toBe('kept');
    // The guard returns a fragment, so the child's parent is render's own container.
    expect(rendered.parentElement).toBe(container);
  });

  it('declares /login as the only address of the login screen', () => {
    const loginRows = routeManifest.filter((entry) => entry.module === 'client/src/views/LoginView.tsx');

    expect(loginRows).toHaveLength(1);
    expect(loginRows[0]?.path).toBe('/login');
    // The login screen is public: guarding it would make an anonymous visitor unreachable for it.
    expect(loginRows[0]?.requiresAuth).toBe(false);
  });

  it('guards exactly the six requiresAuth entries of the route manifest', () => {
    const guardedRows = routeManifest.filter((entry) => entry.requiresAuth);

    expect(guardedRows).toHaveLength(6);
    expect(guardedRows.map((entry) => entry.path).sort()).toEqual(
      GUARDED_PATHS.map((guarded) => guarded.pattern).sort(),
    );
    // Every guarded row is a real screen, so none of the six is a redirect or the not-found view.
    expect(guardedRows.every((entry) => entry.kind === 'screen' && entry.module !== null)).toBe(true);
  });

  it('leaves ownership to the API: a foreign order is a 404 not-found screen, never a 403', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
    installApi({
      '/auth/session': () => jsonResponse(200, SESSION_RESPONSE),
      [`/orders/${ORDER_ID}`]: () =>
        jsonResponse(404, { error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } }),
    });

    renderApp(`/orders/${ORDER_ID}`);

    // The guard admitted the visitor; the API's user-scoped query is what answered 404.
    expect(await screen.findByRole('heading', { name: 'Order not found', level: 1 })).not.toBeNull();
    expect(screen.getByText('We could not find that order in your account.')).not.toBeNull();
    expect(document.body.textContent ?? '').not.toContain('403');
  });
});

// ---------------------------------------------------------------------------
// A refused id is not a missing order: the screen says which failure it met
// ---------------------------------------------------------------------------

describe('order id failures', () => {
  it('tells an id the API refused apart from an order the API cannot find', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
    installApi({
      '/auth/session': () => jsonResponse(200, SESSION_RESPONSE),
      [`/orders/${MALFORMED_ORDER_ID}`]: () =>
        jsonResponse(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: INVALID_ORDER_ID_MESSAGE,
            details: [{ field: 'id', issue: 'not_a_valid_uuid' }],
          },
        }),
      [`/orders/${UNKNOWN_ORDER_ID}`]: () =>
        jsonResponse(404, { error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } }),
    });

    // The API validates the id before any lookup, so the screen reports the refusal itself and
    // echoes the API's message instead of discarding it behind the not-found copy.
    const refused = renderApp(`/orders/${MALFORMED_ORDER_ID}`);
    const refusedHeading = await within(refused).findByRole('heading', {
      name: 'Order link not valid',
      level: 1,
    });
    expect(refusedHeading).not.toBeNull();
    const refusal = within(refused).getByRole('alert');
    expect(refusal.getAttribute('data-code')).toBe('VALIDATION_ERROR');
    expect(refusal.textContent).toBe(INVALID_ORDER_ID_MESSAGE);
    expect(
      within(refused).getByText(
        'The link that brought you here is not a valid order address. Check it, or open your order history.',
      ),
    ).not.toBeNull();
    expect(within(refused).queryByRole('heading', { name: 'Order not found', level: 1 })).toBeNull();

    // A well-formed id that names no order keeps the not-found state, so the two stay apart.
    const missing = renderApp(`/orders/${UNKNOWN_ORDER_ID}`);
    const missingHeading = await within(missing).findByRole('heading', {
      name: 'Order not found',
      level: 1,
    });
    expect(missingHeading).not.toBeNull();
    expect(within(missing).getByText('We could not find that order in your account.')).not.toBeNull();
    expect(within(missing).queryByRole('heading', { name: 'Order link not valid', level: 1 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// A refused sign-in: the guard's hand-over outlives it
// ---------------------------------------------------------------------------

/** Notice the guard's `from=%2Fcart` produces above the sign-in form. */
const CART_RETURN_NOTICE = "Sign in to see your cart. We'll take you back there afterwards.";

/** Retry sentence the sign-in form offers only beside a highlighted field, never after a refusal. */
const LOGIN_RETRY_MESSAGE = 'Check the highlighted fields, then submit the form again to retry.';

/** Message the API answers a wrong password with; it names neither field. */
const REFUSED_MESSAGE = 'The email or password is incorrect.';

describe('rejected sign-in', () => {
  /**
   * @returns One answer per path: the first sign-in is refused with the documented envelope, the
   *   next one opens the session.
   */
  function refusingFirstSignIn(): Record<string, ApiAnswer> {
    let refused = false;

    return {
      '/auth/login': () => {
        if (refused) {
          return jsonResponse(200, { user: USER, token: STORED_TOKEN });
        }

        refused = true;
        return jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: REFUSED_MESSAGE } });
      },
    };
  }

  it('keeps the address, the notice and the way back when the password is refused', async () => {
    const user = userEvent.setup();
    installApi(refusingFirstSignIn());

    const router = createMemoryRouter(routes, { initialEntries: ['/cart'] });
    render(
      <SessionProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </SessionProvider>,
    );

    // The guard handed the anonymous visitor to the sign-in screen with the cart carried along.
    await expectLoginScreen();
    const handedOver = router.state.location;
    expect(handedOver.pathname).toBe('/login');
    expect(handedOver.search).toBe(`?${RETURN_PATH_PARAM}=%2Fcart`);
    expect(screen.getByRole('status').textContent).toBe(CART_RETURN_NOTICE);

    const email = screen.getByLabelText<HTMLInputElement>(/^Email/);
    const password = screen.getByLabelText<HTMLInputElement>(/^Password/);

    await user.type(email, USER.email);
    await user.type(password, 'wrong-password');
    await user.click(screen.getByRole('button', { name: LOGIN_HEADING }));

    const alert = await screen.findByRole('alert');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(alert.getAttribute('data-code')).toBe('INVALID_CREDENTIALS');
    expect(alert.textContent).toBe(REFUSED_MESSAGE);
    expect(screen.queryByText(LOGIN_RETRY_MESSAGE)).toBeNull();

    // A credential refusal is not a session expiry: the shell has no 401 to navigate away from, so
    // the address, the history entry and the notice the guard left behind all survive the refusal.
    expect(router.state.location.pathname).toBe(handedOver.pathname);
    expect(router.state.location.search).toBe(handedOver.search);
    expect(router.state.location.key).toBe(handedOver.key);
    expect(screen.getByRole('status').textContent).toBe(CART_RETURN_NOTICE);

    // Neither field is refused on its own: the whole of what the visitor learns is that one panel.
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(password.getAttribute('aria-invalid')).toBe('false');

    // The corrected password still completes the hand-over the guard began.
    await user.clear(password);
    await user.type(password, 'correct-password');
    await user.click(screen.getByRole('button', { name: LOGIN_HEADING }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cart');
    });
    expect(await screen.findByRole('heading', { name: 'Your cart', level: 1 })).not.toBeNull();
    expect(screen.queryByText(CART_RETURN_NOTICE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The return path the guard hands over: only a path on this application is resumed
// ---------------------------------------------------------------------------

/** The `from` value a prefix test alone would accept, which URL resolution turns into another origin. */
const CROSS_ORIGIN_FROM_ENTRY = '/login?from=%2F%5Cevil.example';

/** The promise every return notice ends with, absent whenever no notice is offered. */
const RETURN_PROMISE = "We'll take you back there afterwards.";

describe('return path guard', () => {
  /**
   * @returns One answer per path a successful sign-in and the catalog it lands on need, so the only
   *   thing that decides where the visitor ends up is the guard's verdict on the `from` value.
   */
  function acceptedSignInAnswers(): Record<string, ApiAnswer> {
    return {
      '/auth/login': () => jsonResponse(200, { user: USER, token: STORED_TOKEN }),
      '/categories': () => jsonResponse(200, { categories: [] }),
      '/menu-items': () => jsonResponse(200, { items: [] }),
    };
  }

  it('refuses a from value that resolves to another origin, so the sign-in lands on the menu', async () => {
    const user = userEvent.setup();
    installApi(acceptedSignInAnswers());

    // `/\evil.example` starts with a single `/` and not with `//`, yet URL resolution reads the
    // backslash as a path separator and makes it `http://evil.example/` — another origin, so the
    // value is not an internal path and is refused.
    const router = createMemoryRouter(routes, { initialEntries: [CROSS_ORIGIN_FROM_ENTRY] });
    render(
      <SessionProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </SessionProvider>,
    );

    await expectLoginScreen();
    // No return notice: the refused value produces neither the status line nor its promise of a
    // return, because there is no screen to return to.
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.body.textContent ?? '').not.toContain(RETURN_PROMISE);
    // The refused value is still on the address, so the refusal is the guard's, not the router's.
    expect(router.state.location.search).toBe('?from=%2F%5Cevil.example');

    await user.type(screen.getByLabelText<HTMLInputElement>(/^Email/), USER.email);
    await user.type(screen.getByLabelText<HTMLInputElement>(/^Password/), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: LOGIN_HEADING }));

    // Nothing to resume, so the completed sign-in lands exactly where a plain `/login` visit does.
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/menu');
    });
    expect(router.state.location.search).toBe('');
    // The catalog is a route-chunk of its own and a route change keeps the screen it replaces on
    // display until that chunk arrives, so the destination is awaited first: once the catalog is on
    // the page, the login screen it replaced must be gone.
    expect(await screen.findByRole('heading', { name: MENU_HEADING, level: 1 })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: LOGIN_HEADING, level: 1 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// A booking reference the view refuses is not a booking it cannot find
// ---------------------------------------------------------------------------

/** A booking reference that is not an id at all: the API mints every reservation id as a UUID. */
const MALFORMED_RESERVATION_ID = 'not-a-uuid-142857';

/** An id in the shape the API mints that names no booking in the caller's own list. */
const UNKNOWN_RESERVATION_ID = '51c5e571-d8c0-4eba-a498-e21b0ce35629';

describe('booking id failures', () => {
  it('tells a reference that never named a booking apart from a booking it cannot find', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
    // The API exposes no single-reservation read, so both cases answer from the one list the caller
    // owns: the screen is what has to tell a reference that never named a booking from an id whose
    // booking this list does not hold.
    installApi(verifiedSessionAnswers());

    const malformed = renderApp(`/reservations/${MALFORMED_RESERVATION_ID}`);
    const refusedHeading = await within(malformed).findByRole('heading', {
      name: 'Booking link not valid',
      level: 1,
    });
    expect(refusedHeading).not.toBeNull();
    expect(within(malformed).getByText('That booking reference is not a valid booking id.')).not.toBeNull();
    expect(within(malformed).queryByRole('heading', { name: 'Booking not found', level: 1 })).toBeNull();

    // A well-formed id the list does not hold keeps the not-found state, so the two stay apart.
    const missing = renderApp(`/reservations/${UNKNOWN_RESERVATION_ID}`);
    const missingHeading = await within(missing).findByRole('heading', {
      name: 'Booking not found',
      level: 1,
    });
    expect(missingHeading).not.toBeNull();
    expect(
      within(missing).getByText('We could not find that booking among your reservations.'),
    ).not.toBeNull();
    expect(within(missing).queryByRole('heading', { name: 'Booking link not valid', level: 1 })).toBeNull();
  });
});
