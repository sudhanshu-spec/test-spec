/**
 * @fileoverview Orders API mock handlers for MSW
 * @module tests/mocks/handlers/orders
 *
 * Provides MSW request handlers for order API endpoints used in testing.
 * Supports order creation, retrieval, history, and status update workflows.
 *
 * Endpoints handled:
 * - POST /api/orders - Create new order from cart
 * - GET /api/orders/:id - Get order by ID
 * - GET /api/orders/history - Get user's order history (paginated)
 * - PATCH /api/orders/:id/status - Update order status
 *
 * Uses MSW 2.7.0 patterns with http.get/post/patch and HttpResponse.
 * Follows patterns from tests/lifecycle/server.test.js for organization.
 *
 * @see {@link https://mswjs.io/docs/api/http} MSW HTTP handlers documentation
 */

import { http, HttpResponse } from 'msw';
import type {
  TestOrder,
  OrderStatus,
  OrderItem,
  Address,
  CreateOrderRequest,
} from '../../fixtures/orders';
import {
  testOrders,
  newOrderResponse,
  orderNotFoundResponse,
  orderHistoryResponse,
  orderStatuses,
  statusTransitions,
  pendingOrder,
  confirmedOrder,
  preparingOrder,
  completedOrder,
  cancelledOrder,
  failedPaymentScenario,
  calculateOrderTotal,
} from '../../fixtures/orders';

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for orders API endpoints.
 */
const API_BASE_URL = '/api/orders';

/**
 * Maximum allowed quantity per item in an order.
 */
const MAX_ITEM_QUANTITY = 99;

/**
 * Minimum order total required for processing.
 */
const MINIMUM_ORDER_TOTAL = 0;

/**
 * Simulated payment methods that will fail for testing purposes.
 */
const FAILING_PAYMENT_METHODS = ['test_fail', 'decline_card', 'invalid_card'];

/**
 * Stock unavailability simulation item IDs.
 */
const OUT_OF_STOCK_ITEMS = ['burger-999', 'out-of-stock-item'];

// ============================================================================
// Type Definitions for API Requests/Responses
// ============================================================================

/**
 * Error response structure for API errors.
 */
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  statusCode: number;
}

/**
 * Success response for order creation.
 */
interface CreateOrderResponse {
  success: true;
  order: {
    id: string;
    status: OrderStatus;
    estimatedTime: string;
    createdAt: string;
  };
  message: string;
}

/**
 * Success response for order retrieval.
 */
interface GetOrderResponse {
  success: true;
  order: TestOrder;
}

/**
 * Paginated order history response.
 */
interface OrderHistoryResponse {
  orders: TestOrder[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Request body for status update.
 */
interface UpdateStatusRequest {
  status: OrderStatus;
}

/**
 * Response for successful status update.
 */
interface UpdateStatusResponse {
  success: true;
  order: TestOrder;
  message: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates order items for completeness and valid quantities.
 * Returns validation errors if any items are invalid.
 *
 * @param items - Array of order items to validate
 * @returns Array of validation error messages, empty if valid
 */
function validateOrderItems(items: OrderItem[]): string[] {
  const errors: string[] = [];

  if (!items || !Array.isArray(items)) {
    errors.push('Items must be provided as an array');
    return errors;
  }

  if (items.length === 0) {
    errors.push('Order must contain at least one item');
    return errors;
  }

  items.forEach((item, index) => {
    if (!item.menuItemId) {
      errors.push(`Item at index ${index} is missing menuItemId`);
    }

    if (typeof item.quantity !== 'number') {
      errors.push(`Item at index ${index} is missing quantity`);
    } else if (item.quantity <= 0) {
      errors.push(`Item at index ${index} has invalid quantity: must be greater than 0`);
    } else if (item.quantity > MAX_ITEM_QUANTITY) {
      errors.push(`Item at index ${index} exceeds maximum quantity of ${MAX_ITEM_QUANTITY}`);
    }

    // Check for out-of-stock items
    if (OUT_OF_STOCK_ITEMS.includes(item.menuItemId)) {
      errors.push(`Item "${item.menuItemId}" is currently out of stock`);
    }
  });

  return errors;
}

/**
 * Validates payment method is acceptable.
 *
 * @param paymentMethod - The payment method to validate
 * @returns True if valid, false otherwise
 */
function isValidPaymentMethod(paymentMethod: string): boolean {
  const validMethods = ['credit_card', 'debit_card', 'cash', 'test_success'];
  return validMethods.includes(paymentMethod) || FAILING_PAYMENT_METHODS.includes(paymentMethod);
}

/**
 * Checks if payment method should fail (for testing payment failures).
 *
 * @param paymentMethod - The payment method to check
 * @returns True if payment should fail, false otherwise
 */
function shouldPaymentFail(paymentMethod: string): boolean {
  return FAILING_PAYMENT_METHODS.includes(paymentMethod);
}

/**
 * Finds an order by ID from the test orders collection.
 * Also checks individual order fixtures.
 *
 * @param orderId - The order ID to search for
 * @returns The order if found, undefined otherwise
 */
function findOrderById(orderId: string): TestOrder | undefined {
  // First check the testOrders array
  const foundOrder = testOrders.find((order) => order.id === orderId);
  if (foundOrder) {
    return foundOrder;
  }

  // Check individual fixtures
  const individualOrders = [
    pendingOrder,
    confirmedOrder,
    preparingOrder,
    completedOrder,
    cancelledOrder,
  ];

  return individualOrders.find((order) => order.id === orderId);
}

/**
 * Validates that a status transition is allowed.
 *
 * @param currentStatus - The current order status
 * @param newStatus - The requested new status
 * @returns True if transition is valid, false otherwise
 */
function isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  const allowedTransitions = statusTransitions[currentStatus];
  return allowedTransitions ? allowedTransitions.includes(newStatus) : false;
}

/**
 * Generates a unique order ID for new orders.
 *
 * @returns A unique order ID string
 */
function generateOrderId(): string {
  return `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extracts authorization header from request.
 *
 * @param request - The incoming request
 * @returns The authorization token or null
 */
function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }
  // Format: "Bearer <token>"
  const parts = authHeader.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Handler for POST /api/orders - Create new order.
 *
 * Validates cart items, processes payment, and creates new order.
 * Returns order confirmation with ID and estimated delivery time.
 *
 * @returns HttpResponse with created order or error
 *
 * Error responses:
 * - 400 Bad Request: Empty cart, invalid items, validation errors
 * - 402 Payment Required: Payment failure
 * - 409 Conflict: Stock unavailability
 */
const createOrderHandler = http.post(`${API_BASE_URL}`, async ({ request }) => {
  let body: CreateOrderRequest;

  try {
    body = (await request.json()) as CreateOrderRequest;
  } catch {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: 'Request body must be valid JSON',
        },
        statusCode: 400,
      } as ApiErrorResponse,
      { status: 400 }
    );
  }

  const { items, paymentMethod, deliveryAddress } = body;

  // Validate items
  const validationErrors = validateOrderItems(items);
  if (validationErrors.length > 0) {
    // Check if it's a stock issue
    const stockErrors = validationErrors.filter((err) => err.includes('out of stock'));
    if (stockErrors.length > 0) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'STOCK_UNAVAILABLE',
            message: 'Some items in your order are currently unavailable',
            details: { unavailableItems: stockErrors.join(', ') },
          },
          statusCode: 409,
        } as ApiErrorResponse,
        { status: 409 }
      );
    }

    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Order validation failed',
          details: { errors: validationErrors.join('; ') },
        },
        statusCode: 400,
      } as ApiErrorResponse,
      { status: 400 }
    );
  }

  // Validate payment method
  if (!paymentMethod) {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_PAYMENT_METHOD',
          message: 'Payment method is required',
        },
        statusCode: 400,
      } as ApiErrorResponse,
      { status: 400 }
    );
  }

  if (!isValidPaymentMethod(paymentMethod)) {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_PAYMENT_METHOD',
          message: `Payment method "${paymentMethod}" is not supported`,
        },
        statusCode: 400,
      } as ApiErrorResponse,
      { status: 400 }
    );
  }

  // Simulate payment failure
  if (shouldPaymentFail(paymentMethod)) {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: failedPaymentScenario.error.code,
          message: failedPaymentScenario.error.message,
        },
        statusCode: 402,
      } as ApiErrorResponse,
      { status: 402 }
    );
  }

  // Calculate order total
  const total = calculateOrderTotal(items);

  // Validate minimum order
  if (total < MINIMUM_ORDER_TOTAL) {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'MINIMUM_ORDER_NOT_MET',
          message: `Order total must be at least $${MINIMUM_ORDER_TOTAL}`,
        },
        statusCode: 400,
      } as ApiErrorResponse,
      { status: 400 }
    );
  }

  // Create successful order response
  const orderId = generateOrderId();
  const createdAt = new Date().toISOString();

  const response: CreateOrderResponse = {
    success: true,
    order: {
      id: orderId,
      status: 'pending',
      estimatedTime: newOrderResponse.order.estimatedTime,
      createdAt,
    },
    message: newOrderResponse.message,
  };

  return HttpResponse.json(response, { status: 201 });
});

/**
 * Handler for GET /api/orders/history - Get user's order history.
 *
 * Returns paginated list of user's past orders.
 * Requires authentication.
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 10)
 *
 * @returns HttpResponse with paginated orders or error
 *
 * Error responses:
 * - 401 Unauthorized: Missing or invalid auth token
 */
const getOrderHistoryHandler = http.get(`${API_BASE_URL}/history`, ({ request }) => {
  // Check authentication
  const token = getAuthToken(request);
  if (!token) {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to view order history',
        },
        statusCode: 401,
      } as ApiErrorResponse,
      { status: 401 }
    );
  }

  // Parse pagination parameters
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);

  // Validate pagination
  const validPage = Math.max(1, page);
  const validPageSize = Math.min(Math.max(1, pageSize), 50);

  // Calculate pagination
  const totalItems = testOrders.length;
  const totalPages = Math.ceil(totalItems / validPageSize);
  const startIndex = (validPage - 1) * validPageSize;
  const endIndex = startIndex + validPageSize;

  // Get paginated orders
  const paginatedOrders = testOrders.slice(startIndex, endIndex);

  const response: OrderHistoryResponse = {
    orders: paginatedOrders,
    pagination: {
      page: validPage,
      pageSize: validPageSize,
      totalItems,
      totalPages,
    },
  };

  return HttpResponse.json(response, { status: 200 });
});

/**
 * Handler for GET /api/orders/:id - Get order by ID.
 *
 * Returns detailed order information for the specified order ID.
 * Validates authorization to ensure user can only access their own orders.
 *
 * @returns HttpResponse with order details or error
 *
 * Error responses:
 * - 401 Unauthorized: Missing auth token
 * - 403 Forbidden: User not authorized to view this order
 * - 404 Not Found: Order does not exist
 */
const getOrderByIdHandler = http.get(`${API_BASE_URL}/:id`, ({ params, request }) => {
  const orderId = params.id as string;

  // Check authentication
  const token = getAuthToken(request);
  if (!token) {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to view order details',
        },
        statusCode: 401,
      } as ApiErrorResponse,
      { status: 401 }
    );
  }

  // Find the order
  const order = findOrderById(orderId);

  if (!order) {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: orderNotFoundResponse.error.code,
          message: orderNotFoundResponse.error.message,
        },
        statusCode: 404,
      } as ApiErrorResponse,
      { status: 404 }
    );
  }

  // Simulate authorization check
  // In tests, we'll use a special token format to simulate unauthorized access
  if (token === 'unauthorized_user_token') {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to view this order',
        },
        statusCode: 403,
      } as ApiErrorResponse,
      { status: 403 }
    );
  }

  const response: GetOrderResponse = {
    success: true,
    order,
  };

  return HttpResponse.json(response, { status: 200 });
});

/**
 * Handler for PATCH /api/orders/:id/status - Update order status.
 *
 * Updates the status of an existing order.
 * Validates that the status transition is allowed.
 *
 * @returns HttpResponse with updated order or error
 *
 * Error responses:
 * - 400 Bad Request: Invalid status or transition not allowed
 * - 401 Unauthorized: Missing auth token
 * - 404 Not Found: Order does not exist
 */
const updateOrderStatusHandler = http.patch(
  `${API_BASE_URL}/:id/status`,
  async ({ params, request }) => {
    const orderId = params.id as string;

    // Check authentication
    const token = getAuthToken(request);
    if (!token) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to update order status',
          },
          statusCode: 401,
        } as ApiErrorResponse,
        { status: 401 }
      );
    }

    // Parse request body
    let body: UpdateStatusRequest;
    try {
      body = (await request.json()) as UpdateStatusRequest;
    } catch {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST_BODY',
            message: 'Request body must be valid JSON',
          },
          statusCode: 400,
        } as ApiErrorResponse,
        { status: 400 }
      );
    }

    const { status: newStatus } = body;

    // Validate new status
    if (!newStatus || !orderStatuses.includes(newStatus)) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Status must be one of: ${orderStatuses.join(', ')}`,
          },
          statusCode: 400,
        } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Find the order
    const order = findOrderById(orderId);

    if (!order) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: orderNotFoundResponse.error.code,
            message: orderNotFoundResponse.error.message,
          },
          statusCode: 404,
        } as ApiErrorResponse,
        { status: 404 }
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(order.status, newStatus)) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot transition from "${order.status}" to "${newStatus}"`,
            details: {
              currentStatus: order.status,
              requestedStatus: newStatus,
              allowedTransitions: statusTransitions[order.status]?.join(', ') || 'none',
            },
          },
          statusCode: 400,
        } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Create updated order
    const updatedOrder: TestOrder = {
      ...order,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    const response: UpdateStatusResponse = {
      success: true,
      order: updatedOrder,
      message: `Order status updated to "${newStatus}"`,
    };

    return HttpResponse.json(response, { status: 200 });
  }
);

// ============================================================================
// Exported Handler Array
// ============================================================================

/**
 * Array of all order-related MSW request handlers.
 *
 * Import this array and spread into the MSW server setup handlers array.
 *
 * @example
 * import { ordersHandlers } from './handlers/orders';
 * import { setupServer } from 'msw/node';
 *
 * const server = setupServer(...ordersHandlers);
 *
 * @see {@link createOrderHandler} - POST /api/orders
 * @see {@link getOrderByIdHandler} - GET /api/orders/:id
 * @see {@link getOrderHistoryHandler} - GET /api/orders/history
 * @see {@link updateOrderStatusHandler} - PATCH /api/orders/:id/status
 */
export const ordersHandlers = [
  createOrderHandler,
  getOrderHistoryHandler,
  getOrderByIdHandler,
  updateOrderStatusHandler,
];
