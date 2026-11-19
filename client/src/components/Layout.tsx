/**
 * Layout — screen 9, the application shell.
 *
 * One responsibility: the persistent chrome around the router's outlet — the restaurant name, the
 * primary navigation whose items follow the session status, the session indicator, the page body and
 * the footer. It renders no screen of its own, loads no data, holds no state, and reads the cart
 * only for its badge count.
 *
 * Both contexts it consumes are required above it in the tree, together with a router context for
 * `NavLink`, `Outlet`, `useLocation` and `useNavigate` (supplied by `client/src/main.tsx`):
 * - `useSession` (`client/src/state/session.tsx`) supplies `status`, the signed-in `user`, the
 *   `logout` transition and `unauthorizedCount`; that provider owns restore, login, logout and the
 *   401 path, and records a 401 as a signal instead of routing, because it mounts above the router.
 * - `useCart` (`client/src/state/cart.tsx`) supplies `itemCount`, the in-memory badge count. The
 *   cart is never persisted, so nothing here reads or writes browser storage.
 * Outside those providers both hooks throw, which is the intended contract rather than a fallback.
 *
 * The router context is also where a 401 becomes a page change: this shell wraps every routed
 * screen, so it turns each new `unauthorizedCount` into the `replace` navigation to `/login` that
 * the session contract owes the visitor, on a public screen exactly as on a guarded one. The
 * address it navigates to is the guard's own, built by `loginRedirectTarget` from the address the
 * visitor was on, so an expired session loses nothing: signing in again returns them to the screen
 * they asked for, exactly as an anonymous visit behind the guard does.
 *
 * It is also where a page change becomes a change of keyboard position. A routed screen swaps
 * inside `<main>`, so the control that had focus unmounts with the outgoing screen and focus falls
 * to the document body, leaving the next Tab to resume from the top of the page. This shell
 * therefore moves focus to the new screen's heading — or to `<main>` itself when a screen renders
 * no `<h1>` — on a pathname change only, so a query-string change such as the catalog's category
 * filter leaves focus exactly where the visitor put it.
 *
 * One commit is not enough to place that focus, because a screen keeps committing after the route
 * change that mounted it. A screen that loads its data either renders a heading before the request
 * settles and then replaces the section holding it with another component, or renders its loading
 * card first and its heading once the request settles; either way the element a hand-over focused
 * leaves the document a moment after it received focus, and the browser drops focus to the document
 * body with it. The shell therefore owns the position on the page for as long as the screen it moved
 * into is settling — an ownership flag rather than a one-shot — and watches the page body for the
 * moment that element is replaced. The flag follows the page body rather than the pathname, because
 * the replacement happens when the data arrives, not when the route changes.
 *
 * Every visual rule lives in the layout-shell classes of `client/src/styles/global.css`: the
 * 44x44px control floor and the single 768px breakpoint — stacked navigation below it, a header row
 * at and above it — belong to that stylesheet, so this module declares no style, no media query and
 * no class name of its own. The session token is never rendered here, and no secret column is named.
 *
 * @module client/src/components/Layout
 */

import { useEffect, useRef, type JSX } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useCart } from '../state/cart';
import { useSession } from '../state/session';
import { loginRedirectTarget } from './ProtectedRoute';

/**
 * Classes of a navigation link, adding the stylesheet's active modifier for the page being shown.
 *
 * The stylesheet marks the current page with `.app-nav__link--active` and has no
 * `.app-nav__link.active` rule, so the class list has to be chosen per link rather than left to the
 * `active` class `NavLink` appends to a plain string `className`. `NavLink` keeps setting
 * `aria-current="page"` on the active link either way, which is the hook assistive technology reads.
 *
 * @param isActive - Whether this link points at the page currently rendered.
 * @returns The base link class, plus the active modifier when it applies.
 */
function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link';
}

/**
 * The landing point of a hand-over into the page body: the first heading the screen renders, or the
 * page body itself when it renders none.
 *
 * @param main - The page body every screen renders into.
 * @returns The element that takes the hand-over.
 */
function resolveFocusTarget(main: HTMLElement): HTMLElement {
  return main.querySelector<HTMLElement>('h1') ?? main;
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
  const { status, user, logout, unauthorizedCount } = useSession();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  /** The page body every screen renders into, and the fallback focus target of a route change. */
  const mainRef = useRef<HTMLElement | null>(null);
  // Seeded with the pathname of the first render, so mounting a screen never moves focus.
  const renderedPathname = useRef(location.pathname);
  /**
   * Whether the position on the page is still this shell's to place.
   *
   * Set by a route change and cleared the moment the visitor takes the position back, this flag is
   * what makes the hand-over survive a screen that keeps committing: it stays true across the
   * later commits that replace the element the route change focused, and ends at the first press
   * anywhere or the first focus that lands somewhere else. It is deliberately not a one-shot armed
   * only when a route change found no heading: a heading found now can be replaced by a later
   * commit, and this flag is what lets the observer below answer that replacement while the
   * position is still the shell's.
   */
  const ownsFocus = useRef(false);
  /**
   * The element the latest hand-over focused, which is the node whose replacement the observer
   * below has to notice. `null` until a route change places focus.
   */
  const focusTarget = useRef<HTMLElement | null>(null);

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

  // Seeded with the count of the first render, so mounting never navigates on an older 401.
  const seenUnauthorized = useRef(unauthorizedCount);

  /**
   * Performs the navigation a 401 owes the visitor: the sign-in screen, in `replace` mode.
   *
   * The provider that reports a 401 mounts above the router and owns no router API, so it records
   * the unauthorized signal and this shell acts on it — the layout route around every screen, where
   * `useNavigate` is available, on a public screen exactly as behind the guard. The ref is seeded at
   * mount so a first render navigates nothing, and it holds the signal already acted on so a later
   * re-render cannot repeat that navigation; each new 401 is a new signal and navigates again.
   *
   * The address comes from `loginRedirectTarget`, the builder the guard redirects through, and
   * carries the address the visitor was on in the guard's return-path parameter: an expired session
   * therefore loses nothing, and signing in again returns the visitor to the screen they asked for.
   * On the sign-in screen itself the address already carries that destination, and the builder
   * leaves it as it is rather than nesting one `from` inside another.
   */
  useEffect(() => {
    if (seenUnauthorized.current === unauthorizedCount) {
      return;
    }

    seenUnauthorized.current = unauthorizedCount;
    navigate(loginRedirectTarget(`${location.pathname}${location.search}`), { replace: true });
  }, [location.pathname, location.search, navigate, unauthorizedCount]);

  /**
   * Gives the page position to the screen now on display: its first heading, or the page body when
   * it renders none.
   *
   * The element that took the hand-over is recorded, because it is the node whose replacement the
   * observer below has to notice: a heading that the next commit removes is exactly how focus ends
   * up back on the document body. A heading that refuses the focus must not leave focus there
   * either, so the container takes the position in its place.
   *
   * Reads refs only, so the single observer created on mount can call it for the life of the shell.
   */
  const handOverFocus = (): void => {
    const main = mainRef.current;

    if (main === null) {
      return;
    }

    const target = resolveFocusTarget(main);

    focusTarget.current = target;
    target.focus();

    if (target !== main && document.activeElement !== target) {
      focusTarget.current = main;
      main.focus();
    }
  };

  /**
   * Completes a hand-over whose target the screen replaced, and gives the position back as soon as
   * the visitor takes it.
   *
   * The element a hand-over focused leaves the document whenever the screen it moved into commits
   * again: `ReservationConfirmationView` renders its loading section and then swaps in a different
   * component that holds the same heading, and `OrderConfirmationView` replaces the outgoing
   * screen's heading with a heading-less loading card. The browser answers the removal by moving
   * focus to the document body, so the observer focuses the heading the screen now renders — or
   * `<main>` while it still renders none — and keeps doing so for as long as the position is the
   * shell's. It also finishes what a route change alone cannot: a screen with no heading takes
   * `<main>`, and the heading it renders once its data arrives replaces that once focus is still on
   * the container.
   *
   * The ownership flag in front of every branch is what keeps this from moving focus behind the
   * visitor's back. A quantity keystroke, a refetch, a list re-render or a failed placement commits
   * DOM of its own, and each of those mutations finds focus exactly where it was left — on the
   * recorded element, still in the document — so nothing moves. The flag is set by the route change
   * below and cleared by the visitor's own next press or focus move, so once they have taken the
   * position back the observer is inert for the rest of that screen.
   *
   * One observer serves the life of the shell: `<main>` is the same element on every route, so it is
   * created once on mount, disconnected on unmount, and reads the live refs rather than state
   * captured when it was created. `pointerdown` and `focusin` are the two ways a visitor takes the
   * position back — a press anywhere, or focus landing on anything but the element this shell last
   * focused — and both sit on `document` because the control that takes it back may be in the
   * header or the footer rather than in the page body.
   *
   * A focus event whose target is the document body is not the visitor taking anything: it is the
   * browser resetting focus after a removal, which is the very case this observer answers, so it
   * leaves the flag alone. Focusing an element mutates nothing, so a completed hand-over produces
   * no mutation of its own and the exchange stops there.
   */
  useEffect(() => {
    const main = mainRef.current;

    if (main === null) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (!ownsFocus.current) {
        return;
      }

      const target = focusTarget.current;
      const replaced = target === null || !target.isConnected;
      const onBody = document.activeElement === document.body;
      // The route change could only reach `<main>` because the screen rendered no heading yet, so
      // the heading it renders once its data arrives is the landing point — while focus is still on
      // the container that stood in for it.
      const headingArrived =
        target === main && document.activeElement === main && main.querySelector('h1') !== null;

      if (!replaced && !onBody && !headingArrived) {
        return;
      }

      handOverFocus();
    });

    /** Ends the hand-over once the position on the page is the visitor's again. */
    const releaseFocus = (): void => {
      ownsFocus.current = false;
    };

    /**
     * @param event - A focus event anywhere in the document.
     */
    const handleFocusIn = (event: FocusEvent): void => {
      if (event.target === document.body || event.target === document.documentElement) {
        return;
      }

      if (event.target !== focusTarget.current) {
        ownsFocus.current = false;
      }
    };

    observer.observe(main, { childList: true, subtree: true });
    document.addEventListener('pointerdown', releaseFocus, true);
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', releaseFocus, true);
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, []);

  /**
   * Hands a route change's focus to the screen that route change rendered.
   *
   * The control a keyboard visitor had focus on belongs to the outgoing screen and unmounts with
   * it, which leaves focus on the document body; the next Tab then resumes from the top of the page
   * rather than from the screen now on display. The new screen's `<h1>` is the natural landing
   * point — every page heading carries `tabIndex={-1}` so it can receive focus without joining the
   * tab order — and `<main>`, programmatically focusable for the same reason, is the fallback for a
   * screen that renders no heading or whose heading refuses the focus.
   *
   * The pathname alone triggers this: the catalog's category filter changes only the query string,
   * and stealing focus mid-filter would move the visitor away from the control they are using. The
   * seeded ref makes the first render focus nothing, so arriving on a page never overrides
   * something the visitor already focused themselves.
   *
   * Every route change takes ownership of the position for what the new screen does next, which is
   * how the observer above answers a screen that replaces the very element this focused — the
   * replacement arrives commits later, when its data does.
   */
  useEffect(() => {
    if (renderedPathname.current === location.pathname) {
      return;
    }

    renderedPathname.current = location.pathname;
    // The position on the page is the shell's again until the visitor takes it back.
    ownsFocus.current = true;
    handOverFocus();
  }, [location.pathname]);

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
      <main className="app-main" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>Burger Restaurant</p>
      </footer>
    </div>
  );
}

export default Layout;
