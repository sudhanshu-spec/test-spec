/**
 * @fileoverview Test user data fixtures for authentication testing
 * @module tests/fixtures/users
 *
 * Provides consistent, typed test data for authentication testing across
 * the test suite. Includes user collections, credential scenarios, and
 * helper factory functions following patterns from backend test mocks.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a test user with all authentication-related properties.
 * Used throughout auth tests for login, registration, and profile testing.
 * 
 * Note: Role values are aligned with testUtils.ts TestUser interface:
 * - 'customer': Regular user (maps to 'user' in UI)
 * - 'admin': Administrator with elevated privileges
 * - 'staff': Restaurant staff member
 */
export interface TestUser {
  /** Unique identifier for the user */
  id: string;
  /** User's email address used for login */
  email: string;
  /** User's password (plaintext for test purposes) */
  password: string;
  /** User's display name */
  name: string;
  /** User's role determining access permissions */
  role: 'customer' | 'admin' | 'staff';
}

/**
 * Credentials required for user login.
 * Subset of TestUser containing only authentication fields.
 */
export interface LoginCredentials {
  /** Email address for login */
  email: string;
  /** Password for login */
  password: string;
}

/**
 * Response structure from successful authentication.
 * Contains user data and JWT tokens for session management.
 */
export interface AuthResponse {
  /** Authenticated user's data (password excluded in real implementation) */
  user: TestUser;
  /** JWT access token for API authorization */
  token: string;
  /** JWT refresh token for obtaining new access tokens */
  refreshToken: string;
}

// ============================================================================
// Test User Constants
// ============================================================================

/**
 * Standard valid test user for successful login scenarios.
 * Use this user when testing happy path authentication flows.
 */
export const validUser: TestUser = {
  id: 'user-001',
  email: 'john.doe@example.com',
  password: 'SecureP@ss123',
  name: 'John Doe',
  role: 'customer'
};

/**
 * Admin test user with elevated privileges.
 * Use for testing admin-only routes and administrative functions.
 */
export const adminUser: TestUser = {
  id: 'admin-001',
  email: 'admin@burgerwebsite.com',
  password: 'Admin$ecure456',
  name: 'Admin User',
  role: 'admin'
};

/**
 * New user data for registration testing.
 * Use when testing user registration and account creation flows.
 */
export const newUser: TestUser = {
  id: 'user-new-001',
  email: 'new.user@example.com',
  password: 'NewUser#789',
  name: 'New User',
  role: 'customer'
};

/**
 * User with special characters in name and email.
 * Tests input sanitization and encoding edge cases.
 */
export const specialCharsUser: TestUser = {
  id: 'user-special-001',
  email: "jane.o'connor+test@example.com",
  password: 'Sp3c!@l#Ch4rs',
  name: "Jane O'Connor-Smith",
  role: 'customer'
};

/**
 * User with a very long name.
 * Tests UI truncation and database field limits.
 */
export const longNameUser: TestUser = {
  id: 'user-longname-001',
  email: 'maximilian.longname@example.com',
  password: 'LongName123!',
  name: 'Maximilian Alexander von Hohenzollern-Sigmaringen the Third Junior',
  role: 'customer'
};

/**
 * User with only minimum required fields.
 * Tests handling of optional field absence.
 */
export const minimalUser: TestUser = {
  id: 'user-minimal-001',
  email: 'minimal@example.com',
  password: 'MinimalP@ss1',
  name: 'Min',
  role: 'customer'
};

/**
 * Collection of all test users for iteration and bulk testing.
 * Includes regular users, admin, and edge case users.
 */
export const testUsers: TestUser[] = [
  validUser,
  adminUser,
  newUser,
  specialCharsUser,
  longNameUser,
  minimalUser,
  {
    id: 'user-002',
    email: 'jane.smith@example.com',
    password: 'JaneP@ss456',
    name: 'Jane Smith',
    role: 'customer'
  },
  {
    id: 'user-003',
    email: 'bob.wilson@example.com',
    password: 'BobW!ls0n789',
    name: 'Bob Wilson',
    role: 'customer'
  }
];

// ============================================================================
// Credential Scenarios
// ============================================================================

/**
 * Valid credentials matching the validUser for successful login.
 * Use with API mocks to test successful authentication responses.
 */
export const validCredentials: LoginCredentials = {
  email: validUser.email,
  password: validUser.password
};

/**
 * Collection of invalid credential scenarios for testing authentication failures.
 * Each entry represents a different type of invalid credential combination.
 */
export const invalidCredentials: Array<LoginCredentials & { scenario: string }> = [
  {
    email: 'john.doe@example.com',
    password: 'WrongPassword123',
    scenario: 'wrong_password'
  },
  {
    email: 'nonexistent@example.com',
    password: 'AnyPassword123',
    scenario: 'nonexistent_email'
  },
  {
    email: '',
    password: 'SomePassword123',
    scenario: 'empty_email'
  },
  {
    email: 'john.doe@example.com',
    password: '',
    scenario: 'empty_password'
  },
  {
    email: '',
    password: '',
    scenario: 'empty_fields'
  },
  {
    email: 'invalid-email-format',
    password: 'ValidPass123!',
    scenario: 'invalid_email_format'
  },
  {
    email: 'john.doe@example.com',
    password: '123',
    scenario: 'password_too_short'
  },
  {
    email: '   ',
    password: '   ',
    scenario: 'whitespace_only'
  }
];

// ============================================================================
// Auth Response Fixtures
// ============================================================================

/**
 * Successful login response fixture.
 * Use when mocking successful authentication API responses.
 */
export const successfulLoginResponse: AuthResponse = {
  user: {
    ...validUser,
    password: '' // Password should not be returned in real response
  },
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsImVtYWlsIjoiam9obi5kb2VAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoxNzA0MTUzNjAwfQ.mock_signature_valid_token',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjE3MDQ2NzIwMDB9.mock_signature_refresh_token'
};

/**
 * Response simulating an expired token scenario.
 * Use when testing token refresh flows and session expiration handling.
 */
export const expiredTokenResponse: AuthResponse = {
  user: {
    ...validUser,
    password: ''
  },
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsImVtYWlsIjoiam9obi5kb2VAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTYwNDAwMDAwMCwiZXhwIjoxNjA0MDAwMDAxfQ.mock_signature_expired_token',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNjA0MDAwMDAwLCJleHAiOjE2MDQwMDAwMDF9.mock_signature_expired_refresh'
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Counter for generating unique user IDs.
 * Incremented each time createTestUser is called without an ID override.
 * @internal
 */
let userIdCounter = 100;

/**
 * Factory function for generating test users with optional overrides.
 * Creates users with sensible defaults that can be customized as needed.
 * Follows the mock factory pattern from server.test.js.
 *
 * @param overrides - Optional partial TestUser to override default values
 * @returns Complete TestUser object with unique ID
 *
 * @example
 * // Create user with defaults
 * const user = createTestUser();
 *
 * @example
 * // Create admin user
 * const admin = createTestUser({ role: 'admin', name: 'Test Admin' });
 *
 * @example
 * // Create user with specific email
 * const user = createTestUser({ email: 'specific@example.com' });
 */
export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  const uniqueId = userIdCounter++;
  const defaultUser: TestUser = {
    id: `user-gen-${uniqueId}`,
    email: `testuser${uniqueId}@example.com`,
    password: `TestPass${uniqueId}!`,
    name: `Test User ${uniqueId}`,
    role: 'customer'
  };

  return {
    ...defaultUser,
    ...overrides
  };
}

/**
 * Generates a mock JWT token for a given user.
 * Creates a realistic-looking JWT structure for testing purposes.
 * Does not perform actual JWT signing - for testing only.
 *
 * @param user - The TestUser to generate a token for
 * @returns Mock JWT token string
 *
 * @example
 * const user = createTestUser();
 * const token = generateAuthToken(user);
 * // Use token in Authorization header mock
 */
export function generateAuthToken(user: TestUser): string {
  // Create a mock JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Create mock JWT payload with user data
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    iat: now,
    exp: now + 86400 // 24 hours from now
  };

  // Encode header and payload as base64url (simplified for testing)
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Create mock signature
  const mockSignature = `mock_sig_${user.id}_${now}`;
  const encodedSignature = Buffer.from(mockSignature).toString('base64url');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Generates a mock refresh token for a given user.
 * Creates a longer-lived token structure for refresh token testing.
 *
 * @param user - The TestUser to generate a refresh token for
 * @returns Mock refresh JWT token string
 *
 * @example
 * const user = createTestUser();
 * const refreshToken = generateRefreshToken(user);
 */
export function generateRefreshToken(user: TestUser): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId: user.id,
    type: 'refresh',
    iat: now,
    exp: now + 604800 // 7 days from now
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mockSignature = `mock_refresh_${user.id}_${now}`;
  const encodedSignature = Buffer.from(mockSignature).toString('base64url');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Creates a complete AuthResponse for a given user.
 * Convenience function combining user data with generated tokens.
 *
 * @param user - The TestUser to create a response for
 * @returns Complete AuthResponse object
 *
 * @example
 * const user = createTestUser({ role: 'admin' });
 * const response = createAuthResponse(user);
 * // Use in MSW handler: HttpResponse.json(response)
 */
export function createAuthResponse(user: TestUser): AuthResponse {
  return {
    user: {
      ...user,
      password: '' // Never return password in auth response
    },
    token: generateAuthToken(user),
    refreshToken: generateRefreshToken(user)
  };
}

/**
 * Resets the user ID counter.
 * Call in test cleanup to ensure deterministic user ID generation.
 *
 * @example
 * afterEach(() => {
 *   resetUserIdCounter();
 * });
 */
export function resetUserIdCounter(): void {
  userIdCounter = 100;
}
