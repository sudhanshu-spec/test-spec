/**
 * @fileoverview Guard suite for `client/src/components/ProtectedRoute.tsx` and the six protected
 * entries of the route table declared in `client/src/main.tsx`.
 *
 * Every case drives the real route table through `createMemoryRouter`, so the guard under test is
 * the one production mounts: `ProtectedRoute` is applied by the manifest's `requiresAuth` rows, the
 * session comes from the real `SessionProvider` and the cart from the real `CartProvider`.
 *
 * Four concerns, one module (rule R-10):
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

import { render, screen, waitFor } from '@testing-library/react';
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
import { ProtectedRoute } from '../components/ProtectedRoute';
import { routeManifest, routes } from '../main';
import { CartProvider } from '../state/cart';
import { SessionProvider } from '../state/session';

// ---------------------------------------------------------------------------
// Fixtures: UUID-shaped ids, integer cents and the API's secret-free account (rule R-4)
// ---------------------------------------------------------------------------

/** Storage key of the opaque token; the session provider owns it, this suite only seeds it. */
const TOKEN_STORAGE_KEY = 'burger.auth.token';

/** 64 hex characters, the shape of the opaque tokens the API mints. */
const STORED_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/** Level-one heading of the login screen, which is what an anonymous visit must land on. */
const LOGIN_HEADING = 'Sign in';

/** Level-one heading of the registration screen, asserted absent to pin the target to `/login`. */
const REGISTER_HEADING = 'Create your account';

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
    heading: 'Order placed',
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
