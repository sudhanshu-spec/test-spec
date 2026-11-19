/**
 * @fileoverview Client-side not-found view — screen 10 of the ten-screen
 * inventory.
 *
 * Rendered by the catch-all `*` entry in the route table owned by
 * `client/src/main.tsx`, for any path the single-page client does not recognise.
 * It lives inside the layout route, so the shell above it already supplies the
 * header, the navigation and the footer: this module renders the page body only
 * and deliberately contains no `<header>`, `<nav>` or `<footer>` markup of its
 * own.
 *
 * This is a routing outcome, not a server answer. Nothing here requests a path
 * or assumes what Express does with an unknown one — Express keeps its own
 * default 404 for paths outside `/api`, and the API's `ROUTE_NOT_FOUND`
 * envelope belongs to the server's JSON surface, not to this screen. There is no
 * `fetch`, no api module, no effect and no error object: the session status is
 * this view's whole input, and it decides only which next steps are offered.
 *
 * The catalog is reachable without an account, so its link is always shown, and
 * the remaining links follow the visitor's session status:
 * - `authenticated` also offers the caller's orders and reservations;
 * - `anonymous` offers login and registration instead;
 * - `loading` offers the catalog alone, so a returning visitor never sees the
 *   signed-in next steps flash before the stored session is verified.
 *
 * @module client/src/views/NotFoundView
 */

import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { useSession } from '../state/session';

/**
 * Screen 10: the message shown for a path this client does not recognise, with a
 * calm way back into the application rather than a technical report.
 *
 * @returns The not-found block for the current session status.
 */
export function NotFoundView(): JSX.Element {
  const { status } = useSession();

  return (
    <div className="not-found">
      <h1 className="page-title">Page not found</h1>
      <p>We could not find the page you were looking for. It may have moved, or the link may be incomplete.</p>

      <div className="row">
        <Link className="button" to="/menu">
          Browse the menu
        </Link>
        {status === 'authenticated' ? (
          <>
            <Link className="button button--secondary" to="/orders">
              Your orders
            </Link>
            <Link className="button button--secondary" to="/reservations">
              Your reservations
            </Link>
          </>
        ) : null}
        {status === 'anonymous' ? (
          <>
            <Link className="button button--secondary" to="/login">
              Log in
            </Link>
            <Link className="button button--secondary" to="/register">
              Create an account
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default NotFoundView;
