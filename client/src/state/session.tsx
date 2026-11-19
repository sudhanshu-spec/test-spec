/**
 * Session State Module
 *
 * The client's single source of identity: the opaque token, the account it belongs to, the status
 * between them, and the one seam into `client/src/api/client.ts` — the token getter the transport
 * reads for the Bearer header of every request that does not opt out, and the handler that ends a
 * 401'd session and counts it. Only the token is persisted, in `localStorage` under the key
 * declared below, opaque and never decoded; the account is the API's secret-free projection, held
 * in memory, so no password or hash is stored or logged here. Routing, data fetching, cart state
 * and view rendering are absent by design: this provider mounts above the router, so
 * `ProtectedRoute` acts on `status`, the shell on the count.
 *
 * @module client/src/state/session
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { configureApiClient } from '../api/client';
import { logout as logoutRequest, session as fetchSession } from '../api/auth';
import type { AuthResponse, User } from '../api/types';

/** Storage key of the opaque token; the only place this literal appears. */
const TOKEN_STORAGE_KEY = 'burger.auth.token';

/** @returns The token kept for this browser, or null when none is stored or none is readable. */
function readStoredToken(): string | null {
  try {
    const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_STORAGE_KEY);
    return stored === null || stored === '' ? null : stored;
  } catch {
    // An unreadable token only means an anonymous session, never a failed render.
    return null;
  }
}

/** @param token - Keeps the token for the next visit; a denied or full store costs only that. */
function persistToken(token: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // This visit stays authenticated: the token also lives in state.
  }
}

/** Forgets the stored token; a no-op with no browser or no storage access. */
function clearStoredToken(): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // The caller clears the in-memory token either way.
  }
}

/** A session is being verified, it is verified, or nobody is signed in. */
export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

/** What the provider exposes and {@link useSession} returns. */
export interface SessionValue {
  token: string | null;
  user: User | null;
  status: SessionStatus;
  login(auth: AuthResponse): void;
  logout(): Promise<void>;
  /** 401s the transport has reported since mount: the signal a router-level consumer navigates on. */
  unauthorizedCount: number;
}

/** Null outside a provider, which makes {@link useSession} fail loudly rather than silently. */
const SessionContext = createContext<SessionValue | null>(null);

/**
 * Holds the session for the whole client and wires it to the API transport: a stored token is
 * verified once on mount through `GET /api/auth/session`; `login`, `logout` and a 401 follow.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<User | null>(null);
  // Resolved on the first render only: cleared storage starts anonymous, a stored token verifies.
  const [status, setStatus] = useState<SessionStatus>(token ? 'loading' : 'anonymous');
  const [unauthorizedCount, setUnauthorizedCount] = useState(0);

  const tokenRef = useRef<string | null>(token);
  const restoredRef = useRef(false);
  const activeRef = useRef(true);

  /** Ends the session everywhere it is held: storage, the transport's token and the state. */
  const clearSession = useCallback(() => {
    clearStoredToken();
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const getToken = useCallback((): string | null => tokenRef.current, []);
  const onUnauthorized = useCallback(() => {
    clearSession();
    setUnauthorizedCount((count) => count + 1);
  }, [clearSession]);

  // The sole registrant of the transport hooks; both callbacks are stable, so they register once
  // and come off on unmount. This provider mounts above the router and owns no router API: it
  // records the unauthorized signal, and the shell below the router performs the documented
  // `replace` navigation to /login. This effect must stay ahead of the restore below — effects run
  // in declaration order, and the restore carries no Bearer header until the getter exists.
  useEffect(() => {
    configureApiClient({ getToken, onUnauthorized });
    return () => configureApiClient(null);
  }, [getToken, onUnauthorized]);

  // The transport reads the token through a ref, so the ref follows every change; the transitions
  // below also set it synchronously, ahead of their own re-render.
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // One restore attempt per mount: the ref stops StrictMode's second invocation issuing a second
  // request, and `activeRef` lets the first one's result land — unless the provider unmounted.
  useEffect(() => {
    activeRef.current = true;
    const deactivate = () => {
      activeRef.current = false;
    };

    if (restoredRef.current || tokenRef.current === null) {
      return deactivate;
    }

    restoredRef.current = true;
    const restoring = tokenRef.current;

    void fetchSession()
      .then((restored) => {
        // A login or logout during the round trip has moved the session on; this result is stale.
        if (!activeRef.current || tokenRef.current !== restoring) {
          return;
        }
        setUser(restored.user);
        setStatus('authenticated');
      })
      .catch(() => {
        // The same is true of a failure: it must not clear a session opened meanwhile.
        if (!activeRef.current || tokenRef.current !== restoring) {
          return;
        }
        // One total failure path, whatever was rejected: the documented token codes
        // (`TOKEN_REQUIRED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`), status 0 for an unreachable
        // server, or anything unexpected. Clearing unconditionally is deliberate — a 401 has
        // normally cleared the session, and gating would trust an unverified token, leaving 'loading'.
        clearSession();
      });

    return deactivate;
  }, [clearSession]);

  const login = useCallback((auth: AuthResponse) => {
    persistToken(auth.token);
    tokenRef.current = auth.token;
    setToken(auth.token);
    setUser(auth.user);
    setStatus('authenticated');
  }, []);

  // The session ends whether or not the server confirmed the revocation: a rejected call leaves the
  // token already unusable, an unreachable one leaves it unverifiable.
  const logout = useCallback(async (): Promise<void> => {
    await logoutRequest().catch(() => undefined);
    clearSession();
  }, [clearSession]);

  const value = useMemo<SessionValue>(
    () => ({ token, user, status, unauthorizedCount, login, logout }),
    [token, user, status, unauthorizedCount, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * @returns The session of the nearest {@link SessionProvider}, the unauthorized count included.
 * @throws {Error} Outside a provider, where an always-anonymous screen would hide a real bug.
 */
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return value;
}
