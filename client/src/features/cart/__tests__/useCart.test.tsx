/**
 * @fileoverview Unit tests for useCart custom hook - Cart operations
 * @module tests/features/cart/useCart
 *
 * This module contains comprehensive tests for the useCart hook which provides
 * cart operations including addItem, removeItem, updateQuantity, clearCart,
 * and total calculation functionality.
 *
 * Test coverage targets:
 * - 95% overall coverage for cart state management
 * - All cart operations (add, remove, update, clear)
 * - Quantity validation and limits
 * - LocalStorage persistence
 * - Error handling and edge cases
 *
 * Following test patterns from:
 * - tests/lifecycle/server.test.js (mock factories, JSDoc documentation)
 * - tests/unit/config.test.js (describe block organization)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { useCart, MAX_QUANTITY, MenuItemInput } from '../hooks/useCart';
import { CartProvider, CartItem } from '../CartContext';
import { menuItems, createMenuItem, TestMenuItem } from '../../../__tests__/fixtures/menuItems';
import { clearAllStorage } from '../../../__tests__/utils/testUtils';

// ============================================================================
// TypeScript Interfaces
// Following @typedef pattern from server.test.js
// ============================================================================

/**
 * Result type returned by the useCart hook
 * @typedef {Object} UseCartResult
 */
interface UseCartResult {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (params: { menuItem: MenuItemInput; quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
  getItemQuantity: (id: string) => number;
  isEmpty: boolean;
}

/**
 * Parameters for adding an item to the cart
 * @typedef {Object} AddItemParams
 */
interface AddItemParams {
  menuItem: MenuItemInput;
  quantity?: number;
}

// ============================================================================
// Constants
// Following DEFAULT_CONFIG pattern from server.test.js
// ============================================================================

/**
 * Default menu item for testing basic cart operations
 * @constant
 */
const DEFAULT_MENU_ITEM: MenuItemInput = {
  id: 'burger-001',
  name: 'Classic Burger',
  price: 8.99,
  imageUrl: '/images/menu/classic-burger.jpg',
};

/**
 * Secondary menu item for multi-item tests
 * @constant
 */
const SECONDARY_MENU_ITEM: MenuItemInput = {
  id: 'side-001',
  name: 'Fries',
  price: 3.99,
  imageUrl: '/images/menu/fries.jpg',
};

/**
 * Array of sample menu items for multi-item testing
 * @constant
 */
const SAMPLE_ITEMS: MenuItemInput[] = [
  DEFAULT_MENU_ITEM,
  SECONDARY_MENU_ITEM,
  {
    id: 'drink-001',
    name: 'Soda',
    price: 2.49,
    imageUrl: '/images/menu/soda.jpg',
  },
];

/**
 * Local storage key used by CartContext
 * @constant
 */
const CART_STORAGE_KEY = 'burger-website-cart';

// ============================================================================
// Helper Functions
// Following createMockServer pattern from server.test.js
// ============================================================================

/**
 * Props type for the wrapper component
 */
interface WrapperProps {
  children: ReactNode;
}

/**
 * Creates a wrapper component with CartProvider for renderHook.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param initialItems - Optional initial cart items for testing
 * @returns Wrapper component function for renderHook
 */
function createWrapper(initialItems?: CartItem[]): React.FC<WrapperProps> {
  const Wrapper: React.FC<WrapperProps> = ({ children }) => {
    const initialState = initialItems ? { items: initialItems } : undefined;
    return (
      <CartProvider initialState={initialState}>
        {children}
      </CartProvider>
    );
  };
  return Wrapper;
}

/**
 * Converts a MenuItemInput to a CartItem with specified quantity.
 * Helper for setting up test fixtures.
 *
 * @param menuItem - Menu item to convert
 * @param quantity - Quantity for the cart item
 * @returns CartItem ready for use in tests
 */
function toCartItem(menuItem: MenuItemInput, quantity: number): CartItem {
  return {
    id: menuItem.id,
    name: menuItem.name,
    price: menuItem.price,
    quantity,
    imageUrl: menuItem.imageUrl,
  };
}

/**
 * Sets up localStorage mock with initial data.
 * Useful for testing persistence restoration.
 *
 * @param items - Cart items to store
 */
function setupLocalStorageWithItems(items: CartItem[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Clears localStorage cart data.
 * Used in cleanup to ensure test isolation.
 */
function clearLocalStorageCart(): void {
  localStorage.removeItem(CART_STORAGE_KEY);
}

// ============================================================================
// Test Suite
// ============================================================================

describe('useCart', () => {
  // Store original console methods for restoration
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  /**
   * Setup and teardown following server.test.js beforeEach/afterEach pattern
   */
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Clear storage to ensure test isolation
    clearAllStorage();
    
    // Spy on console methods to track error logging
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up rendered components
    cleanup();
    
    // Clear storage
    clearAllStorage();
    
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('initial state', () => {
    it('should return empty items array initially', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Assert
      expect(result.current.items).toEqual([]);
      expect(result.current.items).toHaveLength(0);
      expect(Array.isArray(result.current.items)).toBe(true);
    });

    it('should return zero total initially', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Assert
      expect(result.current.total).toBe(0);
      expect(typeof result.current.total).toBe('number');
      expect(result.current.total).toBeGreaterThanOrEqual(0);
    });

    it('should return zero item count initially', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Assert
      expect(result.current.itemCount).toBe(0);
      expect(typeof result.current.itemCount).toBe('number');
      expect(result.current.isEmpty).toBe(true);
    });

    it('should restore cart from localStorage if present', () => {
      // Arrange
      const storedItems: CartItem[] = [
        toCartItem(DEFAULT_MENU_ITEM, 2),
        toCartItem(SECONDARY_MENU_ITEM, 1),
      ];
      setupLocalStorageWithItems(storedItems);
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Assert
      expect(result.current.items).toHaveLength(2);
      expect(result.current.itemCount).toBe(3);
      expect(result.current.isEmpty).toBe(false);
    });
  });

  // ==========================================================================
  // addItem Tests
  // ==========================================================================

  describe('addItem', () => {
    it('should add new item to cart', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM });
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(DEFAULT_MENU_ITEM.id);
      expect(result.current.items[0].name).toBe(DEFAULT_MENU_ITEM.name);
    });

    it('should increase quantity when adding duplicate item', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 1 });
      });
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 2 });
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.items[0].id).toBe(DEFAULT_MENU_ITEM.id);
    });

    it('should update total after adding item', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 2 });
      });
      
      // Assert
      const expectedTotal = Math.round(DEFAULT_MENU_ITEM.price * 2 * 100) / 100;
      expect(result.current.total).toBe(expectedTotal);
      expect(result.current.itemCount).toBe(2);
      expect(result.current.isEmpty).toBe(false);
    });

    it('should update item count after adding', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 3 });
      });
      act(() => {
        result.current.addItem({ menuItem: SECONDARY_MENU_ITEM, quantity: 2 });
      });
      
      // Assert
      expect(result.current.itemCount).toBe(5);
      expect(result.current.items).toHaveLength(2);
      expect(result.current.isEmpty).toBe(false);
    });

    it('should persist addition to localStorage', async () => {
      // Arrange
      clearLocalStorageCart();
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM });
      });
      
      // Assert - wait for localStorage update
      await waitFor(() => {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        expect(stored).not.toBeNull();
        const parsedItems = JSON.parse(stored!);
        expect(parsedItems).toHaveLength(1);
        expect(parsedItems[0].id).toBe(DEFAULT_MENU_ITEM.id);
      });
    });

    it('should not exceed maximum quantity limit', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, MAX_QUANTITY - 1)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to add more than limit allows
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 5 });
      });
      
      // Assert - should cap at MAX_QUANTITY
      expect(result.current.items[0].quantity).toBe(MAX_QUANTITY);
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(result.current.items).toHaveLength(1);
    });

    it('should default to quantity 1 when not specified', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM });
      });
      
      // Assert
      expect(result.current.items[0].quantity).toBe(1);
      expect(result.current.itemCount).toBe(1);
      expect(result.current.total).toBe(DEFAULT_MENU_ITEM.price);
    });
  });

  // ==========================================================================
  // removeItem Tests
  // ==========================================================================

  describe('removeItem', () => {
    it('should remove item from cart by id', () => {
      // Arrange
      const initialItems = [
        toCartItem(DEFAULT_MENU_ITEM, 2),
        toCartItem(SECONDARY_MENU_ITEM, 1),
      ];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.removeItem(DEFAULT_MENU_ITEM.id);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(SECONDARY_MENU_ITEM.id);
      expect(result.current.isInCart(DEFAULT_MENU_ITEM.id)).toBe(false);
    });

    it('should update total after removing item', () => {
      // Arrange
      const initialItems = [
        toCartItem(DEFAULT_MENU_ITEM, 2),
        toCartItem(SECONDARY_MENU_ITEM, 1),
      ];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      const initialTotal = result.current.total;
      
      // Act
      act(() => {
        result.current.removeItem(DEFAULT_MENU_ITEM.id);
      });
      
      // Assert
      expect(result.current.total).toBeLessThan(initialTotal);
      expect(result.current.total).toBe(SECONDARY_MENU_ITEM.price);
      expect(result.current.items).toHaveLength(1);
    });

    it('should update item count after removing', () => {
      // Arrange
      const initialItems = [
        toCartItem(DEFAULT_MENU_ITEM, 3),
        toCartItem(SECONDARY_MENU_ITEM, 2),
      ];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.removeItem(DEFAULT_MENU_ITEM.id);
      });
      
      // Assert
      expect(result.current.itemCount).toBe(2);
      expect(result.current.items).toHaveLength(1);
      expect(result.current.isEmpty).toBe(false);
    });

    it('should persist removal to localStorage', async () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 1)];
      setupLocalStorageWithItems(initialItems);
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.removeItem(DEFAULT_MENU_ITEM.id);
      });
      
      // Assert - wait for localStorage update
      await waitFor(() => {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        expect(stored).not.toBeNull();
        const parsedItems = JSON.parse(stored!);
        expect(parsedItems).toHaveLength(0);
      });
    });

    it('should handle removing non-existent item gracefully', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 1)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to remove item that doesn't exist
      act(() => {
        result.current.removeItem('non-existent-id');
      });
      
      // Assert - cart should remain unchanged
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(DEFAULT_MENU_ITEM.id);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // updateQuantity Tests
  // ==========================================================================

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(DEFAULT_MENU_ITEM.id, 5);
      });
      
      // Assert
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.itemCount).toBe(5);
      expect(result.current.getItemQuantity(DEFAULT_MENU_ITEM.id)).toBe(5);
    });

    it('should remove item when quantity set to zero', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(DEFAULT_MENU_ITEM.id, 0);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.isInCart(DEFAULT_MENU_ITEM.id)).toBe(false);
    });

    it('should not allow negative quantities', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to set negative quantity
      act(() => {
        result.current.updateQuantity(DEFAULT_MENU_ITEM.id, -5);
      });
      
      // Assert - item should be removed (treated as zero)
      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.itemCount).toBe(0);
    });

    it('should enforce maximum quantity limit', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to exceed max quantity
      act(() => {
        result.current.updateQuantity(DEFAULT_MENU_ITEM.id, MAX_QUANTITY + 50);
      });
      
      // Assert - should cap at MAX_QUANTITY
      expect(result.current.items[0].quantity).toBe(MAX_QUANTITY);
      expect(result.current.itemCount).toBe(MAX_QUANTITY);
      expect(result.current.getItemQuantity(DEFAULT_MENU_ITEM.id)).toBe(MAX_QUANTITY);
    });

    it('should update total after quantity change', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(DEFAULT_MENU_ITEM.id, 5);
      });
      
      // Assert
      const expectedTotal = Math.round(DEFAULT_MENU_ITEM.price * 5 * 100) / 100;
      expect(result.current.total).toBe(expectedTotal);
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.itemCount).toBe(5);
    });

    it('should persist quantity change to localStorage', async () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      setupLocalStorageWithItems(initialItems);
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(DEFAULT_MENU_ITEM.id, 5);
      });
      
      // Assert - wait for localStorage update
      await waitFor(() => {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        expect(stored).not.toBeNull();
        const parsedItems = JSON.parse(stored!);
        expect(parsedItems[0].quantity).toBe(5);
      });
    });
  });

  // ==========================================================================
  // clearCart Tests
  // ==========================================================================

  describe('clearCart', () => {
    it('should remove all items from cart', () => {
      // Arrange
      const initialItems = [
        toCartItem(DEFAULT_MENU_ITEM, 2),
        toCartItem(SECONDARY_MENU_ITEM, 3),
      ];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.clearCart();
      });
      
      // Assert
      expect(result.current.items).toHaveLength(0);
      expect(result.current.items).toEqual([]);
      expect(Array.isArray(result.current.items)).toBe(true);
    });

    it('should reset total to zero', () => {
      // Arrange
      const initialItems = [
        toCartItem(DEFAULT_MENU_ITEM, 2),
        toCartItem(SECONDARY_MENU_ITEM, 1),
      ];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.clearCart();
      });
      
      // Assert
      expect(result.current.total).toBe(0);
      expect(typeof result.current.total).toBe('number');
      expect(result.current.items).toHaveLength(0);
    });

    it('should reset item count to zero', () => {
      // Arrange
      const initialItems = [
        toCartItem(DEFAULT_MENU_ITEM, 5),
        toCartItem(SECONDARY_MENU_ITEM, 3),
      ];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.clearCart();
      });
      
      // Assert
      expect(result.current.itemCount).toBe(0);
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.items).toHaveLength(0);
    });

    it('should clear cart from localStorage', async () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      setupLocalStorageWithItems(initialItems);
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.clearCart();
      });
      
      // Assert - wait for localStorage update
      await waitFor(() => {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        expect(stored).not.toBeNull();
        const parsedItems = JSON.parse(stored!);
        expect(parsedItems).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // Total Calculation Tests
  // ==========================================================================

  describe('total calculation', () => {
    it('should calculate correct total for single item', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 3 });
      });
      
      // Assert
      const expectedTotal = Math.round(DEFAULT_MENU_ITEM.price * 3 * 100) / 100;
      expect(result.current.total).toBe(expectedTotal);
      expect(typeof result.current.total).toBe('number');
      expect(result.current.total).toBeGreaterThan(0);
    });

    it('should calculate correct total for multiple items', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 2 });
      });
      act(() => {
        result.current.addItem({ menuItem: SECONDARY_MENU_ITEM, quantity: 3 });
      });
      
      // Assert
      const expectedTotal = Math.round(
        (DEFAULT_MENU_ITEM.price * 2 + SECONDARY_MENU_ITEM.price * 3) * 100
      ) / 100;
      expect(result.current.total).toBe(expectedTotal);
      expect(result.current.items).toHaveLength(2);
      expect(result.current.itemCount).toBe(5);
    });

    it('should update total when quantities change', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      const initialTotal = result.current.total;
      
      // Act
      act(() => {
        result.current.updateQuantity(DEFAULT_MENU_ITEM.id, 5);
      });
      
      // Assert
      const expectedTotal = Math.round(DEFAULT_MENU_ITEM.price * 5 * 100) / 100;
      expect(result.current.total).toBe(expectedTotal);
      expect(result.current.total).toBeGreaterThan(initialTotal);
      expect(result.current.items[0].quantity).toBe(5);
    });

    it('should handle items with decimal prices', () => {
      // Arrange
      const decimalPriceItem: MenuItemInput = {
        id: 'decimal-001',
        name: 'Decimal Price Item',
        price: 7.77,
        imageUrl: '/images/decimal.jpg',
      };
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: decimalPriceItem, quantity: 3 });
      });
      
      // Assert - should handle floating point correctly
      const expectedTotal = Math.round(7.77 * 3 * 100) / 100;
      expect(result.current.total).toBe(expectedTotal);
      expect(Number.isFinite(result.current.total)).toBe(true);
      expect(result.current.total).toBeCloseTo(23.31, 2);
    });
  });

  // ==========================================================================
  // Duplicate Item Handling Tests
  // ==========================================================================

  describe('duplicate item handling', () => {
    it('should merge duplicate items by incrementing quantity', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 2 });
      });
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 3 });
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.itemCount).toBe(5);
    });

    it('should not create separate entries for same item', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - add same item multiple times
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 1 });
      });
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 1 });
      });
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 1 });
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(DEFAULT_MENU_ITEM.id);
      expect(result.current.items[0].quantity).toBe(3);
    });

    it('should enforce max quantity when merging duplicates', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, MAX_QUANTITY - 2)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to add more than remaining capacity
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 10 });
      });
      
      // Assert - should cap at MAX_QUANTITY
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(MAX_QUANTITY);
      expect(result.current.itemCount).toBe(MAX_QUANTITY);
    });
  });

  // ==========================================================================
  // Quantity Limits Tests
  // ==========================================================================

  describe('quantity limits', () => {
    it('should enforce minimum quantity of 1', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to add with zero quantity
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 0 });
      });
      
      // Assert - should add with minimum quantity of 1
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(1);
      expect(result.current.itemCount).toBe(1);
    });

    it('should enforce maximum quantity limit', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: MAX_QUANTITY + 100 });
      });
      
      // Assert
      expect(result.current.items[0].quantity).toBeLessThanOrEqual(MAX_QUANTITY);
      expect(MAX_QUANTITY).toBe(99);
      expect(result.current.itemCount).toBeLessThanOrEqual(MAX_QUANTITY);
    });

    it('should show warning when exceeding limit', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, MAX_QUANTITY)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to add more when already at max
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 1 });
      });
      
      // Assert
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(result.current.items[0].quantity).toBe(MAX_QUANTITY);
      expect(result.current.itemCount).toBe(MAX_QUANTITY);
    });
  });

  // ==========================================================================
  // localStorage Persistence Tests
  // ==========================================================================

  describe('localStorage persistence', () => {
    it('should save cart state to localStorage', async () => {
      // Arrange
      clearLocalStorageCart();
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM, quantity: 2 });
      });
      
      // Assert
      await waitFor(() => {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        expect(stored).not.toBeNull();
        expect(typeof stored).toBe('string');
        const parsedItems = JSON.parse(stored!);
        expect(Array.isArray(parsedItems)).toBe(true);
      });
    });

    it('should restore cart state from localStorage on mount', () => {
      // Arrange
      const storedItems: CartItem[] = [
        toCartItem(DEFAULT_MENU_ITEM, 3),
        toCartItem(SECONDARY_MENU_ITEM, 2),
      ];
      setupLocalStorageWithItems(storedItems);
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Assert
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.items[1].quantity).toBe(2);
      expect(result.current.itemCount).toBe(5);
    });

    it('should handle corrupted localStorage gracefully', () => {
      // Arrange - set invalid JSON
      localStorage.setItem(CART_STORAGE_KEY, 'invalid-json-{{{');
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Assert - should start with empty cart
      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle localStorage quota exceeded error', () => {
      // Arrange
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - should not throw
      act(() => {
        result.current.addItem({ menuItem: DEFAULT_MENU_ITEM });
      });
      
      // Assert - cart should still work in memory
      expect(result.current.items).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.items[0].id).toBe(DEFAULT_MENU_ITEM.id);
      
      // Cleanup
      mockSetItem.mockRestore();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle invalid item data gracefully', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to add with invalid item (missing required fields)
      act(() => {
        result.current.addItem({
          menuItem: { id: '', name: '', price: 0 } as MenuItemInput,
        });
      });
      
      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should validate item before adding', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to add with negative price
      act(() => {
        result.current.addItem({
          menuItem: { id: 'test', name: 'Test', price: -5 } as MenuItemInput,
        });
      });
      
      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.items).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });

    it('should log errors for debugging', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to add null item
      act(() => {
        result.current.addItem({
          menuItem: null as unknown as MenuItemInput,
        });
      });
      
      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);
      expect(result.current.items).toHaveLength(0);
    });

    it('should handle invalid id for removeItem', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 1)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to remove with invalid id
      act(() => {
        result.current.removeItem('');
      });
      
      // Assert - cart should remain unchanged
      expect(result.current.items).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.items[0].id).toBe(DEFAULT_MENU_ITEM.id);
    });

    it('should handle invalid id for updateQuantity', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to update with invalid id
      act(() => {
        result.current.updateQuantity('', 5);
      });
      
      // Assert - cart should remain unchanged
      expect(result.current.items[0].quantity).toBe(2);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.itemCount).toBe(2);
    });

    it('should handle invalid quantity for updateQuantity', () => {
      // Arrange
      const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 2)];
      const wrapper = createWrapper(initialItems);
      const { result } = renderHook(() => useCart(), { wrapper });
      
      // Act - try to update with NaN quantity
      act(() => {
        result.current.updateQuantity(DEFAULT_MENU_ITEM.id, NaN);
      });
      
      // Assert - cart should remain unchanged
      expect(result.current.items[0].quantity).toBe(2);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.total).toBe(Math.round(DEFAULT_MENU_ITEM.price * 2 * 100) / 100);
    });
  });

  // ==========================================================================
  // Helper Method Tests (isInCart, getItemQuantity, isEmpty)
  // ==========================================================================

  describe('helper methods', () => {
    describe('isInCart', () => {
      it('should return true for items in cart', () => {
        // Arrange
        const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 1)];
        const wrapper = createWrapper(initialItems);
        const { result } = renderHook(() => useCart(), { wrapper });
        
        // Act & Assert
        expect(result.current.isInCart(DEFAULT_MENU_ITEM.id)).toBe(true);
        expect(typeof result.current.isInCart(DEFAULT_MENU_ITEM.id)).toBe('boolean');
        expect(result.current.items).toHaveLength(1);
      });

      it('should return false for items not in cart', () => {
        // Arrange
        const wrapper = createWrapper();
        const { result } = renderHook(() => useCart(), { wrapper });
        
        // Act & Assert
        expect(result.current.isInCart('non-existent-id')).toBe(false);
        expect(result.current.isInCart(DEFAULT_MENU_ITEM.id)).toBe(false);
        expect(result.current.isEmpty).toBe(true);
      });

      it('should handle invalid id gracefully', () => {
        // Arrange
        const wrapper = createWrapper();
        const { result } = renderHook(() => useCart(), { wrapper });
        
        // Act & Assert
        expect(result.current.isInCart('')).toBe(false);
        expect(result.current.isInCart(null as unknown as string)).toBe(false);
        expect(result.current.isInCart(undefined as unknown as string)).toBe(false);
      });
    });

    describe('getItemQuantity', () => {
      it('should return correct quantity for items in cart', () => {
        // Arrange
        const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 5)];
        const wrapper = createWrapper(initialItems);
        const { result } = renderHook(() => useCart(), { wrapper });
        
        // Act & Assert
        expect(result.current.getItemQuantity(DEFAULT_MENU_ITEM.id)).toBe(5);
        expect(typeof result.current.getItemQuantity(DEFAULT_MENU_ITEM.id)).toBe('number');
        expect(result.current.itemCount).toBe(5);
      });

      it('should return 0 for items not in cart', () => {
        // Arrange
        const wrapper = createWrapper();
        const { result } = renderHook(() => useCart(), { wrapper });
        
        // Act & Assert
        expect(result.current.getItemQuantity('non-existent-id')).toBe(0);
        expect(result.current.getItemQuantity(DEFAULT_MENU_ITEM.id)).toBe(0);
        expect(result.current.isEmpty).toBe(true);
      });

      it('should handle invalid id gracefully', () => {
        // Arrange
        const wrapper = createWrapper();
        const { result } = renderHook(() => useCart(), { wrapper });
        
        // Act & Assert
        expect(result.current.getItemQuantity('')).toBe(0);
        expect(result.current.getItemQuantity(null as unknown as string)).toBe(0);
        expect(result.current.getItemQuantity(undefined as unknown as string)).toBe(0);
      });
    });

    describe('isEmpty', () => {
      it('should return true when cart is empty', () => {
        // Arrange
        const wrapper = createWrapper();
        const { result } = renderHook(() => useCart(), { wrapper });
        
        // Act & Assert
        expect(result.current.isEmpty).toBe(true);
        expect(result.current.items).toHaveLength(0);
        expect(result.current.itemCount).toBe(0);
      });

      it('should return false when cart has items', () => {
        // Arrange
        const initialItems = [toCartItem(DEFAULT_MENU_ITEM, 1)];
        const wrapper = createWrapper(initialItems);
        const { result } = renderHook(() => useCart(), { wrapper });
        
        // Act & Assert
        expect(result.current.isEmpty).toBe(false);
        expect(result.current.items).toHaveLength(1);
        expect(result.current.itemCount).toBe(1);
      });

      it('should update correctly when cart changes', () => {
        // Arrange
        const wrapper = createWrapper();
        const { result } = renderHook(() => useCart(), { wrapper });
        
        // Assert initial state
        expect(result.current.isEmpty).toBe(true);
        
        // Act - add item
        act(() => {
          result.current.addItem({ menuItem: DEFAULT_MENU_ITEM });
        });
        
        // Assert after adding
        expect(result.current.isEmpty).toBe(false);
        
        // Act - clear cart
        act(() => {
          result.current.clearCart();
        });
        
        // Assert after clearing
        expect(result.current.isEmpty).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Integration with Real Menu Items
  // ==========================================================================

  describe('integration with menu items', () => {
    it('should work with imported menu item fixtures', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      const testBurger = menuItems.find((item) => item.category === 'burgers');
      
      // Act
      if (testBurger) {
        act(() => {
          result.current.addItem({
            menuItem: {
              id: testBurger.id,
              name: testBurger.name,
              price: testBurger.price,
              imageUrl: testBurger.imageUrl,
            },
          });
        });
      }
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe(testBurger?.name);
      expect(result.current.total).toBe(testBurger?.price);
    });

    it('should work with createMenuItem factory function', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCart(), { wrapper });
      const customMenuItem = createMenuItem({
        name: 'Custom Test Burger',
        price: 15.99,
      });
      
      // Act
      act(() => {
        result.current.addItem({
          menuItem: {
            id: customMenuItem.id,
            name: customMenuItem.name,
            price: customMenuItem.price,
            imageUrl: customMenuItem.imageUrl,
          },
          quantity: 2,
        });
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe('Custom Test Burger');
      expect(result.current.total).toBe(Math.round(15.99 * 2 * 100) / 100);
    });
  });
});
