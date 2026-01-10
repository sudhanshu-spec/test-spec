/**
 * @fileoverview CartItem component for displaying individual cart items
 * @module features/cart/CartItem
 * 
 * This component provides the individual cart item display with:
 * - Item name, price, and image display
 * - Quantity controls (increment/decrement buttons)
 * - Remove item functionality
 * - Line total calculation and display
 * - Full accessibility support with ARIA labels
 * 
 * @example
 * ```tsx
 * <CartItem
 *   item={cartItem}
 *   onQuantityChange={(id, qty) => updateQuantity(id, qty)}
 *   onRemove={(id) => removeItem(id)}
 * />
 * ```
 */

import React, { useState } from 'react';
import { CartItem as CartItemType } from './CartContext';

/**
 * Props for the CartItem component
 * @interface CartItemProps
 */
export interface CartItemProps {
  /** The cart item data to display */
  item: CartItemType;
  /** Callback when quantity is changed */
  onQuantityChange: (id: string, quantity: number) => void;
  /** Callback when item is removed */
  onRemove: (id: string) => void;
  /** Maximum allowed quantity (defaults to 99) */
  maxQuantity?: number;
}

/** Default maximum quantity for cart items */
const DEFAULT_MAX_QUANTITY = 99;

/** Minimum quantity for cart items (cannot go below 1) */
const MIN_QUANTITY = 1;

/** Default fallback image URL for items without images */
const FALLBACK_IMAGE_URL = '/images/placeholder.jpg';

/**
 * Formats a price value as currency string
 * @param price - The price value to format
 * @returns Formatted price string with dollar sign and 2 decimal places
 */
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Calculates the line total for a cart item
 * @param price - Unit price
 * @param quantity - Item quantity
 * @returns Line total rounded to 2 decimal places
 */
function calculateLineTotal(price: number, quantity: number): number {
  return Math.round(price * quantity * 100) / 100;
}

/**
 * CartItem component displays an individual item in the shopping cart
 * 
 * Features:
 * - Displays item name, price, quantity, and image
 * - Provides increment/decrement buttons for quantity control
 * - Shows line total (price × quantity)
 * - Includes remove button with accessibility support
 * - Handles image loading errors with fallback
 * 
 * @param props - Component props
 * @returns React element for the cart item display
 */
export function CartItem({
  item,
  onQuantityChange,
  onRemove,
  maxQuantity = DEFAULT_MAX_QUANTITY,
}: CartItemProps): React.ReactElement {
  const [imageError, setImageError] = useState(false);
  
  const lineTotal = calculateLineTotal(item.price, item.quantity);
  const isAtMinQuantity = item.quantity <= MIN_QUANTITY;
  const isAtMaxQuantity = item.quantity >= maxQuantity;

  /**
   * Handles decrement button click
   * Decreases quantity by 1, minimum of MIN_QUANTITY
   */
  const handleDecrement = (): void => {
    if (!isAtMinQuantity) {
      onQuantityChange(item.id, item.quantity - 1);
    }
  };

  /**
   * Handles increment button click
   * Increases quantity by 1, maximum of maxQuantity
   */
  const handleIncrement = (): void => {
    if (!isAtMaxQuantity) {
      onQuantityChange(item.id, item.quantity + 1);
    }
  };

  /**
   * Handles remove button click
   * Removes the item from the cart
   */
  const handleRemove = (): void => {
    onRemove(item.id);
  };

  /**
   * Handles image loading error
   * Sets imageError state to trigger fallback display
   */
  const handleImageError = (): void => {
    setImageError(true);
  };

  /**
   * Determines the image source to display
   * Uses fallback if no image URL provided or if image failed to load
   */
  const getImageSource = (): string => {
    if (imageError || !item.imageUrl) {
      return FALLBACK_IMAGE_URL;
    }
    return item.imageUrl;
  };

  return (
    <div
      className="cart-item"
      data-testid={`cart-item-${item.id}`}
      role="listitem"
      aria-label={`${item.name}, quantity ${item.quantity}, ${formatPrice(lineTotal)}`}
    >
      {/* Item Image */}
      <div className="cart-item-image">
        {item.imageUrl || imageError ? (
          <img
            src={getImageSource()}
            alt={`${item.name}`}
            className="cart-item-thumbnail"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div 
            className="cart-item-placeholder"
            data-testid="image-placeholder"
            aria-hidden="true"
          >
            🍔
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="cart-item-details">
        <h3 
          className="cart-item-name"
          data-testid="cart-item-name"
        >
          {item.name}
        </h3>
        <p 
          className="cart-item-price"
          data-testid="cart-item-price"
          aria-label={`Price: ${formatPrice(item.price)} each`}
        >
          {formatPrice(item.price)}
        </p>
      </div>

      {/* Quantity Controls */}
      <div 
        className="cart-item-quantity" 
        role="group" 
        aria-label={`Quantity for ${item.name}`}
      >
        <button
          type="button"
          className="quantity-button quantity-decrement"
          onClick={handleDecrement}
          disabled={isAtMinQuantity}
          aria-label={`Decrease quantity of ${item.name}`}
          aria-disabled={isAtMinQuantity}
        >
          −
        </button>
        <span 
          className="quantity-value"
          data-testid="cart-item-quantity"
          aria-live="polite"
          aria-atomic="true"
        >
          {item.quantity}
        </span>
        <button
          type="button"
          className="quantity-button quantity-increment"
          onClick={handleIncrement}
          disabled={isAtMaxQuantity}
          aria-label={`Increase quantity of ${item.name}`}
          aria-disabled={isAtMaxQuantity}
        >
          +
        </button>
      </div>

      {/* Line Total */}
      <div className="cart-item-total">
        <span className="item-total-label" aria-hidden="true">Total:</span>
        <span 
          className="item-total-value"
          data-testid="cart-item-line-total"
          aria-label={`Item total: ${formatPrice(lineTotal)}`}
        >
          {formatPrice(lineTotal)}
        </span>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        className="cart-item-remove"
        onClick={handleRemove}
        aria-label={`Remove ${item.name} from cart`}
      >
        ✕
      </button>
    </div>
  );
}

export default CartItem;
