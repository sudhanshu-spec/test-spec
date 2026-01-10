/**
 * @fileoverview Unit tests for useAuth custom hook
 * @module tests/features/auth/useAuth
 *
 * Comprehensive test suite for the useAuth authentication hook covering:
 * - Login operations with valid and invalid credentials
 * - Logout functionality and session clearing
 * - Token management including refresh and persistence
 * - Authentication state queries (user, isAuthenticated, isLoading)
 * - Error handling for various failure scenarios
 *
 * Tests follow patterns established in tests/lifecycle/server.test.js with:
 * - JSDoc documentation standards
 * - Helper factory functions for test setup
 * - AAA pattern (Arrange, Act, Assert)
 * - Minimum 3 assertions per test case
 *
 * Uses Vitest with React Testing Library renderHook utility and MSW for API mocking.
 */

import React, { ReactNode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from '../AuthContext';
import {
  validUser,
  validCredentials,
  invalidCredentials,
  type TestUser,
  type LoginCredentials,
} from '../../../__tests__/fixtures/users';
import { server } from '../../../__tests__/mocks/server';
import { http, HttpResponse } from 'msw';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result interface for the useAuth hook.
 * Documents the expected shape of the hook's return value for type safety.
 *
 * @typedef {Object} UseAuthResult
 * @property {Object|null} user - Currently authenticated user or null
 * @property {boolean} isAuthenticated - Whether user is authenticated
 * @property {boolean} isLoading - Whether an auth operation is in progress
 * @property {Function} login - Function to authenticate user
 * @property {Function} logout - Function to end session
 * @property {Function} refreshToken - Function to refresh JWT token
 * @property {Error|null} error - Current authentication error or null
 * @property {Function} clearError - Function to clear error state
 */
interface UseAuthResult {
  user: TestUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  error: Error | null;
  clearError: () => void;
}

/**
 * Props for the test wrapper component.
 * @typedef {Object} WrapperProps
 */
interface WrapperProps {
  children: ReactNode;
}

// ============================================================================
// Test Constants
// ============================================================================

/**
 * API endpoints for authentication operations.
 * @constant
 */
const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
} as const;

/**
 * Storage keys for localStorage persistence.
 * Must match the keys used in AuthContext.tsx.
 * @constant
 */
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
} as const;

/**
 * Test JWT tokens for authentication testing.
 * @constant
 */
const TEST_TOKENS = {
  VALID: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsImVtYWlsIjoiam9obi5kb2VAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjo5OTk5OTk5OTk5fQ.test_signature',
  EXPIRED: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsImVtYWlsIjoiam9obi5kb2VAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTYwNDAwMDAwMCwiZXhwIjoxNjA0MDAwMDAxfQ.expired_signature',
  REFRESHED: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsImVtYWlsIjoiam9obi5kb2VAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjo5OTk5OTk5OTk5fQ.refreshed_signature',
} as const;

// ============================================================================
// Helper Factory Functions
// ============================================================================

/**
 * Creates a wrapper component with AuthProvider for renderHook.
 * Follows createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @returns {React.FC} Wrapper component for renderHook
 */
function createWrapper(): React.FC<WrapperProps> {
  return function TestWrapper({ children }: WrapperProps): React.ReactElement {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

/**
 * Creates a wrapper component with AuthProvider and initial authenticated state.
 * Used for testing operations that require an authenticated user.
 *
 * @returns {React.FC} Wrapper component with authenticated state
 */
function createAuthenticatedWrapper(): React.FC<WrapperProps> {
  return function AuthenticatedTestWrapper({ children }: WrapperProps): React.ReactElement {
    return (
      <AuthProvider
        initialState={{
          user: {
            id: validUser.id,
            email: validUser.email,
            name: validUser.name,
          },
          isAuthenticated: true,
          isLoading: false,
          token: TEST_TOKENS.VALID,
        }}
      >
        {children}
      </AuthProvider>
    );
  };
}

/**
 * Configures MSW handler for successful login response.
 * Replaces default handlers with a successful login scenario.
 */
function setupSuccessfulLogin(): void {
  server.use(
    http.post(API_ENDPOINTS.LOGIN, async () => {
      return HttpResponse.json(
        {
          user: {
            id: validUser.id,
            email: validUser.email,
            name: validUser.name,
            role: validUser.role,
          },
          token: TEST_TOKENS.VALID,
          refreshToken: 'refresh_token_valid',
        },
        { status: 200 }
      );
    })
  );
}

/**
 * Configures MSW handler for failed login response.
 * Returns 401 Unauthorized for invalid credentials.
 *
 * @param {string} [errorMessage='Invalid email or password'] - Custom error message
 */
function setupFailedLogin(errorMessage: string = 'Invalid email or password'): void {
  server.use(
    http.post(API_ENDPOINTS.LOGIN, async () => {
      return HttpResponse.json(
        {
          error: errorMessage,
          code: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    })
  );
}

/**
 * Configures MSW handler for network error during login.
 * Simulates a network failure scenario.
 */
function setupNetworkError(): void {
  server.use(
    http.post(API_ENDPOINTS.LOGIN, async () => {
      return HttpResponse.error();
    })
  );
}

/**
 * Configures MSW handler for successful token refresh.
 * Returns a new token in the response.
 */
function setupSuccessfulRefresh(): void {
  server.use(
    http.post(API_ENDPOINTS.REFRESH, async () => {
      return HttpResponse.json(
        {
          token: TEST_TOKENS.REFRESHED,
        },
        { status: 200 }
      );
    })
  );
}

/**
 * Configures MSW handler for failed token refresh.
 * Returns 401 Unauthorized indicating invalid or expired refresh token.
 */
function setupFailedRefresh(): void {
  server.use(
    http.post(API_ENDPOINTS.REFRESH, async () => {
      return HttpResponse.json(
        {
          error: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        },
        { status: 401 }
      );
    })
  );
}

/**
 * Configures MSW handler for successful logout.
 * Returns success message indicating session was cleared.
 */
function setupSuccessfulLogout(): void {
  server.use(
    http.post(API_ENDPOINTS.LOGOUT, async () => {
      return HttpResponse.json(
        {
          message: 'Logged out successfully',
        },
        { status: 200 }
      );
    })
  );
}

/**
 * Creates a mock localStorage object for token persistence tests.
 * Follows createMockServer pattern for reusable mock objects.
 *
 * @returns {Object} Mock localStorage with getItem, setItem, removeItem, clear
 */
function createMockLocalStorage(): Storage {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

/**
 * Clears localStorage auth-related keys.
 * Called in afterEach to ensure test isolation.
 */
function clearAuthStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch {
    // localStorage may not be available in all test environments
  }
}

// ============================================================================
// Test Suite Setup
// ============================================================================

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset handlers and clear storage after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
  clearAuthStorage();
  vi.resetAllMocks();
});

// Close MSW server after all tests
afterAll(() => {
  server.close();
});

// ============================================================================
// Test Suites
// ============================================================================

describe('useAuth', () => {
  /**
   * Tests for initial state when hook is first rendered.
   * Verifies the default unauthenticated state.
   */
  describe('initial state', () => {
    it('should return isAuthenticated as false initially', async () => {
      // Arrange
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should return user as null when not authenticated', async () => {
      // Arrange
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(typeof result.current.login).toBe('function');
    });

    it('should not be loading initially when no stored token', async () => {
      // Arrange
      clearAuthStorage();
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should have error as null initially', async () => {
      // Arrange
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  /**
   * Tests for login functionality.
   * Covers successful login, validation, and error handling.
   */
  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      // Arrange
      setupSuccessfulLogin();
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login(validCredentials.email, validCredentials.password);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe(validUser.email);
    });

    it('should update isAuthenticated to true on successful login', async () => {
      // Arrange
      setupSuccessfulLogin();
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify initial state
      expect(result.current.isAuthenticated).toBe(false);

      await act(async () => {
        await result.current.login(validCredentials.email, validCredentials.password);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should store user data in context after login', async () => {
      // Arrange
      setupSuccessfulLogin();
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login(validCredentials.email, validCredentials.password);
      });

      // Assert
      expect(result.current.user).toEqual(
        expect.objectContaining({
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
        })
      );
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should return error for invalid credentials', async () => {
      // Arrange
      setupFailedLogin('Invalid email or password');
      const wrapper = createWrapper();
      const invalidCreds = invalidCredentials.find((c) => c.scenario === 'wrong_password');

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login(invalidCreds!.email, invalidCreds!.password);
        } catch (e) {
          loginError = e as Error;
        }
      });

      // Assert
      expect(loginError).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).not.toBeNull();
    });

    it('should handle network errors during login', async () => {
      // Arrange
      setupNetworkError();
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login(validCredentials.email, validCredentials.password);
        } catch (e) {
          loginError = e as Error;
        }
      });

      // Assert
      expect(loginError).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should set isLoading during login request', async () => {
      // Arrange
      // Add delay to observe loading state
      server.use(
        http.post(API_ENDPOINTS.LOGIN, async () => {
          // Simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(
            {
              user: {
                id: validUser.id,
                email: validUser.email,
                name: validUser.name,
                role: validUser.role,
              },
              token: TEST_TOKENS.VALID,
              refreshToken: 'refresh_token_valid',
            },
            { status: 200 }
          );
        })
      );
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start login without awaiting
      let loginPromise: Promise<void>;
      act(() => {
        loginPromise = result.current.login(validCredentials.email, validCredentials.password);
      });

      // Check loading state during request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Wait for login to complete
      await act(async () => {
        await loginPromise;
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
    });

    it('should clear previous error before new login attempt', async () => {
      // Arrange
      setupFailedLogin();
      const wrapper = createWrapper();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First failed login
      await act(async () => {
        try {
          await result.current.login('wrong@email.com', 'wrongpassword');
        } catch {
          // Expected error
        }
      });

      // Verify error is set
      expect(result.current.error).not.toBeNull();

      // Setup successful login for second attempt
      setupSuccessfulLogin();

      // Act - Second login attempt
      await act(async () => {
        await result.current.login(validCredentials.email, validCredentials.password);
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
    });
  });

  /**
   * Tests for logout functionality.
   * Covers clearing user data, tokens, and session state.
   */
  describe('logout', () => {
    it('should clear user data on logout', async () => {
      // Arrange
      setupSuccessfulLogout();
      const wrapper = createAuthenticatedWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Verify initially authenticated
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();

      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set isAuthenticated to false on logout', async () => {
      // Arrange
      setupSuccessfulLogout();
      const wrapper = createAuthenticatedWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Verify initially authenticated
      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear stored tokens on logout', async () => {
      // Arrange
      setupSuccessfulLogout();
      
      // Pre-populate localStorage with auth data
      localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(TEST_TOKENS.VALID));
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(validUser));

      const wrapper = createAuthenticatedWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should call logout API endpoint', async () => {
      // Arrange
      let logoutCalled = false;
      server.use(
        http.post(API_ENDPOINTS.LOGOUT, async () => {
          logoutCalled = true;
          return HttpResponse.json(
            { message: 'Logged out successfully' },
            { status: 200 }
          );
        })
      );
      const wrapper = createAuthenticatedWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(logoutCalled).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle logout even when API call fails', async () => {
      // Arrange
      server.use(
        http.post(API_ENDPOINTS.LOGOUT, async () => {
          return HttpResponse.error();
        })
      );
      const wrapper = createAuthenticatedWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      // Assert - should still clear local state even if API fails
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  /**
   * Tests for token management functionality.
   * Covers token persistence, refresh, and expiration handling.
   */
  describe('token management', () => {
    it('should persist authentication token in localStorage', async () => {
      // Arrange
      setupSuccessfulLogin();
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login(validCredentials.email, validCredentials.password);
      });

      // Assert
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      expect(storedToken).not.toBeNull();
      expect(JSON.parse(storedToken!)).toBe(TEST_TOKENS.VALID);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should restore authentication from stored token', async () => {
      // Arrange - Pre-populate localStorage with valid auth data
      localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(TEST_TOKENS.VALID));
      localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify({
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
        })
      );

      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe(validUser.email);
    });

    it('should refresh token before expiration', async () => {
      // Arrange
      setupSuccessfulRefresh();
      const wrapper = createAuthenticatedWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Verify initially authenticated
      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.refreshToken();
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle refresh token failure', async () => {
      // Arrange
      setupFailedRefresh();
      const wrapper = createAuthenticatedWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      let refreshError: Error | null = null;
      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (e) {
          refreshError = e as Error;
        }
      });

      // Assert
      expect(refreshError).not.toBeNull();
      expect(result.current.error).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should logout user when refresh token is invalid', async () => {
      // Arrange
      setupFailedRefresh();
      const wrapper = createAuthenticatedWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Verify initially authenticated
      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch {
          // Expected error
        }
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).not.toBeNull();
    });

    it('should throw error when refreshing token without being authenticated', async () => {
      // Arrange
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify not authenticated
      expect(result.current.isAuthenticated).toBe(false);

      let refreshError: Error | null = null;
      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (e) {
          refreshError = e as Error;
        }
      });

      // Assert
      expect(refreshError).not.toBeNull();
      expect(refreshError?.message).toContain('Not authenticated');
      expect(result.current.error).not.toBeNull();
    });

    it('should update stored token after successful refresh', async () => {
      // Arrange
      localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(TEST_TOKENS.VALID));
      localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify({
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
        })
      );

      setupSuccessfulRefresh();
      const wrapper = createAuthenticatedWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      // Assert
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      expect(storedToken).not.toBeNull();
      expect(JSON.parse(storedToken!)).toBe(TEST_TOKENS.REFRESHED);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  /**
   * Tests for session persistence functionality.
   * Covers restoring sessions on mount and handling invalid tokens.
   */
  describe('session persistence', () => {
    it('should check authentication status on mount', async () => {
      // Arrange - Pre-populate localStorage with valid auth data
      localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(TEST_TOKENS.VALID));
      localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify({
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
        })
      );

      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.id).toBe(validUser.id);
    });

    it('should restore session from valid stored token', async () => {
      // Arrange
      localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(TEST_TOKENS.VALID));
      localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify({
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
        })
      );

      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe(validUser.email);
      expect(result.current.user?.name).toBe(validUser.name);
    });

    it('should clear invalid stored tokens', async () => {
      // Arrange - Store expired token
      localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(TEST_TOKENS.EXPIRED));
      localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify({
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
        })
      );

      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    });

    it('should handle corrupted stored data gracefully', async () => {
      // Arrange - Store corrupted data
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'not-valid-json{');
      localStorage.setItem(STORAGE_KEYS.USER, 'corrupted-user-data');

      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should not restore session when only token is present without user', async () => {
      // Arrange - Store token but no user
      localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(TEST_TOKENS.VALID));

      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    });
  });

  /**
   * Tests for error handling and error state management.
   * Covers clearError functionality and error state transitions.
   */
  describe('error handling', () => {
    it('should set error state on login failure', async () => {
      // Arrange
      setupFailedLogin('Invalid credentials provided');
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.login('wrong@example.com', 'wrongpassword');
        } catch {
          // Expected error
        }
      });

      // Assert
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('Invalid');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should clear error state with clearError function', async () => {
      // Arrange
      setupFailedLogin();
      const wrapper = createWrapper();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger an error
      await act(async () => {
        try {
          await result.current.login('wrong@example.com', 'wrongpassword');
        } catch {
          // Expected error
        }
      });

      // Verify error is set
      expect(result.current.error).not.toBeNull();

      // Act - Clear the error
      act(() => {
        result.current.clearError();
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should preserve authentication state when clearing error', async () => {
      // Arrange
      setupSuccessfulRefresh();
      const wrapper = createAuthenticatedWrapper();

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Trigger a refresh error by replacing handler
      setupFailedRefresh();

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch {
          // Expected error
        }
      });

      // Verify error is set
      expect(result.current.error).not.toBeNull();

      // Act - Clear the error
      act(() => {
        result.current.clearError();
      });

      // Assert - Error cleared but auth state reflects the logout that occurred
      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle validation errors for empty credentials', async () => {
      // Arrange
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let validationError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login('', '');
        } catch (e) {
          validationError = e as Error;
        }
      });

      // Assert
      expect(validationError).not.toBeNull();
      expect(result.current.error).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle server errors during authentication', async () => {
      // Arrange
      server.use(
        http.post(API_ENDPOINTS.LOGIN, async () => {
          return HttpResponse.json(
            { error: 'Internal server error', code: 'SERVER_ERROR' },
            { status: 500 }
          );
        })
      );
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let serverError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login(validCredentials.email, validCredentials.password);
        } catch (e) {
          serverError = e as Error;
        }
      });

      // Assert
      expect(serverError).not.toBeNull();
      expect(result.current.error).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  /**
   * Tests for hook context requirements.
   * Verifies proper error when used outside AuthProvider.
   */
  describe('context requirements', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Arrange & Act & Assert
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuthContext must be used within an AuthProvider');
    });
  });
});
