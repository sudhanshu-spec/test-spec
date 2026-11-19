/**
 * @fileoverview Tests for the client's single HTTP seam, `client/src/api/client.ts`, and for the
 * 401 path that ends a session: the URL and headers `apiFetch` builds, the `ApiError` every failure
 * is mapped onto, and the session provider's `onUnauthorized` hook sending a guarded screen back to
 * `/login`.
 *
 * No request leaves the process. `fetch` is replaced through `vi.stubGlobal` in every case, and a
 * fake response carries only the three members the transport reads — `status`, `ok` and `json()` —
 * so a change to the seam surfaces here rather than inside a view. Nothing from the CommonJS root
 * package is imported or asserted (R-1, R-2); every account fixture is the API's secret-free
 * projection (R-4); and ownership failures are stubbed as 404 rather than 403 (R-5).
 *
 * @module client/src/__tests__/api-client.test
 */

import { createElement, useEffect } from 'react';
import type { JSX } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { login, logout, register, session } from '../api/auth';
import {
  ApiError,
  apiFetch,
  configureApiClient,
  type ApiErrorCode,
  type ApiFieldDetail,
} from '../api/client';
import { getItem, listCategories, listItems } from '../api/menu';
import { createOrder, getOrder, listOrders } from '../api/orders';
import { createReservation, listReservations } from '../api/reservations';
import type {
  CreateOrderInput,
  CreateReservationInput,
  LoginInput,
  RegisterInput,
  SessionResponse,
  User,
} from '../api/types';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { CartProvider } from '../state/cart';
import { SessionProvider } from '../state/session';
import { LoginView } from '../views/LoginView';

/** The token the transport is told to send; the API mints opaque values, so any string is one. */
const TEST_TOKEN = 'abc123';

/** A second token, used to prove the getter is read per request rather than captured once. */
const NEXT_TOKEN = 'def456';

/** The token already in storage when the session provider mounts. */
const STORED_TOKEN = 'stored-token-abc123';

/** Storage key the session provider owns; the only literal this suite shares with it. */
const TOKEN_STORAGE_KEY = 'burger.auth.token';

/** The account projection the API returns: no password hash and no salt exist to leak (R-4). */
const USER: User = {
  id: '6f0d5f2a-5f1b-4f4e-9a4b-1c2d3e4f5a6b',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  created_at: '2025-01-01T09:00:00.000Z',
};

/** Text the guarded element renders, so its disappearance can be asserted. */
const PROBE_TEXT = 'order probe';

/** Heading the login screen renders once the session is gone. */
const LOGIN_HEADING = 'Sign in';

/** A menu item id, shaped like the UUID the API issues. */
const MENU_ITEM_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** An order id, shaped like the UUID the API issues. */
const ORDER_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

/** Registration body the credential cases send; the API's own rules accept every value in it. */
const REGISTER_INPUT: RegisterInput = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse-battery',
};

/** Login body the credential cases send, naming the account registered above. */
const LOGIN_INPUT: LoginInput = { email: REGISTER_INPUT.email, password: REGISTER_INPUT.password };

/** Order body the credential cases send: one line, no note, and no amount a client could set (R-3). */
const ORDER_INPUT: CreateOrderInput = { items: [{ menu_item_id: MENU_ITEM_ID, quantity: 2 }] };

/** Reservation body the credential cases send: exactly the four fields the contract names. */
const RESERVATION_INPUT: CreateReservationInput = {
  reservation_date: '2030-01-01',
  reservation_time: '18:00',
  party_size: 2,
};

/**
 * The API's complete error vocabulary in `src/errors.js` order (R-6). Declared here rather than
 * imported because `client.ts` exposes the code type only, and a fourteenth code is the very thing
 * the mapping must refuse.
 */
const DOCUMENTED_CODES = [
  'VALIDATION_ERROR',
  'INVALID_CREDENTIALS',
  'TOKEN_REQUIRED',
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'EMAIL_ALREADY_REGISTERED',
  'CATEGORY_NOT_FOUND',
  'MENU_ITEM_NOT_FOUND',
  'MENU_ITEM_UNAVAILABLE',
  'ORDER_NOT_FOUND',
  'RESERVATION_CONFLICT',
  'ROUTE_NOT_FOUND',
  'INTERNAL_ERROR',
] as const satisfies readonly ApiErrorCode[];

/** The shape the transport calls `fetch` with, so the stub records typed arguments. */
type FetchImplementation = (input: string, init?: RequestInit) => Promise<Response>;

/** One recorded request: the URL the transport built and the init it passed beside it. */
type FetchCall = [url: string, init?: RequestInit];

/** The stub installed as the global `fetch`; holds one entry per request made. */
type FetchMock = Mock<FetchImplementation>;

/** The stub every case installs; assigned in `beforeEach` so no case inherits an implementation. */
let fetchMock: FetchMock;

/**
 * @param status - HTTP status, which also decides `ok`.
 * @param payload - The value `json()` resolves with.
 * @param options - `unparsable` makes `json()` reject, as a non-JSON body does.
 * @returns A response-shaped object carrying only the members `apiFetch` reads.
 */
function fakeResponse(
  status: number,
  payload?: unknown,
  options: { unparsable?: boolean } = {},
): Response {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async (): Promise<unknown> => {
      if (options.unparsable === true) {
        throw new SyntaxError('The response body is not JSON.');
      }
      return payload;
    },
  };

  return response as unknown as Response;
}

/**
 * Reads one recorded request, failing the test rather than throwing a `TypeError` when the
 * transport made no request at all.
 *
 * @param mock - The installed `fetch` stub.
 * @param index - Which recorded request to read.
 * @returns The URL and init of that request.
 */
function callAt(mock: FetchMock, index: number): FetchCall {
  const call = mock.mock.calls[index];
  expect(call).toBeDefined();
  return call!;
}

/**
 * Copies a request's headers into a plain record, whatever form they take.
 *
 * @param init - The init `fetch` received, if any.
 * @returns Header names mapped to their values; empty when the request carried none.
 */
function headersOf(init: RequestInit | undefined): Record<string, string> {
  const { headers } = init ?? {};

  if (headers === undefined) {
    return {};
  }

  if (headers instanceof Headers) {
    const copied: Record<string, string> = {};
    headers.forEach((value, name) => {
      copied[name] = value;
    });
    return copied;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

/**
 * Registers the hooks the session provider normally registers.
 *
 * @param getToken - What the transport should see as the current token.
 * @returns The unauthorized spy the registration installed.
 */
function registerHooks(getToken: () => string | null): Mock<() => void> {
  const onUnauthorized = vi.fn<() => void>();
  configureApiClient({ getToken, onUnauthorized });
  return onUnauthorized;
}

/**
 * @param code - The envelope's `code`.
 * @param message - The envelope's `message`.
 * @param details - Field details for a validation failure; omitted when there are none.
 * @returns The documented `{ error: { code, message, details? } }` envelope (R-6).
 */
function errorEnvelope(
  code: string,
  message: string,
  details?: readonly ApiFieldDetail[],
): unknown {
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details: details.map((detail) => ({ ...detail })) } };
}

/**
 * Awaits a request expected to fail and returns what it rejected with.
 *
 * @param request - The promise under test.
 * @returns The `ApiError` the transport threw.
 */
async function rejectionOf(request: Promise<unknown>): Promise<ApiError> {
  try {
    await request;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }

  throw new Error('The request resolved; an ApiError was expected.');
}

beforeEach(() => {
  // `client.ts` keeps the registered hooks in module state, so every case starts unregistered.
  configureApiClient(null);
  fetchMock = vi.fn<FetchImplementation>();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('Authorization header', () => {
  it('sends the token the getter returns as a Bearer credential', async () => {
    const onUnauthorized = registerHooks(() => TEST_TOKEN);
    fetchMock.mockResolvedValue(fakeResponse(200, { user: USER }));

    const response = await apiFetch<SessionResponse>('/auth/session');

    expect(response.user).toEqual(USER);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = callAt(fetchMock, 0);
    expect(url).toBe('/api/auth/session');
    expect(headersOf(init).Authorization).toBe(`Bearer ${TEST_TOKEN}`);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('sends no Authorization header when the getter returns no usable token', async () => {
    for (const token of [null, '']) {
      registerHooks(() => token);
      fetchMock.mockResolvedValue(fakeResponse(200, { categories: [] }));

      await apiFetch('/categories');
    }

    expect(fetchMock).toHaveBeenCalledTimes(2);

    for (const index of [0, 1]) {
      const [, init] = callAt(fetchMock, index);
      expect(headersOf(init).Authorization).toBeUndefined();
      expect(headersOf(init).Accept).toBe('application/json');
    }
  });

  it('reads the getter on every request, so the next call carries the new token', async () => {
    let currentToken: string | null = TEST_TOKEN;
    registerHooks(() => currentToken);
    fetchMock.mockResolvedValue(fakeResponse(200, { orders: [] }));

    await apiFetch('/orders');
    currentToken = NEXT_TOKEN;
    await apiFetch('/orders');

    expect(headersOf(callAt(fetchMock, 0)[1]).Authorization).toBe(`Bearer ${TEST_TOKEN}`);
    expect(headersOf(callAt(fetchMock, 1)[1]).Authorization).toBe(`Bearer ${NEXT_TOKEN}`);
  });
});

describe('credential scoping', () => {
  /**
   * Every call the client makes that reaches a menu, auth, order or reservation route, split by the
   * guard the API puts behind that route. The five public calls carry no credential; the seven
   * protected ones carry it. Each row drives the domain module's own function rather than
   * `apiFetch`, so a missing `credential: false` or a dropped default inside `menu.ts`, `auth.ts`,
   * `orders.ts` or `reservations.ts` fails here rather than in a view.
   */
  const CALLS: ReadonlyArray<{
    readonly call: string;
    readonly send: () => Promise<unknown>;
    readonly url: string;
    readonly credentialed: boolean;
  }> = [
    {
      call: 'listCategories()',
      send: () => listCategories(),
      url: '/api/categories',
      credentialed: false,
    },
    { call: 'listItems()', send: () => listItems(), url: '/api/menu-items', credentialed: false },
    {
      call: "listItems('burgers')",
      send: () => listItems('burgers'),
      url: '/api/menu-items?category=burgers',
      credentialed: false,
    },
    {
      call: 'getItem(id)',
      send: () => getItem(MENU_ITEM_ID),
      url: `/api/menu-items/${MENU_ITEM_ID}`,
      credentialed: false,
    },
    {
      call: 'register(input)',
      send: () => register(REGISTER_INPUT),
      url: '/api/auth/register',
      credentialed: false,
    },
    { call: 'login(input)', send: () => login(LOGIN_INPUT), url: '/api/auth/login', credentialed: false },
    { call: 'session()', send: () => session(), url: '/api/auth/session', credentialed: true },
    { call: 'logout()', send: () => logout(), url: '/api/auth/logout', credentialed: true },
    {
      call: 'createOrder(input)',
      send: () => createOrder(ORDER_INPUT),
      url: '/api/orders',
      credentialed: true,
    },
    { call: 'listOrders()', send: () => listOrders(), url: '/api/orders', credentialed: true },
    {
      call: 'getOrder(id)',
      send: () => getOrder(ORDER_ID),
      url: `/api/orders/${ORDER_ID}`,
      credentialed: true,
    },
    {
      call: 'createReservation(input)',
      send: () => createReservation(RESERVATION_INPUT),
      url: '/api/reservations',
      credentialed: true,
    },
    {
      call: 'listReservations()',
      send: () => listReservations(),
      url: '/api/reservations',
      credentialed: true,
    },
  ];

  it('sends the Bearer credential on the protected calls and on no public call', async () => {
    registerHooks(() => TEST_TOKEN);
    fetchMock.mockImplementation(
      async (url: string): Promise<Response> =>
        url === '/api/auth/logout' ? fakeResponse(204) : fakeResponse(200, {}),
    );

    for (const { call, send, url, credentialed } of CALLS) {
      const sent = fetchMock.mock.calls.length;
      await send();

      expect(fetchMock.mock.calls.length, call).toBe(sent + 1);
      const [requestedUrl, init] = callAt(fetchMock, sent);
      expect(requestedUrl, call).toBe(url);
      expect(headersOf(init).Accept, call).toBe('application/json');
      expect(headersOf(init).Authorization, call).toBe(
        credentialed ? `Bearer ${TEST_TOKEN}` : undefined,
      );
    }
  });
});

describe('base path', () => {
  it('prefixes the path with the literal /api base', async () => {
    registerHooks(() => TEST_TOKEN);
    fetchMock.mockResolvedValue(fakeResponse(200, { categories: [] }));

    await apiFetch('/categories');

    const [url, init] = callAt(fetchMock, 0);
    expect(url).toBe('/api/categories');
    expect(headersOf(init).Accept).toBe('application/json');
  });

  it('appends the declared query parameters, leaving undefined ones out', async () => {
    registerHooks(() => TEST_TOKEN);
    fetchMock.mockResolvedValue(fakeResponse(200, { items: [] }));

    await apiFetch('/menu-items', { query: { category: 'burgers', cursor: undefined } });

    expect(callAt(fetchMock, 0)[0]).toBe('/api/menu-items?category=burgers');
  });

  it('passes a path that already carries a query through without doubling or re-encoding it', async () => {
    registerHooks(() => TEST_TOKEN);
    fetchMock.mockResolvedValue(fakeResponse(200, { items: [] }));

    await apiFetch('/menu-items?category=burgers');

    expect(callAt(fetchMock, 0)[0]).toBe('/api/menu-items?category=burgers');
  });

  it('defaults to GET and passes POST through with a JSON body', async () => {
    registerHooks(() => TEST_TOKEN);
    fetchMock.mockResolvedValue(fakeResponse(200, { order: { id: MENU_ITEM_ID } }));

    await apiFetch('/orders');
    await apiFetch('/orders', { method: 'POST', body: { items: [{ menu_item_id: MENU_ITEM_ID, quantity: 2 }] } });

    const [getUrl, getInit] = callAt(fetchMock, 0);
    expect(getUrl).toBe('/api/orders');
    expect(getInit?.method).toBe('GET');
    expect(getInit?.body).toBeUndefined();
    expect(headersOf(getInit)['Content-Type']).toBeUndefined();

    const [, postInit] = callAt(fetchMock, 1);
    expect(postInit?.method).toBe('POST');
    expect(headersOf(postInit)['Content-Type']).toBe('application/json');
    expect(JSON.parse(String(postInit?.body))).toEqual({
      items: [{ menu_item_id: MENU_ITEM_ID, quantity: 2 }],
    });
  });
});

describe('204 responses', () => {
  it('resolves undefined for a 204 without reading a body', async () => {
    const json = vi.fn<() => Promise<unknown>>(async () => {
      throw new SyntaxError('A 204 carries no body.');
    });
    registerHooks(() => TEST_TOKEN);
    fetchMock.mockResolvedValue({ ok: true, status: 204, json } as unknown as Response);

    await expect(apiFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();

    expect(json).not.toHaveBeenCalled();
    const [url, init] = callAt(fetchMock, 0);
    expect(url).toBe('/api/auth/logout');
    expect(init?.method).toBe('POST');
    expect(headersOf(init).Authorization).toBe(`Bearer ${TEST_TOKEN}`);
  });
});

describe('error envelope mapping', () => {
  it('maps a 409 envelope onto an ApiError that keeps the status, code, message and details', async () => {
    const details = [{ field: 'email', issue: 'already_registered' }];
    registerHooks(() => null);
    fetchMock.mockResolvedValue(
      fakeResponse(409, errorEnvelope('EMAIL_ALREADY_REGISTERED', 'That email is already registered.', details)),
    );

    const error = await rejectionOf(
      apiFetch('/auth/register', { method: 'POST', body: { name: 'Ada', email: 'ada@example.com' } }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(409);
    expect(error.code).toBe('EMAIL_ALREADY_REGISTERED');
    expect(error.message).toBe('That email is already registered.');
    expect(error.details).toEqual(details);
  });

  it('keeps two validation details in the order the API sent them', async () => {
    const details = [
      { field: 'email', issue: 'not_a_valid_email_address' },
      { field: 'password', issue: 'too_short' },
    ];
    registerHooks(() => null);
    fetchMock.mockResolvedValue(fakeResponse(400, errorEnvelope('VALIDATION_ERROR', 'Check the fields below.', details)));

    const error = await rejectionOf(apiFetch('/auth/register', { method: 'POST', body: {} }));

    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toHaveLength(2);
    expect(error.details).toEqual(details);
    expect(error.details.map((detail) => detail.field)).toEqual(['email', 'password']);
  });

  it('reports an envelope without details as an ApiError with no field details', async () => {
    registerHooks(() => null);
    fetchMock.mockResolvedValue(fakeResponse(404, errorEnvelope('CATEGORY_NOT_FOUND', 'That category does not exist.')));

    const error = await rejectionOf(apiFetch('/menu-items', { query: { category: 'pizza' } }));

    expect(error.status).toBe(404);
    expect(error.code).toBe('CATEGORY_NOT_FOUND');
    expect(error.details).toEqual([]);
  });

  it('passes each of the thirteen documented codes through unchanged', async () => {
    registerHooks(() => null);
    expect(DOCUMENTED_CODES).toHaveLength(13);

    for (const code of DOCUMENTED_CODES) {
      fetchMock.mockResolvedValue(fakeResponse(400, errorEnvelope(code, 'Refused by the API.')));

      const error = await rejectionOf(apiFetch('/orders'));

      expect(error.code).toBe(code);
    }

    expect(fetchMock).toHaveBeenCalledTimes(DOCUMENTED_CODES.length);
  });

  it('never surfaces a code outside the thirteen', async () => {
    registerHooks(() => null);
    fetchMock.mockResolvedValue(fakeResponse(503, errorEnvelope('DATABASE_UNAVAILABLE', 'The service is unavailable.')));

    const error = await rejectionOf(apiFetch('/orders'));

    // The status and the server's message survive, but a fourteenth code does not (R-6).
    expect(error.status).toBe(503);
    expect(error.message).toBe('The service is unavailable.');
    expect(error.code).toBe('INTERNAL_ERROR');
  });
});

describe('malformed responses', () => {
  it('maps a body that is not JSON onto INTERNAL_ERROR and keeps the status', async () => {
    registerHooks(() => null);
    fetchMock.mockResolvedValue(fakeResponse(502, undefined, { unparsable: true }));

    const error = await rejectionOf(apiFetch('/categories'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('The request failed.');
    expect(error.details).toEqual([]);
  });

  it('maps a JSON body that is not an error envelope onto INTERNAL_ERROR', async () => {
    const payloads: unknown[] = [
      { foo: 'bar' },
      {},
      null,
      { error: { code: 'TOKEN_INVALID' } },
      { error: 'not an envelope' },
    ];
    registerHooks(() => null);

    for (const payload of payloads) {
      fetchMock.mockResolvedValue(fakeResponse(400, payload));

      const error = await rejectionOf(apiFetch('/categories'));

      expect(error.status).toBe(400);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.details).toEqual([]);
    }

    expect(fetchMock).toHaveBeenCalledTimes(payloads.length);
  });
});

describe('transport failure', () => {
  it('reports a request that never arrived as status 0 with INTERNAL_ERROR', async () => {
    registerHooks(() => TEST_TOKEN);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await rejectionOf(apiFetch('/orders'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('Unable to reach the server.');
    expect(error.details).toEqual([]);
  });
});

describe('configureApiClient(null)', () => {
  it('sends no Authorization header while no hooks are registered', async () => {
    configureApiClient(null);
    fetchMock.mockResolvedValue(fakeResponse(200, { categories: [] }));

    await expect(apiFetch('/categories')).resolves.toEqual({ categories: [] });

    expect(headersOf(callAt(fetchMock, 0)[1]).Authorization).toBeUndefined();
  });

  it('leaves a 401 as the documented ApiError rather than failing on the absent hook', async () => {
    configureApiClient(null);
    fetchMock.mockResolvedValue(fakeResponse(401, errorEnvelope('TOKEN_REQUIRED', 'Sign in to continue.')));

    const error = await rejectionOf(apiFetch('/orders'));

    // A missing hook must not turn the documented rejection into a TypeError from a null call.
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe('TOKEN_REQUIRED');
  });
});

describe('401 handling', () => {
  it('clears the stored token, renders the login screen and reports TOKEN_INVALID to the caller', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const failures: unknown[] = [];

    /** The guarded screen: asks for the caller's orders as soon as it is allowed to render. */
    function OrderProbe(): JSX.Element {
      useEffect(() => {
        void apiFetch('/orders').catch((error: unknown) => {
          failures.push(error);
        });
      }, []);

      return createElement('p', null, PROBE_TEXT);
    }

    fetchMock.mockImplementation(async (url: string): Promise<Response> => {
      if (url === '/api/auth/session') {
        return fakeResponse(200, { user: USER });
      }
      if (url === '/api/orders') {
        return fakeResponse(401, errorEnvelope('TOKEN_INVALID', 'Your session is no longer valid. Sign in again.'));
      }
      return fakeResponse(500, errorEnvelope('INTERNAL_ERROR', `Unexpected request to ${url}.`));
    });

    render(
      createElement(
        SessionProvider,
        null,
        createElement(
          CartProvider,
          null,
          createElement(
            MemoryRouter,
            { initialEntries: ['/cart'] },
            createElement(
              Routes,
              null,
              createElement(Route, { path: '/login', element: createElement(LoginView) }),
              createElement(Route, {
                path: '/cart',
                element: createElement(ProtectedRoute, null, createElement(OrderProbe)),
              }),
            ),
          ),
        ),
      ),
    );

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: LOGIN_HEADING })).not.toBeNull();
    });
    await waitFor(() => {
      expect(failures).toHaveLength(1);
    });

    // The handler the session provider registered: the token is gone from storage and from state.
    expect(removeItem).toHaveBeenCalledWith(TOKEN_STORAGE_KEY);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();

    // The guarded screen gave way to the login form.
    expect(screen.queryByText(PROBE_TEXT)).toBeNull();
    const heading = screen.queryByRole('heading', { name: LOGIN_HEADING });
    expect(heading).not.toBeNull();
    expect((heading as HTMLElement).textContent).toBe(LOGIN_HEADING);

    // The caller learned which documented code failed it.
    expect(failures[0]).toBeInstanceOf(ApiError);
    const failure = failures[0] as ApiError;
    expect(failure.status).toBe(401);
    expect(failure.code).toBe('TOKEN_INVALID');
    expect(failure.message).toBe('Your session is no longer valid. Sign in again.');

    // One restore and one guarded read, both credentialled, and nothing cart-shaped (R-8).
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [sessionUrl, sessionInit] = callAt(fetchMock, 0);
    expect(sessionUrl).toBe('/api/auth/session');
    expect(sessionInit?.method).toBe('GET');
    expect(headersOf(sessionInit).Authorization).toBe(`Bearer ${STORED_TOKEN}`);
    const [ordersUrl, ordersInit] = callAt(fetchMock, 1);
    expect(ordersUrl).toBe('/api/orders');
    expect(ordersInit?.method).toBe('GET');
    expect(headersOf(ordersInit).Authorization).toBe(`Bearer ${STORED_TOKEN}`);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/auth/session', '/api/orders']);
  });

  /**
   * The two 401s the API reports through one status: a rejected sign-in, which refuses the
   * credentials that request offered to be checked, and an expired token, which refuses the session
   * the client holds. Only the second has a session behind it to end, so only the second reaches
   * the unauthorized hook; both still throw the code their envelope carried.
   */
  const UNAUTHORIZED_RESPONSES: ReadonlyArray<{
    readonly code: ApiErrorCode;
    readonly send: () => Promise<unknown>;
    readonly reportsSession: boolean;
  }> = [
    { code: 'INVALID_CREDENTIALS', send: () => login(LOGIN_INPUT), reportsSession: false },
    { code: 'TOKEN_EXPIRED', send: () => session(), reportsSession: true },
  ];

  it('reports only a refused session to the unauthorized hook, and throws either code unchanged', async () => {
    for (const { code, send, reportsSession } of UNAUTHORIZED_RESPONSES) {
      const onUnauthorized = registerHooks(() => TEST_TOKEN);
      fetchMock.mockResolvedValue(fakeResponse(401, errorEnvelope(code, 'Refused by the API.')));

      const error = await rejectionOf(send());

      expect(onUnauthorized, code).toHaveBeenCalledTimes(reportsSession ? 1 : 0);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status, code).toBe(401);
      expect(error.code, code).toBe(code);
    }
  });
});
