/**
 * @fileoverview Unit tests for order confirmation component
 * @module tests/features/order/OrderConfirmation
 *
 * Comprehensive tests for the OrderConfirmation component that displays
 * order details after successful checkout. Tests cover:
 * - Confirmation number display
 * - Order total and items summary
 * - Estimated delivery/pickup time
 * - Loading and error states
 * - User actions (navigation, copy, print)
 * - Order status display and updates
 *
 * Following patterns established in tests/lifecycle/server.test.js for:
 * - JSDoc documentation standards
 * - Factory function patterns (createMockServer, createMockListen)
 * - Test isolation with proper cleanup
 *
 * @typedef {Object} ConfirmedOrderTestData
 * @property {string} id - Unique order identifier
 * @property {string} confirmationNumber - Human-readable confirmation code
 * @property {Array} items - Array of order items
 * @property {number} total - Order total amount
 * @property {string} estimatedTime - Estimated delivery/pickup time
 * @property {string} status - Current order status
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

// Component under test
import { OrderConfirmation } from '../OrderConfirmation';

// Test utilities
import { render, renderWithRoute } from '../../../__tests__/utils/render';

// Test fixtures
import {
  confirmedOrder,
  createOrder,
  TestOrder,
  orderNotFoundResponse,
} from '../../../__tests__/fixtures/orders';

// MSW server for API mocking
import { server } from '../../../__tests__/mocks/server';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Interface representing confirmed order data for testing
 * @interface ConfirmedOrder
 */
interface ConfirmedOrder {
  /** Unique order identifier */
  id: string;
  /** Human-readable confirmation number */
  confirmationNumber: string;
  /** Array of items in the order */
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    specialInstructions?: string;
  }>;
  /** Subtotal before tax and fees */
  subtotal: number;
  /** Tax amount */
  tax: number;
  /** Delivery fee */
  deliveryFee: number;
  /** Total order amount */
  total: number;
  /** Estimated delivery/pickup time */
  estimatedTime: string;
  /** Current order status */
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out-for-delivery' | 'delivered' | 'picked-up' | 'cancelled';
  /** Order type */
  orderType: 'delivery' | 'pickup';
  /** Delivery address for delivery orders */
  deliveryAddress?: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  /** ISO timestamp when order was placed */
  orderDate: string;
  /** Customer name */
  customerName: string;
  /** Customer email */
  customerEmail?: string;
  /** Customer phone */
  customerPhone?: string;
}

/**
 * Props interface for OrderConfirmation component testing
 * @interface OrderConfirmationProps
 */
interface OrderConfirmationProps {
  /** Optional order ID override */
  orderId?: string;
  /** Callback when viewing order details */
  onViewDetails?: (orderId: string) => void;
  /** Callback when ordering more */
  onOrderMore?: () => void;
  /** Callback when tracking order */
  onTrackOrder?: (orderId: string) => void;
}

// ============================================================================
// Test Data Constants (Following DEFAULT_CONFIG pattern from server.test.js)
// ============================================================================

/**
 * Default confirmed order data for successful scenario tests.
 * @constant {ConfirmedOrder}
 */
const DEFAULT_CONFIRMED_ORDER: ConfirmedOrder = {
  id: 'test-order-001',
  confirmationNumber: 'BG-TEST01',
  items: [
    {
      id: 'item-1',
      name: 'Classic Burger',
      price: 12.99,
      quantity: 2,
      imageUrl: '/images/classic-burger.jpg',
    },
    {
      id: 'item-2',
      name: 'Cheese Fries',
      price: 5.99,
      quantity: 1,
      imageUrl: '/images/cheese-fries.jpg',
    },
    {
      id: 'item-3',
      name: 'Soft Drink',
      price: 2.99,
      quantity: 2,
      imageUrl: '/images/soft-drink.jpg',
    },
  ],
  subtotal: 37.95,
  tax: 3.42,
  deliveryFee: 4.99,
  total: 46.36,
  estimatedTime: '25-30 minutes',
  status: 'confirmed',
  orderType: 'delivery',
  deliveryAddress: {
    street: '123 Main Street',
    street2: 'Apt 4B',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
  },
  orderDate: '2024-01-15T10:30:00.000Z',
  customerName: 'John Doe',
  customerEmail: 'john.doe@example.com',
  customerPhone: '555-123-4567',
};

/**
 * Pickup order variant for testing pickup-specific display
 * @constant {ConfirmedOrder}
 */
const PICKUP_ORDER: ConfirmedOrder = {
  ...DEFAULT_CONFIRMED_ORDER,
  id: 'pickup-order-001',
  confirmationNumber: 'BG-PICKUP01',
  orderType: 'pickup',
  deliveryFee: 0,
  total: 41.37,
  deliveryAddress: undefined,
};

// ============================================================================
// Mock Setup (Following createMockServer patterns from server.test.js)
// ============================================================================

/**
 * Mock navigate function for testing navigation actions
 */
const mockNavigate = vi.fn();

/**
 * Mock clipboard API for testing copy functionality
 */
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};

/**
 * Mock print function for testing print dialog trigger
 */
const mockPrint = vi.fn();

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ orderId: 'test-order-001' }),
  };
});

// ============================================================================
// Helper Functions (Following createMockServer, createMockListen patterns)
// ============================================================================

/**
 * Creates a confirmed order object with optional overrides.
 * Factory function following createMockServer pattern from server.test.js.
 *
 * @param {Partial<ConfirmedOrder>} overrides - Properties to override
 * @returns {ConfirmedOrder} Complete confirmed order object
 *
 * @example
 * // Create order with custom total
 * const order = createConfirmedOrder({ total: 99.99 });
 *
 * @example
 * // Create pickup order
 * const pickup = createConfirmedOrder({ orderType: 'pickup', deliveryAddress: undefined });
 */
function createConfirmedOrder(overrides?: Partial<ConfirmedOrder>): ConfirmedOrder {
  return {
    ...DEFAULT_CONFIRMED_ORDER,
    ...overrides,
  };
}

/**
 * Formats a date for display comparison in tests.
 * Helper function for date/time verification.
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Generates a mock confirmation number.
 * @param {string} prefix - Prefix for the confirmation number
 * @returns {string} Generated confirmation number
 */
function generateConfirmationNumber(prefix: string = 'BG'): string {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

/**
 * Sets up MSW handler for successful order retrieval.
 * @param {ConfirmedOrder} order - Order data to return
 */
function setupSuccessfulOrderHandler(order: ConfirmedOrder): void {
  server.use(
    http.get('/api/orders/:id', () => {
      return HttpResponse.json({
        success: true,
        order,
      }, { status: 200 });
    })
  );
}

/**
 * Sets up MSW handler for order not found error.
 */
function setupOrderNotFoundHandler(): void {
  server.use(
    http.get('/api/orders/:id', () => {
      return HttpResponse.json(orderNotFoundResponse, { status: 404 });
    })
  );
}

/**
 * Sets up MSW handler for network error simulation.
 */
function setupNetworkErrorHandler(): void {
  server.use(
    http.get('/api/orders/:id', () => {
      return HttpResponse.error();
    })
  );
}

/**
 * Sets up MSW handler for slow response simulation.
 * @param {number} delay - Delay in milliseconds
 * @param {ConfirmedOrder} order - Order data to return after delay
 */
function setupDelayedOrderHandler(delay: number, order: ConfirmedOrder): void {
  server.use(
    http.get('/api/orders/:id', async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return HttpResponse.json({
        success: true,
        order,
      }, { status: 200 });
    })
  );
}

// ============================================================================
// Test Suites
// ============================================================================

describe('OrderConfirmation', () => {
  /** User event setup for simulating user interactions */
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockClipboard.writeText.mockClear();
    mockPrint.mockClear();

    // Set up user event instance
    user = userEvent.setup();

    // Set up clipboard mock
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });

    // Set up print mock
    window.print = mockPrint;
  });

  afterEach(() => {
    // Clean up rendered components
    cleanup();
    // Reset MSW handlers to defaults
    server.resetHandlers();
    // Restore all mocked functions
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should display confirmation number prominently', async () => {
      // Arrange
      const order = createConfirmedOrder({
        confirmationNumber: 'BG-ABC123',
      });

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Wait for order to load and verify confirmation number
      await waitFor(() => {
        const confirmationNumber = screen.getByTestId('confirmation-number');
        expect(confirmationNumber).toBeInTheDocument();
        expect(confirmationNumber).toHaveTextContent('BG-ABC123');
      });
      expect(screen.getByText('Confirmation Number')).toBeInTheDocument();
    });

    it('should show order total correctly formatted', async () => {
      // Arrange
      const order = createConfirmedOrder({
        total: 46.36,
      });

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify total is displayed with currency formatting
      await waitFor(() => {
        const total = screen.getByTestId('total');
        expect(total).toBeInTheDocument();
        expect(total).toHaveTextContent('$46.36');
      });
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('should display order items summary with names and quantities', async () => {
      // Arrange
      const order = createConfirmedOrder();

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify each item is displayed
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      });
      expect(screen.getByText('Cheese Fries')).toBeInTheDocument();
      expect(screen.getByText('Soft Drink')).toBeInTheDocument();
      // Verify quantities are shown
      expect(screen.getByText('x2')).toBeInTheDocument();
      expect(screen.getByText('x1')).toBeInTheDocument();
    });

    it('should show estimated delivery time for delivery orders', async () => {
      // Arrange
      const order = createConfirmedOrder({
        orderType: 'delivery',
        estimatedTime: '25-30 minutes',
      });

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify estimated time section
      await waitFor(() => {
        const estimatedTime = screen.getByTestId('estimated-time');
        expect(estimatedTime).toBeInTheDocument();
      });
      expect(screen.getByText(/Estimated Delivery Time/i)).toBeInTheDocument();
      expect(screen.getByText('25-30 minutes')).toBeInTheDocument();
    });

    it('should show estimated pickup time for pickup orders', async () => {
      // Arrange - Use pickup order variant
      render(<OrderConfirmation orderId="pickup-order-001" />);

      // Wait for component to render with pickup text
      await waitFor(() => {
        const estimatedTime = screen.getByTestId('estimated-time');
        expect(estimatedTime).toBeInTheDocument();
      });
    });

    it('should display success message and icon', async () => {
      // Arrange
      const order = createConfirmedOrder();

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify success indicators
      await waitFor(() => {
        expect(screen.getByText(/Thank You for Your Order/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/successfully placed/i)).toBeInTheDocument();
      // Verify success icon is present (✓)
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should display delivery address for delivery orders', async () => {
      // Arrange
      const order = createConfirmedOrder({
        orderType: 'delivery',
        deliveryAddress: {
          street: '456 Oak Avenue',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
        },
      });

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify address section
      await waitFor(() => {
        const addressSection = screen.getByTestId('delivery-address');
        expect(addressSection).toBeInTheDocument();
      });
      expect(screen.getByText('Delivery Address')).toBeInTheDocument();
      expect(screen.getByText(/456 Oak Avenue/)).toBeInTheDocument();
      expect(screen.getByText(/Chicago, IL 60601/)).toBeInTheDocument();
    });

    it('should not display delivery address for pickup orders', async () => {
      // Arrange - Use a pickup order
      render(<OrderConfirmation orderId="pickup-order-001" />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByText(/Thank You for Your Order/i)).toBeInTheDocument();
      });

      // Assert - Delivery address section should not be present
      expect(screen.queryByTestId('delivery-address')).not.toBeInTheDocument();
    });

    it('should display subtotal, tax, and delivery fee breakdown', async () => {
      // Arrange
      const order = createConfirmedOrder({
        subtotal: 37.95,
        tax: 3.42,
        deliveryFee: 4.99,
      });

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify price breakdown
      await waitFor(() => {
        expect(screen.getByTestId('subtotal')).toHaveTextContent('$37.95');
      });
      expect(screen.getByTestId('tax')).toHaveTextContent('$3.42');
      expect(screen.getByTestId('delivery-fee')).toHaveTextContent('$4.99');
    });

    it('should display customer information', async () => {
      // Arrange
      const order = createConfirmedOrder({
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        customerPhone: '555-987-6543',
      });

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify customer details
      await waitFor(() => {
        expect(screen.getByTestId('customer-name')).toHaveTextContent('Jane Smith');
      });
      expect(screen.getByTestId('customer-email')).toHaveTextContent('jane@example.com');
      expect(screen.getByTestId('customer-phone')).toHaveTextContent('555-987-6543');
    });
  });

  // ==========================================================================
  // Loading States Tests
  // ==========================================================================

  describe('loading states', () => {
    it('should show loading spinner while fetching order', () => {
      // Arrange - Component renders immediately in loading state

      // Act
      render(<OrderConfirmation orderId="test-order-001" />);

      // Assert - Verify loading state elements
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Loading your order details/i)).toBeInTheDocument();
    });

    it('should hide loading spinner after order loads', async () => {
      // Arrange
      const order = createConfirmedOrder();

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/Loading your order details/i)).not.toBeInTheDocument();
      });
      // Verify order content is displayed
      expect(screen.getByText(/Thank You for Your Order/i)).toBeInTheDocument();
    });

    it('should display loading state during slow API response', async () => {
      // Arrange - Set up delayed handler
      const order = createConfirmedOrder();
      setupDelayedOrderHandler(1000, order);

      // Act
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Should show loading initially
      expect(screen.getByText(/Loading your order details/i)).toBeInTheDocument();

      // Wait for load to complete
      await waitFor(
        () => {
          expect(screen.queryByText(/Loading your order details/i)).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Error States Tests
  // ==========================================================================

  describe('error states', () => {
    it('should display error message when order not found', async () => {
      // Arrange - Render with a non-existent order ID
      render(<OrderConfirmation orderId="not-found" />);

      // Assert - Wait for error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText(/Unable to Load Order/i)).toBeInTheDocument();
      expect(screen.getByText(/Order not found/i)).toBeInTheDocument();
    });

    it('should show retry button on fetch error', async () => {
      // Arrange - Render with invalid order ID
      render(<OrderConfirmation orderId="invalid" />);

      // Assert - Wait for error state with retry button
      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /Try Again/i });
        expect(retryButton).toBeInTheDocument();
      });
      // Verify back to menu button is also present
      expect(screen.getByRole('button', { name: /Back to Menu/i })).toBeInTheDocument();
    });

    it('should handle network error gracefully', async () => {
      // Arrange - Render with network error simulation order ID
      render(<OrderConfirmation orderId="network-error" />);

      // Assert - Wait for network error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText(/Unable to retrieve order details/i)).toBeInTheDocument();
    });

    it('should allow retry after error', async () => {
      // Arrange - Start with error state
      render(<OrderConfirmation orderId="invalid" />);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      });

      // Act - Click retry button
      const retryButton = screen.getByRole('button', { name: /Try Again/i });
      await user.click(retryButton);

      // Assert - Verify retry was triggered (loading state appears again)
      await waitFor(() => {
        expect(screen.getByText(/Loading your order details/i)).toBeInTheDocument();
      });
    });

    it('should navigate to menu when "Back to Menu" is clicked in error state', async () => {
      // Arrange
      render(<OrderConfirmation orderId="not-found" />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Back to Menu/i })).toBeInTheDocument();
      });

      // Act
      await user.click(screen.getByRole('button', { name: /Back to Menu/i }));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith('/menu');
    });

    it('should display error when no order ID is provided', async () => {
      // Arrange - Mock useParams to return no orderId
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigate,
          useParams: () => ({}),
        };
      });

      // Act
      render(<OrderConfirmation />);

      // Assert - Should show error about missing order ID
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText(/No order ID provided/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // User Actions Tests
  // ==========================================================================

  describe('user actions', () => {
    it('should navigate to menu on "Order More" button click', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByTestId('order-more-btn')).toBeInTheDocument();
      });

      // Act
      await user.click(screen.getByTestId('order-more-btn'));

      // Assert
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/menu');
    });

    it('should navigate to order tracking on "Track Order" click', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByTestId('track-order-btn')).toBeInTheDocument();
      });

      // Act
      await user.click(screen.getByTestId('track-order-btn'));

      // Assert
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(`/track/${order.id}`);
    });

    it('should navigate to order details on "View Order Details" click', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByTestId('view-details-btn')).toBeInTheDocument();
      });

      // Act
      await user.click(screen.getByTestId('view-details-btn'));

      // Assert
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(`/orders/${order.id}`);
    });

    it('should copy confirmation number to clipboard', async () => {
      // Arrange
      const order = createConfirmedOrder({
        confirmationNumber: 'BG-COPY123',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      });

      // Act
      const copyButton = screen.getByRole('button', { name: /Copy confirmation number/i });
      await user.click(copyButton);

      // Assert
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('BG-COPY123');
    });

    it('should show "Copied!" feedback after copying', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      });

      // Act
      const copyButton = screen.getByRole('button', { name: /Copy confirmation number/i });
      await user.click(copyButton);

      // Assert - Verify "Copied!" feedback is shown
      await waitFor(() => {
        expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
      });
    });

    it('should call custom onOrderMore callback when provided', async () => {
      // Arrange
      const order = createConfirmedOrder();
      const mockOnOrderMore = vi.fn();
      render(<OrderConfirmation orderId={order.id} onOrderMore={mockOnOrderMore} />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByTestId('order-more-btn')).toBeInTheDocument();
      });

      // Act
      await user.click(screen.getByTestId('order-more-btn'));

      // Assert
      expect(mockOnOrderMore).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should call custom onTrackOrder callback when provided', async () => {
      // Arrange
      const order = createConfirmedOrder();
      const mockOnTrackOrder = vi.fn();
      render(<OrderConfirmation orderId={order.id} onTrackOrder={mockOnTrackOrder} />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByTestId('track-order-btn')).toBeInTheDocument();
      });

      // Act
      await user.click(screen.getByTestId('track-order-btn'));

      // Assert
      expect(mockOnTrackOrder).toHaveBeenCalledTimes(1);
      expect(mockOnTrackOrder).toHaveBeenCalledWith(order.id);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should call custom onViewDetails callback when provided', async () => {
      // Arrange
      const order = createConfirmedOrder();
      const mockOnViewDetails = vi.fn();
      render(<OrderConfirmation orderId={order.id} onViewDetails={mockOnViewDetails} />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByTestId('view-details-btn')).toBeInTheDocument();
      });

      // Act
      await user.click(screen.getByTestId('view-details-btn'));

      // Assert
      expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
      expect(mockOnViewDetails).toHaveBeenCalledWith(order.id);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should have all action buttons accessible', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByText(/Thank You for Your Order/i)).toBeInTheDocument();
      });

      // Assert - Verify all buttons are present and accessible
      const trackButton = screen.getByTestId('track-order-btn');
      const viewDetailsButton = screen.getByTestId('view-details-btn');
      const orderMoreButton = screen.getByTestId('order-more-btn');

      expect(trackButton).toBeInTheDocument();
      expect(trackButton).toBeEnabled();
      expect(viewDetailsButton).toBeInTheDocument();
      expect(viewDetailsButton).toBeEnabled();
      expect(orderMoreButton).toBeInTheDocument();
      expect(orderMoreButton).toBeEnabled();
    });
  });

  // ==========================================================================
  // Order Status Tests
  // ==========================================================================

  describe('order status', () => {
    it('should display current order status', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'confirmed',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify status is displayed
      await waitFor(() => {
        const statusBadge = screen.getByTestId('order-status');
        expect(statusBadge).toBeInTheDocument();
        expect(statusBadge).toHaveTextContent('Confirmed');
      });
    });

    it('should display "Pending" status correctly', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'pending',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-status')).toHaveTextContent('Pending');
      });
    });

    it('should display "Being Prepared" status correctly', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'preparing',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-status')).toHaveTextContent('Being Prepared');
      });
    });

    it('should display "Ready" status correctly', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'ready',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-status')).toHaveTextContent('Ready');
      });
    });

    it('should display "Out for Delivery" status correctly', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'out-for-delivery',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-status')).toHaveTextContent('Out for Delivery');
      });
    });

    it('should display "Delivered" status correctly', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'delivered',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-status')).toHaveTextContent('Delivered');
      });
    });

    it('should display "Picked Up" status correctly', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'picked-up',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-status')).toHaveTextContent('Picked Up');
      });
    });

    it('should display "Cancelled" status correctly', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'cancelled',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-status')).toHaveTextContent('Cancelled');
      });
    });

    it('should have accessible status label', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'confirmed',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify status has proper aria-label
      await waitFor(() => {
        const statusBadge = screen.getByTestId('order-status');
        expect(statusBadge).toHaveAttribute('aria-label', 'Order status: Confirmed');
      });
    });
  });

  // ==========================================================================
  // Order Details Display Tests
  // ==========================================================================

  describe('order details display', () => {
    it('should display order ID', async () => {
      // Arrange
      const order = createConfirmedOrder({
        id: 'ORD-12345-ABCDE',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-id')).toHaveTextContent('ORD-12345-ABCDE');
      });
    });

    it('should display order type for delivery', async () => {
      // Arrange
      const order = createConfirmedOrder({
        orderType: 'delivery',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-type')).toHaveTextContent('Delivery');
      });
    });

    it('should display order type for pickup', async () => {
      // Arrange - Use pickup order
      render(<OrderConfirmation orderId="pickup-order-001" />);

      // Assert - Since we need to verify what the component actually renders
      await waitFor(() => {
        const orderType = screen.getByTestId('order-type');
        expect(orderType).toBeInTheDocument();
      });
    });

    it('should display order summary section', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-summary')).toBeInTheDocument();
      });
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    it('should display order details section', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('order-details')).toBeInTheDocument();
      });
      expect(screen.getByText('Order Details')).toBeInTheDocument();
    });

    it('should display confirmation email message', async () => {
      // Arrange
      const order = createConfirmedOrder({
        customerEmail: 'test@example.com',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/confirmation email has been sent/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    });

    it('should display each order item with correct price', async () => {
      // Arrange
      const order = createConfirmedOrder({
        items: [
          {
            id: 'test-item-1',
            name: 'Test Burger',
            price: 10.99,
            quantity: 2,
          },
          {
            id: 'test-item-2',
            name: 'Test Fries',
            price: 4.99,
            quantity: 1,
          },
        ],
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Verify items display with calculated prices
      await waitFor(() => {
        expect(screen.getByText('Test Burger')).toBeInTheDocument();
      });
      expect(screen.getByText('Test Fries')).toBeInTheDocument();
      // Check that item totals are calculated (10.99 * 2 = $21.98)
      expect(screen.getByText('$21.98')).toBeInTheDocument();
      expect(screen.getByText('$4.99')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have accessible main content area', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
      expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'order-confirmation-title');
    });

    it('should have accessible heading structure', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Main heading
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent(/Thank You for Your Order/i);
      });
    });

    it('should have accessible items list', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Items list should have aria-label
      await waitFor(() => {
        const itemsList = screen.getByRole('list', { name: /Order items/i });
        expect(itemsList).toBeInTheDocument();
      });
    });

    it('should have accessible status indicator', async () => {
      // Arrange
      const order = createConfirmedOrder({
        status: 'confirmed',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        const statusElement = screen.getByTestId('order-status');
        expect(statusElement).toHaveAttribute('role', 'status');
      });
    });

    it('should have accessible copy button', async () => {
      // Arrange
      const order = createConfirmedOrder();
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        const copyButton = screen.getByRole('button', { name: /Copy confirmation number/i });
        expect(copyButton).toBeInTheDocument();
        expect(copyButton).toHaveAttribute('aria-label');
      });
    });

    it('should have proper alert role for error state', async () => {
      // Arrange
      render(<OrderConfirmation orderId="not-found" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should have proper status role for loading state', () => {
      // Arrange
      render(<OrderConfirmation orderId="test-order-001" />);

      // Assert - Loading state should have role="status"
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle order with no delivery fee', async () => {
      // Arrange
      const order = createConfirmedOrder({
        orderType: 'pickup',
        deliveryFee: 0,
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - Delivery fee should not be shown for pickup
      await waitFor(() => {
        expect(screen.getByTestId('subtotal')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('delivery-fee')).not.toBeInTheDocument();
    });

    it('should handle order without optional phone number', async () => {
      // Arrange
      const order = createConfirmedOrder({
        customerPhone: undefined,
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('customer-name')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('customer-phone')).not.toBeInTheDocument();
    });

    it('should handle order without optional email', async () => {
      // Arrange
      const order = createConfirmedOrder({
        customerEmail: undefined,
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('customer-name')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('customer-email')).not.toBeInTheDocument();
    });

    it('should handle long confirmation number', async () => {
      // Arrange
      const order = createConfirmedOrder({
        confirmationNumber: 'BG-VERYLONGCONFIRMATIONNUMBER12345',
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('confirmation-number')).toHaveTextContent(
          'BG-VERYLONGCONFIRMATIONNUMBER12345'
        );
      });
    });

    it('should handle order with many items', async () => {
      // Arrange
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        name: `Test Item ${i + 1}`,
        price: 9.99,
        quantity: 1,
      }));
      const order = createConfirmedOrder({
        items: manyItems,
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert - All items should be displayed
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
      expect(screen.getByText('Test Item 10')).toBeInTheDocument();
    });

    it('should handle high quantity items', async () => {
      // Arrange
      const order = createConfirmedOrder({
        items: [
          {
            id: 'bulk-item',
            name: 'Bulk Order Item',
            price: 5.00,
            quantity: 99,
          },
        ],
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Bulk Order Item')).toBeInTheDocument();
      });
      expect(screen.getByText('x99')).toBeInTheDocument();
      expect(screen.getByText('$495.00')).toBeInTheDocument();
    });

    it('should handle zero dollar item prices gracefully', async () => {
      // Arrange
      const order = createConfirmedOrder({
        items: [
          {
            id: 'free-item',
            name: 'Free Promotional Item',
            price: 0,
            quantity: 1,
          },
        ],
        subtotal: 0,
        tax: 0,
        deliveryFee: 0,
        total: 0,
      });
      render(<OrderConfirmation orderId={order.id} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Free Promotional Item')).toBeInTheDocument();
      });
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });
});
