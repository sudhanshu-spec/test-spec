/**
 * @fileoverview useCart custom hook for cart operations
 * @module features/cart/hooks/useCart
 * 
 * This module provides a custom React hook that wraps the CartContext
 * for easier component consumption. It provides convenience methods
 * and validation logic for cart operations including quantity limits
 * and input validation.
 */

import { useCallback } from 'react';
import { useCartContext, CartItem } from '../CartContext';

/**
 * Maximum quantity allowed per item in the cart
 * Prevents unreasonable order quantities
 */
export const MAX_QUANTITY = 99;

/**
 * Minimum quantity allowed per item in the cart
 * Items with quantity below this are automatically removed
 */
const MIN_QUANTITY = 1;

/**
 * Input type for menu items when adding to cart
 * Excludes quantity since it's handled separately
 * @interface MenuItemInput
 */
export interface MenuItemInput {
  /** Unique identifier for the menu item */
  id: string;
  /** Display name of the menu item */
  name: string;
  /** Price per unit in the local currency */
  price: number;
  /** Optional URL for the item's image */
  imageUrl?: string;
}

/**
 * Parameters for the addItem operation
 * @interface AddItemParams
 */
export interface AddItemParams {
  /** Menu item to add to the cart */
  menuItem: MenuItemInput;
  /** Quantity to add (defaults to 1) */
  quantity?: number;
}

/**
 * Return type for the useCart hook
 * @interface UseCartResult
 */
export interface UseCartResult {
  /** Array of items currently in the cart */
  items: CartItem[];
  /** Total price of all items in the cart */
  total: number;
  /** Total count of all items (sum of quantities) */
  itemCount: number;
  /** 
   * Add an item to the cart with optional quantity
   * @param params - Object containing menuItem and optional quantity
   */
  addItem: (params: AddItemParams) => void;
  /**
   * Remove an item from the cart by its ID
   * @param id - ID of the item to remove
   */
  removeItem: (id: string) => void;
  /**
   * Update the quantity of an existing cart item
   * @param id - ID of the item to update
   * @param quantity - New quantity value
   */
  updateQuantity: (id: string, quantity: number) => void;
  /**
   * Remove all items from the cart
   */
  clearCart: () => void;
  /**
   * Check if a specific item is in the cart
   * @param id - ID of the item to check
   * @returns True if item is in cart, false otherwise
   */
  isInCart: (id: string) => boolean;
  /**
   * Get the quantity of a specific item in the cart
   * @param id - ID of the item to check
   * @returns Quantity of the item, or 0 if not in cart
   */
  getItemQuantity: (id: string) => number;
  /**
   * Check if cart is empty
   * @returns True if cart has no items
   */
  isEmpty: boolean;
}

/**
 * Validates that a menu item has all required fields with correct types
 * @param menuItem - Menu item to validate
 * @returns True if menu item is valid, false otherwise
 */
function isValidMenuItem(menuItem: unknown): menuItem is MenuItemInput {
  if (!menuItem || typeof menuItem !== 'object') {
    return false;
  }

  const item = menuItem as Record<string, unknown>;
  
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.name === 'string' &&
    item.name.length > 0 &&
    typeof item.price === 'number' &&
    !isNaN(item.price) &&
    item.price >= 0
  );
}

/**
 * Validates and clamps quantity to valid range
 * @param quantity - Quantity to validate
 * @param existingQuantity - Current quantity in cart (for add operations)
 * @returns Clamped quantity value
 */
function validateQuantity(quantity: number, existingQuantity: number = 0): number {
  // Ensure quantity is a valid number
  if (typeof quantity !== 'number' || isNaN(quantity)) {
    return MIN_QUANTITY;
  }

  // Round to integer
  const intQuantity = Math.floor(quantity);

  // Calculate total quantity including existing
  const totalQuantity = intQuantity + existingQuantity;

  // Clamp to valid range
  if (totalQuantity > MAX_QUANTITY) {
    // Return only the amount that would reach MAX_QUANTITY
    return Math.max(0, MAX_QUANTITY - existingQuantity);
  }

  if (intQuantity < MIN_QUANTITY) {
    return MIN_QUANTITY;
  }

  return intQuantity;
}

/**
 * Custom hook for cart operations with validation and convenience methods
 * 
 * @description
 * Provides a simplified interface for cart operations by wrapping the CartContext.
 * Includes additional features such as:
 * - Input validation for menu items and quantities
 * - Automatic quantity clamping to valid range (1-99)
 * - Convenience methods for checking cart status
 * - Stable function references via useCallback
 * 
 * @example
 * ```tsx
 * function AddToCartButton({ menuItem }) {
 *   const { addItem, isInCart, getItemQuantity } = useCart();
 *   
 *   const handleClick = () => {
 *     addItem({ menuItem, quantity: 1 });
 *   };
 *   
 *   return (
 *     <button onClick={handleClick}>
 *       {isInCart(menuItem.id) 
 *         ? `In Cart (${getItemQuantity(menuItem.id)})` 
 *         : 'Add to Cart'}
 *     </button>
 *   );
 * }
 * ```
 * 
 * @returns Cart state and operations object
 * @throws Error if used outside of CartProvider
 */
export function useCart(): UseCartResult {
  // Get context state and operations
  const context = useCartContext();
  const { items, total, itemCount, addItem: contextAddItem, removeItem: contextRemoveItem, updateQuantity: contextUpdateQuantity, clearCart: contextClearCart } = context;

  /**
   * Add an item to the cart with validation
   * Validates menu item and enforces quantity limits
   */
  const addItem = useCallback((params: AddItemParams): void => {
    const { menuItem, quantity = 1 } = params;

    // Validate menu item
    if (!isValidMenuItem(menuItem)) {
      console.error('useCart: Invalid menu item provided to addItem:', menuItem);
      return;
    }

    // Find existing item to check current quantity
    const existingItem = items.find((item) => item.id === menuItem.id);
    const existingQuantity = existingItem?.quantity ?? 0;

    // Validate and clamp quantity
    const validatedQuantity = validateQuantity(quantity, existingQuantity);

    // Don't add if validated quantity is 0 (already at max)
    if (validatedQuantity <= 0) {
      console.warn(`useCart: Item ${menuItem.id} already at maximum quantity (${MAX_QUANTITY})`);
      return;
    }

    // Create cart item with validated quantity
    const cartItem: CartItem = {
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: validatedQuantity,
      imageUrl: menuItem.imageUrl
    };

    // Add to cart via context
    contextAddItem(cartItem);
  }, [items, contextAddItem]);

  /**
   * Remove an item from the cart by ID
   * Validates ID before removal
   */
  const removeItem = useCallback((id: string): void => {
    // Validate id
    if (!id || typeof id !== 'string') {
      console.error('useCart: Invalid id provided to removeItem:', id);
      return;
    }

    // Remove via context
    contextRemoveItem(id);
  }, [contextRemoveItem]);

  /**
   * Update quantity of an existing cart item
   * Validates quantity and enforces min/max limits
   * Removes item if quantity is 0 or less
   */
  const updateQuantity = useCallback((id: string, quantity: number): void => {
    // Validate id
    if (!id || typeof id !== 'string') {
      console.error('useCart: Invalid id provided to updateQuantity:', id);
      return;
    }

    // Validate quantity is a number
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      console.error('useCart: Invalid quantity provided to updateQuantity:', quantity);
      return;
    }

    // If quantity is 0 or less, remove the item
    if (quantity < MIN_QUANTITY) {
      contextRemoveItem(id);
      return;
    }

    // Clamp quantity to max
    const clampedQuantity = Math.min(Math.floor(quantity), MAX_QUANTITY);

    // Update via context
    contextUpdateQuantity(id, clampedQuantity);
  }, [contextRemoveItem, contextUpdateQuantity]);

  /**
   * Clear all items from the cart
   */
  const clearCart = useCallback((): void => {
    contextClearCart();
  }, [contextClearCart]);

  /**
   * Check if an item is in the cart
   */
  const isInCart = useCallback((id: string): boolean => {
    if (!id || typeof id !== 'string') {
      return false;
    }
    return items.some((item) => item.id === id);
  }, [items]);

  /**
   * Get the quantity of a specific item in the cart
   */
  const getItemQuantity = useCallback((id: string): number => {
    if (!id || typeof id !== 'string') {
      return 0;
    }
    const item = items.find((item) => item.id === id);
    return item?.quantity ?? 0;
  }, [items]);

  /**
   * Check if cart is empty
   */
  const isEmpty = items.length === 0;

  return {
    items,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
    isEmpty
  };
}
