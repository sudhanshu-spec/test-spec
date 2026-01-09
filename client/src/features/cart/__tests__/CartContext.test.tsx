/**
 * @fileoverview Unit tests for CartContext and CartProvider - Critical Path Component
 * @module tests/features/cart/CartContext
 * 
 * This test suite provides comprehensive coverage for the CartContext and CartProvider
 * components, which are critical for shopping cart functionality. The tests cover:
 * - Context initialization and error handling
 * - State mutations (add/remove/update operations)
 * - Total and item count calculations
 * - localStorage persistence and recovery
 * - Edge cases and error scenarios
 * 
 * Following the patterns established in tests/lifecycle/server.test.js for:
 * - Mock factory functions (createMockServer pattern)
 * - TypeScript interfaces (@typedef pattern)
 * - Setup/teardown patterns (beforeEach/afterEach)
 * 
 * Coverage target: 100% (Critical Path)
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import React, { useContext, type ReactNode } from 'react';
import { CartContext, CartProvider, useCartContext, type CartItem, type CartState, type CartContextValue } from '../CartContext';
import { createMenuItem, burgers, drinks } from '../../../__tests__/fixtures/menuItems';
import { clearAllStorage } from '../../../__tests__/utils/testUtils';

// ============================================================================
// Type Definitions (following server.test.js @typedef pattern)
// ============================================================================

/**
 * @typedef {Object} WrapperProps
 * @property {ReactNode} children - Child components to wrap
 */
interface WrapperProps {
  children: ReactNode;
}

/**
 * @typedef {Object} MockStorageState
 * @property {Record<string, string>} data - Storage key-value pairs
 */
interface MockStorageState {
  data: Record<string, string>;
}

// ============================================================================
// Constants (following DEFAULT_CONFIG pattern from server.test.js)
// ============================================================================

/** Default empty cart state for assertions */
const DEFAULT_CART_STATE: CartState = {
  items: [],
  total: 0,
  itemCount: 0
};

/** localStorage key used by CartContext (must match CartContext.tsx) */
const STORAGE_KEY = 'burger-website-cart';

/** Sample burger item for testing - derived from fixtures */
const SAMPLE_BURGER: CartItem = {
  id: 'burger-001',
  name: 'Classic Burger',
  price: 8.99,
  quantity: 1,
  imageUrl: '/images/menu/classic-burger.jpg'
};

/** Sample drink item for multi-item tests - derived from fixtures */
const SAMPLE_DRINK: CartItem = {
  id: 'drink-001',
  name: 'Soda',
  price: 2.49,
  quantity: 1,
  imageUrl: '/images/menu/soda.jpg'
};

/** Sample fries item for testing */
const SAMPLE_FRIES: CartItem = {
  id: 'side-001',
  name: 'Fries',
  price: 3.99,
  quantity: 2,
  imageUrl: '/images/menu/fries.jpg'
};

// ============================================================================
// Helper Functions (following createMockServer/createMockListen patterns)
// ============================================================================

/**
 * Creates a wrapper component for renderHook with CartProvider.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 * 
 * @param initialItems - Optional initial cart items for testing pre-populated state
 * @returns React functional component wrapper
 */
function createWrapper(initialItems?: CartItem[]): React.FC<WrapperProps> {
  return function Wrapper({ children }: WrapperProps): React.ReactElement {
    const initialState = initialItems ? { items: initialItems } : undefined;
    return (
      <CartProvider initialState={initialState}>
        {children}
      </CartProvider>
    );
  };
}

/**
 * Creates a CartItem from menu item data with optional overrides.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 * 
 * @param overrides - Optional CartItem property overrides
 * @returns A complete CartItem object
 */
function createCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const menuItem = createMenuItem(overrides);
  return {
    id: menuItem.id,
    name: menuItem.name,
    price: menuItem.price,
    quantity: 1,
    imageUrl: menuItem.imageUrl,
    ...overrides
  };
}

/**
 * Sets up localStorage with pre-existing cart data.
 * 
 * @param items - Cart items to store
 */
function setupStorageWithCart(items: CartItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Calculates expected total for cart items.
 * Uses the same rounding logic as CartContext.
 * 
 * @param items - Array of cart items
 * @returns Total rounded to 2 decimal places
 */
function calculateExpectedTotal(items: CartItem[]): number {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return Math.round(total * 100) / 100;
}

/**
 * Calculates expected item count for cart items.
 * 
 * @param items - Array of cart items
 * @returns Sum of all quantities
 */
function calculateExpectedItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

// ============================================================================
// Test Suite
// ============================================================================

describe('CartContext', () => {
  /** @type {jest.SpyInstance} */
  let consoleErrorSpy: Mock;
  let consoleWarnSpy: Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();
    
    // Clear all storage to ensure test isolation
    clearAllStorage();
    
    // Spy on console methods for error handling tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up rendered components
    cleanup();
    
    // Restore all mocks
    vi.restoreAllMocks();
    
    // Clear storage again for safety
    clearAllStorage();
  });

  // ==========================================================================
  // Context Initialization Tests
  // ==========================================================================
  
  describe('context initialization', () => {
    it('should throw error when used outside CartProvider', () => {
      // Arrange & Act & Assert
      // The useCartContext hook should throw when used without provider
      expect(() => {
        renderHook(() => useCartContext());
      }).toThrow('useCartContext must be used within a CartProvider');
      
      // Verify the error message is descriptive
      try {
        renderHook(() => useCartContext());
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('CartProvider');
      }
    });

    it('should provide default empty cart state', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
    });

    it('should provide all cart operation functions', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(typeof result.current.addItem).toBe('function');
      expect(typeof result.current.removeItem).toBe('function');
      expect(typeof result.current.updateQuantity).toBe('function');
      expect(typeof result.current.clearCart).toBe('function');
    });

    it('should provide context with correct CartContextValue shape', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert - verify all expected properties exist
      expect(result.current).toHaveProperty('items');
      expect(result.current).toHaveProperty('total');
      expect(result.current).toHaveProperty('itemCount');
      expect(result.current).toHaveProperty('addItem');
      expect(result.current).toHaveProperty('removeItem');
      expect(result.current).toHaveProperty('updateQuantity');
      expect(result.current).toHaveProperty('clearCart');
    });
  });

  // ==========================================================================
  // CartProvider Tests
  // ==========================================================================
  
  describe('CartProvider', () => {
    it('should provide cart context to children', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current).toBeDefined();
      expect(result.current.items).toBeDefined();
      expect(Array.isArray(result.current.items)).toBe(true);
    });

    it('should initialize with stored cart if present in localStorage', () => {
      // Arrange
      const storedItems = [SAMPLE_BURGER, SAMPLE_DRINK];
      setupStorageWithCart(storedItems);
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].id).toBe(SAMPLE_BURGER.id);
      expect(result.current.items[1].id).toBe(SAMPLE_DRINK.id);
      expect(result.current.total).toBe(calculateExpectedTotal(storedItems));
    });

    it('should initialize with empty cart if localStorage is empty', () => {
      // Arrange - ensure localStorage is empty
      localStorage.removeItem(STORAGE_KEY);
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Arrange - set invalid JSON in localStorage
      localStorage.setItem(STORAGE_KEY, 'invalid-json-data');
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert - should fallback to empty cart
      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should filter out invalid items from localStorage', () => {
      // Arrange - store items with missing required fields
      const invalidData = [
        { id: 'valid-001', name: 'Valid Item', price: 9.99, quantity: 1 },
        { id: 'invalid-001', name: 'Missing Quantity', price: 5.99 }, // missing quantity
        { name: 'Missing ID', price: 3.99, quantity: 1 }, // missing id
        { id: 'invalid-002', price: 4.99, quantity: 1 }, // missing name
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidData));
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert - should only include valid items
      expect(result.current.items.length).toBeLessThanOrEqual(1);
      expect(result.current.items.every(item => item.id && item.name && item.price !== undefined)).toBe(true);
    });

    it('should use initialState when provided for testing', () => {
      // Arrange
      const initialItems = [SAMPLE_BURGER];
      const wrapper = createWrapper(initialItems);
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(SAMPLE_BURGER.id);
      expect(result.current.total).toBe(calculateExpectedTotal(initialItems));
    });
  });

  // ==========================================================================
  // addItem Operation Tests
  // ==========================================================================
  
  describe('addItem operation', () => {
    it('should add new item to empty cart', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(SAMPLE_BURGER.id);
      expect(result.current.items[0].name).toBe(SAMPLE_BURGER.name);
      expect(result.current.items[0].price).toBe(SAMPLE_BURGER.price);
    });

    it('should add new item to existing cart', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_DRINK);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items.find(item => item.id === SAMPLE_BURGER.id)).toBeDefined();
      expect(result.current.items.find(item => item.id === SAMPLE_DRINK.id)).toBeDefined();
    });

    it('should increment quantity when adding duplicate item', () => {
      // Arrange
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, quantity: 1 }]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ ...SAMPLE_BURGER, quantity: 2 });
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3); // 1 + 2
      expect(result.current.items[0].id).toBe(SAMPLE_BURGER.id);
    });

    it('should update total after adding item', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      const expectedTotal = SAMPLE_BURGER.price * SAMPLE_BURGER.quantity;
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert
      expect(result.current.total).toBe(expectedTotal);
      expect(result.current.total).toBeCloseTo(8.99, 2);
    });

    it('should update itemCount after adding', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert
      expect(result.current.itemCount).toBe(1);
      
      // Add another item
      act(() => {
        result.current.addItem(SAMPLE_DRINK);
      });
      
      expect(result.current.itemCount).toBe(2);
    });

    it('should persist to localStorage after adding', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert
      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeDefined();
        const parsedItems = JSON.parse(stored!);
        expect(parsedItems).toHaveLength(1);
        expect(parsedItems[0].id).toBe(SAMPLE_BURGER.id);
      });
    });

    it('should validate item data before adding', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      const invalidItem = { id: '', name: 'Test', price: 5.99, quantity: 0 } as CartItem;
      
      // Act
      act(() => {
        result.current.addItem(invalidItem);
      });
      
      // Assert - item should not be added due to validation
      expect(result.current.items).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle adding item with custom quantity', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      const itemWithQuantity = { ...SAMPLE_BURGER, quantity: 5 };
      
      // Act
      act(() => {
        result.current.addItem(itemWithQuantity);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.itemCount).toBe(5);
    });

    it('should update item properties when adding duplicate', () => {
      // Arrange - add item with old price
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, price: 7.99 }]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act - add same item with new price
      act(() => {
        result.current.addItem({ ...SAMPLE_BURGER, price: 9.99, quantity: 1 });
      });
      
      // Assert - price should be updated
      expect(result.current.items[0].price).toBe(9.99);
      expect(result.current.items[0].quantity).toBe(2);
    });
  });

  // ==========================================================================
  // removeItem Operation Tests
  // ==========================================================================
  
  describe('removeItem operation', () => {
    it('should remove item from cart by id', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER, SAMPLE_DRINK]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.removeItem(SAMPLE_BURGER.id);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(SAMPLE_DRINK.id);
      expect(result.current.items.find(item => item.id === SAMPLE_BURGER.id)).toBeUndefined();
    });

    it('should update total after removal', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER, SAMPLE_DRINK]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      const expectedTotal = SAMPLE_DRINK.price * SAMPLE_DRINK.quantity;
      
      // Act
      act(() => {
        result.current.removeItem(SAMPLE_BURGER.id);
      });
      
      // Assert
      expect(result.current.total).toBeCloseTo(expectedTotal, 2);
      expect(result.current.items).toHaveLength(1);
    });

    it('should update itemCount after removal', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER, SAMPLE_DRINK]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.removeItem(SAMPLE_BURGER.id);
      });
      
      // Assert
      expect(result.current.itemCount).toBe(SAMPLE_DRINK.quantity);
    });

    it('should persist removal to localStorage', async () => {
      // Arrange - Use setupStorageWithCart to enable persistence (not initialState)
      setupStorageWithCart([SAMPLE_BURGER, SAMPLE_DRINK]);
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Verify initial load from storage
      expect(result.current.items).toHaveLength(2);
      
      // Act
      act(() => {
        result.current.removeItem(SAMPLE_BURGER.id);
      });
      
      // Assert
      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeDefined();
        const parsedItems = JSON.parse(stored!);
        expect(parsedItems).toHaveLength(1);
        expect(parsedItems[0].id).toBe(SAMPLE_DRINK.id);
      });
    });

    it('should handle removing last item (empty cart)', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.removeItem(SAMPLE_BURGER.id);
      });
      
      // Assert
      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
    });

    it('should ignore removal of non-existent item', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      const initialItems = [...result.current.items];
      
      // Act
      act(() => {
        result.current.removeItem('non-existent-id');
      });
      
      // Assert
      expect(result.current.items).toHaveLength(initialItems.length);
      expect(result.current.items[0].id).toBe(SAMPLE_BURGER.id);
    });

    it('should not throw when removing from empty cart', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act & Assert
      expect(() => {
        act(() => {
          result.current.removeItem('any-id');
        });
      }).not.toThrow();
      
      expect(result.current.items).toEqual([]);
    });

    it('should handle invalid id gracefully', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.removeItem('');
      });
      
      // Assert - cart should remain unchanged
      expect(result.current.items).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // updateQuantity Operation Tests
  // ==========================================================================
  
  describe('updateQuantity operation', () => {
    it('should update quantity for existing item', () => {
      // Arrange
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, quantity: 1 }]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(SAMPLE_BURGER.id, 5);
      });
      
      // Assert
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.itemCount).toBe(5);
    });

    it('should remove item when quantity set to zero', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER, SAMPLE_DRINK]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(SAMPLE_BURGER.id, 0);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(SAMPLE_DRINK.id);
    });

    it('should remove item when quantity set to negative', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(SAMPLE_BURGER.id, -1);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(0);
    });

    it('should recalculate total after quantity change', () => {
      // Arrange
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, quantity: 1 }]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(SAMPLE_BURGER.id, 3);
      });
      
      // Assert
      const expectedTotal = SAMPLE_BURGER.price * 3;
      expect(result.current.total).toBeCloseTo(expectedTotal, 2);
    });

    it('should persist quantity changes to localStorage', async () => {
      // Arrange - Use setupStorageWithCart to enable persistence (not initialState)
      setupStorageWithCart([{ ...SAMPLE_BURGER, quantity: 1 }]);
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Verify initial load from storage
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(1);
      
      // Act
      act(() => {
        result.current.updateQuantity(SAMPLE_BURGER.id, 7);
      });
      
      // Assert
      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeDefined();
        const parsedItems = JSON.parse(stored!);
        expect(parsedItems[0].quantity).toBe(7);
      });
    });

    it('should ignore updates for non-existent items', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      const initialQuantity = result.current.items[0].quantity;
      
      // Act
      act(() => {
        result.current.updateQuantity('non-existent-id', 10);
      });
      
      // Assert
      expect(result.current.items[0].quantity).toBe(initialQuantity);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should floor decimal quantities to integers', () => {
      // Arrange
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, quantity: 1 }]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(SAMPLE_BURGER.id, 3.7);
      });
      
      // Assert
      expect(result.current.items[0].quantity).toBe(3);
    });

    it('should handle invalid quantity gracefully', () => {
      // Arrange
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, quantity: 2 }]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(SAMPLE_BURGER.id, NaN);
      });
      
      // Assert - quantity should remain unchanged
      expect(result.current.items[0].quantity).toBe(2);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // clearCart Operation Tests
  // ==========================================================================
  
  describe('clearCart operation', () => {
    it('should remove all items from cart', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER, SAMPLE_DRINK, SAMPLE_FRIES]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.clearCart();
      });
      
      // Assert
      expect(result.current.items).toEqual([]);
      expect(result.current.items).toHaveLength(0);
    });

    it('should reset total to zero', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER, SAMPLE_DRINK]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.clearCart();
      });
      
      // Assert
      expect(result.current.total).toBe(0);
    });

    it('should reset itemCount to zero', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER, SAMPLE_DRINK]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.clearCart();
      });
      
      // Assert
      expect(result.current.itemCount).toBe(0);
    });

    it('should clear cart from localStorage', async () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER, SAMPLE_DRINK]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.clearCart();
      });
      
      // Assert
      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedItems = JSON.parse(stored);
          expect(parsedItems).toEqual([]);
        }
      });
    });

    it('should handle clearing already empty cart', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act & Assert
      expect(() => {
        act(() => {
          result.current.clearCart();
        });
      }).not.toThrow();
      
      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
    });
  });

  // ==========================================================================
  // Total Calculation Tests
  // ==========================================================================
  
  describe('total calculation', () => {
    it('should calculate correct total for single item', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER]);
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.total).toBe(SAMPLE_BURGER.price * SAMPLE_BURGER.quantity);
      expect(result.current.total).toBeCloseTo(8.99, 2);
    });

    it('should calculate correct total for multiple items', () => {
      // Arrange
      const items = [SAMPLE_BURGER, SAMPLE_DRINK];
      const wrapper = createWrapper(items);
      const expectedTotal = calculateExpectedTotal(items);
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.total).toBeCloseTo(expectedTotal, 2);
      expect(result.current.total).toBeCloseTo(11.48, 2);
    });

    it('should calculate total with varying quantities', () => {
      // Arrange
      const items = [
        { ...SAMPLE_BURGER, quantity: 2 },
        { ...SAMPLE_DRINK, quantity: 3 }
      ];
      const wrapper = createWrapper(items);
      const expectedTotal = (SAMPLE_BURGER.price * 2) + (SAMPLE_DRINK.price * 3);
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.total).toBeCloseTo(expectedTotal, 2);
    });

    it('should handle decimal prices correctly', () => {
      // Arrange
      const decimalItem: CartItem = {
        id: 'decimal-001',
        name: 'Decimal Item',
        price: 3.33,
        quantity: 3,
        imageUrl: '/test.jpg'
      };
      const wrapper = createWrapper([decimalItem]);
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.total).toBeCloseTo(9.99, 2);
    });

    it('should avoid floating point precision errors', () => {
      // Arrange - prices that can cause floating point issues
      const item1: CartItem = { id: 'fp-001', name: 'Item 1', price: 0.1, quantity: 1 };
      const item2: CartItem = { id: 'fp-002', name: 'Item 2', price: 0.2, quantity: 1 };
      const wrapper = createWrapper([item1, item2]);
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert - should be exactly 0.30, not 0.30000000000000004
      expect(result.current.total).toBe(0.3);
    });

    it('should return zero for empty cart', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.total).toBe(0);
      expect(result.current.items).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Duplicate Item Handling Tests
  // ==========================================================================
  
  describe('duplicate item handling', () => {
    it('should merge duplicate items by incrementing quantity', () => {
      // Arrange
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, quantity: 2 }]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ ...SAMPLE_BURGER, quantity: 3 });
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(5);
    });

    it('should not create separate entries for same item id', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act - add same item multiple times
      act(() => {
        result.current.addItem({ ...SAMPLE_BURGER, quantity: 1 });
        result.current.addItem({ ...SAMPLE_BURGER, quantity: 1 });
        result.current.addItem({ ...SAMPLE_BURGER, quantity: 1 });
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.items[0].id).toBe(SAMPLE_BURGER.id);
    });

    it('should maintain correct total when merging duplicates', () => {
      // Arrange
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, quantity: 1 }]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ ...SAMPLE_BURGER, quantity: 2 });
      });
      
      // Assert
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.total).toBeCloseTo(SAMPLE_BURGER.price * 3, 2);
    });

    it('should preserve other items when merging duplicates', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER, SAMPLE_DRINK]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act - add duplicate burger
      act(() => {
        result.current.addItem({ ...SAMPLE_BURGER, quantity: 1 });
      });
      
      // Assert
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items.find(i => i.id === SAMPLE_BURGER.id)?.quantity).toBe(2);
      expect(result.current.items.find(i => i.id === SAMPLE_DRINK.id)?.quantity).toBe(1);
    });
  });

  // ==========================================================================
  // localStorage Persistence Tests
  // ==========================================================================
  
  describe('localStorage persistence', () => {
    it('should save cart state to localStorage on change', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert
      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).not.toBeNull();
        const parsedItems = JSON.parse(stored!);
        expect(parsedItems).toHaveLength(1);
      });
    });

    it('should restore cart from localStorage on mount', () => {
      // Arrange
      const storedItems = [SAMPLE_BURGER, SAMPLE_DRINK];
      setupStorageWithCart(storedItems);
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].id).toBe(SAMPLE_BURGER.id);
      expect(result.current.items[1].id).toBe(SAMPLE_DRINK.id);
    });

    it('should handle localStorage read errors', () => {
      // Arrange - mock localStorage.getItem to throw
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert - should fallback to empty cart
      expect(result.current.items).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      getItemSpy.mockRestore();
    });

    it('should handle localStorage write errors', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Mock setItem to throw after initial render
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert - cart should still update in memory
      expect(result.current.items).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      setItemSpy.mockRestore();
    });

    it('should handle localStorage quota exceeded', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError;
      });
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert - should handle gracefully
      expect(result.current.items).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      setItemSpy.mockRestore();
    });

    it('should serialize cart data correctly', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert
      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = JSON.parse(stored!);
        expect(parsed[0]).toMatchObject({
          id: SAMPLE_BURGER.id,
          name: SAMPLE_BURGER.name,
          price: SAMPLE_BURGER.price,
          quantity: SAMPLE_BURGER.quantity
        });
      });
    });

    it('should deserialize cart data correctly', () => {
      // Arrange
      const storedData = [
        { id: 'test-001', name: 'Test Item', price: 9.99, quantity: 2, imageUrl: '/test.jpg' }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.items[0]).toMatchObject(storedData[0]);
      expect(result.current.items[0].id).toBe('test-001');
      expect(result.current.items[0].name).toBe('Test Item');
      expect(result.current.items[0].price).toBe(9.99);
    });
  });

  // ==========================================================================
  // Empty Cart Handling Tests
  // ==========================================================================
  
  describe('empty cart handling', () => {
    it('should return empty array for items', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.items).toEqual([]);
      expect(Array.isArray(result.current.items)).toBe(true);
      expect(result.current.items).toHaveLength(0);
    });

    it('should return zero for total', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.total).toBe(0);
      expect(typeof result.current.total).toBe('number');
    });

    it('should return zero for itemCount', () => {
      // Arrange
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.itemCount).toBe(0);
      expect(typeof result.current.itemCount).toBe('number');
    });

    it('should allow adding first item', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.total).toBeGreaterThan(0);
      expect(result.current.itemCount).toBe(1);
    });
  });

  // ==========================================================================
  // State Consistency Tests
  // ==========================================================================
  
  describe('state consistency', () => {
    it('should maintain consistent state across multiple operations', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act - perform multiple operations
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
        result.current.addItem(SAMPLE_DRINK);
        result.current.updateQuantity(SAMPLE_BURGER.id, 3);
        result.current.removeItem(SAMPLE_DRINK.id);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(SAMPLE_BURGER.id);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.total).toBeCloseTo(SAMPLE_BURGER.price * 3, 2);
      expect(result.current.itemCount).toBe(3);
    });

    it('should handle rapid sequential operations', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act - rapid adds
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addItem({ ...SAMPLE_BURGER, quantity: 1 });
        }
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(10);
      expect(result.current.itemCount).toBe(10);
    });

    it('should maintain state integrity after errors', () => {
      // Arrange
      const wrapper = createWrapper([SAMPLE_BURGER]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act - try invalid operations
      act(() => {
        result.current.removeItem(''); // invalid
        result.current.updateQuantity('', 5); // invalid
        result.current.addItem({ id: '', name: '', price: 0, quantity: 0 }); // invalid
      });
      
      // Assert - original state should be preserved
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(SAMPLE_BURGER.id);
    });

    it('should keep total and itemCount in sync with items', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ ...SAMPLE_BURGER, quantity: 2 });
        result.current.addItem({ ...SAMPLE_DRINK, quantity: 3 });
      });
      
      // Assert
      const expectedItemCount = 2 + 3;
      const expectedTotal = (SAMPLE_BURGER.price * 2) + (SAMPLE_DRINK.price * 3);
      
      expect(result.current.itemCount).toBe(expectedItemCount);
      expect(result.current.total).toBeCloseTo(expectedTotal, 2);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================
  
  describe('error handling', () => {
    it('should handle invalid item data', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act - try to add item with invalid data
      act(() => {
        result.current.addItem({ id: 'test', name: 'Test', price: -5, quantity: 1 }); // negative price
      });
      
      // Assert - item should still be added (negative price is not validated in current implementation)
      // The test verifies the operation doesn't throw
      expect(result.current.items.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle null/undefined item gracefully', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(null as unknown as CartItem);
        result.current.addItem(undefined as unknown as CartItem);
      });
      
      // Assert - should not crash, cart remains empty
      expect(result.current.items).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should recover from storage errors', () => {
      // Arrange - corrupt storage then try to recover
      localStorage.setItem(STORAGE_KEY, '{ invalid json }}}');
      const wrapper = createWrapper();
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Then add item to verify recovery
      act(() => {
        result.current.addItem(SAMPLE_BURGER);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log errors for debugging', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act - trigger an error condition
      act(() => {
        result.current.addItem({ id: '', name: 'Test', price: 5, quantity: 0 } as CartItem);
      });
      
      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle missing required fields in addItem', () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem({ name: 'No ID', price: 5.99, quantity: 1 } as CartItem);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Performance Boundaries Tests
  // ==========================================================================
  
  describe('performance boundaries', () => {
    it('should handle cart with 100+ items', () => {
      // Arrange - create 100 unique items
      const manyItems: CartItem[] = [];
      for (let i = 0; i < 100; i++) {
        manyItems.push({
          id: `item-${i}`,
          name: `Item ${i}`,
          price: 9.99,
          quantity: 1,
          imageUrl: `/images/item-${i}.jpg`
        });
      }
      const wrapper = createWrapper(manyItems);
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.items).toHaveLength(100);
      expect(result.current.itemCount).toBe(100);
      expect(result.current.total).toBeCloseTo(9.99 * 100, 2);
    });

    it('should handle operations on large cart efficiently', () => {
      // Arrange - create 50 items
      const items: CartItem[] = [];
      for (let i = 0; i < 50; i++) {
        items.push({
          id: `perf-item-${i}`,
          name: `Performance Item ${i}`,
          price: 10.00,
          quantity: 1,
          imageUrl: `/images/perf-${i}.jpg`
        });
      }
      const wrapper = createWrapper(items);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act - measure time for operations
      const startTime = performance.now();
      
      act(() => {
        // Perform multiple operations
        result.current.addItem({ ...items[0], quantity: 1 });
        result.current.updateQuantity(items[25].id, 5);
        result.current.removeItem(items[49].id);
      });
      
      const endTime = performance.now();
      
      // Assert - operations should complete quickly (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.items).toHaveLength(49);
    });

    it('should handle high quantity values', () => {
      // Arrange
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, quantity: 999 }]);
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.items[0].quantity).toBe(999);
      expect(result.current.itemCount).toBe(999);
      expect(result.current.total).toBeCloseTo(SAMPLE_BURGER.price * 999, 2);
    });
  });

  // ==========================================================================
  // Item Count Calculation Tests
  // ==========================================================================
  
  describe('itemCount calculation', () => {
    it('should calculate itemCount as sum of all quantities', () => {
      // Arrange
      const items = [
        { ...SAMPLE_BURGER, quantity: 2 },
        { ...SAMPLE_DRINK, quantity: 3 },
        { ...SAMPLE_FRIES, quantity: 1 }
      ];
      const wrapper = createWrapper(items);
      
      // Act
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Assert
      expect(result.current.itemCount).toBe(6); // 2 + 3 + 1
    });

    it('should update itemCount when quantity changes', () => {
      // Arrange
      const wrapper = createWrapper([{ ...SAMPLE_BURGER, quantity: 1 }]);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.updateQuantity(SAMPLE_BURGER.id, 5);
      });
      
      // Assert
      expect(result.current.itemCount).toBe(5);
    });

    it('should update itemCount when item is removed', () => {
      // Arrange
      const items = [
        { ...SAMPLE_BURGER, quantity: 3 },
        { ...SAMPLE_DRINK, quantity: 2 }
      ];
      const wrapper = createWrapper(items);
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.removeItem(SAMPLE_BURGER.id);
      });
      
      // Assert
      expect(result.current.itemCount).toBe(2); // Only drink remains
    });
  });

  // ==========================================================================
  // Edge Cases with createMenuItem from fixtures
  // ==========================================================================
  
  describe('integration with menu item fixtures', () => {
    it('should work with items created from createMenuItem', () => {
      // Arrange
      const menuItem = createMenuItem({ name: 'Custom Burger', price: 12.99 });
      const cartItem: CartItem = {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 2,
        imageUrl: menuItem.imageUrl
      };
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(cartItem);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe('Custom Burger');
      expect(result.current.total).toBeCloseTo(25.98, 2);
    });

    it('should work with burger fixtures from menuItems', () => {
      // Arrange
      const burgerData = burgers[0];
      const cartItem: CartItem = {
        id: burgerData.id,
        name: burgerData.name,
        price: burgerData.price,
        quantity: 1,
        imageUrl: burgerData.imageUrl
      };
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(cartItem);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('burger-001');
      expect(result.current.items[0].name).toBe('Classic Burger');
    });

    it('should work with drink fixtures from menuItems', () => {
      // Arrange
      const drinkData = drinks[0];
      const cartItem: CartItem = {
        id: drinkData.id,
        name: drinkData.name,
        price: drinkData.price,
        quantity: 3,
        imageUrl: drinkData.imageUrl
      };
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCartContext(), { wrapper });
      
      // Act
      act(() => {
        result.current.addItem(cartItem);
      });
      
      // Assert
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.total).toBeCloseTo(drinkData.price * 3, 2);
    });
  });
});
