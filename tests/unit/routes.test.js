/**
 * @fileoverview Unit tests for route handlers
 * @module tests/unit/routes
 * 
 * Tests route structure and handler functionality for:
 * - main.routes.js (base application routes)
 * - menu.routes.js (menu API routes)
 * - auth.routes.js (authentication API routes)
 */

'use strict';

const mainRoutes = require('../../src/routes/main.routes');
const menuRoutes = require('../../src/routes/menu.routes');
const authRoutes = require('../../src/routes/auth.routes');

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
 * @param {Object} [options.headers] - Request headers
 * @returns {Object} Mock request object
 */
function createMockRequest(options = {}) {
  return {
    params: options.params || {},
    body: options.body || {},
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
