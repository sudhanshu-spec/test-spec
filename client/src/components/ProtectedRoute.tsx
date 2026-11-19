/**
 * Protected Route — the client's single authentication guard.
 *
 * One responsibility: decide whether the guarded screen may render. It wraps exactly six routes in
 * `client/src/main.tsx` — `/cart`, `/orders`, `/orders/:id`, `/reservations`, `/reservations/new`
 * and `/reservations/:id` — rendering the screen once a session exists and sending an anonymous
 * visitor to `/login`; while the session is still being restored it shows a neutral status line.
 * It reads no route parameter, compares no ownership and renders no "forbidden" state: another
 * user's order or reservation answers 404 from the API, which is where ownership is enforced, so
 * an authorization check here would produce the 403 that rule forbids. Session restore, login,
 * logout and the 401 path belong to `useSession`; this module only acts on its status.
 *
 * @module client/src/components/ProtectedRoute
 */

import type { JSX, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../state/session';

/** Props of {@link ProtectedRoute}: the guarded screen, rendered once a session is established. */
export interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Guards a screen on the presence of a session.
 *
 * @param props - The guarded screen.
 * @returns The screen when the visitor is authenticated, a redirect to `/login` when anonymous,
 * or a status line while a stored token is being verified. `'loading'` deliberately does not
 * redirect: the session is neither verified nor absent yet, so redirecting would bounce a
 * returning visitor to the login screen on every reload.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { status } = useSession();

  if (status === 'loading') {
    // `role="status"` announces the wait and gives a test a role to query; no navigation here.
    return (
      <p className="empty-state" role="status">
        Restoring your session…
      </p>
    );
  }

  if (status === 'anonymous') {
    // `replace` keeps the guarded path out of history, so Back cannot re-enter it unauthenticated.
    return <Navigate to="/login" replace />;
  }

  // A fragment, not a wrapper element: the guard adds no box to the guarded screen's layout.
  return <>{children}</>;
}

export default ProtectedRoute;
