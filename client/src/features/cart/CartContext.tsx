/**
 * @fileoverview Cart context provider for managing shopping cart state
 * @module features/cart/CartContext
 * 
 * This module provides a React context for shopping cart functionality,
 * including state management for cart items, quantities, and totals.
 * It handles localStorage persistence and provides hooks for consuming
 * cart state throughout the application.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Represents a single item in the shopping cart
 * @interface CartItem
 */
export interface CartItem {
  /** Unique identifier for the cart item */
  id: string;
  /** Display name of the item */
  name: string;
  /** Price per unit in the local currency */
  price: number;
  /** Quantity of this item in the cart */
  quantity: number;
  /** Optional URL for the item's image */
  imageUrl?: string;
}

/**
 * Represents the current state of the shopping cart
 * @interface CartState
 */
export interface CartState {
  /** Array of items currently in the cart */
  items: CartItem[];
  /** Total price of all items in the cart */
  total: number;
  /** Total count of all items (sum of quantities) */
  itemCount: number;
}

/**
 * Complete context value including state and operations
 * @interface CartContextValue
 */
export interface CartContextValue extends CartState {
  /** Add a new item to the cart or update quantity if item exists */
  addItem: (item: CartItem) => void;
  /** Remove an item from the cart by its ID */
  removeItem: (id: string) => void;
  /** Update the quantity of an existing item */
  updateQuantity: (id: string, quantity: number) => void;
  /** Remove all items from the cart */
  clearCart: () => void;
}

/**
 * Props for the CartProvider component
 * @interface CartProviderProps
 */
export interface CartProviderProps {
  /** Child components that will have access to the cart context */
  children: ReactNode;
  /** Optional initial state for testing purposes */
  initialState?: Partial<CartState>;
}

/** Local storage key for persisting cart data */
const CART_STORAGE_KEY = 'burger-website-cart';

/**
 * Default cart state with empty values
 * Used as fallback when no cart data exists
 */
const DEFAULT_CART_STATE: CartState = {
  items: [],
  total: 0,
  itemCount: 0
};

/**
 * React context for cart state and operations
 * Undefined by default, must be used within CartProvider
 */
export const CartContext = createContext<CartContextValue | undefined>(undefined);

/**
 * Calculates the total price of all items in the cart
 * @param items - Array of cart items
 * @returns Total price rounded to 2 decimal places
 */
function calculateTotal(items: CartItem[]): number {
  const total = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  // Round to 2 decimal places to avoid floating point issues
  return Math.round(total * 100) / 100;
}

/**
 * Calculates the total count of items in the cart
 * @param items - Array of cart items
 * @returns Sum of all item quantities
 */
function calculateItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

/**
 * Loads cart data from localStorage
 * @returns Stored cart items or empty array if none exist
 */
function loadCartFromStorage(): CartItem[] {
  try {
    if (typeof window === 'undefined') {
      return [];
    }
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (storedCart) {
      const parsed = JSON.parse(storedCart);
      // Validate that parsed data is an array of items with required fields
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is CartItem => {
          return (
            typeof item === 'object' &&
            item !== null &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.price === 'number' &&
            typeof item.quantity === 'number' &&
            item.quantity > 0
          );
        });
      }
    }
    return [];
  } catch (error) {
    // If localStorage fails (e.g., in private browsing), return empty array
    console.error('Failed to load cart from localStorage:', error);
    return [];
  }
}

/**
 * Saves cart items to localStorage
 * @param items - Array of cart items to persist
 */
function saveCartToStorage(items: CartItem[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  } catch (error) {
    // If localStorage fails (e.g., quota exceeded), log error but don't crash
    console.error('Failed to save cart to localStorage:', error);
  }
}

/**
 * Cart Provider component that manages shopping cart state
 * 
 * @description
 * Provides cart state and operations to all child components through React context.
 * Features include:
 * - Adding items to cart (with quantity merging for existing items)
 * - Removing items from cart
 * - Updating item quantities
 * - Clearing the entire cart
 * - Automatic persistence to localStorage
 * - Support for initial state injection (useful for testing)
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <CartProvider>
 *   <App />
 * </CartProvider>
 * 
 * // With initial state for testing
 * <CartProvider initialState={{ items: mockItems }}>
 *   <ComponentToTest />
 * </CartProvider>
 * ```
 * 
 * @param props - Component props
 * @param props.children - Child components
 * @param props.initialState - Optional initial state for testing
 * @returns Provider component wrapping children
 */
export function CartProvider({ children, initialState }: CartProviderProps): React.ReactElement {
  // Initialize state from localStorage or provided initial state
  const [items, setItems] = useState<CartItem[]>(() => {
    // If initial state is provided (e.g., for testing), use it
    if (initialState?.items) {
      return initialState.items;
    }
    // Otherwise, attempt to load from localStorage
    return loadCartFromStorage();
  });

  // Calculate derived state values
  const total = calculateTotal(items);
  const itemCount = calculateItemCount(items);

  // Persist cart to localStorage whenever items change
  useEffect(() => {
    // Only persist if not using test initial state with items
    // This prevents test state from being persisted
    if (!initialState?.items) {
      saveCartToStorage(items);
    }
  }, [items, initialState?.items]);

  /**
   * Adds an item to the cart
   * If the item already exists, increases its quantity
   * @param item - Item to add to the cart
   */
  const addItem = (item: CartItem): void => {
    if (!item || !item.id || typeof item.quantity !== 'number' || item.quantity <= 0) {
      console.error('Invalid item provided to addItem:', item);
      return;
    }

    setItems((currentItems) => {
      const existingItemIndex = currentItems.findIndex((i) => i.id === item.id);

      if (existingItemIndex >= 0) {
        // Item exists, update quantity
        const updatedItems = [...currentItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + item.quantity,
          // Update other properties in case they changed (e.g., price)
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl
        };
        return updatedItems;
      }

      // Item doesn't exist, add new item
      return [...currentItems, { ...item }];
    });
  };

  /**
   * Removes an item from the cart by its ID
   * @param id - ID of the item to remove
   */
  const removeItem = (id: string): void => {
    if (!id || typeof id !== 'string') {
      console.error('Invalid id provided to removeItem:', id);
      return;
    }

    setItems((currentItems) => {
      return currentItems.filter((item) => item.id !== id);
    });
  };

  /**
   * Updates the quantity of an existing cart item
   * If quantity is 0 or less, removes the item from cart
   * @param id - ID of the item to update
   * @param quantity - New quantity value
   */
  const updateQuantity = (id: string, quantity: number): void => {
    if (!id || typeof id !== 'string') {
      console.error('Invalid id provided to updateQuantity:', id);
      return;
    }

    if (typeof quantity !== 'number' || isNaN(quantity)) {
      console.error('Invalid quantity provided to updateQuantity:', quantity);
      return;
    }

    // If quantity is 0 or less, remove the item
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((currentItems) => {
      const itemIndex = currentItems.findIndex((item) => item.id === id);

      if (itemIndex < 0) {
        // Item not found, log warning but don't crash
        console.warn('Item not found for updateQuantity:', id);
        return currentItems;
      }

      const updatedItems = [...currentItems];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity: Math.floor(quantity) // Ensure integer quantity
      };
      return updatedItems;
    });
  };

  /**
   * Removes all items from the cart
   */
  const clearCart = (): void => {
    setItems([]);
  };

  // Construct the context value
  const contextValue: CartContextValue = {
    items,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

/**
 * Custom hook for accessing cart context
 * 
 * @description
 * Provides access to cart state and operations from any component
 * within the CartProvider tree. Throws an error if used outside
 * of a CartProvider.
 * 
 * @example
 * ```tsx
 * function AddToCartButton({ item }) {
 *   const { addItem, itemCount } = useCartContext();
 *   
 *   return (
 *     <button onClick={() => addItem(item)}>
 *       Add to Cart ({itemCount})
 *     </button>
 *   );
 * }
 * ```
 * 
 * @returns Cart context value with state and operations
 * @throws Error if used outside of CartProvider
 */
export function useCartContext(): CartContextValue {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error(
      'useCartContext must be used within a CartProvider. ' +
      'Wrap your component tree with <CartProvider> to access cart state.'
    );
  }

  return context;
}
