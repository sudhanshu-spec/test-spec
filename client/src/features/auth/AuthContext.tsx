/**
 * @fileoverview Authentication context provider for managing user auth state
 * @module features/auth/AuthContext
 * 
 * This module provides the authentication context, provider component, and hook
 * for managing user authentication state throughout the application. It handles
 * JWT token storage, session persistence, and exposes login/logout operations.
 * 
 * Security-critical component with 100% test coverage target.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Represents an authenticated user in the system.
 * @interface AuthUser
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
 * Represents the authentication state of the application.
 * @interface AuthState
 */
export interface AuthState {
  /** Currently authenticated user, or null if not authenticated */
  user: AuthUser | null;
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether authentication status is being determined */
  isLoading: boolean;
  /** JWT token for API authentication, or null if not authenticated */
  token: string | null;
}

/**
 * Complete context value including state and methods.
 * @interface AuthContextValue
 */
export interface AuthContextValue extends AuthState {
  /**
   * Authenticates a user with email and password.
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise that resolves on successful login
   * @throws Error if login fails
   */
  login: (email: string, password: string) => Promise<void>;
  
  /**
   * Logs out the current user and clears session.
   * @returns Promise that resolves on successful logout
   */
  logout: () => Promise<void>;
  
  /**
   * Refreshes the current JWT token.
   * @returns Promise that resolves on successful token refresh
   * @throws Error if token refresh fails
   */
  refreshToken: () => Promise<void>;
}

/**
 * Props for the AuthProvider component.
 * @interface AuthProviderProps
 */
interface AuthProviderProps {
  /** Child components to wrap with auth context */
  children: ReactNode;
  /** Optional initial state for testing purposes */
  initialState?: Partial<AuthState>;
}

/**
 * Storage key for persisting the auth token in localStorage.
 * @constant
 */
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Storage key for persisting user data in localStorage.
 * @constant
 */
const AUTH_USER_KEY = 'auth_user';

/**
 * Default authentication state when no user is authenticated.
 * @constant
 */
const DEFAULT_AUTH_STATE: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  token: null,
};

/**
 * Authentication context for sharing auth state across components.
 * Should be accessed via the useAuthContext hook.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Safely parses JSON from localStorage.
 * @param key - The localStorage key to read
 * @returns The parsed value or null if parsing fails or key doesn't exist
 */
function getStoredValue<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return null;
    }
    return JSON.parse(stored) as T;
  } catch (error) {
    // Clear corrupted data
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Safely stores a value in localStorage as JSON.
 * @param key - The localStorage key to write
 * @param value - The value to store
 */
function setStoredValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Storage quota exceeded or other error - silently fail
    console.error('Failed to store value in localStorage:', error);
  }
}

/**
 * Removes a value from localStorage.
 * @param key - The localStorage key to remove
 */
function removeStoredValue(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove value from localStorage:', error);
  }
}

/**
 * Validates that a token has not expired.
 * @param token - JWT token to validate
 * @returns true if token is valid and not expired, false otherwise
 */
function isTokenValid(token: string): boolean {
  try {
    // Decode JWT payload (base64)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration if present
    if (payload.exp) {
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      // Token is expired if current time is past expiration
      if (currentTime >= expirationTime) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    // Invalid token format
    return false;
  }
}

/**
 * AuthProvider component that wraps the application to provide authentication
 * state to all child components.
 * 
 * @param props - Component props
 * @param props.children - Child components to wrap
 * @param props.initialState - Optional initial state for testing
 * @returns Provider component wrapping children
 * 
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 * 
 * @example Testing with initial state
 * ```tsx
 * <AuthProvider initialState={{ isAuthenticated: true, user: mockUser }}>
 *   <ComponentUnderTest />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children, initialState }: AuthProviderProps): React.ReactElement {
  // Initialize state with provided initial state merged with defaults
  const [authState, setAuthState] = useState<AuthState>(() => ({
    ...DEFAULT_AUTH_STATE,
    ...initialState,
    // Start with loading true if we need to check stored credentials
    isLoading: initialState?.isLoading ?? true,
  }));

  /**
   * Check for stored authentication on mount.
   * Validates stored token and restores session if valid.
   */
  useEffect(() => {
    // Skip initialization if initial state was provided (for testing)
    // Preserve the isLoading state if explicitly provided for testing loading states
    if (initialState?.user !== undefined || initialState?.isAuthenticated !== undefined) {
      if (initialState?.isLoading === undefined) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
      return;
    }

    const initializeAuth = async (): Promise<void> => {
      try {
        const storedToken = getStoredValue<string>(AUTH_TOKEN_KEY);
        const storedUser = getStoredValue<AuthUser>(AUTH_USER_KEY);

        if (storedToken && storedUser && isTokenValid(storedToken)) {
          setAuthState({
            user: storedUser,
            isAuthenticated: true,
            isLoading: false,
            token: storedToken,
          });
        } else {
          // Clear any invalid stored data
          removeStoredValue(AUTH_TOKEN_KEY);
          removeStoredValue(AUTH_USER_KEY);
          setAuthState({
            ...DEFAULT_AUTH_STATE,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        setAuthState({
          ...DEFAULT_AUTH_STATE,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, [initialState]);

  /**
   * Authenticates a user with email and password.
   * On success, stores the token and user data, updates state.
   * 
   * @param email - User's email address
   * @param password - User's password
   * @throws Error if login fails or credentials are invalid
   */
  const login = async (email: string, password: string): Promise<void> => {
    // Validate inputs
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Make API call to authenticate
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid email or password');
      }

      const data = await response.json();

      // Validate response structure
      if (!data.token || !data.user) {
        throw new Error('Invalid response from authentication server');
      }

      const { token, user } = data as { token: string; user: AuthUser };

      // Store credentials for session persistence
      setStoredValue(AUTH_TOKEN_KEY, token);
      setStoredValue(AUTH_USER_KEY, user);

      // Update state
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        token,
      });
    } catch (error) {
      // Reset to unauthenticated state on failure
      setAuthState({
        ...DEFAULT_AUTH_STATE,
        isLoading: false,
      });
      
      // Re-throw for caller to handle
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed. Please try again.');
    }
  };

  /**
   * Logs out the current user.
   * Clears stored credentials and resets state.
   */
  const logout = async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Optionally notify backend of logout (for token invalidation)
      if (authState.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.token}`,
          },
        }).catch(() => {
          // Ignore errors - we'll clear local state regardless
        });
      }
    } finally {
      // Clear stored credentials
      removeStoredValue(AUTH_TOKEN_KEY);
      removeStoredValue(AUTH_USER_KEY);

      // Reset state
      setAuthState({
        ...DEFAULT_AUTH_STATE,
        isLoading: false,
      });
    }
  };

  /**
   * Refreshes the current JWT token.
   * Used to extend session before token expires.
   * 
   * @throws Error if not authenticated or refresh fails
   */
  const refreshToken = async (): Promise<void> => {
    if (!authState.token || !authState.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to refresh token');
      }

      const data = await response.json();

      if (!data.token) {
        throw new Error('Invalid response from token refresh');
      }

      const { token } = data as { token: string };

      // Update stored token
      setStoredValue(AUTH_TOKEN_KEY, token);

      // Update state with new token
      setAuthState(prev => ({
        ...prev,
        token,
        isLoading: false,
      }));
    } catch (error) {
      // On refresh failure, log out the user (token may be invalid)
      removeStoredValue(AUTH_TOKEN_KEY);
      removeStoredValue(AUTH_USER_KEY);

      setAuthState({
        ...DEFAULT_AUTH_STATE,
        isLoading: false,
      });

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to refresh authentication');
    }
  };

  // Construct context value
  const contextValue: AuthContextValue = {
    ...authState,
    login,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook for consuming authentication context.
 * Must be used within an AuthProvider.
 * 
 * @returns The authentication context value
 * @throws Error if used outside of AuthProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuthContext();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginForm onSubmit={login} />;
 *   }
 *   
 *   return <div>Welcome, {user?.name}!</div>;
 * }
 * ```
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}
