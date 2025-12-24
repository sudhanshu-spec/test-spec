'use strict';

/**
 * Unit Tests for Main Routes Module
 * 
 * This module provides comprehensive unit tests for the route handlers
 * defined in src/routes/main.routes.js. Tests validate isolated handler
 * function behavior using mocked Express request/response objects.
 * 
 * Route Contracts Tested:
 * - GET '/' responds with 'Hello, World!\n' (14 characters with trailing newline)
 * - GET '/evening' responds with 'Good evening' (12 characters, no trailing newline)
 * 
 * @module tests/unit/routes.test
 * @see Section 0.5.2 - Unit tests for route handlers
 * @see Section 0.10.4 - Response Validation Rules
 */

const router = require('../../src/routes/main.routes');

describe('main.routes (src/routes/main.routes.js)', () => {
  // ============================================================================
  // Router Instance Tests
  // ============================================================================

  describe('router instance', () => {
    test('should export an Express Router (function)', () => {
      // Express Router is a function with middleware signature
      expect(typeof router).toBe('function');
    });

    test('should have router stack property', () => {
      // Express Router stores route handlers in a stack array
      expect(router).toHaveProperty('stack');
      expect(Array.isArray(router.stack)).toBe(true);
    });

    test('should have registered routes in stack', () => {
      // Stack should contain registered route handlers
      expect(router.stack.length).toBeGreaterThan(0);
    });

    test('should have exactly two routes registered', () => {
      // We expect exactly GET '/' and GET '/evening' routes
      const routeCount = router.stack.filter(
        (layer) => layer.route !== undefined
      ).length;
      expect(routeCount).toBe(2);
    });

    test('should have route method for adding handlers', () => {
      // Router should have standard Express Router methods
      expect(typeof router.get).toBe('function');
      expect(typeof router.use).toBe('function');
    });
  });

  // ============================================================================
  // Route Registration Tests
  // ============================================================================

  describe('route registration', () => {
    test('should have GET route at "/" path', () => {
      const rootRoute = router.stack.find(
        (layer) => layer.route && layer.route.path === '/'
      );
      expect(rootRoute).toBeDefined();
      expect(rootRoute.route.methods.get).toBe(true);
    });

    test('should have GET route at "/evening" path', () => {
      const eveningRoute = router.stack.find(
        (layer) => layer.route && layer.route.path === '/evening'
      );
      expect(eveningRoute).toBeDefined();
      expect(eveningRoute.route.methods.get).toBe(true);
    });

    test('should NOT have POST methods on defined routes', () => {
      router.stack.forEach((layer) => {
        if (layer.route) {
          expect(layer.route.methods.post).toBeFalsy();
        }
      });
    });

    test('should NOT have PUT methods on defined routes', () => {
      router.stack.forEach((layer) => {
        if (layer.route) {
          expect(layer.route.methods.put).toBeFalsy();
        }
      });
    });

    test('should NOT have DELETE methods on defined routes', () => {
      router.stack.forEach((layer) => {
        if (layer.route) {
          expect(layer.route.methods.delete).toBeFalsy();
        }
      });
    });
  });

  // ============================================================================
  // GET "/" Handler Tests
  // ============================================================================

  describe('GET "/" handler', () => {
    /**
     * Extract the handler function for GET "/" route from router stack
     * @returns {Function} The route handler function
     */
    const getRootHandler = () => {
      const rootRoute = router.stack.find(
        (layer) => layer.route && layer.route.path === '/'
      );
      return rootRoute.route.stack[0].handle;
    };

    test('should call res.send with "Hello, World!\\n"', () => {
      // Arrange - Create mock request and response objects
      const mockReq = {};
      const mockRes = {
        send: jest.fn()
      };
      const handler = getRootHandler();

      // Act - Execute the handler
      handler(mockReq, mockRes);

      // Assert - Verify exact response string per Section 0.10.4
      expect(mockRes.send).toHaveBeenCalledWith('Hello, World!\n');
    });

    test('should call res.send exactly once', () => {
      const mockReq = {};
      const mockRes = { send: jest.fn() };
      const handler = getRootHandler();

      handler(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledTimes(1);
    });

    test('should include trailing newline in response (14 characters)', () => {
      const mockReq = {};
      let capturedResponse = null;
      const mockRes = {
        send: jest.fn((text) => {
          capturedResponse = text;
        })
      };
      const handler = getRootHandler();

      handler(mockReq, mockRes);

      // Response should be exactly 14 characters
      expect(capturedResponse).toHaveLength(14);
      // Last character should be newline
      expect(capturedResponse.endsWith('\n')).toBe(true);
    });

    test('should not throw any exceptions', () => {
      const mockReq = {};
      const mockRes = { send: jest.fn() };
      const handler = getRootHandler();

      // Handler should not throw
      expect(() => {
        handler(mockReq, mockRes);
      }).not.toThrow();
    });

    test('should handle request without any additional processing', () => {
      // The handler should be a simple synchronous response
      const mockReq = { headers: {}, query: {} };
      const mockRes = { send: jest.fn() };
      const handler = getRootHandler();

      handler(mockReq, mockRes);

      // Verify it doesn't require or use request data
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GET "/evening" Handler Tests
  // ============================================================================

  describe('GET "/evening" handler', () => {
    /**
     * Extract the handler function for GET "/evening" route from router stack
     * @returns {Function} The route handler function
     */
    const getEveningHandler = () => {
      const eveningRoute = router.stack.find(
        (layer) => layer.route && layer.route.path === '/evening'
      );
      return eveningRoute.route.stack[0].handle;
    };

    test('should call res.send with "Good evening"', () => {
      // Arrange - Create mock request and response objects
      const mockReq = {};
      const mockRes = {
        send: jest.fn()
      };
      const handler = getEveningHandler();

      // Act - Execute the handler
      handler(mockReq, mockRes);

      // Assert - Verify exact response string per Section 0.10.4
      expect(mockRes.send).toHaveBeenCalledWith('Good evening');
    });

    test('should call res.send exactly once', () => {
      const mockReq = {};
      const mockRes = { send: jest.fn() };
      const handler = getEveningHandler();

      handler(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledTimes(1);
    });

    test('should NOT have trailing newline in response (12 characters)', () => {
      const mockReq = {};
      let capturedResponse = null;
      const mockRes = {
        send: jest.fn((text) => {
          capturedResponse = text;
        })
      };
      const handler = getEveningHandler();

      handler(mockReq, mockRes);

      // Response should be exactly 12 characters
      expect(capturedResponse).toHaveLength(12);
      // Last character should NOT be newline
      expect(capturedResponse.endsWith('\n')).toBe(false);
    });

    test('should not throw any exceptions', () => {
      const mockReq = {};
      const mockRes = { send: jest.fn() };
      const handler = getEveningHandler();

      // Handler should not throw
      expect(() => {
        handler(mockReq, mockRes);
      }).not.toThrow();
    });

    test('should handle request without any additional processing', () => {
      // The handler should be a simple synchronous response
      const mockReq = { headers: {}, query: {} };
      const mockRes = { send: jest.fn() };
      const handler = getEveningHandler();

      handler(mockReq, mockRes);

      // Verify it doesn't require or use request data
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Response String Exact Match Tests
  // ============================================================================

  describe('response string exact matching', () => {
    test('root response should differ from evening response', () => {
      const mockReq = {};
      let rootResponse = null;
      let eveningResponse = null;

      const mockResRoot = {
        send: jest.fn((text) => {
          rootResponse = text;
        })
      };
      const mockResEvening = {
        send: jest.fn((text) => {
          eveningResponse = text;
        })
      };

      // Get handlers
      const rootHandler = router.stack.find(
        (layer) => layer.route && layer.route.path === '/'
      ).route.stack[0].handle;

      const eveningHandler = router.stack.find(
        (layer) => layer.route && layer.route.path === '/evening'
      ).route.stack[0].handle;

      // Execute handlers
      rootHandler(mockReq, mockResRoot);
      eveningHandler(mockReq, mockResEvening);

      // Responses should be different
      expect(rootResponse).not.toBe(eveningResponse);
    });

    test('root response should be exactly "Hello, World!\\n"', () => {
      const mockReq = {};
      const mockRes = { send: jest.fn() };

      const rootHandler = router.stack.find(
        (layer) => layer.route && layer.route.path === '/'
      ).route.stack[0].handle;

      rootHandler(mockReq, mockRes);

      // Strict equality check
      expect(mockRes.send).toHaveBeenCalledWith('Hello, World!\n');
      expect(mockRes.send.mock.calls[0][0]).toBe('Hello, World!\n');
    });

    test('evening response should be exactly "Good evening"', () => {
      const mockReq = {};
      const mockRes = { send: jest.fn() };

      const eveningHandler = router.stack.find(
        (layer) => layer.route && layer.route.path === '/evening'
      ).route.stack[0].handle;

      eveningHandler(mockReq, mockRes);

      // Strict equality check
      expect(mockRes.send).toHaveBeenCalledWith('Good evening');
      expect(mockRes.send.mock.calls[0][0]).toBe('Good evening');
    });
  });

  // ============================================================================
  // Handler Isolation Tests
  // ============================================================================

  describe('handler isolation', () => {
    test('handlers should not modify request object', () => {
      const mockReq = { testProperty: 'original' };
      const mockRes = { send: jest.fn() };

      const rootHandler = router.stack.find(
        (layer) => layer.route && layer.route.path === '/'
      ).route.stack[0].handle;

      const eveningHandler = router.stack.find(
        (layer) => layer.route && layer.route.path === '/evening'
      ).route.stack[0].handle;

      rootHandler(mockReq, mockRes);
      eveningHandler(mockReq, mockRes);

      // Request object should remain unchanged
      expect(mockReq.testProperty).toBe('original');
    });

    test('handlers should be independent of each other', () => {
      const mockRes1 = { send: jest.fn() };
      const mockRes2 = { send: jest.fn() };

      const rootHandler = router.stack.find(
        (layer) => layer.route && layer.route.path === '/'
      ).route.stack[0].handle;

      const eveningHandler = router.stack.find(
        (layer) => layer.route && layer.route.path === '/evening'
      ).route.stack[0].handle;

      // Execute handlers multiple times
      rootHandler({}, mockRes1);
      rootHandler({}, mockRes1);
      eveningHandler({}, mockRes2);
      eveningHandler({}, mockRes2);

      // Each handler should have been called twice
      expect(mockRes1.send).toHaveBeenCalledTimes(2);
      expect(mockRes2.send).toHaveBeenCalledTimes(2);
    });
  });
});
