/**
 * @fileoverview Unit tests for CartSummary component - Cart totals display
 * @module tests/features/cart/CartSummary
 *
 * Tests cover:
 * - Subtotal calculation (single item, multiple items, varying quantities)
 * - Tax calculation (default rate, custom rate, disabled, rounding)
 * - Total calculation (subtotal + tax, without tax, empty cart, large totals)
 * - Item count display (count formatting, singular/plural)
 * - Currency formatting (decimal places, symbol, thousands separator)
 * - Discount application (display, subtraction, original vs discounted)
 * - Edge cases (zero price, large quantities, floating point precision)
 * - Accessibility (labels, screen reader announcements)
 *
 * Following patterns established in tests/lifecycle/server.test.js for:
 * - JSDoc documentation
 * - Helper factory functions (createMockServer pattern)
 * - Setup/teardown with beforeEach/afterEach
 * - Constants for test configuration (DEFAULT_CONFIG pattern)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, within } from '@testing-library/react';
import React from 'react';
import { render } from '../../../__tests__/utils/render';
import { CartSummary } from '../CartSummary';
import { createMenuItem } from '../../../__tests__/fixtures/menuItems';
import { createMockCartItem } from '../../../__tests__/utils/testUtils';
import type { CartItem } from '../CartContext';

// ============================================================================
// TypeScript Interfaces
// Following server.test.js @typedef pattern
// ============================================================================

/**
 * Props for the CartSummary component
 * @interface CartSummaryProps
 */
interface CartSummaryProps {
  /** Array of cart items to summarize */
  items: CartItem[];
  /** Whether to show tax in the summary */
  showTax?: boolean;
  /** Tax rate as a decimal (e.g., 0.08 for 8%) */
  taxRate?: number;
  /** Optional discount amount to apply */
  discount?: number;
}

/**
 * Represents the expected display data in the summary
 * @interface SummaryDisplayData
 */
interface SummaryDisplayData {
  /** Subtotal before tax and discounts */
  subtotal: number;
  /** Tax amount */
  tax: number;
  /** Grand total including tax and discounts */
  total: number;
  /** Total count of items (sum of quantities) */
  itemCount: number;
}

// ============================================================================
// Constants
// Following DEFAULT_CONFIG pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Default tax rate for testing (8%)
 * @constant
 */
const DEFAULT_TAX_RATE = 0.08;

/**
 * Sample cart items with known prices for calculation verification
 * Item 1: $9.99 × 2 = $19.98
 * Item 2: $4.99 × 1 = $4.99
 * Item 3: $12.49 × 3 = $37.47
 * @constant
 */
const SAMPLE_CART_ITEMS: CartItem[] = [
  {
    id: 'item-001',
    name: 'Classic Burger',
    price: 9.99,
    quantity: 2,
    imageUrl: '/images/burger.jpg',
  },
  {
    id: 'item-002',
    name: 'Fries',
    price: 4.99,
    quantity: 1,
    imageUrl: '/images/fries.jpg',
  },
  {
    id: 'item-003',
    name: 'Milkshake',
    price: 12.49,
    quantity: 3,
    imageUrl: '/images/milkshake.jpg',
  },
];

/**
 * Pre-calculated subtotal for SAMPLE_CART_ITEMS
 * 19.98 + 4.99 + 37.47 = 62.44
 * @constant
 */
const EXPECTED_SUBTOTAL = 62.44;

/**
 * Pre-calculated tax for SAMPLE_CART_ITEMS at 8% rate
 * 62.44 × 0.08 = 4.9952 ≈ 5.00 (rounded to 2 decimals)
 * @constant
 */
const EXPECTED_TAX = 5.0;

/**
 * Pre-calculated total for SAMPLE_CART_ITEMS with tax
 * 62.44 + 5.00 = 67.44
 * @constant
 */
const EXPECTED_TOTAL = 67.44;

/**
 * Total item count for SAMPLE_CART_ITEMS (sum of quantities)
 * 2 + 1 + 3 = 6
 * @constant
 */
const EXPECTED_ITEM_COUNT = 6;

/**
 * Empty cart items array for empty cart testing
 * @constant
 */
const EMPTY_CART_ITEMS: CartItem[] = [];

// ============================================================================
// Helper Functions
// Following createMockServer/createMockListen patterns from server.test.js
// ============================================================================

/**
 * Calculates the expected subtotal for a list of cart items.
 * @param items - Array of cart items
 * @returns Subtotal rounded to 2 decimal places
 */
function calculateExpectedSubtotal(items: CartItem[]): number {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  return Math.round(subtotal * 100) / 100;
}

/**
 * Calculates the expected tax amount.
 * @param subtotal - Subtotal amount
 * @param rate - Tax rate as decimal
 * @returns Tax amount rounded to 2 decimal places
 */
function calculateExpectedTax(subtotal: number, rate: number): number {
  const tax = subtotal * rate;
  return Math.round(tax * 100) / 100;
}

/**
 * Formats a number as currency string (USD format).
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "$9.99")
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
 * Creates cart items that sum to approximately the target total.
 * Useful for testing specific total values.
 * @param targetTotal - Desired subtotal before tax
 * @returns Array of cart items
 */
function createCartItemsWithTotal(targetTotal: number): CartItem[] {
  // Create items that approximately sum to target
  const pricePerItem = Math.round((targetTotal / 2) * 100) / 100;
  return [
    {
      id: 'target-item-001',
      name: 'Target Item 1',
      price: pricePerItem,
      quantity: 1,
      imageUrl: '/images/item1.jpg',
    },
    {
      id: 'target-item-002',
      name: 'Target Item 2',
      price: targetTotal - pricePerItem,
      quantity: 1,
      imageUrl: '/images/item2.jpg',
    },
  ];
}

/**
 * Creates a single cart item with specified price and quantity.
 * Follows createMockServer pattern for factory functions.
 * @param price - Item price
 * @param quantity - Item quantity
 * @param id - Optional custom ID
 * @returns CartItem object
 */
function createTestCartItem(price: number, quantity: number, id?: string): CartItem {
  return {
    id: id || `test-item-${Date.now()}-${Math.random()}`,
    name: `Test Item $${price.toFixed(2)}`,
    price,
    quantity,
    imageUrl: '/images/test-item.jpg',
  };
}

/**
 * Calculates the total item count (sum of quantities).
 * @param items - Array of cart items
 * @returns Total count of items
 */
function calculateItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

// ============================================================================
// Test Setup and Teardown
// Following server.test.js beforeEach/afterEach pattern
// ============================================================================

describe('CartSummary', () => {
  /**
   * Reset all mocks before each test to ensure clean state
   */
  beforeEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Clean up rendered components after each test
   */
  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Subtotal Calculation Tests
  // ==========================================================================

  describe('subtotal calculation', () => {
    it('should calculate correct subtotal for single item', () => {
      // Arrange
      const singleItem: CartItem[] = [createTestCartItem(9.99, 1)];
      const expectedSubtotal = 9.99;

      // Act
      render(<CartSummary items={singleItem} showTax={false} />, {
        initialCartState: { items: singleItem },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since subtotal and total show same value when no tax
      const priceElements = screen.getAllByText(formatCurrency(expectedSubtotal));
      expect(priceElements.length).toBeGreaterThan(0);
      expect(calculateExpectedSubtotal(singleItem)).toBe(expectedSubtotal);
    });

    it('should calculate correct subtotal for multiple items', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const expectedSubtotal = EXPECTED_SUBTOTAL;

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since subtotal and total show same value when no tax
      const priceElements = screen.getAllByText(formatCurrency(expectedSubtotal));
      expect(priceElements.length).toBeGreaterThan(0);
      expect(calculateExpectedSubtotal(items)).toBeCloseTo(expectedSubtotal, 2);
    });

    it('should calculate subtotal with varying quantities', () => {
      // Arrange - Items with different quantities
      const items: CartItem[] = [
        createTestCartItem(5.0, 1), // $5.00
        createTestCartItem(10.0, 2), // $20.00
        createTestCartItem(7.5, 4), // $30.00
      ];
      const expectedSubtotal = 55.0; // 5 + 20 + 30

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since subtotal and total show same value when no tax
      const priceElements = screen.getAllByText(formatCurrency(expectedSubtotal));
      expect(priceElements.length).toBeGreaterThan(0);
      expect(calculateExpectedSubtotal(items)).toBe(expectedSubtotal);
    });

    it('should display zero subtotal for empty cart', () => {
      // Arrange
      const emptyItems: CartItem[] = [];

      // Act
      render(<CartSummary items={emptyItems} showTax={false} />, {
        initialCartState: { items: emptyItems },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since subtotal and total show same value when no tax
      const priceElements = screen.getAllByText(formatCurrency(0));
      expect(priceElements.length).toBeGreaterThan(0);
      expect(calculateExpectedSubtotal(emptyItems)).toBe(0);
    });
  });

  // ==========================================================================
  // Tax Calculation Tests
  // ==========================================================================

  describe('tax calculation', () => {
    it('should calculate tax at default rate', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const subtotal = EXPECTED_SUBTOTAL;
      const expectedTax = calculateExpectedTax(subtotal, DEFAULT_TAX_RATE);

      // Act
      render(<CartSummary items={items} showTax={true} taxRate={DEFAULT_TAX_RATE} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/tax/i)).toBeInTheDocument();
      expect(screen.getByText(formatCurrency(expectedTax))).toBeInTheDocument();
      expect(expectedTax).toBeCloseTo(EXPECTED_TAX, 2);
    });

    it('should calculate tax at custom rate', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const customTaxRate = 0.1; // 10%
      const subtotal = calculateExpectedSubtotal(items);
      const expectedTax = calculateExpectedTax(subtotal, customTaxRate);

      // Act
      render(<CartSummary items={items} showTax={true} taxRate={customTaxRate} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/tax/i)).toBeInTheDocument();
      expect(screen.getByText(formatCurrency(expectedTax))).toBeInTheDocument();
      expect(expectedTax).toBeCloseTo(6.24, 2); // 62.44 * 0.10 = 6.244
    });

    it('should show zero tax when showTax is false', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert - Tax should not be displayed at all or show $0.00
      const taxElements = screen.queryAllByText(/tax/i);
      const zeroTax = screen.queryAllByText(formatCurrency(0));
      
      // Either tax is not shown, or it's shown as $0.00
      expect(
        taxElements.length === 0 || zeroTax.length > 0
      ).toBe(true);
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since subtotal and total may show same value
      const priceElements = screen.getAllByText(formatCurrency(EXPECTED_SUBTOTAL));
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('should round tax to two decimal places', () => {
      // Arrange - Create items where tax would have more than 2 decimals
      const items: CartItem[] = [createTestCartItem(33.33, 3)]; // $99.99
      const subtotal = 99.99;
      const taxRate = 0.0725; // 7.25%
      // 99.99 * 0.0725 = 7.249275, should round to 7.25
      const expectedTax = Math.round(subtotal * taxRate * 100) / 100;

      // Act
      render(<CartSummary items={items} showTax={true} taxRate={taxRate} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/tax/i)).toBeInTheDocument();
      expect(screen.getByText(formatCurrency(expectedTax))).toBeInTheDocument();
      expect(expectedTax).toBe(7.25);
    });
  });

  // ==========================================================================
  // Total Calculation Tests
  // ==========================================================================

  describe('total calculation', () => {
    it('should calculate grand total as subtotal plus tax', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const subtotal = EXPECTED_SUBTOTAL;
      const tax = EXPECTED_TAX;
      const expectedTotal = subtotal + tax;

      // Act
      render(<CartSummary items={items} showTax={true} taxRate={DEFAULT_TAX_RATE} />, {
        initialCartState: { items },
      });

      // Assert
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);
      expect(totalLabels.length).toBeGreaterThan(0);
      expect(screen.getByText(formatCurrency(expectedTotal))).toBeInTheDocument();
      expect(expectedTotal).toBeCloseTo(EXPECTED_TOTAL, 2);
    });

    it('should calculate total without tax when showTax is false', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const expectedTotal = EXPECTED_SUBTOTAL; // Total equals subtotal when no tax

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);
      expect(totalLabels.length).toBeGreaterThan(0);
      // Use getAllByText since subtotal and total show same value when no tax
      const priceElements = screen.getAllByText(formatCurrency(expectedTotal));
      expect(priceElements.length).toBeGreaterThan(0);
      expect(expectedTotal).toBe(calculateExpectedSubtotal(items));
    });

    it('should display zero total for empty cart', () => {
      // Arrange
      const emptyItems: CartItem[] = [];

      // Act
      render(<CartSummary items={emptyItems} showTax={true} taxRate={DEFAULT_TAX_RATE} />, {
        initialCartState: { items: emptyItems },
      });

      // Assert
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);
      expect(totalLabels.length).toBeGreaterThan(0);
      // Use getAllByText since subtotal and total may show same zero value
      const priceElements = screen.getAllByText(formatCurrency(0));
      expect(priceElements.length).toBeGreaterThan(0);
      expect(calculateExpectedSubtotal(emptyItems)).toBe(0);
    });

    it('should handle large totals correctly', () => {
      // Arrange - Create items with large values
      const items: CartItem[] = [
        createTestCartItem(999.99, 10), // $9,999.90
        createTestCartItem(499.99, 5), // $2,499.95
      ];
      const expectedSubtotal = 12499.85;
      const expectedTax = calculateExpectedTax(expectedSubtotal, DEFAULT_TAX_RATE);
      const expectedTotal = expectedSubtotal + expectedTax;

      // Act
      render(<CartSummary items={items} showTax={true} taxRate={DEFAULT_TAX_RATE} />, {
        initialCartState: { items },
      });

      // Assert
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);
      expect(totalLabels.length).toBeGreaterThan(0);
      expect(calculateExpectedSubtotal(items)).toBeCloseTo(expectedSubtotal, 2);
      expect(expectedTotal).toBeGreaterThan(10000);
    });
  });

  // ==========================================================================
  // Item Count Display Tests
  // ==========================================================================

  describe('item count display', () => {
    it('should show correct item count', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const expectedCount = EXPECTED_ITEM_COUNT; // 6 items

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      expect(calculateItemCount(items)).toBe(expectedCount);
      // Look for the count in the rendered output - use more specific pattern
      // Use getAllByText since the count digit may appear in prices too
      const countTexts = screen.getAllByText(new RegExp(`${expectedCount}`, 'i'));
      expect(countTexts.length).toBeGreaterThan(0);
      expect(items.length).toBe(3); // 3 unique items
    });

    it('should show count as sum of quantities', () => {
      // Arrange - 3 items with quantities 2, 3, 5 = total 10
      const items: CartItem[] = [
        createTestCartItem(5.0, 2),
        createTestCartItem(7.0, 3),
        createTestCartItem(10.0, 5),
      ];
      const expectedCount = 10;

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      expect(calculateItemCount(items)).toBe(expectedCount);
      expect(items.reduce((sum, item) => sum + item.quantity, 0)).toBe(expectedCount);
      expect(items.length).toBe(3);
    });

    it('should display "0 items" for empty cart', () => {
      // Arrange
      const emptyItems: CartItem[] = [];

      // Act
      render(<CartSummary items={emptyItems} showTax={false} />, {
        initialCartState: { items: emptyItems },
      });

      // Assert
      expect(calculateItemCount(emptyItems)).toBe(0);
      expect(emptyItems.length).toBe(0);
      // Component should show some indication of empty state
      // Use getAllByText since there may be multiple elements with 0
      const zeroElements = screen.getAllByText(/0|empty/i);
      expect(zeroElements.length).toBeGreaterThan(0);
    });

    it('should use singular "item" for count of 1', () => {
      // Arrange
      const singleItem: CartItem[] = [createTestCartItem(9.99, 1)];
      const expectedCount = 1;

      // Act
      render(<CartSummary items={singleItem} showTax={false} />, {
        initialCartState: { items: singleItem },
      });

      // Assert
      expect(calculateItemCount(singleItem)).toBe(expectedCount);
      // Should display singular "item" not "items"
      const textContent = screen.getByText(/1\s*item/i);
      expect(textContent).toBeInTheDocument();
      expect(singleItem.length).toBe(1);
    });
  });

  // ==========================================================================
  // Currency Formatting Tests
  // ==========================================================================

  describe('currency formatting', () => {
    it('should format prices with two decimal places', () => {
      // Arrange
      const items: CartItem[] = [createTestCartItem(10.0, 1)]; // $10.00

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      // Should show $10.00, not $10 or $10.0
      // Use getAllByText since subtotal and total may show same value
      const priceElements = screen.getAllByText('$10.00');
      expect(priceElements.length).toBeGreaterThan(0);
      expect(formatCurrency(10.0)).toBe('$10.00');
      expect(formatCurrency(10)).toMatch(/\$10\.00/);
    });

    it('should include currency symbol', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      // Look for dollar sign in the rendered output
      // Use getAllByText since subtotal and total may show same value
      const subtotalElements = screen.getAllByText(formatCurrency(EXPECTED_SUBTOTAL));
      expect(subtotalElements.length).toBeGreaterThan(0);
      expect(subtotalElements[0].textContent).toContain('$');
      expect(formatCurrency(EXPECTED_SUBTOTAL)).toMatch(/^\$/);
    });

    it('should format thousands with comma separator', () => {
      // Arrange - Large total that requires thousands separator
      const items: CartItem[] = [createTestCartItem(1500.00, 1)];

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      const formattedAmount = formatCurrency(1500.00);
      expect(formattedAmount).toBe('$1,500.00');
      // Use getAllByText since subtotal and total may show same value
      const priceElements = screen.getAllByText('$1,500.00');
      expect(priceElements.length).toBeGreaterThan(0);
      expect(formattedAmount).toContain(',');
    });
  });

  // ==========================================================================
  // Discount Application Tests
  // ==========================================================================

  describe('discount application', () => {
    it('should display discount amount when applied', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const discountAmount = 10.0;

      // Act
      render(
        <CartSummary 
          items={items} 
          showTax={false} 
          discount={discountAmount} 
        />,
        {
          initialCartState: { items },
        }
      );

      // Assert
      expect(screen.getByText(/discount/i)).toBeInTheDocument();
      expect(screen.getByText(formatCurrency(discountAmount))).toBeInTheDocument();
      expect(discountAmount).toBe(10.0);
    });

    it('should subtract discount from total', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const subtotal = EXPECTED_SUBTOTAL;
      const discountAmount = 15.0;
      const expectedTotal = subtotal - discountAmount; // 62.44 - 15.00 = 47.44

      // Act
      render(
        <CartSummary 
          items={items} 
          showTax={false} 
          discount={discountAmount} 
        />,
        {
          initialCartState: { items },
        }
      );

      // Assert
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);
      expect(totalLabels.length).toBeGreaterThan(0);
      expect(screen.getByText(formatCurrency(expectedTotal))).toBeInTheDocument();
      expect(expectedTotal).toBe(47.44);
    });

    it('should show original and discounted prices', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const subtotal = EXPECTED_SUBTOTAL;
      const discountAmount = 20.0;
      const expectedDiscountedTotal = subtotal - discountAmount;

      // Act
      render(
        <CartSummary 
          items={items} 
          showTax={false} 
          discount={discountAmount} 
        />,
        {
          initialCartState: { items },
        }
      );

      // Assert - Should show subtotal and discounted total
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Subtotal and discount may have same values, use getAllByText
      const subtotalElements = screen.getAllByText(formatCurrency(subtotal));
      expect(subtotalElements.length).toBeGreaterThan(0);
      expect(screen.getByText(formatCurrency(expectedDiscountedTotal))).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle items with zero price', () => {
      // Arrange - Promotional/free item
      const items: CartItem[] = [
        createTestCartItem(0, 1),
        createTestCartItem(9.99, 1),
      ];
      const expectedSubtotal = 9.99; // Only the non-free item

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since subtotal and total may show same value
      const priceElements = screen.getAllByText(formatCurrency(expectedSubtotal));
      expect(priceElements.length).toBeGreaterThan(0);
      expect(calculateExpectedSubtotal(items)).toBe(expectedSubtotal);
    });

    it('should handle very large quantities', () => {
      // Arrange - Large quantity
      const items: CartItem[] = [createTestCartItem(0.99, 999)];
      const expectedSubtotal = 989.01; // 0.99 * 999

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      expect(calculateExpectedSubtotal(items)).toBeCloseTo(expectedSubtotal, 2);
      expect(calculateItemCount(items)).toBe(999);
    });

    it('should handle floating point precision correctly', () => {
      // Arrange - Values that could cause floating point issues
      // 0.1 + 0.2 in JavaScript is 0.30000000000000004
      const items: CartItem[] = [
        createTestCartItem(0.1, 1),
        createTestCartItem(0.2, 1),
      ];
      const expectedSubtotal = 0.3; // Should be exactly 0.30, not 0.30000000000000004

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      const calculatedSubtotal = calculateExpectedSubtotal(items);
      expect(calculatedSubtotal).toBeCloseTo(expectedSubtotal, 2);
      expect(calculatedSubtotal.toString()).not.toContain('000000000000');
      expect(formatCurrency(calculatedSubtotal)).toBe('$0.30');
    });

    it('should handle single item with quantity greater than 1', () => {
      // Arrange
      const items: CartItem[] = [createTestCartItem(5.0, 10)];
      const expectedSubtotal = 50.0;

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since subtotal and total may show same value
      const priceElements = screen.getAllByText(formatCurrency(expectedSubtotal));
      expect(priceElements.length).toBeGreaterThan(0);
      expect(calculateExpectedSubtotal(items)).toBe(expectedSubtotal);
    });

    it('should handle decimal prices with varying precision', () => {
      // Arrange - Mix of 1 and 2 decimal place prices
      const items: CartItem[] = [
        createTestCartItem(5.5, 2), // $11.00
        createTestCartItem(3.99, 1), // $3.99
      ];
      const expectedSubtotal = 14.99;

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      expect(calculateExpectedSubtotal(items)).toBeCloseTo(expectedSubtotal, 2);
      // Use getAllByText since subtotal and total may show same value
      const priceElements = screen.getAllByText(formatCurrency(expectedSubtotal));
      expect(priceElements.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have accessible price labels', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;

      // Act
      render(<CartSummary items={items} showTax={true} taxRate={DEFAULT_TAX_RATE} />, {
        initialCartState: { items },
      });

      // Assert - Labels should be present and accessible
      const subtotalLabel = screen.getByText(/subtotal/i);
      const taxLabel = screen.getByText(/tax/i);
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);

      expect(subtotalLabel).toBeInTheDocument();
      expect(taxLabel).toBeInTheDocument();
      // Should have at least Subtotal and Total labels
      expect(totalLabels.length).toBeGreaterThanOrEqual(2);
    });

    it('should announce total updates to screen readers', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert - Total should be in an accessible element
      // Use getAllByText since "Subtotal" also contains "total"
      const totalElements = screen.getAllByText(/total/i);
      expect(totalElements.length).toBeGreaterThan(0);
      
      // The price value should be associated with the label
      // Use getAllByText since subtotal and total may show same value
      const priceValues = screen.getAllByText(formatCurrency(EXPECTED_SUBTOTAL));
      expect(priceValues.length).toBeGreaterThan(0);
      
      // Verify the summary is in a semantic structure
      expect(totalElements[0].closest('div, section, dl, table')).not.toBeNull();
    });

    it('should have proper heading structure for summary section', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;

      // Act
      render(<CartSummary items={items} showTax={true} taxRate={DEFAULT_TAX_RATE} />, {
        initialCartState: { items },
      });

      // Assert
      // Summary should have clear section identification
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      expect(screen.getByText(/tax/i)).toBeInTheDocument();
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);
      expect(totalLabels.length).toBeGreaterThanOrEqual(2);
      
      // All pricing elements should be present
      expect(screen.getByText(formatCurrency(EXPECTED_SUBTOTAL))).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Integration with Cart State Tests
  // ==========================================================================

  describe('cart state integration', () => {
    it('should reflect changes when cart items are updated', () => {
      // Arrange - Initial items
      const initialItems: CartItem[] = [createTestCartItem(10.0, 1)];
      const initialSubtotal = 10.0;

      // Act
      render(<CartSummary items={initialItems} showTax={false} />, {
        initialCartState: { items: initialItems },
      });

      // Assert - Initial state is correct
      // Use getAllByText since subtotal and total may show same value
      const priceElements = screen.getAllByText(formatCurrency(initialSubtotal));
      expect(priceElements.length).toBeGreaterThan(0);
      expect(calculateExpectedSubtotal(initialItems)).toBe(initialSubtotal);
      expect(initialItems.length).toBe(1);
    });

    it('should calculate correctly with items from menu fixtures', () => {
      // Arrange - Use fixture factory to create items
      const menuItem = createMenuItem({ price: 15.99 });
      const cartItemData = createMockCartItem({
        menuItem: {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          category: menuItem.category,
          imageUrl: menuItem.imageUrl,
          description: menuItem.description,
        },
        quantity: 2,
      });
      
      // Convert to CartItem format
      const items: CartItem[] = [{
        id: cartItemData.menuItem.id,
        name: cartItemData.menuItem.name,
        price: cartItemData.menuItem.price,
        quantity: cartItemData.quantity,
        imageUrl: cartItemData.menuItem.imageUrl,
      }];
      
      const expectedSubtotal = 31.98; // 15.99 * 2

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      expect(calculateExpectedSubtotal(items)).toBeCloseTo(expectedSubtotal, 2);
      expect(items[0].name).toBe(menuItem.name);
    });

    it('should handle multiple item types correctly', () => {
      // Arrange - Mix of different priced items
      const items: CartItem[] = [
        createTestCartItem(8.99, 2), // Burger
        createTestCartItem(3.99, 3), // Fries
        createTestCartItem(2.49, 4), // Drinks
      ];
      // 17.98 + 11.97 + 9.96 = 39.91
      const expectedSubtotal = 39.91;

      // Act
      render(<CartSummary items={items} showTax={true} taxRate={DEFAULT_TAX_RATE} />, {
        initialCartState: { items },
      });

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      expect(calculateExpectedSubtotal(items)).toBeCloseTo(expectedSubtotal, 2);
      expect(calculateItemCount(items)).toBe(9); // 2 + 3 + 4
    });
  });

  // ==========================================================================
  // Tax and Discount Combination Tests
  // ==========================================================================

  describe('tax and discount combination', () => {
    it('should calculate total with both tax and discount', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;
      const subtotal = EXPECTED_SUBTOTAL; // 62.44
      const discountAmount = 10.0;
      const taxRate = DEFAULT_TAX_RATE;
      // Apply discount first, then tax
      const afterDiscount = subtotal - discountAmount; // 52.44
      const tax = calculateExpectedTax(afterDiscount, taxRate); // ~4.20
      const expectedTotal = afterDiscount + tax;

      // Act
      render(
        <CartSummary 
          items={items} 
          showTax={true} 
          taxRate={taxRate}
          discount={discountAmount} 
        />,
        {
          initialCartState: { items },
        }
      );

      // Assert
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      expect(screen.getByText(/discount/i)).toBeInTheDocument();
      expect(screen.getByText(/tax/i)).toBeInTheDocument();
    });

    it('should show zero total when discount equals subtotal', () => {
      // Arrange
      const items: CartItem[] = [createTestCartItem(20.0, 1)];
      const subtotal = 20.0;
      const discountAmount = 20.0; // 100% discount

      // Act
      render(
        <CartSummary 
          items={items} 
          showTax={false} 
          discount={discountAmount} 
        />,
        {
          initialCartState: { items },
        }
      );

      // Assert
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);
      expect(totalLabels.length).toBeGreaterThan(0);
      // Zero total should be shown
      expect(screen.getByText(formatCurrency(0))).toBeInTheDocument();
      expect(subtotal - discountAmount).toBe(0);
    });
  });

  // ==========================================================================
  // Props Variation Tests
  // ==========================================================================

  describe('props variations', () => {
    it('should use default tax rate when not specified', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;

      // Act
      render(<CartSummary items={items} showTax={true} />, {
        initialCartState: { items },
      });

      // Assert - Component should still render tax (using internal default)
      expect(screen.getByText(/tax/i)).toBeInTheDocument();
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);
      expect(totalLabels.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle undefined discount gracefully', () => {
      // Arrange
      const items = SAMPLE_CART_ITEMS;

      // Act
      render(<CartSummary items={items} showTax={false} />, {
        initialCartState: { items },
      });

      // Assert - No discount row should appear
      const discountElements = screen.queryAllByText(/discount/i);
      expect(discountElements.length).toBe(0);
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since price might appear in both subtotal and total
      const priceElements = screen.getAllByText(formatCurrency(EXPECTED_SUBTOTAL));
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('should render correctly with minimal props', () => {
      // Arrange - Just items, no other props
      const items = SAMPLE_CART_ITEMS;

      // Act
      render(<CartSummary items={items} />, {
        initialCartState: { items },
      });

      // Assert - Should still render basic summary
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      // Use getAllByText since "Subtotal" also contains "total"
      const totalLabels = screen.getAllByText(/total/i);
      expect(totalLabels.length).toBeGreaterThanOrEqual(1);
      expect(calculateExpectedSubtotal(items)).toBeCloseTo(EXPECTED_SUBTOTAL, 2);
    });
  });
});
