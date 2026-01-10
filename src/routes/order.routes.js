'use strict';

/**
 * Order Routes Module
 * 
 * This module defines the order-related API endpoints using Express Router.
 * Provides CRUD operations for order management in the Burger Website application.
 * 
 * Route contracts:
 * - POST '/' creates a new order with order details in request body
 * - GET '/' retrieves a list of all orders
 * - GET '/:id' retrieves a single order by its unique identifier
 * - PUT '/:id/status' updates the status of a specific order
 * 
 * All handlers are named functions to support middleware detection in tests.
 * 
 * @module src/routes/order.routes
 */

const router = require('express').Router();

/**
 * Create a new order
 * Accepts order details in the request body and creates a new order record.
 * 
 * @route POST /
 * @param {Object} req.body - Order creation payload containing items, customer info, etc.
 * @returns {Object} Created order object with generated ID and timestamps
 * @status 201 - Order successfully created
 * @status 400 - Invalid order data provided
 * @status 500 - Server error during order creation
 */
function createOrder(req, res) {
  const orderData = req.body;
  
  // Validate required order fields
  if (!orderData || typeof orderData !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Invalid order data',
      message: 'Request body must contain order details'
    });
  }
  
  // Validate items array exists and is not empty
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid order items',
      message: 'Order must contain at least one item'
    });
  }
  
  // Generate order ID and timestamps
  const order = {
    id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    items: orderData.items,
    customerName: orderData.customerName || 'Guest',
    customerEmail: orderData.customerEmail || null,
    customerPhone: orderData.customerPhone || null,
    deliveryAddress: orderData.deliveryAddress || null,
    orderType: orderData.orderType || 'pickup',
    status: 'pending',
    subtotal: calculateSubtotal(orderData.items),
    tax: 0,
    total: 0,
    specialInstructions: orderData.specialInstructions || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Calculate tax and total
  order.tax = Number((order.subtotal * 0.08).toFixed(2));
  order.total = Number((order.subtotal + order.tax).toFixed(2));
  
  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order
  });
}

/**
 * Calculate the subtotal for order items
 * 
 * @param {Array} items - Array of order items with price and quantity
 * @returns {number} Calculated subtotal
 */
function calculateSubtotal(items) {
  if (!items || !Array.isArray(items)) {
    return 0;
  }
  
  return items.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 1;
    return total + (price * quantity);
  }, 0);
}

/**
 * List all orders
 * Retrieves a paginated list of all orders with optional filtering.
 * 
 * @route GET /
 * @param {string} [req.query.status] - Filter orders by status
 * @param {number} [req.query.page=1] - Page number for pagination
 * @param {number} [req.query.limit=10] - Number of orders per page
 * @returns {Object} List of orders with pagination metadata
 * @status 200 - Orders retrieved successfully
 * @status 500 - Server error during retrieval
 */
function listOrders(req, res) {
  const { status, page = 1, limit = 10 } = req.query;
  
  // Parse pagination parameters
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  
  // Placeholder response simulating database query results
  const orders = [];
  const totalOrders = 0;
  const totalPages = Math.ceil(totalOrders / limitNum);
  
  res.status(200).json({
    success: true,
    message: 'Orders retrieved successfully',
    data: {
      orders: orders,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalOrders: totalOrders,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: {
        status: status || null
      }
    }
  });
}

/**
 * Get a single order by ID
 * Retrieves detailed information about a specific order.
 * 
 * @route GET /:id
 * @param {string} req.params.id - Unique order identifier
 * @returns {Object} Detailed order information
 * @status 200 - Order found and returned
 * @status 400 - Invalid order ID format
 * @status 404 - Order not found
 * @status 500 - Server error during retrieval
 */
function getOrderById(req, res) {
  const { id } = req.params;
  
  // Validate order ID
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Invalid order ID',
      message: 'Order ID must be a non-empty string'
    });
  }
  
  // Simulate order lookup - in production this would query a database
  // For now, return a not found response to indicate proper handling
  res.status(404).json({
    success: false,
    error: 'Order not found',
    message: `No order found with ID: ${id}`
  });
}

/**
 * Update order status
 * Updates the status of a specific order (e.g., pending, confirmed, preparing, ready, delivered, cancelled).
 * 
 * @route PUT /:id/status
 * @param {string} req.params.id - Unique order identifier
 * @param {Object} req.body - Status update payload
 * @param {string} req.body.status - New order status
 * @returns {Object} Updated order with new status
 * @status 200 - Order status updated successfully
 * @status 400 - Invalid order ID or status
 * @status 404 - Order not found
 * @status 500 - Server error during update
 */
function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  
  // Valid order statuses
  const validStatuses = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'completed',
    'cancelled',
    'refunded'
  ];
  
  // Validate order ID
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Invalid order ID',
      message: 'Order ID must be a non-empty string'
    });
  }
  
  // Validate status
  if (!status || typeof status !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid status',
      message: 'Status must be provided in the request body'
    });
  }
  
  const normalizedStatus = status.toLowerCase().trim();
  
  if (!validStatuses.includes(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value',
      message: `Status must be one of: ${validStatuses.join(', ')}`
    });
  }
  
  // Simulate order status update - in production this would update a database
  // For now, return success response with updated timestamp
  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: {
      orderId: id,
      previousStatus: 'pending',
      newStatus: normalizedStatus,
      updatedAt: new Date().toISOString()
    }
  });
}

// Register route handlers
router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);

module.exports = router;
