/**
 * Layout — screen 9, the application shell.
 *
 * One responsibility: the persistent chrome around the router's outlet — the restaurant name, the
 * primary navigation whose items follow the session status, the session indicator, the page body and
 * the footer. It renders no screen of its own, loads no data, holds no state, and reads the cart
 * only for its badge count.
 *
 * Both contexts it consumes are required above it in the tree, together with a router context for
 * `NavLink`, `Outlet` and `useNavigate` (supplied by `client/src/main.tsx`):
 * - `useSession` (`client/src/state/session.tsx`) supplies `status`, the signed-in `user` and the
 *   `logout` transition; that provider owns restore, login, logout and the 401 path.
 * - `useCart` (`client/src/state/cart.tsx`) supplies `itemCount`, the in-memory badge count. The
 *   cart is never persisted, so nothing here reads or writes browser storage.
 * Outside those providers both hooks throw, which is the intended contract rather than a fallback.
 *
 * Every visual rule lives in the layout-shell classes of `client/src/styles/global.css`: the
 * 44x44px control floor and the single 768px breakpoint — stacked navigation below it, a header row
 * at and above it — belong to that stylesheet, so this module declares no style, no media query and
 * no class name of its own. The session token is never rendered here, and no secret column is named.
 *
 * @module client/src/components/Layout
 */

import type { JSX } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useCart } from '../state/cart';
import { useSession } from '../state/session';

/**
 * Classes of a navigation link, adding the stylesheet's active modifier for the page being shown.
 *
 * The stylesheet marks the current page with `.app-nav__link--active` and has no
 * `.app-nav__link.active` rule, so the class list has to be chosen per link rather than left to the
 * `active` class `NavLink` appends to a plain string `className`. `NavLink` keeps setting
 * `aria-current="page"` on the active link either way, which is the hook assistive technology reads.
 *
 * @param state - Whether this link points at the page currently rendered.
 * @returns The base link class, plus the active modifier when it applies.
 */
function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link';
}

/**
 * Screen 9: the shell wrapped around every screen of the client.
 *
 * The navigation shows the catalog always, and then one of two account sets: while a session is
 * being restored it shows neither, so a returning visitor never sees the signed-out links flash
 * before the stored token is verified; once the session resolves it shows the cart, orders,
 * reservations and the logout control, or the login and registration links.
 *
 * @returns The header, the routed page body and the footer.
 */
export function Layout(): JSX.Element {
  const { status, user, logout } = useSession();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const isAuthenticated = status === 'authenticated';
  const isAnonymous = status === 'anonymous';

  /**
   * Ends the session and returns the visitor to a public screen.
   *
   * The navigation runs in `finally` because the session is over either way: the provider clears the
   * token and the account even when the revocation request fails, and a rejected promise must not
   * strand the visitor on a protected screen that would then bounce them to the login form. `/menu`
   * is public, and `replace` keeps the authenticated screen out of the history stack.
   *
   * A failed revocation is caught rather than rethrown: the abandoned session is already cleared, so
   * there is nothing the visitor could do with the error, and letting it escape the event handler
   * would surface as an unhandled rejection in the browser console.
   *
   * @returns A promise that settles once the visitor has been routed away.
   */
  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch {
      // Nothing to show: the token is already unusable and the provider has cleared the session.
    } finally {
      navigate('/menu', { replace: true });
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__brand">Burger Restaurant</span>
        <nav className="app-nav" aria-label="Main navigation">
          <NavLink to="/menu" className={navLinkClass}>
            Menu
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/cart" className={navLinkClass}>
                Cart{itemCount > 0 ? ` (${itemCount})` : ''}
              </NavLink>
              <NavLink to="/orders" className={navLinkClass}>
                Orders
              </NavLink>
              <NavLink to="/reservations" className={navLinkClass}>
                Reservations
              </NavLink>
              <button type="button" className="button" onClick={() => void handleLogout()}>
                Log out
              </button>
            </>
          ) : null}
          {isAnonymous ? (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Log in
              </NavLink>
              <NavLink to="/register" className={navLinkClass}>
                Register
              </NavLink>
            </>
          ) : null}
        </nav>
        {isAuthenticated && user ? (
          <p className="session-indicator" data-status={status}>
            Signed in as <strong className="session-indicator__name">{user.name}</strong>
            {user.email ? <span> ({user.email})</span> : null}
          </p>
        ) : null}
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>Burger Restaurant</p>
      </footer>
    </div>
  );
}

export default Layout;
