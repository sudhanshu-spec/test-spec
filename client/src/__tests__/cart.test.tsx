/**
 * @fileoverview Client cart behaviour suite for `client/src/state/cart.tsx`, the
 * Place Order step of `client/src/views/CartView.tsx` and the two screens that
 * feed the cart, `MenuCatalogView` (screen 3) and `MenuItemView` (screen 4) —
 * success criterion 7, and the client-side proof of rules R-8 and R-3.
 *
 * Every case renders the real providers — `SessionProvider` outside
 * `CartProvider`, inside a `MemoryRouter` — and reads the cart through a probe
 * component rather than a stub context, so the mounting order the client ships
 * is the order under test. Network calls reach a hand-built `fetch` stub: no
 * server runs, no request leaves the process, and no response shape is invented
 * beyond the documented contracts.
 *
 * What the suite proves:
 * - `add`, `updateQuantity`, `remove` and `clear` behave as the module
 *   documents, including the merge of a repeat addition and the 1..20 clamp the
 *   order endpoint requires of every line;
 * - the cart screen's quantity field can be emptied and retyped, with the typed
 *   number committed and the line's display total following it;
 * - `itemCount` and `totalCents` are display figures over integer cents, never
 *   a price authority;
 * - a confirmed order empties the cart, sends only a menu item id and a quantity
 *   per line, and the confirmation shows the server's `total_cents` rather than
 *   the cart's own sum (rule R-3);
 * - logging out empties the cart, which holds only while `CartProvider` sits
 *   inside `SessionProvider` (rule R-8);
 * - the cart writes nothing to `localStorage` or `sessionStorage`, never calls a
 *   cart endpoint, and is empty after a reload-shaped remount (rule R-8);
 * - the catalog filters by the `category` query parameter rather than by state of
 *   its own: a deep link lists only that category's items, and choosing another
 *   filter control re-reads the items through a new query while the category
 *   strip is fetched once and the screen is never remounted (screen 3);
 * - the strip is one control set, as it presents itself: a single roving tab stop
 *   on the selected chip, arrow keys and Home/End moving focus without moving the
 *   selection, and Enter applying the filter of the option the arrows reached;
 * - a load that fails both of the catalog's requests is announced once, from the
 *   one live region the screen keeps, and a retry that fails again changes that
 *   announcement and says the same sentence inside the panel;
 * - the item detail's own add action moves the real cart state by the quantity
 *   the shopper chose, announces it in place, and asks the API for no cart
 *   (screen 4, rule R-8);
 * - the item detail tells an id the API refuses as malformed apart from an id
 *   that names no item, echoing the API's own message for the refusal instead of
 *   discarding it behind the not-found copy (screen 4).
 *
 * Those two screens are covered here rather than in suites of their own because
 * the client's test inventory is closed at the six suites this delivery names,
 * and because the evidence the detail screen owes is the cart state this suite
 * already mounts.
 *
 * Fixtures carry the secret-free user projection only (`id`, `name`, `email`,
 * `created_at`), so no response here could carry a password or token hash
 * (rule R-4).
 *
 * @module client/src/__tests__/cart.test
 */

import { useEffect, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatCents } from '../api/format';
import { getOrder } from '../api/orders';
import type { Category, MenuItem, Order, User } from '../api/types';
import { CartProvider, useCart } from '../state/cart';
import type { CartValue } from '../state/cart';
import { SessionProvider, TOKEN_STORAGE_KEY, useSession } from '../state/session';
import type { SessionValue } from '../state/session';
import { CartView } from '../views/CartView';
import { MenuCatalogView } from '../views/MenuCatalogView';
import { MenuItemView } from '../views/MenuItemView';

/** Opaque session token handed to the client by the login and session endpoints. */
const TOKEN = '0f8a4c2e6b1d9357a0c4e8b2d6f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6';

/** The account every authenticated payload carries: the API's secret-free projection. */
const AUTH_USER: User = {
  id: 'user-7d1f',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  created_at: '2024-05-01T12:00:00.000Z',
};

/** Two menu items whose prices make the display arithmetic in this suite checkable by hand. */
const BURGER = makeItem({ id: 'item-burger', name: 'Classic Burger', price_cents: 1299 });
const FRIES = makeItem({ id: 'item-fries', name: 'Sea Salt Fries', price_cents: 450 });

/** The two categories the catalog's filter strip is built from, in display order. */
const BURGERS_CATEGORY: Category = {
  id: 'category-burgers',
  name: 'Burgers',
  slug: 'burgers',
  display_order: 1,
};
const DRINKS_CATEGORY: Category = {
  id: 'category-drinks',
  name: 'Drinks',
  slug: 'drinks',
  display_order: 2,
};

/**
 * An item of the second category. A filter that is dropped, or a query that is
 * not rewritten, shows up as this row appearing where it does not belong.
 */
const SHAKE = makeItem({
  id: 'item-shake',
  name: 'Vanilla Shake',
  price_cents: 550,
  category: { id: DRINKS_CATEGORY.id, name: DRINKS_CATEGORY.name, slug: DRINKS_CATEGORY.slug },
});

/**
 * Builds a menu item payload, so a case states only the fields it cares about.
 *
 * @param overrides - The item's identity and price, plus any other field to set.
 * @returns The complete `MenuItem` payload the API answers with.
 */
function makeItem(overrides: Partial<MenuItem> & Pick<MenuItem, 'id' | 'name' | 'price_cents'>): MenuItem {
  return {
    description: 'Chuck patty, pickles, house sauce.',
    image_url: null,
    is_available: true,
    category: { id: 'category-burgers', name: 'Burgers', slug: 'burgers' },
    ...overrides,
  };
}

/** One request the transport made, flattened to the parts a case asserts on. */
interface RecordedCall {
  /** The URL exactly as `apiFetch` composed it, `/api` prefix included. */
  readonly url: string;
  /** The HTTP method, defaulting to GET as the transport does. */
  readonly method: string;
  /** The serialised body, or null for a request that sent none. */
  readonly body: string | null;
  /** The `Authorization` header, or null when the request carried none. */
  readonly authorization: string | null;
}

/** One stubbed endpoint: an exact path, its method and the response it answers with. */
interface StubRoute {
  readonly path: string;
  readonly method: 'GET' | 'POST';
  /** The answer, or a promise that stays pending while a case reads an in-flight state. */
  readonly respond: () => Response | Promise<Response>;
}

/** The stub installed as the global `fetch`, with every call it recorded. */
interface FetchStub {
  readonly mock: ReturnType<typeof vi.fn>;
  readonly calls: RecordedCall[];
}

/** The parts of a `Response` this client reads, built by hand so no server is needed. */
interface FakeResponseOptions {
  readonly status: number;
  readonly body?: unknown;
  readonly json?: () => Promise<unknown>;
}

/**
 * Reads one header from a recorded request. The transport builds its headers as
 * a plain object, which is the form this reads.
 *
 * @param init - The request init the transport passed to `fetch`.
 * @param name - The header name, in the casing the transport uses.
 * @returns The header's value, or null when the request did not carry it.
 */
function headerOf(init: RequestInit | undefined, name: string): string | null {
  const headers = init?.headers as Record<string, string> | undefined;
  return headers?.[name] ?? null;
}

/**
 * Builds a response carrying only what `apiFetch` reads: `status`, `ok` and
 * `json`. An explicit `json` lets a case prove the body was never parsed.
 *
 * @param options - The status, the payload the body resolves with, or a custom reader.
 * @returns The response, typed as the transport expects.
 */
function fakeResponse(options: FakeResponseOptions): Response {
  const reader =
    options.json ??
    (async (): Promise<unknown> => {
      if (!('body' in options)) {
        throw new Error('This stubbed answer carries no body.');
      }
      return options.body;
    });

  return {
    status: options.status,
    ok: options.status >= 200 && options.status < 300,
    json: reader,
  } as unknown as Response;
}

/**
 * Installs a `fetch` stub answering the given routes and records every call. A
 * request no route matches throws, which surfaces as the transport's own
 * unreachable-server failure instead of passing as an empty answer.
 *
 * @param routes - The endpoints this case expects to be called.
 * @returns The stub and the calls it recorded, in request order.
 */
function stubFetch(routes: readonly StubRoute[]): FetchStub {
  const calls: RecordedCall[] = [];
  const mock = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? init.body : null;
    calls.push({ url: input, method, body, authorization: headerOf(init, 'Authorization') });

    const matched = routes.find((route) => route.path === input && route.method === method);

    if (matched === undefined) {
      throw new Error(`No stub answers ${method} ${input}.`);
    }

    return matched.respond();
  });

  vi.stubGlobal('fetch', mock);
  return { mock, calls };
}

/** The session restore every render makes, answering the stored token's account. */
const SESSION_ROUTE: StubRoute = {
  path: '/api/auth/session',
  method: 'GET',
  respond: () => fakeResponse({ status: 200, body: { user: AUTH_USER } }),
};

/** What a case can read back from the mounted tree. */
interface Probe {
  cart: CartValue | null;
  session: SessionValue | null;
}

/**
 * Reads both providers and renders their figures as text, so a case can assert
 * on either the captured value or the rendered document.
 *
 * @param props - The holder the rendered values are written to.
 * @returns The probe's text: session status, item count, display total and line count.
 */
function CartProbe({ probe }: { readonly probe: Probe }): JSX.Element {
  const cart = useCart();
  const session = useSession();

  probe.cart = cart;
  probe.session = session;

  return (
    <output data-testid="probe">
      {`status=${session.status};count=${cart.itemCount};total=${cart.totalCents};lines=${cart.items.length}`}
    </output>
  );
}

/**
 * Renders the confirmation destination the cart navigates to on success. It
 * reads the order back through the real `getOrder`, so the figure on screen is
 * the amount the API returned rather than anything the cart computed.
 *
 * The confirmation screen module is deliberately not imported: this suite stays
 * within its declared dependencies, so the probe calls the same api module the
 * screen calls instead of borrowing the screen's markup.
 *
 * @returns The confirmation screen's id and, once loaded, its formatted total.
 */
function OrderConfirmationProbe(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (id === undefined) {
      return;
    }

    void getOrder(id).then(setOrder, () => {
      setOrder(null);
    });
  }, [id]);

  return (
    <section>
      <h1>Order confirmation</h1>
      <p data-testid="confirmation-id">{id ?? ''}</p>
      {order === null ? null : <p data-testid="confirmation-total">{formatCents(order.total_cents)}</p>}
    </section>
  );
}

/** What a case may vary about the rendered tree. */
interface RenderOptions {
  /** The router's initial location; `/` unless a case mounts a screen. */
  readonly entries?: readonly string[];
  /** Routes to render beside the probe, for the cases that mount `CartView`. */
  readonly content?: ReactNode;
  /** Endpoints this case expects besides the session restore every render makes. */
  readonly routes?: readonly StubRoute[];
}

/** The mounted tree and the two readers a case asserts through. */
interface Harness {
  readonly probe: Probe;
  readonly fetchStub: FetchStub;
  readonly view: ReturnType<typeof render>;
}

/**
 * Mounts the provider pair the client ships, with a router inside it, beside a
 * probe that exposes the cart and the session.
 *
 * @param options - Initial router location and any routes to render.
 * @returns The harness, including the recorded requests.
 */
function renderHarness(options: RenderOptions = {}): Harness {
  const probe: Probe = { cart: null, session: null };
  const fetchStub = stubFetch((options.routes ?? []).concat(SESSION_ROUTE));
  const entries = [...(options.entries ?? ['/'])];

  const view = render(
    <SessionProvider>
      <CartProvider>
        <MemoryRouter initialEntries={entries}>
          <CartProbe probe={probe} />
          {options.content}
        </MemoryRouter>
      </CartProvider>
    </SessionProvider>,
  );

  return { probe, fetchStub, view };
}

/**
 * @param probe - The rendered probe.
 * @returns The cart value of the latest render.
 * @throws {Error} When read before the tree has rendered once.
 */
function cartOf(probe: Probe): CartValue {
  if (probe.cart === null) {
    throw new Error('The cart probe has not rendered yet.');
  }
  return probe.cart;
}

/**
 * @param probe - The rendered probe.
 * @returns The session value of the latest render.
 * @throws {Error} When read before the tree has rendered once.
 */
function sessionOf(probe: Probe): SessionValue {
  if (probe.session === null) {
    throw new Error('The session probe has not rendered yet.');
  }
  return probe.session;
}

/**
 * Waits for the mount-time session restore, so a case starts from a resolved
 * status instead of the 'loading' one the first render reports.
 *
 * @param probe - The rendered probe.
 */
async function awaitAuthenticated(probe: Probe): Promise<void> {
  await waitFor(() => {
    expect(sessionOf(probe).status).toBe('authenticated');
  });
}

/**
 * The order the API answers the Place Order request with. Its `total_cents` is
 * deliberately lower than the cart's own display sum, which is what proves the
 * confirmation renders the server's figure rather than the client's.
 */
const ORDER_FIXTURE: Order = {
  id: 'order-9c4e',
  status: 'confirmed',
  total_cents: 2750,
  notes: null,
  created_at: '2024-05-02T18:30:00.000Z',
  lines: [
    {
      id: 'line-1',
      menu_item_id: BURGER.id,
      name: BURGER.name,
      quantity: 2,
      unit_price_cents: 1250,
      line_total_cents: 2500,
    },
    {
      id: 'line-2',
      menu_item_id: FRIES.id,
      name: FRIES.name,
      quantity: 1,
      unit_price_cents: 250,
      line_total_cents: 250,
    },
  ],
};

/** The two order endpoints the checkout step calls: place, then read back. */
const ORDER_ROUTES: readonly StubRoute[] = [
  {
    path: '/api/orders',
    method: 'POST',
    respond: () => fakeResponse({ status: 201, body: { order: ORDER_FIXTURE } }),
  },
  {
    path: `/api/orders/${ORDER_FIXTURE.id}`,
    method: 'GET',
    respond: () => fakeResponse({ status: 200, body: { order: ORDER_FIXTURE } }),
  },
];

/**
 * The order endpoint's answer that never settles, so a case can read the state the
 * screen renders while the request is still in flight. Nothing waits on it and the
 * pending reply is discarded when the test ends.
 */
const PENDING_ORDER_ROUTE: StubRoute = {
  path: '/api/orders',
  method: 'POST',
  respond: () => new Promise<Response>(() => undefined),
};

/** The cart screen and the confirmation destination it navigates to on success. */
const CHECKOUT_CONTENT = (
  <Routes>
    <Route path="/cart" element={<CartView />} />
    <Route path="/orders/:id" element={<OrderConfirmationProbe />} />
  </Routes>
);

/** The checkout action's label, and the one it carries while the order is in flight. */
const PLACE_ORDER_LABEL = 'Place order';
const PLACING_ORDER_LABEL = 'Placing order…';

/** The mounted checkout flow, with the request it posted. */
interface PlacedOrder {
  readonly harness: Harness;
  readonly posted: RecordedCall | undefined;
}

/**
 * Mounts the cart screen, seeds it with two lines and clicks Place order,
 * waiting until the confirmation destination has rendered.
 *
 * @returns The harness and the recorded POST request.
 */
async function placeOrder(): Promise<PlacedOrder> {
  const user = userEvent.setup();
  const harness = renderHarness({ entries: ['/cart'], content: CHECKOUT_CONTENT, routes: ORDER_ROUTES });
  await awaitAuthenticated(harness.probe);

  act(() => {
    const cart = cartOf(harness.probe);
    cart.add(BURGER, 2);
    cart.add(FRIES, 1);
  });

  await user.click(screen.getByRole('button', { name: 'Place order' }));
  await screen.findByTestId('confirmation-id');

  return { harness, posted: harness.fetchStub.calls.find((call) => call.method === 'POST') };
}

/** The exact `listItems` URL for the burgers category: the stub matches query strings verbatim. */
const BURGERS_ITEMS_URL = '/api/menu-items?category=burgers';

/** The exact `listItems` URL for the drinks category. */
const DRINKS_ITEMS_URL = '/api/menu-items?category=drinks';

/** The URL the unfiltered call builds, which the 'All items' control asks for. */
const ALL_ITEMS_URL = '/api/menu-items';

/** Labels copied from the screens themselves: the filter strip's toolbar, and the add affordance. */
const FILTER_STRIP_LABEL = 'Filter the menu by category';
const ALL_ITEMS_LABEL = 'All items';
const ADD_TO_CART_LABEL = 'Add to cart';

/**
 * Builds one `/api/menu-items` answer at the exact URL the catalog's call builds.
 *
 * @param path - The URL with its query string, as `listItems` composes it.
 * @param items - The items the API answers that selection with.
 * @returns The stub route for that selection.
 */
function itemsRoute(path: string, items: readonly MenuItem[]): StubRoute {
  return { path, method: 'GET', respond: () => fakeResponse({ status: 200, body: { items } }) };
}

/** The category strip, answered once on mount and again only after a retry. */
const CATEGORIES_ROUTE: StubRoute = {
  path: '/api/categories',
  method: 'GET',
  respond: () => fakeResponse({ status: 200, body: { categories: [BURGERS_CATEGORY, DRINKS_CATEGORY] } }),
};

/** The sentence the catalog prefixes each failed request with, copied from the screen. */
const CATEGORY_REQUEST_SUMMARY = 'The menu categories could not be loaded.';
const ITEMS_REQUEST_SUMMARY = 'The menu could not be loaded.';

/** The sentence the catalog adds to a failure once that request has been retried. */
const RETRY_NOTE = 'Tried again, and it is still unavailable.';

/** What the stubbed API says when a request fails: every case asserts on these words, never the transport's. */
const CATEGORY_FAILURE_MESSAGE = 'The categories could not be read just now.';
const ITEMS_FAILURE_MESSAGE = 'The items could not be read just now.';

/**
 * Builds one endpoint that answers 502 with the documented envelope, so the view
 * renders the API's own sentence for the failure.
 *
 * @param path - The URL the failing request is made to, query string included.
 * @param message - The envelope's message for that failure.
 * @returns The stub route for that endpoint.
 */
function failureRoute(path: string, message: string): StubRoute {
  return {
    path,
    method: 'GET',
    respond: () => fakeResponse({ status: 502, body: { error: { code: 'INTERNAL_ERROR', message } } }),
  };
}

/** Both of the catalog's requests failing, at the URLs a bare '/menu' calls. */
const FAILING_CATALOG_ROUTES: readonly StubRoute[] = [
  failureRoute(CATEGORIES_ROUTE.path, CATEGORY_FAILURE_MESSAGE),
  failureRoute(ALL_ITEMS_URL, ITEMS_FAILURE_MESSAGE),
];

/** The deep-link case's answers: the strip and the one category the query names. */
const BURGERS_ONLY_ROUTES: readonly StubRoute[] = [CATEGORIES_ROUTE, itemsRoute(BURGERS_ITEMS_URL, [BURGER])];

/** Every answer a filter change may reach for: both categories and the whole catalog. */
const CATALOG_ROUTES: readonly StubRoute[] = [
  CATEGORIES_ROUTE,
  itemsRoute(BURGERS_ITEMS_URL, [BURGER]),
  itemsRoute(DRINKS_ITEMS_URL, [SHAKE]),
  itemsRoute(ALL_ITEMS_URL, [BURGER, SHAKE]),
];

/** The catalog screen on the route the client's own route table gives it. */
const CATALOG_CONTENT = (
  <Routes>
    <Route path="/menu" element={<MenuCatalogView />} />
  </Routes>
);

/** The item detail screen on the `/menu/:id` route the client's route table gives it. */
const ITEM_DETAIL_CONTENT = (
  <Routes>
    <Route path="/menu/:id" element={<MenuItemView />} />
  </Routes>
);

/** The one item the detail screen reads, at the path `getItem` builds for it. */
const DETAIL_ROUTES: readonly StubRoute[] = [
  {
    path: `/api/menu-items/${BURGER.id}`,
    method: 'GET',
    respond: () => fakeResponse({ status: 200, body: { item: BURGER } }),
  },
];

/** A menu item id the API refuses as malformed: `GET /api/menu-items/:id` validates before it looks. */
const MALFORMED_ITEM_ID = 'not-a-uuid-142857';

/** An id in the shape the API mints that names no item, which the API answers with its not-found code. */
const UNKNOWN_ITEM_ID = '11111111-2222-3333-4444-555555555555';

/** The message the API answers a malformed menu item id with; the screen echoes it verbatim. */
const INVALID_ID_MESSAGE = 'The menu item id must be a valid UUID.';

/** The API's two answers for the two id failures the detail screen has to tell apart. */
const ID_FAILURE_ROUTES: readonly StubRoute[] = [
  {
    path: `/api/menu-items/${MALFORMED_ITEM_ID}`,
    method: 'GET',
    respond: () =>
      fakeResponse({
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: INVALID_ID_MESSAGE,
            details: [{ field: 'id', issue: 'not_a_valid_uuid' }],
          },
        },
      }),
  },
  {
    path: `/api/menu-items/${UNKNOWN_ITEM_ID}`,
    method: 'GET',
    respond: () =>
      fakeResponse({
        status: 404,
        body: { error: { code: 'MENU_ITEM_NOT_FOUND', message: 'No menu item matches that id.' } },
      }),
  },
];

/**
 * @returns The catalog's filter strip, found by the composite-widget role it
 *   presents itself with.
 */
function filterStrip(): HTMLElement {
  return screen.getByRole('toolbar', { name: FILTER_STRIP_LABEL });
}

/** @returns The strip's options, in render order. */
function filterOptions(): readonly HTMLButtonElement[] {
  return within(filterStrip()).getAllByRole<HTMLButtonElement>('button');
}

/**
 * @returns The labels of the filter strip's pressed controls, in render order —
 *   that is, the selection the catalog is showing.
 */
function pressedFilterLabels(): readonly string[] {
  return filterOptions()
    .filter((control) => control.getAttribute('aria-pressed') === 'true')
    .map((control) => control.textContent ?? '');
}

/**
 * @returns The labels of the options Tab reaches, in render order: the strip's
 *   roving tab stop, which is one option and never none.
 */
function tabStopLabels(): readonly string[] {
  return filterOptions()
    .filter((option) => option.tabIndex === 0)
    .map((option) => option.textContent ?? '');
}

/**
 * @returns The label of the option holding focus, or null when focus is not inside
 *   the strip at all.
 */
function focusedFilterLabel(): string | null {
  const active = document.activeElement;
  const focused = filterOptions().find((option) => option === active);

  return focused === undefined ? null : (focused.textContent ?? '');
}

/**
 * Picks the add control a case should click. Callers pass every button carrying the
 * label, so the helper still selects the single enabled control should a screen
 * ever render a second, inert one.
 *
 * @param controls - Every button carrying the add-to-cart label.
 * @returns The one enabled control.
 * @throws {Error} When the enabled controls are not exactly one.
 */
function enabledAddControl(controls: readonly HTMLButtonElement[]): HTMLButtonElement {
  const enabled = controls.filter((control) => !control.disabled);
  const only = enabled.length === 1 ? enabled[0] : undefined;

  if (only === undefined) {
    throw new Error(`Expected exactly one enabled add-to-cart control, found ${enabled.length}.`);
  }

  return only;
}

/**
 * Finds the inline message a control announces, which is the element its
 * `aria-describedby` names rather than a message somewhere else on the screen.
 *
 * @param control - The input the message is attached to.
 * @returns The last described element, which is where a field's message sits, or
 *   null when the control is described by nothing.
 */
function describedElement(control: HTMLElement): HTMLElement | null {
  const ids = control.getAttribute('aria-describedby');

  if (ids === null) {
    return null;
  }

  return document.getElementById(ids.split(' ').pop() ?? '');
}

beforeEach(() => {
  // The stored token is the only user data a fixture carries: the session
  // restores through it, and its restore request answers the account.
  window.localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('add', () => {
  it('appends one line carrying the item id, name, price and quantity 1', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER);
    });

    const cart = cartOf(harness.probe);
    expect(cart.items).toHaveLength(1);
    expect(cart.itemCount).toBe(1);

    const line = cart.items[0];
    expect(line?.menu_item_id).toBe(BURGER.id);
    expect(line?.name).toBe(BURGER.name);
    expect(line?.price_cents).toBe(BURGER.price_cents);
    expect(line?.image_url).toBeNull();
    expect(line?.quantity).toBe(1);
  });

  it('sets the requested quantity on a first addition', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER, 3);
    });

    expect(cartOf(harness.probe).items[0]?.quantity).toBe(3);
    expect(cartOf(harness.probe).itemCount).toBe(3);
  });

  it('merges a repeat addition of the same item into one line', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 2);
      cart.add(BURGER, 3);
    });

    const cart = cartOf(harness.probe);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.menu_item_id).toBe(BURGER.id);
    expect(cart.items[0]?.quantity).toBe(5);
    expect(cart.itemCount).toBe(5);
  });

  it('clamps a merged line at the per-line maximum of 20', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 20);
      cart.add(BURGER, 5);
    });

    const cart = cartOf(harness.probe);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(20);
  });

  it('keeps two different items as two lines, in the order they were added', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER);
      cart.add(FRIES);
    });

    const cart = cartOf(harness.probe);
    expect(cart.items.map((line) => line.menu_item_id)).toEqual([BURGER.id, FRIES.id]);
    expect(cart.itemCount).toBe(2);
  });
});

describe('updateQuantity', () => {
  it('clamps a quantity above the maximum of 20', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER, 2);
    });

    act(() => {
      cartOf(harness.probe).updateQuantity(BURGER.id, 21);
    });
    expect(cartOf(harness.probe).items[0]?.quantity).toBe(20);

    act(() => {
      cartOf(harness.probe).updateQuantity(BURGER.id, 25);
    });
    expect(cartOf(harness.probe).items[0]?.quantity).toBe(20);
  });

  it('lifts a fractional quantity to the floor of one', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER, 5);
    });

    act(() => {
      cartOf(harness.probe).updateQuantity(BURGER.id, 0.5);
    });

    expect(cartOf(harness.probe).items[0]?.quantity).toBe(1);
  });

  it('clamps a quantity of 0 up to the floor of one', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 2);
      cart.add(FRIES, 1);
    });

    act(() => {
      cartOf(harness.probe).updateQuantity(BURGER.id, 0);
    });

    // Zero is outside the range the order endpoint accepts, so it is clamped up
    // to the floor rather than read as a request to drop the line: `remove` is
    // the only mutation that does that.
    const cart = cartOf(harness.probe);
    expect(cart.items.map((line) => line.menu_item_id)).toEqual([BURGER.id, FRIES.id]);
    expect(cart.items.map((line) => line.quantity)).toEqual([1, 1]);
    expect(cart.itemCount).toBe(2);
    expect(cart.totalCents).toBe(BURGER.price_cents + FRIES.price_cents);
  });

  it('clamps a negative quantity up to the floor of one', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 2);
      cart.add(FRIES, 1);
    });

    act(() => {
      cartOf(harness.probe).updateQuantity(BURGER.id, -3);
    });

    const cart = cartOf(harness.probe);
    expect(cart.items.map((line) => line.menu_item_id)).toEqual([BURGER.id, FRIES.id]);
    expect(cart.items.map((line) => line.quantity)).toEqual([1, 1]);
    expect(cart.itemCount).toBe(2);
  });

  it('leaves the other lines untouched', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 2);
      cart.add(FRIES, 3);
    });

    act(() => {
      cartOf(harness.probe).updateQuantity(BURGER.id, 5);
    });

    const cart = cartOf(harness.probe);
    expect(cart.items.map((line) => line.quantity)).toEqual([5, 3]);
    expect(cart.itemCount).toBe(8);
  });

  it('ignores an id the cart does not hold', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER, 2);
    });

    act(() => {
      cartOf(harness.probe).updateQuantity('item-not-in-cart', 4);
    });

    const cart = cartOf(harness.probe);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(2);
  });
});

describe('quantity field', () => {
  it('keeps the field cleared and commits the retyped quantity instead of restoring the old one', async () => {
    const user = userEvent.setup();
    const harness = renderHarness({ entries: ['/cart'], content: CHECKOUT_CONTENT });
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 12);
      cart.add(FRIES, 1);
    });

    const quantity = screen.getByRole('spinbutton', { name: 'Quantity of Classic Burger' });
    expect((quantity as HTMLInputElement).value).toBe('12');

    // Emptying the field is a value mid-edit: the field stays empty rather than
    // snapping back to the committed 12, which the next keystroke would append to.
    await user.clear(quantity);
    expect((quantity as HTMLInputElement).value).toBe('');
    expect(cartOf(harness.probe).items[0]?.quantity).toBe(12);

    await user.type(quantity, '5');

    // Retyping reads as 5 rather than 125, the line's display total follows it, and
    // the line is edited rather than dropped.
    expect((quantity as HTMLInputElement).value).toBe('5');
    const cart = cartOf(harness.probe);
    expect(cart.items.map((line) => line.menu_item_id)).toEqual([BURGER.id, FRIES.id]);
    expect(cart.items[0]?.quantity).toBe(5);
    expect(cart.itemCount).toBe(6);
    expect(screen.getByText(formatCents(5 * BURGER.price_cents)).className).toBe('cart-line__total');

    // Losing focus drops the in-progress text, so the field settles on the
    // quantity the cart holds.
    await user.tab();
    expect((quantity as HTMLInputElement).value).toBe('5');
    expect(cartOf(harness.probe).items[0]?.quantity).toBe(5);
  });

  it.each([
    { typed: '21', shown: 20 },
    { typed: '0', shown: 1 },
  ])(
    'reads a typed $typed back as $shown in the field, the cart and the order',
    async ({ typed, shown }) => {
      const user = userEvent.setup();
      const harness = renderHarness({ entries: ['/cart'], content: CHECKOUT_CONTENT, routes: ORDER_ROUTES });
      await awaitAuthenticated(harness.probe);

      act(() => {
        const cart = cartOf(harness.probe);
        cart.add(BURGER, 12);
        cart.add(FRIES, 1);
      });

      const quantity = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Quantity of Classic Burger' });
      await user.clear(quantity);
      await user.type(quantity, typed);

      // One number everywhere: the field the shopper reads, the line the cart
      // holds, the header count and the two displayed totals.
      expect(quantity.value).toBe(String(shown));
      const cart = cartOf(harness.probe);
      expect(cart.items[0]?.quantity).toBe(shown);
      expect(cart.itemCount).toBe(shown + 1);
      expect(cart.totalCents).toBe(shown * BURGER.price_cents + FRIES.price_cents);
      expect(screen.getByText(`${shown + 1} items in your cart`)).not.toBeNull();
      expect(screen.getByText(formatCents(shown * BURGER.price_cents)).className).toBe('cart-line__total');
      expect(screen.getByText(formatCents(shown * BURGER.price_cents + FRIES.price_cents))).not.toBeNull();

      // The correction is explained rather than silent, and it explains a number the
      // cart accepted: the message is the neutral hint style, the control keeps the
      // valid state and the wrapper carries no invalid modifier.
      expect(quantity.getAttribute('aria-invalid')).toBe('false');
      expect(quantity.closest('.field')?.className).toBe('field');
      const notice = describedElement(quantity);
      expect(notice?.className).toBe('field__hint');
      expect(notice?.textContent).toContain('Set to ' + String(shown));
      expect(notice?.textContent).toContain('1 to 20');

      // Leaving the field keeps the explanation with the number it describes.
      await user.tab();
      expect(quantity.value).toBe(String(shown));
      expect(describedElement(quantity)?.textContent).toContain('Set to ' + String(shown));

      // What is ordered is the number the field shows.
      await user.click(screen.getByRole('button', { name: 'Place order' }));
      await screen.findByTestId('confirmation-id');

      const posted = harness.fetchStub.calls.find((call) => call.method === 'POST');
      const body = JSON.parse(posted?.body ?? '{}') as { items?: readonly Record<string, unknown>[] };
      expect((body.items ?? []).map((line) => line['quantity'])).toEqual([shown, 1]);
    },
  );
  it('explains an emptied field and marks it invalid while the line stands unchanged', async () => {
    const user = userEvent.setup();
    const harness = renderHarness({ entries: ['/cart'], content: CHECKOUT_CONTENT });
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 3);
      cart.add(FRIES, 1);
    });

    const quantity = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Quantity of Classic Burger' });

    await user.clear(quantity);

    // The field holds no quantity at all, so it says which ones the order takes and
    // marks itself invalid — while nothing is committed and the line, the count and
    // the total stand as they were.
    expect(quantity.value).toBe('');
    expect(quantity.getAttribute('aria-invalid')).toBe('true');
    expect(quantity.closest('.field')?.className).toBe('field field--invalid');
    const message = describedElement(quantity);
    expect(message?.className).toBe('field-error');
    expect(message?.textContent).toBe('Enter a quantity between 1 and 20.');

    const cart = cartOf(harness.probe);
    expect(cart.items[0]?.quantity).toBe(3);
    expect(cart.itemCount).toBe(4);
    expect(screen.getByText(formatCents(3 * BURGER.price_cents)).className).toBe('cart-line__total');
  });

  it('restores the quantity the cart holds on blur and says which one it kept', async () => {
    const user = userEvent.setup();
    const harness = renderHarness({ entries: ['/cart'], content: CHECKOUT_CONTENT });
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER, 3);
    });

    const quantity = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Quantity of Classic Burger' });

    await user.clear(quantity);
    await user.tab();

    // The field settles on the cart's own number and the sentence names it, so the
    // restore is explained rather than silent; the control is valid again because
    // the number it holds is one the order takes.
    expect(quantity.value).toBe('3');
    expect(quantity.getAttribute('aria-invalid')).toBe('false');
    expect(quantity.closest('.field')?.className).toBe('field');
    const message = describedElement(quantity);
    expect(message?.className).toBe('field__hint');
    expect(message?.textContent).toBe('Kept at 3: enter a quantity between 1 and 20.');

    const cart = cartOf(harness.probe);
    expect(cart.items[0]?.quantity).toBe(3);
    expect(cart.itemCount).toBe(3);
  });
});

describe('remove', () => {
  it('removes only the named line and recomputes both totals', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 2);
      cart.add(FRIES, 1);
    });
    expect(cartOf(harness.probe).totalCents).toBe(3048);

    act(() => {
      cartOf(harness.probe).remove(BURGER.id);
    });

    const cart = cartOf(harness.probe);
    expect(cart.items.map((line) => line.menu_item_id)).toEqual([FRIES.id]);
    expect(cart.itemCount).toBe(1);
    expect(cart.totalCents).toBe(FRIES.price_cents);
  });

  it('is a no-op for an id the cart does not hold', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 2);
      cart.add(FRIES, 1);
    });

    act(() => {
      cartOf(harness.probe).remove('item-not-in-cart');
    });

    expect(cartOf(harness.probe).items).toHaveLength(2);
  });
});

describe('totals', () => {
  it('sums quantities across lines into itemCount', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 2);
      cart.add(FRIES, 3);
    });

    expect(cartOf(harness.probe).itemCount).toBe(5);
  });

  it('sums integer cents across lines into totalCents', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 2);
      cart.add(FRIES, 1);
    });

    // 2 x 1299 + 1 x 450; a display figure only — the order endpoint prices
    // the order from stored menu data and its total is the one shown on the
    // confirmation (rule R-3).
    const totalCents = cartOf(harness.probe).totalCents;
    expect(Number.isInteger(totalCents)).toBe(true);
    expect(totalCents).toBe(3048);
  });

  it('reports zero for an empty cart', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    const cart = cartOf(harness.probe);
    expect(cart.items).toHaveLength(0);
    expect(cart.itemCount).toBe(0);
    expect(cart.totalCents).toBe(0);
  });
});

describe('clear on order confirmation', () => {
  it('posts only a menu item id and a quantity per line, with the session bearer token', async () => {
    const { posted } = await placeOrder();

    expect(posted?.url).toBe('/api/orders');
    expect(posted?.method).toBe('POST');
    expect(posted?.authorization).toBe(`Bearer ${TOKEN}`);

    const body = JSON.parse(posted?.body ?? '{}') as { items?: readonly Record<string, unknown>[] };
    const lines = body.items ?? [];

    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line['menu_item_id'])).toEqual([BURGER.id, FRIES.id]);
    expect(lines.map((line) => line['quantity'])).toEqual([2, 1]);

    for (const line of lines) {
      expect(Object.keys(line).sort()).toEqual(['menu_item_id', 'quantity']);
    }

    // No amount and no user id may travel: the server prices the order and
    // takes the caller's identity from the token (rule R-3).
    expect(Object.keys(body).sort()).toEqual(['items']);
    expect(posted?.body ?? '').not.toMatch(/price_cents|total_cents|user_id/);
  });

  it('empties the cart once the order is confirmed', async () => {
    const { harness } = await placeOrder();

    const cart = cartOf(harness.probe);
    expect(cart.items).toHaveLength(0);
    expect(cart.itemCount).toBe(0);
    expect(cart.totalCents).toBe(0);
  });

  it('navigates to the confirmation, which shows the server total rather than the cart sum', async () => {
    const { harness } = await placeOrder();

    expect(screen.queryByRole('button', { name: 'Place order' })).toBeNull();

    const confirmationId = await screen.findByTestId('confirmation-id');
    expect(confirmationId.textContent).toBe(ORDER_FIXTURE.id);

    const confirmationTotal = await screen.findByTestId('confirmation-total');
    expect(confirmationTotal.textContent).toBe(formatCents(ORDER_FIXTURE.total_cents));

    // The cart's own display sum is gone: the confirmation renders the amount
    // the API computed from stored menu prices.
    expect(formatCents(3048)).not.toBe(formatCents(ORDER_FIXTURE.total_cents));
    expect(screen.queryByText(formatCents(3048))).toBeNull();
    expect(harness.fetchStub.calls.map((call) => call.url)).toEqual([
      '/api/auth/session',
      '/api/orders',
      `/api/orders/${ORDER_FIXTURE.id}`,
    ]);
  });
});

describe('place order in flight', () => {
  it('sends one order when Place order is dispatched twice in the same task', async () => {
    const harness = renderHarness({ entries: ['/cart'], content: CHECKOUT_CONTENT, routes: ORDER_ROUTES });
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER, 2);
    });

    const placeOrderControl = screen.getByRole('button', { name: 'Place order' });

    // Both clicks land before React has re-rendered, so the rendered `disabled`
    // state cannot be what stops the second submission: only a guard set
    // synchronously inside the handler can.
    await act(async () => {
      fireEvent.click(placeOrderControl);
      fireEvent.click(placeOrderControl);
    });

    await screen.findByTestId('confirmation-id');

    const posted = harness.fetchStub.calls.filter((call) => call.method === 'POST');
    expect(posted).toHaveLength(1);

    // The one order sent carries the line the cart held.
    const body = JSON.parse(posted[0]?.body ?? '{}') as { items?: readonly Record<string, unknown>[] };
    expect((body.items ?? []).map((line) => line['quantity'])).toEqual([2]);
  });

  it('states the wait on the Place order control itself while the request is pending', async () => {
    const user = userEvent.setup();
    const harness = renderHarness({
      entries: ['/cart'],
      content: CHECKOUT_CONTENT,
      routes: [PENDING_ORDER_ROUTE],
    });
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER, 2);
    });

    const control = screen.getByRole<HTMLButtonElement>('button', { name: PLACE_ORDER_LABEL });
    expect(control.getAttribute('aria-busy')).toBe('false');

    await user.click(control);

    await waitFor(() => {
      expect(control.getAttribute('aria-busy')).toBe('true');
    });

    // The wait reaches the control as well as the form: aria-busy states it to a
    // reader that does not read the label, and the label says in visible text what
    // is happening rather than leaving the native disabled attribute to imply it.
    expect(control.textContent).toBe(PLACING_ORDER_LABEL);
    expect(control.disabled).toBe(true);
    expect(harness.fetchStub.calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });
});

describe('clear on logout', () => {
  it('empties the cart and ends the session when the shopper logs out', async () => {
    const jsonSpy = vi.fn(async (): Promise<unknown> => {
      throw new Error('A 204 answer carries no body to read.');
    });
    const routes: readonly StubRoute[] = [
      {
        path: '/api/auth/logout',
        method: 'POST',
        respond: () => fakeResponse({ status: 204, json: jsonSpy }),
      },
    ];

    const harness = renderHarness({ routes });
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER, 2);
    });
    expect(cartOf(harness.probe).itemCount).toBe(2);

    await act(async () => {
      await sessionOf(harness.probe).logout();
    });

    // Both hooks are read through the one probe, so the cart emptying here is
    // only possible while `CartProvider` renders inside `SessionProvider`
    // (rule R-8).
    expect(sessionOf(harness.probe).status).toBe('anonymous');
    expect(sessionOf(harness.probe).token).toBeNull();
    expect(cartOf(harness.probe).items).toHaveLength(0);
    expect(cartOf(harness.probe).itemCount).toBe(0);

    const logoutCall = harness.fetchStub.calls.at(-1);
    expect(logoutCall?.url).toBe('/api/auth/logout');
    expect(logoutCall?.authorization).toBe(`Bearer ${TOKEN}`);
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe('no persistence', () => {
  it('writes no cart key to local or session storage', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      cartOf(harness.probe).add(BURGER, 2);
    });
    act(() => {
      cartOf(harness.probe).updateQuantity(BURGER.id, 4);
    });
    act(() => {
      cartOf(harness.probe).remove(BURGER.id);
    });
    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 1);
      cart.add(FRIES, 1);
      cart.clear();
    });
    // The session's own write, so "the only key written" is a real result
    // rather than a vacuous one.
    act(() => {
      sessionOf(harness.probe).login({ user: AUTH_USER, token: TOKEN });
    });

    const writtenKeys = setItemSpy.mock.calls.map((call) => String(call[0]));
    expect(writtenKeys).toEqual([TOKEN_STORAGE_KEY]);
    expect(window.sessionStorage.length).toBe(0);
    expect(cartOf(harness.probe).itemCount).toBe(0);
  });

  it('never calls a cart endpoint', async () => {
    const harness = renderHarness();
    await awaitAuthenticated(harness.probe);

    act(() => {
      const cart = cartOf(harness.probe);
      cart.add(BURGER, 2);
      cart.updateQuantity(BURGER.id, 3);
      cart.remove(BURGER.id);
      cart.add(FRIES);
    });

    expect(harness.fetchStub.calls.length).toBeGreaterThan(0);
    expect(harness.fetchStub.calls.every((call) => !call.url.toLowerCase().includes('cart'))).toBe(true);
    expect(harness.fetchStub.calls.map((call) => call.url)).toEqual(['/api/auth/session']);
  });

  it('starts empty after a reload-shaped remount', async () => {
    const first = renderHarness();
    await awaitAuthenticated(first.probe);

    act(() => {
      cartOf(first.probe).add(BURGER, 2);
    });
    expect(cartOf(first.probe).itemCount).toBe(2);

    first.view.unmount();

    const second = renderHarness();
    await awaitAuthenticated(second.probe);

    expect(cartOf(second.probe).items).toHaveLength(0);
    expect(cartOf(second.probe).itemCount).toBe(0);
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe(TOKEN);
  });
});

describe('empty cart', () => {
  it('offers the way back to the menu and no Place order action', async () => {
    const harness = renderHarness({
      entries: ['/cart'],
      content: (
        <Routes>
          <Route path="/cart" element={<CartView />} />
        </Routes>
      ),
    });
    await awaitAuthenticated(harness.probe);

    expect(cartOf(harness.probe).itemCount).toBe(0);
    expect(document.body.textContent).toContain('Your cart is empty');
    expect(document.body.textContent).toContain('Add a burger, a side or a drink and it will appear here.');

    const browse = screen.getByRole('link', { name: 'Browse the menu' });
    expect(browse.textContent).toBe('Browse the menu');
    expect(browse.getAttribute('href')).toBe('/menu');
    expect(screen.queryByRole('button', { name: 'Place order' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Screen 3 — the catalog's selection is the `category` query parameter, so
// filtering re-reads the items and never reloads or remounts the screen
// ---------------------------------------------------------------------------

describe('menu catalog filter', () => {
  it('lists only the category the query names and reads it once through that query', async () => {
    const harness = renderHarness({
      entries: ['/menu?category=burgers'],
      content: CATALOG_CONTENT,
      routes: BURGERS_ONLY_ROUTES,
    });
    await awaitAuthenticated(harness.probe);

    expect(await screen.findByRole('link', { name: BURGER.name })).not.toBeNull();
    expect(await screen.findByRole('button', { name: BURGERS_CATEGORY.name })).not.toBeNull();
    // The other category's item is absent, so the selection reached the request
    // rather than being applied to whatever came back.
    expect(screen.queryByRole('link', { name: SHAKE.name })).toBeNull();

    const requested = harness.fetchStub.calls.map((call) => call.url);
    expect(requested.filter((url) => url === BURGERS_ITEMS_URL)).toHaveLength(1);
    // A catalog that dropped `category` would have asked for the whole menu.
    expect(requested).not.toContain(ALL_ITEMS_URL);
    expect(pressedFilterLabels()).toEqual([BURGERS_CATEGORY.name]);
    // One strip for the screen: filtering never re-reads it.
    expect(requested.filter((url) => url === CATEGORIES_ROUTE.path)).toHaveLength(1);
  });

  it.each([
    {
      control: DRINKS_CATEGORY.name,
      itemsUrl: DRINKS_ITEMS_URL,
      listed: [SHAKE.name],
      unlisted: [BURGER.name],
    },
    {
      control: ALL_ITEMS_LABEL,
      itemsUrl: ALL_ITEMS_URL,
      listed: [BURGER.name, SHAKE.name],
      unlisted: [],
    },
  ])(
    're-reads the items in place when the $control control is chosen',
    async ({ control, itemsUrl, listed, unlisted }) => {
      const user = userEvent.setup();
      const harness = renderHarness({
        entries: ['/menu?category=burgers'],
        content: CATALOG_CONTENT,
        routes: CATALOG_ROUTES,
      });
      await awaitAuthenticated(harness.probe);

      expect(await screen.findByRole('link', { name: BURGER.name })).not.toBeNull();
      expect(await screen.findByRole('button', { name: BURGERS_CATEGORY.name })).not.toBeNull();
      expect(pressedFilterLabels()).toEqual([BURGERS_CATEGORY.name]);

      await user.click(screen.getByRole('button', { name: control }));

      for (const name of listed) {
        expect(await screen.findByRole('link', { name })).not.toBeNull();
      }
      for (const name of unlisted) {
        expect(screen.queryByRole('link', { name })).toBeNull();
      }

      const requested = harness.fetchStub.calls.map((call) => call.url);
      // The newly chosen selection travels as the query parameter.
      expect(requested.filter((url) => url === itemsUrl)).toHaveLength(1);
      expect(pressedFilterLabels()).toEqual([control]);
      // The strip was not read again and the screen was never remounted: one
      // categories request for the whole case, whatever was selected.
      expect(requested.filter((url) => url === CATEGORIES_ROUTE.path)).toHaveLength(1);
    },
  );
});

// ---------------------------------------------------------------------------
// Screen 3 — the strip presents itself as one control set, so it carries the
// keyboard model of one: a single roving tab stop and arrow-key movement among
// its pressed options, with Enter making the selection
// ---------------------------------------------------------------------------

describe('menu catalog filter keyboard model', () => {
  it.each([
    { entry: '/menu?category=burgers', tabStop: BURGERS_CATEGORY.name },
    { entry: '/menu', tabStop: ALL_ITEMS_LABEL },
  ])('keeps one filter option in the tab order at $entry: $tabStop', async ({ entry, tabStop }) => {
    const harness = renderHarness({
      entries: [entry],
      content: CATALOG_CONTENT,
      routes: CATALOG_ROUTES,
    });
    await awaitAuthenticated(harness.probe);
    await within(filterStrip()).findByRole('button', { name: DRINKS_CATEGORY.name });

    expect(filterOptions().map((option) => option.textContent)).toEqual([
      ALL_ITEMS_LABEL,
      BURGERS_CATEGORY.name,
      DRINKS_CATEGORY.name,
    ]);
    // One stop for Tab, on the chip the selection sits on, and -1 on the rest: the
    // strip is neither a run of stops nor a control Tab can walk past.
    expect(tabStopLabels()).toEqual([tabStop]);
    expect(filterOptions().map((option) => option.tabIndex).sort()).toEqual([-1, -1, 0]);
  });

  it('moves focus with the arrow keys and Home/End without changing the selection', async () => {
    const user = userEvent.setup();
    const harness = renderHarness({ entries: ['/menu'], content: CATALOG_CONTENT, routes: CATALOG_ROUTES });
    await awaitAuthenticated(harness.probe);
    await within(filterStrip()).findByRole('button', { name: DRINKS_CATEGORY.name });

    const selection = pressedFilterLabels();
    const stops = tabStopLabels();
    const first = filterOptions()[0];

    // Tab lands on the strip's one stop, which is where the walk starts.
    first?.focus();
    expect(focusedFilterLabel()).toBe(ALL_ITEMS_LABEL);

    await user.keyboard('{ArrowRight}');
    expect(focusedFilterLabel()).toBe(BURGERS_CATEGORY.name);
    await user.keyboard('{ArrowLeft}');
    expect(focusedFilterLabel()).toBe(ALL_ITEMS_LABEL);
    // Off either end the focus arrives on the other one.
    await user.keyboard('{ArrowLeft}');
    expect(focusedFilterLabel()).toBe(DRINKS_CATEGORY.name);
    await user.keyboard('{ArrowRight}');
    expect(focusedFilterLabel()).toBe(ALL_ITEMS_LABEL);
    await user.keyboard('{End}');
    expect(focusedFilterLabel()).toBe(DRINKS_CATEGORY.name);
    await user.keyboard('{Home}');
    expect(focusedFilterLabel()).toBe(ALL_ITEMS_LABEL);

    // Movement only: no arrow press re-filters the list or moves the tab stop.
    expect(pressedFilterLabels()).toEqual(selection);
    expect(tabStopLabels()).toEqual(stops);
  });

  it('applies the filter of an option reached with the arrow keys when Enter is pressed', async () => {
    const user = userEvent.setup();
    const harness = renderHarness({
      entries: ['/menu?category=burgers'],
      content: CATALOG_CONTENT,
      routes: CATALOG_ROUTES,
    });
    await awaitAuthenticated(harness.probe);
    expect(await screen.findByRole('link', { name: BURGER.name })).not.toBeNull();
    const selected = await within(filterStrip()).findByRole<HTMLButtonElement>('button', {
      name: BURGERS_CATEGORY.name,
    });

    // The selected chip is the tab stop, so the walk starts on it.
    expect(selected.tabIndex).toBe(0);
    selected.focus();

    await user.keyboard('{ArrowRight}');
    expect(focusedFilterLabel()).toBe(DRINKS_CATEGORY.name);
    expect(pressedFilterLabels()).toEqual([BURGERS_CATEGORY.name]);

    await user.keyboard('{Enter}');

    // The activation, not the arrow press, moved the selection and re-read the items.
    expect(await screen.findByRole('link', { name: SHAKE.name })).not.toBeNull();
    expect(screen.queryByRole('link', { name: BURGER.name })).toBeNull();
    expect(pressedFilterLabels()).toEqual([DRINKS_CATEGORY.name]);
    const requested = harness.fetchStub.calls.map((call) => call.url);
    expect(requested.filter((url) => url === DRINKS_ITEMS_URL)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Screen 3 — one page load is one announcement, and a retry that fails again
// says so: the screen keeps one live region and reports the retries it took
// ---------------------------------------------------------------------------

describe('menu catalog load failures', () => {
  it('announces a load that fails both requests once, in reading order', async () => {
    const harness = renderHarness({
      entries: ['/menu'],
      content: CATALOG_CONTENT,
      routes: FAILING_CATALOG_ROUTES,
    });
    await awaitAuthenticated(harness.probe);

    // Both panels are on screen, each still naming its own request…
    expect(await screen.findByText(CATEGORY_REQUEST_SUMMARY)).not.toBeNull();
    expect(await screen.findByText(ITEMS_REQUEST_SUMMARY)).not.toBeNull();

    // …and the pair is one live region, carrying both failures in that order.
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);

    const spoken = alerts[0]?.textContent ?? '';
    expect(spoken).toContain(`${CATEGORY_REQUEST_SUMMARY} ${CATEGORY_FAILURE_MESSAGE}`);
    expect(spoken).toContain(`${ITEMS_REQUEST_SUMMARY} ${ITEMS_FAILURE_MESSAGE}`);
    expect(spoken.indexOf(CATEGORY_REQUEST_SUMMARY)).toBeLessThan(spoken.indexOf(ITEMS_REQUEST_SUMMARY));
    // The first failure of either request reports no retry.
    expect(spoken).not.toContain(RETRY_NOTE);
  });

  it.each([
    { scope: ' loading the categories', summary: CATEGORY_REQUEST_SUMMARY, message: CATEGORY_FAILURE_MESSAGE },
    { scope: ' loading the menu', summary: ITEMS_REQUEST_SUMMARY, message: ITEMS_FAILURE_MESSAGE },
  ])('speaks again when the retry for$scope fails again', async ({ scope, summary, message }) => {
    const user = userEvent.setup();
    const harness = renderHarness({
      entries: ['/menu'],
      content: CATALOG_CONTENT,
      routes: FAILING_CATALOG_ROUTES,
    });
    await awaitAuthenticated(harness.probe);
    expect(await screen.findByText(summary)).not.toBeNull();

    const before = screen.getAllByRole('alert');
    expect(before).toHaveLength(1);
    const spokenBefore = before[0]?.textContent ?? '';
    expect(spokenBefore).toContain(`${summary} ${message}`);
    expect(spokenBefore).not.toContain(RETRY_NOTE);

    await user.click(screen.getByRole('button', { name: `Try again${scope}` }));

    // The same sentence is written where a sighted reader sees it…
    await screen.findByText(RETRY_NOTE);
    const retriedPanel = screen.getByText(summary).closest('.error-summary');
    expect(retriedPanel?.textContent).toContain(RETRY_NOTE);

    // …and the one live region now says something new, so it is announced again.
    const after = screen.getAllByRole('alert');
    expect(after).toHaveLength(1);
    const spokenAfter = after[0]?.textContent ?? '';
    expect(spokenAfter).not.toBe(spokenBefore);
    expect(spokenAfter).toContain(RETRY_NOTE);
    expect(spokenAfter).toContain(`${summary} ${message}`);
  });
});

// ---------------------------------------------------------------------------
// Screen 4 — the item detail's add action feeds the client cart, not the API
// ---------------------------------------------------------------------------

describe('menu item detail add to cart', () => {
  it('adds the chosen quantity to the cart, confirms it in place and calls no cart endpoint', async () => {
    const user = userEvent.setup();
    const quantityAdded = 3;
    const harness = renderHarness({
      entries: [`/menu/${BURGER.id}`],
      content: ITEM_DETAIL_CONTENT,
      routes: DETAIL_ROUTES,
    });
    await awaitAuthenticated(harness.probe);

    // The article the item's own heading labels is the whole detail this screen renders.
    const detail = await screen.findByRole('article', { name: BURGER.name });
    const detailText = detail.textContent ?? '';
    expect(detailText).toContain(BURGER.name);
    expect(detailText).toContain(BURGER.description);
    expect(detailText).toContain(formatCents(BURGER.price_cents));

    const quantityControl = await screen.findByLabelText<HTMLInputElement>('Quantity');
    await user.clear(quantityControl);
    await user.type(quantityControl, String(quantityAdded));

    const addControls = within(detail).getAllByRole<HTMLButtonElement>('button', { name: ADD_TO_CART_LABEL });
    const addControl = enabledAddControl(addControls);
    // The detail renders one add action, and this case clicks it.
    expect(addControls).toHaveLength(1);

    await user.click(addControl);

    const cart = cartOf(harness.probe);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.menu_item_id).toBe(BURGER.id);
    expect(cart.itemCount).toBe(quantityAdded);

    // The confirmation is announced where the action was, in the live region
    // the detail screen keeps mounted for it.
    const confirmation = await screen.findByText(`${quantityAdded} × ${BURGER.name} added to your cart.`);
    expect(confirmation.closest('[role="status"]')).not.toBeNull();

    const requested = harness.fetchStub.calls.map((call) => call.url);
    // The item read is the only request beyond the session restore: the cart is
    // client state, so nothing asked the API to store it (rule R-8).
    expect(requested.filter((url) => url !== SESSION_ROUTE.path)).toEqual([`/api/menu-items/${BURGER.id}`]);
    expect(harness.fetchStub.calls.some((call) => call.method === 'POST')).toBe(false);
    expect(requested.every((url) => !url.toLowerCase().includes('cart'))).toBe(true);
  });

  it('corrects a quantity above the limit in the field, explains it and adds the number it shows', async () => {
    const user = userEvent.setup();
    const harness = renderHarness({
      entries: [`/menu/${BURGER.id}`],
      content: ITEM_DETAIL_CONTENT,
      routes: DETAIL_ROUTES,
    });
    await awaitAuthenticated(harness.probe);

    const detail = await screen.findByRole('article', { name: BURGER.name });
    const quantityControl = await screen.findByLabelText<HTMLInputElement>('Quantity');

    await user.clear(quantityControl);
    await user.type(quantityControl, '21');

    // The field holds a number an order line accepts, and says why it changed: the
    // explanation is the neutral hint under the control, which stays valid because
    // the number it holds is one the order takes.
    expect(quantityControl.value).toBe('20');
    expect(quantityControl.getAttribute('aria-invalid')).toBe('false');
    const notice = describedElement(quantityControl);
    expect(notice?.className).toBe('field__hint');
    expect(notice?.textContent).toContain('Set to 20');
    expect(notice?.textContent).toContain('1 to 20');

    const addControls = within(detail).getAllByRole<HTMLButtonElement>('button', { name: ADD_TO_CART_LABEL });
    await user.click(enabledAddControl(addControls));

    // The cart and the confirmation carry the number the field showed, so no
    // screen reports a quantity the field does not hold.
    const cart = cartOf(harness.probe);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(20);
    expect(cart.itemCount).toBe(20);

    const confirmation = await screen.findByText(`20 × ${BURGER.name} added to your cart.`);
    expect(confirmation.closest('[role="status"]')).not.toBeNull();

    // The click that took the focus away neither retracted the notice nor changed
    // the number it describes.
    expect(quantityControl.value).toBe('20');
    expect(describedElement(quantityControl)?.textContent).toContain('Set to 20');
  });

  it('explains an emptied quantity field, then restores a quantity and says which one it kept', async () => {
    const user = userEvent.setup();
    const harness = renderHarness({
      entries: [`/menu/${BURGER.id}`],
      content: ITEM_DETAIL_CONTENT,
      routes: DETAIL_ROUTES,
    });
    await awaitAuthenticated(harness.probe);

    const quantityControl = await screen.findByLabelText<HTMLInputElement>('Quantity');

    await user.clear(quantityControl);

    // The field holds no quantity an order line could carry, so it says which ones
    // it takes and marks itself invalid rather than staying blank and silent.
    expect(quantityControl.value).toBe('');
    expect(quantityControl.getAttribute('aria-invalid')).toBe('true');
    const message = describedElement(quantityControl);
    expect(message?.className).toBe('field-error');
    expect(message?.textContent).toBe('Enter a quantity between 1 and 20.');

    await user.tab();

    // Losing focus puts a quantity back and names it, so the number that reappears
    // is explained rather than sprung back to; the control is valid again because
    // the field now holds one the order takes.
    expect(quantityControl.value).toBe('1');
    expect(quantityControl.getAttribute('aria-invalid')).toBe('false');
    const restored = describedElement(quantityControl);
    expect(restored?.className).toBe('field__hint');
    expect(restored?.textContent).toBe('Kept at 1: enter a quantity between 1 and 20.');
  });
});

describe('menu item detail id failures', () => {
  it('tells an id the API refused apart from an id that names no item', async () => {
    const malformed = renderHarness({
      entries: [`/menu/${MALFORMED_ITEM_ID}`],
      content: ITEM_DETAIL_CONTENT,
      routes: ID_FAILURE_ROUTES,
    });
    await awaitAuthenticated(malformed.probe);

    // The API refused the address itself, so the screen says that and echoes the message the API
    // wrote rather than reporting the item as absent.
    const refusalHeading = await screen.findByRole('heading', { name: 'Item link not valid', level: 1 });
    expect(refusalHeading).not.toBeNull();
    const refusal = screen.getByRole('alert');
    expect(refusal.getAttribute('data-code')).toBe('VALIDATION_ERROR');
    expect(refusal.textContent).toBe(INVALID_ID_MESSAGE);
    expect(
      screen.getByText(
        'The link that brought you here is not a valid menu item address. Check it, or browse the menu for what you were looking for.',
      ),
    ).not.toBeNull();
    // The same malformed id cannot succeed on a second attempt, so no retry is offered.
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Item not found', level: 1 })).toBeNull();

    malformed.view.unmount();

    const unknown = renderHarness({
      entries: [`/menu/${UNKNOWN_ITEM_ID}`],
      content: ITEM_DETAIL_CONTENT,
      routes: ID_FAILURE_ROUTES,
    });
    await awaitAuthenticated(unknown.probe);

    // An id that names no item keeps the not-found screen and its copy, which the distinction above
    // must not have changed.
    expect(await screen.findByRole('heading', { name: 'Item not found', level: 1 })).not.toBeNull();
    expect(
      screen.getByText(
        'We could not find that item on the menu. It may have been taken off the menu, or the link may be incomplete.',
      ),
    ).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Item link not valid', level: 1 })).toBeNull();
  });
});
