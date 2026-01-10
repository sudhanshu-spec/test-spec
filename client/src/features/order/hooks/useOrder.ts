/**
 * @fileoverview useOrder custom hook for order operations
 * @module features/order/hooks/useOrder
 *
 * Provides comprehensive order state management including order creation,
 * retrieval, status tracking, and order history functionality. Manages
 * loading states, error handling, and maintains an orders array along
 * with the current order being viewed.
 */

import { useState, useCallback } from 'react';

/**
 * Possible order statuses representing the lifecycle of an order
 */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

/**
 * Represents an item within an order
 */
export interface OrderItem {
  /** Unique identifier for the menu item */
  menuItemId: string;
  /** Display name of the item */
  name: string;
  /** Quantity ordered */
  quantity: number;
  /** Price per unit */
  price: number;
  /** Optional special instructions for the item */
  specialInstructions?: string;
}

/**
 * Represents a delivery or billing address
 */
export interface Address {
  /** Street address */
  street: string;
  /** City name */
  city: string;
  /** State or province */
  state: string;
  /** Postal/ZIP code */
  zipCode: string;
}

/**
 * Represents a complete order with all details
 */
export interface Order {
  /** Unique order identifier */
  id: string;
  /** User who placed the order */
  userId: string;
  /** Array of items in the order */
  items: OrderItem[];
  /** Total order amount */
  total: number;
  /** Current order status */
  status: OrderStatus;
  /** ISO timestamp when order was created */
  createdAt: string;
  /** ISO timestamp when order was last updated */
  updatedAt?: string;
  /** Payment method used */
  paymentMethod?: string;
  /** Delivery address if applicable */
  deliveryAddress?: Address;
  /** Order confirmation number */
  confirmationNumber?: string;
}

/**
 * Input data required to create a new order
 */
export interface CreateOrderInput {
  /** Items to include in the order */
  items: OrderItem[];
  /** Payment method to use */
  paymentMethod: string;
  /** Optional delivery address */
  deliveryAddress?: Address;
}

/**
 * Return type for the useOrder hook
 */
export interface UseOrderReturn {
  /** Array of orders (order history) */
  orders: Order[];
  /** Currently selected/viewed order */
  currentOrder: Order | null;
  /** Loading state indicator */
  loading: boolean;
  /** Error message if an operation failed */
  error: string | null;
  /** Creates a new order with the provided input */
  createOrder: (input: CreateOrderInput) => Promise<Order | null>;
  /** Retrieves a specific order by ID */
  getOrder: (orderId: string) => Promise<Order | null>;
  /** Retrieves the user's order history */
  getOrderHistory: () => Promise<Order[]>;
  /** Cancels an order by ID */
  cancelOrder: (orderId: string) => Promise<boolean>;
  /** Clears the current error state */
  clearError: () => void;
}

/**
 * Generates a unique order ID
 * @returns {string} Unique order identifier
 */
function generateOrderId(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generates a confirmation number for an order
 * @returns {string} Order confirmation number
 */
function generateConfirmationNumber(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Simulates API delay for realistic behavior
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after delay
 */
async function simulateApiDelay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Custom hook for order state management
 *
 * Provides order creation, retrieval, status tracking, and order history
 * functionality with proper loading states and error handling.
 *
 * @returns {UseOrderReturn} Order state and operations
 *
 * @example
 * ```tsx
 * const { orders, currentOrder, loading, error, createOrder, getOrderHistory } = useOrder();
 *
 * // Create a new order
 * const order = await createOrder({
 *   items: [{ menuItemId: '1', name: 'Burger', quantity: 2, price: 9.99 }],
 *   paymentMethod: 'credit_card'
 * });
 *
 * // Load order history
 * await getOrderHistory();
 * ```
 */
export function useOrder(): UseOrderReturn {
  // State for storing order history
  const [orders, setOrders] = useState<Order[]>([]);

  // State for the currently viewed/selected order
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Loading state for async operations
  const [loading, setLoading] = useState<boolean>(false);

  // Error state for operation failures
  const [error, setError] = useState<string | null>(null);

  /**
   * Creates a new order with the provided input data
   *
   * @param {CreateOrderInput} input - Order creation data
   * @returns {Promise<Order | null>} Created order or null on failure
   */
  const createOrder = useCallback(
    async (input: CreateOrderInput): Promise<Order | null> => {
      setLoading(true);
      setError(null);

      try {
        // Validate input
        if (!input.items || input.items.length === 0) {
          throw new Error('Order must contain at least one item');
        }

        if (!input.paymentMethod) {
          throw new Error('Payment method is required');
        }

        // Validate each item has required fields
        for (const item of input.items) {
          if (!item.menuItemId || !item.name) {
            throw new Error('Each item must have a menuItemId and name');
          }
          if (item.quantity <= 0) {
            throw new Error('Item quantity must be greater than zero');
          }
          if (item.price < 0) {
            throw new Error('Item price cannot be negative');
          }
        }

        // Simulate API call
        await simulateApiDelay();

        // Calculate total from items
        const total = input.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        // Create new order object
        const newOrder: Order = {
          id: generateOrderId(),
          userId: 'current-user', // In real app, would come from auth context
          items: input.items,
          total: Math.round(total * 100) / 100, // Round to 2 decimal places
          status: 'pending',
          createdAt: new Date().toISOString(),
          paymentMethod: input.paymentMethod,
          deliveryAddress: input.deliveryAddress,
          confirmationNumber: generateConfirmationNumber(),
        };

        // Update orders state with new order
        setOrders((prevOrders) => [newOrder, ...prevOrders]);
        setCurrentOrder(newOrder);

        return newOrder;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create order';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Retrieves a specific order by ID
   *
   * @param {string} orderId - ID of the order to retrieve
   * @returns {Promise<Order | null>} Found order or null if not found
   */
  const getOrder = useCallback(
    async (orderId: string): Promise<Order | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!orderId || typeof orderId !== 'string') {
          throw new Error('Invalid order ID provided');
        }

        // Simulate API call
        await simulateApiDelay();

        // First check in local state
        const localOrder = orders.find((order) => order.id === orderId);

        if (localOrder) {
          setCurrentOrder(localOrder);
          return localOrder;
        }

        // If not found locally, simulate fetching from API
        // In a real app, this would make an API call to retrieve the order
        // For now, we simulate a "not found" scenario for orders not in local state
        throw new Error(`Order with ID ${orderId} not found`);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to retrieve order';
        setError(errorMessage);
        setCurrentOrder(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [orders]
  );

  /**
   * Retrieves the user's complete order history
   *
   * @returns {Promise<Order[]>} Array of user's past orders
   */
  const getOrderHistory = useCallback(async (): Promise<Order[]> => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await simulateApiDelay();

      // In a real app, this would fetch from an API
      // For demonstration, return current orders state
      // If orders is empty, we could simulate fetching sample data
      if (orders.length === 0) {
        // Create some sample order history for demonstration
        const sampleOrders: Order[] = [
          {
            id: 'ORD-HIST-001',
            userId: 'current-user',
            items: [
              {
                menuItemId: 'burger-1',
                name: 'Classic Burger',
                quantity: 2,
                price: 9.99,
              },
              {
                menuItemId: 'fries-1',
                name: 'French Fries',
                quantity: 1,
                price: 3.99,
              },
            ],
            total: 23.97,
            status: 'delivered',
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
            paymentMethod: 'credit_card',
            confirmationNumber: 'ABC123',
          },
          {
            id: 'ORD-HIST-002',
            userId: 'current-user',
            items: [
              {
                menuItemId: 'burger-2',
                name: 'Cheese Burger',
                quantity: 1,
                price: 11.99,
              },
              {
                menuItemId: 'drink-1',
                name: 'Soda',
                quantity: 2,
                price: 2.49,
              },
            ],
            total: 16.97,
            status: 'delivered',
            createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), // 14 days ago
            paymentMethod: 'debit_card',
            confirmationNumber: 'DEF456',
          },
        ];

        setOrders(sampleOrders);
        return sampleOrders;
      }

      return orders;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to retrieve order history';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [orders]);

  /**
   * Cancels an order by ID
   *
   * Only orders with 'pending' or 'confirmed' status can be cancelled.
   *
   * @param {string} orderId - ID of the order to cancel
   * @returns {Promise<boolean>} True if cancellation succeeded, false otherwise
   */
  const cancelOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        if (!orderId || typeof orderId !== 'string') {
          throw new Error('Invalid order ID provided');
        }

        // Find the order
        const orderToCancel = orders.find((order) => order.id === orderId);

        if (!orderToCancel) {
          throw new Error(`Order with ID ${orderId} not found`);
        }

        // Check if order can be cancelled
        const cancellableStatuses: OrderStatus[] = ['pending', 'confirmed'];
        if (!cancellableStatuses.includes(orderToCancel.status)) {
          throw new Error(
            `Order cannot be cancelled. Current status: ${orderToCancel.status}. Only pending or confirmed orders can be cancelled.`
          );
        }

        // Simulate API call
        await simulateApiDelay();

        // Update order status to cancelled
        const cancelledOrder: Order = {
          ...orderToCancel,
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
        };

        // Update orders state
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId ? cancelledOrder : order
          )
        );

        // Update current order if it matches
        if (currentOrder?.id === orderId) {
          setCurrentOrder(cancelledOrder);
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to cancel order';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [orders, currentOrder]
  );

  /**
   * Clears the current error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    orders,
    currentOrder,
    loading,
    error,
    createOrder,
    getOrder,
    getOrderHistory,
    cancelOrder,
    clearError,
  };
}
