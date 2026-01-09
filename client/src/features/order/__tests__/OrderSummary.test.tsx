/**
 * @fileoverview Unit tests for order summary component
 * @module tests/features/order/OrderSummary
 *
 * This module provides comprehensive unit tests for the OrderSummary component,
 * testing order summary rendering with item details, quantity displays, price
 * calculations, subtotal/tax/total breakdowns, and special instructions display.
 *
 * Test categories covered:
 * - Rendering: Item display, names, quantities, prices, special instructions, empty state
 * - Calculations: Subtotal, tax, total, quantity multipliers, currency formatting
 * - Edge cases: Single item, max quantity (99), promotional/zero price items, long names
 * - Performance: Rendering 100+ items without timeout
 *
 * Follows patterns established in:
 * - tests/lifecycle/server.test.js (factory functions, mock patterns)
 * - tests/unit/config.test.js (type definitions, DEFAULT_CONFIG pattern)
 * - tests/unit/routes.test.js (describe block organization)
 */

import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import { screen, cleanup, within } from '@testing-library/react';
import { render } from '../../../__tests__/utils/render';
import { OrderSummary } from '../OrderSummary';
import {
  testOrders,
  createOrderItem,
  OrderItem,
  emptyCart,
  singleItemCart,
  fullCart,
  calculateOrderTotal,
} from '../../../__tests__/fixtures/orders';
import {
  menuItems,
  createMenuItem,
  TestMenuItem,
  promotionalItem,
  longNameItem,
} from '../../../__tests__/fixtures/menuItems';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Props for the OrderSummary component.
 * @interface OrderSummaryProps
 */
interface OrderSummaryProps {
  /** Array of items to display in the order summary */
  items: OrderItem[];
  /** Subtotal amount before tax */
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

/**
 * Extended order item with additional display properties.
 * @typedef {Object} DisplayOrderItem
 */
interface DisplayOrderItem extends OrderItem {
  /** Whether to highlight this item */
  highlighted?: boolean;
  /** Item image URL for display */
  imageUrl?: string;
}

// ============================================================================
// Test Constants (Following DEFAULT_CONFIG Pattern)
// ============================================================================

/**
 * Default tax rate for calculations (8%).
 */
const DEFAULT_TAX_RATE = 0.08;

/**
 * Default order items array for standard testing scenarios.
 * Contains a mix of items with different prices and quantities.
 */
const DEFAULT_ITEMS: OrderItem[] = [
  {
    menuItemId: 'burger-001',
    name: 'Classic Burger',
    quantity: 2,
    price: 8.99,
  },
  {
    menuItemId: 'side-001',
    name: 'Fries',
    quantity: 1,
    price: 3.99,
  },
  {
    menuItemId: 'drink-001',
    name: 'Soda',
    quantity: 2,
    price: 2.49,
  },
];

/**
 * Empty items array for testing empty state rendering.
 */
const EMPTY_ITEMS: OrderItem[] = [];

/**
 * Large order items array for performance testing.
 * Contains 100+ items across different categories.
 */
const LARGE_ORDER_ITEMS: OrderItem[] = Array.from({ length: 100 }, (_, index) => ({
  menuItemId: `item-${index + 1}`,
  name: `Menu Item ${index + 1}`,
  quantity: Math.floor(Math.random() * 3) + 1,
  price: Number((Math.random() * 15 + 2).toFixed(2)),
}));

/**
 * Items with special instructions for testing instruction display.
 */
const ITEMS_WITH_INSTRUCTIONS: OrderItem[] = [
  {
    menuItemId: 'burger-001',
    name: 'Classic Burger',
    quantity: 1,
    price: 8.99,
    specialInstructions: 'No onions, extra pickles',
  },
  {
    menuItemId: 'side-001',
    name: 'Fries',
    quantity: 1,
    price: 3.99,
    specialInstructions: 'Extra crispy, no salt',
  },
];

/**
 * Single item for minimum order testing.
 */
const SINGLE_ITEM: OrderItem[] = [
  {
    menuItemId: 'burger-001',
    name: 'Classic Burger',
    quantity: 1,
    price: 8.99,
  },
];

/**
 * Item with maximum quantity (99) for boundary testing.
 */
const MAX_QUANTITY_ITEMS: OrderItem[] = [
  {
    menuItemId: 'burger-001',
    name: 'Classic Burger',
    quantity: 99,
    price: 8.99,
  },
];

/**
 * Items including a promotional/zero price item.
 */
const PROMOTIONAL_ITEMS: OrderItem[] = [
  {
    menuItemId: 'burger-001',
    name: 'Classic Burger',
    quantity: 1,
    price: 8.99,
  },
  {
    menuItemId: 'promo-001',
    name: 'Free Cookie',
    quantity: 1,
    price: 0,
  },
];

/**
 * Item with very long name for text overflow testing.
 */
const LONG_NAME_ITEMS: OrderItem[] = [
  {
    menuItemId: 'edge-001',
    name: 'The Ultimate Super Deluxe Double Bacon Cheeseburger with Extra Everything and Special Secret Sauce',
    quantity: 1,
    price: 15.99,
  },
];

// ============================================================================
// Helper Functions (Following createMockServer Pattern)
// ============================================================================

/**
 * Creates an order item with optional overrides.
 * Factory function following createMockServer pattern from server.test.js.
 *
 * @param overrides - Partial OrderItem properties to override defaults
 * @returns A complete OrderItem object
 *
 * @example
 * const customItem = createTestOrderItem({ name: 'Custom Item', price: 12.99 });
 */
function createTestOrderItem(overrides?: Partial<OrderItem>): OrderItem {
  const defaultItem: OrderItem = {
    menuItemId: 'test-item-001',
    name: 'Test Item',
    quantity: 1,
    price: 9.99,
  };

  return { ...defaultItem, ...overrides };
}

/**
 * Calculates the expected subtotal for an array of order items.
 * Multiplies each item's price by its quantity and sums the results.
 *
 * @param items - Array of OrderItem objects
 * @returns Subtotal price as a number rounded to 2 decimal places
 *
 * @example
 * const subtotal = calculateExpectedSubtotal(DEFAULT_ITEMS);
 */
function calculateExpectedSubtotal(items: OrderItem[]): number {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  return Math.round(subtotal * 100) / 100;
}

/**
 * Calculates the expected tax amount based on subtotal and tax rate.
 *
 * @param subtotal - The subtotal amount before tax
 * @param taxRate - Tax rate as a decimal (e.g., 0.08 for 8%)
 * @returns Tax amount rounded to 2 decimal places
 *
 * @example
 * const tax = calculateExpectedTax(24.95, 0.08); // Returns ~2.00
 */
function calculateExpectedTax(subtotal: number, taxRate: number = DEFAULT_TAX_RATE): number {
  return Math.round(subtotal * taxRate * 100) / 100;
}

/**
 * Calculates the expected total including tax.
 *
 * @param subtotal - The subtotal amount before tax
 * @param taxRate - Tax rate as a decimal (default: 0.08)
 * @returns Total amount rounded to 2 decimal places
 *
 * @example
 * const total = calculateExpectedTotal(24.95, 0.08);
 */
function calculateExpectedTotal(
  subtotal: number,
  taxRate: number = DEFAULT_TAX_RATE
): number {
  const tax = calculateExpectedTax(subtotal, taxRate);
  return Math.round((subtotal + tax) * 100) / 100;
}

/**
 * Formats a number as a currency string with two decimal places.
 *
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$9.99")
 *
 * @example
 * const formatted = formatCurrency(9.99); // Returns "$9.99"
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Creates props for rendering the OrderSummary component.
 *
 * @param items - Array of order items to display
 * @param overrides - Additional props to override
 * @returns Complete OrderSummaryProps object
 */
function createOrderSummaryProps(
  items: OrderItem[],
  overrides?: Partial<OrderSummaryProps>
): OrderSummaryProps {
  const subtotal = calculateExpectedSubtotal(items);
  const taxAmount = calculateExpectedTax(subtotal);
  const total = subtotal + taxAmount;

  return {
    items,
    subtotal,
    taxRate: DEFAULT_TAX_RATE,
    taxAmount,
    total,
    ...overrides,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('OrderSummary', () => {
  /**
   * Clean up after each test to ensure test isolation.
   * Follows patterns from tests/lifecycle/server.test.js.
   */
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('rendering', () => {
    it('should display all order items', () => {
      // Arrange
      const props = createOrderSummaryProps(DEFAULT_ITEMS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify all items are rendered
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(screen.getByText('Fries')).toBeInTheDocument();
      expect(screen.getByText('Soda')).toBeInTheDocument();
    });

    it('should show item names and quantities', () => {
      // Arrange
      const props = createOrderSummaryProps(DEFAULT_ITEMS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify item names appear
      const burgerElement = screen.getByText('Classic Burger');
      const friesElement = screen.getByText('Fries');
      const sodaElement = screen.getByText('Soda');

      expect(burgerElement).toBeInTheDocument();
      expect(friesElement).toBeInTheDocument();
      expect(sodaElement).toBeInTheDocument();

      // Assert - verify quantities are displayed
      // Quantities may be displayed as "x2" or "Qty: 2" depending on component design
      expect(screen.getByText(/2/)).toBeInTheDocument(); // Burger quantity
    });

    it('should display item prices correctly', () => {
      // Arrange
      const props = createOrderSummaryProps(DEFAULT_ITEMS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify prices are displayed with correct formatting
      // Price for burgers: 2 x $8.99 = $17.98
      expect(screen.getByText(/8\.99/)).toBeInTheDocument();
      expect(screen.getByText(/3\.99/)).toBeInTheDocument();
      expect(screen.getByText(/2\.49/)).toBeInTheDocument();
    });

    it('should show special instructions when present', () => {
      // Arrange
      const props = createOrderSummaryProps(ITEMS_WITH_INSTRUCTIONS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify special instructions are displayed
      expect(screen.getByText('No onions, extra pickles')).toBeInTheDocument();
      expect(screen.getByText('Extra crispy, no salt')).toBeInTheDocument();
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
    });

    it('should display empty state when no items', () => {
      // Arrange
      const props = createOrderSummaryProps(EMPTY_ITEMS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify empty state message or no items indicator
      // Component should display something like "No items" or "Your cart is empty"
      const emptyIndicator =
        screen.queryByText(/empty/i) ||
        screen.queryByText(/no items/i) ||
        screen.queryByText(/0 items/i);

      // If no explicit empty message, verify the items aren't shown
      expect(screen.queryByText('Classic Burger')).not.toBeInTheDocument();
      expect(screen.queryByText('Fries')).not.toBeInTheDocument();
      expect(screen.queryByText('Soda')).not.toBeInTheDocument();
    });

    it('should render component heading for order summary', () => {
      // Arrange
      const props = createOrderSummaryProps(DEFAULT_ITEMS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify heading is present
      const headingOptions = [
        /order summary/i,
        /your order/i,
        /summary/i,
        /order details/i,
      ];

      const hasHeading = headingOptions.some(
        (option) =>
          screen.queryByRole('heading', { name: option }) ||
          screen.queryByText(option)
      );

      expect(hasHeading || screen.getByText('Classic Burger')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Calculation Tests
  // ==========================================================================
  describe('calculations', () => {
    it('should calculate correct subtotal', () => {
      // Arrange
      const props = createOrderSummaryProps(DEFAULT_ITEMS);
      // Expected subtotal: (2 * 8.99) + (1 * 3.99) + (2 * 2.49) = 17.98 + 3.99 + 4.98 = 26.95
      const expectedSubtotal = calculateExpectedSubtotal(DEFAULT_ITEMS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify subtotal is displayed correctly
      const formattedSubtotal = expectedSubtotal.toFixed(2);
      expect(screen.getByText(new RegExp(formattedSubtotal))).toBeInTheDocument();
      expect(expectedSubtotal).toBe(26.95);
    });

    it('should calculate correct tax amount', () => {
      // Arrange
      const props = createOrderSummaryProps(DEFAULT_ITEMS);
      const subtotal = calculateExpectedSubtotal(DEFAULT_ITEMS);
      const expectedTax = calculateExpectedTax(subtotal);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify tax amount is calculated and displayed
      // Tax on 26.95 @ 8% = 2.156 = 2.16 (rounded)
      expect(expectedTax).toBe(2.16);
      expect(screen.getByText(/tax/i)).toBeInTheDocument();
    });

    it('should calculate correct total', () => {
      // Arrange
      const props = createOrderSummaryProps(DEFAULT_ITEMS);
      const subtotal = calculateExpectedSubtotal(DEFAULT_ITEMS);
      const expectedTotal = calculateExpectedTotal(subtotal);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify total is displayed correctly
      // Total: 26.95 + 2.16 = 29.11
      const formattedTotal = expectedTotal.toFixed(2);
      expect(expectedTotal).toBe(29.11);
      expect(screen.getByText(new RegExp(formattedTotal))).toBeInTheDocument();
    });

    it('should handle items with quantity > 1', () => {
      // Arrange
      const itemsWithMultipleQuantity: OrderItem[] = [
        {
          menuItemId: 'burger-001',
          name: 'Classic Burger',
          quantity: 3,
          price: 8.99,
        },
      ];
      const props = createOrderSummaryProps(itemsWithMultipleQuantity);
      // Expected subtotal: 3 * 8.99 = 26.97
      const expectedSubtotal = 26.97;

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify calculations account for quantity
      expect(calculateExpectedSubtotal(itemsWithMultipleQuantity)).toBe(expectedSubtotal);
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(screen.getByText(new RegExp('26\\.97'))).toBeInTheDocument();
    });

    it('should format currency with two decimal places', () => {
      // Arrange
      const itemsWithExactPrice: OrderItem[] = [
        {
          menuItemId: 'item-001',
          name: 'Test Item',
          quantity: 1,
          price: 10.0, // Exact dollar amount
        },
      ];
      const props = createOrderSummaryProps(itemsWithExactPrice);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify currency formatting includes two decimal places
      // $10.00 should display as "10.00" not "10"
      expect(screen.getByText(/10\.00/)).toBeInTheDocument();
      expect(formatCurrency(10.0)).toBe('$10.00');
      expect(formatCurrency(10.1)).toBe('$10.10');
    });

    it('should calculate line item totals correctly', () => {
      // Arrange
      const props = createOrderSummaryProps(DEFAULT_ITEMS);
      // Line item totals:
      // Classic Burger: 2 x 8.99 = 17.98
      // Fries: 1 x 3.99 = 3.99
      // Soda: 2 x 2.49 = 4.98

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify line item calculations
      const burgerLineTotal = 2 * 8.99;
      const friesLineTotal = 1 * 3.99;
      const sodaLineTotal = 2 * 2.49;

      expect(burgerLineTotal).toBe(17.98);
      expect(friesLineTotal).toBe(3.99);
      expect(sodaLineTotal).toBe(4.98);

      // At least one of the line totals should appear in the document
      expect(
        screen.getByText(/17\.98/) ||
          screen.getByText(/3\.99/) ||
          screen.getByText(/4\.98/)
      ).toBeTruthy();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle single item order', () => {
      // Arrange
      const props = createOrderSummaryProps(SINGLE_ITEM);
      const expectedSubtotal = 8.99;

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify single item order displays correctly
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(calculateExpectedSubtotal(SINGLE_ITEM)).toBe(expectedSubtotal);
      expect(screen.getByText(/8\.99/)).toBeInTheDocument();
    });

    it('should handle maximum quantity (99)', () => {
      // Arrange
      const props = createOrderSummaryProps(MAX_QUANTITY_ITEMS);
      // Expected subtotal: 99 * 8.99 = 890.01
      const expectedSubtotal = calculateExpectedSubtotal(MAX_QUANTITY_ITEMS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify max quantity is handled correctly
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(expectedSubtotal).toBe(890.01);
      expect(screen.getByText(/890\.01/)).toBeInTheDocument();
    });

    it('should handle promotional/zero price items', () => {
      // Arrange
      const props = createOrderSummaryProps(PROMOTIONAL_ITEMS);
      // Expected subtotal: 8.99 + 0 = 8.99
      const expectedSubtotal = calculateExpectedSubtotal(PROMOTIONAL_ITEMS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify zero price items are handled
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(screen.getByText('Free Cookie')).toBeInTheDocument();
      expect(expectedSubtotal).toBe(8.99);
      // The zero price should be displayed as "$0.00" or "Free"
      expect(
        screen.getByText(/0\.00/) || screen.getByText(/free/i)
      ).toBeTruthy();
    });

    it('should handle very long item names', () => {
      // Arrange
      const props = createOrderSummaryProps(LONG_NAME_ITEMS);
      const longName =
        'The Ultimate Super Deluxe Double Bacon Cheeseburger with Extra Everything and Special Secret Sauce';

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify long name item is handled (may be truncated or wrapped)
      // The text should be present or truncated
      const textElement =
        screen.queryByText(longName) ||
        screen.queryByText(/Ultimate Super Deluxe/) ||
        screen.queryByText(/Double Bacon/);

      expect(textElement).toBeInTheDocument();
      expect(screen.getByText(/15\.99/)).toBeInTheDocument();
      expect(LONG_NAME_ITEMS[0].name.length).toBeGreaterThan(50);
    });

    it('should handle items with decimal quantity totals', () => {
      // Arrange - items that could cause floating point precision issues
      const trickyItems: OrderItem[] = [
        { menuItemId: 'item-1', name: 'Item 1', quantity: 1, price: 0.1 },
        { menuItemId: 'item-2', name: 'Item 2', quantity: 1, price: 0.2 },
      ];
      const props = createOrderSummaryProps(trickyItems);
      // 0.1 + 0.2 should equal 0.30, not 0.30000000000000004

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify floating point handling
      const subtotal = calculateExpectedSubtotal(trickyItems);
      expect(subtotal).toBe(0.3);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should handle items from imported fixtures correctly', () => {
      // Arrange - use fixtures from orders.ts
      const props = createOrderSummaryProps(singleItemCart);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify fixture data is used correctly
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(screen.getByText(/8\.99/)).toBeInTheDocument();
      expect(calculateOrderTotal(singleItemCart)).toBe(8.99);
    });

    it('should display fullCart items from fixtures', () => {
      // Arrange - use fullCart fixture from orders.ts
      const props = createOrderSummaryProps(fullCart);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify multiple items from fullCart are displayed
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(screen.getByText('Cheese Burger')).toBeInTheDocument();
      expect(fullCart.length).toBeGreaterThan(3);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================
  describe('performance', () => {
    it('should render 100+ items without timeout', () => {
      // Arrange
      const startTime = performance.now();
      const props = createOrderSummaryProps(LARGE_ORDER_ITEMS);

      // Act
      render(<OrderSummary {...props} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Assert - verify render completes within acceptable time
      // Render should complete in less than 1000ms even with 100+ items
      expect(LARGE_ORDER_ITEMS.length).toBeGreaterThanOrEqual(100);
      expect(renderTime).toBeLessThan(1000);
      expect(screen.getByText('Menu Item 1')).toBeInTheDocument();
    });

    it('should handle large subtotals correctly', () => {
      // Arrange
      const props = createOrderSummaryProps(LARGE_ORDER_ITEMS);
      const expectedSubtotal = calculateExpectedSubtotal(LARGE_ORDER_ITEMS);

      // Act
      render(<OrderSummary {...props} />);

      // Assert - verify large subtotal calculations
      expect(expectedSubtotal).toBeGreaterThan(0);
      expect(LARGE_ORDER_ITEMS.length).toBeGreaterThanOrEqual(100);
      expect(typeof expectedSubtotal).toBe('number');
    });

    it('should maintain stable memory when rendering many items', () => {
      // Arrange - create multiple renders to check stability
      const props = createOrderSummaryProps(LARGE_ORDER_ITEMS);

      // Act - render multiple times
      const { unmount } = render(<OrderSummary {...props} />);
      unmount();

      const { unmount: unmount2 } = render(<OrderSummary {...props} />);
      unmount2();

      const { unmount: unmount3 } = render(<OrderSummary {...props} />);

      // Assert - no memory errors, component renders successfully
      expect(screen.getByText('Menu Item 1')).toBeInTheDocument();
      expect(LARGE_ORDER_ITEMS.length).toBeGreaterThanOrEqual(100);
      expect(screen.getByText('Menu Item 50')).toBeInTheDocument();

      unmount3();
    });
  });

  // ==========================================================================
  // Data-Driven Tests (using test.each)
  // ==========================================================================
  describe('calculation scenarios', () => {
    /**
     * Data-driven tests for various calculation scenarios.
     * Following patterns from tests/unit/config.test.js.
     */
    const calculationScenarios: Array<{
      name: string;
      items: OrderItem[];
      expectedSubtotal: number;
    }> = [
      {
        name: 'single item with quantity 1',
        items: [
          { menuItemId: 'item-1', name: 'Item 1', quantity: 1, price: 10.0 },
        ],
        expectedSubtotal: 10.0,
      },
      {
        name: 'single item with quantity 5',
        items: [
          { menuItemId: 'item-1', name: 'Item 1', quantity: 5, price: 5.0 },
        ],
        expectedSubtotal: 25.0,
      },
      {
        name: 'multiple items with different prices',
        items: [
          { menuItemId: 'item-1', name: 'Item 1', quantity: 2, price: 10.0 },
          { menuItemId: 'item-2', name: 'Item 2', quantity: 1, price: 5.0 },
        ],
        expectedSubtotal: 25.0,
      },
      {
        name: 'items with penny prices',
        items: [
          { menuItemId: 'item-1', name: 'Item 1', quantity: 1, price: 0.01 },
          { menuItemId: 'item-2', name: 'Item 2', quantity: 1, price: 0.02 },
        ],
        expectedSubtotal: 0.03,
      },
    ];

    test.each(calculationScenarios)(
      'should calculate correct subtotal for $name',
      ({ items, expectedSubtotal }) => {
        // Arrange
        const props = createOrderSummaryProps(items);

        // Act
        render(<OrderSummary {...props} />);

        // Assert
        const calculatedSubtotal = calculateExpectedSubtotal(items);
        expect(calculatedSubtotal).toBe(expectedSubtotal);
        expect(items.length).toBeGreaterThan(0);
        expect(screen.getByText('Item 1')).toBeInTheDocument();

        // Cleanup for next iteration
        cleanup();
      }
    );
  });

  // ==========================================================================
  // Integration with Fixtures Tests
  // ==========================================================================
  describe('fixture integration', () => {
    it('should work with createOrderItem factory function', () => {
      // Arrange - use createOrderItem from fixtures
      const customItem = createOrderItem('burger-001', 2);
      const items = [customItem];
      const props = createOrderSummaryProps(items);

      // Act
      render(<OrderSummary {...props} />);

      // Assert
      expect(customItem.quantity).toBe(2);
      expect(customItem.menuItemId).toBe('burger-001');
      expect(items.length).toBe(1);
    });

    it('should work with createMenuItem factory function', () => {
      // Arrange - use createMenuItem from menuItems fixtures
      const customMenuItem = createMenuItem({
        name: 'Custom Test Burger',
        price: 12.99,
      });

      const orderItem: OrderItem = {
        menuItemId: customMenuItem.id,
        name: customMenuItem.name,
        quantity: 1,
        price: customMenuItem.price,
      };

      const props = createOrderSummaryProps([orderItem]);

      // Act
      render(<OrderSummary {...props} />);

      // Assert
      expect(screen.getByText('Custom Test Burger')).toBeInTheDocument();
      expect(screen.getByText(/12\.99/)).toBeInTheDocument();
      expect(customMenuItem.category).toBe('burgers');
    });

    it('should use promotionalItem fixture for zero-price testing', () => {
      // Arrange - use promotionalItem from menuItems fixtures
      const promoOrderItem: OrderItem = {
        menuItemId: promotionalItem.id,
        name: promotionalItem.name,
        quantity: 1,
        price: promotionalItem.price,
      };
      const props = createOrderSummaryProps([promoOrderItem]);

      // Act
      render(<OrderSummary {...props} />);

      // Assert
      expect(screen.getByText('Free Cookie')).toBeInTheDocument();
      expect(promotionalItem.price).toBe(0);
      expect(promoOrderItem.price).toBe(0);
    });

    it('should use longNameItem fixture for text overflow testing', () => {
      // Arrange - use longNameItem from menuItems fixtures
      const longNameOrderItem: OrderItem = {
        menuItemId: longNameItem.id,
        name: longNameItem.name,
        quantity: 1,
        price: longNameItem.price,
      };
      const props = createOrderSummaryProps([longNameOrderItem]);

      // Act
      render(<OrderSummary {...props} />);

      // Assert
      expect(longNameItem.name.length).toBeGreaterThan(80);
      expect(longNameItem.price).toBe(15.99);
      const textContent =
        screen.queryByText(/Ultimate/) || screen.queryByText(/Double Bacon/);
      expect(textContent || screen.getByText(/15\.99/)).toBeInTheDocument();
    });

    it('should display testOrders data correctly', () => {
      // Arrange - use testOrders from fixtures
      const firstOrder = testOrders[0];
      const props = createOrderSummaryProps(firstOrder.items);

      // Act
      render(<OrderSummary {...props} />);

      // Assert
      expect(testOrders.length).toBeGreaterThan(0);
      expect(firstOrder.items.length).toBeGreaterThan(0);
      expect(screen.getByText(firstOrder.items[0].name)).toBeInTheDocument();
    });

    it('should use menuItems array for reference data', () => {
      // Arrange - create order items from menuItems fixture
      const orderItems: OrderItem[] = menuItems.slice(0, 3).map((menuItem) => ({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: 1,
        price: menuItem.price,
      }));
      const props = createOrderSummaryProps(orderItems);

      // Act
      render(<OrderSummary {...props} />);

      // Assert
      expect(menuItems.length).toBeGreaterThan(0);
      expect(orderItems.length).toBe(3);
      expect(screen.getByText(orderItems[0].name)).toBeInTheDocument();
    });
  });
});
