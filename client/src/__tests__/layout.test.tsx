/**
 * @fileoverview Shell suite for screen 9 — `client/src/components/Layout.tsx` — and for the
 * responsive contract that the shell and the catalog draw from `client/src/styles/global.css` and
 * `client/src/styles/catalog.css`.
 *
 * Two concerns, one module (rule R-10):
 *
 * 1. Presentation by session status. The shell is rendered as a router layout route inside the real
 *    `SessionProvider` and `CartProvider` with `fetch` stubbed, so the navigation each status
 *    produces is asserted as rendered: the signed-out set, the signed-in set with its cart badge and
 *    logout control, no account action at all while a stored token is still being verified, and the
 *    `replace` navigation to `/login` that a 401 reported on a public screen performs.
 * 2. The responsive contract, proved mechanically from the text of the two stylesheets: the 44px
 *    control floor, the single 768px breakpoint, the one-column catalog grid and its two-column
 *    rule inside that breakpoint, and the 360px minimum supported width kept free of horizontal
 *    overflow by capped widths and minmax(0, ...) tracks rather than by clipping it. No browser
 *    driver is involved (rule R-7), so these assertions hold without a rendering engine.
 *
 * Fixtures carry only the API's secret-free projection (rule R-4), the 401 seed uses the documented
 * envelope with one of its thirteen codes (rule R-6), and the cart badge is counted from client
 * state with no cart request ever issued (rule R-8). Nothing here imports or asserts anything about
 * the CommonJS root package (rules R-1, R-2).
 *
 * @module client/src/__tests__/layout.test
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { useEffect, type JSX } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Layout from '../components/Layout';
import { CartProvider, useCart } from '../state/cart';
import { SessionProvider } from '../state/session';
import type { MenuItem, User } from '../api/types';

// ---------------------------------------------------------------------------
// Stylesheet text: the responsive contract is read from the two files themselves
// ---------------------------------------------------------------------------

/**
 * Directory of the two stylesheets, resolved from this suite's own location so the read does not
 * depend on the working directory the runner was started from.
 *
 * The files are read from disk rather than through Vite's `?raw` query because Vitest's default
 * `test.css: false` replaces every CSS module — a `?raw` request included — with an empty export.
 * Reading the authored file is also the stricter source: no transform or bundler step can rewrite
 * the declarations the assertions below check.
 */
const STYLES_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles');

/** Design tokens, base layer, shell layout and shared controls (`client/src/styles/global.css`). */
const globalCss = readFileSync(join(STYLES_DIRECTORY, 'global.css'), 'utf8');

/** Catalog grid, filter strip, item detail and cart layout (`client/src/styles/catalog.css`). */
const catalogCss = readFileSync(join(STYLES_DIRECTORY, 'catalog.css'), 'utf8');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Storage key the session provider keeps its token under; the suite seeds and clears it verbatim. */
const TOKEN_STORAGE_KEY = 'burger.auth.token';

/** 64 hex characters, the shape of the opaque tokens the API mints. */
const STORED_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/** The account projection the API returns: no password, salt or hash column (rule R-4). */
const USER: User = {
  id: '3f2b9c1e-0d4a-4b6f-9c8e-1a2b3c4d5e6f',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  created_at: '2024-05-01T12:00:00.000Z',
};

/** One orderable item, used only to put a line in the cart and prove the badge. */
const MENU_ITEM: MenuItem = {
  id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  name: 'Classic Burger',
  description: 'Beef patty, cheddar, pickles.',
  price_cents: 1250,
  image_url: null,
  is_available: true,
  category: { id: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f', name: 'Burgers', slug: 'burgers' },
};

/** Text the routed probe renders, which makes `<Outlet />`'s placement inside `main` observable. */
const PROBE_TEXT = 'Menu screen';

/**
 * Text the login probe renders, distinct from {@link PROBE_TEXT} so the route the shell reached is
 * unambiguous.
 */
const LOGIN_PROBE_TEXT = 'Login screen';

// ---------------------------------------------------------------------------
// Network double: the shell path's only request is `GET /api/auth/session`
// ---------------------------------------------------------------------------

/** The `fetch` signature the transport calls, so the double is typed exactly like it. */
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** The single network double; nothing in this suite reaches a real server. */
const fetchMock = vi.fn<FetchLike>();

/**
 * Body reader of the 204 response. `apiFetch` returns before reading a no-content body, so this
 * must never be called; it throws rather than resolving, which makes an accidental read loud.
 */
const noContentJson = vi.fn((): never => {
  throw new Error('a 204 response carries no body');
});

/**
 * Builds the response shape `apiFetch` reads — `status`, `ok` and `json`. Only those members are
 * touched, so the double need not be a real `Response`.
 *
 * @param body - Value the body reader resolves with.
 * @param status - HTTP status the fake answered with.
 * @returns The response double.
 */
function jsonResponse(body: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** @returns The 204 answer `POST /api/auth/logout` gives, whose body must stay unread. */
function noContentResponse(): Response {
  return { ok: true, status: 204, json: noContentJson } as unknown as Response;
}

/** How the stubbed `GET /api/auth/session` answers, which is what seeds each session status. */
type SessionOutcome =
  | { readonly kind: 'session' }
  | { readonly kind: 'rejected'; readonly code: string }
  | { readonly kind: 'pending' };

/**
 * Installs the shell path's session verification plus the logout call the signed-in header can
 * make. Any other URL rejects, so a request this suite never sanctioned surfaces as a failure
 * instead of passing unnoticed.
 *
 * @param outcome - How `GET /api/auth/session` answers: the account, a 401 envelope, or never.
 */
function installFetch(outcome: SessionOutcome): void {
  fetchMock.mockImplementation((input) => {
    if (input === '/api/auth/session') {
      if (outcome.kind === 'session') {
        return Promise.resolve(jsonResponse({ user: USER }, 200));
      }
      if (outcome.kind === 'rejected') {
        return Promise.resolve(
          jsonResponse({ error: { code: outcome.code, message: 'Sign in to continue.' } }, 401),
        );
      }
      return new Promise<Response>(() => {
        // Never settles: the provider stays in 'loading' for the whole test.
      });
    }

    if (input === '/api/auth/logout') {
      return Promise.resolve(noContentResponse());
    }

    return Promise.reject(new Error(`unexpected request: ${input}`));
  });
}

/** One request the transport made, read from the double rather than asserted on the mock object. */
interface RecordedRequest {
  readonly url: string;
  readonly method: string;
  readonly authorization: string | null;
}

/**
 * @param init - The request the transport built.
 * @param name - Header to read.
 * @returns The header's value, or null when the request carries no header of that name.
 */
function headerValue(init: RequestInit | undefined, name: string): string | null {
  const headers: unknown = init?.headers;
  if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) {
    return null;
  }
  const value = (headers as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : null;
}

/** @returns Every request the transport made, in order. */
function recordedRequests(): RecordedRequest[] {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url,
    method: init?.method ?? 'GET',
    authorization: headerValue(init, 'Authorization'),
  }));
}

/**
 * @param url - Exact URL to filter on, under the `/api` base.
 * @returns The requests made to that URL.
 */
function requestsTo(url: string): RecordedRequest[] {
  return recordedRequests().filter((request) => request.url === url);
}

// ---------------------------------------------------------------------------
// Render helpers: the providers and router `client/src/main.tsx` supplies in production
// ---------------------------------------------------------------------------

/**
 * Puts one item in the cart from inside the provider, so the shell's badge is driven by real cart
 * state rather than by a prop. Renders nothing and runs once, because `add` is stable.
 */
function CartSeeder(): null {
  const { add } = useCart();

  useEffect(() => {
    add(MENU_ITEM, 1);
  }, [add]);

  return null;
}

/**
 * The routed screen: a marked paragraph, plus the cart seeder when the badge is under test.
 *
 * @param props - Whether to seed one cart line.
 * @returns The routed content rendered inside the shell's `<main>`.
 */
function MenuProbe({ seedCart = false }: { seedCart?: boolean }): JSX.Element {
  return (
    <>
      <p>{PROBE_TEXT}</p>
      {seedCart ? <CartSeeder /> : null}
    </>
  );
}

/**
 * The login screen's stand-in: one marker paragraph, no form, so a case observes the route the
 * shell navigated to and nothing else.
 *
 * @returns The routed content the shell's `<main>` holds once it has navigated to `/login`.
 */
function LoginProbe(): JSX.Element {
  return <p>{LOGIN_PROBE_TEXT}</p>;
}

/**
 * Renders the shell the way `client/src/main.tsx` does: the session provider above the cart
 * provider, both above a router, with `Layout` as the layout route so `<Outlet />` has content to
 * render and `useNavigate` has a history to act on. Two screens hang off that layout route: the
 * public `/menu` the visitor starts on, and the `/login` a reported 401 has to reach, each with its
 * own marker text.
 *
 * @param seedCart - Whether the routed screen seeds a cart line.
 */
function renderShell({ seedCart = false }: { seedCart?: boolean } = {}): void {
  render(
    <SessionProvider>
      <CartProvider>
        <MemoryRouter initialEntries={['/menu']}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/menu" element={<MenuProbe seedCart={seedCart} />} />
              <Route path="/login" element={<LoginProbe />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </SessionProvider>,
  );
}

/**
 * @param name - Accessible name of the link.
 * @returns The `href` attribute string, which is what the route table has to receive.
 */
function linkHref(name: string): string | null {
  return screen.getByRole('link', { name }).getAttribute('href');
}

/** @returns The session indicator element, or null when the shell renders none. */
function sessionIndicator(): Element | null {
  return document.querySelector('.session-indicator');
}

// ---------------------------------------------------------------------------
// Stylesheet helpers: the responsive contract is read from the CSS text
// ---------------------------------------------------------------------------

/** One rule of a stylesheet: its selector list and the declarations between its braces. */
interface CssRule {
  readonly selector: string;
  readonly body: string;
}

/**
 * @param css - Stylesheet text.
 * @returns The text with every comment replaced by a space, so a literal quoted in a stylesheet's
 * header comment is never mistaken for a declaration.
 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * @param text - Any text.
 * @returns It with whitespace collapsed and trimmed, so assertions stay strict about values and
 * indifferent to formatting.
 */
function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * @param css - Stylesheet text.
 * @returns The text an assertion can match against, comments removed.
 */
function prepare(css: string): string {
  return normalise(stripComments(css));
}

/**
 * Splits a stylesheet into its innermost rules. The pattern cannot cross a closing brace, so a rule
 * inside an `@media` block carries that block's prelude on its selector list.
 *
 * @param css - Stylesheet text.
 * @returns Every rule of the stylesheet, in source order.
 */
function cssRules(css: string): CssRule[] {
  return [...prepare(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? '').trim(),
    body: (match[2] ?? '').trim(),
  }));
}

/**
 * @param css - Stylesheet text.
 * @param selector - Exact selector list to find.
 * @returns The top-level rule declaring exactly that selector, or undefined when there is none.
 */
function ruleFor(css: string, selector: string): CssRule | undefined {
  return cssRules(css).find((rule) => rule.selector === selector);
}

/**
 * @param css - Stylesheet text.
 * @returns Every `@media` prelude of the stylesheet, normalised, comments removed.
 */
function mediaPreludes(css: string): string[] {
  return [...prepare(css).matchAll(/@media[^{]*\{/g)].map((match) =>
    normalise((match[0] ?? '').replace(/\{$/, '')),
  );
}

/**
 * Reads the body of the block opened at `openBrace`, counting braces so a nested rule keeps its own.
 *
 * @param text - Text to read.
 * @param openBrace - Index of the block's opening brace.
 * @returns The block's interior, or null when the block never closes.
 */
function blockBodyAt(text: string, openBrace: number): string | null {
  let depth = 0;
  for (let index = openBrace; index < text.length; index += 1) {
    const character = text.charAt(index);
    if (character === '{') {
      depth += 1;
    }
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openBrace + 1, index);
      }
    }
  }
  return null;
}

/**
 * Reads what one `@media` block holds, so an assertion can require a declaration to sit inside the
 * block rather than merely somewhere in the file.
 *
 * @param css - Stylesheet text.
 * @param prelude - The block's prelude, compared after whitespace normalisation.
 * @returns The block's interior, or null when no block carries that prelude.
 */
function mediaBlockBody(css: string, prelude: string): string | null {
  const prepared = prepare(css);
  const expected = normalise(prelude);

  for (const match of prepared.matchAll(/@media[^{]*\{/g)) {
    if (normalise((match[0] ?? '').replace(/\{$/, '')) !== expected) {
      continue;
    }
    return blockBodyAt(prepared, (match.index ?? 0) + (match[0] ?? '').length - 1);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Test isolation: a fresh double, an empty store and no network function left behind
// ---------------------------------------------------------------------------

beforeEach(() => {
  fetchMock.mockReset();
  noContentJson.mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// Screen 9: the navigation each session status produces
// ---------------------------------------------------------------------------

describe('anonymous session', () => {
  beforeEach(() => {
    // A 401 with one of the documented codes: the visitor holds no session (rule R-6).
    installFetch({ kind: 'rejected', code: 'TOKEN_REQUIRED' });
    renderShell();
  });

  it('renders the routed screen inside <main class="app-main">', () => {
    const probe = screen.getByText(PROBE_TEXT);
    const main = probe.closest('main');

    expect(main).not.toBeNull();
    expect(main?.className).toBe('app-main');
  });

  it('renders the shell regions around that outlet', () => {
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).not.toBeNull();
    expect(document.querySelector('.app-header')).not.toBeNull();
    expect(document.querySelector('.app-footer')).not.toBeNull();
  });

  it('offers the catalog and the two signed-out links, at their routes', () => {
    expect(linkHref('Menu')).toBe('/menu');
    expect(linkHref('Log in')).toBe('/login');
    expect(linkHref('Register')).toBe('/register');
  });

  it('shows none of the signed-in actions', () => {
    expect(screen.queryByText('Cart')).toBeNull();
    expect(screen.queryByText('Orders')).toBeNull();
    expect(screen.queryByText('Reservations')).toBeNull();
    expect(screen.queryByText('Log out')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull();
  });

  it('renders no session indicator', () => {
    expect(sessionIndicator()).toBeNull();
    expect(screen.queryByText(/Signed in as/)).toBeNull();
  });

  it('verifies nothing when no token is stored', () => {
    expect(recordedRequests()).toEqual([]);
  });
});

describe('authenticated session', () => {
  beforeEach(() => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
    installFetch({ kind: 'session' });
  });

  it('verifies the stored token with a bearer credential before showing the account actions', async () => {
    renderShell();
    await screen.findByRole('link', { name: 'Cart' });

    const verifications = requestsTo('/api/auth/session');
    expect(verifications).toHaveLength(1);
    expect(verifications[0]?.method).toBe('GET');
    expect(verifications[0]?.authorization).toBe(`Bearer ${STORED_TOKEN}`);
  });

  it('offers the catalog, cart, orders and reservations, at their routes', async () => {
    renderShell();
    await screen.findByRole('link', { name: 'Cart' });

    expect(linkHref('Menu')).toBe('/menu');
    expect(linkHref('Cart')).toBe('/cart');
    expect(linkHref('Orders')).toBe('/orders');
    expect(linkHref('Reservations')).toBe('/reservations');
  });

  it('replaces the signed-out links with a logout control and the session indicator', async () => {
    renderShell();
    await screen.findByText(/Signed in as/);

    const indicator = sessionIndicator();
    expect(indicator).not.toBeNull();
    expect(indicator?.textContent).toContain(USER.name);
    expect(indicator?.textContent).toContain(USER.email);

    expect(screen.getByRole('button', { name: 'Log out' })).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Register' })).toBeNull();
  });

  it('adds the cart count to the Cart link from client state alone', async () => {
    renderShell({ seedCart: true });

    const cartLink = await screen.findByText('Cart (1)');
    expect(cartLink.getAttribute('href')).toBe('/cart');
    // The badge is counted from the in-memory cart, so no cart request is ever made (rule R-8).
    expect(recordedRequests().filter((request) => request.url.includes('/api/cart'))).toEqual([]);
  });

  it('revokes the token on logout and returns the navigation to the signed-out set', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByRole('button', { name: 'Log out' }));
    await screen.findByRole('link', { name: 'Log in' });

    const revocations = requestsTo('/api/auth/logout');
    expect(revocations).toHaveLength(1);
    expect(revocations[0]?.method).toBe('POST');
    expect(revocations[0]?.authorization).toBe(`Bearer ${STORED_TOKEN}`);
    // A 204 carries no body, so the transport must return before reading one.
    expect(noContentJson).not.toHaveBeenCalled();

    expect(sessionIndicator()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Cart' })).toBeNull();
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe('loading session', () => {
  it('shows no account action while the stored token is still being verified', () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
    installFetch({ kind: 'pending' });

    renderShell();

    expect(linkHref('Menu')).toBe('/menu');
    expect(screen.queryByText('Log in')).toBeNull();
    expect(screen.queryByText('Register')).toBeNull();
    expect(screen.queryByText('Log out')).toBeNull();
    expect(screen.queryByText('Cart')).toBeNull();
    expect(sessionIndicator()).toBeNull();
    // The neutral shell is only right because a verification really is outstanding.
    expect(requestsTo('/api/auth/session')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// A 401 reported on a public screen: the navigation the session contract documents
// ---------------------------------------------------------------------------

describe('unauthorized session', () => {
  it('navigates a public screen to the login route when the transport reports a 401', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, STORED_TOKEN);
    // The documented envelope with one of its thirteen codes (rule R-6): the stored token is dead.
    installFetch({ kind: 'rejected', code: 'TOKEN_INVALID' });

    renderShell();

    // The shell navigated because the transport said so, not because a guard happened to render.
    expect(await screen.findByText(LOGIN_PROBE_TEXT)).not.toBeNull();
    expect(screen.queryByText(PROBE_TEXT)).toBeNull();
    // Clearing the stored token is the other half of the same contract, and it still happens.
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Success criterion 8: the responsive contract, read from the two stylesheets
// ---------------------------------------------------------------------------

describe('responsive contract', () => {
  it('declares the 44px touch-target token on :root', () => {
    const root = ruleFor(globalCss, ':root');

    expect(root).toBeDefined();
    expect(root?.body).toContain('--control-min-size: 44px');
  });

  it('prevents horizontal overflow at the 360px minimum supported width', () => {
    const page = ruleFor(globalCss, 'html, body');
    const body = ruleFor(globalCss, 'body');
    const app = ruleFor(globalCss, '.app');
    const main = ruleFor(globalCss, '.app-main');

    // The document and the two shell containers cap their width, so the column can never grow past
    // the viewport: the header nav, the 44px controls and every long name inside it wrap instead.
    expect(page?.body).toMatch(/max-width:\s*100%/);
    expect(app).toBeDefined();
    expect(app?.body).toMatch(/max-width:\s*100%/);
    expect(main).toBeDefined();
    expect(main?.body).toMatch(/max-width:\s*var\(--layout-max-width\)/);

    // Nothing clips the page. With no body-wide mask a child that really is too wide shows as a
    // broken layout at 360px, so the capped widths above are what keep the page from scrolling.
    expect(body).toBeDefined();
    expect(body?.body).not.toMatch(/overflow-x/);

    // Below the breakpoint each grid is a single minmax(0, ...) track. A bare `1fr`, `auto` or a
    // fixed length keeps an automatic minimum that refuses to shrink below its content, which is
    // how one long item name pushes the page wider than the narrowest supported width.
    for (const selector of ['.catalog-grid', '.cart-line', '.cart-summary']) {
      const grid = ruleFor(catalogCss, selector);
      const tracks = /grid-template-columns:\s*([^;]+)(?:;|$)/.exec(grid?.body ?? '');

      expect(grid).toBeDefined();
      expect(tracks).not.toBeNull();
      expect((tracks?.[1] ?? '').trim()).toMatch(/^minmax\(0,\s*[^)]+\)$/);
    }

    // Above the breakpoint the same grids add columns that size to the quantity field and the line
    // total, so `auto` is legitimate there. What no grid in either stylesheet may do is trust a
    // bare fraction or a fixed length, the shapes whose minimum cannot shrink.
    const trackLists = [...cssRules(globalCss), ...cssRules(catalogCss)].flatMap((rule) =>
      [...rule.body.matchAll(/grid-template-columns:\s*([^;]+)(?:;|$)/g)].map(
        (match) => match[1] ?? '',
      ),
    );

    expect(trackLists.length).toBeGreaterThan(0);
    for (const trackList of trackLists) {
      const outsideMinmax = trackList.replace(/minmax\([^)]*\)/g, '');

      expect(outsideMinmax).not.toMatch(/fr\b/);
      expect(outsideMinmax).not.toMatch(/\d+(?:px|rem|%)/);
    }

    // .category-filter is the one element meant to scroll sideways and the only rule in either
    // stylesheet that declares overflow-x at all; nothing else hides a wide child from the reader.
    const sideways = [...cssRules(globalCss), ...cssRules(catalogCss)]
      .filter((rule) => /(?:^|[\s;])overflow-x\s*:/.test(rule.body))
      .map((rule) => rule.selector);

    expect(sideways).toEqual(['.category-filter']);
  });

  it('uses one breakpoint value, 768px, across both stylesheets', () => {
    const everyPrelude = [...mediaPreludes(globalCss), ...mediaPreludes(catalogCss)];

    expect(everyPrelude.length).toBeGreaterThan(0);
    for (const prelude of everyPrelude) {
      expect(prelude).toBe('@media (min-width: 768px)');
    }
    // Both stylesheets document exactly one breakpoint, so neither may grow a second one.
    expect(mediaPreludes(globalCss)).toHaveLength(1);
    expect(mediaPreludes(catalogCss)).toHaveLength(1);
  });

  it('declares a one-column catalog grid by default', () => {
    const grid = ruleFor(catalogCss, '.catalog-grid');

    expect(grid).toBeDefined();
    expect(grid?.body).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(grid?.body).not.toMatch(/repeat\(2/);
  });

  it('declares the two-column grid inside the 768px block rather than outside it', () => {
    const block = mediaBlockBody(catalogCss, '@media (min-width: 768px)');
    const prepared = prepare(catalogCss);

    expect(block).not.toBeNull();
    expect(block ?? '').toMatch(
      /\.catalog-grid\s*\{[^{}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
    // Exactly one two-column declaration exists, and the block above holds it.
    expect([...prepared.matchAll(/repeat\(2,\s*minmax\(0,\s*1fr\)\)/g)]).toHaveLength(1);
  });

  it('sizes the shared interactive controls from the token', () => {
    for (const selector of ['.control', '.button']) {
      const rule = ruleFor(globalCss, selector);

      expect(rule).toBeDefined();
      expect(rule?.body).toMatch(/min-height:\s*var\(--control-min-size\)/);
      expect(rule?.body).toMatch(/min-width:\s*var\(--control-min-size\)/);
    }
  });
});

