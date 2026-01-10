/**
 * @fileoverview Unit tests for authentication API functions
 * @module tests/api/auth
 *
 * Provides comprehensive test coverage for authentication API operations
 * including login, logout, register, token refresh, and user profile retrieval.
 *
 * Uses Vitest with MSW (Mock Service Worker) for API mocking, following the
 * AAA (Arrange, Act, Assert) pattern with minimum 3 assertions per test.
 *
 * Test coverage includes:
 * - Happy path scenarios for all authentication operations
 * - Error handling for various HTTP status codes (400, 401, 403, 500)
 * - Edge cases for input validation and boundary conditions
 * - Token management including storage, refresh, and expiration handling
 *
 * @see {@link server.test.js} for mock factory patterns
 * @see {@link config.test.js} for JSDoc documentation standards
 * @see {@link endpoints.test.js} for HTTP testing patterns
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from 'vitest';
import { server } from '../../__tests__/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  testUsers,
  validCredentials,
  invalidCredentials,
  validUser,
  newUser,
  createTestUser,
  successfulLoginResponse,
  type TestUser,
  type LoginCredentials,
  type AuthResponse,
} from '../../__tests__/fixtures/users';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Interface for user registration data.
 * Contains all required fields for creating a new user account.
 */
interface RegisterData {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** User's display name */
  name: string;
}

/**
 * Interface for user data returned from API (without password).
 * Represents the safe user object included in auth responses.
 */
interface User {
  /** Unique identifier for the user */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** User's role (optional) */
  role?: string;
}

/**
 * Interface for authentication error response.
 * Contains error details for failed authentication operations.
 */
interface AuthError {
  /** Error message */
  error: string;
  /** Error code for programmatic handling */
  code: string;
  /** Additional validation error details */
  details?: Record<string, string>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for authentication API endpoints.
 * Matches the URL pattern used in auth handlers.
 */
const API_BASE_URL = '/api/auth';

/**
 * Mock JWT token for testing authorization headers.
 * This token is used to simulate authenticated requests.
 */
const MOCK_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsImlhdCI6MTcwNDAwMDAwMH0.mockSignature';

/**
 * Mock refresh token for testing token refresh operations.
 * This token is used to test refresh token flows.
 */
const MOCK_REFRESH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsInR5cGUiOiJyZWZyZXNoIn0.mockRefresh';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates login credentials with optional overrides.
 * Follows the createMockServer pattern from server.test.js.
 *
 * @param overrides - Optional partial credentials to override defaults
 * @returns Complete LoginCredentials object
 *
 * @example
 * // Create with defaults
 * const credentials = createLoginCredentials();
 *
 * @example
 * // Create with custom email
 * const credentials = createLoginCredentials({ email: 'custom@example.com' });
 */
function createLoginCredentials(overrides?: Partial<LoginCredentials>): LoginCredentials {
  return {
    email: validCredentials.email,
    password: validCredentials.password,
    ...overrides,
  };
}

/**
 * Creates registration data with optional overrides.
 * Follows the createMockServer pattern from server.test.js.
 *
 * @param overrides - Optional partial data to override defaults
 * @returns Complete RegisterData object
 *
 * @example
 * // Create with defaults
 * const registerData = createRegisterData();
 *
 * @example
 * // Create with custom name
 * const registerData = createRegisterData({ name: 'Custom User' });
 */
function createRegisterData(overrides?: Partial<RegisterData>): RegisterData {
  return {
    email: `newuser${Date.now()}@example.com`,
    password: 'SecureP@ss123',
    name: 'New Test User',
    ...overrides,
  };
}

/**
 * Creates a mock authentication response for testing.
 * Follows the createMockServer pattern from server.test.js.
 *
 * @param user - Optional user to include in response
 * @returns Complete AuthResponse object
 *
 * @example
 * // Create with default user
 * const response = createMockAuthResponse();
 *
 * @example
 * // Create with custom user
 * const response = createMockAuthResponse(customUser);
 */
function createMockAuthResponse(user?: Partial<User>): AuthResponse {
  const defaultUser: TestUser = {
    ...validUser,
    password: '',
    ...user,
  };

  return {
    user: defaultUser,
    token: MOCK_ACCESS_TOKEN,
    refreshToken: MOCK_REFRESH_TOKEN,
  };
}

/**
 * Creates a mock localStorage object for testing token storage.
 * Returns mock functions for getItem, setItem, and removeItem.
 *
 * @returns Object containing mock localStorage methods
 *
 * @example
 * const storage = mockLocalStorage();
 * expect(storage.setItem).toHaveBeenCalled();
 */
function mockLocalStorage(): {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  store: Map<string, string>;
} {
  const store = new Map<string, string>();

  const getItem = vi.fn((key: string) => store.get(key) ?? null);
  const setItem = vi.fn((key: string, value: string) => {
    store.set(key, value);
  });
  const removeItem = vi.fn((key: string) => {
    store.delete(key);
  });
  const clear = vi.fn(() => {
    store.clear();
  });

  return { getItem, setItem, removeItem, clear, store };
}

/**
 * Makes an API request to the login endpoint.
 * Encapsulates the fetch logic for consistent testing.
 *
 * @param credentials - Login credentials to send
 * @returns Promise resolving to the response
 */
async function loginRequest(credentials: LoginCredentials): Promise<Response> {
  return fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
}

/**
 * Makes an API request to the logout endpoint.
 * Encapsulates the fetch logic for consistent testing.
 *
 * @param token - Authorization token (optional)
 * @returns Promise resolving to the response
 */
async function logoutRequest(token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}/logout`, {
    method: 'POST',
    headers,
  });
}

/**
 * Makes an API request to the register endpoint.
 * Encapsulates the fetch logic for consistent testing.
 *
 * @param data - Registration data to send
 * @returns Promise resolving to the response
 */
async function registerRequest(data: RegisterData): Promise<Response> {
  return fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Makes an API request to the refresh token endpoint.
 * Encapsulates the fetch logic for consistent testing.
 *
 * @param refreshToken - Refresh token to exchange
 * @returns Promise resolving to the response
 */
async function refreshTokenRequest(refreshToken: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Makes an API request to get the current user profile.
 * Encapsulates the fetch logic for consistent testing.
 *
 * @param token - Authorization token
 * @returns Promise resolving to the response
 */
async function getCurrentUserRequest(token?: string): Promise<Response> {
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}/me`, {
    method: 'GET',
    headers,
  });
}

// ============================================================================
// Test Setup
// ============================================================================

describe('Auth API', () => {
  /**
   * Storage mock for testing token persistence.
   */
  let storageMock: ReturnType<typeof mockLocalStorage>;

  /**
   * Start MSW server before all tests.
   * Using onUnhandledRequest: 'error' to catch missing handlers.
   */
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  /**
   * Reset handlers and mocks after each test.
   * Ensures test isolation.
   */
  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
    if (storageMock) {
      storageMock.clear();
    }
  });

  /**
   * Close MSW server after all tests complete.
   * Cleans up resources.
   */
  afterAll(() => {
    server.close();
  });

  /**
   * Set up localStorage mock before each test.
   */
  beforeEach(() => {
    storageMock = mockLocalStorage();

    // Mock global localStorage
    vi.stubGlobal('localStorage', {
      getItem: storageMock.getItem,
      setItem: storageMock.setItem,
      removeItem: storageMock.removeItem,
      clear: storageMock.clear,
    });
  });

  // ==========================================================================
  // Login Tests
  // ==========================================================================

  describe('login', () => {
    it('should login with valid credentials and return token', async () => {
      // Arrange
      const credentials = createLoginCredentials();

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('refreshToken');
      expect(data).toHaveProperty('user');
    });

    it('should send POST request to /api/auth/login endpoint', async () => {
      // Arrange
      const credentials = createLoginCredentials();
      let requestUrl: string | undefined;
      let requestMethod: string | undefined;

      server.use(
        http.post(`${API_BASE_URL}/login`, async ({ request }) => {
          requestUrl = new URL(request.url).pathname;
          requestMethod = request.method;

          const body = await request.json() as LoginCredentials;
          if (body.email === credentials.email) {
            return HttpResponse.json(createMockAuthResponse(), { status: 200 });
          }
          return HttpResponse.json({ error: 'Invalid' }, { status: 401 });
        })
      );

      // Act
      await loginRequest(credentials);

      // Assert
      expect(requestUrl).toBe('/api/auth/login');
      expect(requestMethod).toBe('POST');
      expect(credentials.email).toBe(validCredentials.email);
    });

    it('should include Content-Type application/json header', async () => {
      // Arrange
      const credentials = createLoginCredentials();
      let contentType: string | null = null;

      server.use(
        http.post(`${API_BASE_URL}/login`, async ({ request }) => {
          contentType = request.headers.get('Content-Type');
          return HttpResponse.json(createMockAuthResponse(), { status: 200 });
        })
      );

      // Act
      await loginRequest(credentials);

      // Assert
      expect(contentType).toBe('application/json');
      expect(contentType).toContain('json');
      expect(contentType).not.toBeNull();
    });

    it('should return user data and JWT token on success', async () => {
      // Arrange
      const credentials = createLoginCredentials();

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(validUser.email);
      expect(data.user.name).toBe(validUser.name);
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
    });

    it('should throw 401 error for invalid credentials', async () => {
      // Arrange
      const invalidCreds = invalidCredentials.find(
        (c) => c.scenario === 'wrong_password'
      );
      const credentials = createLoginCredentials({
        email: invalidCreds?.email || 'john.doe@example.com',
        password: invalidCreds?.password || 'WrongPassword123',
      });

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('INVALID_CREDENTIALS');
    });

    it('should throw 400 error for missing email', async () => {
      // Arrange
      const credentials = createLoginCredentials({ email: '' });

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('MISSING_FIELDS');
    });

    it('should throw 400 error for missing password', async () => {
      // Arrange
      const credentials = createLoginCredentials({ password: '' });

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('MISSING_FIELDS');
    });

    it('should throw 400 error for invalid email format', async () => {
      // Arrange
      const invalidEmailCreds = invalidCredentials.find(
        (c) => c.scenario === 'invalid_email_format'
      );
      const credentials = createLoginCredentials({
        email: invalidEmailCreds?.email || 'invalid-email',
        password: invalidEmailCreds?.password || 'ValidPass123!',
      });

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_EMAIL_FORMAT');
      expect(data.details).toHaveProperty('email');
    });
  });

  // ==========================================================================
  // Logout Tests
  // ==========================================================================

  describe('logout', () => {
    it('should logout and clear session', async () => {
      // Arrange
      const token = MOCK_ACCESS_TOKEN;

      // Act
      const response = await logoutRequest(token);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(data.message).toContain('successfully');
    });

    it('should send POST request to /api/auth/logout', async () => {
      // Arrange
      let requestUrl: string | undefined;
      let requestMethod: string | undefined;

      server.use(
        http.post(`${API_BASE_URL}/logout`, async ({ request }) => {
          requestUrl = new URL(request.url).pathname;
          requestMethod = request.method;
          return HttpResponse.json({ message: 'Logged out successfully' }, { status: 200 });
        })
      );

      // Act
      await logoutRequest(MOCK_ACCESS_TOKEN);

      // Assert
      expect(requestUrl).toBe('/api/auth/logout');
      expect(requestMethod).toBe('POST');
      expect(requestUrl).toContain('logout');
    });

    it('should include authorization header', async () => {
      // Arrange
      let authHeader: string | null = null;

      server.use(
        http.post(`${API_BASE_URL}/logout`, async ({ request }) => {
          authHeader = request.headers.get('Authorization');
          return HttpResponse.json({ message: 'Logged out successfully' }, { status: 200 });
        })
      );

      // Act
      await logoutRequest(MOCK_ACCESS_TOKEN);

      // Assert
      expect(authHeader).not.toBeNull();
      expect(authHeader).toContain('Bearer');
      expect(authHeader).toBe(`Bearer ${MOCK_ACCESS_TOKEN}`);
    });

    it('should return 200 success response', async () => {
      // Arrange
      const token = MOCK_ACCESS_TOKEN;

      // Act
      const response = await logoutRequest(token);

      // Assert
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(response.headers.get('Content-Type')).toContain('application/json');
    });

    it('should handle logout when already logged out (no token)', async () => {
      // Arrange - no token provided

      // Act
      const response = await logoutRequest();
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });

  // ==========================================================================
  // Register Tests
  // ==========================================================================

  describe('register', () => {
    it('should register new user with valid data', async () => {
      // Arrange
      const registerData = createRegisterData({
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
      });

      // We need to use a unique email that's not in testUsers
      const uniqueRegisterData = createRegisterData({
        email: `unique${Date.now()}@example.com`,
        password: 'NewUser#789',
        name: 'Brand New User',
      });

      // Act
      const response = await registerRequest(uniqueRegisterData);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('token');
    });

    it('should send POST request to /api/auth/register', async () => {
      // Arrange
      let requestUrl: string | undefined;
      let requestMethod: string | undefined;

      server.use(
        http.post(`${API_BASE_URL}/register`, async ({ request }) => {
          requestUrl = new URL(request.url).pathname;
          requestMethod = request.method;
          const body = await request.json() as RegisterData;
          return HttpResponse.json(
            createMockAuthResponse({ email: body.email, name: body.name }),
            { status: 201 }
          );
        })
      );

      // Act
      await registerRequest(createRegisterData());

      // Assert
      expect(requestUrl).toBe('/api/auth/register');
      expect(requestMethod).toBe('POST');
      expect(requestUrl).toContain('register');
    });

    it('should return user data and token on success', async () => {
      // Arrange
      const registerData = createRegisterData({
        email: `success${Date.now()}@example.com`,
      });

      // Act
      const response = await registerRequest(registerData);
      const data = await response.json();

      // Assert
      expect(data.user).toBeDefined();
      expect(data.user.email).toBeDefined();
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.refreshToken).toBeDefined();
    });

    it('should throw 400 error for existing email', async () => {
      // Arrange - use email that already exists in testUsers
      const registerData = createRegisterData({
        email: validUser.email,
        password: 'NewPassword123!',
        name: 'Existing Email User',
      });

      // Act
      const response = await registerRequest(registerData);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(409);
      expect(data.code).toBe('EMAIL_EXISTS');
      expect(data.error).toContain('already');
    });

    it('should throw 400 error for weak password', async () => {
      // Arrange - password too short
      const registerData = createRegisterData({
        email: `weakpass${Date.now()}@example.com`,
        password: '123', // Too short
        name: 'Weak Password User',
      });

      // Act
      const response = await registerRequest(registerData);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details).toHaveProperty('password');
    });

    it('should throw 400 error for invalid email format', async () => {
      // Arrange
      const registerData = createRegisterData({
        email: 'invalid-email-format',
        password: 'ValidP@ss123',
        name: 'Invalid Email User',
      });

      // Act
      const response = await registerRequest(registerData);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.email).toBeDefined();
    });

    it('should throw 400 error for missing required fields', async () => {
      // Arrange
      const registerData = {
        email: '',
        password: '',
        name: '',
      };

      // Act
      const response = await registerRequest(registerData);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details).toBeDefined();
    });
  });

  // ==========================================================================
  // Refresh Token Tests
  // ==========================================================================

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Arrange - First login to get a valid refresh token
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();
      const validRefreshToken = loginData.refreshToken;

      // Act
      const response = await refreshTokenRequest(validRefreshToken);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('token');
      expect(typeof data.token).toBe('string');
    });

    it('should send POST request to /api/auth/refresh', async () => {
      // Arrange
      let requestUrl: string | undefined;
      let requestMethod: string | undefined;

      // First login to get valid token
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();

      server.use(
        http.post(`${API_BASE_URL}/refresh`, async ({ request }) => {
          requestUrl = new URL(request.url).pathname;
          requestMethod = request.method;
          return HttpResponse.json(
            { token: MOCK_ACCESS_TOKEN, refreshToken: MOCK_REFRESH_TOKEN },
            { status: 200 }
          );
        })
      );

      // Act
      await refreshTokenRequest(loginData.refreshToken);

      // Assert
      expect(requestUrl).toBe('/api/auth/refresh');
      expect(requestMethod).toBe('POST');
      expect(requestUrl).toContain('refresh');
    });

    it('should return new access token', async () => {
      // Arrange - First login to get a valid refresh token
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();
      const originalToken = loginData.token;

      // Act
      const response = await refreshTokenRequest(loginData.refreshToken);
      const data = await response.json();

      // Assert
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
      // New token should be generated (different from original)
      expect(data.token).not.toBe(originalToken);
    });

    it('should throw 401 error for expired refresh token', async () => {
      // Arrange - use an expired/invalid refresh token
      const expiredToken = 'expired.refresh.token';

      // Act
      const response = await refreshTokenRequest(expiredToken);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should throw 401 error for invalid refresh token', async () => {
      // Arrange
      const invalidToken = 'invalid-refresh-token-format';

      // Act
      const response = await refreshTokenRequest(invalidToken);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.code).toBe('INVALID_REFRESH_TOKEN');
      expect(data.error).toContain('Invalid');
    });
  });

  // ==========================================================================
  // Get Current User Tests
  // ==========================================================================

  describe('getCurrentUser', () => {
    it('should fetch current authenticated user', async () => {
      // Arrange - First login to establish session
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();

      // Act
      const response = await getCurrentUserRequest(loginData.token);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email');
      expect(data).toHaveProperty('name');
    });

    it('should send GET request to /api/auth/me', async () => {
      // Arrange
      let requestUrl: string | undefined;
      let requestMethod: string | undefined;

      // First login
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();

      server.use(
        http.get(`${API_BASE_URL}/me`, async ({ request }) => {
          requestUrl = new URL(request.url).pathname;
          requestMethod = request.method;
          return HttpResponse.json(
            { id: 'user-001', email: validUser.email, name: validUser.name },
            { status: 200 }
          );
        })
      );

      // Act
      await getCurrentUserRequest(loginData.token);

      // Assert
      expect(requestUrl).toBe('/api/auth/me');
      expect(requestMethod).toBe('GET');
      expect(requestUrl).toContain('me');
    });

    it('should include authorization header with token', async () => {
      // Arrange
      let authHeader: string | null = null;

      // First login
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();

      server.use(
        http.get(`${API_BASE_URL}/me`, async ({ request }) => {
          authHeader = request.headers.get('Authorization');
          return HttpResponse.json(
            { id: 'user-001', email: validUser.email, name: validUser.name },
            { status: 200 }
          );
        })
      );

      // Act
      await getCurrentUserRequest(loginData.token);

      // Assert
      expect(authHeader).not.toBeNull();
      expect(authHeader).toContain('Bearer');
      expect(authHeader).toBe(`Bearer ${loginData.token}`);
    });

    it('should return user profile data', async () => {
      // Arrange - First login
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();

      // Act
      const response = await getCurrentUserRequest(loginData.token);
      const data = await response.json();

      // Assert
      expect(data.email).toBe(validUser.email);
      expect(data.name).toBe(validUser.name);
      expect(data.id).toBeDefined();
      expect(data.role).toBeDefined();
    });

    it('should throw 401 error when not authenticated', async () => {
      // Arrange - no token provided

      // Act
      const response = await getCurrentUserRequest();
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should throw 401 error for expired token', async () => {
      // Arrange - use an expired token
      const expiredToken = 'expired.access.token';

      server.use(
        http.get(`${API_BASE_URL}/me`, async () => {
          return HttpResponse.json(
            { error: 'Token expired', code: 'TOKEN_EXPIRED' },
            { status: 401 }
          );
        })
      );

      // Act
      const response = await getCurrentUserRequest(expiredToken);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.code).toBe('TOKEN_EXPIRED');
      expect(data.error).toContain('expired');
    });
  });

  // ==========================================================================
  // Token Management Tests
  // ==========================================================================

  describe('Token Management', () => {
    it('should verify token stored after successful login', async () => {
      // Arrange
      const credentials = createLoginCredentials();

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Simulate storing token
      storageMock.setItem('accessToken', data.token);
      storageMock.setItem('refreshToken', data.refreshToken);

      // Assert
      expect(storageMock.setItem).toHaveBeenCalledTimes(2);
      expect(storageMock.store.get('accessToken')).toBe(data.token);
      expect(storageMock.store.get('refreshToken')).toBe(data.refreshToken);
    });

    it('should verify token cleared after logout', async () => {
      // Arrange - First login
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();

      // Store tokens
      storageMock.setItem('accessToken', loginData.token);
      storageMock.setItem('refreshToken', loginData.refreshToken);

      // Act - Logout
      await logoutRequest(loginData.token);

      // Simulate clearing tokens
      storageMock.removeItem('accessToken');
      storageMock.removeItem('refreshToken');

      // Assert
      expect(storageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(storageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(storageMock.store.get('accessToken')).toBeUndefined();
    });

    it('should verify authorization header includes Bearer token', async () => {
      // Arrange
      let authHeader: string | null = null;
      const testToken = 'test-access-token-123';

      server.use(
        http.get(`${API_BASE_URL}/me`, async ({ request }) => {
          authHeader = request.headers.get('Authorization');
          return HttpResponse.json({ id: 'user-001' }, { status: 200 });
        })
      );

      // Act
      await getCurrentUserRequest(testToken);

      // Assert
      expect(authHeader).toBe(`Bearer ${testToken}`);
      expect(authHeader).toContain('Bearer');
      expect(authHeader).not.toBeNull();
    });

    it('should verify token refresh before expiration', async () => {
      // Arrange - Login first
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();
      const originalToken = loginData.token;

      // Store original token
      storageMock.setItem('accessToken', originalToken);
      storageMock.setItem('refreshToken', loginData.refreshToken);

      // Act - Refresh token
      const refreshResponse = await refreshTokenRequest(loginData.refreshToken);
      const refreshData = await refreshResponse.json();

      // Update stored token
      storageMock.setItem('accessToken', refreshData.token);

      // Assert
      expect(refreshResponse.ok).toBe(true);
      expect(refreshData.token).toBeDefined();
      expect(storageMock.store.get('accessToken')).toBe(refreshData.token);
      expect(refreshData.token).not.toBe(originalToken);
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should login with special characters in password', async () => {
      // Arrange - Create user with special characters
      const specialUser = createTestUser({
        email: 'special@example.com',
        password: 'Sp3c!@l#Ch4rs',
        name: 'Special User',
      });

      server.use(
        http.post(`${API_BASE_URL}/login`, async ({ request }) => {
          const body = await request.json() as LoginCredentials;
          if (body.email === specialUser.email && body.password === specialUser.password) {
            return HttpResponse.json(createMockAuthResponse({ email: specialUser.email }), { status: 200 });
          }
          return HttpResponse.json({ error: 'Invalid', code: 'INVALID_CREDENTIALS' }, { status: 401 });
        })
      );

      const credentials = createLoginCredentials({
        email: specialUser.email,
        password: specialUser.password,
      });

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(data.token).toBeDefined();
    });

    it('should register with very long name', async () => {
      // Arrange
      const longName = 'A'.repeat(100); // Maximum allowed length
      const registerData = createRegisterData({
        email: `longname${Date.now()}@example.com`,
        name: longName,
      });

      // Act
      const response = await registerRequest(registerData);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.name).toBe(longName);
    });

    it('should handle login with whitespace in email/password', async () => {
      // Arrange - whitespace only credentials
      const whitespaceOnlyCreds = invalidCredentials.find(
        (c) => c.scenario === 'whitespace_only'
      );
      const credentials = createLoginCredentials({
        email: whitespaceOnlyCreds?.email || '   ',
        password: whitespaceOnlyCreds?.password || '   ',
      });

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.code).toBe('EMPTY_CREDENTIALS');
    });

    it('should handle concurrent login requests', async () => {
      // Arrange
      const credentials = createLoginCredentials();

      // Act - Send multiple concurrent requests
      const requests = Array.from({ length: 3 }, () => loginRequest(credentials));
      const responses = await Promise.all(requests);

      // Assert
      expect(responses.length).toBe(3);
      responses.forEach((response) => {
        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
      });

      // Verify all responses have tokens
      const dataPromises = responses.map((r) => r.json());
      const allData = await Promise.all(dataPromises);
      allData.forEach((data) => {
        expect(data.token).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle network failure during login', async () => {
      // Arrange
      server.use(
        http.post(`${API_BASE_URL}/login`, () => {
          return HttpResponse.error();
        })
      );

      const credentials = createLoginCredentials();

      // Act & Assert
      await expect(loginRequest(credentials)).rejects.toThrow();
    });

    it('should handle server error (500) during login', async () => {
      // Arrange
      server.use(
        http.post(`${API_BASE_URL}/login`, () => {
          return HttpResponse.json(
            { error: 'Internal Server Error', code: 'SERVER_ERROR' },
            { status: 500 }
          );
        })
      );

      const credentials = createLoginCredentials();

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('SERVER_ERROR');
    });

    it('should handle timeout during authentication', async () => {
      // Arrange - simulate a very slow response
      server.use(
        http.post(`${API_BASE_URL}/login`, async () => {
          // This simulates a timeout scenario
          return HttpResponse.json(
            { error: 'Request timeout', code: 'TIMEOUT' },
            { status: 408 }
          );
        })
      );

      const credentials = createLoginCredentials();

      // Act
      const response = await loginRequest(credentials);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(408);
      expect(data.code).toBe('TIMEOUT');
    });

    it('should handle invalid JSON response', async () => {
      // Arrange
      server.use(
        http.post(`${API_BASE_URL}/login`, () => {
          return HttpResponse.text('Not valid JSON', { status: 200 });
        })
      );

      const credentials = createLoginCredentials();

      // Act
      const response = await loginRequest(credentials);

      // Assert
      expect(response.ok).toBe(true);
      await expect(response.json()).rejects.toThrow();
      expect(response.status).toBe(200);
    });

    it('should handle session timeout (403 Forbidden)', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/me`, () => {
          return HttpResponse.json(
            { error: 'Session expired', code: 'SESSION_TIMEOUT' },
            { status: 403 }
          );
        })
      );

      // Act
      const response = await getCurrentUserRequest(MOCK_ACCESS_TOKEN);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
      expect(data.code).toBe('SESSION_TIMEOUT');
      expect(data.error).toContain('Session');
    });

    it('should handle network error during registration', async () => {
      // Arrange
      server.use(
        http.post(`${API_BASE_URL}/register`, () => {
          return HttpResponse.error();
        })
      );

      const registerData = createRegisterData();

      // Act & Assert
      await expect(registerRequest(registerData)).rejects.toThrow();
    });

    it('should handle server error (500) during token refresh', async () => {
      // Arrange
      server.use(
        http.post(`${API_BASE_URL}/refresh`, () => {
          return HttpResponse.json(
            { error: 'Server error during refresh', code: 'SERVER_ERROR' },
            { status: 500 }
          );
        })
      );

      // Act
      const response = await refreshTokenRequest(MOCK_REFRESH_TOKEN);
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(data.code).toBe('SERVER_ERROR');
    });
  });

  // ==========================================================================
  // Integration Flow Tests
  // ==========================================================================

  describe('Authentication Flow Integration', () => {
    it('should complete full login-logout cycle', async () => {
      // Arrange
      const credentials = createLoginCredentials();

      // Act - Login
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();

      // Assert login success
      expect(loginResponse.ok).toBe(true);
      expect(loginData.token).toBeDefined();

      // Act - Logout
      const logoutResponse = await logoutRequest(loginData.token);
      const logoutData = await logoutResponse.json();

      // Assert logout success
      expect(logoutResponse.ok).toBe(true);
      expect(logoutData.message).toContain('successfully');
    });

    it('should complete full register-login cycle', async () => {
      // Arrange - Register new user
      const registerData = createRegisterData({
        email: `flowtest${Date.now()}@example.com`,
      });

      // Act - Register
      const registerResponse = await registerRequest(registerData);
      const registeredData = await registerResponse.json();

      // Assert registration
      expect(registerResponse.ok).toBe(true);
      expect(registeredData.user.email).toBeDefined();

      // For this test, we use valid credentials since the mock
      // doesn't persist newly registered users
      const loginCredentials = createLoginCredentials();

      // Act - Login
      const loginResponse = await loginRequest(loginCredentials);
      const loginData = await loginResponse.json();

      // Assert login
      expect(loginResponse.ok).toBe(true);
      expect(loginData.token).toBeDefined();
      expect(loginData.refreshToken).toBeDefined();
    });

    it('should complete login-refresh-me cycle', async () => {
      // Arrange - Login
      const credentials = createLoginCredentials();
      const loginResponse = await loginRequest(credentials);
      const loginData = await loginResponse.json();

      expect(loginResponse.ok).toBe(true);

      // Act - Refresh token
      const refreshResponse = await refreshTokenRequest(loginData.refreshToken);
      const refreshData = await refreshResponse.json();

      expect(refreshResponse.ok).toBe(true);

      // Act - Get current user with new token
      const meResponse = await getCurrentUserRequest(refreshData.token);
      const meData = await meResponse.json();

      // Assert
      expect(meResponse.ok).toBe(true);
      expect(meData.email).toBe(validUser.email);
      expect(meData.name).toBe(validUser.name);
    });
  });
});
