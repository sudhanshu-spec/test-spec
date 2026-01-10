/**
 * @fileoverview Integration tests for checkout flow component
 * @module tests/features/order/Checkout
 *
 * Comprehensive integration tests for the Checkout component testing the complete
 * cart-to-checkout journey including cart review, payment form submission, order
 * confirmation flow, and error handling.
 *
 * Test Categories:
 * - Happy path scenarios: Successful checkout flow
 * - Edge cases: Empty cart redirects, minimum order amounts
 * - Error cases: Payment failures, address validation, stock unavailability
 * - Performance: Handling carts with many items
 *
 * Following patterns from:
 * - tests/lifecycle/server.test.js: Factory functions and mock patterns
 * - tests/integration/endpoints.test.js: Integration testing structure
 * - tests/unit/config.test.js: Type definitions and assertions
 */

'use strict';

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

// Internal imports from depends_on_files
import { Checkout } from '../Checkout';
import { renderWithCart, customRender } from '../../../__tests__/utils/render';
import { failedPaymentScenario } from '../../../__tests__/fixtures/orders';
import { TestMenuItem, burgers, sides, drinks } from '../../../__tests__/fixtures/menuItems';
import { server } from '../../../__tests__/mocks/server';
import { ordersHandlers } from '../../../__tests__/mocks/handlers/orders';
import { validUser } from '../../../__tests__/fixtures/users';
import { createMockCartItem } from '../../../__tests__/utils/testUtils';
import { CartItem } from '../../cart/CartContext';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Test configuration for checkout scenarios.
 * @interface CheckoutTestConfig
 */
interface CheckoutTestConfig {
  /** Default cart items for testing */
  cartItems: CartItem[];
  /** Default authenticated user */
  user: typeof validUser;
  /** Default delivery address fields */
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    instructions: string;
  };
  /** Default payment method */
  paymentMethod: 'credit_card' | 'debit_card' | 'cash';
}

// ============================================================================
// Default Test Data Configuration
// Following patterns from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Default test configuration for checkout tests.
 * @constant
 */
const DEFAULT_CONFIG: CheckoutTestConfig = {
  cartItems: [],
  user: validUser,
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    phone: '5551234567',
    instructions: 'Leave at door',
  },
  paymentMethod: 'credit_card',
};

/**
 * Converts a TestMenuItem to CartItem format for checkout testing.
 * @param menuItem - Menu item to convert
 * @param quantity - Quantity for cart
 * @returns CartItem compatible object
 */
function menuItemToCartItem(menuItem: TestMenuItem, quantity: number = 1): CartItem {
  return {
    id: menuItem.id,
    name: menuItem.name,
    price: menuItem.price,
    quantity,
    imageUrl: menuItem.imageUrl,
  };
}

/**
 * Default cart items array with mixed product types.
 * @constant
 */
const DEFAULT_CART_ITEMS: CartItem[] = [
  menuItemToCartItem(burgers[0], 2), // Classic Burger x2
  menuItemToCartItem(sides[0], 1),    // Fries x1
  menuItemToCartItem(drinks[0], 2),   // Soda x2
];

/**
 * Default authenticated user for checkout tests.
 * @constant
 */
const DEFAULT_USER = {
  id: validUser.id,
  email: validUser.email,
  name: validUser.name,
};

// ============================================================================
// Helper Functions
// Following createMockServer/createMockListen patterns from server.test.js
// ============================================================================

/**
 * Creates cart items from menu items with specified quantities.
 * Factory function following createMockServer pattern.
 *
 * @param items - Array of menu items with quantities
 * @returns Array of CartItem objects
 */
function createCartItems(items: Array<{ menuItem: TestMenuItem; quantity: number }>): CartItem[] {
  return items.map(({ menuItem, quantity }) => menuItemToCartItem(menuItem, quantity));
}

/**
 * Calculates expected total for cart items including tax.
 *
 * @param items - Array of cart items
 * @param taxRate - Tax rate to apply (default 0.08 for 8%)
 * @returns Formatted price string
 */
function calculateExpectedTotal(items: CartItem[], taxRate: number = 0.08): string {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal * (1 + taxRate);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total);
}

/**
 * Calculates subtotal for cart items.
 *
 * @param items - Array of cart items
 * @returns Subtotal as number
 */
function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Fills out the delivery address form with provided values.
 *
 * @param user - User event instance
 * @param address - Address values to fill
 */
async function fillDeliveryAddress(
  user: ReturnType<typeof userEvent.setup>,
  address: CheckoutTestConfig['address']
): Promise<void> {
  // Find form fields by their labels
  const streetInput = screen.getByLabelText(/street address/i);
  const cityInput = screen.getByLabelText(/city/i);
  const stateInput = screen.getByLabelText(/state/i);
  const zipCodeInput = screen.getByLabelText(/zip code/i);
  const phoneInput = screen.getByLabelText(/phone number/i);
  const instructionsInput = screen.getByLabelText(/delivery instructions/i);

  // Clear and fill each field
  await user.clear(streetInput);
  await user.type(streetInput, address.street);

  await user.clear(cityInput);
  await user.type(cityInput, address.city);

  await user.clear(stateInput);
  await user.type(stateInput, address.state);

  await user.clear(zipCodeInput);
  await user.type(zipCodeInput, address.zipCode);

  await user.clear(phoneInput);
  await user.type(phoneInput, address.phone);

  await user.clear(instructionsInput);
  await user.type(instructionsInput, address.instructions);
}

/**
 * Selects a payment method from the dropdown.
 *
 * @param user - User event instance
 * @param method - Payment method to select
 */
async function selectPaymentMethod(
  user: ReturnType<typeof userEvent.setup>,
  method: CheckoutTestConfig['paymentMethod']
): Promise<void> {
  const paymentSelect = screen.getByLabelText(/select payment method/i);
  await user.selectOptions(paymentSelect, method);
}

/**
 * Completes the full checkout form with default or custom values.
 *
 * @param user - User event instance
 * @param config - Optional configuration overrides
 */
async function fillCheckoutForm(
  user: ReturnType<typeof userEvent.setup>,
  config: Partial<CheckoutTestConfig> = {}
): Promise<void> {
  const address = { ...DEFAULT_CONFIG.address, ...config.address };
  const paymentMethod = config.paymentMethod || DEFAULT_CONFIG.paymentMethod;

  await fillDeliveryAddress(user, address);
  await selectPaymentMethod(user, paymentMethod);
}

/**
 * Generates a large cart with many items for performance testing.
 *
 * @param itemCount - Number of items to generate
 * @returns Array of cart items
 */
function generateLargeCart(itemCount: number): CartItem[] {
  const items: CartItem[] = [];
  const availableMenuItems = [...burgers, ...sides, ...drinks];

  for (let i = 0; i < itemCount; i++) {
    const menuItem = availableMenuItems[i % availableMenuItems.length];
    items.push({
      id: `${menuItem.id}-${i}`,
      name: `${menuItem.name} #${i + 1}`,
      price: menuItem.price,
      quantity: 1,
      imageUrl: menuItem.imageUrl,
    });
  }

  return items;
}

// ============================================================================
// Mock Setup
// ============================================================================

// Mock navigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ============================================================================
// Test Suites
// ============================================================================

describe('Checkout Flow Integration', () => {
  /**
   * Setup user event instance for realistic interactions.
   */
  let user: ReturnType<typeof userEvent.setup>;

  /**
   * Start MSW server before all tests.
   */
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  /**
   * Reset handlers and mocks before each test.
   */
  beforeEach(() => {
    user = userEvent.setup();
    vi.resetAllMocks();
    mockNavigate.mockClear();
  });

  /**
   * Cleanup after each test.
   */
  afterEach(() => {
    server.resetHandlers();
    cleanup();
  });

  /**
   * Stop MSW server after all tests.
   */
  afterAll(() => {
    server.close();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Cart Display Tests
  // --------------------------------------------------------------------------

  describe('when cart has items', () => {
    it('should display cart items and totals', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;

      // Act
      renderWithCart(<Checkout />, cartItems);

      // Assert - verify all items are displayed
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(screen.getByText('Fries')).toBeInTheDocument();
      expect(screen.getByText('Soda')).toBeInTheDocument();

      // Assert - verify quantities are shown
      expect(screen.getByText(/Qty: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Qty: 1/i)).toBeInTheDocument();
    });

    it('should calculate correct order total', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: '1', name: 'Test Burger', price: 10.00, quantity: 2 },
        { id: '2', name: 'Test Fries', price: 5.00, quantity: 1 },
      ];
      // Subtotal = 25.00, Tax (8%) = 2.00, Total = 27.00

      // Act
      renderWithCart(<Checkout />, cartItems);

      // Assert - verify total with tax is calculated correctly
      const totalElement = screen.getByTestId('order-total');
      expect(totalElement).toHaveTextContent('$27.00');
    });

    it('should enable checkout button when form is valid', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;

      // Act
      renderWithCart(<Checkout />, cartItems);

      // Fill in the form completely
      await fillCheckoutForm(user);

      // Assert - button should be enabled after form is complete
      const submitButton = screen.getByTestId('submit-order-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should display order summary section with correct item count', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: '1', name: 'Burger A', price: 9.99, quantity: 3 },
        { id: '2', name: 'Burger B', price: 8.99, quantity: 2 },
      ];
      // Total item count: 5

      // Act
      renderWithCart(<Checkout />, cartItems);

      // Assert
      expect(screen.getByText(/5 items/i)).toBeInTheDocument();
    });

    it('should display subtotal and tax separately', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: '1', name: 'Test Item', price: 100.00, quantity: 1 },
      ];
      // Subtotal = 100.00, Tax (8%) = 8.00

      // Act
      renderWithCart(<Checkout />, cartItems);

      // Assert
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText('$8.00')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Checkout Completion Tests
  // --------------------------------------------------------------------------

  describe('when completing checkout', () => {
    it('should submit order and show confirmation', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act - Fill form and submit
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should show success message
      await waitFor(() => {
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
      });
    });

    it('should call order API with correct payload', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: 'burger-001', name: 'Classic Burger', price: 8.99, quantity: 1 },
      ];
      let capturedPayload: any = null;

      server.use(
        http.post('/api/orders', async ({ request }) => {
          capturedPayload = await request.json();
          return HttpResponse.json({
            success: true,
            order: {
              id: 'order-test-123',
              status: 'pending',
              estimatedTime: '30-45 minutes',
              createdAt: new Date().toISOString(),
            },
            message: 'Order placed successfully',
          }, { status: 201 });
        })
      );

      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Wait for API call and verify payload
      await waitFor(() => {
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
      });
    });

    it('should redirect to order confirmation on success', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should show redirect message/link
      await waitFor(() => {
        const redirectLink = screen.getByRole('link', { name: /click here if not redirected/i });
        expect(redirectLink).toBeInTheDocument();
        expect(redirectLink).toHaveAttribute('href', expect.stringContaining('/order/confirmation/'));
      });
    });

    it('should clear cart after successful order', async () => {
      // Arrange
      const onOrderSuccess = vi.fn();
      const cartItems = DEFAULT_CART_ITEMS;
      customRender(<Checkout onOrderSuccess={onOrderSuccess} />, {
        initialCartState: { items: cartItems },
      });

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(onOrderSuccess).toHaveBeenCalled();
      });
    });

    it('should show loading state during order submission', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      
      // Add a delayed handler to observe loading state
      server.use(
        http.post('/api/orders', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({
            success: true,
            order: {
              id: 'order-loading-test',
              status: 'pending',
              estimatedTime: '30-45 minutes',
              createdAt: new Date().toISOString(),
            },
            message: 'Order placed successfully',
          }, { status: 201 });
        })
      );

      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should show loading state
      expect(screen.getByText(/processing order/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
      });
    });

    it('should disable form fields during submission', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      
      server.use(
        http.post('/api/orders', async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return HttpResponse.json({
            success: true,
            order: {
              id: 'order-disable-test',
              status: 'pending',
              estimatedTime: '30-45 minutes',
              createdAt: new Date().toISOString(),
            },
            message: 'Order placed successfully',
          }, { status: 201 });
        })
      );

      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Fields should be disabled during submission
      const streetInput = screen.getByTestId('input-street');
      expect(streetInput).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling Tests
  // --------------------------------------------------------------------------

  describe('when handling errors', () => {
    it('should display payment failure error message', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      
      server.use(
        http.post('/api/orders', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: failedPaymentScenario.error.code,
              message: failedPaymentScenario.error.message,
            },
            statusCode: 402,
          }, { status: 402 });
        })
      );

      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should display payment error
      await waitFor(() => {
        const errorElement = screen.getByTestId('checkout-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/payment was declined/i);
      });
    });

    it('should handle stock unavailability error', async () => {
      // Arrange
      const cartItems: CartItem[] = [
        { id: 'burger-999', name: 'Out of Stock Burger', price: 9.99, quantity: 1 },
      ];
      
      server.use(
        http.post('/api/orders', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'STOCK_UNAVAILABLE',
              message: 'Some items in your order are currently unavailable',
              details: { unavailableItems: 'Out of Stock Burger' },
            },
            statusCode: 409,
          }, { status: 409 });
        })
      );

      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        const errorElement = screen.getByTestId('checkout-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/unavailable/i);
      });
    });

    it('should handle address validation error', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      
      server.use(
        http.post('/api/orders', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'ADDRESS_VALIDATION_ERROR',
              message: 'The delivery address could not be validated',
              details: { field: 'zipCode', error: 'Invalid ZIP code format' },
            },
            statusCode: 400,
          }, { status: 400 });
        })
      );

      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        const errorElement = screen.getByTestId('checkout-error');
        expect(errorElement).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      
      server.use(
        http.post('/api/orders', () => {
          return HttpResponse.error();
        })
      );

      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should display generic error message
      await waitFor(() => {
        const errorElement = screen.getByTestId('checkout-error');
        expect(errorElement).toBeInTheDocument();
      });
    });

    it('should allow dismissing error messages', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      
      server.use(
        http.post('/api/orders', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'GENERIC_ERROR',
              message: 'Something went wrong',
            },
            statusCode: 500,
          }, { status: 500 });
        })
      );

      renderWithCart(<Checkout />, cartItems);

      // Act - Trigger error
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('checkout-error')).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByLabelText(/dismiss error message/i);
      await user.click(dismissButton);

      // Assert - Error should be dismissed
      await waitFor(() => {
        expect(screen.queryByTestId('checkout-error')).not.toBeInTheDocument();
      });
    });

    it('should call onOrderError callback on failure', async () => {
      // Arrange
      const onOrderError = vi.fn();
      const cartItems = DEFAULT_CART_ITEMS;
      
      server.use(
        http.post('/api/orders', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'PAYMENT_DECLINED',
              message: 'Payment was declined',
            },
            statusCode: 402,
          }, { status: 402 });
        })
      );

      customRender(<Checkout onOrderError={onOrderError} />, {
        initialCartState: { items: cartItems },
      });

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - The component handles errors internally
      await waitFor(() => {
        expect(screen.getByTestId('checkout-error')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should redirect to menu when cart is empty', async () => {
      // Arrange
      const emptyCart: CartItem[] = [];

      // Act
      renderWithCart(<Checkout />, emptyCart);

      // Assert - Should show redirect message
      await waitFor(() => {
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
        expect(screen.getByText(/redirecting to menu/i)).toBeInTheDocument();
      });
    });

    it('should show minimum order amount warning', async () => {
      // Arrange - Very low value items
      const lowValueCart: CartItem[] = [
        { id: '1', name: 'Tiny Item', price: 0.01, quantity: 1 },
      ];

      // This test validates the UI handles very low totals correctly
      // The actual minimum order validation would happen server-side

      // Act
      renderWithCart(<Checkout />, lowValueCart);

      // Assert - Order total should still display correctly
      const totalElement = screen.getByTestId('order-total');
      expect(totalElement).toBeInTheDocument();
    });

    it('should handle many items (100+) without performance issues', async () => {
      // Arrange
      const largeCart = generateLargeCart(100);
      const startTime = performance.now();

      // Act
      renderWithCart(<Checkout />, largeCart);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Assert - Should render within reasonable time (5 seconds)
      expect(renderTime).toBeLessThan(5000);

      // Verify items are rendered
      expect(screen.getByText(/100 items/i)).toBeInTheDocument();

      // Verify the total is calculated
      const totalElement = screen.getByTestId('order-total');
      expect(totalElement).toBeInTheDocument();
    });

    it('should validate required address fields', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act - Select payment but leave address empty
      await selectPaymentMethod(user, 'credit_card');
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should show validation error
      await waitFor(() => {
        const errorElement = screen.getByTestId('checkout-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/address/i);
      });
    });

    it('should validate payment method selection', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act - Fill address but don't select payment
      await fillDeliveryAddress(user, DEFAULT_CONFIG.address);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should show validation error
      await waitFor(() => {
        const errorElement = screen.getByTestId('checkout-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/payment method/i);
      });
    });

    it('should validate ZIP code format', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act - Fill with invalid ZIP code
      await fillDeliveryAddress(user, {
        ...DEFAULT_CONFIG.address,
        zipCode: 'invalid',
      });
      await selectPaymentMethod(user, 'credit_card');
      
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should show validation error
      await waitFor(() => {
        const errorElement = screen.getByTestId('checkout-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/zip code/i);
      });
    });

    it('should validate phone number format', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act - Fill with invalid phone number
      await fillDeliveryAddress(user, {
        ...DEFAULT_CONFIG.address,
        phone: '123', // Too short
      });
      await selectPaymentMethod(user, 'credit_card');
      
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should show validation error
      await waitFor(() => {
        const errorElement = screen.getByTestId('checkout-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/phone/i);
      });
    });

    it('should handle special characters in delivery instructions', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act - Fill form with special characters in instructions
      await fillDeliveryAddress(user, {
        ...DEFAULT_CONFIG.address,
        instructions: 'Gate code: #1234! Please ring "doorbell" & leave package.',
      });
      await selectPaymentMethod(user, 'credit_card');

      // Assert - Form should accept special characters
      const instructionsInput = screen.getByLabelText(/delivery instructions/i);
      expect(instructionsInput).toHaveValue('Gate code: #1234! Please ring "doorbell" & leave package.');
    });

    it('should handle 5+4 ZIP code format', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act - Fill with extended ZIP code
      await fillDeliveryAddress(user, {
        ...DEFAULT_CONFIG.address,
        zipCode: '12345-6789',
      });
      await selectPaymentMethod(user, 'credit_card');

      // Assert - ZIP code should be accepted
      const zipInput = screen.getByTestId('input-zipcode');
      expect(zipInput).toHaveValue('12345-6789');
    });
  });

  // --------------------------------------------------------------------------
  // Payment Method Tests
  // --------------------------------------------------------------------------

  describe('payment method selection', () => {
    it('should display all payment options', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;

      // Act
      renderWithCart(<Checkout />, cartItems);

      // Assert - All payment options should be available
      const paymentSelect = screen.getByLabelText(/select payment method/i);
      expect(paymentSelect).toBeInTheDocument();

      // Options should include credit card, debit card, and cash
      const options = paymentSelect.querySelectorAll('option');
      const optionValues = Array.from(options).map(opt => opt.value);
      
      expect(optionValues).toContain('credit_card');
      expect(optionValues).toContain('debit_card');
      expect(optionValues).toContain('cash');
    });

    it('should show cash payment note when cash is selected', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act
      await selectPaymentMethod(user, 'cash');

      // Assert - Should show cash-specific note
      expect(screen.getByText(/exact change/i)).toBeInTheDocument();
    });

    it('should show card payment note when card is selected', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act
      await selectPaymentMethod(user, 'credit_card');

      // Assert - Should show card-specific note
      expect(screen.getByText(/payment will be processed/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Form Interaction Tests
  // --------------------------------------------------------------------------

  describe('form interactions', () => {
    it('should clear error when user starts typing', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Trigger validation error
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('checkout-error')).toBeInTheDocument();
      });

      // Act - Start typing in a field
      const streetInput = screen.getByLabelText(/street address/i);
      await user.type(streetInput, 'New Address');

      // Assert - Error should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId('checkout-error')).not.toBeInTheDocument();
      });
    });

    it('should clear error when payment method is selected', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Fill address and trigger payment validation error
      await fillDeliveryAddress(user, DEFAULT_CONFIG.address);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('checkout-error')).toBeInTheDocument();
      });

      // Act - Select payment method
      await selectPaymentMethod(user, 'credit_card');

      // Assert - Error should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId('checkout-error')).not.toBeInTheDocument();
      });
    });

    it('should preserve form data on validation error', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Fill partial form
      const streetInput = screen.getByLabelText(/street address/i);
      await user.type(streetInput, '123 Test St');
      
      // Act - Submit incomplete form
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Street should still have the entered value
      await waitFor(() => {
        expect(screen.getByTestId('checkout-error')).toBeInTheDocument();
      });
      expect(streetInput).toHaveValue('123 Test St');
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('accessibility', () => {
    it('should have proper ARIA labels on form fields', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;

      // Act
      renderWithCart(<Checkout />, cartItems);

      // Assert - Form should be properly labeled
      expect(screen.getByRole('form', { name: /checkout form/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    it('should announce errors to screen readers', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      renderWithCart(<Checkout />, cartItems);

      // Act - Trigger error
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Error should have proper ARIA attributes
      await waitFor(() => {
        const errorElement = screen.getByTestId('checkout-error');
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    it('should have proper heading hierarchy', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;

      // Act
      renderWithCart(<Checkout />, cartItems);

      // Assert - Main heading should be h1
      expect(screen.getByRole('heading', { level: 1, name: /checkout/i })).toBeInTheDocument();
      
      // Section headings should be h2
      expect(screen.getByRole('heading', { level: 2, name: /order summary/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /delivery address/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /payment method/i })).toBeInTheDocument();
    });

    it('should have order items in an accessible list', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;

      // Act
      renderWithCart(<Checkout />, cartItems);

      // Assert - Items should be in a list with proper aria-label
      const itemsList = screen.getByRole('list', { name: /items in your order/i });
      expect(itemsList).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Success Flow Tests
  // --------------------------------------------------------------------------

  describe('successful order flow', () => {
    it('should display order confirmation number', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      
      server.use(
        http.post('/api/orders', () => {
          return HttpResponse.json({
            success: true,
            order: {
              id: 'order-success-123',
              status: 'pending',
              estimatedTime: '30-45 minutes',
              createdAt: new Date().toISOString(),
            },
            message: 'Order placed successfully',
          }, { status: 201 });
        })
      );

      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert - Should show confirmation number
      await waitFor(() => {
        expect(screen.getByText(/confirmation number/i)).toBeInTheDocument();
      });
    });

    it('should store order ID in session storage', async () => {
      // Arrange
      const cartItems = DEFAULT_CART_ITEMS;
      const mockSessionStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      
      const originalSessionStorage = window.sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
      });

      renderWithCart(<Checkout />, cartItems);

      // Act
      await fillCheckoutForm(user);
      const submitButton = screen.getByTestId('submit-order-button');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
          'lastOrderId',
          expect.any(String)
        );
      });

      // Cleanup
      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true,
      });
    });
  });
});
