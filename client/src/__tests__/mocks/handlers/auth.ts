/**
 * @fileoverview Authentication API mock handlers for MSW
 * @module tests/mocks/handlers/auth
 *
 * Provides MSW request handlers for authentication API endpoints including
 * login, logout, register, refresh token, and user profile operations.
 * Uses MSW 2.7.0 http.get/post/delete patterns with HttpResponse.
 *
 * Follows mock handler patterns established in tests/lifecycle/server.test.js
 * for organization, documentation, and factory function usage.
 */

import { http, HttpResponse, delay } from 'msw';
import {
  testUsers,
  validCredentials,
  invalidCredentials,
  validUser,
  createAuthResponse,
  generateAuthToken,
  generateRefreshToken,
  type TestUser,
  type LoginCredentials,
  type AuthResponse
} from '../../fixtures/users';

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for all authentication API endpoints.
 * Configured to match the backend API structure.
 */
const API_BASE_URL = '/api/auth';

/**
 * Default network delay in milliseconds for realistic API simulation.
 * Set to 0 to disable delays in tests that need immediate responses.
 */
const DEFAULT_DELAY_MS = 0;

// ============================================================================
// Request/Response Type Definitions
// ============================================================================

/**
 * Request body structure for login endpoint.
 * Contains user credentials for authentication.
 */
interface LoginRequest {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
}

/**
 * Response structure for successful login.
 * Contains authenticated user data and JWT tokens.
 */
interface LoginResponse {
  /** Authenticated user object (password excluded) */
  user: Omit<TestUser, 'password'>;
  /** JWT access token for API authorization */
  token: string;
  /** JWT refresh token for obtaining new access tokens */
  refreshToken: string;
}

/**
 * Request body structure for user registration.
 * Contains all required fields for creating a new account.
 */
interface RegisterRequest {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** User's display name */
  name: string;
}

/**
 * Request body structure for token refresh.
 * Contains the refresh token to exchange for a new access token.
 */
interface RefreshRequest {
  /** JWT refresh token from previous authentication */
  refreshToken: string;
}

/**
 * Response structure for token refresh.
 * Contains new access token and optionally a new refresh token.
 */
interface RefreshResponse {
  /** New JWT access token */
  token: string;
  /** Optional new refresh token (for token rotation) */
  refreshToken?: string;
}

/**
 * Standard error response structure for authentication failures.
 */
interface AuthErrorResponse {
  /** Error message describing the failure */
  error: string;
  /** Error code for programmatic handling */
  code: string;
  /** Additional details about validation errors */
  details?: Record<string, string>;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates email format using a standard regex pattern.
 * @param email - Email address to validate
 * @returns True if email format is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password meets minimum requirements.
 * Password must be at least 8 characters long.
 * @param password - Password to validate
 * @returns True if password meets requirements, false otherwise
 */
function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8;
}

/**
 * Validates name is non-empty and within reasonable length.
 * @param name - Name to validate
 * @returns True if name is valid, false otherwise
 */
function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 1 && name.length <= 100;
}

/**
 * Finds a user by email from test users array.
 * @param email - Email address to search for
 * @returns TestUser if found, undefined otherwise
 */
function findUserByEmail(email: string): TestUser | undefined {
  return testUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

/**
 * Validates user credentials against test user data.
 * @param email - User's email
 * @param password - User's password
 * @returns TestUser if credentials match, undefined otherwise
 */
function validateCredentials(email: string, password: string): TestUser | undefined {
  const user = findUserByEmail(email);
  if (user && user.password === password) {
    return user;
  }
  return undefined;
}

// ============================================================================
// Mock Token Storage (simulates server-side session state)
// ============================================================================

/**
 * Map storing valid refresh tokens for session simulation.
 * Keys are refresh tokens, values are associated user IDs.
 * This allows testing token refresh and invalidation flows.
 */
const validRefreshTokens = new Map<string, string>();

/**
 * Simulated currently authenticated user (for stateful tests).
 * Set after successful login, cleared on logout.
 */
let currentAuthenticatedUser: TestUser | null = null;

/**
 * Resets the mock authentication state.
 * Call this in test cleanup to ensure test isolation.
 */
export function resetAuthState(): void {
  validRefreshTokens.clear();
  currentAuthenticatedUser = null;
}

// ============================================================================
// Handler Factory Functions
// ============================================================================

/**
 * Creates the login handler for POST /api/auth/login.
 * Validates credentials and returns JWT tokens on success.
 *
 * Success: Returns 200 with user data and tokens
 * Failure: Returns 400 for validation errors, 401 for invalid credentials
 *
 * @returns MSW request handler for login endpoint
 */
function createLoginHandler() {
  return http.post<never, LoginRequest, LoginResponse | AuthErrorResponse>(
    `${API_BASE_URL}/login`,
    async ({ request }) => {
      // Add optional delay for realistic network simulation
      if (DEFAULT_DELAY_MS > 0) {
        await delay(DEFAULT_DELAY_MS);
      }

      let body: LoginRequest;
      try {
        body = await request.json();
      } catch {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Invalid request body',
            code: 'INVALID_REQUEST'
          },
          { status: 400 }
        );
      }

      const { email, password } = body;

      // Validate required fields
      if (!email || !password) {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Email and password are required',
            code: 'MISSING_FIELDS',
            details: {
              ...(email ? {} : { email: 'Email is required' }),
              ...(password ? {} : { password: 'Password is required' })
            }
          },
          { status: 400 }
        );
      }

      // Validate email format
      if (!isValidEmail(email)) {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Invalid email format',
            code: 'INVALID_EMAIL_FORMAT',
            details: { email: 'Please provide a valid email address' }
          },
          { status: 400 }
        );
      }

      // Check for whitespace-only credentials
      if (email.trim() === '' || password.trim() === '') {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Credentials cannot be empty or whitespace only',
            code: 'EMPTY_CREDENTIALS'
          },
          { status: 400 }
        );
      }

      // Validate credentials against test users
      const user = validateCredentials(email, password);

      if (!user) {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
          },
          { status: 401 }
        );
      }

      // Generate tokens and create response
      const authResponse = createAuthResponse(user);

      // Store refresh token for later validation
      validRefreshTokens.set(authResponse.refreshToken, user.id);

      // Set current authenticated user for /me endpoint
      currentAuthenticatedUser = user;

      return HttpResponse.json<LoginResponse>(authResponse, { status: 200 });
    }
  );
}

/**
 * Creates the logout handler for POST /api/auth/logout.
 * Clears the user session and invalidates tokens.
 *
 * Success: Returns 200 with success message
 * Failure: Returns 401 if not authenticated
 *
 * @returns MSW request handler for logout endpoint
 */
function createLogoutHandler() {
  return http.post(`${API_BASE_URL}/logout`, async ({ request }) => {
    if (DEFAULT_DELAY_MS > 0) {
      await delay(DEFAULT_DELAY_MS);
    }

    // Check for authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json<AuthErrorResponse>(
        {
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Clear authentication state
    currentAuthenticatedUser = null;

    // Clear all refresh tokens for the user (simplified - clears all in mock)
    validRefreshTokens.clear();

    return HttpResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  });
}

/**
 * Creates the registration handler for POST /api/auth/register.
 * Creates a new user account and returns authentication tokens.
 *
 * Success: Returns 201 with new user data and tokens
 * Failure: Returns 400 for validation errors, 409 if email exists
 *
 * @returns MSW request handler for registration endpoint
 */
function createRegisterHandler() {
  return http.post<never, RegisterRequest, LoginResponse | AuthErrorResponse>(
    `${API_BASE_URL}/register`,
    async ({ request }) => {
      if (DEFAULT_DELAY_MS > 0) {
        await delay(DEFAULT_DELAY_MS);
      }

      let body: RegisterRequest;
      try {
        body = await request.json();
      } catch {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Invalid request body',
            code: 'INVALID_REQUEST'
          },
          { status: 400 }
        );
      }

      const { email, password, name } = body;

      // Validate required fields
      const validationErrors: Record<string, string> = {};

      if (!email) {
        validationErrors.email = 'Email is required';
      } else if (!isValidEmail(email)) {
        validationErrors.email = 'Invalid email format';
      }

      if (!password) {
        validationErrors.password = 'Password is required';
      } else if (!isValidPassword(password)) {
        validationErrors.password = 'Password must be at least 8 characters long';
      }

      if (!name) {
        validationErrors.name = 'Name is required';
      } else if (!isValidName(name)) {
        validationErrors.name = 'Name must be between 1 and 100 characters';
      }

      if (Object.keys(validationErrors).length > 0) {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validationErrors
          },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUser = findUserByEmail(email);
      if (existingUser) {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Email already registered',
            code: 'EMAIL_EXISTS',
            details: { email: 'An account with this email already exists' }
          },
          { status: 409 }
        );
      }

      // Create new user (in mock, we generate a temporary user)
      const newUser: TestUser = {
        id: `user-new-${Date.now()}`,
        email: email.toLowerCase(),
        password,
        name: name.trim(),
        role: 'customer'
      };

      // Generate tokens for the new user
      const authResponse = createAuthResponse(newUser);

      // Store refresh token
      validRefreshTokens.set(authResponse.refreshToken, newUser.id);

      // Set current authenticated user
      currentAuthenticatedUser = newUser;

      return HttpResponse.json<LoginResponse>(authResponse, { status: 201 });
    }
  );
}

/**
 * Creates the token refresh handler for POST /api/auth/refresh.
 * Exchanges a valid refresh token for a new access token.
 *
 * Success: Returns 200 with new access token
 * Failure: Returns 400 for missing token, 401 for invalid/expired token
 *
 * @returns MSW request handler for refresh token endpoint
 */
function createRefreshHandler() {
  return http.post<never, RefreshRequest, RefreshResponse | AuthErrorResponse>(
    `${API_BASE_URL}/refresh`,
    async ({ request }) => {
      if (DEFAULT_DELAY_MS > 0) {
        await delay(DEFAULT_DELAY_MS);
      }

      let body: RefreshRequest;
      try {
        body = await request.json();
      } catch {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Invalid request body',
            code: 'INVALID_REQUEST'
          },
          { status: 400 }
        );
      }

      const { refreshToken } = body;

      if (!refreshToken) {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Refresh token is required',
            code: 'MISSING_REFRESH_TOKEN'
          },
          { status: 400 }
        );
      }

      // Validate refresh token
      const userId = validRefreshTokens.get(refreshToken);

      if (!userId) {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'Invalid or expired refresh token',
            code: 'INVALID_REFRESH_TOKEN'
          },
          { status: 401 }
        );
      }

      // Find the user associated with the token
      const user = testUsers.find((u) => u.id === userId) || currentAuthenticatedUser;

      if (!user) {
        return HttpResponse.json<AuthErrorResponse>(
          {
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          },
          { status: 401 }
        );
      }

      // Generate new access token
      const newAccessToken = generateAuthToken(user);

      // Optionally rotate refresh token (implement token rotation)
      const newRefreshToken = generateRefreshToken(user);

      // Invalidate old refresh token and store new one
      validRefreshTokens.delete(refreshToken);
      validRefreshTokens.set(newRefreshToken, user.id);

      return HttpResponse.json<RefreshResponse>(
        {
          token: newAccessToken,
          refreshToken: newRefreshToken
        },
        { status: 200 }
      );
    }
  );
}

/**
 * Creates the user profile handler for GET /api/auth/me.
 * Returns the currently authenticated user's profile.
 *
 * Success: Returns 200 with user profile data
 * Failure: Returns 401 if not authenticated
 *
 * @returns MSW request handler for user profile endpoint
 */
function createMeHandler() {
  return http.get(`${API_BASE_URL}/me`, async ({ request }) => {
    if (DEFAULT_DELAY_MS > 0) {
      await delay(DEFAULT_DELAY_MS);
    }

    // Check for authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json<AuthErrorResponse>(
        {
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // For mock purposes, validate token is not empty
    if (!token || token.trim() === '') {
      return HttpResponse.json<AuthErrorResponse>(
        {
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      );
    }

    // Return current authenticated user or default validUser
    const user = currentAuthenticatedUser || validUser;

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return HttpResponse.json(
      { user: userWithoutPassword },
      { status: 200 }
    );
  });
}

/**
 * Creates a DELETE handler for user account deletion.
 * Removes the user's account and invalidates all tokens.
 *
 * Success: Returns 200 with success message
 * Failure: Returns 401 if not authenticated
 *
 * @returns MSW request handler for account deletion endpoint
 */
function createDeleteAccountHandler() {
  return http.delete(`${API_BASE_URL}/account`, async ({ request }) => {
    if (DEFAULT_DELAY_MS > 0) {
      await delay(DEFAULT_DELAY_MS);
    }

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json<AuthErrorResponse>(
        {
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Clear authentication state
    currentAuthenticatedUser = null;
    validRefreshTokens.clear();

    return HttpResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );
  });
}

// ============================================================================
// Handler Instances
// ============================================================================

/**
 * Login handler instance for POST /api/auth/login.
 * @see createLoginHandler
 */
const loginHandler = createLoginHandler();

/**
 * Logout handler instance for POST /api/auth/logout.
 * @see createLogoutHandler
 */
const logoutHandler = createLogoutHandler();

/**
 * Registration handler instance for POST /api/auth/register.
 * @see createRegisterHandler
 */
const registerHandler = createRegisterHandler();

/**
 * Token refresh handler instance for POST /api/auth/refresh.
 * @see createRefreshHandler
 */
const refreshHandler = createRefreshHandler();

/**
 * User profile handler instance for GET /api/auth/me.
 * @see createMeHandler
 */
const meHandler = createMeHandler();

/**
 * Account deletion handler instance for DELETE /api/auth/account.
 * @see createDeleteAccountHandler
 */
const deleteAccountHandler = createDeleteAccountHandler();

// ============================================================================
// Exports
// ============================================================================

/**
 * Array of all authentication API mock handlers.
 * Import this array into the MSW server setup to enable auth mocking.
 *
 * Includes handlers for:
 * - POST /api/auth/login - User login with credentials
 * - POST /api/auth/logout - User logout (session invalidation)
 * - POST /api/auth/register - New user registration
 * - POST /api/auth/refresh - Access token refresh
 * - GET /api/auth/me - Get current user profile
 * - DELETE /api/auth/account - Delete user account
 *
 * @example
 * // In MSW server setup:
 * import { authHandlers } from './handlers/auth';
 *
 * export const server = setupServer(...authHandlers);
 *
 * @example
 * // Combining with other handlers:
 * import { authHandlers } from './handlers/auth';
 * import { menuHandlers } from './handlers/menu';
 *
 * export const handlers = [...authHandlers, ...menuHandlers];
 */
export const authHandlers = [
  loginHandler,
  logoutHandler,
  registerHandler,
  refreshHandler,
  meHandler,
  deleteAccountHandler
];

// Export individual handlers for granular testing scenarios
export {
  loginHandler,
  logoutHandler,
  registerHandler,
  refreshHandler,
  meHandler,
  deleteAccountHandler
};

// Export type definitions for use in tests
export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshRequest,
  RefreshResponse,
  AuthErrorResponse
};
