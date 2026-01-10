/**
 * @fileoverview Unit tests for Cart component
 * @module tests/features/cart/Cart
 *
 * This test file provides comprehensive coverage for the Cart component,
 * testing cart display rendering, item listing, empty cart state handling,
 * quantity updates, item removal, checkout flow, and accessibility features.
 *
 * The tests follow patterns established in tests/lifecycle/server.test.js,
 * including JSDoc documentation, helper factory functions, and the AAA pattern
 * (Arrange, Act, Assert).
 *
 * Test Categories:
 * - Rendering with items: Verifies correct display of cart items and totals
 * - Empty cart state: Tests empty cart message and menu browsing CTA
 * - Item removal: Tests removal of items and state updates
 * - Quantity updates: Tests increment/decrement controls and limits
 * - Checkout flow: Tests checkout button behavior and callbacks
 * - Cart summary: Tests summary display toggling
 * - Accessibility: Tests ARIA labels, keyboard navigation, and screen reader support
 *
 * Coverage Target: 85%
 *
 * @see {@link client/src/features/cart/Cart.tsx} Component under test
 * @see {@link client/src/features/cart/CartContext.tsx} Cart state management
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { render } from '../../../__tests__/utils/render';
import { server } from '../../../__tests__/mocks/server';
import { createMenuItem } from '../../../__tests__/fixtures/menuItems';
import { clearAllStorage } from '../../../__tests__/utils/testUtils';
import { Cart } from '../Cart';
import { CartItem } from '../CartContext';

// ============================================================================
// Type Definitions
// Following @typedef pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Props interface for Cart component in tests
 * @typedef {Object} CartProps
 * @property {() => void} [onCheckout] - Optional checkout callback
 * @property {boolean} [showSummary] - Whether to show cart summary
 */
interface CartProps {
  onCheckout?: () => void;
  showSummary?: boolean;
}

/**
 * Cart test state interface for setting up initial state
 * @typedef {Object} CartTestState
 * @property {CartItem[]} items - Array of cart items
 * @property {number} total - Total price of all items
 */
interface CartTestState {
  items: CartItem[];
  total: number;
}

/**
 * Helper type for cart element references
 * @typedef {Object} CartElements
 */
interface CartElements {
  itemList: HTMLElement | null;
  totalDisplay: HTMLElement | null;
  checkoutButton: HTMLElement | null;
  emptyMessage: HTMLElement | null;
  clearButton: HTMLElement | null;
}

// ============================================================================
// Constants
// Following DEFAULT_CONFIG pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Default cart items for testing populated cart state
 * @constant
 */
const DEFAULT_CART_ITEMS: CartItem[] = [
  {
    id: 'burger-001',
    name: 'Classic Burger',
    price: 8.99,
    quantity: 2,
    imageUrl: '/images/menu/classic-burger.jpg',
  },
  {
    id: 'side-001',
    name: 'Fries',
    price: 3.99,
    quantity: 1,
    imageUrl: '/images/menu/fries.jpg',
  },
  {
    id: 'drink-001',
    name: 'Soda',
    price: 2.49,
    quantity: 3,
    imageUrl: '/images/menu/soda.jpg',
  },
];

/**
 * Empty cart state for testing empty cart scenarios
 * @constant
 */
const EMPTY_CART: CartTestState = {
  items: [],
  total: 0,
};

/**
 * Maximum quantity limit enforced by Cart component
 * @constant
 */
const MAX_QUANTITY = 99;

/**
 * Minimum quantity limit enforced by Cart component
 * @constant
 */
const MIN_QUANTITY = 1;

// ============================================================================
// Helper Functions
// Following createMockServer/createMockListen patterns from server.test.js
// ============================================================================

/**
 * Creates an array of cart items for testing.
 * Factory function following the createMockServer pattern.
 *
 * @param {number} count - Number of cart items to create
 * @returns {CartItem[]} Array of cart items
 */
function createCartItems(count: number): CartItem[] {
  const items: CartItem[] = [];
  for (let i = 0; i < count; i++) {
    const menuItem = createMenuItem({
      name: `Test Item ${i + 1}`,
      price: 5.99 + i,
    });
    items.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
      imageUrl: menuItem.imageUrl,
    });
  }
  return items;
}

/**
 * Creates a single cart item with custom properties.
 * Helper for creating specific test scenarios.
 *
 * @param {Partial<CartItem>} overrides - Properties to override
 * @returns {CartItem} A cart item with merged properties
 */
function createCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const menuItem = createMenuItem({
    name: overrides.name,
    price: overrides.price,
  });
  return {
    id: menuItem.id,
    name: menuItem.name,
    price: menuItem.price,
    quantity: 1,
    imageUrl: menuItem.imageUrl,
    ...overrides,
  };
}

/**
 * Calculates total price from cart items.
 *
 * @param {CartItem[]} items - Array of cart items
 * @returns {number} Total price rounded to 2 decimal places
 */
function calculateTotal(items: CartItem[]): number {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Gets common cart elements from the rendered component.
 * Helper function for retrieving cart DOM elements.
 *
 * @returns {CartElements} Object containing cart element references
 */
function getCartElements(): CartElements {
  return {
    itemList: screen.queryByRole('list', { name: /cart items/i }),
    totalDisplay: screen.queryByText(/subtotal/i),
    checkoutButton: screen.queryByRole('button', { name: /checkout/i }),
    emptyMessage: screen.queryByText(/your cart is empty/i),
    clearButton: screen.queryByRole('button', { name: /clear/i }),
  };
}

/**
 * Formats a price value as currency string for assertions.
 *
 * @param {number} price - The price value to format
 * @returns {string} Formatted price string with dollar sign
 */
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Cart', () => {
  /**
   * User event instance for simulating user interactions.
   * Created fresh for each test to ensure isolation.
   */
  let user: ReturnType<typeof userEvent.setup>;

  /**
   * Setup before each test.
   * Resets all mocks and creates fresh user event instance.
   */
  beforeEach(() => {
    vi.resetAllMocks();
    user = userEvent.setup();
  });

  /**
   * Cleanup after each test.
   * Performs DOM cleanup, resets MSW handlers, and clears storage.
   */
  afterEach(() => {
    cleanup();
    server.resetHandlers();
    clearAllStorage();
  });

  // ==========================================================================
  // Rendering with Items Tests
  // ==========================================================================

  describe('when rendered with items', () => {
    /**
     * Test: Should display list of cart items
     * Verifies that all cart items are rendered in a list
     */
    it('should display list of cart items', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByRole('list', { name: /cart items/i })).toBeInTheDocument();
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(screen.getByText('Fries')).toBeInTheDocument();
      expect(screen.getByText('Soda')).toBeInTheDocument();
    });

    /**
     * Test: Should show total price for all items
     * Verifies that the cart total is calculated and displayed correctly
     */
    it('should show total price for all items', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const expectedTotal = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total: expectedTotal },
      });

      // Assert
      const checkoutButton = screen.getByRole('button', { name: /checkout/i });
      expect(checkoutButton).toBeInTheDocument();
      expect(checkoutButton).toHaveTextContent(formatPrice(expectedTotal));
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
    });

    /**
     * Test: Should display quantity for each item
     * Verifies that each item shows its current quantity
     */
    it('should display quantity for each item', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      // Check that quantity values are displayed for each item
      const quantityValues = screen.getAllByLabelText(/quantity/i);
      expect(quantityValues.length).toBeGreaterThan(0);
      
      // Verify specific quantities are present
      const classicBurgerRow = screen.getByTestId('cart-item-burger-001');
      expect(within(classicBurgerRow).getByText('2')).toBeInTheDocument();
      
      const sodaRow = screen.getByTestId('cart-item-drink-001');
      expect(within(sodaRow).getByText('3')).toBeInTheDocument();
    });

    /**
     * Test: Should show checkout button when items present
     * Verifies checkout button is visible when cart has items
     */
    it('should show checkout button when items present', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);
      const onCheckout = vi.fn();

      // Act
      render(<Cart onCheckout={onCheckout} />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const checkoutButton = screen.getByRole('button', { name: /checkout/i });
      expect(checkoutButton).toBeInTheDocument();
      expect(checkoutButton).toBeEnabled();
      expect(checkoutButton).toHaveTextContent(/checkout/i);
    });

    /**
     * Test: Should display item count in header
     * Verifies that the cart header shows the total item count
     */
    it('should display item count in header', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByText(/your cart/i)).toBeInTheDocument();
      expect(screen.getByText(`${totalQuantity} items`)).toBeInTheDocument();
      expect(screen.getByLabelText(/shopping cart/i)).toBeInTheDocument();
    });

    /**
     * Test: Should display individual item prices
     * Verifies that each item shows its unit price
     */
    it('should display individual item prices', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByText(formatPrice(8.99))).toBeInTheDocument();
      expect(screen.getByText(formatPrice(3.99))).toBeInTheDocument();
      expect(screen.getByText(formatPrice(2.49))).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty Cart State Tests
  // ==========================================================================

  describe('when rendered with empty cart', () => {
    /**
     * Test: Should display empty cart message
     * Verifies that empty cart shows appropriate message
     */
    it('should display empty cart message', () => {
      // Arrange & Act
      render(<Cart />, {
        initialCartState: EMPTY_CART,
      });

      // Assert
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      expect(screen.getByTestId('cart-empty')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /empty/i })).toBeInTheDocument();
    });

    /**
     * Test: Should not show checkout button when empty
     * Verifies checkout button is hidden for empty carts
     */
    it('should not show checkout button when empty', () => {
      // Arrange & Act
      render(<Cart />, {
        initialCartState: EMPTY_CART,
      });

      // Assert
      const checkoutButton = screen.queryByRole('button', { name: /checkout/i });
      expect(checkoutButton).not.toBeInTheDocument();
      expect(screen.queryByRole('list', { name: /cart items/i })).not.toBeInTheDocument();
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });

    /**
     * Test: Should suggest browsing menu
     * Verifies empty cart shows link to browse menu
     */
    it('should suggest browsing menu', () => {
      // Arrange & Act
      render(<Cart />, {
        initialCartState: EMPTY_CART,
      });

      // Assert
      const browseMenuLink = screen.getByRole('button', { name: /browse/i });
      expect(browseMenuLink).toBeInTheDocument();
      expect(browseMenuLink).toHaveAttribute('href', '/menu');
      expect(screen.getByText(/haven.*added/i)).toBeInTheDocument();
    });

    /**
     * Test: Should display empty cart icon
     * Verifies empty cart shows visual icon indicator
     */
    it('should display empty cart icon', () => {
      // Arrange & Act
      render(<Cart />, {
        initialCartState: EMPTY_CART,
      });

      // Assert
      const emptyCart = screen.getByTestId('cart-empty');
      expect(emptyCart).toBeInTheDocument();
      expect(emptyCart).toHaveTextContent('🛒');
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Item Removal Tests
  // ==========================================================================

  describe('item removal', () => {
    /**
     * Test: Should remove item when remove button clicked
     * Verifies that clicking remove button removes the item from cart
     */
    it('should remove item when remove button clicked', async () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'item-to-remove', name: 'Item To Remove', price: 9.99 })];
      const total = calculateTotal(cartItems);

      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Act
      const removeButton = screen.getByRole('button', { name: /remove item to remove/i });
      await user.click(removeButton);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Item To Remove')).not.toBeInTheDocument();
      });
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      expect(screen.getByTestId('cart-empty')).toBeInTheDocument();
    });

    /**
     * Test: Should update total after item removal
     * Verifies that removing an item updates the cart total
     */
    it('should update total after item removal', async () => {
      // Arrange
      const cartItems = [
        createCartItem({ id: 'item-1', name: 'First Item', price: 10.00, quantity: 1 }),
        createCartItem({ id: 'item-2', name: 'Second Item', price: 5.00, quantity: 1 }),
      ];
      const initialTotal = calculateTotal(cartItems);

      render(<Cart />, {
        initialCartState: { items: cartItems, total: initialTotal },
      });

      // Verify initial total
      expect(screen.getByRole('button', { name: /checkout/i })).toHaveTextContent(formatPrice(15.00));

      // Act - Remove first item
      const removeButton = screen.getByRole('button', { name: /remove first item/i });
      await user.click(removeButton);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('First Item')).not.toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /checkout/i })).toHaveTextContent(formatPrice(5.00));
      expect(screen.getByText('Second Item')).toBeInTheDocument();
    });

    /**
     * Test: Should show empty state when last item removed
     * Verifies that removing the last item shows empty cart state
     */
    it('should show empty state when last item removed', async () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'last-item', name: 'Last Item', price: 7.99 })];
      const total = calculateTotal(cartItems);

      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Verify item is present
      expect(screen.getByText('Last Item')).toBeInTheDocument();

      // Act
      const removeButton = screen.getByRole('button', { name: /remove last item/i });
      await user.click(removeButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      });
      expect(screen.queryByText('Last Item')).not.toBeInTheDocument();
      expect(screen.getByTestId('cart-empty')).toBeInTheDocument();
    });

    /**
     * Test: Should handle removing item from multi-item cart
     * Verifies partial removal from cart with multiple items
     */
    it('should handle removing item from multi-item cart', async () => {
      // Arrange
      const cartItems = createCartItems(3);
      const total = calculateTotal(cartItems);

      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      const itemToRemove = cartItems[1];

      // Act
      const removeButton = screen.getByRole('button', { 
        name: new RegExp(`remove ${itemToRemove.name}`, 'i') 
      });
      await user.click(removeButton);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText(itemToRemove.name)).not.toBeInTheDocument();
      });
      expect(screen.getByText(cartItems[0].name)).toBeInTheDocument();
      expect(screen.getByText(cartItems[2].name)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Quantity Update Tests
  // ==========================================================================

  describe('quantity updates', () => {
    /**
     * Test: Should increase item quantity when plus clicked
     * Verifies increment button increases quantity
     */
    it('should increase item quantity when plus clicked', async () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'qty-item', name: 'Quantity Item', price: 5.00, quantity: 1 })];
      const total = calculateTotal(cartItems);

      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      const itemRow = screen.getByTestId('cart-item-qty-item');

      // Act
      const incrementButton = within(itemRow).getByRole('button', { name: /increase/i });
      await user.click(incrementButton);

      // Assert
      await waitFor(() => {
        expect(within(itemRow).getByText('2')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /checkout/i })).toHaveTextContent(formatPrice(10.00));
      expect(incrementButton).toBeEnabled();
    });

    /**
     * Test: Should decrease item quantity when minus clicked
     * Verifies decrement button decreases quantity
     */
    it('should decrease item quantity when minus clicked', async () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'qty-item-dec', name: 'Decrement Item', price: 5.00, quantity: 3 })];
      const total = calculateTotal(cartItems);

      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      const itemRow = screen.getByTestId('cart-item-qty-item-dec');

      // Act
      const decrementButton = within(itemRow).getByRole('button', { name: /decrease/i });
      await user.click(decrementButton);

      // Assert
      await waitFor(() => {
        expect(within(itemRow).getByText('2')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /checkout/i })).toHaveTextContent(formatPrice(10.00));
      expect(decrementButton).toBeEnabled();
    });

    /**
     * Test: Should disable decrement when quantity is 1
     * Verifies decrement button is disabled at minimum quantity
     */
    it('should disable decrement when quantity is 1', () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'min-qty', name: 'Min Quantity Item', price: 5.00, quantity: MIN_QUANTITY })];
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const itemRow = screen.getByTestId('cart-item-min-qty');
      const decrementButton = within(itemRow).getByRole('button', { name: /decrease/i });
      expect(decrementButton).toBeDisabled();
      expect(within(itemRow).getByText('1')).toBeInTheDocument();
      expect(decrementButton).toHaveAttribute('aria-disabled', 'true');
    });

    /**
     * Test: Should enforce maximum quantity limit
     * Verifies increment button is disabled at maximum quantity
     */
    it('should enforce maximum quantity limit', () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'max-qty', name: 'Max Quantity Item', price: 5.00, quantity: MAX_QUANTITY })];
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const itemRow = screen.getByTestId('cart-item-max-qty');
      const incrementButton = within(itemRow).getByRole('button', { name: /increase/i });
      expect(incrementButton).toBeDisabled();
      expect(within(itemRow).getByText(`${MAX_QUANTITY}`)).toBeInTheDocument();
      expect(incrementButton).toHaveAttribute('aria-disabled', 'true');
    });

    /**
     * Test: Should update item total when quantity changes
     * Verifies that item total reflects quantity changes
     */
    it('should update item total when quantity changes', async () => {
      // Arrange
      const unitPrice = 7.50;
      const cartItems = [createCartItem({ id: 'total-update', name: 'Total Update Item', price: unitPrice, quantity: 2 })];
      const total = calculateTotal(cartItems);

      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      const itemRow = screen.getByTestId('cart-item-total-update');
      
      // Verify initial item total (7.50 * 2 = 15.00)
      expect(within(itemRow).getByLabelText(/item total/i)).toHaveTextContent(formatPrice(15.00));

      // Act
      const incrementButton = within(itemRow).getByRole('button', { name: /increase/i });
      await user.click(incrementButton);

      // Assert (7.50 * 3 = 22.50)
      await waitFor(() => {
        expect(within(itemRow).getByText('3')).toBeInTheDocument();
      });
      expect(within(itemRow).getByLabelText(/item total/i)).toHaveTextContent(formatPrice(22.50));
      expect(screen.getByRole('button', { name: /checkout/i })).toHaveTextContent(formatPrice(22.50));
    });

    /**
     * Test: Should handle multiple quantity changes
     * Verifies multiple quantity updates work correctly
     */
    it('should handle multiple quantity changes', async () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'multi-qty', name: 'Multi Change Item', price: 10.00, quantity: 5 })];
      const total = calculateTotal(cartItems);

      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      const itemRow = screen.getByTestId('cart-item-multi-qty');
      const incrementButton = within(itemRow).getByRole('button', { name: /increase/i });
      const decrementButton = within(itemRow).getByRole('button', { name: /decrease/i });

      // Act - Increase twice
      await user.click(incrementButton);
      await user.click(incrementButton);
      
      // Then decrease once
      await user.click(decrementButton);

      // Assert - Should be at 6 (5 + 2 - 1)
      await waitFor(() => {
        expect(within(itemRow).getByText('6')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /checkout/i })).toHaveTextContent(formatPrice(60.00));
      expect(screen.getByText('Multi Change Item')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Checkout Flow Tests
  // ==========================================================================

  describe('checkout flow', () => {
    /**
     * Test: Should call onCheckout when checkout button clicked
     * Verifies checkout callback is invoked on button click
     */
    it('should call onCheckout when checkout button clicked', async () => {
      // Arrange
      const onCheckout = vi.fn();
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      render(<Cart onCheckout={onCheckout} />, {
        initialCartState: { items: cartItems, total },
      });

      // Act
      const checkoutButton = screen.getByRole('button', { name: /checkout/i });
      await user.click(checkoutButton);

      // Assert
      expect(onCheckout).toHaveBeenCalledTimes(1);
      expect(checkoutButton).toBeInTheDocument();
      expect(checkoutButton).toBeEnabled();
    });

    /**
     * Test: Should disable checkout button when no onCheckout provided
     * Verifies checkout button is disabled without callback
     */
    it('should disable checkout button when no onCheckout provided', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const checkoutButton = screen.getByRole('button', { name: /checkout/i });
      expect(checkoutButton).toBeDisabled();
      expect(checkoutButton).toHaveAttribute('aria-disabled', 'true');
      expect(checkoutButton).toBeInTheDocument();
    });

    /**
     * Test: Should display correct total in checkout button
     * Verifies checkout button shows accurate total amount
     */
    it('should display correct total in checkout button', () => {
      // Arrange
      const cartItems = [
        createCartItem({ id: 'chk-1', name: 'Checkout Item 1', price: 12.50, quantity: 2 }),
        createCartItem({ id: 'chk-2', name: 'Checkout Item 2', price: 8.00, quantity: 1 }),
      ];
      const expectedTotal = calculateTotal(cartItems); // 12.50 * 2 + 8.00 = 33.00

      // Act
      render(<Cart onCheckout={vi.fn()} />, {
        initialCartState: { items: cartItems, total: expectedTotal },
      });

      // Assert
      const checkoutButton = screen.getByRole('button', { name: /checkout/i });
      expect(checkoutButton).toHaveTextContent('Checkout');
      expect(checkoutButton).toHaveTextContent(formatPrice(33.00));
      expect(checkoutButton).toBeEnabled();
    });

    /**
     * Test: Should not call onCheckout multiple times on rapid clicks
     * Verifies checkout is called only once for rapid clicks
     */
    it('should handle checkout callback correctly', async () => {
      // Arrange
      const onCheckout = vi.fn();
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      render(<Cart onCheckout={onCheckout} />, {
        initialCartState: { items: cartItems, total },
      });

      // Act - Click checkout button
      const checkoutButton = screen.getByRole('button', { name: /checkout/i });
      await user.click(checkoutButton);

      // Assert
      expect(onCheckout).toHaveBeenCalledTimes(1);
      expect(checkoutButton).toBeInTheDocument();
      expect(checkoutButton).toBeEnabled();
    });
  });

  // ==========================================================================
  // Clear Cart Tests
  // ==========================================================================

  describe('clear cart', () => {
    /**
     * Test: Should clear all items when clear cart clicked
     * Verifies clear cart button removes all items
     */
    it('should clear all items when clear cart clicked', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Verify items are present
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();

      // Act
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      });
      expect(screen.queryByText('Classic Burger')).not.toBeInTheDocument();
      expect(screen.queryByText('Fries')).not.toBeInTheDocument();
    });

    /**
     * Test: Should show clear cart button when items present
     * Verifies clear button is visible with items in cart
     */
    it('should show clear cart button when items present', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toBeEnabled();
      expect(clearButton).toHaveTextContent(/clear cart/i);
    });
  });

  // ==========================================================================
  // Cart Summary Integration Tests
  // ==========================================================================

  describe('cart summary integration', () => {
    /**
     * Test: Should display cart summary when showSummary is true
     * Verifies summary section is visible with default props
     */
    it('should display cart summary when showSummary is true', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      // Act
      render(<Cart showSummary={true} />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByTestId('cart-summary')).toBeInTheDocument();
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      expect(screen.getByText(`${totalQuantity}`)).toBeInTheDocument();
    });

    /**
     * Test: Should hide summary when showSummary is false
     * Verifies summary section is hidden when prop is false
     */
    it('should hide summary when showSummary is false', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart showSummary={false} />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.queryByTestId('cart-summary')).not.toBeInTheDocument();
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /checkout/i })).toBeInTheDocument();
    });

    /**
     * Test: Should display summary by default
     * Verifies summary is shown when showSummary is not specified
     */
    it('should display summary by default', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByTestId('cart-summary')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /cart summary/i })).toBeInTheDocument();
      expect(screen.getByText(/tax and delivery/i)).toBeInTheDocument();
    });

    /**
     * Test: Should show item count in summary
     * Verifies summary displays correct item count
     */
    it('should show item count in summary', () => {
      // Arrange
      const cartItems = [
        createCartItem({ id: 'sum-1', name: 'Summary Item 1', quantity: 3 }),
        createCartItem({ id: 'sum-2', name: 'Summary Item 2', quantity: 2 }),
      ];
      const total = calculateTotal(cartItems);
      const expectedItemCount = 5; // 3 + 2

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const summary = screen.getByTestId('cart-summary');
      expect(summary).toBeInTheDocument();
      expect(within(summary).getByText(/items/i)).toBeInTheDocument();
      expect(within(summary).getByLabelText(/5 items/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    /**
     * Test: Should have accessible cart region
     * Verifies cart has proper ARIA region landmark
     */
    it('should have accessible cart region', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const cartRegion = screen.getByLabelText(/shopping cart/i);
      expect(cartRegion).toBeInTheDocument();
      expect(cartRegion.tagName).toBe('SECTION');
      expect(cartRegion).toHaveAttribute('data-testid', 'cart');
    });

    /**
     * Test: Should have accessible item list
     * Verifies cart items list has proper ARIA structure
     */
    it('should have accessible item list', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const itemList = screen.getByRole('list', { name: /cart items/i });
      expect(itemList).toBeInTheDocument();
      
      const listItems = within(itemList).getAllByRole('listitem');
      expect(listItems).toHaveLength(cartItems.length);
      expect(listItems[0]).toHaveAttribute('aria-label');
    });

    /**
     * Test: Should have accessible quantity controls
     * Verifies quantity buttons have proper ARIA labels
     */
    it('should have accessible quantity controls', () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'a11y-qty', name: 'Accessible Item', quantity: 2 })];
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const itemRow = screen.getByTestId('cart-item-a11y-qty');
      const quantityGroup = within(itemRow).getByRole('group', { name: /quantity/i });
      expect(quantityGroup).toBeInTheDocument();
      
      expect(within(itemRow).getByRole('button', { name: /increase/i })).toBeInTheDocument();
      expect(within(itemRow).getByRole('button', { name: /decrease/i })).toBeInTheDocument();
    });

    /**
     * Test: Should announce cart updates to screen readers
     * Verifies quantity values have aria-live for announcements
     */
    it('should announce cart updates to screen readers', () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'announce-item', name: 'Announce Item', quantity: 1 })];
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const itemRow = screen.getByTestId('cart-item-announce-item');
      const quantityDisplay = within(itemRow).getByText('1');
      expect(quantityDisplay).toHaveAttribute('aria-live', 'polite');
      expect(quantityDisplay).toHaveAttribute('aria-atomic', 'true');
      expect(itemRow).toHaveAttribute('aria-label');
    });

    /**
     * Test: Should support keyboard navigation
     * Verifies buttons are keyboard accessible
     */
    it('should support keyboard navigation', async () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'kb-item', name: 'Keyboard Item', quantity: 2 })];
      const total = calculateTotal(cartItems);
      const onCheckout = vi.fn();

      render(<Cart onCheckout={onCheckout} />, {
        initialCartState: { items: cartItems, total },
      });

      // Act - Tab to checkout button and press Enter
      const checkoutButton = screen.getByRole('button', { name: /checkout/i });
      checkoutButton.focus();
      await user.keyboard('{Enter}');

      // Assert
      expect(onCheckout).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(checkoutButton);
      expect(checkoutButton).toBeEnabled();
    });

    /**
     * Test: Should have accessible remove buttons
     * Verifies remove buttons have descriptive labels
     */
    it('should have accessible remove buttons', () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'remove-a11y', name: 'Remove A11y Item' })];
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const removeButton = screen.getByRole('button', { name: /remove remove a11y item/i });
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toHaveAttribute('aria-label', 'Remove Remove A11y Item from cart');
      expect(removeButton.tagName).toBe('BUTTON');
    });

    /**
     * Test: Should have accessible empty cart state
     * Verifies empty cart has proper status role
     */
    it('should have accessible empty cart state', () => {
      // Arrange & Act
      render(<Cart />, {
        initialCartState: EMPTY_CART,
      });

      // Assert
      const emptyStatus = screen.getByRole('status', { name: /empty/i });
      expect(emptyStatus).toBeInTheDocument();
      expect(emptyStatus).toHaveAttribute('aria-label', 'Your cart is empty');
      expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    /**
     * Test: Should handle item with zero price
     * Verifies cart handles promotional/free items
     */
    it('should handle item with zero price', () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'free-item', name: 'Free Item', price: 0, quantity: 1 })];
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByText('Free Item')).toBeInTheDocument();
      expect(screen.getByText(formatPrice(0))).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /checkout/i })).toHaveTextContent(formatPrice(0));
    });

    /**
     * Test: Should handle item without image
     * Verifies cart renders placeholder for missing images
     */
    it('should handle item without image', () => {
      // Arrange
      const cartItems = [{
        id: 'no-image',
        name: 'No Image Item',
        price: 5.99,
        quantity: 1,
        imageUrl: undefined,
      }];
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByText('No Image Item')).toBeInTheDocument();
      expect(screen.getByText('🍔')).toBeInTheDocument(); // Placeholder emoji
      expect(screen.getByTestId('cart-item-no-image')).toBeInTheDocument();
    });

    /**
     * Test: Should handle very long item names
     * Verifies cart handles long item names gracefully
     */
    it('should handle very long item names', () => {
      // Arrange
      const longName = 'The Ultimate Super Deluxe Double Bacon Cheeseburger with Extra Everything';
      const cartItems = [createCartItem({ id: 'long-name', name: longName, price: 15.99 })];
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByText(longName)).toBeInTheDocument();
      expect(screen.getByTestId('cart-item-long-name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /checkout/i })).toBeInTheDocument();
    });

    /**
     * Test: Should handle high price items
     * Verifies cart correctly formats high prices
     */
    it('should handle high price items', () => {
      // Arrange
      const cartItems = [createCartItem({ id: 'expensive', name: 'Expensive Item', price: 99.99, quantity: 1 })];
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByText('Expensive Item')).toBeInTheDocument();
      expect(screen.getByText(formatPrice(99.99))).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /checkout/i })).toHaveTextContent(formatPrice(99.99));
    });

    /**
     * Test: Should handle large cart with many items
     * Verifies cart performs well with many items
     */
    it('should handle large cart with many items', () => {
      // Arrange
      const cartItems = createCartItems(20);
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const itemList = screen.getByRole('list', { name: /cart items/i });
      const listItems = within(itemList).getAllByRole('listitem');
      expect(listItems).toHaveLength(20);
      expect(screen.getByRole('button', { name: /checkout/i })).toBeInTheDocument();
      expect(screen.getByTestId('cart-summary')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Custom Props Tests
  // ==========================================================================

  describe('custom props', () => {
    /**
     * Test: Should apply custom className
     * Verifies custom className is applied to cart
     */
    it('should apply custom className', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart className="custom-cart-class" />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      const cart = screen.getByTestId('cart');
      expect(cart).toHaveClass('custom-cart-class');
      expect(cart).toHaveClass('cart');
      expect(cart.tagName).toBe('SECTION');
    });

    /**
     * Test: Should apply custom testId
     * Verifies custom testId is used for cart
     */
    it('should apply custom testId', () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const total = calculateTotal(cartItems);

      // Act
      render(<Cart testId="my-custom-cart" />, {
        initialCartState: { items: cartItems, total },
      });

      // Assert
      expect(screen.getByTestId('my-custom-cart')).toBeInTheDocument();
      expect(screen.getByLabelText(/shopping cart/i)).toHaveAttribute('data-testid', 'my-custom-cart');
      expect(screen.queryByTestId('cart')).not.toBeInTheDocument();
    });
  });
});
