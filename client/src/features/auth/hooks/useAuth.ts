/**
 * @fileoverview Custom useAuth hook for authentication operations
 * @module features/auth/hooks/useAuth
 *
 * This module provides a convenient wrapper around the AuthContext for components
 * to interact with the authentication system. It exposes login, logout, and token
 * refresh operations along with authentication state and error handling.
 *
 * The hook adds error state management on top of the base AuthContext, allowing
 * components to easily display authentication errors to users.
 */

import { useState, useCallback } from 'react';
import { useAuthContext } from '../AuthContext';

/**
 * Represents the authenticated user in the system.
 * Re-exported from AuthContext for convenience.
 */
export interface AuthUser {
  /** Unique identifier for the user */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** Optional role for authorization purposes */
  role?: string;
}

/**
 * Result interface for the useAuth hook.
 * Provides all authentication state and operations needed by components.
 *
 * @interface UseAuthResult
 */
export interface UseAuthResult {
  /**
   * Currently authenticated user, or null if not authenticated.
   */
  user: AuthUser | null;

  /**
   * Whether the user is currently authenticated.
   * True if user has valid credentials, false otherwise.
   */
  isAuthenticated: boolean;

  /**
   * Whether an authentication operation is in progress.
   * True during login, logout, or token refresh operations.
   */
  isLoading: boolean;

  /**
   * Authenticates a user with email and password.
   * Sets error state if authentication fails.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise that resolves on successful login, rejects on failure
   */
  login: (email: string, password: string) => Promise<void>;

  /**
   * Logs out the current user and clears session.
   * Sets error state if logout fails.
   *
   * @returns Promise that resolves on successful logout
   */
  logout: () => Promise<void>;

  /**
   * Refreshes the current JWT token.
   * Sets error state if token refresh fails.
   *
   * @returns Promise that resolves on successful token refresh
   */
  refreshToken: () => Promise<void>;

  /**
   * Current authentication error, or null if no error.
   * Populated when login, logout, or token refresh fails.
   */
  error: Error | null;

  /**
   * Clears the current error state.
   * Call this when dismissing error messages.
   */
  clearError: () => void;
}

/**
 * Custom hook providing convenient access to authentication operations and state.
 *
 * This hook wraps the useAuthContext hook from AuthContext and adds error state
 * management for handling authentication failures. It provides a simplified
 * interface for components to interact with the authentication system.
 *
 * Must be used within an AuthProvider component.
 *
 * @returns {UseAuthResult} Authentication state and operations
 * @throws {Error} If used outside of an AuthProvider
 *
 * @example Basic usage
 * ```tsx
 * function LoginPage() {
 *   const { login, isLoading, error } = useAuth();
 *
 *   const handleSubmit = async (email: string, password: string) => {
 *     await login(email, password);
 *   };
 *
 *   if (error) {
 *     return <div>Error: {error.message}</div>;
 *   }
 *
 *   return <LoginForm onSubmit={handleSubmit} disabled={isLoading} />;
 * }
 * ```
 *
 * @example Checking authentication status
 * ```tsx
 * function Dashboard() {
 *   const { user, isAuthenticated, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <Redirect to="/login" />;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user?.name}!</h1>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Token refresh
 * ```tsx
 * function App() {
 *   const { refreshToken, error, clearError } = useAuth();
 *
 *   useEffect(() => {
 *     // Refresh token every 14 minutes
 *     const interval = setInterval(async () => {
 *       try {
 *         await refreshToken();
 *       } catch (e) {
 *         console.error('Token refresh failed');
 *       }
 *     }, 14 * 60 * 1000);
 *
 *     return () => clearInterval(interval);
 *   }, [refreshToken]);
 *
 *   return <AppContent />;
 * }
 * ```
 */
export function useAuth(): UseAuthResult {
  // Get authentication context
  const authContext = useAuthContext();

  // Local error state for tracking authentication errors
  const [error, setError] = useState<Error | null>(null);

  /**
   * Clears the current error state.
   * Use this when dismissing error messages or before retrying operations.
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Wrapped login function that captures errors.
   * Clears previous errors before attempting login.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise that resolves on successful login
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      // Clear any previous error before attempting login
      setError(null);

      try {
        await authContext.login(email, password);
      } catch (err) {
        // Capture and store the error
        const authError = err instanceof Error 
          ? err 
          : new Error('An unexpected error occurred during login');
        setError(authError);
        // Re-throw so the calling component can also handle it
        throw authError;
      }
    },
    [authContext]
  );

  /**
   * Wrapped logout function that captures errors.
   * Clears previous errors before attempting logout.
   *
   * @returns Promise that resolves on successful logout
   */
  const logout = useCallback(async (): Promise<void> => {
    // Clear any previous error before attempting logout
    setError(null);

    try {
      await authContext.logout();
    } catch (err) {
      // Capture and store the error
      const authError = err instanceof Error 
        ? err 
        : new Error('An unexpected error occurred during logout');
      setError(authError);
      // Re-throw so the calling component can also handle it
      throw authError;
    }
  }, [authContext]);

  /**
   * Wrapped token refresh function that captures errors.
   * Clears previous errors before attempting token refresh.
   *
   * @returns Promise that resolves on successful token refresh
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    // Clear any previous error before attempting token refresh
    setError(null);

    try {
      await authContext.refreshToken();
    } catch (err) {
      // Capture and store the error
      const authError = err instanceof Error 
        ? err 
        : new Error('An unexpected error occurred during token refresh');
      setError(authError);
      // Re-throw so the calling component can also handle it
      throw authError;
    }
  }, [authContext]);

  // Return the hook result with all authentication state and operations
  return {
    user: authContext.user,
    isAuthenticated: authContext.isAuthenticated,
    isLoading: authContext.isLoading,
    login,
    logout,
    refreshToken,
    error,
    clearError,
  };
}
