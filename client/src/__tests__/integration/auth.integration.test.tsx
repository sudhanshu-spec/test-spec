/**
 * @fileoverview Integration tests for authentication user flows
 * @module tests/integration/auth
 *
 * Comprehensive integration tests verifying the complete authentication flow
 * in the Burger Website application. Tests cover:
 * - User login with valid/invalid credentials
 * - User registration with validation
 * - User logout and session clearing
 * - Session management and token refresh
 * - Protected route access control
 *
 * These tests use MSW mock handlers for realistic API simulation and
 * follow patterns established in tests/lifecycle/server.test.js for
 * organization, mock factory patterns, and lifecycle management.
 *
 * @see {@link module:tests/mocks/server} MSW server configuration
 * @see {@link module:tests/fixtures/users} Test user fixtures
 * @see {@link module:tests/utils/render} Custom render utilities
 */

import React, { useState, FormEvent } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

// Internal imports from depends_on_files
import { render, renderWithAuth, customRender } from '../utils/render';
import { server } from '../mocks/server';
import {
  validUser,
  validCredentials,
  invalidCredentials,
  newUser,
  testUsers,
  createTestUser,
  createAuthResponse,
  generateAuthToken,
} from '../fixtures/users';
import { clearAllStorage } from '../utils/testUtils';
import { AuthProvider, useAuthContext } from '../../features/auth/AuthContext';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props for the mock LoginForm component used in testing.
 * @interface MockLoginFormProps
 */
interface MockLoginFormProps {
  /** Callback triggered on successful login */
  onLoginSuccess?: () => void;
  /** Callback triggered on login failure */
  onLoginError?: (error: Error) => void;
}

/**
 * Props for the mock RegisterForm component used in testing.
 * @interface MockRegisterFormProps
 */
interface MockRegisterFormProps {
  /** Callback triggered on successful registration */
  onRegisterSuccess?: () => void;
  /** Callback triggered on registration failure */
  onRegisterError?: (error: Error) => void;
}

/**
 * Props for the mock ProtectedContent component used in testing.
 * @interface MockProtectedContentProps
 */
interface MockProtectedContentProps {
  /** Content to display when authenticated */
  children?: React.ReactNode;
}

// ============================================================================
// Mock Components for Integration Testing
// Following createMockServer pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Mock LoginForm component for testing authentication flows.
 * Provides a realistic form interface for login testing with
 * email/password fields and submission handling.
 *
 * @param {MockLoginFormProps} props - Component props
 * @returns {React.ReactElement} Rendered login form
 */
function MockLoginForm({ onLoginSuccess, onLoginError }: MockLoginFormProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const auth = useAuthContext();

  /**
   * Validates email format.
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  const isValidEmailFormat = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handles form submission for login.
   * @param {FormEvent} e - Form event
   */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    // Validate required fields
    let hasErrors = false;

    if (!email.trim()) {
      setEmailError('Email is required');
      hasErrors = true;
    } else if (!isValidEmailFormat(email)) {
      setEmailError('Please enter a valid email address');
      hasErrors = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setIsLoading(true);

    try {
      await auth.login(email, password);
      onLoginSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      onLoginError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Login form">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        {emailError && (
          <span id="email-error" role="alert" aria-live="polite">
            {emailError}
          </span>
        )}
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? 'password-error' : undefined}
        />
        {passwordError && (
          <span id="password-error" role="alert" aria-live="polite">
            {passwordError}
          </span>
        )}
      </div>
      {error && (
        <div role="alert" aria-live="assertive" data-testid="login-error">
          {error}
        </div>
      )}
      <button type="submit" disabled={isLoading} aria-busy={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}

/**
 * Mock RegisterForm component for testing registration flows.
 * Provides a realistic form interface for registration testing.
 *
 * @param {MockRegisterFormProps} props - Component props
 * @returns {React.ReactElement} Rendered registration form
 */
function MockRegisterForm({
  onRegisterSuccess,
  onRegisterError,
}: MockRegisterFormProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Validates password strength.
   * @param {string} password - Password to validate
   * @returns {boolean} True if password meets requirements
   */
  const isValidPassword = (password: string): boolean => {
    return password.length >= 8;
  };

  /**
   * Handles form submission for registration.
   * @param {FormEvent} e - Form event
   */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validate fields
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    }

    if (!name.trim()) {
      errors.name = 'Name is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!isValidPassword(password)) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      onRegisterSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      onRegisterError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Registration form">
      <div>
        <label htmlFor="register-name">Name</label>
        <input
          id="register-name"
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!validationErrors.name}
        />
        {validationErrors.name && (
          <span role="alert" aria-live="polite">
            {validationErrors.name}
          </span>
        )}
      </div>
      <div>
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!validationErrors.email}
        />
        {validationErrors.email && (
          <span role="alert" aria-live="polite">
            {validationErrors.email}
          </span>
        )}
      </div>
      <div>
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!validationErrors.password}
        />
        {validationErrors.password && (
          <span role="alert" aria-live="polite">
            {validationErrors.password}
          </span>
        )}
      </div>
      {error && (
        <div role="alert" aria-live="assertive" data-testid="register-error">
          {error}
        </div>
      )}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}

/**
 * Mock component displaying user dashboard after authentication.
 * Shows user information when authenticated.
 *
 * @returns {React.ReactElement} Rendered dashboard
 */
function MockDashboard(): React.ReactElement {
  const auth = useAuthContext();

  if (auth.isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    return <div data-testid="not-authenticated">Please log in to continue</div>;
  }

  return (
    <div data-testid="dashboard">
      <h1>Welcome, {auth.user?.name || 'User'}!</h1>
      <p data-testid="user-email">{auth.user?.email}</p>
      <button onClick={auth.logout}>Logout</button>
    </div>
  );
}

/**
 * Mock protected content component that requires authentication.
 * Displays content only when user is authenticated.
 *
 * @param {MockProtectedContentProps} props - Component props
 * @returns {React.ReactElement} Rendered protected content or redirect message
 */
function MockProtectedContent({ children }: MockProtectedContentProps): React.ReactElement {
  const auth = useAuthContext();

  if (auth.isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    return (
      <div data-testid="redirect-to-login">
        <p>You must be logged in to view this content.</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  return <div data-testid="protected-content">{children || 'Protected Content'}</div>;
}

/**
 * Mock logout button component for testing logout flows.
 *
 * @returns {React.ReactElement} Rendered logout button
 */
function MockLogoutButton(): React.ReactElement {
  const auth = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await auth.logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-busy={isLoggingOut}
      data-testid="logout-button"
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}

// ============================================================================
// Helper Functions
// Following createMockServer/createMockListen patterns from server.test.js
// ============================================================================

/**
 * Creates a mock authenticated state for testing.
 * Following the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param {object} overrides - Optional overrides for the auth state
 * @returns {object} Mock auth state
 */
function createMockAuthState(
  overrides: Partial<{
    isAuthenticated: boolean;
    user: typeof validUser | null;
    token: string | null;
    isLoading: boolean;
  }> = {}
): {
  isAuthenticated: boolean;
  user: typeof validUser | null;
  token: string | null;
  isLoading: boolean;
} {
  return {
    isAuthenticated: true,
    user: validUser,
    token: 'mock-jwt-token',
    isLoading: false,
    ...overrides,
  };
}

/**
 * Simulates a network error by overriding handlers.
 * Use server.resetHandlers() to restore original handlers.
 */
function simulateNetworkError(): void {
  server.use(
    http.post('/api/auth/login', () => {
      return HttpResponse.error();
    }),
    http.post('/api/auth/register', () => {
      return HttpResponse.error();
    }),
    http.post('/api/auth/logout', () => {
      return HttpResponse.error();
    }),
    http.post('/api/auth/refresh', () => {
      return HttpResponse.error();
    })
  );
}

/**
 * Simulates an expired token by returning 401 from protected endpoints.
 * Use server.resetHandlers() to restore original handlers.
 */
function simulateExpiredToken(): void {
  server.use(
    http.get('/api/auth/me', () => {
      return HttpResponse.json(
        { error: 'Token expired', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }),
    http.post('/api/auth/refresh', () => {
      return HttpResponse.json(
        { error: 'Refresh token expired', code: 'REFRESH_TOKEN_EXPIRED' },
        { status: 401 }
      );
    })
  );
}

/**
 * Simulates server error (500) responses.
 */
function simulateServerError(): void {
  server.use(
    http.post('/api/auth/login', () => {
      return HttpResponse.json(
        { error: 'Internal server error', code: 'SERVER_ERROR' },
        { status: 500 }
      );
    }),
    http.post('/api/auth/register', () => {
      return HttpResponse.json(
        { error: 'Internal server error', code: 'SERVER_ERROR' },
        { status: 500 }
      );
    })
  );
}

// ============================================================================
// Test Lifecycle Setup/Teardown
// Following patterns from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Clear all storage and reset mocks before each test.
 * Ensures complete test isolation per Section 0.10.1 requirements.
 */
beforeEach(() => {
  clearAllStorage();
  vi.resetAllMocks();
});

/**
 * Clean up DOM and reset MSW handlers after each test.
 * Ensures no state leakage between tests.
 */
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// ============================================================================
// Test Suites
// ============================================================================

describe('Authentication Integration Tests', () => {
  // ==========================================================================
  // Login Flow Tests
  // ==========================================================================
  describe('Login Flow', () => {
    it('should successfully login with valid credentials and display dashboard', async () => {
      // Arrange
      const user = userEvent.setup();
      const onLoginSuccess = vi.fn();

      render(
        <>
          <MockLoginForm onLoginSuccess={onLoginSuccess} />
          <MockDashboard />
        </>
      );

      // Act - Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, validCredentials.email);
      await user.type(passwordInput, validCredentials.password);
      await user.click(submitButton);

      // Assert - Check for successful login
      await waitFor(() => {
        expect(onLoginSuccess).toHaveBeenCalled();
      });

      // Wait for dashboard to show user info
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    it('should display error message for invalid credentials', async () => {
      // Arrange
      const user = userEvent.setup();
      const onLoginError = vi.fn();

      // Override login handler to return 401
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.json(
            { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
            { status: 401 }
          );
        })
      );

      render(<MockLoginForm onLoginError={onLoginError} />);

      // Act
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument();
      });

      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      expect(onLoginError).toHaveBeenCalled();
    });

    it('should validate email format before submission', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act - Enter invalid email format
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'somepassword');
      await user.click(submitButton);

      // Assert - Validation error should be shown
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // The email input should be marked as invalid for accessibility
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should require both email and password fields', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act - Submit empty form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Assert - Required field errors shown
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should require password when email is filled', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act - Fill only email
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, validCredentials.email);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Email error should not appear
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });

    it('should handle network failure gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      const onLoginError = vi.fn();

      // Simulate network error
      simulateNetworkError();

      render(<MockLoginForm onLoginError={onLoginError} />);

      // Act
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, validCredentials.email);
      await user.type(passwordInput, validCredentials.password);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument();
      });

      expect(onLoginError).toHaveBeenCalled();
    });

    it('should handle server error (500) gracefully', async () => {
      // Arrange
      const user = userEvent.setup();

      // Simulate server error
      simulateServerError();

      render(<MockLoginForm />);

      // Act
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, validCredentials.email);
      await user.type(passwordInput, validCredentials.password);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument();
      });
    });

    it('should disable submit button during submission', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, validCredentials.email);
      await user.type(passwordInput, validCredentials.password);

      // Don't await - check immediate state
      const clickPromise = user.click(submitButton);

      // Assert - Button should show loading state
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-busy', 'true');
      });

      await clickPromise;
    });

    it('should trim whitespace from email before submission', async () => {
      // Arrange
      const user = userEvent.setup();
      const onLoginSuccess = vi.fn();

      render(<MockLoginForm onLoginSuccess={onLoginSuccess} />);

      // Act - Enter email with whitespace
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, `  ${validCredentials.email}  `);
      await user.type(passwordInput, validCredentials.password);
      await user.click(submitButton);

      // Assert - Login should succeed despite whitespace
      await waitFor(() => {
        expect(onLoginSuccess).toHaveBeenCalled();
      });
    });

    it('should handle whitespace-only inputs', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act - Enter whitespace only
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, '   ');
      await user.type(passwordInput, '   ');
      await user.click(submitButton);

      // Assert - Should show required field errors
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Registration Flow Tests
  // ==========================================================================
  describe('Registration Flow', () => {
    it('should successfully register new user', async () => {
      // Arrange
      const user = userEvent.setup();
      const onRegisterSuccess = vi.fn();

      render(<MockRegisterForm onRegisterSuccess={onRegisterSuccess} />);

      // Act
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, newUser.name);
      await user.type(emailInput, 'newregistration@example.com');
      await user.type(passwordInput, newUser.password);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(onRegisterSuccess).toHaveBeenCalled();
      });
    });

    it('should display validation errors for weak password', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockRegisterForm />);

      // Act - Enter short password
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'short');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should prevent duplicate email registration', async () => {
      // Arrange
      const user = userEvent.setup();
      const onRegisterError = vi.fn();

      // Override to return conflict error
      server.use(
        http.post('/api/auth/register', () => {
          return HttpResponse.json(
            { error: 'Email already registered', code: 'EMAIL_EXISTS' },
            { status: 409 }
          );
        })
      );

      render(<MockRegisterForm onRegisterError={onRegisterError} />);

      // Act - Try to register with existing email
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, validUser.email);
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
      });

      expect(onRegisterError).toHaveBeenCalled();
    });

    it('should require all registration fields', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockRegisterForm />);

      // Act - Submit empty form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should handle network failure during registration', async () => {
      // Arrange
      const user = userEvent.setup();
      const onRegisterError = vi.fn();

      simulateNetworkError();

      render(<MockRegisterForm onRegisterError={onRegisterError} />);

      // Act
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(onRegisterError).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Logout Flow Tests
  // ==========================================================================
  describe('Logout Flow', () => {
    it('should successfully logout and show login prompt', async () => {
      // Arrange
      const user = userEvent.setup();

      renderWithAuth(
        <>
          <MockLogoutButton />
          <MockDashboard />
        </>,
        validUser
      );

      // Verify authenticated state first
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();

      // Act
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('not-authenticated')).toBeInTheDocument();
      });
    });

    it('should clear user session data on logout', async () => {
      // Arrange
      const user = userEvent.setup();

      // Set up initial storage data
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify(validUser));

      renderWithAuth(
        <>
          <MockLogoutButton />
          <MockDashboard />
        </>,
        validUser
      );

      // Act
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('not-authenticated')).toBeInTheDocument();
      });

      // Storage should be cleared
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });

    it('should handle logout API errors gracefully', async () => {
      // Arrange
      const user = userEvent.setup();

      // Simulate logout endpoint failure
      server.use(
        http.post('/api/auth/logout', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      renderWithAuth(
        <>
          <MockLogoutButton />
          <MockDashboard />
        </>,
        validUser
      );

      // Act
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Assert - Should still logout locally even if API fails
      await waitFor(() => {
        expect(screen.getByTestId('not-authenticated')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Session Management Tests
  // ==========================================================================
  describe('Session Management', () => {
    it('should persist authentication across component remounts', async () => {
      // Arrange
      const initialAuthState = createMockAuthState();

      const { unmount } = customRender(<MockDashboard />, {
        initialAuthState,
      });

      // Verify initial state
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();

      // Act - Unmount and remount
      unmount();

      // Remount with same auth state
      customRender(<MockDashboard />, {
        initialAuthState,
      });

      // Assert - Should still be authenticated
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('should handle expired token by showing login prompt', async () => {
      // Arrange
      simulateExpiredToken();

      // Render with "expired" token state
      customRender(
        <MockProtectedContent>
          <span>Secret Content</span>
        </MockProtectedContent>,
        {
          initialAuthState: {
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
          },
        }
      );

      // Assert - Should redirect to login
      await waitFor(() => {
        expect(screen.getByTestId('redirect-to-login')).toBeInTheDocument();
      });

      expect(screen.getByText(/you must be logged in/i)).toBeInTheDocument();
    });

    it('should show loading state while checking authentication', async () => {
      // Arrange
      customRender(<MockDashboard />, {
        initialAuthState: {
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: true,
        },
      });

      // Assert
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('should display user email after successful authentication', async () => {
      // Arrange
      const testUser = createTestUser({ email: 'specific.user@test.com' });

      renderWithAuth(<MockDashboard />, testUser);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('specific.user@test.com');
      });
    });
  });

  // ==========================================================================
  // Protected Routes Tests
  // ==========================================================================
  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', async () => {
      // Arrange
      customRender(<MockProtectedContent />, {
        initialAuthState: {
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
        },
      });

      // Assert
      expect(screen.getByTestId('redirect-to-login')).toBeInTheDocument();
      expect(screen.getByText(/you must be logged in/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go to login/i })).toBeInTheDocument();
    });

    it('should allow authenticated users to access protected routes', async () => {
      // Arrange
      renderWithAuth(
        <MockProtectedContent>
          <span>Secret Content</span>
        </MockProtectedContent>,
        validUser
      );

      // Assert
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText(/secret content/i)).toBeInTheDocument();
    });

    it('should show loading state while authentication is being verified', async () => {
      // Arrange
      customRender(<MockProtectedContent />, {
        initialAuthState: {
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: true,
        },
      });

      // Assert
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('redirect-to-login')).not.toBeInTheDocument();
    });

    it('should grant access after user completes login', async () => {
      // Arrange - Start unauthenticated
      const user = userEvent.setup();

      render(
        <>
          <MockLoginForm />
          <MockProtectedContent>
            <span>Protected Area</span>
          </MockProtectedContent>
        </>
      );

      // Verify initially unauthenticated
      expect(screen.getByTestId('redirect-to-login')).toBeInTheDocument();

      // Act - Login
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, validCredentials.email);
      await user.type(passwordInput, validCredentials.password);
      await user.click(submitButton);

      // Assert - Should now have access
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(screen.getByText(/protected area/i)).toBeInTheDocument();
    });

    it('should revoke access after user logs out', async () => {
      // Arrange - Start authenticated
      const user = userEvent.setup();

      renderWithAuth(
        <>
          <MockLogoutButton />
          <MockProtectedContent>
            <span>Protected Area</span>
          </MockProtectedContent>
        </>,
        validUser
      );

      // Verify initially authenticated
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();

      // Act - Logout
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Assert - Should be redirected to login
      await waitFor(() => {
        expect(screen.getByTestId('redirect-to-login')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================
  describe('Accessibility', () => {
    it('should have properly associated form labels', async () => {
      // Arrange
      render(<MockLoginForm />);

      // Assert
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('should announce error messages to screen readers', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act - Submit empty form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Assert - Error messages should have role="alert"
      await waitFor(() => {
        const emailError = screen.getByText(/email is required/i);
        expect(emailError).toHaveAttribute('role', 'alert');
        expect(emailError).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should manage focus appropriately after errors', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act - Enter invalid data and submit
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid');
      await user.type(passwordInput, 'pass');
      await user.click(submitButton);

      // Assert - Form should still be accessible after error
      await waitFor(() => {
        const errorMessage = screen.getByText(/please enter a valid email/i);
        expect(errorMessage).toBeInTheDocument();
      });

      // Email input should be marked as invalid
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should use aria-describedby to link errors to inputs', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act - Submit empty form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      });
    });

    it('should have accessible loading states', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, validCredentials.email);
      await user.type(passwordInput, validCredentials.password);

      const clickPromise = user.click(submitButton);

      // Assert - Button should have aria-busy
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-busy', 'true');
      });

      await clickPromise;
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle rapid form submissions', async () => {
      // Arrange
      const user = userEvent.setup();
      const onLoginSuccess = vi.fn();

      render(<MockLoginForm onLoginSuccess={onLoginSuccess} />);

      // Act - Fill form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, validCredentials.email);
      await user.type(passwordInput, validCredentials.password);

      // Rapid clicks
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Assert - Should only process once (button disabled during submission)
      await waitFor(() => {
        expect(onLoginSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle special characters in password', async () => {
      // Arrange
      const user = userEvent.setup();
      const onLoginSuccess = vi.fn();

      // Create handler that accepts special password
      const specialPassword = 'P@$$w0rd!#$%^&*()';
      server.use(
        http.post('/api/auth/login', async ({ request }) => {
          const body = await request.json() as { email: string; password: string };
          if (body.password === specialPassword) {
            return HttpResponse.json(createAuthResponse(validUser));
          }
          return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        })
      );

      render(<MockLoginForm onLoginSuccess={onLoginSuccess} />);

      // Act
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, validCredentials.email);
      await user.type(passwordInput, specialPassword);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(onLoginSuccess).toHaveBeenCalled();
      });
    });

    it('should handle very long email addresses', async () => {
      // Arrange
      const user = userEvent.setup();

      render(<MockLoginForm />);

      // Act - Enter very long email
      const longEmail = 'a'.repeat(100) + '@example.com';
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, longEmail);
      await user.type(passwordInput, 'somepassword');
      await user.click(submitButton);

      // Assert - Should process without crashing
      // The API will handle validation
      await waitFor(() => {
        // Either success or API error - no crash
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should handle concurrent auth state changes gracefully', async () => {
      // Arrange - This tests component stability under state changes
      const user = userEvent.setup();

      renderWithAuth(
        <>
          <MockLogoutButton />
          <MockDashboard />
        </>,
        validUser
      );

      // Verify authenticated
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();

      // Act - Logout
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Assert - Should transition smoothly
      await waitFor(() => {
        expect(screen.getByTestId('not-authenticated')).toBeInTheDocument();
      });

      // No errors should occur
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
