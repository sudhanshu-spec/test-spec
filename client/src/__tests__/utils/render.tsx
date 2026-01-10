/**
 * @fileoverview Custom render function with provider wrappers for frontend tests
 * @module tests/utils/render
 *
 * This module provides a custom render function that wraps components with all
 * necessary providers (AuthProvider, CartProvider, MemoryRouter) for testing.
 * It simplifies test setup and ensures consistent provider hierarchy across
 * all component tests.
 *
 * The implementation follows patterns established in tests/lifecycle/server.test.js,
 * particularly the factory function approach (createMockServer, createMockListen).
 *
 * Features:
 * - Custom render function with all providers pre-configured
 * - Helper functions for common test scenarios (authenticated, with cart, with route)
 * - Re-exports all @testing-library/react utilities for convenient single-import usage
 * - TypeScript interfaces for type-safe render options
 *
 * @example
 * // Basic usage - replaces @testing-library/react's render
 * import { render, screen } from '../utils/render';
 * render(<MyComponent />);
 *
 * @example
 * // Render with authenticated user
 * import { renderWithAuth } from '../utils/render';
 * renderWithAuth(<Dashboard />, mockUser);
 *
 * @example
 * // Render with pre-populated cart
 * import { renderWithCart } from '../utils/render';
 * renderWithCart(<Checkout />, mockCartItems);
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../features/auth/AuthContext';
import { CartProvider, CartItem } from '../../features/cart/CartContext';
import { TestUser } from './testUtils';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Initial authentication state for testing.
 * @interface InitialAuthState
 */
export interface InitialAuthState {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** The authenticated user data, or null if not authenticated */
  user: TestUser | null;
  /** Optional JWT token for API requests */
  token?: string;
  /** Optional loading state */
  isLoading?: boolean;
}

/**
 * Initial cart state for testing.
 * @interface InitialCartState
 */
export interface InitialCartState {
  /** Array of items in the cart */
  items: CartItem[];
  /** Total price of all items (optional, will be calculated if not provided) */
  total?: number;
}

/**
 * Custom render options extending RTL's RenderOptions.
 * Provides additional configuration for provider setup.
 *
 * @interface CustomRenderOptions
 * @extends {Omit<RenderOptions, 'wrapper'>}
 *
 * @property {InitialAuthState} [initialAuthState] - Initial authentication state
 * @property {InitialCartState} [initialCartState] - Initial cart state
 * @property {string} [route] - Initial route path for MemoryRouter
 */
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial authentication state for AuthProvider */
  initialAuthState?: InitialAuthState;
  /** Initial cart state for CartProvider */
  initialCartState?: InitialCartState;
  /** Initial route path for testing with specific routes */
  route?: string;
}

/**
 * Props for the AllProviders wrapper component.
 * @interface AllProvidersProps
 */
interface AllProvidersProps {
  /** Child components to wrap with providers */
  children: ReactNode;
  /** Initial authentication state */
  initialAuthState?: InitialAuthState;
  /** Initial cart state */
  initialCartState?: InitialCartState;
  /** Initial route for MemoryRouter */
  route?: string;
}

// ============================================================================
// Provider Wrapper Component
// Following the createMockServer pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * AllProviders wrapper component that provides all necessary context providers
 * for testing React components.
 *
 * The provider hierarchy is:
 * 1. MemoryRouter (routing context)
 * 2. AuthProvider (authentication context)
 * 3. CartProvider (shopping cart context)
 *
 * This follows the pattern established in tests/lifecycle/server.test.js
 * where factory functions create properly configured mock objects.
 *
 * @param {AllProvidersProps} props - Component props
 * @param {ReactNode} props.children - Child components to wrap
 * @param {InitialAuthState} [props.initialAuthState] - Initial auth state
 * @param {InitialCartState} [props.initialCartState] - Initial cart state
 * @param {string} [props.route='/'] - Initial route path
 * @returns {React.ReactElement} Provider tree wrapping children
 *
 * @example
 * ```tsx
 * <AllProviders
 *   initialAuthState={{ isAuthenticated: true, user: mockUser }}
 *   initialCartState={{ items: mockItems }}
 *   route="/checkout"
 * >
 *   <Checkout />
 * </AllProviders>
 * ```
 */
export function AllProviders({
  children,
  initialAuthState,
  initialCartState,
  route = '/',
}: AllProvidersProps): React.ReactElement {
  // Transform InitialAuthState to match AuthProvider's expected initialState format
  const authInitialState = initialAuthState
    ? {
        isAuthenticated: initialAuthState.isAuthenticated,
        user: initialAuthState.user
          ? {
              id: initialAuthState.user.id,
              email: initialAuthState.user.email,
              name: initialAuthState.user.name,
              role: initialAuthState.user.role,
            }
          : null,
        token: initialAuthState.token ?? null,
        isLoading: initialAuthState.isLoading ?? false,
      }
    : undefined;

  // Transform InitialCartState to match CartProvider's expected initialState format
  const cartInitialState = initialCartState
    ? {
        items: initialCartState.items,
        total:
          initialCartState.total ??
          calculateCartTotal(initialCartState.items),
        itemCount: calculateItemCount(initialCartState.items),
      }
    : undefined;

  return (
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider initialState={authInitialState}>
        <CartProvider initialState={cartInitialState}>
          {children}
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

// ============================================================================
// Helper Functions
// Following createMockServer/createMockListen helper patterns
// ============================================================================

/**
 * Calculates the total price of all items in the cart.
 * Helper function for initializing cart state.
 *
 * @param {CartItem[]} items - Array of cart items
 * @returns {number} Total price rounded to 2 decimal places
 */
function calculateCartTotal(items: CartItem[]): number {
  const total = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  // Round to 2 decimal places to avoid floating point issues
  return Math.round(total * 100) / 100;
}

/**
 * Calculates the total count of items in the cart.
 * Helper function for initializing cart state.
 *
 * @param {CartItem[]} items - Array of cart items
 * @returns {number} Total count (sum of quantities)
 */
function calculateItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

// ============================================================================
// Custom Render Function
// ============================================================================

/**
 * Custom render function that wraps components with all necessary providers.
 * This is the primary export for use in test files.
 *
 * Replaces @testing-library/react's render function with one that includes:
 * - MemoryRouter for routing
 * - AuthProvider for authentication context
 * - CartProvider for shopping cart context
 *
 * @param {ReactElement} ui - The React element to render
 * @param {CustomRenderOptions} [options={}] - Render options including provider states
 * @returns {RenderResult} Testing Library render result
 *
 * @example
 * // Basic render with default provider states
 * const { getByText } = customRender(<MyComponent />);
 *
 * @example
 * // Render with authenticated user
 * customRender(<Dashboard />, {
 *   initialAuthState: {
 *     isAuthenticated: true,
 *     user: { id: '1', email: 'test@test.com', name: 'Test', password: 'pass', role: 'customer' }
 *   }
 * });
 *
 * @example
 * // Render with cart items
 * customRender(<Cart />, {
 *   initialCartState: {
 *     items: [{ id: '1', name: 'Burger', price: 9.99, quantity: 2 }]
 *   }
 * });
 *
 * @example
 * // Render at specific route
 * customRender(<Checkout />, { route: '/checkout' });
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const {
    initialAuthState,
    initialCartState,
    route,
    ...renderOptions
  } = options;

  /**
   * Wrapper function that provides all providers to the component under test.
   * This follows the pattern from RTL documentation for custom render functions.
   */
  function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return (
      <AllProviders
        initialAuthState={initialAuthState}
        initialCartState={initialCartState}
        route={route}
      >
        {children}
      </AllProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// ============================================================================
// Convenience Helper Functions
// These provide simplified APIs for common test scenarios
// ============================================================================

/**
 * Renders a component with an authenticated user state.
 * Convenience wrapper around customRender for authentication testing.
 *
 * @param {ReactElement} ui - The React element to render
 * @param {TestUser} [user] - Optional user data; if not provided, uses default authenticated state
 * @param {Omit<CustomRenderOptions, 'initialAuthState'>} [options={}] - Additional render options
 * @returns {RenderResult} Testing Library render result
 *
 * @example
 * // Render with default authenticated user
 * renderWithAuth(<Dashboard />);
 *
 * @example
 * // Render with specific user
 * const adminUser: TestUser = {
 *   id: 'admin-1',
 *   email: 'admin@test.com',
 *   password: 'AdminPass123!',
 *   name: 'Admin User',
 *   role: 'admin'
 * };
 * renderWithAuth(<AdminPanel />, adminUser);
 */
export function renderWithAuth(
  ui: ReactElement,
  user?: TestUser,
  options: Omit<CustomRenderOptions, 'initialAuthState'> = {}
): RenderResult {
  const defaultUser: TestUser = {
    id: 'test-user-001',
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'customer',
  };

  const userToUse = user ?? defaultUser;

  return customRender(ui, {
    ...options,
    initialAuthState: {
      isAuthenticated: true,
      user: userToUse,
      token: 'mock-jwt-token-for-testing',
      isLoading: false,
    },
  });
}

/**
 * Renders a component with pre-populated cart state.
 * Convenience wrapper around customRender for cart testing.
 *
 * @param {ReactElement} ui - The React element to render
 * @param {CartItem[]} [items=[]] - Optional cart items; defaults to empty cart
 * @param {Omit<CustomRenderOptions, 'initialCartState'>} [options={}] - Additional render options
 * @returns {RenderResult} Testing Library render result
 *
 * @example
 * // Render with empty cart
 * renderWithCart(<CartIcon />);
 *
 * @example
 * // Render with items in cart
 * const items: CartItem[] = [
 *   { id: '1', name: 'Classic Burger', price: 9.99, quantity: 2 },
 *   { id: '2', name: 'Fries', price: 3.99, quantity: 1 }
 * ];
 * renderWithCart(<Cart />, items);
 */
export function renderWithCart(
  ui: ReactElement,
  items: CartItem[] = [],
  options: Omit<CustomRenderOptions, 'initialCartState'> = {}
): RenderResult {
  return customRender(ui, {
    ...options,
    initialCartState: {
      items,
      total: calculateCartTotal(items),
    },
  });
}

/**
 * Renders a component at a specific route path.
 * Convenience wrapper around customRender for route-dependent testing.
 *
 * @param {ReactElement} ui - The React element to render
 * @param {string} route - The route path to render at
 * @param {Omit<CustomRenderOptions, 'route'>} [options={}] - Additional render options
 * @returns {RenderResult} Testing Library render result
 *
 * @example
 * // Render at checkout route
 * renderWithRoute(<App />, '/checkout');
 *
 * @example
 * // Render at menu route with authenticated user
 * renderWithRoute(<App />, '/menu', {
 *   initialAuthState: { isAuthenticated: true, user: mockUser }
 * });
 */
export function renderWithRoute(
  ui: ReactElement,
  route: string,
  options: Omit<CustomRenderOptions, 'route'> = {}
): RenderResult {
  return customRender(ui, {
    ...options,
    route,
  });
}

// ============================================================================
// Re-exports from @testing-library/react
// Allows test files to import everything from this single module
// ============================================================================

/**
 * Re-export customRender as the default 'render' function.
 * This allows test files to use our custom render as a drop-in replacement
 * for @testing-library/react's render function.
 *
 * @example
 * // Import render from our custom module
 * import { render, screen } from '../utils/render';
 *
 * // Use exactly like @testing-library/react's render
 * render(<MyComponent />);
 * expect(screen.getByText('Hello')).toBeInTheDocument();
 */
export { customRender as render };

/**
 * Re-export all commonly used utilities from @testing-library/react.
 * This provides a convenient single-import pattern for test files.
 */
export { screen, waitFor, fireEvent, cleanup };

/**
 * Re-export everything else from @testing-library/react.
 * This ensures any additional utilities are available without
 * needing a separate import from @testing-library/react.
 */
export * from '@testing-library/react';
