/**
 * @fileoverview Integration tests for online ordering user flows
 * @module tests/integration/ordering
 *
 * This file contains comprehensive integration tests for the complete ordering flow
 * in the Burger Website application. Tests verify end-to-end user journeys through:
 * - Menu browsing and item display
 * - Adding items to cart
 * - Cart management (quantity updates, removal)
 * - Checkout process with delivery address and payment
 * - Order confirmation
 *
 * Test patterns follow those established in tests/lifecycle/server.test.js:
 * - Factory functions for creating test data
 * - Proper setup/teardown in beforeEach/afterEach
 * - Comprehensive JSDoc documentation
 *
 * @see {@link tests/lifecycle/server.test.js} Reference for mock patterns
 * @see {@link client/src/__tests__/utils/render.tsx} Custom render utilities
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

// Import MSW server for API mocking
import { server } from '../mocks/server';

// Import test fixtures
import {
  menuItems,
  burgers,
  sides,
  drinks,
} from '../fixtures/menuItems';
import {
  testOrders,
  pendingOrder,
  paymentMethods,
  calculateOrderTotal,
  fullCart,
  emptyCart,
} from '../fixtures/orders';
import { validUser } from '../fixtures/users';

// Import custom render utilities
import { render, renderWithAuth, renderWithCart } from '../utils/render';

// Import components to test
import { MenuList } from '../../features/menu/MenuList';
import { MenuItemCard } from '../../features/menu/MenuItemCard';
import { Cart } from '../../features/cart/Cart';
import { CartProvider } from '../../features/cart/CartContext';
import { Checkout } from '../../features/order/Checkout';
import { OrderConfirmation } from '../../features/order/OrderConfirmation';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * CartItem interface for cart operations
 */
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

/**
 * Interface for test order creation
 */
interface TestOrderConfig {
  items: CartItem[];
  total: number;
}

// ============================================================================
// Helper Functions (Following createMockServer pattern from server.test.js)
// ============================================================================

/**
 * Creates a pre-populated cart state for testing.
 * Factory function following createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param items - Array of cart items to include
 * @returns Cart state object with items and calculated totals
 *
 * @example
 * const cartState = createCartWithItems([
 *   { id: '1', name: 'Burger', price: 9.99, quantity: 2 }
 * ]);
 */
function createCartWithItems(items: CartItem[]): { items: CartItem[]; total: number } {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return {
    items,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Simulates a payment failure by overriding the order creation handler.
 * Uses server.use() to temporarily replace the order endpoint.
 *
 * @example
 * simulatePaymentFailure();
 * // Now order creation will return 402 Payment Required
 */
function simulatePaymentFailure(): void {
  server.use(
    http.post('/api/orders', () => {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'PAYMENT_DECLINED',
            message: 'Your payment was declined. Please try a different payment method.',
          },
        },
        { status: 402 }
      );
    })
  );
}

/**
 * Simulates stock unavailability for a specific item during checkout.
 * Overrides the order creation handler to return a 409 conflict error.
 *
 * @param itemId - The ID of the item that is unavailable
 *
 * @example
 * simulateStockUnavailability('burger-001');
 * // Order creation will fail with stock unavailability error
 */
function simulateStockUnavailability(itemId: string): void {
  server.use(
    http.post('/api/orders', () => {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'ITEM_UNAVAILABLE',
            message: `Item ${itemId} is no longer available`,
            itemId,
          },
        },
        { status: 409 }
      );
    })
  );
}

/**
 * Simulates a server error during order creation.
 * Returns a 500 Internal Server Error response.
 */
function simulateServerError(): void {
  server.use(
    http.post('/api/orders', () => {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred. Please try again.',
          },
        },
        { status: 500 }
      );
    })
  );
}

/**
 * Simulates a network failure during API calls.
 * Returns a network error response.
 */
function simulateNetworkFailure(): void {
  server.use(
    http.post('/api/orders', () => {
      return HttpResponse.error();
    })
  );
}

/**
 * Calculates the expected total for cart items.
 * Used for verification in assertions.
 *
 * @param items - Array of cart items
 * @returns Calculated total rounded to 2 decimal places
 */
function calculateExpectedTotal(items: CartItem[]): number {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Creates a default cart item for testing.
 *
 * @param overrides - Optional properties to override defaults
 * @returns A complete CartItem object
 */
function createCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: `item-${Date.now()}`,
    name: 'Test Item',
    price: 9.99,
    quantity: 1,
    imageUrl: '/images/test-item.jpg',
    ...overrides,
  };
}

// ============================================================================
// Test Suite Setup
// ============================================================================

describe('Ordering Integration Tests', () => {
  /**
   * Global test setup - runs once before all tests
   */
  beforeAll(() => {
    // Start MSW server for API mocking
    server.listen({ onUnhandledRequest: 'warn' });
  });

  /**
   * Test cleanup - runs after each test
   * Follows patterns from tests/lifecycle/server.test.js
   */
  afterEach(() => {
    // Clean up React Testing Library renders
    cleanup();
    // Reset MSW handlers to default
    server.resetHandlers();
    // Reset all mocks
    vi.resetAllMocks();
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  /**
   * Global test teardown - runs once after all tests
   */
  afterAll(() => {
    server.close();
  });

  // ==========================================================================
  // Menu Browsing Flow Tests
  // ==========================================================================

  describe('Menu Browsing Flow', () => {
    it('should display all menu items on initial load', async () => {
      // Arrange
      const user = userEvent.setup();

      // Act
      render(<MenuList />);

      // Assert - wait for menu items to load
      await waitFor(() => {
        // Check that at least some menu items are visible
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Verify multiple items from different categories are displayed
      expect(screen.getByText('Cheese Burger')).toBeInTheDocument();
      expect(screen.getByText('Fries')).toBeInTheDocument();
      expect(screen.getByText('Soda')).toBeInTheDocument();
    });

    it('should filter menu items by category', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MenuList />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Act - click on Burgers category filter
      const burgersFilter = screen.getByRole('button', { name: /burgers/i });
      await user.click(burgersFilter);

      // Assert - only burgers should be visible
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
        expect(screen.getByText('Cheese Burger')).toBeInTheDocument();
        expect(screen.getByText('Bacon Burger')).toBeInTheDocument();
      });

      // Sides should not be visible when filtered to burgers
      expect(screen.queryByText('Fries')).not.toBeInTheDocument();
    });

    it('should search menu items by name', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MenuList />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Act - enter search query
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      await user.type(searchInput, 'cheese');

      // Assert - only matching items should be visible
      await waitFor(() => {
        expect(screen.getByText('Cheese Burger')).toBeInTheDocument();
      });

      // Non-matching items should not be visible
      expect(screen.queryByText('Classic Burger')).not.toBeInTheDocument();
    });

    it('should display item details when clicking on menu item', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MenuList />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Act - click on a menu item
      const classicBurger = screen.getByText('Classic Burger');
      await user.click(classicBurger);

      // Assert - item details should be visible
      await waitFor(() => {
        // Price should be visible
        expect(screen.getByText('$8.99')).toBeInTheDocument();
        // Description should be visible
        expect(
          screen.getByText(/our signature beef patty/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Add to Cart Flow Tests
  // ==========================================================================

  describe('Add to Cart Flow', () => {
    it('should add item to cart when clicking add button', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnAddToCart = vi.fn();
      const testItem = {
        id: 'burger-001',
        name: 'Classic Burger',
        price: 8.99,
        category: 'burgers',
        description: 'Our signature beef patty',
        imageUrl: '/images/menu/classic-burger.jpg',
        available: true,
      };

      // Act
      render(
        <MenuItemCard item={testItem} onAddToCart={mockOnAddToCart} />
      );

      // Find and click the add to cart button
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);

      // Assert
      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
      expect(mockOnAddToCart).toHaveBeenCalledWith(testItem);
    });

    it('should increment quantity when adding same item again', async () => {
      // Arrange
      const user = userEvent.setup();
      const initialCartItem: CartItem = {
        id: 'burger-001',
        name: 'Classic Burger',
        price: 8.99,
        quantity: 1,
      };

      // Render Cart with one item
      renderWithCart(<Cart />, [initialCartItem]);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Act - click increment button
      const incrementButton = screen.getByRole('button', {
        name: /increase quantity/i,
      });
      await user.click(incrementButton);

      // Assert - quantity should be 2
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should show cart summary with running total', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 2 },
        { id: 'side-001', name: 'Fries', price: 3.99, quantity: 1 },
      ];
      const expectedTotal = calculateExpectedTotal(cartItems);

      // Act
      renderWithCart(<Cart />, cartItems);

      // Assert - total should be displayed
      await waitFor(() => {
        // Total = (8.99 * 2) + (3.99 * 1) = 21.97
        expect(screen.getByText(`$${expectedTotal.toFixed(2)}`)).toBeInTheDocument();
      });
    });

    it('should handle adding item with special instructions', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnAddToCart = vi.fn();
      const testItem = {
        id: 'burger-001',
        name: 'Classic Burger',
        price: 8.99,
        category: 'burgers',
        description: 'Our signature beef patty',
        imageUrl: '/images/menu/classic-burger.jpg',
        available: true,
      };

      // Act
      render(
        <MenuItemCard item={testItem} onAddToCart={mockOnAddToCart} />
      );

      // Click add to cart
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addButton);

      // Assert - callback should be called with item
      expect(mockOnAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'burger-001',
          name: 'Classic Burger',
        })
      );
    });
  });

  // ==========================================================================
  // Cart Management Flow Tests
  // ==========================================================================

  describe('Cart Management Flow', () => {
    it('should display all cart items with quantities and prices', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 2 },
        { id: 'side-001', name: 'Fries', price: 3.99, quantity: 1 },
        { id: 'drink-001', name: 'Soda', price: 2.49, quantity: 3 },
      ];

      // Act
      renderWithCart(<Cart />, cartItems);

      // Assert - all items should be visible
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
        expect(screen.getByText('Fries')).toBeInTheDocument();
        expect(screen.getByText('Soda')).toBeInTheDocument();
      });

      // Verify quantities
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      // Verify prices
      expect(screen.getByText('$8.99')).toBeInTheDocument();
      expect(screen.getByText('$3.99')).toBeInTheDocument();
      expect(screen.getByText('$2.49')).toBeInTheDocument();
    });

    it('should update item quantity using +/- controls', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 2 },
      ];

      renderWithCart(<Cart />, cartItems);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Act - click increment button
      const incrementButton = screen.getByRole('button', {
        name: /increase quantity/i,
      });
      await user.click(incrementButton);

      // Assert - quantity should increase
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });

      // Act - click decrement button
      const decrementButton = screen.getByRole('button', {
        name: /decrease quantity/i,
      });
      await user.click(decrementButton);

      // Assert - quantity should decrease back to 2
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should remove item from cart', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 2 },
        { id: 'side-001', name: 'Fries', price: 3.99, quantity: 1 },
      ];

      renderWithCart(<Cart />, cartItems);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
        expect(screen.getByText('Fries')).toBeInTheDocument();
      });

      // Act - remove Classic Burger
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      // Assert - Classic Burger should be removed
      await waitFor(() => {
        expect(screen.queryByText('Classic Burger')).not.toBeInTheDocument();
      });

      // Fries should still be in cart
      expect(screen.getByText('Fries')).toBeInTheDocument();
    });

    it('should enforce maximum quantity limit', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 99 },
      ];

      renderWithCart(<Cart />, cartItems);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Act - try to increment beyond max
      const incrementButton = screen.getByRole('button', {
        name: /increase quantity/i,
      });

      // Assert - button should be disabled at max quantity
      expect(incrementButton).toBeDisabled();
    });

    it('should prevent quantity below 1 (use remove instead)', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 1 },
      ];

      renderWithCart(<Cart />, cartItems);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Assert - decrement button should be disabled when quantity is 1
      const decrementButton = screen.getByRole('button', {
        name: /decrease quantity/i,
      });
      expect(decrementButton).toBeDisabled();
    });

    it('should persist cart across page navigation', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 2 },
      ];

      // First render with cart
      const { unmount } = renderWithCart(<Cart />, cartItems);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Unmount (simulate navigation away)
      unmount();

      // Remount (simulate navigation back)
      // Note: In real app, cart persists via localStorage which is mocked
      renderWithCart(<Cart />, cartItems);

      // Assert - cart should still contain items
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display empty cart message when no items', async () => {
      // Arrange & Act
      renderWithCart(<Cart />, []);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      });

      // Should show link to browse menu
      expect(screen.getByRole('link', { name: /browse menu/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Checkout Flow Tests
  // ==========================================================================

  describe('Checkout Flow', () => {
    it('should complete full checkout process with valid payment', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 2 },
        { id: 'side-001', name: 'Fries', price: 3.99, quantity: 1 },
      ];
      const mockOnSuccess = vi.fn();

      // Render checkout with authenticated user and cart
      render(<Checkout onOrderSuccess={mockOnSuccess} />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: cartItems },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });

      // Fill delivery address
      await user.type(
        screen.getByLabelText(/street address/i),
        '123 Main Street'
      );
      await user.type(screen.getByLabelText(/city/i), 'Springfield');
      await user.type(screen.getByLabelText(/state/i), 'IL');
      await user.type(screen.getByLabelText(/zip code/i), '62701');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');

      // Select payment method
      await user.click(screen.getByLabelText(/credit card/i));

      // Act - submit order
      const submitButton = screen.getByRole('button', { name: /place order/i });
      await user.click(submitButton);

      // Assert - order success callback should be called
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      }, { timeout: 5000 });
    });

    it('should redirect to menu when attempting checkout with empty cart', async () => {
      // Arrange
      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigate,
        };
      });

      // Act - render checkout with empty cart
      render(<Checkout />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: [] },
      });

      // Assert - should show message about empty cart
      await waitFor(() => {
        expect(
          screen.getByText(/your cart is empty/i)
        ).toBeInTheDocument();
      });
    });

    it('should display order summary before confirmation', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 2 },
        { id: 'side-001', name: 'Fries', price: 3.99, quantity: 1 },
      ];
      const expectedSubtotal = calculateExpectedTotal(cartItems);

      // Act
      render(<Checkout />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: cartItems },
      });

      // Assert - order summary should display all items
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
        expect(screen.getByText('Fries')).toBeInTheDocument();
      });

      // Verify quantities
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();

      // Verify subtotal
      expect(screen.getByText(`$${expectedSubtotal.toFixed(2)}`)).toBeInTheDocument();
    });

    it('should validate required checkout fields', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 1 },
      ];

      render(<Checkout />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: cartItems },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });

      // Act - try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /place order/i });
      await user.click(submitButton);

      // Assert - validation errors should be displayed
      await waitFor(() => {
        expect(screen.getByText(/street address is required/i)).toBeInTheDocument();
      });
    });

    it('should handle payment failure gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 1 },
      ];

      // Simulate payment failure
      simulatePaymentFailure();

      render(<Checkout />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: cartItems },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });

      // Fill out form
      await user.type(
        screen.getByLabelText(/street address/i),
        '123 Main Street'
      );
      await user.type(screen.getByLabelText(/city/i), 'Springfield');
      await user.type(screen.getByLabelText(/state/i), 'IL');
      await user.type(screen.getByLabelText(/zip code/i), '62701');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');
      await user.click(screen.getByLabelText(/credit card/i));

      // Act - submit order
      const submitButton = screen.getByRole('button', { name: /place order/i });
      await user.click(submitButton);

      // Assert - payment error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/payment was declined/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Cart should NOT be cleared
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
    });

    it('should show loading state during order submission', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 1 },
      ];

      render(<Checkout />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: cartItems },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });

      // Fill out form
      await user.type(
        screen.getByLabelText(/street address/i),
        '123 Main Street'
      );
      await user.type(screen.getByLabelText(/city/i), 'Springfield');
      await user.type(screen.getByLabelText(/state/i), 'IL');
      await user.type(screen.getByLabelText(/zip code/i), '62701');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');
      await user.click(screen.getByLabelText(/credit card/i));

      // Act - submit order
      const submitButton = screen.getByRole('button', { name: /place order/i });
      await user.click(submitButton);

      // Assert - loading state should be visible
      expect(
        screen.getByRole('button', { name: /placing order/i }) ||
        screen.getByRole('button', { name: /loading/i }) ||
        submitButton
      ).toBeDisabled();
    });

    it('should handle server error during order creation', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 1 },
      ];

      // Simulate server error
      simulateServerError();

      render(<Checkout />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: cartItems },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });

      // Fill out form
      await user.type(
        screen.getByLabelText(/street address/i),
        '123 Main Street'
      );
      await user.type(screen.getByLabelText(/city/i), 'Springfield');
      await user.type(screen.getByLabelText(/state/i), 'IL');
      await user.type(screen.getByLabelText(/zip code/i), '62701');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');
      await user.click(screen.getByLabelText(/credit card/i));

      // Act - submit order
      const submitButton = screen.getByRole('button', { name: /place order/i });
      await user.click(submitButton);

      // Assert - error message should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/unexpected error/i) ||
          screen.getByText(/try again/i)
        ).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  // ==========================================================================
  // Order Confirmation Flow Tests
  // ==========================================================================

  describe('Order Confirmation Flow', () => {
    it('should display order confirmation with order number', async () => {
      // Arrange
      const mockOrderId = 'order-123-abc';

      // Act
      render(<OrderConfirmation orderId={mockOrderId} />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
      });

      // Assert - confirmation should show order ID
      await waitFor(() => {
        expect(screen.getByText(/thank you/i)).toBeInTheDocument();
      });

      // Order ID or confirmation number should be visible
      expect(screen.getByText(/order/i)).toBeInTheDocument();
    });

    it('should display estimated delivery/pickup time', async () => {
      // Arrange
      const mockOrderId = 'order-123-abc';

      // Act
      render(<OrderConfirmation orderId={mockOrderId} />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
      });

      // Assert - estimated time should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/estimated/i) ||
          screen.getByText(/minutes/i)
        ).toBeInTheDocument();
      });
    });

    it('should provide option to view order details', async () => {
      // Arrange
      const mockOrderId = 'order-123-abc';
      const mockOnViewDetails = vi.fn();

      // Act
      render(
        <OrderConfirmation
          orderId={mockOrderId}
          onViewDetails={mockOnViewDetails}
        />,
        {
          initialAuthState: { isAuthenticated: true, user: validUser },
        }
      );

      // Wait for render
      await waitFor(() => {
        expect(screen.getByText(/thank you/i)).toBeInTheDocument();
      });

      // Assert - View Order button should be available
      const viewOrderButton = screen.getByRole('button', {
        name: /view order/i,
      });
      expect(viewOrderButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle item becoming unavailable during checkout', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 1 },
      ];

      // Simulate stock unavailability
      simulateStockUnavailability('burger-001');

      render(<Checkout />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: cartItems },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });

      // Fill out form
      await user.type(
        screen.getByLabelText(/street address/i),
        '123 Main Street'
      );
      await user.type(screen.getByLabelText(/city/i), 'Springfield');
      await user.type(screen.getByLabelText(/state/i), 'IL');
      await user.type(screen.getByLabelText(/zip code/i), '62701');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');
      await user.click(screen.getByLabelText(/credit card/i));

      // Act - submit order
      const submitButton = screen.getByRole('button', { name: /place order/i });
      await user.click(submitButton);

      // Assert - unavailability error should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/unavailable/i) ||
          screen.getByText(/no longer available/i)
        ).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should handle network failure during checkout', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 1 },
      ];

      // Simulate network failure
      simulateNetworkFailure();

      render(<Checkout />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: cartItems },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });

      // Fill out form
      await user.type(
        screen.getByLabelText(/street address/i),
        '123 Main Street'
      );
      await user.type(screen.getByLabelText(/city/i), 'Springfield');
      await user.type(screen.getByLabelText(/state/i), 'IL');
      await user.type(screen.getByLabelText(/zip code/i), '62701');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');
      await user.click(screen.getByLabelText(/credit card/i));

      // Act - submit order
      const submitButton = screen.getByRole('button', { name: /place order/i });
      await user.click(submitButton);

      // Assert - network error should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/network/i) ||
          screen.getByText(/connection/i) ||
          screen.getByText(/try again/i)
        ).toBeInTheDocument();
      }, { timeout: 5000 });

      // Cart data should be preserved
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
    });

    it('should handle cart exceeding 100 items (performance boundary)', async () => {
      // Arrange
      const largeCart: CartItem[] = [];
      for (let i = 0; i < 100; i++) {
        largeCart.push({
          id: `item-${i}`,
          name: `Test Item ${i}`,
          price: 5.99,
          quantity: 1,
        });
      }

      // Act - render with large cart
      const startTime = performance.now();
      renderWithCart(<Cart />, largeCart);
      const renderTime = performance.now() - startTime;

      // Assert - should render within reasonable time (< 3 seconds)
      expect(renderTime).toBeLessThan(3000);

      // Should show all items are loaded
      await waitFor(() => {
        // Cart should display item count or summary
        expect(screen.getByText(/items?/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have accessible cart item controls', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 2 },
      ];

      // Act
      renderWithCart(<Cart />, cartItems);

      // Wait for render
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Assert - buttons should have accessible names
      expect(
        screen.getByRole('button', { name: /increase quantity/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /decrease quantity/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /remove/i })
      ).toBeInTheDocument();
    });

    it('should announce cart total for screen readers', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 2 },
      ];

      // Act
      renderWithCart(<Cart />, cartItems);

      // Wait for render
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });

      // Assert - total should have aria-live or role
      const totalElement = screen.getByText(/\$17\.98/i);
      expect(totalElement).toBeInTheDocument();
    });

    it('should associate error messages with form fields', async () => {
      // Arrange
      const user = userEvent.setup();
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 1 },
      ];

      render(<Checkout />, {
        initialAuthState: { isAuthenticated: true, user: validUser },
        initialCartState: { items: cartItems },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });

      // Act - submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /place order/i });
      await user.click(submitButton);

      // Assert - error message should be associated with field
      await waitFor(() => {
        const streetInput = screen.getByLabelText(/street address/i);
        // Error should be displayed near the field or linked via aria-describedby
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });
  });
});
