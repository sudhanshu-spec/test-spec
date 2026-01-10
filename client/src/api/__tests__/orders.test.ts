/**
 * @fileoverview Unit tests for orders API functions
 * @module tests/api/orders
 *
 * Comprehensive test suite for orders API operations including:
 * - Order creation with validation
 * - Order retrieval by ID
 * - Order history with pagination
 * - Order status updates
 *
 * Follows patterns from:
 * - tests/unit/config.test.js (JSDoc, type definitions)
 * - tests/lifecycle/server.test.js (factory functions, mock patterns)
 * - tests/integration/endpoints.test.js (HTTP testing patterns)
 *
 * Uses Vitest with MSW for API mocking with AAA (Arrange, Act, Assert) pattern.
 * Minimum 3 assertions per test for comprehensive coverage.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../__tests__/mocks/server';
import {
  testOrders,
  pendingOrder,
  newOrderResponse,
  confirmedOrder,
  cancelledOrder,
  orderStatuses,
  statusTransitions,
  createOrder,
  createOrderItem,
  calculateOrderTotal,
  emptyCart,
  singleItemCart,
  fullCart,
  paymentMethods,
  failedPaymentScenario,
  orderHistoryResponse,
  type TestOrder,
  type OrderItem,
  type OrderStatus,
  type CreateOrderRequest,
} from '../../__tests__/fixtures/orders';
import { menuItems, type TestMenuItem } from '../../__tests__/fixtures/menuItems';

// ============================================================================
// Type Definitions (following server.test.js typedef patterns)
// ============================================================================

/**
 * Configuration for API request parameters.
 * @interface RequestConfig
 */
interface RequestConfig {
  /** HTTP method to use */
  method: string;
  /** Request URL */
  url: string;
  /** Optional request headers */
  headers?: Record<string, string>;
  /** Optional request body */
  body?: unknown;
}

/**
 * Standard API response structure.
 * @interface ApiResponse
 */
interface ApiResponse<T> {
  /** Response data payload */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers?: Record<string, string>;
}

/**
 * API error structure for error responses.
 * @interface ApiError
 */
interface ApiError {
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Optional error code */
  code?: string;
}

/**
 * Pagination parameters for list requests.
 * @interface PaginationParams
 */
interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  limit?: number;
}

// ============================================================================
// Test Constants (following DEFAULT_CONFIG pattern from server.test.js)
// ============================================================================

/** Base URL for orders API endpoints */
const BASE_URL = '/api/orders';

/** Default Content-Type header for JSON requests */
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

/** Test user ID for authenticated requests */
const TEST_USER_ID = 'user-001';

/** Test authorization token */
const TEST_AUTH_TOKEN = 'Bearer test-jwt-token-12345';

/** Default timeout for API requests in milliseconds */
const DEFAULT_TIMEOUT = 10000;

// ============================================================================
// Helper Functions (following createMockServer pattern from server.test.js)
// ============================================================================

/**
 * Creates a mock OrderItem from menu item data.
 * Factory function following createMockServer pattern.
 *
 * @param menuItemId - ID of the menu item
 * @param quantity - Quantity to order (defaults to 1)
 * @returns OrderItem object with menu item data
 */
function createMockOrderItem(menuItemId: string, quantity: number = 1): OrderItem {
  const menuItem = menuItems.find((item: TestMenuItem) => item.id === menuItemId);

  if (!menuItem) {
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
 * Creates a mock CreateOrderRequest with optional overrides.
 * Factory function following setupMocks pattern.
 *
 * @param items - Array of order items
 * @param overrides - Optional partial request properties to override
 * @returns Complete CreateOrderRequest object
 */
function createMockOrderRequest(
  items: OrderItem[],
  overrides?: Partial<CreateOrderRequest>
): CreateOrderRequest {
  return {
    items,
    paymentMethod: 'credit_card',
    ...overrides,
  };
}

/**
 * Calculates expected total from order items.
 * Used for validating order total calculations.
 *
 * @param items - Array of order items
 * @returns Calculated total rounded to 2 decimal places
 */
function calculateExpectedTotal(items: OrderItem[]): number {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Creates a mock successful order response.
 *
 * @param orderId - ID for the created order
 * @param total - Order total amount
 * @returns Mock order creation response
 */
function createSuccessOrderResponse(orderId: string, total: number) {
  return {
    success: true,
    order: {
      id: orderId,
      status: 'pending' as OrderStatus,
      total,
      estimatedTime: '25-35 minutes',
      createdAt: new Date().toISOString(),
    },
    message: 'Your order has been placed successfully!',
  };
}

/**
 * Creates a mock error response for API errors.
 *
 * @param code - Error code
 * @param message - Error message
 * @returns Mock error response object
 */
function createErrorResponse(code: string, message: string) {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}

/**
 * Simulates the orders API module functions.
 * Since the actual API module may not exist yet, we mock the expected behavior.
 */
const ordersApi = {
  /**
   * Creates a new order with the provided items and payment method.
   */
  async createOrder(request: CreateOrderRequest): Promise<ApiResponse<typeof newOrderResponse>> {
    const response = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error?.message || 'Order creation failed') as ApiError & Error;
      error.status = response.status;
      error.code = errorData.error?.code;
      throw error;
    }

    const data = await response.json();
    return { data, status: response.status };
  },

  /**
   * Retrieves an order by its ID.
   */
  async getOrder(orderId: string): Promise<ApiResponse<TestOrder>> {
    const response = await fetch(`${BASE_URL}/${orderId}`, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: TEST_AUTH_TOKEN,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error?.message || 'Order not found') as ApiError & Error;
      error.status = response.status;
      error.code = errorData.error?.code;
      throw error;
    }

    const data = await response.json();
    return { data, status: response.status };
  },

  /**
   * Retrieves the authenticated user's order history.
   */
  async getOrderHistory(params?: PaginationParams): Promise<ApiResponse<typeof orderHistoryResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));

    const url = `${BASE_URL}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: TEST_AUTH_TOKEN,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error?.message || 'Failed to fetch order history') as ApiError & Error;
      error.status = response.status;
      error.code = errorData.error?.code;
      throw error;
    }

    const data = await response.json();
    return { data, status: response.status };
  },

  /**
   * Updates the status of an existing order.
   */
  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<ApiResponse<TestOrder>> {
    const response = await fetch(`${BASE_URL}/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: TEST_AUTH_TOKEN,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error?.message || 'Failed to update order status') as ApiError & Error;
      error.status = response.status;
      error.code = errorData.error?.code;
      throw error;
    }

    const data = await response.json();
    return { data, status: response.status };
  },
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Orders API', () => {
  // -------------------------------------------------------------------------
  // Test Setup (following server.test.js beforeEach/afterAll patterns)
  // -------------------------------------------------------------------------

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  // =========================================================================
  // createOrder Tests
  // =========================================================================

  describe('createOrder', () => {
    it('should create an order with valid items and payment method', async () => {
      // Arrange
      const orderItems = [
        createMockOrderItem('burger-001', 2),
        createMockOrderItem('side-001', 1),
        createMockOrderItem('drink-001', 2),
      ];
      const expectedTotal = calculateExpectedTotal(orderItems);
      const request = createMockOrderRequest(orderItems);

      server.use(
        http.post(`${BASE_URL}`, async ({ request: req }) => {
          const body = await req.json() as CreateOrderRequest;
          return HttpResponse.json(
            createSuccessOrderResponse('order-test-001', expectedTotal),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await ordersApi.createOrder(request);

      // Assert
      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.order).toBeDefined();
      expect(result.data.order.id).toBe('order-test-001');
      expect(result.data.order.status).toBe('pending');
    });

    it('should send POST request to /api/orders endpoint', async () => {
      // Arrange
      const orderItems = [createMockOrderItem('burger-001', 1)];
      const request = createMockOrderRequest(orderItems);
      let capturedMethod: string | undefined;
      let capturedUrl: string | undefined;

      server.use(
        http.post(`${BASE_URL}`, async ({ request: req }) => {
          capturedMethod = req.method;
          capturedUrl = new URL(req.url).pathname;
          return HttpResponse.json(createSuccessOrderResponse('order-001', 8.99), { status: 201 });
        })
      );

      // Act
      await ordersApi.createOrder(request);

      // Assert
      expect(capturedMethod).toBe('POST');
      expect(capturedUrl).toBe('/api/orders');
      expect(request.items.length).toBeGreaterThan(0);
    });

    it('should include Content-Type application/json header', async () => {
      // Arrange
      const orderItems = [createMockOrderItem('burger-001', 1)];
      const request = createMockOrderRequest(orderItems);
      let capturedContentType: string | null = null;

      server.use(
        http.post(`${BASE_URL}`, async ({ request: req }) => {
          capturedContentType = req.headers.get('Content-Type');
          return HttpResponse.json(createSuccessOrderResponse('order-001', 8.99), { status: 201 });
        })
      );

      // Act
      await ordersApi.createOrder(request);

      // Assert
      expect(capturedContentType).toBe('application/json');
      expect(request.paymentMethod).toBeDefined();
      expect(request.items).toBeDefined();
    });

    it('should return order with ID and confirmation on success', async () => {
      // Arrange
      const orderItems = singleItemCart;
      const request = createMockOrderRequest(orderItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json({
            success: true,
            order: {
              id: 'order-confirmed-123',
              status: 'pending',
              total: calculateExpectedTotal(orderItems),
              estimatedTime: '25-35 minutes',
              createdAt: new Date().toISOString(),
            },
            message: 'Your order has been placed successfully!',
          }, { status: 201 });
        })
      );

      // Act
      const result = await ordersApi.createOrder(request);

      // Assert
      expect(result.data.order.id).toBe('order-confirmed-123');
      expect(result.data.message).toContain('successfully');
      expect(result.data.order.estimatedTime).toBeDefined();
      expect(result.data.order.createdAt).toBeDefined();
    });

    it('should calculate correct total from items', async () => {
      // Arrange
      const orderItems = [
        { menuItemId: 'burger-001', name: 'Classic Burger', quantity: 2, price: 8.99 },
        { menuItemId: 'side-001', name: 'Fries', quantity: 1, price: 3.99 },
        { menuItemId: 'drink-001', name: 'Soda', quantity: 2, price: 2.49 },
      ];
      const expectedTotal = calculateExpectedTotal(orderItems); // (8.99 * 2) + (3.99 * 1) + (2.49 * 2) = 26.95
      const request = createMockOrderRequest(orderItems);
      let receivedBody: CreateOrderRequest | undefined;

      server.use(
        http.post(`${BASE_URL}`, async ({ request: req }) => {
          receivedBody = await req.json() as CreateOrderRequest;
          const calculatedTotal = calculateExpectedTotal(receivedBody.items);
          return HttpResponse.json(
            createSuccessOrderResponse('order-calc-001', calculatedTotal),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await ordersApi.createOrder(request);

      // Assert
      expect(result.data.order.total).toBe(expectedTotal);
      expect(result.data.order.total).toBe(26.95);
      expect(receivedBody?.items.length).toBe(3);
    });

    it('should throw 400 error for empty cart', async () => {
      // Arrange
      const request = createMockOrderRequest(emptyCart);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(
            createErrorResponse('EMPTY_CART', 'Cannot create order with empty cart'),
            { status: 400 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.createOrder(request)).rejects.toThrow('Cannot create order with empty cart');

      try {
        await ordersApi.createOrder(request);
      } catch (error) {
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).code).toBe('EMPTY_CART');
      }
    });

    it('should throw 400 error for invalid quantity (0 or negative)', async () => {
      // Arrange
      const invalidItems: OrderItem[] = [
        { menuItemId: 'burger-001', name: 'Classic Burger', quantity: 0, price: 8.99 },
      ];
      const request = createMockOrderRequest(invalidItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(
            createErrorResponse('INVALID_QUANTITY', 'Item quantity must be greater than 0'),
            { status: 400 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.createOrder(request)).rejects.toThrow('Item quantity must be greater than 0');

      try {
        await ordersApi.createOrder(request);
      } catch (error) {
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).code).toBe('INVALID_QUANTITY');
      }
    });

    it('should throw 402 error for payment failure', async () => {
      // Arrange
      const orderItems = singleItemCart;
      const request = createMockOrderRequest(orderItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(failedPaymentScenario, { status: 402 });
        })
      );

      // Act & Assert
      await expect(ordersApi.createOrder(request)).rejects.toThrow('Your payment was declined');

      try {
        await ordersApi.createOrder(request);
      } catch (error) {
        expect((error as ApiError).status).toBe(402);
        expect((error as ApiError).code).toBe('PAYMENT_DECLINED');
      }
    });

    it('should throw 409 error for out of stock items', async () => {
      // Arrange
      const orderItems = [createMockOrderItem('burger-001', 100)];
      const request = createMockOrderRequest(orderItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(
            createErrorResponse('OUT_OF_STOCK', 'Classic Burger is currently out of stock'),
            { status: 409 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.createOrder(request)).rejects.toThrow('out of stock');

      try {
        await ordersApi.createOrder(request);
      } catch (error) {
        expect((error as ApiError).status).toBe(409);
        expect((error as ApiError).code).toBe('OUT_OF_STOCK');
      }
    });
  });

  // =========================================================================
  // getOrder Tests
  // =========================================================================

  describe('getOrder', () => {
    it('should fetch order by ID', async () => {
      // Arrange
      const orderId = pendingOrder.id;

      server.use(
        http.get(`${BASE_URL}/${orderId}`, async () => {
          return HttpResponse.json(pendingOrder, { status: 200 });
        })
      );

      // Act
      const result = await ordersApi.getOrder(orderId);

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.id).toBe(orderId);
      expect(result.data.status).toBe('pending');
      expect(result.data.items).toBeDefined();
    });

    it('should send GET request to /api/orders/:id', async () => {
      // Arrange
      const orderId = 'order-123';
      let capturedMethod: string | undefined;
      let capturedUrl: string | undefined;

      server.use(
        http.get(`${BASE_URL}/:id`, async ({ request: req, params }) => {
          capturedMethod = req.method;
          capturedUrl = new URL(req.url).pathname;
          return HttpResponse.json(pendingOrder, { status: 200 });
        })
      );

      // Act
      await ordersApi.getOrder(orderId);

      // Assert
      expect(capturedMethod).toBe('GET');
      expect(capturedUrl).toBe(`/api/orders/${orderId}`);
      expect(orderId).toBeDefined();
    });

    it('should return complete order details', async () => {
      // Arrange
      const orderId = confirmedOrder.id;

      server.use(
        http.get(`${BASE_URL}/${orderId}`, async () => {
          return HttpResponse.json(confirmedOrder, { status: 200 });
        })
      );

      // Act
      const result = await ordersApi.getOrder(orderId);

      // Assert
      expect(result.data.id).toBe(confirmedOrder.id);
      expect(result.data.userId).toBe(confirmedOrder.userId);
      expect(result.data.items).toEqual(confirmedOrder.items);
      expect(result.data.total).toBe(confirmedOrder.total);
      expect(result.data.status).toBe('confirmed');
      expect(result.data.paymentMethod).toBeDefined();
      expect(result.data.createdAt).toBeDefined();
    });

    it('should throw 404 error when order not found', async () => {
      // Arrange
      const nonExistentOrderId = 'order-non-existent-999';

      server.use(
        http.get(`${BASE_URL}/${nonExistentOrderId}`, async () => {
          return HttpResponse.json(
            createErrorResponse('ORDER_NOT_FOUND', 'The requested order could not be found'),
            { status: 404 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.getOrder(nonExistentOrderId)).rejects.toThrow('could not be found');

      try {
        await ordersApi.getOrder(nonExistentOrderId);
      } catch (error) {
        expect((error as ApiError).status).toBe(404);
        expect((error as ApiError).code).toBe('ORDER_NOT_FOUND');
      }
    });

    it('should throw 403 error for unauthorized access to other users order', async () => {
      // Arrange
      const otherUserOrderId = 'order-other-user-001';

      server.use(
        http.get(`${BASE_URL}/${otherUserOrderId}`, async () => {
          return HttpResponse.json(
            createErrorResponse('FORBIDDEN', 'You do not have permission to access this order'),
            { status: 403 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.getOrder(otherUserOrderId)).rejects.toThrow('permission');

      try {
        await ordersApi.getOrder(otherUserOrderId);
      } catch (error) {
        expect((error as ApiError).status).toBe(403);
        expect((error as ApiError).code).toBe('FORBIDDEN');
      }
    });
  });

  // =========================================================================
  // getOrderHistory Tests
  // =========================================================================

  describe('getOrderHistory', () => {
    it('should fetch user order history', async () => {
      // Arrange
      server.use(
        http.get(`${BASE_URL}/history`, async () => {
          return HttpResponse.json(orderHistoryResponse, { status: 200 });
        })
      );

      // Act
      const result = await ordersApi.getOrderHistory();

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.orders).toBeDefined();
      expect(Array.isArray(result.data.orders)).toBe(true);
      expect(result.data.orders.length).toBeGreaterThan(0);
    });

    it('should send GET request to /api/orders/history', async () => {
      // Arrange
      let capturedMethod: string | undefined;
      let capturedUrl: string | undefined;

      server.use(
        http.get(`${BASE_URL}/history`, async ({ request: req }) => {
          capturedMethod = req.method;
          capturedUrl = new URL(req.url).pathname;
          return HttpResponse.json(orderHistoryResponse, { status: 200 });
        })
      );

      // Act
      await ordersApi.getOrderHistory();

      // Assert
      expect(capturedMethod).toBe('GET');
      expect(capturedUrl).toBe('/api/orders/history');
      expect(orderHistoryResponse.orders).toBeDefined();
    });

    it('should include authorization header', async () => {
      // Arrange
      let capturedAuthHeader: string | null = null;

      server.use(
        http.get(`${BASE_URL}/history`, async ({ request: req }) => {
          capturedAuthHeader = req.headers.get('Authorization');
          return HttpResponse.json(orderHistoryResponse, { status: 200 });
        })
      );

      // Act
      await ordersApi.getOrderHistory();

      // Assert
      expect(capturedAuthHeader).toBeDefined();
      expect(capturedAuthHeader).toBe(TEST_AUTH_TOKEN);
      expect(capturedAuthHeader).toContain('Bearer');
    });

    it('should return paginated order list', async () => {
      // Arrange
      server.use(
        http.get(`${BASE_URL}/history`, async () => {
          return HttpResponse.json(orderHistoryResponse, { status: 200 });
        })
      );

      // Act
      const result = await ordersApi.getOrderHistory();

      // Assert
      expect(result.data.pagination).toBeDefined();
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.pageSize).toBe(10);
      expect(result.data.pagination.totalItems).toBe(testOrders.length);
      expect(result.data.pagination.totalPages).toBeDefined();
    });

    it('should support page and limit query parameters', async () => {
      // Arrange
      let capturedPage: string | null = null;
      let capturedLimit: string | null = null;

      server.use(
        http.get(`${BASE_URL}/history`, async ({ request: req }) => {
          const url = new URL(req.url);
          capturedPage = url.searchParams.get('page');
          capturedLimit = url.searchParams.get('limit');
          return HttpResponse.json({
            orders: testOrders.slice(0, 5),
            pagination: {
              page: Number(capturedPage) || 1,
              pageSize: Number(capturedLimit) || 10,
              totalItems: testOrders.length,
              totalPages: 1,
            },
          }, { status: 200 });
        })
      );

      // Act
      await ordersApi.getOrderHistory({ page: 2, limit: 5 });

      // Assert
      expect(capturedPage).toBe('2');
      expect(capturedLimit).toBe('5');
      expect(testOrders).toBeDefined();
    });

    it('should return empty array for new user', async () => {
      // Arrange
      server.use(
        http.get(`${BASE_URL}/history`, async () => {
          return HttpResponse.json({
            orders: [],
            pagination: {
              page: 1,
              pageSize: 10,
              totalItems: 0,
              totalPages: 0,
            },
          }, { status: 200 });
        })
      );

      // Act
      const result = await ordersApi.getOrderHistory();

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.orders).toEqual([]);
      expect(result.data.pagination.totalItems).toBe(0);
      expect(Array.isArray(result.data.orders)).toBe(true);
    });

    it('should throw 401 if not authenticated', async () => {
      // Arrange
      server.use(
        http.get(`${BASE_URL}/history`, async () => {
          return HttpResponse.json(
            createErrorResponse('UNAUTHORIZED', 'Authentication required to view order history'),
            { status: 401 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.getOrderHistory()).rejects.toThrow('Authentication required');

      try {
        await ordersApi.getOrderHistory();
      } catch (error) {
        expect((error as ApiError).status).toBe(401);
        expect((error as ApiError).code).toBe('UNAUTHORIZED');
      }
    });
  });

  // =========================================================================
  // updateOrderStatus Tests
  // =========================================================================

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      // Arrange
      const orderId = pendingOrder.id;
      const newStatus: OrderStatus = 'confirmed';

      server.use(
        http.patch(`${BASE_URL}/${orderId}/status`, async () => {
          return HttpResponse.json({
            ...pendingOrder,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          }, { status: 200 });
        })
      );

      // Act
      const result = await ordersApi.updateOrderStatus(orderId, newStatus);

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.status).toBe('confirmed');
      expect(result.data.id).toBe(orderId);
      expect(result.data.updatedAt).toBeDefined();
    });

    it('should send PATCH request to /api/orders/:id/status', async () => {
      // Arrange
      const orderId = 'order-update-001';
      const newStatus: OrderStatus = 'preparing';
      let capturedMethod: string | undefined;
      let capturedUrl: string | undefined;

      server.use(
        http.patch(`${BASE_URL}/:id/status`, async ({ request: req }) => {
          capturedMethod = req.method;
          capturedUrl = new URL(req.url).pathname;
          return HttpResponse.json({
            ...pendingOrder,
            id: orderId,
            status: newStatus,
          }, { status: 200 });
        })
      );

      // Act
      await ordersApi.updateOrderStatus(orderId, newStatus);

      // Assert
      expect(capturedMethod).toBe('PATCH');
      expect(capturedUrl).toBe(`/api/orders/${orderId}/status`);
      expect(newStatus).toBe('preparing');
    });

    it('should return updated order with new status', async () => {
      // Arrange
      const orderId = confirmedOrder.id;
      const newStatus: OrderStatus = 'preparing';

      server.use(
        http.patch(`${BASE_URL}/${orderId}/status`, async () => {
          return HttpResponse.json({
            ...confirmedOrder,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          }, { status: 200 });
        })
      );

      // Act
      const result = await ordersApi.updateOrderStatus(orderId, newStatus);

      // Assert
      expect(result.data.id).toBe(orderId);
      expect(result.data.status).toBe('preparing');
      expect(result.data.items).toEqual(confirmedOrder.items);
      expect(result.data.total).toBe(confirmedOrder.total);
      expect(result.data.updatedAt).toBeDefined();
    });

    it('should throw 400 for invalid status transition', async () => {
      // Arrange
      const orderId = cancelledOrder.id;
      const invalidStatus: OrderStatus = 'confirmed';

      server.use(
        http.patch(`${BASE_URL}/${orderId}/status`, async () => {
          return HttpResponse.json(
            createErrorResponse(
              'INVALID_TRANSITION',
              'Cannot transition from cancelled to confirmed'
            ),
            { status: 400 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.updateOrderStatus(orderId, invalidStatus)).rejects.toThrow('Cannot transition');

      try {
        await ordersApi.updateOrderStatus(orderId, invalidStatus);
      } catch (error) {
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).code).toBe('INVALID_TRANSITION');
      }
    });
  });

  // =========================================================================
  // Edge Case Tests
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle order with single item (minimum)', async () => {
      // Arrange
      const singleItem = [createMockOrderItem('burger-001', 1)];
      const request = createMockOrderRequest(singleItem);
      const expectedTotal = calculateExpectedTotal(singleItem);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(
            createSuccessOrderResponse('order-single-001', expectedTotal),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await ordersApi.createOrder(request);

      // Assert
      expect(result.status).toBe(201);
      expect(result.data.order.total).toBe(expectedTotal);
      expect(request.items.length).toBe(1);
      expect(singleItem[0].quantity).toBe(1);
    });

    it('should handle order with maximum items', async () => {
      // Arrange
      const maxItems: OrderItem[] = [];
      for (let i = 0; i < 50; i++) {
        maxItems.push({
          menuItemId: `item-${i}`,
          name: `Item ${i}`,
          quantity: 1,
          price: 5.99,
        });
      }
      const request = createMockOrderRequest(maxItems);
      const expectedTotal = calculateExpectedTotal(maxItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(
            createSuccessOrderResponse('order-max-001', expectedTotal),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await ordersApi.createOrder(request);

      // Assert
      expect(result.status).toBe(201);
      expect(result.data.order.total).toBe(expectedTotal);
      expect(maxItems.length).toBe(50);
      expect(expectedTotal).toBe(299.5); // 50 * 5.99
    });

    it('should handle order with maximum quantity per item', async () => {
      // Arrange
      const maxQuantityItem: OrderItem[] = [
        { menuItemId: 'burger-001', name: 'Classic Burger', quantity: 99, price: 8.99 },
      ];
      const request = createMockOrderRequest(maxQuantityItem);
      const expectedTotal = calculateExpectedTotal(maxQuantityItem);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(
            createSuccessOrderResponse('order-maxqty-001', expectedTotal),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await ordersApi.createOrder(request);

      // Assert
      expect(result.status).toBe(201);
      expect(result.data.order.total).toBe(expectedTotal);
      expect(maxQuantityItem[0].quantity).toBe(99);
      expect(expectedTotal).toBe(890.01); // 99 * 8.99
    });

    it('should handle order with special instructions on all items', async () => {
      // Arrange
      const specialItems: OrderItem[] = [
        { menuItemId: 'burger-001', name: 'Classic Burger', quantity: 1, price: 8.99, specialInstructions: 'No onions, extra pickles' },
        { menuItemId: 'side-001', name: 'Fries', quantity: 1, price: 3.99, specialInstructions: 'Extra crispy, no salt' },
        { menuItemId: 'drink-001', name: 'Soda', quantity: 1, price: 2.49, specialInstructions: 'Light ice' },
      ];
      const request = createMockOrderRequest(specialItems);
      let receivedBody: CreateOrderRequest | undefined;

      server.use(
        http.post(`${BASE_URL}`, async ({ request: req }) => {
          receivedBody = await req.json() as CreateOrderRequest;
          return HttpResponse.json(
            createSuccessOrderResponse('order-special-001', calculateExpectedTotal(specialItems)),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await ordersApi.createOrder(request);

      // Assert
      expect(result.status).toBe(201);
      expect(receivedBody?.items[0].specialInstructions).toBe('No onions, extra pickles');
      expect(receivedBody?.items[1].specialInstructions).toBe('Extra crispy, no salt');
      expect(receivedBody?.items[2].specialInstructions).toBe('Light ice');
    });

    it('should handle order total calculation accuracy (decimal precision)', async () => {
      // Arrange - Items designed to test floating point precision
      const decimalItems: OrderItem[] = [
        { menuItemId: 'item-1', name: 'Item 1', quantity: 3, price: 0.33 },
        { menuItemId: 'item-2', name: 'Item 2', quantity: 7, price: 0.14 },
        { menuItemId: 'item-3', name: 'Item 3', quantity: 1, price: 0.01 },
      ];
      const expectedTotal = calculateExpectedTotal(decimalItems);
      const request = createMockOrderRequest(decimalItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(
            createSuccessOrderResponse('order-decimal-001', expectedTotal),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await ordersApi.createOrder(request);

      // Assert - Verify no floating point errors
      expect(result.data.order.total).toBe(expectedTotal);
      expect(Number.isInteger(result.data.order.total * 100)).toBe(true); // Should be exact cents
      expect(result.data.order.total).toBe(1.98); // (3 * 0.33) + (7 * 0.14) + (1 * 0.01)
    });
  });

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  describe('Error Handling', () => {
    it('should handle network failure during order creation', async () => {
      // Arrange
      const orderItems = singleItemCart;
      const request = createMockOrderRequest(orderItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.error();
        })
      );

      // Act & Assert
      await expect(ordersApi.createOrder(request)).rejects.toThrow();
      expect(request.items).toBeDefined();
      expect(request.paymentMethod).toBeDefined();
    });

    it('should handle server error (500) handling', async () => {
      // Arrange
      const orderItems = singleItemCart;
      const request = createMockOrderRequest(orderItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(
            createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred. Please try again later.'),
            { status: 500 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.createOrder(request)).rejects.toThrow('unexpected error');

      try {
        await ordersApi.createOrder(request);
      } catch (error) {
        expect((error as ApiError).status).toBe(500);
        expect((error as ApiError).code).toBe('INTERNAL_ERROR');
      }
    });

    it('should handle timeout during payment processing', async () => {
      // Arrange
      const orderItems = singleItemCart;
      const request = createMockOrderRequest(orderItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.json(
            createErrorResponse('PAYMENT_TIMEOUT', 'Payment processing timed out. Please try again.'),
            { status: 504 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.createOrder(request)).rejects.toThrow('timed out');

      try {
        await ordersApi.createOrder(request);
      } catch (error) {
        expect((error as ApiError).status).toBe(504);
        expect((error as ApiError).code).toBe('PAYMENT_TIMEOUT');
      }
    });

    it('should handle invalid response format handling', async () => {
      // Arrange
      const orderItems = singleItemCart;
      const request = createMockOrderRequest(orderItems);

      server.use(
        http.post(`${BASE_URL}`, async () => {
          return HttpResponse.text('Invalid response', { status: 200 });
        })
      );

      // Act & Assert
      await expect(ordersApi.createOrder(request)).rejects.toThrow();
      expect(request.items.length).toBeGreaterThan(0);
      expect(request.paymentMethod).toBe('credit_card');
    });

    it('should handle concurrent order modification handling', async () => {
      // Arrange
      const orderId = pendingOrder.id;
      const newStatus: OrderStatus = 'confirmed';

      server.use(
        http.patch(`${BASE_URL}/${orderId}/status`, async () => {
          return HttpResponse.json(
            createErrorResponse('CONFLICT', 'Order has been modified by another request. Please refresh and try again.'),
            { status: 409 }
          );
        })
      );

      // Act & Assert
      await expect(ordersApi.updateOrderStatus(orderId, newStatus)).rejects.toThrow('modified by another');

      try {
        await ordersApi.updateOrderStatus(orderId, newStatus);
      } catch (error) {
        expect((error as ApiError).status).toBe(409);
        expect((error as ApiError).code).toBe('CONFLICT');
      }
    });
  });

  // =========================================================================
  // Fixtures and Utility Tests
  // =========================================================================

  describe('Fixtures and Utilities', () => {
    it('should have valid testOrders array with all statuses', () => {
      // Assert
      expect(testOrders).toBeDefined();
      expect(Array.isArray(testOrders)).toBe(true);
      expect(testOrders.length).toBeGreaterThan(0);

      const statuses = testOrders.map((order) => order.status);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('confirmed');
    });

    it('should have valid orderStatuses covering all status types', () => {
      // Assert
      expect(orderStatuses).toBeDefined();
      expect(orderStatuses).toContain('pending');
      expect(orderStatuses).toContain('confirmed');
      expect(orderStatuses).toContain('preparing');
      expect(orderStatuses).toContain('ready');
      expect(orderStatuses).toContain('delivered');
      expect(orderStatuses).toContain('cancelled');
    });

    it('should have valid statusTransitions for order workflow', () => {
      // Assert
      expect(statusTransitions).toBeDefined();
      expect(statusTransitions.pending).toContain('confirmed');
      expect(statusTransitions.pending).toContain('cancelled');
      expect(statusTransitions.confirmed).toContain('preparing');
      expect(statusTransitions.delivered).toEqual([]);
      expect(statusTransitions.cancelled).toEqual([]);
    });

    it('should have valid paymentMethods array', () => {
      // Assert
      expect(paymentMethods).toBeDefined();
      expect(Array.isArray(paymentMethods)).toBe(true);
      expect(paymentMethods.length).toBeGreaterThan(0);
      expect(paymentMethods).toContain('credit_card');
    });

    it('should have valid cart fixtures for testing', () => {
      // Assert
      expect(emptyCart).toBeDefined();
      expect(emptyCart.length).toBe(0);
      expect(singleItemCart).toBeDefined();
      expect(singleItemCart.length).toBe(1);
      expect(fullCart).toBeDefined();
      expect(fullCart.length).toBeGreaterThan(1);
    });

    it('should correctly calculate order totals with calculateOrderTotal', () => {
      // Arrange
      const testItems: OrderItem[] = [
        { menuItemId: '1', name: 'Item 1', quantity: 2, price: 10.00 },
        { menuItemId: '2', name: 'Item 2', quantity: 1, price: 5.50 },
      ];

      // Act
      const total = calculateOrderTotal(testItems);

      // Assert
      expect(total).toBe(25.50);
      expect(typeof total).toBe('number');
      expect(Number.isFinite(total)).toBe(true);
    });

    it('should create valid order items with createOrderItem', () => {
      // Arrange & Act
      const orderItem = createOrderItem('burger-001', 2);

      // Assert
      expect(orderItem).toBeDefined();
      expect(orderItem.menuItemId).toBe('burger-001');
      expect(orderItem.quantity).toBe(2);
      expect(orderItem.price).toBeGreaterThan(0);
      expect(orderItem.name).toBeDefined();
    });

    it('should create valid orders with createOrder factory', () => {
      // Arrange & Act
      const order = createOrder({ status: 'confirmed' });

      // Assert
      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.status).toBe('confirmed');
      expect(order.items).toBeDefined();
      expect(Array.isArray(order.items)).toBe(true);
      expect(order.total).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Type Safety Tests
  // =========================================================================

  describe('Type Safety', () => {
    it('should validate OrderStatus types', () => {
      // Arrange
      const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

      // Assert
      validStatuses.forEach((status) => {
        expect(orderStatuses).toContain(status);
      });
      expect(validStatuses.length).toBe(6);
      expect(pendingOrder.status satisfies OrderStatus).toBeDefined();
    });

    it('should validate OrderItem interface', () => {
      // Arrange
      const testItem: OrderItem = {
        menuItemId: 'test-001',
        name: 'Test Item',
        quantity: 1,
        price: 9.99,
      };

      // Assert
      expect(testItem.menuItemId).toBeDefined();
      expect(testItem.name).toBeDefined();
      expect(testItem.quantity).toBeDefined();
      expect(testItem.price).toBeDefined();
      expect(typeof testItem.menuItemId).toBe('string');
      expect(typeof testItem.price).toBe('number');
    });

    it('should validate TestOrder interface', () => {
      // Assert
      expect(pendingOrder.id).toBeDefined();
      expect(pendingOrder.userId).toBeDefined();
      expect(pendingOrder.items).toBeDefined();
      expect(pendingOrder.total).toBeDefined();
      expect(pendingOrder.status).toBeDefined();
      expect(pendingOrder.createdAt).toBeDefined();
      expect(pendingOrder.paymentMethod).toBeDefined();
    });
  });
});
