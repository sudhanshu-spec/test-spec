/**
 * @fileoverview Cart summary component displaying cart totals
 * @module features/cart/CartSummary
 *
 * This component provides a summary view of the shopping cart,
 * displaying subtotal, tax, discounts, and grand total calculations.
 * It formats all currency values consistently and provides proper
 * accessibility support for screen readers.
 *
 * Features:
 * - Subtotal calculation from cart items
 * - Tax calculation with configurable rate
 * - Discount application and display
 * - Grand total computation
 * - Item count display with proper singular/plural
 * - Currency formatting with thousands separators
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * // Basic usage with tax
 * <CartSummary items={cartItems} showTax={true} taxRate={0.08} />
 *
 * // With discount applied
 * <CartSummary
 *   items={cartItems}
 *   showTax={true}
 *   taxRate={0.08}
 *   discount={10.00}
 * />
 * ```
 */

import React from 'react';
import type { CartItem } from './CartContext';

/**
 * Props for the CartSummary component
 * @interface CartSummaryProps
 */
export interface CartSummaryProps {
  /** Array of cart items to summarize */
  items: CartItem[];
  /** Whether to show tax in the summary (default: false) */
  showTax?: boolean;
  /** Tax rate as a decimal (e.g., 0.08 for 8%) */
  taxRate?: number;
  /** Optional discount amount to apply */
  discount?: number;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Optional test ID for testing purposes */
  testId?: string;
}

/**
 * Default tax rate when not specified (8%)
 * @constant
 */
const DEFAULT_TAX_RATE = 0.08;

/**
 * Formats a number as currency string (USD format).
 * Uses Intl.NumberFormat for proper localization and thousands separators.
 *
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculates the subtotal from cart items.
 * Multiplies each item's price by quantity and sums them.
 * Uses rounding to avoid floating point precision issues.
 *
 * @param items - Array of cart items
 * @returns Subtotal rounded to 2 decimal places
 */
function calculateSubtotal(items: CartItem[]): number {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  return Math.round(subtotal * 100) / 100;
}

/**
 * Calculates the tax amount.
 *
 * @param subtotal - Subtotal amount
 * @param rate - Tax rate as decimal
 * @returns Tax amount rounded to 2 decimal places
 */
function calculateTax(subtotal: number, rate: number): number {
  const tax = subtotal * rate;
  return Math.round(tax * 100) / 100;
}

/**
 * Calculates the total item count (sum of quantities).
 *
 * @param items - Array of cart items
 * @returns Total count of items
 */
function calculateItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

/**
 * Returns the proper singular or plural form for "item(s)".
 *
 * @param count - Number of items
 * @returns "item" if count is 1, "items" otherwise
 */
function getItemLabel(count: number): string {
  return count === 1 ? 'item' : 'items';
}

/**
 * CartSummary component displaying cart totals.
 *
 * Renders a summary of the shopping cart including subtotal,
 * optional tax calculation, optional discounts, and grand total.
 * All monetary values are formatted as USD currency.
 *
 * @param props - Component props
 * @returns React element for the cart summary
 */
export function CartSummary({
  items,
  showTax = false,
  taxRate = DEFAULT_TAX_RATE,
  discount,
  className = '',
  testId = 'cart-summary',
}: CartSummaryProps): React.ReactElement {
  // Calculate all values
  const subtotal = calculateSubtotal(items);
  const itemCount = calculateItemCount(items);
  
  // Apply discount first if provided
  const afterDiscount = discount && discount > 0 
    ? Math.max(0, subtotal - discount) 
    : subtotal;
  
  // Calculate tax on the amount after discount
  const tax = showTax ? calculateTax(afterDiscount, taxRate) : 0;
  
  // Calculate grand total
  const total = afterDiscount + tax;

  return (
    <div
      className={`cart-summary ${className}`.trim()}
      data-testid={testId}
      role="region"
      aria-label="Cart Summary"
    >
      {/* Item Count */}
      <div className="cart-summary-row cart-summary-item-count">
        <span className="cart-summary-label">
          {itemCount} {getItemLabel(itemCount)}
        </span>
      </div>

      {/* Subtotal */}
      <div className="cart-summary-row cart-summary-subtotal">
        <span className="cart-summary-label">Subtotal</span>
        <span className="cart-summary-value" aria-label={`Subtotal: ${formatCurrency(subtotal)}`}>
          {formatCurrency(subtotal)}
        </span>
      </div>

      {/* Discount (if applied) */}
      {discount !== undefined && discount > 0 && (
        <div className="cart-summary-row cart-summary-discount">
          <span className="cart-summary-label">Discount</span>
          <span 
            className="cart-summary-value cart-summary-discount-value"
            aria-label={`Discount: ${formatCurrency(discount)}`}
          >
            {formatCurrency(discount)}
          </span>
        </div>
      )}

      {/* Tax (if enabled) */}
      {showTax && (
        <div className="cart-summary-row cart-summary-tax">
          <span className="cart-summary-label">Tax ({(taxRate * 100).toFixed(0)}%)</span>
          <span className="cart-summary-value" aria-label={`Tax: ${formatCurrency(tax)}`}>
            {formatCurrency(tax)}
          </span>
        </div>
      )}

      {/* Total */}
      <div 
        className="cart-summary-row cart-summary-total"
        role="status"
        aria-live="polite"
      >
        <span className="cart-summary-label cart-summary-total-label">Total</span>
        <span 
          className="cart-summary-value cart-summary-total-value"
          aria-label={`Total: ${formatCurrency(total)}`}
        >
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

// Named export for consistency with other components
export default CartSummary;
