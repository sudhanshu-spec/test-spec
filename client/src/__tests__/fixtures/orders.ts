/**
 * @fileoverview Order test fixtures for ordering and checkout testing
 * @module tests/fixtures/orders
 * 
 * Provides consistent, typed test data for online ordering and checkout tests.
 * Exports TestOrder interface and collections of orders in various states
 * (pending, confirmed, preparing, delivered, cancelled).
 * 
 * Used by:
 * - Orders API mock handlers
 * - Order/checkout component tests
 * - Cart operations tests
 * - Integration tests for ordering flow
 * 
 * Follows patterns established in:
 * - tests/lifecycle/server.test.js (factory functions)
 * - tests/unit/config.test.js (type definitions)
 */

import { menuItems, TestMenuItem } from './menuItems';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Valid order status values representing the order lifecycle.
 * @type OrderStatus
 */
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

/**
 * Delivery address structure for order shipment.
 * @interface Address
 */
export interface Address {
  /** Street address including number */
  street: string;
  /** City name */
  city: string;
  /** State abbreviation or full name */
  state: string;
  /** Postal/ZIP code */
  zipCode: string;
}

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
  /** Price per unit at time of order */
  price: number;
  /** Optional special preparation instructions */
  specialInstructions?: string;
}

/**
 * Represents a complete order in the test data.
 * @interface TestOrder
 */
export interface TestOrder {
  /** Unique order identifier */
  id: string;
  /** User ID who placed the order */
  userId: string;
  /** Array of items in the order */
  items: OrderItem[];
  /** Total order amount in dollars */
  total: number;
  /** Current order status */
  status: OrderStatus;
  /** ISO timestamp when order was created */
  createdAt: string;
  /** ISO timestamp when order was last updated */
  updatedAt?: string;
  /** Payment method used */
  paymentMethod: string;
  /** Optional delivery address for delivery orders */
  deliveryAddress?: Address;
}

/**
 * Request payload for creating a new order.
 * @interface CreateOrderRequest
 */
export interface CreateOrderRequest {
  /** Array of items to order */
  items: OrderItem[];
  /** Payment method to use */
  paymentMethod: string;
  /** Optional delivery address */
  deliveryAddress?: Address;
}

// ============================================================================
// Default Test Data Configuration
// ============================================================================

/**
 * Default address for delivery orders.
 */
const DEFAULT_ADDRESS: Address = {
  street: '123 Main Street',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
};

/**
 * Counter for generating unique order IDs.
 */
let orderCounter = 0;

/**
 * Counter for generating unique order item references.
 */
let orderItemCounter = 0;

// ============================================================================
// Order Status Data
// ============================================================================

/**
 * Array of all possible order status values.
 * Used for validation and status dropdown tests.
 */
export const orderStatuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
];

/**
 * Object mapping valid status transitions.
 * Key is current status, value is array of allowed next statuses.
 */
export const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// ============================================================================
// Payment Methods
// ============================================================================

/**
 * Array of available payment methods.
 */
export const paymentMethods: string[] = [
  'credit_card',
  'debit_card',
  'cash',
];

/**
 * Failed payment scenario response structure.
 * Used for testing payment failure handling.
 */
export const failedPaymentScenario = {
  success: false,
  error: {
    code: 'PAYMENT_DECLINED',
    message: 'Your payment was declined. Please try a different payment method.',
  },
};

// ============================================================================
// Helper Functions (Following server.test.js Factory Pattern)
// ============================================================================

/**
 * Creates an OrderItem from a menu item with optional quantity override.
 * Factory function following createMockServer pattern from server.test.js.
 * 
 * @param menuItemId - ID of the menu item to create order item from
 * @param quantity - Number of items (defaults to 1)
 * @returns OrderItem object with menu item data
 * 
 * @example
 * // Create order item with 2 burgers
 * const burgerItem = createOrderItem('burger-001', 2);
 * 
 * @example
 * // Create order item with default quantity
 * const singleFries = createOrderItem('side-001');
 */
export function createOrderItem(menuItemId: string, quantity: number = 1): OrderItem {
  // Find the menu item by ID
  const menuItem: TestMenuItem | undefined = menuItems.find(
    (item: TestMenuItem) => item.id === menuItemId
  );
  
  // If menu item not found, create a generic item
  if (!menuItem) {
    const uniqueId = `order-item-${Date.now()}-${++orderItemCounter}`;
    return {
      menuItemId,
      name: 'Unknown Item',
      quantity,
      price: 0,
    };
  }
  
  return {
    menuItemId: menuItem.id,
    name: menuItem.name,
    quantity,
    price: menuItem.price,
  };
}

/**
 * Calculates the total price for an array of order items.
 * Multiplies each item's price by its quantity and sums the results.
 * 
 * @param items - Array of OrderItem objects
 * @returns Total price as a number rounded to 2 decimal places
 * 
 * @example
 * const items = [
 *   { menuItemId: '1', name: 'Burger', quantity: 2, price: 9.99 },
 *   { menuItemId: '2', name: 'Fries', quantity: 1, price: 3.99 },
 * ];
 * const total = calculateOrderTotal(items); // Returns 23.97
 */
export function calculateOrderTotal(items: OrderItem[]): number {
  const total = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  // Round to 2 decimal places to avoid floating point precision issues
  return Math.round(total * 100) / 100;
}

/**
 * Factory function for creating test orders with custom overrides.
 * Follows the createMockServer pattern from server.test.js.
 * 
 * @param overrides - Partial TestOrder properties to override defaults
 * @returns A complete TestOrder object
 * 
 * @example
 * // Create a pending order
 * const pending = createOrder({ status: 'pending' });
 * 
 * @example
 * // Create a completed delivery order
 * const delivery = createOrder({
 *   status: 'delivered',
 *   deliveryAddress: { street: '456 Oak Ave', city: 'Chicago', state: 'IL', zipCode: '60601' }
 * });
 */
export function createOrder(overrides?: Partial<TestOrder>): TestOrder {
  const uniqueId = `order-${Date.now()}-${++orderCounter}`;
  const timestamp = new Date().toISOString();
  
  // Default items using actual menu items
  const defaultItems: OrderItem[] = [
    createOrderItem('burger-001', 1),
    createOrderItem('side-001', 1),
    createOrderItem('drink-001', 1),
  ];
  
  const items = overrides?.items ?? defaultItems;
  const calculatedTotal = calculateOrderTotal(items);
  
  const baseOrder: TestOrder = {
    id: uniqueId,
    userId: 'user-001',
    items,
    total: calculatedTotal,
    status: 'pending',
    createdAt: timestamp,
    paymentMethod: 'credit_card',
    ...overrides,
  };
  
  // Recalculate total if items were overridden but total wasn't
  if (overrides?.items && !overrides?.total) {
    baseOrder.total = calculateOrderTotal(baseOrder.items);
  }
  
  return baseOrder;
}

// ============================================================================
// Cart Fixtures
// ============================================================================

/**
 * Empty cart items array for validation testing.
 * Used to test empty cart scenarios and validation.
 */
export const emptyCart: OrderItem[] = [];

/**
 * Cart with a single item for minimum order testing.
 */
export const singleItemCart: OrderItem[] = [
  {
    menuItemId: 'burger-001',
    name: 'Classic Burger',
    quantity: 1,
    price: 8.99,
  },
];

/**
 * Full cart with multiple varied items from different categories.
 * Used for comprehensive checkout flow testing.
 */
export const fullCart: OrderItem[] = [
  {
    menuItemId: 'burger-001',
    name: 'Classic Burger',
    quantity: 2,
    price: 8.99,
  },
  {
    menuItemId: 'burger-002',
    name: 'Cheese Burger',
    quantity: 1,
    price: 9.99,
  },
  {
    menuItemId: 'side-001',
    name: 'Fries',
    quantity: 2,
    price: 3.99,
  },
  {
    menuItemId: 'drink-001',
    name: 'Soda',
    quantity: 3,
    price: 2.49,
  },
  {
    menuItemId: 'dessert-001',
    name: 'Ice Cream',
    quantity: 1,
    price: 4.49,
  },
];

// ============================================================================
// Individual Order Fixtures by Status
// ============================================================================

/**
 * Single pending order awaiting confirmation.
 * Used for testing pending state display and confirmation actions.
 */
export const pendingOrder: TestOrder = {
  id: 'order-pending-001',
  userId: 'user-001',
  items: [
    {
      menuItemId: 'burger-001',
      name: 'Classic Burger',
      quantity: 1,
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
      quantity: 1,
      price: 2.49,
    },
  ],
  total: 15.47,
  status: 'pending',
  createdAt: '2024-01-15T10:30:00.000Z',
  paymentMethod: 'credit_card',
};

/**
 * Order that has been confirmed by the restaurant.
 * Used for testing confirmed state transitions.
 */
export const confirmedOrder: TestOrder = {
  id: 'order-confirmed-001',
  userId: 'user-001',
  items: [
    {
      menuItemId: 'burger-002',
      name: 'Cheese Burger',
      quantity: 2,
      price: 9.99,
    },
    {
      menuItemId: 'side-002',
      name: 'Onion Rings',
      quantity: 1,
      price: 4.49,
    },
  ],
  total: 24.47,
  status: 'confirmed',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:05:00.000Z',
  paymentMethod: 'debit_card',
};

/**
 * Order currently being prepared in the kitchen.
 * Used for testing preparation state and progress indicators.
 */
export const preparingOrder: TestOrder = {
  id: 'order-preparing-001',
  userId: 'user-002',
  items: [
    {
      menuItemId: 'burger-003',
      name: 'Bacon Burger',
      quantity: 1,
      price: 11.99,
      specialInstructions: 'Extra crispy bacon please',
    },
    {
      menuItemId: 'side-001',
      name: 'Fries',
      quantity: 1,
      price: 3.99,
    },
    {
      menuItemId: 'drink-003',
      name: 'Milkshake',
      quantity: 1,
      price: 5.99,
    },
  ],
  total: 21.97,
  status: 'preparing',
  createdAt: '2024-01-15T09:30:00.000Z',
  updatedAt: '2024-01-15T09:40:00.000Z',
  paymentMethod: 'credit_card',
};

/**
 * Successfully delivered/completed order.
 * Used for testing completion state and order history.
 */
export const completedOrder: TestOrder = {
  id: 'order-completed-001',
  userId: 'user-001',
  items: [
    {
      menuItemId: 'burger-004',
      name: 'Veggie Burger',
      quantity: 1,
      price: 10.49,
    },
    {
      menuItemId: 'side-004',
      name: 'Garden Salad',
      quantity: 1,
      price: 5.49,
    },
    {
      menuItemId: 'drink-002',
      name: 'Lemonade',
      quantity: 2,
      price: 3.49,
    },
  ],
  total: 22.96,
  status: 'delivered',
  createdAt: '2024-01-14T18:00:00.000Z',
  updatedAt: '2024-01-14T18:45:00.000Z',
  paymentMethod: 'cash',
  deliveryAddress: DEFAULT_ADDRESS,
};

/**
 * Cancelled order for cancellation flow testing.
 * Used for testing cancelled state display and refund scenarios.
 */
export const cancelledOrder: TestOrder = {
  id: 'order-cancelled-001',
  userId: 'user-003',
  items: [
    {
      menuItemId: 'burger-001',
      name: 'Classic Burger',
      quantity: 3,
      price: 8.99,
    },
  ],
  total: 26.97,
  status: 'cancelled',
  createdAt: '2024-01-14T12:00:00.000Z',
  updatedAt: '2024-01-14T12:02:00.000Z',
  paymentMethod: 'credit_card',
};

// ============================================================================
// Order Collections
// ============================================================================

/**
 * Collection of test orders in various statuses.
 * Used for order history and list view testing.
 */
export const testOrders: TestOrder[] = [
  pendingOrder,
  confirmedOrder,
  preparingOrder,
  completedOrder,
  cancelledOrder,
];

// ============================================================================
// Edge Case Test Orders
// ============================================================================

/**
 * Order with a single item (minimum order).
 */
export const singleItemOrder: TestOrder = {
  id: 'order-single-001',
  userId: 'user-001',
  items: [
    {
      menuItemId: 'side-003',
      name: 'Coleslaw',
      quantity: 1,
      price: 2.99,
    },
  ],
  total: 2.99,
  status: 'pending',
  createdAt: '2024-01-15T11:00:00.000Z',
  paymentMethod: 'cash',
};

/**
 * Order with maximum quantity per item for boundary testing.
 */
export const maxQuantityOrder: TestOrder = {
  id: 'order-maxqty-001',
  userId: 'user-001',
  items: [
    {
      menuItemId: 'burger-001',
      name: 'Classic Burger',
      quantity: 99,
      price: 8.99,
    },
  ],
  total: 890.01,
  status: 'pending',
  createdAt: '2024-01-15T11:30:00.000Z',
  paymentMethod: 'credit_card',
};

/**
 * Order with special instructions on all items.
 * Used for testing special instructions display and handling.
 */
export const specialInstructionsOrder: TestOrder = {
  id: 'order-special-001',
  userId: 'user-001',
  items: [
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
    {
      menuItemId: 'drink-001',
      name: 'Soda',
      quantity: 1,
      price: 2.49,
      specialInstructions: 'Light ice',
    },
  ],
  total: 15.47,
  status: 'confirmed',
  createdAt: '2024-01-15T12:00:00.000Z',
  paymentMethod: 'debit_card',
};

/**
 * Creates a large order with many items for performance testing.
 * Generates 100+ items across different menu categories.
 */
export function createLargeOrder(): TestOrder {
  const largeItems: OrderItem[] = [];
  
  // Add 25 of each category
  for (let i = 0; i < 25; i++) {
    largeItems.push({
      menuItemId: 'burger-001',
      name: 'Classic Burger',
      quantity: 1,
      price: 8.99,
    });
    largeItems.push({
      menuItemId: 'side-001',
      name: 'Fries',
      quantity: 1,
      price: 3.99,
    });
    largeItems.push({
      menuItemId: 'drink-001',
      name: 'Soda',
      quantity: 1,
      price: 2.49,
    });
    largeItems.push({
      menuItemId: 'dessert-001',
      name: 'Ice Cream',
      quantity: 1,
      price: 4.49,
    });
  }
  
  return {
    id: 'order-large-001',
    userId: 'user-001',
    items: largeItems,
    total: calculateOrderTotal(largeItems),
    status: 'pending',
    createdAt: new Date().toISOString(),
    paymentMethod: 'credit_card',
  };
}

/**
 * Order with empty items array for validation testing.
 * This should trigger validation errors in the UI.
 */
export const emptyItemsOrder: TestOrder = {
  id: 'order-empty-001',
  userId: 'user-001',
  items: [],
  total: 0,
  status: 'pending',
  createdAt: '2024-01-15T12:30:00.000Z',
  paymentMethod: 'credit_card',
};

// ============================================================================
// API Response Fixtures
// ============================================================================

/**
 * Successful order creation response.
 * Returned when a new order is successfully placed.
 */
export const newOrderResponse = {
  success: true,
  order: {
    id: 'order-new-001',
    status: 'pending',
    estimatedTime: '25-35 minutes',
    createdAt: new Date().toISOString(),
  },
  message: 'Your order has been placed successfully!',
};

/**
 * Paginated order history response.
 * Used for testing order history listing with pagination.
 */
export const orderHistoryResponse = {
  orders: testOrders,
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: testOrders.length,
    totalPages: 1,
  },
};

/**
 * 404 error response for non-existent order.
 * Used for testing error handling when order is not found.
 */
export const orderNotFoundResponse = {
  success: false,
  error: {
    code: 'ORDER_NOT_FOUND',
    message: 'The requested order could not be found.',
  },
  statusCode: 404,
};

/**
 * Order update success response.
 * Returned when order status is successfully updated.
 */
export const orderUpdateResponse = {
  success: true,
  order: confirmedOrder,
  message: 'Order status updated successfully.',
};

/**
 * Order cancellation success response.
 * Returned when an order is successfully cancelled.
 */
export const orderCancellationResponse = {
  success: true,
  order: cancelledOrder,
  message: 'Your order has been cancelled. A refund will be processed within 3-5 business days.',
};

// ============================================================================
// Delivery Address Fixtures
// ============================================================================

/**
 * Valid delivery address for testing successful delivery orders.
 */
export const validDeliveryAddress: Address = {
  street: '456 Oak Avenue, Apt 12',
  city: 'Chicago',
  state: 'IL',
  zipCode: '60601',
};

/**
 * Alternate delivery address for testing address changes.
 */
export const alternateDeliveryAddress: Address = {
  street: '789 Pine Street',
  city: 'Naperville',
  state: 'IL',
  zipCode: '60540',
};

/**
 * Collection of various delivery addresses for testing.
 */
export const deliveryAddresses: Address[] = [
  DEFAULT_ADDRESS,
  validDeliveryAddress,
  alternateDeliveryAddress,
];
