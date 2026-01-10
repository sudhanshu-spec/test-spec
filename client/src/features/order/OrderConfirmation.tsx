/**
 * @fileoverview Order confirmation component displayed after successful checkout
 * @module features/order/OrderConfirmation
 * 
 * This component displays order confirmation details after a successful order submission.
 * It fetches order details from the API using the order ID from route parameters and
 * provides users with confirmation number, order summary, estimated delivery/pickup time,
 * and navigation options for viewing order details, ordering more, or tracking the order.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Represents an individual item in the order
 */
export interface OrderItem {
  /** Unique identifier for the order item */
  id: string;
  /** Name of the menu item */
  name: string;
  /** Price per unit of the item */
  price: number;
  /** Quantity ordered */
  quantity: number;
  /** Optional image URL for the item */
  imageUrl?: string;
  /** Optional special instructions for this item */
  specialInstructions?: string;
}

/**
 * Represents the delivery or pickup address
 */
export interface DeliveryAddress {
  /** Street address line 1 */
  street: string;
  /** Optional street address line 2 (apartment, suite, etc.) */
  street2?: string;
  /** City name */
  city: string;
  /** State or province */
  state: string;
  /** ZIP or postal code */
  zipCode: string;
}

/**
 * Order status type representing the current state of an order
 */
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out-for-delivery'
  | 'delivered'
  | 'picked-up'
  | 'cancelled';

/**
 * Order type indicating delivery or pickup
 */
export type OrderType = 'delivery' | 'pickup';

/**
 * Interface representing complete confirmed order details
 */
export interface ConfirmedOrder {
  /** Unique identifier for the order */
  id: string;
  /** Human-readable confirmation number for customer reference */
  confirmationNumber: string;
  /** Array of items in the order */
  items: OrderItem[];
  /** Subtotal before tax and fees */
  subtotal: number;
  /** Tax amount */
  tax: number;
  /** Delivery fee (if applicable) */
  deliveryFee: number;
  /** Total order amount including tax and fees */
  total: number;
  /** Estimated time for delivery or pickup ready */
  estimatedTime: string;
  /** Current status of the order */
  status: OrderStatus;
  /** Type of order (delivery or pickup) */
  orderType: OrderType;
  /** Delivery address (if delivery order) */
  deliveryAddress?: DeliveryAddress;
  /** Date and time when order was placed */
  orderDate: string;
  /** Customer name associated with the order */
  customerName: string;
  /** Customer email for order notifications */
  customerEmail?: string;
  /** Customer phone number */
  customerPhone?: string;
  /** Optional special instructions for the order */
  specialInstructions?: string;
}

/**
 * Props interface for the OrderConfirmation component
 */
export interface OrderConfirmationProps {
  /** Optional order ID override (primarily for testing) */
  orderId?: string;
  /** Optional callback when user clicks View Order Details */
  onViewDetails?: (orderId: string) => void;
  /** Optional callback when user clicks Order More */
  onOrderMore?: () => void;
  /** Optional callback when user clicks Track Order */
  onTrackOrder?: (orderId: string) => void;
}

/**
 * Route params interface for type-safe route parameter access
 * Uses Record<string, string | undefined> compatible structure for react-router-dom
 */
interface OrderConfirmationParams extends Record<string, string | undefined> {
  orderId?: string;
}

/**
 * API response type for order fetching
 */
interface FetchOrderResponse {
  success: boolean;
  order?: ConfirmedOrder;
  error?: string;
}

/**
 * Returns the appropriate CSS class for the order status badge
 * @param status - The current order status
 * @returns CSS class name string for styling the status badge
 */
const getStatusBadgeClass = (status: OrderStatus): string => {
  const statusClasses: Record<OrderStatus, string> = {
    pending: 'order-status--pending',
    confirmed: 'order-status--confirmed',
    preparing: 'order-status--preparing',
    ready: 'order-status--ready',
    'out-for-delivery': 'order-status--out-for-delivery',
    delivered: 'order-status--delivered',
    'picked-up': 'order-status--picked-up',
    cancelled: 'order-status--cancelled',
  };
  return `order-status ${statusClasses[status]}`;
};

/**
 * Returns human-readable label for order status
 * @param status - The current order status
 * @returns Formatted status label
 */
const getStatusLabel = (status: OrderStatus): string => {
  const statusLabels: Record<OrderStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Being Prepared',
    ready: 'Ready',
    'out-for-delivery': 'Out for Delivery',
    delivered: 'Delivered',
    'picked-up': 'Picked Up',
    cancelled: 'Cancelled',
  };
  return statusLabels[status];
};

/**
 * Formats a currency value for display
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Formats a date string for display
 * @param dateString - Date in ISO format
 * @returns Formatted date and time string for user display
 */
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Formats estimated time for display
 * @param estimatedTime - Estimated time string (could be ISO or descriptive)
 * @returns Formatted estimated time string
 */
const formatEstimatedTime = (estimatedTime: string): string => {
  // If it's an ISO date string, format it
  const date = new Date(estimatedTime);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  // Otherwise return as-is (e.g., "25-30 minutes")
  return estimatedTime;
};

/**
 * Formats delivery address for display
 * @param address - The delivery address object
 * @returns Formatted address string
 */
const formatAddress = (address: DeliveryAddress): string => {
  const parts = [address.street];
  if (address.street2) {
    parts.push(address.street2);
  }
  parts.push(`${address.city}, ${address.state} ${address.zipCode}`);
  return parts.join(', ');
};

/**
 * Fetches order details from the API
 * @param orderId - The order ID to fetch
 * @returns Promise resolving to order details or error
 */
const fetchOrderDetails = async (orderId: string): Promise<FetchOrderResponse> => {
  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Handle specific error statuses
      if (response.status === 404) {
        return {
          success: false,
          error: 'Order not found. Please check your order ID and try again.',
        };
      }
      
      // Try to parse error response
      try {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error?.message || 'Failed to retrieve order details.',
        };
      } catch {
        return {
          success: false,
          error: 'Failed to retrieve order details.',
        };
      }
    }
    
    const data = await response.json();
    return {
      success: true,
      order: data.order,
    };
  } catch (error) {
    // Handle network errors
    return {
      success: false,
      error: 'Unable to retrieve order details. Please check your connection and try again.',
    };
  }
};

/**
 * OrderConfirmation Component
 * 
 * Displays order confirmation details after a successful checkout.
 * Fetches order information from the API using the order ID from route parameters
 * and provides users with comprehensive order summary and navigation options.
 * 
 * Features:
 * - Prominent confirmation number display
 * - Thank you message
 * - Complete order summary with items, quantities, and totals
 * - Estimated delivery/pickup time
 * - Order status display
 * - Delivery address (for delivery orders)
 * - Navigation buttons for order tracking, viewing details, and ordering more
 * - Loading and error state handling
 * 
 * @param props - Component properties
 * @returns JSX element displaying the order confirmation
 * 
 * @example
 * ```tsx
 * // With route parameters (typical usage)
 * <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
 * 
 * // With explicit orderId (for testing)
 * <OrderConfirmation orderId="abc123" />
 * 
 * // With callbacks
 * <OrderConfirmation
 *   onViewDetails={(id) => navigate(`/orders/${id}`)}
 *   onOrderMore={() => navigate('/menu')}
 *   onTrackOrder={(id) => navigate(`/track/${id}`)}
 * />
 * ```
 */
export function OrderConfirmation({
  orderId: propsOrderId,
  onViewDetails,
  onOrderMore,
  onTrackOrder,
}: OrderConfirmationProps): React.ReactElement {
  // Get order ID from route params or props
  const params = useParams<OrderConfirmationParams>();
  const navigate = useNavigate();
  const orderId = propsOrderId || params.orderId;
  
  // Component state
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  /**
   * Fetches order details when component mounts or orderId changes
   */
  useEffect(() => {
    const loadOrderDetails = async (): Promise<void> => {
      if (!orderId) {
        setError('No order ID provided. Please check your order confirmation link.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchOrderDetails(orderId);
        
        if (response.success && response.order) {
          setOrder(response.order);
        } else {
          setError(response.error || 'Failed to load order details.');
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadOrderDetails();
  }, [orderId]);
  
  /**
   * Handles copying the confirmation number to clipboard
   */
  const handleCopyConfirmationNumber = useCallback(async (): Promise<void> => {
    if (!order) return;
    
    try {
      await navigator.clipboard.writeText(order.confirmationNumber);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = order.confirmationNumber;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy confirmation number:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }, [order]);
  
  /**
   * Handles navigation to view order details
   */
  const handleViewDetails = useCallback((): void => {
    if (!order) return;
    
    if (onViewDetails) {
      onViewDetails(order.id);
    } else {
      navigate(`/orders/${order.id}`);
    }
  }, [order, onViewDetails, navigate]);
  
  /**
   * Handles navigation to order more items
   */
  const handleOrderMore = useCallback((): void => {
    if (onOrderMore) {
      onOrderMore();
    } else {
      navigate('/menu');
    }
  }, [onOrderMore, navigate]);
  
  /**
   * Handles navigation to track order
   */
  const handleTrackOrder = useCallback((): void => {
    if (!order) return;
    
    if (onTrackOrder) {
      onTrackOrder(order.id);
    } else {
      navigate(`/track/${order.id}`);
    }
  }, [order, onTrackOrder, navigate]);
  
  /**
   * Handles retry action when order fetch fails
   */
  const handleRetry = useCallback((): void => {
    if (orderId) {
      setLoading(true);
      setError(null);
      fetchOrderDetails(orderId)
        .then(response => {
          if (response.success && response.order) {
            setOrder(response.order);
          } else {
            setError(response.error || 'Failed to load order details.');
          }
        })
        .catch(err => {
          console.error('Error retrying order fetch:', err);
          setError('An unexpected error occurred. Please try again later.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [orderId]);
  
  // Loading state
  if (loading) {
    return (
      <div className="order-confirmation order-confirmation--loading" role="status" aria-live="polite">
        <div className="order-confirmation__loading-spinner" aria-hidden="true">
          <div className="spinner" />
        </div>
        <p className="order-confirmation__loading-text">Loading your order details...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="order-confirmation order-confirmation--error" role="alert">
        <div className="order-confirmation__error-icon" aria-hidden="true">
          ⚠️
        </div>
        <h2 className="order-confirmation__error-title">Unable to Load Order</h2>
        <p className="order-confirmation__error-message">{error}</p>
        <div className="order-confirmation__error-actions">
          <button
            type="button"
            className="order-confirmation__btn order-confirmation__btn--primary"
            onClick={handleRetry}
          >
            Try Again
          </button>
          <button
            type="button"
            className="order-confirmation__btn order-confirmation__btn--secondary"
            onClick={handleOrderMore}
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }
  
  // No order found (should not happen if error handling is correct, but safety check)
  if (!order) {
    return (
      <div className="order-confirmation order-confirmation--not-found" role="alert">
        <h2 className="order-confirmation__error-title">Order Not Found</h2>
        <p className="order-confirmation__error-message">
          We couldn't find an order with the provided ID. Please check your confirmation email
          for the correct order link.
        </p>
        <button
          type="button"
          className="order-confirmation__btn order-confirmation__btn--primary"
          onClick={handleOrderMore}
        >
          Browse Menu
        </button>
      </div>
    );
  }
  
  // Success state - render order confirmation
  return (
    <div className="order-confirmation" role="main" aria-labelledby="order-confirmation-title">
      {/* Success Header */}
      <div className="order-confirmation__header">
        <div className="order-confirmation__success-icon" aria-hidden="true">
          ✓
        </div>
        <h1 id="order-confirmation-title" className="order-confirmation__title">
          Thank You for Your Order!
        </h1>
        <p className="order-confirmation__subtitle">
          Your order has been successfully placed and is being processed.
        </p>
      </div>
      
      {/* Confirmation Number Section */}
      <div className="order-confirmation__confirmation-section">
        <span className="order-confirmation__label">Confirmation Number</span>
        <div className="order-confirmation__confirmation-container">
          <span
            className="order-confirmation__confirmation-number"
            data-testid="confirmation-number"
          >
            {order.confirmationNumber}
          </span>
          <button
            type="button"
            className="order-confirmation__copy-btn"
            onClick={handleCopyConfirmationNumber}
            aria-label="Copy confirmation number to clipboard"
          >
            {copySuccess ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      {/* Order Status Badge */}
      <div className="order-confirmation__status-section">
        <span
          className={getStatusBadgeClass(order.status)}
          role="status"
          aria-label={`Order status: ${getStatusLabel(order.status)}`}
          data-testid="order-status"
        >
          {getStatusLabel(order.status)}
        </span>
      </div>
      
      {/* Estimated Time Section */}
      <div className="order-confirmation__time-section" data-testid="estimated-time">
        <div className="order-confirmation__time-icon" aria-hidden="true">
          ⏱️
        </div>
        <div className="order-confirmation__time-content">
          <span className="order-confirmation__time-label">
            Estimated {order.orderType === 'delivery' ? 'Delivery' : 'Pickup'} Time
          </span>
          <span className="order-confirmation__time-value">
            {formatEstimatedTime(order.estimatedTime)}
          </span>
        </div>
      </div>
      
      {/* Delivery Address (if delivery order) */}
      {order.orderType === 'delivery' && order.deliveryAddress && (
        <div className="order-confirmation__address-section" data-testid="delivery-address">
          <h3 className="order-confirmation__section-title">Delivery Address</h3>
          <address className="order-confirmation__address">
            {formatAddress(order.deliveryAddress)}
          </address>
        </div>
      )}
      
      {/* Order Summary Section */}
      <div className="order-confirmation__summary-section" data-testid="order-summary">
        <h3 className="order-confirmation__section-title">Order Summary</h3>
        
        {/* Order Items */}
        <ul className="order-confirmation__items-list" aria-label="Order items">
          {order.items.map((item) => (
            <li key={item.id} className="order-confirmation__item" data-testid={`order-item-${item.id}`}>
              <div className="order-confirmation__item-details">
                <span className="order-confirmation__item-name">{item.name}</span>
                <span className="order-confirmation__item-quantity">x{item.quantity}</span>
              </div>
              <span className="order-confirmation__item-price">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        
        {/* Order Totals */}
        <div className="order-confirmation__totals">
          <div className="order-confirmation__total-row">
            <span className="order-confirmation__total-label">Subtotal</span>
            <span className="order-confirmation__total-value" data-testid="subtotal">
              {formatCurrency(order.subtotal)}
            </span>
          </div>
          <div className="order-confirmation__total-row">
            <span className="order-confirmation__total-label">Tax</span>
            <span className="order-confirmation__total-value" data-testid="tax">
              {formatCurrency(order.tax)}
            </span>
          </div>
          {order.orderType === 'delivery' && order.deliveryFee > 0 && (
            <div className="order-confirmation__total-row">
              <span className="order-confirmation__total-label">Delivery Fee</span>
              <span className="order-confirmation__total-value" data-testid="delivery-fee">
                {formatCurrency(order.deliveryFee)}
              </span>
            </div>
          )}
          <div className="order-confirmation__total-row order-confirmation__total-row--final">
            <span className="order-confirmation__total-label order-confirmation__total-label--final">
              Total
            </span>
            <span
              className="order-confirmation__total-value order-confirmation__total-value--final"
              data-testid="total"
            >
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Order Details Section */}
      <div className="order-confirmation__details-section" data-testid="order-details">
        <h3 className="order-confirmation__section-title">Order Details</h3>
        <dl className="order-confirmation__details-list">
          <div className="order-confirmation__detail-item">
            <dt className="order-confirmation__detail-label">Order ID</dt>
            <dd className="order-confirmation__detail-value" data-testid="order-id">
              {order.id}
            </dd>
          </div>
          <div className="order-confirmation__detail-item">
            <dt className="order-confirmation__detail-label">Order Date</dt>
            <dd className="order-confirmation__detail-value" data-testid="order-date">
              {formatDateTime(order.orderDate)}
            </dd>
          </div>
          <div className="order-confirmation__detail-item">
            <dt className="order-confirmation__detail-label">Order Type</dt>
            <dd className="order-confirmation__detail-value" data-testid="order-type">
              {order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
            </dd>
          </div>
          <div className="order-confirmation__detail-item">
            <dt className="order-confirmation__detail-label">Name</dt>
            <dd className="order-confirmation__detail-value" data-testid="customer-name">
              {order.customerName}
            </dd>
          </div>
          {order.customerPhone && (
            <div className="order-confirmation__detail-item">
              <dt className="order-confirmation__detail-label">Phone</dt>
              <dd className="order-confirmation__detail-value" data-testid="customer-phone">
                {order.customerPhone}
              </dd>
            </div>
          )}
          {order.customerEmail && (
            <div className="order-confirmation__detail-item">
              <dt className="order-confirmation__detail-label">Email</dt>
              <dd className="order-confirmation__detail-value" data-testid="customer-email">
                {order.customerEmail}
              </dd>
            </div>
          )}
        </dl>
      </div>
      
      {/* Special Instructions (if any) */}
      {order.specialInstructions && (
        <div className="order-confirmation__instructions-section" data-testid="special-instructions">
          <h3 className="order-confirmation__section-title">Special Instructions</h3>
          <p className="order-confirmation__instructions">{order.specialInstructions}</p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="order-confirmation__actions">
        <button
          type="button"
          className="order-confirmation__btn order-confirmation__btn--primary"
          onClick={handleTrackOrder}
          data-testid="track-order-btn"
        >
          Track Order
        </button>
        <button
          type="button"
          className="order-confirmation__btn order-confirmation__btn--secondary"
          onClick={handleViewDetails}
          data-testid="view-details-btn"
        >
          View Order Details
        </button>
        <button
          type="button"
          className="order-confirmation__btn order-confirmation__btn--tertiary"
          onClick={handleOrderMore}
          data-testid="order-more-btn"
        >
          Order More
        </button>
      </div>
      
      {/* Confirmation Message */}
      <div className="order-confirmation__message">
        <p className="order-confirmation__message-text">
          A confirmation email has been sent to{' '}
          <strong>{order.customerEmail || 'your registered email address'}</strong>.
          Please save your confirmation number for reference.
        </p>
      </div>
    </div>
  );
}
