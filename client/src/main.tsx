/**
 * Client Entry Point
 *
 * The browser loads this module from `client/index.html` and nothing else does, so it is the
 * client's composition root: it loads the two stylesheets, declares the route surface once, derives
 * the router from that declaration, mounts the providers around it and renders into `#root`. It
 * holds no business logic, fetches nothing and reads no state — every screen, provider and request
 * lives in its own module, the same way `src/app.js` composes the server's pipeline while holding
 * none of its rules. Importing it under a test runner therefore renders nothing.
 *
 * Exported symbols:
 * - `routeManifest` — the complete route inventory, and the only declaration of the surface.
 * - `routes` — the `RouteObject` tree derived from that manifest, for inspection and tests.
 * - `router` — the browser router mounted below.
 *
 * @module client/src/main
 */

import './styles/global.css';
import './styles/catalog.css';

import type { ComponentType, JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { CartProvider } from './state/cart';
import { SessionProvider } from './state/session';
import CartView from './views/CartView';
import LoginView from './views/LoginView';
import MenuCatalogView from './views/MenuCatalogView';
import MenuItemView from './views/MenuItemView';
import NotFoundView from './views/NotFoundView';
import OrderConfirmationView from './views/OrderConfirmationView';
import RegisterView from './views/RegisterView';
import ReservationConfirmationView from './views/ReservationConfirmationView';
import ReservationFormView from './views/ReservationFormView';

/** One row of the client's route surface. */
export interface RouteManifestEntry {
  /** React Router path, e.g. `/menu/:id`. */
  readonly path: string;
  /** What the row is: the layout shell, the root redirect, a screen or the not-found view. */
  readonly kind: 'layout' | 'redirect' | 'screen' | 'not-found';
  /** Number in the ten-screen inventory, or null for the redirect. */
  readonly screen: number | null;
  /** Whether the row renders behind the session guard. */
  readonly requiresAuth: boolean;
  /** Repo-relative module path implementing the row, or null for the redirect. */
  readonly module: string | null;
}

/**
 * The complete route inventory: ten screens, the layout shell, the root redirect and the not-found
 * view. This array is the declared surface — a path exists because a row here describes it, so
 * adding a path means adding a row, and `routes` below can describe nothing this array omits.
 * There is no eleventh screen: `/cart` (screen 5) carries the checkout step as its Place Order
 * action, and `/orders` and `/reservations` render the history list of the same confirmation views
 * rather than screens of their own.
 */
export const routeManifest: readonly RouteManifestEntry[] = [
  { path: '/', kind: 'layout', screen: 9, requiresAuth: false, module: 'client/src/components/Layout.tsx' },
  { path: '/', kind: 'redirect', screen: null, requiresAuth: false, module: null },
  { path: '/login', kind: 'screen', screen: 2, requiresAuth: false, module: 'client/src/views/LoginView.tsx' },
  { path: '/register', kind: 'screen', screen: 1, requiresAuth: false, module: 'client/src/views/RegisterView.tsx' },
  { path: '/menu', kind: 'screen', screen: 3, requiresAuth: false, module: 'client/src/views/MenuCatalogView.tsx' },
  { path: '/menu/:id', kind: 'screen', screen: 4, requiresAuth: false, module: 'client/src/views/MenuItemView.tsx' },
  { path: '/cart', kind: 'screen', screen: 5, requiresAuth: true, module: 'client/src/views/CartView.tsx' },
  { path: '/orders', kind: 'screen', screen: 6, requiresAuth: true, module: 'client/src/views/OrderConfirmationView.tsx' },
  { path: '/orders/:id', kind: 'screen', screen: 6, requiresAuth: true, module: 'client/src/views/OrderConfirmationView.tsx' },
  { path: '/reservations/new', kind: 'screen', screen: 7, requiresAuth: true, module: 'client/src/views/ReservationFormView.tsx' },
  { path: '/reservations', kind: 'screen', screen: 8, requiresAuth: true, module: 'client/src/views/ReservationConfirmationView.tsx' },
  { path: '/reservations/:id', kind: 'screen', screen: 8, requiresAuth: true, module: 'client/src/views/ReservationConfirmationView.tsx' },
  { path: '*', kind: 'not-found', screen: 10, requiresAuth: false, module: 'client/src/views/NotFoundView.tsx' },
];

/** A manifest row that becomes a child of the layout route rather than the layout itself. */
type ChildManifestEntry = RouteManifestEntry & { readonly kind: 'redirect' | 'screen' | 'not-found' };

/**
 * Narrows a row to the children of the layout route.
 *
 * @param entry - Any manifest row.
 * @returns True for every row but the layout, which is the root route itself.
 */
function isChildEntry(entry: RouteManifestEntry): entry is ChildManifestEntry {
  return entry.kind !== 'layout';
}

/**
 * The screen views the manifest can name, keyed by the module path a row stores — so a row and the
 * component rendered for it come from one name, never from two lists that can drift.
 */
const VIEW_BY_MODULE: Readonly<Record<string, ComponentType>> = {
  'client/src/views/LoginView.tsx': LoginView,
  'client/src/views/RegisterView.tsx': RegisterView,
  'client/src/views/MenuCatalogView.tsx': MenuCatalogView,
  'client/src/views/MenuItemView.tsx': MenuItemView,
  'client/src/views/CartView.tsx': CartView,
  'client/src/views/OrderConfirmationView.tsx': OrderConfirmationView,
  'client/src/views/ReservationFormView.tsx': ReservationFormView,
  'client/src/views/ReservationConfirmationView.tsx': ReservationConfirmationView,
};

/**
 * Renders the view a screen row names, behind the session guard when the row asks for one. The
 * guard only establishes that somebody is signed in: ownership of an order or a reservation is the
 * API's to enforce, and it answers another user's record with 404.
 *
 * @param entry - A screen row.
 * @returns The guarded or unguarded screen element.
 */
function renderScreen(entry: ChildManifestEntry): JSX.Element {
  const View = entry.module === null ? undefined : VIEW_BY_MODULE[entry.module];

  if (View === undefined) {
    throw new Error(`Route manifest names no screen module "${String(entry.module)}".`);
  }

  const screen = <View />;

  return entry.requiresAuth ? <ProtectedRoute>{screen}</ProtectedRoute> : screen;
}

/**
 * Layouts, screens and the splat are siblings under the root route, so their absolute manifest
 * paths are written relative to it and the rendered URLs stay exactly the manifest's paths.
 *
 * @param path - An absolute React Router path from the manifest.
 * @returns The path relative to the root route.
 */
function toChildPath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

/**
 * Builds the child route one manifest row describes. The switch covers every child kind and returns
 * in each case, so a new kind fails to compile until it is handled here.
 *
 * @param entry - A child row of the manifest.
 * @returns The route for that row.
 */
function toChildRoute(entry: ChildManifestEntry): RouteObject {
  switch (entry.kind) {
    case 'redirect':
      return { index: true, element: <Navigate to="/menu" replace /> };
    case 'not-found':
      return { path: toChildPath(entry.path), element: <NotFoundView /> };
    case 'screen':
      return { path: toChildPath(entry.path), element: renderScreen(entry) };
  }
}

const layoutEntry = routeManifest.find((entry) => entry.kind === 'layout');

if (layoutEntry === undefined) {
  throw new Error('The route manifest declares no layout route to nest the screens in.');
}

/**
 * The router's route tree: the layout shell at the root, wrapping every other row, which `Layout`
 * renders through its outlet.
 */
export const routes: RouteObject[] = [
  {
    path: layoutEntry.path,
    element: <Layout />,
    children: routeManifest.filter(isChildEntry).map(toChildRoute),
  },
];

/** The browser router the providers wrap. */
export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);

// Guarded so that importing this module — as the reachability suite does to read the manifest —
// mounts nothing and needs no `#root`. The page is a client-rendered shell, not server markup,
// which is why the root is created rather than hydrated.
const rootElement = document.getElementById('root');

if (rootElement !== null) {
  createRoot(rootElement).render(
    <SessionProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </SessionProvider>,
  );
}
