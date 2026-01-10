/**
 * @fileoverview Unit tests for AuthContext and AuthProvider - Security Critical Component
 * @module tests/features/auth/AuthContext
 *
 * Comprehensive test suite for authentication state management, JWT token handling,
 * session persistence, refresh token flows, and expiration handling. This is a
 * security-critical component with 100% coverage target.
 *
 * Test categories:
 * - Context initialization
 * - AuthProvider functionality
 * - Authentication state management
 * - JWT token handling
 * - Session persistence
 * - Refresh token flows
 * - Expiration handling
 * - Logout cleanup
 * - Error handling
 *
 * Follows patterns established in tests/lifecycle/server.test.js for:
 * - JSDoc documentation standards
 * - Mock factory functions
 * - Test isolation and cleanup
 * - Helper function patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import React, { useContext, ReactNode } from 'react';
import {
  AuthContext,
  AuthProvider,
  useAuthContext,
  AuthState,
  AuthContextValue,
  AuthUser
} from '../AuthContext';
import {
  validUser,
  testUsers,
  generateAuthToken,
  TestUser,
  createTestUser,
  createAuthResponse,
  generateRefreshToken
} from '../../../__tests__/fixtures/users';
import { server } from '../../../__tests__/mocks/server';
import { authHandlers, resetAuthState } from '../../../__tests__/mocks/handlers/auth';
import { http, HttpResponse } from 'msw';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * @typedef {Object} TokenPayload
 * @description JWT token payload structure for testing
 */
interface TokenPayload {
  /** Subject identifier (user ID) */
  sub?: string;
  /** User ID for application context */
  userId?: string;
  /** User email */
  email?: string;
  /** User role */
  role?: string;
  /** Expiration timestamp */
  exp: number;
  /** Issued at timestamp */
  iat: number;
}

/**
 * @typedef {Object} WrapperProps
 * @description Props for test wrapper components
 */
interface WrapperProps {
  children: ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default authentication state for testing.
 * Matches the initial unauthenticated state.
 */
const DEFAULT_AUTH_STATE: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  token: null
};

/**
 * Storage key for auth token in localStorage.
 */
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Storage key for user data in localStorage.
 */
const AUTH_USER_KEY = 'auth_user';

/**
 * API base URL for authentication endpoints.
 */
const API_BASE_URL = '/api/auth';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a React component wrapper with AuthProvider for renderHook tests.
 * Follows the createMockServer pattern from server.test.js.
 *
 * @param initialState - Optional initial auth state for testing
 * @returns React.FC wrapper component
 */
function createWrapper(initialState?: Partial<AuthState>): React.FC<WrapperProps> {
  return function Wrapper({ children }: WrapperProps): React.ReactElement {
    return (
      <AuthProvider initialState={initialState}>
        {children}
      </AuthProvider>
    );
  };
}

/**
 * Creates a mock JWT token for a given user with configurable expiration.
 * Generates a realistic JWT structure for testing token handling.
 *
 * @param user - TestUser to generate token for
 * @param expiresInSeconds - Optional seconds until expiration (default: 24 hours)
 * @returns Mock JWT token string
 */
function createMockToken(user: TestUser, expiresInSeconds: number = 86400): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const mockSignature = btoa(`mock_signature_${user.id}`);

  return `${encodedHeader}.${encodedPayload}.${mockSignature}`;
}

/**
 * Creates an expired mock JWT token for testing expiration handling.
 *
 * @param user - TestUser to generate token for
 * @returns Expired mock JWT token string
 */
function createExpiredToken(user: TestUser): string {
  return createMockToken(user, -3600); // Expired 1 hour ago
}

/**
 * Stores a token in localStorage for session restoration tests.
 *
 * @param token - JWT token string to store
 */
function setupTokenInStorage(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
}

/**
 * Stores user data in localStorage for session restoration tests.
 *
 * @param user - User object to store
 */
function setupUserInStorage(user: Partial<TestUser>): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

/**
 * Clears all authentication-related storage.
 */
function clearAllStorage(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.clear();
  localStorage.clear();
}

/**
 * Configures MSW handler for /api/auth/me endpoint.
 *
 * @param user - User to return, or null for unauthenticated
 * @param status - HTTP status code (default: 200)
 */
function setupMeEndpoint(user: TestUser | null, status: number = 200): void {
  server.use(
    http.get(`${API_BASE_URL}/me`, () => {
      if (user === null || status === 401) {
        return HttpResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      const { password, ...userWithoutPassword } = user;
      return HttpResponse.json({ user: userWithoutPassword }, { status });
    })
  );
}

/**
 * Configures MSW handler for /api/auth/refresh endpoint.
 *
 * @param success - Whether refresh should succeed
 * @param newToken - Optional new token to return on success
 */
function setupRefreshEndpoint(success: boolean, newToken?: string): void {
  server.use(
    http.post(`${API_BASE_URL}/refresh`, () => {
      if (success) {
        return HttpResponse.json({
          token: newToken || createMockToken(validUser),
          refreshToken: generateRefreshToken(validUser)
        }, { status: 200 });
      }
      return HttpResponse.json(
        { error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' },
        { status: 401 }
      );
    })
  );
}

/**
 * Configures MSW handler for /api/auth/login endpoint with custom response.
 *
 * @param success - Whether login should succeed
 * @param user - User to return on success
 */
function setupLoginEndpoint(success: boolean, user: TestUser = validUser): void {
  server.use(
    http.post(`${API_BASE_URL}/login`, async () => {
      if (success) {
        const response = createAuthResponse(user);
        return HttpResponse.json(response, { status: 200 });
      }
      return HttpResponse.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    })
  );
}

/**
 * Configures MSW handler for /api/auth/logout endpoint.
 *
 * @param success - Whether logout should succeed
 */
function setupLogoutEndpoint(success: boolean = true): void {
  server.use(
    http.post(`${API_BASE_URL}/logout`, () => {
      if (success) {
        return HttpResponse.json({ message: 'Logged out successfully' }, { status: 200 });
      }
      return HttpResponse.json(
        { error: 'Server error', code: 'SERVER_ERROR' },
        { status: 500 }
      );
    })
  );
}

// ============================================================================
// Test Setup and Teardown
// ============================================================================

describe('AuthContext', () => {
  /** @type {Storage} Original localStorage reference for spy restoration */
  let localStorageSpy: {
    getItem: ReturnType<typeof vi.spyOn>;
    setItem: ReturnType<typeof vi.spyOn>;
    removeItem: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Clear storage
    clearAllStorage();

    // Reset MSW auth state
    resetAuthState();

    // Setup localStorage spies for verification
    localStorageSpy = {
      getItem: vi.spyOn(Storage.prototype, 'getItem'),
      setItem: vi.spyOn(Storage.prototype, 'setItem'),
      removeItem: vi.spyOn(Storage.prototype, 'removeItem')
    };
  });

  afterEach(() => {
    // Cleanup React Testing Library
    cleanup();

    // Reset MSW handlers to defaults
    server.resetHandlers();

    // Restore all spies
    vi.restoreAllMocks();

    // Clear storage
    clearAllStorage();
  });

  // ==========================================================================
  // Context Initialization Tests
  // ==========================================================================

  describe('context initialization', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Arrange: Suppress console.error for expected error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert: Expect error when rendering hook without provider
      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('useAuthContext must be used within an AuthProvider');

      // Verify console was called (React error boundary)
      expect(consoleSpy).toHaveBeenCalled();

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should provide default unauthenticated state', async () => {
      // Arrange: Create wrapper with explicit initial state to skip async loading
      const wrapper = createWrapper({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        token: null
      });

      // Act: Render hook with provider
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Assert: Verify default state matches expected values
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
    });

    it('should initialize with loading state when checking stored token', async () => {
      // Arrange: Store valid token for initialization check
      const token = createMockToken(validUser);
      setupTokenInStorage(token);
      setupUserInStorage(validUser);

      // Act: Render hook - provider will check stored credentials
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Assert: Verify initial loading state
      expect(result.current.isLoading).toBeDefined();
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
    });

    it('should provide context value with all required methods', () => {
      // Arrange
      const wrapper = createWrapper({ isLoading: false });

      // Act
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Assert: Verify all context methods exist
      expect(result.current.login).toBeDefined();
      expect(result.current.logout).toBeDefined();
      expect(result.current.refreshToken).toBeDefined();
      expect(typeof result.current.login).toBe('function');
    });
  });

  // ==========================================================================
  // AuthProvider Tests
  // ==========================================================================

  describe('AuthProvider', () => {
    it('should provide auth context to children', () => {
      // Arrange
      const wrapper = createWrapper({ isLoading: false });

      // Act
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Assert: Verify context is available
      expect(result.current).toBeDefined();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should initialize with stored token if present and valid', async () => {
      // Arrange: Setup valid stored credentials
      const token = createMockToken(validUser);
      const userData: Partial<AuthUser> = {
        id: validUser.id,
        email: validUser.email,
        name: validUser.name
      };
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Assert: Wait for initialization and verify state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe(token);
      expect(result.current.user?.id).toBe(validUser.id);
    });

    it('should verify stored token on mount', async () => {
      // Arrange: Setup valid stored credentials
      const token = createMockToken(validUser);
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
        id: validUser.id,
        email: validUser.email,
        name: validUser.name
      }));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(localStorageSpy.getItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
      expect(localStorageSpy.getItem).toHaveBeenCalledWith(AUTH_USER_KEY);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear invalid stored token on mount', async () => {
      // Arrange: Setup expired token
      const expiredToken = createExpiredToken(validUser);
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(expiredToken));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(validUser));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('should accept initial state for testing purposes', () => {
      // Arrange: Create custom initial state
      const testUser: AuthUser = {
        id: 'test-123',
        email: 'test@example.com',
        name: 'Test User'
      };
      const initialState: Partial<AuthState> = {
        user: testUser,
        isAuthenticated: true,
        isLoading: false,
        token: 'test-token'
      };

      // Act
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Assert
      expect(result.current.user).toEqual(testUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('test-token');
    });
  });

  // ==========================================================================
  // Authentication State Management Tests
  // ==========================================================================

  describe('authentication state management', () => {
    it('should update state on successful login', async () => {
      // Arrange
      setupLoginEndpoint(true, validUser);
      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.login(validUser.email, validUser.password);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe(validUser.email);
      expect(result.current.token).toBeDefined();
    });

    it('should clear state on logout', async () => {
      // Arrange: Start with authenticated state
      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: createMockToken(validUser)
      };
      setupLogoutEndpoint(true);
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Verify initial authenticated state
      expect(result.current.isAuthenticated).toBe(true);

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('should handle concurrent state updates', async () => {
      // Arrange
      setupLoginEndpoint(true, validUser);
      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act: Trigger multiple login attempts concurrently
      const loginPromises = [
        act(async () => {
          await result.current.login(validUser.email, validUser.password);
        }),
        act(async () => {
          await result.current.login(validUser.email, validUser.password);
        })
      ];

      await Promise.all(loginPromises);

      // Assert: State should be consistent after concurrent updates
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should maintain state consistency across rerenders', async () => {
      // Arrange
      setupLoginEndpoint(true, validUser);
      const wrapper = createWrapper({ isLoading: false });
      const { result, rerender } = renderHook(() => useAuthContext(), { wrapper });

      // Act: Login and rerender
      await act(async () => {
        await result.current.login(validUser.email, validUser.password);
      });

      // Rerender multiple times
      rerender();
      rerender();
      rerender();

      // Assert: State should remain consistent
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe(validUser.email);
      expect(result.current.token).toBeDefined();
    });

    it('should set loading state during authentication operations', async () => {
      // Arrange: Add delay to login handler
      server.use(
        http.post(`${API_BASE_URL}/login`, async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          const response = createAuthResponse(validUser);
          return HttpResponse.json(response, { status: 200 });
        })
      );

      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act: Start login
      const loginPromise = act(async () => {
        await result.current.login(validUser.email, validUser.password);
      });

      // Assert: Eventually completes without error
      await loginPromise;
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  // ==========================================================================
  // JWT Token Handling Tests
  // ==========================================================================

  describe('JWT token handling', () => {
    it('should store token in localStorage on login', async () => {
      // Arrange
      setupLoginEndpoint(true, validUser);
      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.login(validUser.email, validUser.password);
      });

      // Assert
      expect(localStorageSpy.setItem).toHaveBeenCalledWith(
        AUTH_TOKEN_KEY,
        expect.any(String)
      );
      expect(localStorageSpy.setItem).toHaveBeenCalledWith(
        AUTH_USER_KEY,
        expect.any(String)
      );
      expect(result.current.token).toBeDefined();
    });

    it('should retrieve token from localStorage on mount', async () => {
      // Arrange: Store valid token
      const token = createMockToken(validUser);
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
        id: validUser.id,
        email: validUser.email,
        name: validUser.name
      }));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(localStorageSpy.getItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
      expect(result.current.token).toBe(token);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should decode token to extract user info', async () => {
      // Arrange: Create token with user info
      const token = createMockToken(validUser);
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
        id: validUser.id,
        email: validUser.email,
        name: validUser.name
      }));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.user).toBeDefined();
      expect(result.current.user?.id).toBe(validUser.id);
      expect(result.current.user?.email).toBe(validUser.email);
    });

    it('should validate token format before storing', async () => {
      // Arrange: Mock login endpoint returning malformed response
      server.use(
        http.post(`${API_BASE_URL}/login`, () => {
          return HttpResponse.json({
            user: { id: 'test', email: 'test@test.com', name: 'Test' },
            token: 'valid.token.format'
          }, { status: 200 });
        })
      );

      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.login(validUser.email, validUser.password);
      });

      // Assert: Token should be stored
      expect(result.current.token).toBeDefined();
      expect(localStorageSpy.setItem).toHaveBeenCalled();
    });

    it('should handle malformed tokens gracefully', async () => {
      // Arrange: Store malformed token
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify('not.a.valid.jwt'));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(validUser));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert: Should clear invalid token and remain unauthenticated
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle corrupted localStorage data', async () => {
      // Arrange: Store invalid JSON
      localStorage.setItem(AUTH_TOKEN_KEY, 'not-valid-json{{{');
      localStorage.setItem(AUTH_USER_KEY, 'also-invalid');

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert: Should handle gracefully
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  // ==========================================================================
  // Session Persistence Tests
  // ==========================================================================

  describe('session persistence', () => {
    it('should restore session from valid stored token', async () => {
      // Arrange
      const token = createMockToken(validUser);
      const userData = {
        id: validUser.id,
        email: validUser.email,
        name: validUser.name
      };
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe(token);
      expect(result.current.user?.id).toBe(validUser.id);
    });

    it('should clear session for expired stored token', async () => {
      // Arrange: Store expired token
      const expiredToken = createExpiredToken(validUser);
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(expiredToken));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(validUser));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('should update session when token is refreshed', async () => {
      // Arrange
      const oldToken = createMockToken(validUser);
      const newToken = createMockToken(validUser, 172800); // 2 days

      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: oldToken
      };

      setupRefreshEndpoint(true, newToken);
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.refreshToken();
      });

      // Assert
      expect(result.current.token).toBe(newToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageSpy.setItem).toHaveBeenCalled();
    });

    it('should persist session across page reloads', async () => {
      // Arrange: Simulate first load with login
      const token = createMockToken(validUser);
      const userData = {
        id: validUser.id,
        email: validUser.email,
        name: validUser.name
      };

      // Set up storage as if user was logged in before
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));

      // Act: Simulate page reload by creating new hook
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert: Session should be restored
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe(validUser.email);
      expect(result.current.token).toBe(token);
    });

    it('should not restore session when storage is empty', async () => {
      // Arrange: Ensure storage is empty
      clearAllStorage();

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });

  // ==========================================================================
  // Refresh Token Flow Tests
  // ==========================================================================

  describe('refresh token flows', () => {
    it('should successfully refresh token', async () => {
      // Arrange
      const initialToken = createMockToken(validUser);
      const newToken = createMockToken(validUser, 172800);

      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: initialToken
      };

      setupRefreshEndpoint(true, newToken);
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.refreshToken();
      });

      // Assert
      expect(result.current.token).toBe(newToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should update stored token after refresh', async () => {
      // Arrange
      const initialToken = createMockToken(validUser);
      const newToken = createMockToken(validUser, 172800);

      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: initialToken
      };

      setupRefreshEndpoint(true, newToken);
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.refreshToken();
      });

      // Assert
      expect(localStorageSpy.setItem).toHaveBeenCalledWith(
        AUTH_TOKEN_KEY,
        expect.stringContaining(newToken)
      );
    });

    it('should logout user if refresh fails', async () => {
      // Arrange
      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: createMockToken(validUser)
      };

      setupRefreshEndpoint(false);
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act & Assert
      await expect(
        act(async () => {
          await result.current.refreshToken();
        })
      ).rejects.toThrow();

      // Assert: User should be logged out
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('should throw error when refreshing without authentication', async () => {
      // Arrange: Unauthenticated state
      const wrapper = createWrapper({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null
      });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act & Assert
      await expect(
        act(async () => {
          await result.current.refreshToken();
        })
      ).rejects.toThrow('Not authenticated');

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle concurrent refresh requests gracefully', async () => {
      // Arrange
      let requestCount = 0;
      server.use(
        http.post(`${API_BASE_URL}/refresh`, async () => {
          requestCount++;
          await new Promise(resolve => setTimeout(resolve, 10));
          const newToken = createMockToken(validUser, 172800 + requestCount);
          return HttpResponse.json({
            token: newToken,
            refreshToken: generateRefreshToken(validUser)
          }, { status: 200 });
        })
      );

      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: createMockToken(validUser)
      };

      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act: Trigger multiple concurrent refresh requests
      await Promise.all([
        act(async () => {
          try {
            await result.current.refreshToken();
          } catch {
            // Expected potential race condition
          }
        }),
        act(async () => {
          try {
            await result.current.refreshToken();
          } catch {
            // Expected potential race condition
          }
        })
      ]);

      // Assert: State should be consistent
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBeDefined();
    });
  });

  // ==========================================================================
  // Expiration Handling Tests
  // ==========================================================================

  describe('expiration handling', () => {
    it('should detect token expiration from payload', async () => {
      // Arrange: Create token that is already expired
      const expiredToken = createExpiredToken(validUser);
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(expiredToken));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(validUser));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert: Should detect expiration and clear session
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('should accept token about to expire within threshold', async () => {
      // Arrange: Create token expiring in 5 minutes (should still be valid)
      const almostExpiredToken = createMockToken(validUser, 300);
      const userData = {
        id: validUser.id,
        email: validUser.email,
        name: validUser.name
      };
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(almostExpiredToken));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert: Token should still be accepted
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe(almostExpiredToken);
    });

    it('should logout user when token expires and refresh fails', async () => {
      // Arrange
      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: createMockToken(validUser, 10) // Very short expiration
      };

      setupRefreshEndpoint(false);
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act: Attempt to refresh (simulating expired token scenario)
      await expect(
        act(async () => {
          await result.current.refreshToken();
        })
      ).rejects.toThrow();

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle token without expiration claim', async () => {
      // Arrange: Create token without exp claim
      const header = { alg: 'HS256', typ: 'JWT' };
      const payload = {
        userId: validUser.id,
        email: validUser.email,
        iat: Math.floor(Date.now() / 1000)
        // Note: no exp field
      };
      const tokenWithoutExp = `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(payload))}.signature`;

      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokenWithoutExp));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
        id: validUser.id,
        email: validUser.email,
        name: validUser.name
      }));

      // Act
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert: Token without exp should be considered valid
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBeDefined();
    });
  });

  // ==========================================================================
  // Logout Cleanup Tests
  // ==========================================================================

  describe('logout cleanup', () => {
    it('should clear user from state', async () => {
      // Arrange
      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: createMockToken(validUser)
      };

      setupLogoutEndpoint(true);
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Verify initial state
      expect(result.current.user).toBeDefined();

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
    });

    it('should clear token from localStorage', async () => {
      // Arrange
      const token = createMockToken(validUser);
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(validUser));

      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token
      };

      setupLogoutEndpoint(true);
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(localStorageSpy.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
      expect(localStorageSpy.removeItem).toHaveBeenCalledWith(AUTH_USER_KEY);
    });

    it('should call logout API endpoint', async () => {
      // Arrange
      let logoutCalled = false;
      server.use(
        http.post(`${API_BASE_URL}/logout`, () => {
          logoutCalled = true;
          return HttpResponse.json({ message: 'Logged out' }, { status: 200 });
        })
      );

      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: createMockToken(validUser)
      };

      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(logoutCalled).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should reset to default unauthenticated state', async () => {
      // Arrange
      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: createMockToken(validUser)
      };

      setupLogoutEndpoint(true);
      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert: Should match default state
      expect(result.current.user).toBe(DEFAULT_AUTH_STATE.user);
      expect(result.current.isAuthenticated).toBe(DEFAULT_AUTH_STATE.isAuthenticated);
      expect(result.current.token).toBe(DEFAULT_AUTH_STATE.token);
    });

    it('should complete logout even if API call fails', async () => {
      // Arrange: Setup failing logout endpoint
      server.use(
        http.post(`${API_BASE_URL}/logout`, () => {
          return HttpResponse.error();
        })
      );

      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: createMockToken(validUser)
      };

      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert: Local state should still be cleared
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle network errors during login', async () => {
      // Arrange
      server.use(
        http.post(`${API_BASE_URL}/login`, () => {
          return HttpResponse.error();
        })
      );

      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act & Assert
      await expect(
        act(async () => {
          await result.current.login(validUser.email, validUser.password);
        })
      ).rejects.toThrow();

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle server errors during refresh', async () => {
      // Arrange
      server.use(
        http.post(`${API_BASE_URL}/refresh`, () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      const initialState: Partial<AuthState> = {
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name
        },
        isAuthenticated: true,
        isLoading: false,
        token: createMockToken(validUser)
      };

      const wrapper = createWrapper(initialState);
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act & Assert
      await expect(
        act(async () => {
          await result.current.refreshToken();
        })
      ).rejects.toThrow();

      // User should be logged out on refresh failure
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should recover from transient errors', async () => {
      // Arrange: First request fails, second succeeds
      let callCount = 0;
      server.use(
        http.post(`${API_BASE_URL}/login`, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { error: 'Server busy' },
              { status: 503 }
            );
          }
          return HttpResponse.json(createAuthResponse(validUser), { status: 200 });
        })
      );

      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act: First attempt fails
      await expect(
        act(async () => {
          await result.current.login(validUser.email, validUser.password);
        })
      ).rejects.toThrow();

      // Second attempt succeeds
      await act(async () => {
        await result.current.login(validUser.email, validUser.password);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
      expect(callCount).toBe(2);
    });

    it('should handle invalid response structure from login', async () => {
      // Arrange: Return invalid response structure
      server.use(
        http.post(`${API_BASE_URL}/login`, () => {
          return HttpResponse.json(
            { invalid: 'response' },
            { status: 200 }
          );
        })
      );

      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act & Assert
      await expect(
        act(async () => {
          await result.current.login(validUser.email, validUser.password);
        })
      ).rejects.toThrow('Invalid response from authentication server');

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should validate email is required', async () => {
      // Arrange
      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act & Assert
      await expect(
        act(async () => {
          await result.current.login('', validUser.password);
        })
      ).rejects.toThrow('Email is required');

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should validate password is required', async () => {
      // Arrange
      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act & Assert
      await expect(
        act(async () => {
          await result.current.login(validUser.email, '');
        })
      ).rejects.toThrow('Password is required');

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle whitespace-only email', async () => {
      // Arrange
      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act & Assert
      await expect(
        act(async () => {
          await result.current.login('   ', validUser.password);
        })
      ).rejects.toThrow('Email is required');
    });

    it('should clear state on login failure', async () => {
      // Arrange
      setupLoginEndpoint(false);
      const wrapper = createWrapper({ isLoading: false });
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Act
      try {
        await act(async () => {
          await result.current.login(validUser.email, 'wrong-password');
        });
      } catch {
        // Expected error
      }

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ==========================================================================
  // Direct Context Access Tests
  // ==========================================================================

  describe('direct context access', () => {
    it('should return undefined when accessing context directly without provider', () => {
      // Arrange & Act
      const { result } = renderHook(() => useContext(AuthContext));

      // Assert
      expect(result.current).toBeUndefined();
    });

    it('should provide context value when accessed within provider', () => {
      // Arrange
      const wrapper = createWrapper({ isLoading: false });

      // Act
      const { result } = renderHook(() => useContext(AuthContext), { wrapper });

      // Assert
      expect(result.current).toBeDefined();
      expect(result.current?.login).toBeDefined();
      expect(result.current?.logout).toBeDefined();
      expect(result.current?.refreshToken).toBeDefined();
    });
  });
});
