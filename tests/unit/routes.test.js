/**
 * @fileoverview Unit tests for route handlers
 * @module tests/unit/routes
 * 
 * Tests route structure and handler functionality for:
 * - main.routes.js (base application routes)
 * - menu.routes.js (menu API routes)
 * - auth.routes.js (authentication API routes)
 * - order.routes.js (order API routes)
 * - booking.routes.js (booking/reservation API routes)
 */

'use strict';

const mainRoutes = require('../../src/routes/main.routes');
const menuRoutes = require('../../src/routes/menu.routes');
const authRoutes = require('../../src/routes/auth.routes');
const orderRoutes = require('../../src/routes/order.routes');
const bookingRoutes = require('../../src/routes/booking.routes');

/**
 * @typedef {Object} RouteLayer
 * @property {Object} route - Route configuration
 * @property {string} route.path - Route path
 * @property {Object} route.methods - HTTP methods object
 * @property {Object[]} route.stack - Handler stack
 */

/**
 * Extracts route layers from Express Router stack.
 * @param {import('express').Router} router - Express Router instance
 * @returns {RouteLayer[]} Array of route layers with route definitions
 */
function getRouteLayers(router) {
  return router.stack.filter(layer => layer.route);
}

/**
 * Extracts route paths from Express Router.
 * @param {import('express').Router} router - Express Router instance
 * @returns {string[]} Array of route paths
 */
function getRoutePaths(router) {
  return getRouteLayers(router).map(layer => layer.route.path);
}

/**
 * Extracts route handler names from Express Router.
 * @param {import('express').Router} router - Express Router instance
 * @returns {string[]} Array of handler function names
 */
function getHandlerNames(router) {
  const names = [];
  getRouteLayers(router).forEach(layer => {
    layer.route.stack.forEach(handler => {
      if (handler.handle && handler.handle.name) {
        names.push(handler.handle.name);
      }
    });
  });
  return names;
}

/**
 * Creates a mock response object for testing handlers.
 * @returns {Object} Mock response object with chainable methods
 */
function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

/**
 * Creates a mock request object for testing handlers.
 * @param {Object} [options] - Request options
 * @param {Object} [options.params] - Request parameters
 * @param {Object} [options.body] - Request body
 * @param {Object} [options.query] - Query parameters
 * @param {Object} [options.headers] - Request headers
 * @returns {Object} Mock request object
 */
function createMockRequest(options = {}) {
  return {
    params: options.params || {},
    body: options.body || {},
    query: options.query || {},
    headers: options.headers || {}
  };
}

/**
 * Finds a route handler by path and method.
 * @param {import('express').Router} router - Express Router instance
 * @param {string} path - Route path
 * @param {string} method - HTTP method (lowercase)
 * @returns {Function|null} Handler function or null
 */
function findHandler(router, path, method) {
  const routeLayers = getRouteLayers(router);
  const layer = routeLayers.find(l => 
    l.route.path === path && l.route.methods[method]
  );
  return layer ? layer.route.stack[0].handle : null;
}

describe('Route Handlers - main.routes.js', () => {
  describe('Router Export', () => {
    test('should export an Express Router instance', () => {
      expect(mainRoutes).toBeDefined();
      expect(typeof mainRoutes).toBe('function');
      expect(mainRoutes.stack).toBeDefined();
      expect(Array.isArray(mainRoutes.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      expect(typeof mainRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have two route handlers defined', () => {
      const routeLayers = getRouteLayers(mainRoutes);
      expect(routeLayers.length).toBe(2);
    });

    test('should define handlers for / and /evening paths', () => {
      const paths = getRoutePaths(mainRoutes);
      expect(paths).toContain('/');
      expect(paths).toContain('/evening');
    });

    test('should define GET method handlers for both routes', () => {
      const routeLayers = getRouteLayers(mainRoutes);
      
      routeLayers.forEach(layer => {
        expect(layer.route.methods).toBeDefined();
        expect(layer.route.methods.get).toBe(true);
      });
    });

    test('should have handler functions in route stack', () => {
      const routeLayers = getRouteLayers(mainRoutes);
      
      routeLayers.forEach(layer => {
        expect(layer.route.stack).toBeDefined();
        expect(layer.route.stack.length).toBeGreaterThan(0);
        
        layer.route.stack.forEach(handler => {
          expect(typeof handler.handle).toBe('function');
        });
      });
    });
  });

  describe('Route Path Ordering', () => {
    test('should define root path (/) before /evening path', () => {
      const paths = getRoutePaths(mainRoutes);
      const rootIndex = paths.indexOf('/');
      const eveningIndex = paths.indexOf('/evening');
      
      expect(rootIndex).toBeLessThan(eveningIndex);
    });
  });
});

/**
 * Menu Routes Tests
 * Tests for menu.routes.js - Menu API endpoints for online ordering feature
 */
describe('Route Handlers - menu.routes.js', () => {
  describe('Router Export', () => {
    test('should export an Express Router instance', () => {
      expect(menuRoutes).toBeDefined();
      expect(typeof menuRoutes).toBe('function');
      expect(menuRoutes.stack).toBeDefined();
      expect(Array.isArray(menuRoutes.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      expect(typeof menuRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have two route handlers defined', () => {
      const routeLayers = getRouteLayers(menuRoutes);
      expect(routeLayers.length).toBe(2);
    });

    test('should define handlers for / and /:id paths', () => {
      const paths = getRoutePaths(menuRoutes);
      expect(paths).toContain('/');
      expect(paths).toContain('/:id');
    });

    test('should define GET method handlers for both routes', () => {
      const routeLayers = getRouteLayers(menuRoutes);
      
      routeLayers.forEach(layer => {
        expect(layer.route.methods).toBeDefined();
        expect(layer.route.methods.get).toBe(true);
      });
    });

    test('should have named handler functions for middleware detection', () => {
      const handlerNames = getHandlerNames(menuRoutes);
      expect(handlerNames.length).toBe(2);
      expect(handlerNames).toContain('listMenuItems');
      expect(handlerNames).toContain('getMenuItemById');
    });
  });

  describe('Route Path Ordering', () => {
    test('should define list route (/) before detail route (/:id)', () => {
      const paths = getRoutePaths(menuRoutes);
      const listIndex = paths.indexOf('/');
      const detailIndex = paths.indexOf('/:id');
      
      expect(listIndex).toBeLessThan(detailIndex);
    });
  });

  describe('Handler Response Contracts', () => {
    test('listMenuItems handler should return proper JSON structure', () => {
      const handler = findHandler(menuRoutes, '/', 'get');
      const req = createMockRequest();
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('getMenuItemById handler should return proper JSON structure for valid id', () => {
      const handler = findHandler(menuRoutes, '/:id', 'get');
      const req = createMockRequest({ params: { id: '123' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id', '123');
    });

    test('getMenuItemById handler should handle missing id parameter', () => {
      const handler = findHandler(menuRoutes, '/:id', 'get');
      const req = createMockRequest({ params: { id: undefined } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});

/**
 * Auth Routes Tests
 * Tests for auth.routes.js - Authentication API endpoints
 */
describe('Route Handlers - auth.routes.js', () => {
  describe('Router Export', () => {
    test('should export an Express Router instance', () => {
      expect(authRoutes).toBeDefined();
      expect(typeof authRoutes).toBe('function');
      expect(authRoutes.stack).toBeDefined();
      expect(Array.isArray(authRoutes.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      expect(typeof authRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have four route handlers defined', () => {
      const routeLayers = getRouteLayers(authRoutes);
      expect(routeLayers.length).toBe(4);
    });

    test('should define handlers for /login, /register, /logout, and /refresh paths', () => {
      const paths = getRoutePaths(authRoutes);
      expect(paths).toContain('/login');
      expect(paths).toContain('/register');
      expect(paths).toContain('/logout');
      expect(paths).toContain('/refresh');
    });

    test('should define correct HTTP methods for each route', () => {
      const routeLayers = getRouteLayers(authRoutes);
      
      const loginRoute = routeLayers.find(l => l.route.path === '/login');
      expect(loginRoute.route.methods.post).toBe(true);
      
      const registerRoute = routeLayers.find(l => l.route.path === '/register');
      expect(registerRoute.route.methods.post).toBe(true);
      
      const logoutRoute = routeLayers.find(l => l.route.path === '/logout');
      expect(logoutRoute.route.methods.delete).toBe(true);
      
      const refreshRoute = routeLayers.find(l => l.route.path === '/refresh');
      expect(refreshRoute.route.methods.post).toBe(true);
    });

    test('should have named handler functions for middleware detection', () => {
      const handlerNames = getHandlerNames(authRoutes);
      expect(handlerNames.length).toBe(4);
      expect(handlerNames).toContain('loginHandler');
      expect(handlerNames).toContain('registerHandler');
      expect(handlerNames).toContain('logoutHandler');
      expect(handlerNames).toContain('refreshHandler');
    });
  });

  describe('Login Handler', () => {
    test('should return 200 and token for valid credentials', () => {
      const handler = findHandler(authRoutes, '/login', 'post');
      const req = createMockRequest({
        body: { email: 'test@example.com', password: 'password123' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('token');
    });

    test('should return 400 for missing email', () => {
      const handler = findHandler(authRoutes, '/login', 'post');
      const req = createMockRequest({ body: { password: 'password123' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('should return 400 for missing password', () => {
      const handler = findHandler(authRoutes, '/login', 'post');
      const req = createMockRequest({ body: { email: 'test@example.com' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
    });

    test('should return 400 for undefined body', () => {
      const handler = findHandler(authRoutes, '/login', 'post');
      const req = createMockRequest();
      req.body = undefined;
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Register Handler', () => {
    test('should return 201 for successful registration', () => {
      const handler = findHandler(authRoutes, '/register', 'post');
      const req = createMockRequest({
        body: { email: 'new@example.com', password: 'password123', name: 'John Doe' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });

    test('should return 201 for registration without name', () => {
      const handler = findHandler(authRoutes, '/register', 'post');
      const req = createMockRequest({
        body: { email: 'new@example.com', password: 'password123' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.name).toBe('');
    });

    test('should return 400 for missing email', () => {
      const handler = findHandler(authRoutes, '/register', 'post');
      const req = createMockRequest({ body: { password: 'password123' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
    });

    test('should return 400 for undefined body', () => {
      const handler = findHandler(authRoutes, '/register', 'post');
      const req = createMockRequest();
      req.body = undefined;
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Logout Handler', () => {
    test('should return 200 for successful logout with auth header', () => {
      const handler = findHandler(authRoutes, '/logout', 'delete');
      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('should return 401 for missing authorization header', () => {
      const handler = findHandler(authRoutes, '/logout', 'delete');
      const req = createMockRequest();
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Refresh Handler', () => {
    test('should return 200 with new tokens for valid refresh token', () => {
      const handler = findHandler(authRoutes, '/refresh', 'post');
      const req = createMockRequest({
        body: { refreshToken: 'valid-refresh-token' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('token');
    });

    test('should return 400 for missing refresh token', () => {
      const handler = findHandler(authRoutes, '/refresh', 'post');
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('should return 400 for undefined body', () => {
      const handler = findHandler(authRoutes, '/refresh', 'post');
      const req = createMockRequest();
      req.body = undefined;
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
    });
  });
});

/**
 * Order Routes Tests
 * Tests for order.routes.js - Order API endpoints for online ordering feature
 */
describe('Route Handlers - order.routes.js', () => {
  describe('Router Export', () => {
    test('should export an Express Router instance', () => {
      expect(orderRoutes).toBeDefined();
      expect(typeof orderRoutes).toBe('function');
      expect(orderRoutes.stack).toBeDefined();
      expect(Array.isArray(orderRoutes.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      expect(typeof orderRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have four route handlers defined', () => {
      const routeLayers = getRouteLayers(orderRoutes);
      expect(routeLayers.length).toBe(4);
    });

    test('should define handlers for /, /:id, and /:id/status paths', () => {
      const paths = getRoutePaths(orderRoutes);
      expect(paths).toContain('/');
      expect(paths).toContain('/:id');
      expect(paths).toContain('/:id/status');
    });

    test('should define correct HTTP methods for each route', () => {
      const routeLayers = getRouteLayers(orderRoutes);
      
      // POST / - Create order
      const createRoute = routeLayers.find(l => 
        l.route.path === '/' && l.route.methods.post
      );
      expect(createRoute).toBeDefined();
      expect(createRoute.route.methods.post).toBe(true);
      
      // GET / - List orders
      const listRoute = routeLayers.find(l => 
        l.route.path === '/' && l.route.methods.get
      );
      expect(listRoute).toBeDefined();
      expect(listRoute.route.methods.get).toBe(true);
      
      // GET /:id - Get order by ID
      const getByIdRoute = routeLayers.find(l => 
        l.route.path === '/:id' && l.route.methods.get
      );
      expect(getByIdRoute).toBeDefined();
      expect(getByIdRoute.route.methods.get).toBe(true);
      
      // PUT /:id/status - Update order status
      const updateStatusRoute = routeLayers.find(l => 
        l.route.path === '/:id/status' && l.route.methods.put
      );
      expect(updateStatusRoute).toBeDefined();
      expect(updateStatusRoute.route.methods.put).toBe(true);
    });

    test('should have named handler functions for middleware detection', () => {
      const handlerNames = getHandlerNames(orderRoutes);
      expect(handlerNames.length).toBe(4);
      expect(handlerNames).toContain('createOrder');
      expect(handlerNames).toContain('listOrders');
      expect(handlerNames).toContain('getOrderById');
      expect(handlerNames).toContain('updateOrderStatus');
    });
  });

  describe('createOrder Handler', () => {
    test('should return 201 for valid order with items', () => {
      const handler = findHandler(orderRoutes, '/', 'post');
      const req = createMockRequest({
        body: {
          items: [
            { name: 'Burger', price: 9.99, quantity: 2 },
            { name: 'Fries', price: 3.99, quantity: 1 }
          ],
          customerName: 'John Doe',
          customerEmail: 'john@example.com'
        }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('status', 'pending');
    });

    test('should return 400 for missing order data', () => {
      const handler = findHandler(orderRoutes, '/', 'post');
      const req = createMockRequest({ body: null });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('should return 400 for non-object body', () => {
      const handler = findHandler(orderRoutes, '/', 'post');
      const req = createMockRequest();
      req.body = 'invalid string';
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid order data');
    });

    test('should return 400 for empty items array', () => {
      const handler = findHandler(orderRoutes, '/', 'post');
      const req = createMockRequest({
        body: {
          items: [],
          customerName: 'John Doe'
        }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('should return 400 for missing items array', () => {
      const handler = findHandler(orderRoutes, '/', 'post');
      const req = createMockRequest({
        body: {
          customerName: 'John Doe'
        }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('should calculate subtotal, tax and total correctly', () => {
      const handler = findHandler(orderRoutes, '/', 'post');
      const req = createMockRequest({
        body: {
          items: [
            { name: 'Burger', price: 10.00, quantity: 2 },
            { name: 'Fries', price: 5.00, quantity: 1 }
          ]
        }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data.subtotal).toBe(25.00);
      expect(res.body.data.tax).toBe(2.00);
      expect(res.body.data.total).toBe(27.00);
    });

    test('should use default values for optional fields', () => {
      const handler = findHandler(orderRoutes, '/', 'post');
      const req = createMockRequest({
        body: {
          items: [{ name: 'Burger', price: 10.00, quantity: 1 }]
        }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data.customerName).toBe('Guest');
      expect(res.body.data.orderType).toBe('pickup');
    });

    test('should handle items with non-numeric price values', () => {
      const handler = findHandler(orderRoutes, '/', 'post');
      const req = createMockRequest({
        body: {
          items: [
            { name: 'Item1', price: 'invalid', quantity: 1 },
            { name: 'Item2', price: 10.00, quantity: 'two' }
          ]
        }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data.subtotal).toBe(10.00);
    });
  });

  describe('listOrders Handler', () => {
    test('should return 200 with orders list', () => {
      const handler = findHandler(orderRoutes, '/', 'get');
      const req = createMockRequest();
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('orders');
      expect(Array.isArray(res.body.data.orders)).toBe(true);
    });

    test('should return pagination metadata', () => {
      const handler = findHandler(orderRoutes, '/', 'get');
      const req = createMockRequest({ query: { page: '2', limit: '20' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.pagination).toHaveProperty('currentPage', 2);
      expect(res.body.data.pagination).toHaveProperty('limit', 20);
    });

    test('should accept status filter', () => {
      const handler = findHandler(orderRoutes, '/', 'get');
      const req = createMockRequest({ query: { status: 'pending' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('filters');
      expect(res.body.data.filters.status).toBe('pending');
    });

    test('should handle invalid page number gracefully', () => {
      const handler = findHandler(orderRoutes, '/', 'get');
      const req = createMockRequest({ query: { page: '-5' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.pagination.currentPage).toBe(1);
    });

    test('should limit max items per page to 100', () => {
      const handler = findHandler(orderRoutes, '/', 'get');
      const req = createMockRequest({ query: { limit: '500' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.pagination.limit).toBe(100);
    });
  });

  describe('getOrderById Handler', () => {
    test('should return 400 for invalid order ID', () => {
      const handler = findHandler(orderRoutes, '/:id', 'get');
      const req = createMockRequest({ params: { id: '' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 400 for whitespace-only ID', () => {
      const handler = findHandler(orderRoutes, '/:id', 'get');
      const req = createMockRequest({ params: { id: '   ' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
    });

    test('should return 404 for non-existent order', () => {
      const handler = findHandler(orderRoutes, '/:id', 'get');
      const req = createMockRequest({ params: { id: 'order_123' } });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('updateOrderStatus Handler', () => {
    test('should return 200 for valid status update', () => {
      const handler = findHandler(orderRoutes, '/:id/status', 'put');
      const req = createMockRequest({
        params: { id: 'order_123' },
        body: { status: 'confirmed' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('orderId', 'order_123');
      expect(res.body.data).toHaveProperty('newStatus', 'confirmed');
    });

    test('should return 400 for invalid order ID', () => {
      const handler = findHandler(orderRoutes, '/:id/status', 'put');
      const req = createMockRequest({
        params: { id: '' },
        body: { status: 'confirmed' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('should return 400 for missing status', () => {
      const handler = findHandler(orderRoutes, '/:id/status', 'put');
      const req = createMockRequest({
        params: { id: 'order_123' },
        body: {}
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('should return 400 for invalid status value', () => {
      const handler = findHandler(orderRoutes, '/:id/status', 'put');
      const req = createMockRequest({
        params: { id: 'order_123' },
        body: { status: 'invalid_status' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('Status must be one of');
    });

    test('should accept all valid status values', () => {
      const handler = findHandler(orderRoutes, '/:id/status', 'put');
      const validStatuses = [
        'pending', 'confirmed', 'preparing', 'ready',
        'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded'
      ];
      
      validStatuses.forEach(status => {
        const req = createMockRequest({
          params: { id: 'order_123' },
          body: { status }
        });
        const res = createMockResponse();
        
        handler(req, res);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.newStatus).toBe(status);
      });
    });

    test('should normalize status to lowercase', () => {
      const handler = findHandler(orderRoutes, '/:id/status', 'put');
      const req = createMockRequest({
        params: { id: 'order_123' },
        body: { status: 'CONFIRMED' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.newStatus).toBe('confirmed');
    });
  });
});

/**
 * Tests for booking.routes.js
 * Tests the booking/reservation API routes for table reservations
 */
describe('Route Handlers - booking.routes.js', () => {
  describe('Router Export', () => {
    test('should export an Express Router instance', () => {
      expect(bookingRoutes).toBeDefined();
      expect(typeof bookingRoutes).toBe('function');
      expect(bookingRoutes.stack).toBeDefined();
      expect(Array.isArray(bookingRoutes.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      expect(typeof bookingRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have five route handlers defined', () => {
      const routeLayers = getRouteLayers(bookingRoutes);
      expect(routeLayers.length).toBe(5);
    });

    test('should define handlers for /, and /:id paths', () => {
      const paths = getRoutePaths(bookingRoutes);
      expect(paths).toContain('/');
      expect(paths).toContain('/:id');
    });

    test('should define correct HTTP methods for each route', () => {
      const routeLayers = getRouteLayers(bookingRoutes);
      
      // POST /
      const postRoot = routeLayers.find(l => l.route.path === '/' && l.route.methods.post);
      expect(postRoot).toBeDefined();
      
      // GET /
      const getRoot = routeLayers.find(l => l.route.path === '/' && l.route.methods.get);
      expect(getRoot).toBeDefined();
      
      // GET /:id
      const getId = routeLayers.find(l => l.route.path === '/:id' && l.route.methods.get);
      expect(getId).toBeDefined();
      
      // PUT /:id
      const putId = routeLayers.find(l => l.route.path === '/:id' && l.route.methods.put);
      expect(putId).toBeDefined();
      
      // DELETE /:id
      const deleteId = routeLayers.find(l => l.route.path === '/:id' && l.route.methods.delete);
      expect(deleteId).toBeDefined();
    });

    test('should have named handler functions for middleware detection', () => {
      const handlerNames = getHandlerNames(bookingRoutes);
      expect(handlerNames).toContain('createBooking');
      expect(handlerNames).toContain('listBookings');
      expect(handlerNames).toContain('getBookingDetails');
      expect(handlerNames).toContain('updateBooking');
      expect(handlerNames).toContain('cancelBooking');
    });
  });

  describe('createBooking Handler', () => {
    test('should return 201 for valid booking', () => {
      const handler = findHandler(bookingRoutes, '/', 'post');
      const req = createMockRequest({
        body: {
          date: '2026-01-15',
          time: '19:00',
          partySize: 4,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234'
        }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Booking created successfully');
      expect(res.body).toHaveProperty('booking');
      expect(res.body.booking).toHaveProperty('id');
      expect(res.body.booking).toHaveProperty('name', 'John Doe');
      expect(res.body.booking).toHaveProperty('partySize', 4);
      expect(res.body.booking).toHaveProperty('status', 'confirmed');
    });

    test('should use default values for missing fields', () => {
      const handler = findHandler(bookingRoutes, '/', 'post');
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.booking.name).toBe('Guest');
      expect(res.body.booking.partySize).toBe(1);
    });

    test('should handle undefined body gracefully', () => {
      const handler = findHandler(bookingRoutes, '/', 'post');
      const req = createMockRequest();
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('listBookings Handler', () => {
    test('should return 200 with bookings list', () => {
      const handler = findHandler(bookingRoutes, '/', 'get');
      const req = createMockRequest();
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('bookings');
      expect(Array.isArray(res.body.bookings)).toBe(true);
      expect(res.body).toHaveProperty('count');
    });
  });

  describe('getBookingDetails Handler', () => {
    test('should return 404 for non-existent booking', () => {
      const handler = findHandler(bookingRoutes, '/:id', 'get');
      const req = createMockRequest({
        params: { id: 'booking_123' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('not found');
    });

    test('should return 400 for missing booking ID', () => {
      const handler = findHandler(bookingRoutes, '/:id', 'get');
      const req = createMockRequest({
        params: { id: '' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('Booking ID is required');
    });
  });

  describe('updateBooking Handler', () => {
    test('should return 200 for valid update', () => {
      const handler = findHandler(bookingRoutes, '/:id', 'put');
      const req = createMockRequest({
        params: { id: 'booking_123' },
        body: {
          date: '2026-01-20',
          time: '20:00',
          partySize: 6,
          name: 'Jane Doe'
        }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Booking updated successfully');
      expect(res.body).toHaveProperty('booking');
      expect(res.body.booking).toHaveProperty('id', 'booking_123');
      expect(res.body.booking).toHaveProperty('partySize', 6);
    });

    test('should return 400 for missing booking ID', () => {
      const handler = findHandler(bookingRoutes, '/:id', 'put');
      const req = createMockRequest({
        params: { id: '' },
        body: { partySize: 4 }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('Booking ID is required');
    });

    test('should use default values for missing update fields', () => {
      const handler = findHandler(bookingRoutes, '/:id', 'put');
      const req = createMockRequest({
        params: { id: 'booking_123' },
        body: {}
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.booking.name).toBe('Guest');
      expect(res.body.booking.partySize).toBe(1);
    });
  });

  describe('cancelBooking Handler', () => {
    test('should return 200 for successful cancellation', () => {
      const handler = findHandler(bookingRoutes, '/:id', 'delete');
      const req = createMockRequest({
        params: { id: 'booking_123' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toContain('cancelled');
    });

    test('should return 400 for missing booking ID', () => {
      const handler = findHandler(bookingRoutes, '/:id', 'delete');
      const req = createMockRequest({
        params: { id: '' }
      });
      const res = createMockResponse();
      
      handler(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('Booking ID is required');
    });
  });
});
