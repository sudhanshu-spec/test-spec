/**
 * @fileoverview Order summary component for displaying order details and totals
 * @module features/order/OrderSummary
 *
 * This component displays a summary of order items including:
 * - Individual item names, quantities, and prices
 * - Special instructions for each item
 * - Subtotal, tax, and total calculations
 * - Empty state for orders with no items
 *
 * Used in the Checkout flow and order confirmation pages.
 */

import React from 'react';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Represents an item within an order.
 * @interface OrderItem
 */
export interface OrderItem {
  /** Reference to the menu item ID */
  menuItemId: string;
  /** Display name of the item */
  name: string;
  /** Quantity ordered */
  quantity: number;
  /** Price per unit */
  price: number;
  /** Optional special preparation instructions */
  specialInstructions?: string;
}

/**
 * Props for the OrderSummary component.
 * @interface OrderSummaryProps
 */
export interface OrderSummaryProps {
  /** Array of items to display in the order summary */
  items: OrderItem[];
  /** Subtotal amount before tax (optional - will be calculated if not provided) */
  subtotal?: number;
  /** Tax rate as a decimal (e.g., 0.08 for 8%) */
  taxRate?: number;
  /** Custom tax amount (overrides calculated tax if provided) */
  taxAmount?: number;
  /** Custom total (overrides calculated total if provided) */
  total?: number;
  /** Whether to show the summary in a compact mode */
  compact?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default tax rate (8%)
 */
const DEFAULT_TAX_RATE = 0.08;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a number as a currency string with two decimal places.
 *
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$9.99")
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Calculates the subtotal for an array of order items.
 *
 * @param items - Array of OrderItem objects
 * @returns Subtotal rounded to 2 decimal places
 */
function calculateSubtotal(items: OrderItem[]): number {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  return Math.round(subtotal * 100) / 100;
}

/**
 * Calculates the tax amount based on subtotal and tax rate.
 *
 * @param subtotal - The subtotal amount before tax
 * @param taxRate - Tax rate as a decimal
 * @returns Tax amount rounded to 2 decimal places
 */
function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * taxRate * 100) / 100;
}

// ============================================================================
// Component
// ============================================================================

/**
 * OrderSummary component displays a summary of order items with totals.
 *
 * @param props - Component props
 * @returns React element displaying order summary
 *
 * @example
 * ```tsx
 * <OrderSummary
 *   items={[
 *     { menuItemId: '1', name: 'Burger', quantity: 2, price: 8.99 },
 *     { menuItemId: '2', name: 'Fries', quantity: 1, price: 3.99 }
 *   ]}
 *   taxRate={0.08}
 * />
 * ```
 */
export function OrderSummary({
  items,
  subtotal: propSubtotal,
  taxRate = DEFAULT_TAX_RATE,
  taxAmount: propTaxAmount,
  total: propTotal,
  compact = false,
}: OrderSummaryProps): React.ReactElement {
  // Calculate values if not provided
  const subtotal = propSubtotal ?? calculateSubtotal(items);
  const taxAmount = propTaxAmount ?? calculateTax(subtotal, taxRate);
  const total = propTotal ?? Math.round((subtotal + taxAmount) * 100) / 100;

  // Empty state
  if (items.length === 0) {
    return (
      <div className="order-summary order-summary--empty">
        <h2>Order Summary</h2>
        <p className="empty-message">No items in your order</p>
        <div className="summary-totals">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(0)}</span>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <span>{formatCurrency(0)}</span>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <span>{formatCurrency(0)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`order-summary ${compact ? 'order-summary--compact' : ''}`}>
      <h2>Order Summary</h2>
      
      {/* Order Items List */}
      <ul className="order-items" role="list">
        {items.map((item, index) => {
          const lineTotal = Math.round(item.price * item.quantity * 100) / 100;
          
          return (
            <li key={`${item.menuItemId}-${index}`} className="order-item">
              <div className="order-item__details">
                <span className="order-item__name">{item.name}</span>
                <span className="order-item__quantity">
                  {item.quantity > 1 ? `x${item.quantity}` : ''}
                </span>
              </div>
              
              <div className="order-item__pricing">
                <span className="order-item__unit-price">
                  {formatCurrency(item.price)}
                </span>
                {item.quantity > 1 && (
                  <span className="order-item__line-total">
                    {formatCurrency(lineTotal)}
                  </span>
                )}
              </div>
              
              {item.specialInstructions && (
                <div className="order-item__instructions">
                  {item.specialInstructions}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Summary Totals */}
      <div className="summary-totals">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="summary-row">
          <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        <div className="summary-row summary-row--total">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default OrderSummary;
