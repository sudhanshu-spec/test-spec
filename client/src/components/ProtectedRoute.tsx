/**
 * Protected Route — the client's single authentication guard.
 *
 * One responsibility: decide whether the guarded screen may render. It wraps exactly six routes in
 * `client/src/main.tsx` — `/cart`, `/orders`, `/orders/:id`, `/reservations`, `/reservations/new`
 * and `/reservations/:id` — rendering the screen once a session exists and sending an anonymous
 * visitor to `/login`, with the address they asked for carried in the {@link RETURN_PATH_PARAM}
 * query parameter so the sign-in screen can say why they were sent there and return them to it
 * afterwards; while the session is still being restored it shows a neutral status line. That
 * address is built by {@link loginRedirectTarget}, which the shell's 401 handler uses as well, so
 * the two navigations cannot send a visitor to different places.
 * It reads no route parameter, compares no ownership and renders no "forbidden" state: another
 * user's order or reservation answers 404 from the API, which is where ownership is enforced, so
 * an authorization check here would produce the 403 that rule forbids. Session restore, login,
 * logout and the 401 path belong to `useSession`; this module only acts on its status.
 *
 * @module client/src/components/ProtectedRoute
 */

import type { JSX, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../state/session';

/**
 * Query parameter of the sign-in address that carries the guarded address the visitor asked for.
 *
 * The guard discards nothing it can pass on: the login screen reads this parameter to name what the
 * visitor was trying to open and to send them back once the session is open.
 */
export const RETURN_PATH_PARAM = 'from';

/**
 * Address of the sign-in screen.
 *
 * Declared once because two navigations send a visitor there — this guard's redirect and the
 * shell's 401 handler — and both build the address through {@link loginRedirectTarget}, so the page
 * a visitor asked for survives the two of them alike.
 */
export const LOGIN_PATH = '/login';

/**
 * The sign-in address a visitor is sent to, carrying the address they were on.
 *
 * @param returnPath - The address the visitor was on, path and query string.
 * @returns The sign-in address with `returnPath` in {@link RETURN_PATH_PARAM}; or `returnPath`
 * itself when it already is the sign-in screen, which may carry the destination the visitor is on
 * their way to — a second `from` would nest inside the first.
 */
export function loginRedirectTarget(returnPath: string): string {
  if (returnPath === LOGIN_PATH || returnPath.startsWith(`${LOGIN_PATH}?`)) {
    return returnPath;
  }

  return `${LOGIN_PATH}?${RETURN_PATH_PARAM}=${encodeURIComponent(returnPath)}`;
}

/** Props of {@link ProtectedRoute}: the guarded screen, rendered once a session is established. */
export interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * The redirect an anonymous visitor receives, carrying the address they were trying to open.
 *
 * A component of its own so that the current location is read only on the branch that redirects:
 * `useLocation`, like the `Navigate` it feeds, requires a router above it, and an authenticated
 * child must keep rendering for a caller that mounts the guard without one.
 *
 * @returns The `replace` navigation to the sign-in screen, with the guarded address in
 * {@link RETURN_PATH_PARAM}, built by {@link loginRedirectTarget}.
 */
function LoginRedirect(): JSX.Element {
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}`;

  return <Navigate to={loginRedirectTarget(returnPath)} replace />;
}

/**
 * Guards a screen on the presence of a session.
 *
 * @param props - The guarded screen.
 * @returns The screen when the visitor is authenticated, a redirect to `/login` when anonymous,
 * or a status line while a stored token is being verified. The redirect carries the guarded
 * address in {@link RETURN_PATH_PARAM}, so the sign-in screen can explain the redirect and resume
 * it; `'loading'` deliberately does not redirect: the session is neither verified nor absent yet,
 * so redirecting would bounce a returning visitor to the login screen on every reload.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { status } = useSession();

  if (status === 'loading') {
    // `role="status"` announces the wait and gives a test a role to query; no navigation here.
    return (
      <p className="state-panel" role="status">
        Restoring your session…
      </p>
    );
  }

  if (status === 'anonymous') {
    // `replace` keeps the guarded path out of history, so Back cannot re-enter it unauthenticated.
    // The address travels in the query string instead of the history stack: the sign-in screen
    // reads it to explain the redirect and to return the visitor here once the session is open.
    return <LoginRedirect />;
  }

  // A fragment, not a wrapper element: the guard adds no box to the guarded screen's layout.
  return <>{children}</>;
}

export default ProtectedRoute;
