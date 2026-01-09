/**
 * @fileoverview Shopping cart component displaying cart items and totals
 * @module features/cart/Cart
 * 
 * This component provides the main shopping cart view for the burger website,
 * displaying all items in the cart with quantity controls, item removal
 * functionality, and a summary of totals. It integrates with the CartContext
 * for state management and provides a seamless checkout initiation experience.
 * 
 * Features:
 * - Display list of cart items with name, price, and quantity
 * - Quantity adjustment controls (increment/decrement)
 * - Remove item functionality
 * - Cart totals summary display
 * - Empty cart state with call-to-action to browse menu
 * - Checkout button with customizable callback
 * - Full accessibility support with ARIA labels
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Cart />
 * 
 * // With checkout handler and summary
 * <Cart 
 *   onCheckout={() => navigate('/checkout')} 
 *   showSummary={true}
 * />
 * ```
 */

import React from 'react';
import { useCartContext, CartItem as CartItemType } from './CartContext';

/**
 * Props for the Cart component
 * @interface CartProps
 */
export interface CartProps {
  /** Optional callback function invoked when checkout button is clicked */
  onCheckout?: () => void;
  /** Whether to display the cart summary section with totals (default: true) */
  showSummary?: boolean;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Optional test ID for testing purposes */
  testId?: string;
}

/**
 * Formats a price value as currency string
 * @param price - The price value to format
 * @returns Formatted price string with dollar sign and 2 decimal places
 */
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Individual cart item display component
 * Renders a single item with quantity controls and remove button
 * 
 * @param props - Component props
 * @param props.item - The cart item to display
 * @param props.onUpdateQuantity - Callback for quantity changes
 * @param props.onRemove - Callback for item removal
 * @returns React element for the cart item row
 */
function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove
}: {
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}): React.ReactElement {
  /**
   * Handles decrement button click
   * Decreases quantity by 1, minimum of 1
   */
  const handleDecrement = (): void => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  /**
   * Handles increment button click
   * Increases quantity by 1, maximum of 99
   */
  const handleIncrement = (): void => {
    if (item.quantity < 99) {
      onUpdateQuantity(item.id, item.quantity + 1);
    }
  };

  /**
   * Handles remove button click
   * Removes the item from the cart
   */
  const handleRemove = (): void => {
    onRemove(item.id);
  };

  const itemTotal = item.price * item.quantity;

  return (
    <div
      className="cart-item"
      data-testid={`cart-item-${item.id}`}
      role="listitem"
      aria-label={`${item.name}, quantity ${item.quantity}, ${formatPrice(itemTotal)}`}
    >
      <div className="cart-item-image">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="cart-item-thumbnail"
            loading="lazy"
          />
        ) : (
          <div 
            className="cart-item-placeholder"
            aria-hidden="true"
          >
            🍔
          </div>
        )}
      </div>

      <div className="cart-item-details">
        <h3 className="cart-item-name">{item.name}</h3>
        <p className="cart-item-price" aria-label={`Price: ${formatPrice(item.price)} each`}>
          {formatPrice(item.price)}
        </p>
      </div>

      <div className="cart-item-quantity" role="group" aria-label={`Quantity for ${item.name}`}>
        <button
          type="button"
          className="quantity-button quantity-decrement"
          onClick={handleDecrement}
          disabled={item.quantity <= 1}
          aria-label={`Decrease quantity of ${item.name}`}
          aria-disabled={item.quantity <= 1}
        >
          −
        </button>
        <span 
          className="quantity-value"
          aria-live="polite"
          aria-atomic="true"
        >
          {item.quantity}
        </span>
        <button
          type="button"
          className="quantity-button quantity-increment"
          onClick={handleIncrement}
          disabled={item.quantity >= 99}
          aria-label={`Increase quantity of ${item.name}`}
          aria-disabled={item.quantity >= 99}
        >
          +
        </button>
      </div>

      <div className="cart-item-total">
        <span className="item-total-label" aria-hidden="true">Total:</span>
        <span className="item-total-value" aria-label={`Item total: ${formatPrice(itemTotal)}`}>
          {formatPrice(itemTotal)}
        </span>
      </div>

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

/**
 * Cart summary component displaying totals
 * Shows item count and total price
 * 
 * @param props - Component props
 * @param props.itemCount - Total number of items in cart
 * @param props.total - Total price of all items
 * @returns React element for the cart summary
 */
function CartSummarySection({
  itemCount,
  total
}: {
  itemCount: number;
  total: number;
}): React.ReactElement {
  return (
    <div 
      className="cart-summary"
      data-testid="cart-summary"
      role="region"
      aria-label="Cart summary"
    >
      <div className="cart-summary-row">
        <span className="cart-summary-label">Items:</span>
        <span className="cart-summary-value" aria-label={`${itemCount} items in cart`}>
          {itemCount}
        </span>
      </div>
      <div className="cart-summary-row cart-summary-total">
        <span className="cart-summary-label">Subtotal:</span>
        <span 
          className="cart-summary-value"
          aria-label={`Subtotal: ${formatPrice(total)}`}
        >
          {formatPrice(total)}
        </span>
      </div>
      <p className="cart-summary-note">
        Tax and delivery fees calculated at checkout
      </p>
    </div>
  );
}

/**
 * Empty cart display component
 * Shows message and call-to-action when cart is empty
 * 
 * @returns React element for empty cart state
 */
function EmptyCart(): React.ReactElement {
  return (
    <div 
      className="cart-empty"
      data-testid="cart-empty"
      role="status"
      aria-label="Your cart is empty"
    >
      <div className="cart-empty-icon" aria-hidden="true">
        🛒
      </div>
      <h2 className="cart-empty-title">Your cart is empty</h2>
      <p className="cart-empty-message">
        Looks like you haven&apos;t added any delicious burgers yet!
      </p>
      <a 
        href="/menu" 
        className="cart-empty-cta"
        role="button"
        aria-label="Browse our menu to add items"
      >
        Browse Menu
      </a>
    </div>
  );
}

/**
 * Shopping Cart component
 * 
 * Main cart display component that shows all items in the cart with
 * quantity controls, removal options, and a summary of totals.
 * Provides checkout functionality through an optional callback.
 * 
 * The component handles three main states:
 * 1. Loading state (while context initializes)
 * 2. Empty cart state (shows call-to-action)
 * 3. Populated cart state (shows items and controls)
 * 
 * @param props - Component props
 * @param props.onCheckout - Optional callback for checkout button
 * @param props.showSummary - Whether to show cart summary (default: true)
 * @param props.className - Optional additional CSS class
 * @param props.testId - Optional test ID for testing
 * @returns React element representing the shopping cart
 * 
 * @example
 * ```tsx
 * // Basic cart display
 * <Cart />
 * 
 * // Cart with checkout handler
 * <Cart onCheckout={() => navigate('/checkout')} />
 * 
 * // Cart without summary section
 * <Cart showSummary={false} />
 * ```
 */
export function Cart({
  onCheckout,
  showSummary = true,
  className = '',
  testId = 'cart'
}: CartProps): React.ReactElement {
  // Access cart state and operations from context
  const { items, total, itemCount, updateQuantity, removeItem, clearCart } = useCartContext();

  /**
   * Handles checkout button click
   * Invokes the onCheckout callback if provided
   */
  const handleCheckout = (): void => {
    if (onCheckout) {
      onCheckout();
    }
  };

  /**
   * Handles clear cart button click
   * Removes all items from the cart
   */
  const handleClearCart = (): void => {
    clearCart();
  };

  // Render empty cart state when no items
  if (items.length === 0) {
    return (
      <section
        className={`cart cart-is-empty ${className}`.trim()}
        data-testid={testId}
        aria-label="Shopping cart"
      >
        <EmptyCart />
      </section>
    );
  }

  // Render populated cart with items
  return (
    <section
      className={`cart ${className}`.trim()}
      data-testid={testId}
      aria-label="Shopping cart"
    >
      <header className="cart-header">
        <h1 className="cart-title">Your Cart</h1>
        <span className="cart-item-count" aria-label={`${itemCount} items in cart`}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </header>

      <div 
        className="cart-items"
        role="list"
        aria-label="Cart items"
      >
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>

      {showSummary && (
        <CartSummarySection
          itemCount={itemCount}
          total={total}
        />
      )}

      <div className="cart-actions">
        <button
          type="button"
          className="cart-clear-button"
          onClick={handleClearCart}
          aria-label="Clear all items from cart"
        >
          Clear Cart
        </button>
        
        <button
          type="button"
          className="cart-checkout-button"
          onClick={handleCheckout}
          disabled={!onCheckout}
          aria-label={`Proceed to checkout with ${itemCount} items totaling ${formatPrice(total)}`}
          aria-disabled={!onCheckout}
        >
          Checkout {formatPrice(total)}
        </button>
      </div>
    </section>
  );
}
