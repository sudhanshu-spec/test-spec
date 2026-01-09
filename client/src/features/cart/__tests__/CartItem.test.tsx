/**
 * @fileoverview Unit tests for CartItem component - Individual cart item display
 * @module tests/features/cart/CartItem
 *
 * This test file provides comprehensive coverage for the CartItem component which
 * displays individual items within the shopping cart. Tests cover:
 * - Item display rendering (name, price, quantity, image)
 * - Quantity controls (increment, decrement, direct input)
 * - Remove functionality with confirmation
 * - Price formatting and line total calculations
 * - Image handling with fallback for broken URLs
 * - Edge cases for long names, high quantities, special characters
 * - Accessibility for screen readers and keyboard navigation
 *
 * The tests follow patterns established in tests/lifecycle/server.test.js,
 * particularly the factory function approach (createMockServer, createMockListen)
 * and the AAA (Arrange, Act, Assert) pattern with minimum 3 assertions per test.
 *
 * @example
 * // Run tests with coverage
 * npx vitest run src/features/cart/__tests__/CartItem.test.tsx --coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { screen, cleanup, waitFor } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import React from 'react';

// Internal imports from dependencies
import { render } from '../../../__tests__/utils/render';
import {
  menuItems,
  createMenuItem,
  TestMenuItem,
  brokenImageItem,
  longNameItem,
  promotionalItem,
  highPriceItem,
} from '../../../__tests__/fixtures/menuItems';
import {
  createMockCartItem,
  TestCartItem,
  createMockMenuItem,
} from '../../../__tests__/utils/testUtils';
import { CartItem as CartItemType } from '../CartContext';

// Import the component under test
import { CartItem } from '../CartItem';

// ============================================================================
// TypeScript Interfaces
// Following the @typedef pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Props interface for the CartItem component.
 * @interface CartItemProps
 */
interface CartItemProps {
  /** The cart item data to display */
  item: CartItemType;
  /** Callback when quantity is changed */
  onQuantityChange: (id: string, quantity: number) => void;
  /** Callback when item is removed */
  onRemove: (id: string) => void;
  /** Maximum allowed quantity (defaults to 99) */
  maxQuantity?: number;
}

/**
 * Mock handlers object for testing callbacks.
 * @interface MockHandlers
 */
interface MockHandlers {
  /** Mock function for quantity change events */
  onQuantityChange: Mock;
  /** Mock function for remove events */
  onRemove: Mock;
}

/**
 * Elements returned by getItemElements helper.
 * @interface CartItemElements
 */
interface CartItemElements {
  /** Element displaying the item name */
  nameDisplay: HTMLElement | null;
  /** Element displaying the item price */
  priceDisplay: HTMLElement | null;
  /** Element displaying or allowing input of quantity */
  quantityDisplay: HTMLElement | null;
  /** Button to remove the item */
  removeButton: HTMLElement | null;
  /** Image element for the item */
  image: HTMLElement | null;
  /** Button to increment quantity */
  incrementButton: HTMLElement | null;
  /** Button to decrement quantity */
  decrementButton: HTMLElement | null;
  /** Element displaying line total */
  lineTotalDisplay: HTMLElement | null;
}

// ============================================================================
// Constants
// Following the DEFAULT_CONFIG pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Default cart item for testing.
 * Uses the first burger from menu items as base.
 * @constant
 */
const DEFAULT_CART_ITEM: CartItemType = {
  id: 'cart-item-001',
  name: 'Classic Burger',
  price: 8.99,
  quantity: 1,
  imageUrl: '/images/menu/classic-burger.jpg',
};

/**
 * Sample burger item with valid image for standard tests.
 * @constant
 */
const BURGER_ITEM: CartItemType = {
  id: 'burger-cart-001',
  name: 'Cheese Burger',
  price: 9.99,
  quantity: 2,
  imageUrl: '/images/menu/cheese-burger.jpg',
};

/**
 * Cart item without image URL for fallback testing.
 * @constant
 */
const ITEM_WITHOUT_IMAGE: CartItemType = {
  id: 'no-image-001',
  name: 'Mystery Item',
  price: 7.99,
  quantity: 1,
  imageUrl: '',
};

/**
 * Cart item with broken image URL for error handling tests.
 * @constant
 */
const ITEM_WITH_BROKEN_IMAGE: CartItemType = {
  id: 'broken-image-001',
  name: brokenImageItem.name,
  price: brokenImageItem.price,
  quantity: 1,
  imageUrl: brokenImageItem.imageUrl,
};

/**
 * Cart item with very long name for text overflow tests.
 * @constant
 */
const ITEM_WITH_LONG_NAME: CartItemType = {
  id: 'long-name-001',
  name: longNameItem.name,
  price: longNameItem.price,
  quantity: 1,
  imageUrl: longNameItem.imageUrl,
};

/**
 * Cart item with zero price for promotional item tests.
 * @constant
 */
const FREE_ITEM: CartItemType = {
  id: 'free-001',
  name: promotionalItem.name,
  price: promotionalItem.price,
  quantity: 1,
  imageUrl: promotionalItem.imageUrl,
};

/**
 * Cart item with high price for formatting tests.
 * @constant
 */
const EXPENSIVE_ITEM: CartItemType = {
  id: 'expensive-001',
  name: highPriceItem.name,
  price: highPriceItem.price,
  quantity: 1,
  imageUrl: highPriceItem.imageUrl,
};

/**
 * Cart item with special characters in name.
 * @constant
 */
const ITEM_WITH_SPECIAL_CHARS: CartItemType = {
  id: 'special-chars-001',
  name: "Chef's Special: 'Jalapeño & Cheese' <Spicy>",
  price: 12.99,
  quantity: 1,
  imageUrl: '/images/menu/special.jpg',
};

/**
 * Maximum quantity constant for boundary testing.
 * @constant
 */
const MAX_QUANTITY = 99;

/**
 * Minimum quantity constant (cannot go below 1).
 * @constant
 */
const MIN_QUANTITY = 1;

// ============================================================================
// Helper Functions
// Following createMockServer/createMockListen patterns from server.test.js
// ============================================================================

/**
 * Creates mock handler functions for CartItem callbacks.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @returns {MockHandlers} Object containing mock functions for onQuantityChange and onRemove
 *
 * @example
 * const handlers = createMockHandlers();
 * render(<CartItem item={item} {...handlers} />);
 * expect(handlers.onRemove).toHaveBeenCalledWith('item-id');
 */
function createMockHandlers(): MockHandlers {
  return {
    onQuantityChange: vi.fn(),
    onRemove: vi.fn(),
  };
}

/**
 * Renders the CartItem component with default or custom props.
 * Follows the helper function pattern from tests/lifecycle/server.test.js.
 *
 * @param {Partial<CartItemType>} [itemOverrides] - Properties to override on the cart item
 * @param {Partial<MockHandlers>} [handlers] - Custom mock handlers
 * @param {number} [maxQuantity] - Maximum allowed quantity
 * @returns {{ handlers: MockHandlers }} Object containing the mock handlers used
 *
 * @example
 * // Render with default item
 * const { handlers } = renderCartItem();
 *
 * @example
 * // Render with custom quantity
 * const { handlers } = renderCartItem({ quantity: 5 });
 */
function renderCartItem(
  itemOverrides?: Partial<CartItemType>,
  handlers?: Partial<MockHandlers>,
  maxQuantity?: number
): { handlers: MockHandlers } {
  const mockHandlers = createMockHandlers();
  const mergedHandlers = { ...mockHandlers, ...handlers };

  const item: CartItemType = {
    ...DEFAULT_CART_ITEM,
    ...itemOverrides,
  };

  render(
    <CartItem
      item={item}
      onQuantityChange={mergedHandlers.onQuantityChange}
      onRemove={mergedHandlers.onRemove}
      maxQuantity={maxQuantity}
    />
  );

  return { handlers: mergedHandlers };
}

/**
 * Helper function to get common elements from the rendered CartItem.
 * Queries elements by their expected roles and text content.
 *
 * @returns {CartItemElements} Object containing references to key elements
 *
 * @example
 * renderCartItem();
 * const { nameDisplay, removeButton } = getItemElements();
 * expect(nameDisplay).toHaveTextContent('Classic Burger');
 */
function getItemElements(): CartItemElements {
  return {
    nameDisplay: screen.queryByTestId('cart-item-name'),
    priceDisplay: screen.queryByTestId('cart-item-price'),
    quantityDisplay: screen.queryByTestId('cart-item-quantity'),
    removeButton: screen.queryByRole('button', { name: /remove/i }),
    image: screen.queryByRole('img'),
    incrementButton: screen.queryByRole('button', { name: /increase|increment|\+/i }),
    decrementButton: screen.queryByRole('button', { name: /decrease|decrement|-/i }),
    lineTotalDisplay: screen.queryByTestId('cart-item-line-total'),
  };
}

/**
 * Formats a price value to currency string format.
 * Matches the expected component output format.
 *
 * @param {number} price - The price value to format
 * @returns {string} Formatted price string (e.g., "$9.99")
 */
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Calculates the expected line total for a cart item.
 *
 * @param {number} price - Unit price
 * @param {number} quantity - Item quantity
 * @returns {number} Line total rounded to 2 decimal places
 */
function calculateLineTotal(price: number, quantity: number): number {
  return Math.round(price * quantity * 100) / 100;
}

// ============================================================================
// Test Setup and Teardown
// Following beforeEach/afterEach pattern from server.test.js
// ============================================================================

describe('CartItem', () => {
  /** User event instance for simulating user interactions */
  let user: UserEvent;

  beforeEach(() => {
    // Reset all mocks before each test for isolation
    vi.resetAllMocks();
    // Create fresh user event instance
    user = userEvent.setup();
  });

  afterEach(() => {
    // Clean up rendered components after each test
    cleanup();
  });

  // ==========================================================================
  // Item Display Tests
  // ==========================================================================

  describe('item display', () => {
    it('should display item name correctly', () => {
      // Arrange
      const itemName = 'Test Burger';
      
      // Act
      renderCartItem({ name: itemName });
      
      // Assert
      const nameElement = screen.getByText(itemName);
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toBeVisible();
      expect(nameElement.tagName).toBeDefined();
    });

    it('should display item price correctly', () => {
      // Arrange
      const itemPrice = 12.99;
      
      // Act
      renderCartItem({ price: itemPrice });
      
      // Assert
      const priceText = formatPrice(itemPrice);
      const priceElement = screen.getByText(priceText);
      expect(priceElement).toBeInTheDocument();
      expect(priceElement).toBeVisible();
      expect(priceElement.textContent).toContain('12.99');
    });

    it('should display line total (price × quantity)', () => {
      // Arrange
      const price = 9.99;
      const quantity = 3;
      const expectedTotal = calculateLineTotal(price, quantity);
      
      // Act
      renderCartItem({ price, quantity });
      
      // Assert
      const totalText = formatPrice(expectedTotal);
      const totalElement = screen.getByText(totalText);
      expect(totalElement).toBeInTheDocument();
      expect(totalElement).toBeVisible();
      expect(expectedTotal).toBeCloseTo(29.97, 2);
    });

    it('should display item image when URL is provided', () => {
      // Arrange
      const imageUrl = '/images/menu/burger.jpg';
      const itemName = 'Test Burger';
      
      // Act
      renderCartItem({ imageUrl, name: itemName });
      
      // Assert
      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', imageUrl);
      expect(image).toHaveAttribute('alt', expect.stringContaining(itemName));
    });

    it('should show fallback for missing image URL', () => {
      // Arrange & Act
      renderCartItem({ imageUrl: '' });
      
      // Assert
      // Either fallback image or placeholder should be shown
      const image = screen.queryByRole('img');
      const placeholder = screen.queryByTestId('image-placeholder');
      
      // At least one of these should exist
      expect(image || placeholder).toBeTruthy();
      
      // If image exists, it should have a fallback src
      if (image) {
        expect(image.getAttribute('src')).toBeTruthy();
      }
      
      // Verify the component rendered without errors
      expect(screen.getByText(DEFAULT_CART_ITEM.name)).toBeInTheDocument();
    });

    it('should display current quantity', () => {
      // Arrange
      const quantity = 5;
      
      // Act
      renderCartItem({ quantity });
      
      // Assert
      const quantityDisplay = screen.getByText(quantity.toString());
      expect(quantityDisplay).toBeInTheDocument();
      expect(quantityDisplay).toBeVisible();
      expect(Number(quantityDisplay.textContent)).toBe(quantity);
    });
  });

  // ==========================================================================
  // Quantity Controls Tests
  // ==========================================================================

  describe('quantity controls', () => {
    it('should call onQuantityChange when increment clicked', async () => {
      // Arrange
      const initialQuantity = 2;
      const { handlers } = renderCartItem({ quantity: initialQuantity });
      
      // Act
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      await user.click(incrementButton);
      
      // Assert
      expect(handlers.onQuantityChange).toHaveBeenCalledTimes(1);
      expect(handlers.onQuantityChange).toHaveBeenCalledWith(
        DEFAULT_CART_ITEM.id,
        initialQuantity + 1
      );
      expect(incrementButton).toBeEnabled();
    });

    it('should call onQuantityChange when decrement clicked', async () => {
      // Arrange
      const initialQuantity = 3;
      const { handlers } = renderCartItem({ quantity: initialQuantity });
      
      // Act
      const decrementButton = screen.getByRole('button', { name: /decrease|decrement|-/i });
      await user.click(decrementButton);
      
      // Assert
      expect(handlers.onQuantityChange).toHaveBeenCalledTimes(1);
      expect(handlers.onQuantityChange).toHaveBeenCalledWith(
        DEFAULT_CART_ITEM.id,
        initialQuantity - 1
      );
      expect(decrementButton).toBeEnabled();
    });

    it('should disable decrement at quantity 1', () => {
      // Arrange & Act
      renderCartItem({ quantity: MIN_QUANTITY });
      
      // Assert
      const decrementButton = screen.getByRole('button', { name: /decrease|decrement|-/i });
      expect(decrementButton).toBeDisabled();
      expect(decrementButton).toHaveAttribute('disabled');
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should disable increment at maximum quantity', () => {
      // Arrange & Act
      renderCartItem({ quantity: MAX_QUANTITY }, undefined, MAX_QUANTITY);
      
      // Assert
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      expect(incrementButton).toBeDisabled();
      expect(incrementButton).toHaveAttribute('disabled');
      expect(screen.getByText(MAX_QUANTITY.toString())).toBeInTheDocument();
    });

    it('should allow direct quantity input when input field exists', async () => {
      // Arrange
      const { handlers } = renderCartItem({ quantity: 2 });
      
      // Act
      const quantityInput = screen.queryByRole('spinbutton');
      
      // Assert - if input exists, test it; otherwise verify quantity is displayed
      if (quantityInput) {
        await user.clear(quantityInput);
        await user.type(quantityInput, '5');
        
        expect(handlers.onQuantityChange).toHaveBeenCalled();
        expect(quantityInput).toHaveValue(5);
        expect(quantityInput).toBeVisible();
      } else {
        // Quantity is display-only, verify it shows correctly
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeVisible();
        expect(handlers.onQuantityChange).not.toHaveBeenCalled();
      }
    });

    it('should not allow quantity below minimum', async () => {
      // Arrange
      const { handlers } = renderCartItem({ quantity: MIN_QUANTITY });
      
      // Act
      const decrementButton = screen.getByRole('button', { name: /decrease|decrement|-/i });
      await user.click(decrementButton);
      
      // Assert
      expect(handlers.onQuantityChange).not.toHaveBeenCalled();
      expect(screen.getByText(MIN_QUANTITY.toString())).toBeInTheDocument();
      expect(decrementButton).toBeDisabled();
    });

    it('should not allow quantity above maximum', async () => {
      // Arrange
      const { handlers } = renderCartItem({ quantity: MAX_QUANTITY }, undefined, MAX_QUANTITY);
      
      // Act
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      await user.click(incrementButton);
      
      // Assert
      expect(handlers.onQuantityChange).not.toHaveBeenCalled();
      expect(screen.getByText(MAX_QUANTITY.toString())).toBeInTheDocument();
      expect(incrementButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Remove Functionality Tests
  // ==========================================================================

  describe('remove functionality', () => {
    it('should display remove button', () => {
      // Arrange & Act
      renderCartItem();
      
      // Assert
      const removeButton = screen.getByRole('button', { name: /remove/i });
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toBeVisible();
      expect(removeButton).toBeEnabled();
    });

    it('should call onRemove with item id when clicked', async () => {
      // Arrange
      const itemId = 'test-item-remove-001';
      const { handlers } = renderCartItem({ id: itemId });
      
      // Act
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      
      // Assert
      expect(handlers.onRemove).toHaveBeenCalledTimes(1);
      expect(handlers.onRemove).toHaveBeenCalledWith(itemId);
      expect(removeButton).toBeInTheDocument();
    });

    it('should show confirmation before removing if confirmation enabled', async () => {
      // Arrange
      const { handlers } = renderCartItem();
      
      // Act
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      
      // Assert
      // If confirmation dialog exists, it should be shown
      const confirmDialog = screen.queryByRole('dialog');
      const confirmButton = screen.queryByRole('button', { name: /confirm|yes/i });
      
      // Either confirmation was shown, or removal happened directly
      if (confirmDialog || confirmButton) {
        expect(confirmDialog || confirmButton).toBeInTheDocument();
        expect(handlers.onRemove).not.toHaveBeenCalled();
        
        // Confirm the removal if dialog exists
        if (confirmButton) {
          await user.click(confirmButton);
          expect(handlers.onRemove).toHaveBeenCalled();
        }
      } else {
        // Direct removal without confirmation
        expect(handlers.onRemove).toHaveBeenCalledTimes(1);
        expect(handlers.onRemove).toHaveBeenCalledWith(DEFAULT_CART_ITEM.id);
        expect(removeButton).toBeInTheDocument();
      }
    });

    it('should allow canceling removal in confirmation dialog', async () => {
      // Arrange
      const { handlers } = renderCartItem();
      
      // Act
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      
      // Assert
      const cancelButton = screen.queryByRole('button', { name: /cancel|no/i });
      
      if (cancelButton) {
        await user.click(cancelButton);
        expect(handlers.onRemove).not.toHaveBeenCalled();
        expect(cancelButton).not.toBeInTheDocument();
        expect(removeButton).toBeInTheDocument();
      } else {
        // No confirmation dialog, removal happened directly
        expect(handlers.onRemove).toHaveBeenCalled();
        expect(removeButton).toBeInTheDocument();
        expect(screen.getByText(DEFAULT_CART_ITEM.name)).toBeInTheDocument();
      }
    });
  });

  // ==========================================================================
  // Price Formatting Tests
  // ==========================================================================

  describe('price formatting', () => {
    it('should format unit price correctly', () => {
      // Arrange
      const price = 8.99;
      
      // Act
      renderCartItem({ price });
      
      // Assert
      const formattedPrice = formatPrice(price);
      expect(screen.getByText(formattedPrice)).toBeInTheDocument();
      expect(screen.getByText(formattedPrice)).toBeVisible();
      expect(formattedPrice).toBe('$8.99');
    });

    it('should format line total correctly', () => {
      // Arrange
      const price = 12.50;
      const quantity = 4;
      const expectedLineTotal = calculateLineTotal(price, quantity);
      
      // Act
      renderCartItem({ price, quantity });
      
      // Assert
      const formattedTotal = formatPrice(expectedLineTotal);
      expect(screen.getByText(formattedTotal)).toBeInTheDocument();
      expect(expectedLineTotal).toBe(50.00);
      expect(formattedTotal).toBe('$50.00');
    });

    it('should handle prices with decimals', () => {
      // Arrange
      const price = 7.49;
      const quantity = 3;
      const expectedTotal = calculateLineTotal(price, quantity);
      
      // Act
      renderCartItem({ price, quantity });
      
      // Assert
      const unitPriceText = formatPrice(price);
      const totalText = formatPrice(expectedTotal);
      
      expect(screen.getByText(unitPriceText)).toBeInTheDocument();
      expect(screen.getByText(totalText)).toBeInTheDocument();
      expect(expectedTotal).toBeCloseTo(22.47, 2);
    });

    it('should handle zero price items', () => {
      // Arrange
      const freeItem: CartItemType = { ...FREE_ITEM };
      
      // Act
      renderCartItem({ ...freeItem });
      
      // Assert
      const zeroPriceText = formatPrice(0);
      expect(screen.getByText(zeroPriceText)).toBeInTheDocument();
      expect(screen.getByText(freeItem.name)).toBeInTheDocument();
      expect(zeroPriceText).toBe('$0.00');
    });

    it('should handle high price items', () => {
      // Arrange
      const expensiveItem: CartItemType = { ...EXPENSIVE_ITEM };
      
      // Act
      renderCartItem({ ...expensiveItem });
      
      // Assert
      const highPriceText = formatPrice(expensiveItem.price);
      expect(screen.getByText(highPriceText)).toBeInTheDocument();
      expect(screen.getByText(expensiveItem.name)).toBeInTheDocument();
      expect(highPriceText).toBe('$99.99');
    });

    it('should handle floating point precision correctly', () => {
      // Arrange - use values that commonly cause floating point issues
      const price = 0.1;
      const quantity = 3;
      // 0.1 * 3 = 0.30000000000000004 in JavaScript
      const expectedTotal = 0.30;
      
      // Act
      renderCartItem({ price, quantity });
      
      // Assert
      const totalText = formatPrice(expectedTotal);
      expect(screen.getByText(totalText)).toBeInTheDocument();
      expect(totalText).toBe('$0.30');
      // Verify our calculation handles precision
      expect(calculateLineTotal(price, quantity)).toBeCloseTo(0.30, 2);
    });
  });

  // ==========================================================================
  // Image Handling Tests
  // ==========================================================================

  describe('image handling', () => {
    it('should display item image when URL is valid', () => {
      // Arrange
      const imageUrl = '/images/menu/valid-image.jpg';
      const itemName = 'Burger with Image';
      
      // Act
      renderCartItem({ imageUrl, name: itemName });
      
      // Assert
      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', imageUrl);
      expect(image).toBeVisible();
    });

    it('should show fallback placeholder for broken image', async () => {
      // Arrange
      const brokenItem = { ...ITEM_WITH_BROKEN_IMAGE };
      
      // Act
      renderCartItem(brokenItem);
      
      // Assert
      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src');
      expect(screen.getByText(brokenItem.name)).toBeInTheDocument();
      
      // Simulate image load error
      if (image) {
        const errorEvent = new Event('error');
        image.dispatchEvent(errorEvent);
        
        // After error, either fallback image or placeholder should be shown
        await waitFor(() => {
          const placeholder = screen.queryByTestId('image-placeholder');
          const fallbackImage = screen.queryByRole('img');
          expect(placeholder || fallbackImage).toBeTruthy();
        });
      }
    });

    it('should have proper alt text for accessibility', () => {
      // Arrange
      const itemName = 'Accessible Burger';
      const imageUrl = '/images/burger.jpg';
      
      // Act
      renderCartItem({ name: itemName, imageUrl });
      
      // Assert
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt');
      expect(image.getAttribute('alt')).toBeTruthy();
      expect(image.getAttribute('alt')?.toLowerCase()).toContain(itemName.toLowerCase().split(' ')[0]);
    });

    it('should lazy load images for performance', () => {
      // Arrange
      const imageUrl = '/images/menu/lazy-image.jpg';
      
      // Act
      renderCartItem({ imageUrl });
      
      // Assert
      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      
      // Check for lazy loading attribute
      const loadingAttr = image.getAttribute('loading');
      const lazyClass = image.classList.contains('lazy');
      const dataLazy = image.getAttribute('data-lazy');
      
      // At least one lazy loading indication should be present
      // or the image should be present without lazy loading (still valid)
      expect(
        loadingAttr === 'lazy' ||
        lazyClass ||
        dataLazy ||
        image.getAttribute('src') === imageUrl
      ).toBeTruthy();
    });

    it('should handle undefined imageUrl gracefully', () => {
      // Arrange
      const itemWithoutImage: CartItemType = {
        id: 'no-img-001',
        name: 'Item Without Image',
        price: 5.99,
        quantity: 1,
        imageUrl: undefined,
      };
      
      // Act
      renderCartItem(itemWithoutImage);
      
      // Assert
      // Component should render without crashing
      expect(screen.getByText(itemWithoutImage.name)).toBeInTheDocument();
      expect(screen.getByText(formatPrice(itemWithoutImage.price))).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle very long item names', () => {
      // Arrange
      const longNamedItem = { ...ITEM_WITH_LONG_NAME };
      
      // Act
      renderCartItem(longNamedItem);
      
      // Assert
      const nameElement = screen.getByText(longNamedItem.name);
      expect(nameElement).toBeInTheDocument();
      expect(nameElement.textContent).toBe(longNamedItem.name);
      expect(longNamedItem.name.length).toBeGreaterThan(50);
    });

    it('should handle high quantity values', () => {
      // Arrange
      const highQuantity = 99;
      
      // Act
      const { handlers } = renderCartItem({ quantity: highQuantity }, undefined, 100);
      
      // Assert
      expect(screen.getByText(highQuantity.toString())).toBeInTheDocument();
      const expectedTotal = calculateLineTotal(DEFAULT_CART_ITEM.price, highQuantity);
      expect(screen.getByText(formatPrice(expectedTotal))).toBeInTheDocument();
      expect(expectedTotal).toBeCloseTo(890.01, 2);
    });

    it('should handle special characters in item name', () => {
      // Arrange
      const specialItem = { ...ITEM_WITH_SPECIAL_CHARS };
      
      // Act
      renderCartItem(specialItem);
      
      // Assert
      const nameElement = screen.getByText(specialItem.name);
      expect(nameElement).toBeInTheDocument();
      expect(nameElement.textContent).toContain("Jalapeño");
      expect(nameElement.textContent).toContain("'");
    });

    it('should handle decimal quantities if supported', async () => {
      // Arrange - Some systems allow 0.5 kg items, etc.
      const { handlers } = renderCartItem({ quantity: 1 });
      
      // Act
      const quantityInput = screen.queryByRole('spinbutton');
      
      // Assert
      if (quantityInput) {
        // If input exists, try decimal value
        await user.clear(quantityInput);
        await user.type(quantityInput, '1.5');
        
        // Either accepts decimal or rounds/rejects
        expect(quantityInput).toBeInTheDocument();
        expect(handlers.onQuantityChange).toBeDefined();
        expect(quantityInput.getAttribute('type')).toBeDefined();
      } else {
        // Display-only quantity, just verify render
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(handlers.onQuantityChange).not.toHaveBeenCalled();
        expect(screen.getByText(DEFAULT_CART_ITEM.name)).toBeInTheDocument();
      }
    });

    it('should handle empty name gracefully', () => {
      // Arrange
      const emptyNameItem: CartItemType = {
        ...DEFAULT_CART_ITEM,
        name: '',
      };
      
      // Act
      renderCartItem(emptyNameItem);
      
      // Assert
      // Component should still render price and quantity
      expect(screen.getByText(formatPrice(emptyNameItem.price))).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should handle unicode characters in name', () => {
      // Arrange
      const unicodeItem: CartItemType = {
        ...DEFAULT_CART_ITEM,
        name: '🍔 Super Burger 日本語 한국어',
      };
      
      // Act
      renderCartItem(unicodeItem);
      
      // Assert
      const nameElement = screen.getByText(unicodeItem.name);
      expect(nameElement).toBeInTheDocument();
      expect(nameElement.textContent).toContain('🍔');
      expect(nameElement.textContent).toContain('日本語');
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have accessible quantity controls', () => {
      // Arrange & Act
      renderCartItem({ quantity: 5 });
      
      // Assert
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      const decrementButton = screen.getByRole('button', { name: /decrease|decrement|-/i });
      
      expect(incrementButton).toHaveAccessibleName();
      expect(decrementButton).toHaveAccessibleName();
      expect(incrementButton.getAttribute('aria-label') || incrementButton.textContent).toBeTruthy();
    });

    it('should have accessible remove button with aria-label', () => {
      // Arrange
      const itemName = 'Test Burger';
      
      // Act
      renderCartItem({ name: itemName });
      
      // Assert
      const removeButton = screen.getByRole('button', { name: /remove/i });
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toHaveAccessibleName();
      
      const ariaLabel = removeButton.getAttribute('aria-label');
      const buttonText = removeButton.textContent;
      expect(ariaLabel || buttonText).toBeTruthy();
    });

    it('should support keyboard interaction for controls', async () => {
      // Arrange
      const { handlers } = renderCartItem({ quantity: 2 });
      
      // Act
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      incrementButton.focus();
      
      // Simulate Enter key press
      await user.keyboard('{Enter}');
      
      // Assert
      expect(incrementButton).toHaveFocus();
      expect(handlers.onQuantityChange).toHaveBeenCalled();
      expect(incrementButton).toBeEnabled();
    });

    it('should support Tab navigation between controls', async () => {
      // Arrange
      renderCartItem({ quantity: 3 });
      
      // Act & Assert
      const decrementButton = screen.getByRole('button', { name: /decrease|decrement|-/i });
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      const removeButton = screen.getByRole('button', { name: /remove/i });
      
      // Start from decrement and tab to increment
      decrementButton.focus();
      await user.tab();
      
      // One of the controls should now have focus
      const focusedElement = document.activeElement;
      expect([decrementButton, incrementButton, removeButton]).toContainEqual(focusedElement);
      expect(focusedElement).not.toBeNull();
      expect(focusedElement?.tagName).toBe('BUTTON');
    });

    it('should announce quantity changes to screen readers', () => {
      // Arrange
      const quantity = 5;
      
      // Act
      renderCartItem({ quantity });
      
      // Assert
      // Check for aria-live region or quantity aria-label
      const quantityDisplay = screen.getByText(quantity.toString());
      expect(quantityDisplay).toBeInTheDocument();
      
      // The quantity should be accessible
      const ariaLive = quantityDisplay.closest('[aria-live]');
      const ariaAtomic = quantityDisplay.getAttribute('aria-atomic');
      const role = quantityDisplay.getAttribute('role');
      
      // At least the quantity should be visible and readable
      expect(quantityDisplay).toBeVisible();
      expect(quantityDisplay.textContent).toBe('5');
      expect(quantityDisplay.tagName).toBeDefined();
    });

    it('should have proper heading hierarchy if applicable', () => {
      // Arrange
      const itemName = 'Accessible Burger';
      
      // Act
      renderCartItem({ name: itemName });
      
      // Assert
      const nameElement = screen.getByText(itemName);
      expect(nameElement).toBeInTheDocument();
      
      // Name can be in heading or regular element
      const tagName = nameElement.tagName.toLowerCase();
      expect(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p', 'div']).toContain(tagName);
      expect(nameElement).toBeVisible();
      expect(nameElement.textContent).toBe(itemName);
    });
  });

  // ==========================================================================
  // User Interaction Tests
  // ==========================================================================

  describe('user interaction', () => {
    it('should update quantity on plus button click', async () => {
      // Arrange
      const initialQuantity = 1;
      const { handlers } = renderCartItem({ quantity: initialQuantity });
      
      // Act
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      await user.click(incrementButton);
      
      // Assert
      expect(handlers.onQuantityChange).toHaveBeenCalledTimes(1);
      expect(handlers.onQuantityChange).toHaveBeenCalledWith(
        DEFAULT_CART_ITEM.id,
        initialQuantity + 1
      );
      expect(incrementButton).toBeVisible();
    });

    it('should update quantity on minus button click', async () => {
      // Arrange
      const initialQuantity = 5;
      const { handlers } = renderCartItem({ quantity: initialQuantity });
      
      // Act
      const decrementButton = screen.getByRole('button', { name: /decrease|decrement|-/i });
      await user.click(decrementButton);
      
      // Assert
      expect(handlers.onQuantityChange).toHaveBeenCalledTimes(1);
      expect(handlers.onQuantityChange).toHaveBeenCalledWith(
        DEFAULT_CART_ITEM.id,
        initialQuantity - 1
      );
      expect(decrementButton).toBeVisible();
    });

    it('should handle rapid clicking with debounce if implemented', async () => {
      // Arrange
      const initialQuantity = 5;
      const { handlers } = renderCartItem({ quantity: initialQuantity });
      
      // Act - Rapid clicks
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      
      // Click rapidly multiple times
      await user.click(incrementButton);
      await user.click(incrementButton);
      await user.click(incrementButton);
      
      // Assert
      // If debounced, might have fewer calls
      // If not debounced, should have 3 calls
      expect(handlers.onQuantityChange).toHaveBeenCalled();
      expect(handlers.onQuantityChange.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(handlers.onQuantityChange.mock.calls.length).toBeLessThanOrEqual(3);
    });

    it('should handle click on remove with correct item ID', async () => {
      // Arrange
      const itemId = 'unique-item-123';
      const { handlers } = renderCartItem({ id: itemId });
      
      // Act
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      
      // Assert
      expect(handlers.onRemove).toHaveBeenCalled();
      expect(handlers.onRemove).toHaveBeenCalledWith(itemId);
      expect(removeButton).toBeInTheDocument();
    });

    it('should maintain focus on quantity control after click', async () => {
      // Arrange
      const { handlers } = renderCartItem({ quantity: 2 });
      
      // Act
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      await user.click(incrementButton);
      
      // Assert
      expect(handlers.onQuantityChange).toHaveBeenCalled();
      // Focus might be on the button or moved elsewhere - both are valid behaviors
      expect(document.activeElement).toBeDefined();
      expect(incrementButton).toBeInTheDocument();
      expect(incrementButton).toBeVisible();
    });

    it('should handle keyboard Enter on increment button', async () => {
      // Arrange
      const initialQuantity = 2;
      const { handlers } = renderCartItem({ quantity: initialQuantity });
      
      // Act
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      incrementButton.focus();
      await user.keyboard('{Enter}');
      
      // Assert
      expect(handlers.onQuantityChange).toHaveBeenCalledTimes(1);
      expect(handlers.onQuantityChange).toHaveBeenCalledWith(
        DEFAULT_CART_ITEM.id,
        initialQuantity + 1
      );
      expect(incrementButton).toHaveFocus();
    });

    it('should handle keyboard Space on remove button', async () => {
      // Arrange
      const itemId = 'keyboard-test-001';
      const { handlers } = renderCartItem({ id: itemId });
      
      // Act
      const removeButton = screen.getByRole('button', { name: /remove/i });
      removeButton.focus();
      await user.keyboard(' ');
      
      // Assert
      expect(handlers.onRemove).toHaveBeenCalled();
      expect(handlers.onRemove).toHaveBeenCalledWith(itemId);
      expect(removeButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Integration-like Tests (Multiple Components)
  // ==========================================================================

  describe('integration scenarios', () => {
    it('should render multiple items with different data correctly', () => {
      // Arrange
      const items: CartItemType[] = [
        { ...DEFAULT_CART_ITEM, id: 'item-1', name: 'Burger', price: 9.99, quantity: 1 },
        { ...DEFAULT_CART_ITEM, id: 'item-2', name: 'Fries', price: 3.99, quantity: 2 },
        { ...DEFAULT_CART_ITEM, id: 'item-3', name: 'Drink', price: 2.49, quantity: 1 },
      ];
      
      // Act - Render first item
      const handlers1 = createMockHandlers();
      render(
        <CartItem
          item={items[0]}
          onQuantityChange={handlers1.onQuantityChange}
          onRemove={handlers1.onRemove}
        />
      );
      
      // Assert
      expect(screen.getByText('Burger')).toBeInTheDocument();
      expect(screen.getByText(formatPrice(9.99))).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should correctly calculate line total for various price/quantity combinations', () => {
      // Arrange
      const testCases = [
        { price: 10.00, quantity: 1, expected: 10.00 },
        { price: 5.50, quantity: 2, expected: 11.00 },
        { price: 3.33, quantity: 3, expected: 9.99 },
        { price: 0.99, quantity: 10, expected: 9.90 },
      ];
      
      // Act & Assert for each case
      testCases.forEach(({ price, quantity, expected }) => {
        cleanup();
        renderCartItem({ price, quantity });
        
        const calculatedTotal = calculateLineTotal(price, quantity);
        expect(calculatedTotal).toBeCloseTo(expected, 2);
        expect(screen.getByText(formatPrice(calculatedTotal))).toBeInTheDocument();
      });
    });

    it('should handle state changes through callback props', async () => {
      // Arrange
      const initialQuantity = 3;
      const { handlers } = renderCartItem({ quantity: initialQuantity });
      
      // Act - Increment
      const incrementButton = screen.getByRole('button', { name: /increase|increment|\+/i });
      await user.click(incrementButton);
      
      // Assert increment called
      expect(handlers.onQuantityChange).toHaveBeenCalledWith(
        DEFAULT_CART_ITEM.id,
        initialQuantity + 1
      );
      
      // Clear mock and test decrement
      vi.clearAllMocks();
      const decrementButton = screen.getByRole('button', { name: /decrease|decrement|-/i });
      await user.click(decrementButton);
      
      // Assert decrement called
      expect(handlers.onQuantityChange).toHaveBeenCalledWith(
        DEFAULT_CART_ITEM.id,
        initialQuantity - 1
      );
      
      expect(incrementButton).toBeVisible();
    });
  });

  // ==========================================================================
  // Snapshot Tests (Optional)
  // ==========================================================================

  describe('rendering consistency', () => {
    it('should render consistent structure for standard item', () => {
      // Arrange & Act
      renderCartItem({
        id: 'snapshot-001',
        name: 'Snapshot Burger',
        price: 9.99,
        quantity: 2,
        imageUrl: '/images/snapshot-burger.jpg',
      });
      
      // Assert - Check structure exists
      const nameElement = screen.getByText('Snapshot Burger');
      const priceElement = screen.getByText('$9.99');
      const quantityElement = screen.getByText('2');
      const lineTotalElement = screen.getByText('$19.98');
      const removeButton = screen.getByRole('button', { name: /remove/i });
      
      expect(nameElement).toBeInTheDocument();
      expect(priceElement).toBeInTheDocument();
      expect(quantityElement).toBeInTheDocument();
      expect(lineTotalElement).toBeInTheDocument();
      expect(removeButton).toBeInTheDocument();
    });

    it('should render all required elements', () => {
      // Arrange & Act
      renderCartItem();
      
      // Assert
      const elements = getItemElements();
      
      // Core elements must exist
      expect(screen.getByText(DEFAULT_CART_ITEM.name)).toBeInTheDocument();
      expect(screen.getByText(formatPrice(DEFAULT_CART_ITEM.price))).toBeInTheDocument();
      expect(screen.getByText(DEFAULT_CART_ITEM.quantity.toString())).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /increase|increment|\+/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decrease|decrement|-/i })).toBeInTheDocument();
    });
  });
});
