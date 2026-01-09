/**
 * @fileoverview Checkout component for completing orders
 * @module features/order/Checkout
 * 
 * This component provides the complete checkout flow for the burger website.
 * It displays the order summary with cart items, handles delivery address input,
 * payment method selection, and order submission. The component integrates with
 * CartContext for cart data access and handles form validation, loading states,
 * and error display. On successful order placement, it clears the cart and
 * redirects to the order confirmation page.
 */

import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import { useCartContext } from '../cart/CartContext';

/**
 * Props interface for the Checkout component.
 * Currently empty but structured for future extensibility.
 * @interface CheckoutProps
 */
export interface CheckoutProps {
  /** Optional callback when order is successfully placed */
  onOrderSuccess?: (orderId: string) => void;
  /** Optional callback when order fails */
  onOrderError?: (error: Error) => void;
}

/**
 * Internal state interface for the Checkout component.
 * Tracks loading state and error messages during order processing.
 * @interface CheckoutState
 */
export interface CheckoutState {
  /** Whether an order submission is in progress */
  loading: boolean;
  /** Error message to display, or null if no error */
  error: string | null;
}

/**
 * Delivery address information structure.
 * @interface DeliveryAddress
 */
interface DeliveryAddress {
  /** Full street address */
  street: string;
  /** City name */
  city: string;
  /** State or province */
  state: string;
  /** Postal/ZIP code */
  zipCode: string;
  /** Contact phone number */
  phone: string;
  /** Additional delivery instructions */
  instructions: string;
}

/**
 * Payment method options.
 * @type PaymentMethod
 */
type PaymentMethod = 'credit_card' | 'debit_card' | 'cash' | '';

/**
 * Order creation request payload structure.
 * @interface CreateOrderPayload
 */
interface CreateOrderPayload {
  /** Array of items in the order */
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  /** Total order amount */
  total: number;
  /** Delivery address details */
  deliveryAddress: DeliveryAddress;
  /** Selected payment method */
  paymentMethod: PaymentMethod;
}

/**
 * Order creation API response structure.
 * @interface CreateOrderResponse
 */
interface CreateOrderResponse {
  /** Unique order identifier */
  orderId: string;
  /** Human-readable confirmation number */
  confirmationNumber: string;
  /** Estimated delivery/pickup time */
  estimatedTime: string;
  /** Order status */
  status: string;
}

/**
 * Default empty delivery address values.
 * @constant
 */
const DEFAULT_ADDRESS: DeliveryAddress = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  instructions: ''
};

/**
 * Validates a delivery address for completeness.
 * @param address - The address to validate
 * @returns Object with isValid boolean and error message if invalid
 */
function validateAddress(address: DeliveryAddress): { isValid: boolean; error: string | null } {
  if (!address.street.trim()) {
    return { isValid: false, error: 'Street address is required' };
  }
  if (!address.city.trim()) {
    return { isValid: false, error: 'City is required' };
  }
  if (!address.state.trim()) {
    return { isValid: false, error: 'State is required' };
  }
  if (!address.zipCode.trim()) {
    return { isValid: false, error: 'ZIP code is required' };
  }
  // Validate ZIP code format (5 digits or 5+4 format)
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(address.zipCode.trim())) {
    return { isValid: false, error: 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)' };
  }
  if (!address.phone.trim()) {
    return { isValid: false, error: 'Phone number is required for delivery' };
  }
  // Validate phone format (basic 10-digit validation)
  const phoneDigits = address.phone.replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return { isValid: false, error: 'Please enter a valid 10-digit phone number' };
  }
  return { isValid: true, error: null };
}

/**
 * Validates the selected payment method.
 * @param method - The payment method to validate
 * @returns Object with isValid boolean and error message if invalid
 */
function validatePaymentMethod(method: PaymentMethod): { isValid: boolean; error: string | null } {
  if (!method) {
    return { isValid: false, error: 'Please select a payment method' };
  }
  const validMethods: PaymentMethod[] = ['credit_card', 'debit_card', 'cash'];
  if (!validMethods.includes(method)) {
    return { isValid: false, error: 'Invalid payment method selected' };
  }
  return { isValid: true, error: null };
}

/**
 * Simulates an API call to create an order.
 * In production, this would call the actual orders API endpoint.
 * @param payload - Order creation request data
 * @returns Promise resolving to order confirmation data
 * @throws Error if order creation fails
 */
async function createOrderAPI(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  // Simulate network delay for realistic UX
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // Simulate validation errors
  if (payload.items.length === 0) {
    throw new Error('Cannot create order with empty cart');
  }
  
  if (payload.total <= 0) {
    throw new Error('Order total must be greater than zero');
  }
  
  // Simulate successful order creation
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const confirmationNumber = `BRG${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  return {
    orderId,
    confirmationNumber,
    estimatedTime: '30-45 minutes',
    status: 'confirmed'
  };
}

/**
 * Formats a price value for display with currency symbol.
 * @param price - Numeric price value
 * @returns Formatted price string
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}

/**
 * Checkout component for completing customer orders.
 * 
 * @description
 * This component provides the complete checkout experience including:
 * - Order summary showing all cart items with quantities and prices
 * - Delivery address form with validation
 * - Payment method selection (credit card, debit card, cash)
 * - Form validation before submission
 * - Loading state during order processing
 * - Error handling and display
 * - Cart clearing and redirect on successful order
 * 
 * The component automatically redirects to the menu page if the cart is empty.
 * Upon successful order placement, it clears the cart and stores the order ID
 * in sessionStorage before redirecting to the confirmation page.
 * 
 * @example
 * ```tsx
 * // Basic usage within a route
 * <Route path="/checkout" element={<Checkout />} />
 * 
 * // With callbacks
 * <Checkout 
 *   onOrderSuccess={(orderId) => console.log('Order placed:', orderId)}
 *   onOrderError={(error) => console.error('Order failed:', error)}
 * />
 * ```
 * 
 * @param props - Component props
 * @returns The checkout page component or redirect
 */
export function Checkout({ onOrderSuccess, onOrderError }: CheckoutProps): React.ReactElement {
  // Cart state from context
  const { items, total, itemCount, clearCart } = useCartContext();
  
  // Component state
  const [state, setState] = useState<CheckoutState>({
    loading: false,
    error: null
  });
  
  // Form state
  const [address, setAddress] = useState<DeliveryAddress>(DEFAULT_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('');
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<CreateOrderResponse | null>(null);
  
  // Check for empty cart and set redirect flag
  useEffect(() => {
    if (itemCount === 0 && !redirecting && !orderResult) {
      // Small delay to allow for any pending state updates
      const timer = setTimeout(() => {
        setRedirecting(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [itemCount, redirecting, orderResult]);

  /**
   * Handles changes to address form fields.
   * @param field - The address field being updated
   */
  const handleAddressChange = useCallback((field: keyof DeliveryAddress) => {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setAddress((prev) => ({
        ...prev,
        [field]: value
      }));
      // Clear any existing error when user starts typing
      if (state.error) {
        setState((prev) => ({ ...prev, error: null }));
      }
    };
  }, [state.error]);

  /**
   * Handles payment method selection.
   * @param event - The change event from the payment method select
   */
  const handlePaymentChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as PaymentMethod;
    setPaymentMethod(value);
    // Clear any existing error when user makes a selection
    if (state.error) {
      setState((prev) => ({ ...prev, error: null }));
    }
  }, [state.error]);

  /**
   * Validates the entire form before submission.
   * @returns True if form is valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    // Validate cart has items
    if (items.length === 0) {
      setState((prev) => ({ ...prev, error: 'Your cart is empty. Please add items before checkout.' }));
      return false;
    }
    
    // Validate delivery address
    const addressValidation = validateAddress(address);
    if (!addressValidation.isValid) {
      setState((prev) => ({ ...prev, error: addressValidation.error }));
      return false;
    }
    
    // Validate payment method
    const paymentValidation = validatePaymentMethod(paymentMethod);
    if (!paymentValidation.isValid) {
      setState((prev) => ({ ...prev, error: paymentValidation.error }));
      return false;
    }
    
    return true;
  }, [items, address, paymentMethod]);

  /**
   * Handles form submission and order placement.
   * @param event - The form submission event
   */
  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    // Set loading state
    setState({ loading: true, error: null });
    
    try {
      // Prepare order payload
      const orderPayload: CreateOrderPayload = {
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total,
        deliveryAddress: address,
        paymentMethod
      };
      
      // Create order via API
      const result = await createOrderAPI(orderPayload);
      
      // Store order result for display/redirect
      setOrderResult(result);
      
      // Store order ID in sessionStorage for confirmation page
      try {
        sessionStorage.setItem('lastOrderId', result.orderId);
        sessionStorage.setItem('lastOrderConfirmation', result.confirmationNumber);
      } catch (storageError) {
        // SessionStorage may be disabled; continue anyway
        console.warn('Could not store order ID in sessionStorage:', storageError);
      }
      
      // Clear the cart after successful order
      clearCart();
      
      // Call success callback if provided
      if (onOrderSuccess) {
        onOrderSuccess(result.orderId);
      }
      
      // Update state to show success
      setState({ loading: false, error: null });
      
      // Set redirecting flag to trigger navigation
      setRedirecting(true);
      
    } catch (error) {
      // Handle order creation failure
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while placing your order. Please try again.';
      
      setState({ loading: false, error: errorMessage });
      
      // Call error callback if provided
      if (onOrderError && error instanceof Error) {
        onOrderError(error);
      }
    }
  }, [items, total, address, paymentMethod, validateForm, clearCart, onOrderSuccess, onOrderError]);

  /**
   * Clears the current error message.
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Render redirect message if navigating away
  if (redirecting) {
    if (orderResult) {
      // Redirect to confirmation page
      return (
        <div className="checkout-redirect" role="status" aria-live="polite">
          <div className="checkout-redirect-content">
            <div className="checkout-success-icon" aria-hidden="true">✓</div>
            <h2>Order Placed Successfully!</h2>
            <p>Your order confirmation number is: <strong>{orderResult.confirmationNumber}</strong></p>
            <p>Redirecting to confirmation page...</p>
            <a 
              href={`/order/confirmation/${orderResult.orderId}`}
              className="checkout-redirect-link"
            >
              Click here if not redirected automatically
            </a>
          </div>
        </div>
      );
    }
    
    // Redirect to menu for empty cart
    return (
      <div className="checkout-redirect" role="status" aria-live="polite">
        <div className="checkout-redirect-content">
          <h2>Your cart is empty</h2>
          <p>Redirecting to menu...</p>
          <a href="/menu" className="checkout-redirect-link">
            Click here to browse our menu
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page" data-testid="checkout-page">
      <header className="checkout-header">
        <h1>Checkout</h1>
        <p className="checkout-subtitle">Complete your order</p>
      </header>

      {/* Error Display */}
      {state.error && (
        <div 
          className="checkout-error" 
          role="alert" 
          aria-live="assertive"
          data-testid="checkout-error"
        >
          <span className="error-icon" aria-hidden="true">⚠</span>
          <span className="error-message">{state.error}</span>
          <button 
            type="button"
            className="error-dismiss"
            onClick={clearError}
            aria-label="Dismiss error message"
          >
            ×
          </button>
        </div>
      )}

      <div className="checkout-content">
        {/* Order Summary Section */}
        <section className="checkout-section order-summary-section" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading">Order Summary</h2>
          <div className="order-items" data-testid="order-items">
            {items.length === 0 ? (
              <p className="empty-cart-message">Your cart is empty</p>
            ) : (
              <>
                <ul className="order-items-list" aria-label="Items in your order">
                  {items.map((item) => (
                    <li key={item.id} className="order-item" data-testid={`order-item-${item.id}`}>
                      <div className="order-item-details">
                        <span className="order-item-name">{item.name}</span>
                        <span className="order-item-quantity">Qty: {item.quantity}</span>
                      </div>
                      <span className="order-item-price">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="order-totals">
                  <div className="order-subtotal">
                    <span>Subtotal ({itemCount} items)</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="order-tax">
                    <span>Estimated Tax</span>
                    <span>{formatPrice(total * 0.08)}</span>
                  </div>
                  <div className="order-total" data-testid="order-total">
                    <span>Total</span>
                    <span className="total-amount">{formatPrice(total * 1.08)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Checkout Form */}
        <form 
          className="checkout-form" 
          onSubmit={handleSubmit}
          aria-label="Checkout form"
          data-testid="checkout-form"
        >
          {/* Delivery Address Section */}
          <section className="checkout-section address-section" aria-labelledby="address-heading">
            <h2 id="address-heading">Delivery Address</h2>
            <div className="form-fields">
              <div className="form-field">
                <label htmlFor="street">Street Address *</label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={address.street}
                  onChange={handleAddressChange('street')}
                  placeholder="123 Main Street"
                  required
                  autoComplete="street-address"
                  disabled={state.loading}
                  data-testid="input-street"
                />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="city">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={address.city}
                    onChange={handleAddressChange('city')}
                    placeholder="City"
                    required
                    autoComplete="address-level2"
                    disabled={state.loading}
                    data-testid="input-city"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="state">State *</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={address.state}
                    onChange={handleAddressChange('state')}
                    placeholder="State"
                    required
                    autoComplete="address-level1"
                    disabled={state.loading}
                    data-testid="input-state"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="zipCode">ZIP Code *</label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={address.zipCode}
                    onChange={handleAddressChange('zipCode')}
                    placeholder="12345"
                    required
                    autoComplete="postal-code"
                    disabled={state.loading}
                    pattern="\d{5}(-\d{4})?"
                    data-testid="input-zipcode"
                  />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={address.phone}
                  onChange={handleAddressChange('phone')}
                  placeholder="(555) 123-4567"
                  required
                  autoComplete="tel"
                  disabled={state.loading}
                  data-testid="input-phone"
                />
              </div>
              <div className="form-field">
                <label htmlFor="instructions">Delivery Instructions (Optional)</label>
                <textarea
                  id="instructions"
                  name="instructions"
                  value={address.instructions}
                  onChange={handleAddressChange('instructions')}
                  placeholder="Gate code, building number, etc."
                  rows={3}
                  disabled={state.loading}
                  data-testid="input-instructions"
                />
              </div>
            </div>
          </section>

          {/* Payment Method Section */}
          <section className="checkout-section payment-section" aria-labelledby="payment-heading">
            <h2 id="payment-heading">Payment Method</h2>
            <div className="form-field">
              <label htmlFor="paymentMethod">Select Payment Method *</label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={paymentMethod}
                onChange={handlePaymentChange}
                required
                disabled={state.loading}
                data-testid="select-payment"
              >
                <option value="">-- Select Payment Method --</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="cash">Cash on Delivery</option>
              </select>
            </div>
            {paymentMethod && paymentMethod !== 'cash' && (
              <p className="payment-note" role="note">
                <span className="note-icon" aria-hidden="true">ℹ</span>
                Payment will be processed securely upon order confirmation.
              </p>
            )}
            {paymentMethod === 'cash' && (
              <p className="payment-note cash-note" role="note">
                <span className="note-icon" aria-hidden="true">💵</span>
                Please have exact change ready. Our drivers carry limited change.
              </p>
            )}
          </section>

          {/* Submit Button */}
          <div className="checkout-actions">
            <button
              type="submit"
              className="checkout-submit-button"
              disabled={state.loading || items.length === 0}
              data-testid="submit-order-button"
            >
              {state.loading ? (
                <>
                  <span className="loading-spinner" aria-hidden="true"></span>
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <span>Place Order</span>
                  <span className="button-total">{formatPrice(total * 1.08)}</span>
                </>
              )}
            </button>
            <p className="checkout-disclaimer">
              By placing your order, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
