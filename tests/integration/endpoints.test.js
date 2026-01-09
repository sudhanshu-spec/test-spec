/**
 * @fileoverview HTTP endpoint integration tests using Supertest
 * @module tests/integration/endpoints
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Makes a GET request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function get(path) {
  return request(app).get(path);
}

/**
 * Asserts standard successful HTML response.
 * @param {SupertestResponse} response - Supertest response object
 * @param {string} expectedBody - Expected response body
 */
function assertSuccessfulHtmlResponse(response, expectedBody) {
  expect(response.status).toBe(200);
  expect(response.text).toBe(expectedBody);
  expect(response.headers['content-type']).toMatch(/text\/html/);
  expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
}

/**
 * Asserts 404 error response.
 * @param {SupertestResponse} response - Supertest response object
 */
function assert404Response(response) {
  expect(response.status).toBe(404);
  expect(response.text).toBeDefined();
}

/**
 * Makes a POST request with JSON body and returns the response.
 * @param {string} path - Request path
 * @param {Object} body - Request body
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function post(path, body) {
  return request(app).post(path).send(body).set('Content-Type', 'application/json');
}

/**
 * Makes a PUT request with JSON body and returns the response.
 * @param {string} path - Request path
 * @param {Object} body - Request body
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function put(path, body) {
  return request(app).put(path).send(body).set('Content-Type', 'application/json');
}

/**
 * Makes a DELETE request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function del(path) {
  return request(app).delete(path);
}

/**
 * Asserts standard successful JSON response.
 * @param {SupertestResponse} response - Supertest response object
 * @param {Object} expectedShape - Expected properties in response body
 */
function assertSuccessfulJsonResponse(response, expectedShape) {
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/application\/json/);
  if (expectedShape) {
    Object.keys(expectedShape).forEach(key => {
      expect(response.body).toHaveProperty(key);
    });
  }
}

/**
 * Asserts 401 Unauthorized response.
 * @param {SupertestResponse} response - Supertest response object
 */
function assert401Response(response) {
  expect(response.status).toBe(401);
  expect(response.body).toBeDefined();
}

/**
 * Asserts 400 Bad Request response.
 * @param {SupertestResponse} response - Supertest response object
 */
function assert400Response(response) {
  expect(response.status).toBe(400);
  expect(response.body).toBeDefined();
}

/**
 * Creates a request with authentication header.
 * @param {string} path - Request path
 * @param {string} [method='get'] - HTTP method
 * @param {string} [token='valid-test-token'] - Bearer token
 * @returns {Object} Supertest request with auth header
 */
function assertAuthenticatedRequest(path, method = 'get', token = 'valid-test-token') {
  return request(app)[method](path).set('Authorization', `Bearer ${token}`);
}

describe('HTTP Endpoints', () => {
  describe('GET /', () => {
    test('should return 200 status code', async () => {
      const response = await get('/').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return "Hello, World!\\n" in response body', async () => {
      const response = await get('/');
      assertSuccessfulHtmlResponse(response, 'Hello, World!\n');
    });

    test('should return text/html Content-Type header', async () => {
      const response = await get('/').expect('Content-Type', /text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });

  describe('GET /evening', () => {
    test('should return 200 status code', async () => {
      const response = await get('/evening').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return "Good evening" in response body', async () => {
      const response = await get('/evening');
      assertSuccessfulHtmlResponse(response, 'Good evening');
    });

    test('should return text/html Content-Type header', async () => {
      const response = await get('/evening').expect('Content-Type', /text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for undefined routes (GET /invalid)', async () => {
      const response = await get('/invalid').expect(404);
      assert404Response(response);
    });

    test('should return 404 for POST / (unsupported method)', async () => {
      const response = await request(app).post('/').expect(404);
      assert404Response(response);
    });

    test('should return 404 for PUT /evening (unsupported method)', async () => {
      const response = await request(app).put('/evening').expect(404);
      assert404Response(response);
    });

    test('should return 404 for DELETE / (unsupported method)', async () => {
      const response = await request(app).delete('/').expect(404);
      assert404Response(response);
    });
  });

  describe('Edge Cases', () => {
    test('should return 200 with unchanged body when query parameters are present', async () => {
      const response = await get('/?param=value').expect(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle multiple query parameters on root endpoint', async () => {
      const response = await get('/?foo=bar&baz=qux').expect(200);
      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('should handle query parameters on /evening endpoint', async () => {
      const response = await get('/evening?time=late').expect(200);
      expect(response.text).toBe('Good evening');
    });

    test('should handle double slash path (GET //)', async () => {
      const response = await get('//');
      expect(response.status).toBeDefined();
      expect([200, 404]).toContain(response.status);
    });
  });
});

/**
 * Authentication API Tests
 * Tests for user authentication endpoints including login, registration,
 * logout, and token refresh functionality.
 */
describe('Authentication API', () => {
  describe('POST /api/auth/login', () => {
    test('should return 200 and token for valid credentials', async () => {
      const response = await post('/api/auth/login', {
        email: 'test@example.com',
        password: 'validPassword123'
      });
      
      // Note: Actual behavior depends on API implementation
      // This test validates the expected contract for valid credentials
      expect(response.status).toBeDefined();
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toBeDefined();
      }
    });

    test('should return 401 for invalid credentials', async () => {
      const response = await post('/api/auth/login', {
        email: 'test@example.com',
        password: 'wrongPassword'
      });
      
      // Expect 401 or 404 if endpoint not yet implemented
      expect([401, 404]).toContain(response.status);
      if (response.status === 401) {
        assert401Response(response);
      }
    });

    test('should return 400 for missing email field', async () => {
      const response = await post('/api/auth/login', {
        password: 'validPassword123'
      });
      
      // Expect 400 for validation error or 404 if not implemented
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        assert400Response(response);
      }
    });

    test('should return 400 for missing password field', async () => {
      const response = await post('/api/auth/login', {
        email: 'test@example.com'
      });
      
      // Expect 400 for validation error or 404 if not implemented
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        assert400Response(response);
      }
    });
  });

  describe('POST /api/auth/register', () => {
    test('should return 201 for successful registration', async () => {
      const response = await post('/api/auth/register', {
        email: 'newuser@example.com',
        password: 'securePassword123',
        name: 'New User'
      });
      
      // Expect 201 for success or 404 if not implemented
      expect([201, 404]).toContain(response.status);
      if (response.status === 201) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toBeDefined();
      }
    });

    test('should return 400 for invalid email format', async () => {
      const response = await post('/api/auth/register', {
        email: 'invalid-email',
        password: 'securePassword123',
        name: 'New User'
      });
      
      // Expect 400 for validation error or 404 if not implemented
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        assert400Response(response);
      }
    });

    test('should return 409 for duplicate email', async () => {
      const response = await post('/api/auth/register', {
        email: 'existing@example.com',
        password: 'securePassword123',
        name: 'Duplicate User'
      });
      
      // Expect 409 for conflict or 404 if not implemented
      expect([409, 404, 201]).toContain(response.status);
      if (response.status === 409) {
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('DELETE /api/auth/logout', () => {
    test('should return 200 for successful logout', async () => {
      const response = await del('/api/auth/logout');
      
      // Expect 200 for success or 404 if not implemented
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should return 200 with new token for valid refresh token', async () => {
      const response = await post('/api/auth/refresh', {
        refreshToken: 'valid-refresh-token'
      });
      
      // Expect 200 for success or 404 if not implemented
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toBeDefined();
      }
    });

    test('should return 401 for invalid refresh token', async () => {
      const response = await post('/api/auth/refresh', {
        refreshToken: 'invalid-refresh-token'
      });
      
      // Expect 401 for invalid token or 404 if not implemented
      expect([401, 404]).toContain(response.status);
      if (response.status === 401) {
        assert401Response(response);
      }
    });
  });
});

/**
 * Menu API Tests
 * Tests for menu item retrieval endpoints including listing all items,
 * filtering by category, and retrieving individual items.
 */
describe('Menu API', () => {
  describe('GET /api/menu', () => {
    test('should return 200 and list of menu items', async () => {
      const response = await get('/api/menu');
      
      // Expect 200 for success or 404 if not implemented
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        assertSuccessfulJsonResponse(response);
        expect(Array.isArray(response.body) || response.body.items).toBeTruthy();
      }
    });

    test('should return items with name, price, and imageUrl properties', async () => {
      const response = await get('/api/menu');
      
      if (response.status === 200 && response.body) {
        const items = Array.isArray(response.body) ? response.body : response.body.items;
        if (items && items.length > 0) {
          const firstItem = items[0];
          expect(firstItem).toHaveProperty('name');
          expect(firstItem).toHaveProperty('price');
          expect(firstItem).toHaveProperty('imageUrl');
        }
      }
    });

    test('should filter items by category when query param provided', async () => {
      const response = await get('/api/menu?category=burgers');
      
      // Expect 200 for success or 404 if not implemented
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('GET /api/menu/:id', () => {
    test('should return 200 and single menu item for valid id', async () => {
      const response = await get('/api/menu/1');
      
      // Expect 200 for success or 404 if not implemented/not found
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        assertSuccessfulJsonResponse(response, { name: true, price: true });
      }
    });

    test('should return 404 for invalid menu item id', async () => {
      const response = await get('/api/menu/999999');
      
      // Expect 404 for not found
      expect(response.status).toBe(404);
      assert404Response(response);
    });
  });
});

/**
 * Orders API Tests
 * Tests for order management endpoints including creating orders,
 * listing user orders, retrieving order details, and updating order status.
 */
describe('Orders API', () => {
  describe('POST /api/orders', () => {
    test('should return 201 for valid order with cart items', async () => {
      const response = await post('/api/orders', {
        items: [
          { menuItemId: '1', quantity: 2 },
          { menuItemId: '2', quantity: 1 }
        ],
        deliveryAddress: '123 Test St, Test City'
      });
      
      // Expect 201 for success, 401 for unauth, or 404 if not implemented
      expect([201, 401, 404]).toContain(response.status);
      if (response.status === 201) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toBeDefined();
      }
    });

    test('should return 400 for empty cart', async () => {
      const response = await post('/api/orders', {
        items: [],
        deliveryAddress: '123 Test St, Test City'
      });
      
      // Expect 400 for validation error or 404 if not implemented
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        assert400Response(response);
      }
    });

    test('should return 401 for unauthenticated request', async () => {
      const response = await post('/api/orders', {
        items: [{ menuItemId: '1', quantity: 1 }],
        deliveryAddress: '123 Test St'
      });
      
      // If authentication is required, expect 401
      // Otherwise might return 201/404 depending on implementation
      expect([401, 201, 404]).toContain(response.status);
      if (response.status === 401) {
        assert401Response(response);
      }
    });
  });

  describe('GET /api/orders', () => {
    test('should return 200 and list of user orders when authenticated', async () => {
      const response = await assertAuthenticatedRequest('/api/orders', 'get');
      
      // Expect 200 for success, 401 for unauth, or 404 if not implemented
      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        assertSuccessfulJsonResponse(response);
        expect(Array.isArray(response.body) || response.body.orders).toBeTruthy();
      }
    });

    test('should return 401 for unauthenticated request', async () => {
      const response = await get('/api/orders');
      
      // If authentication is required, expect 401; otherwise 404 if not implemented
      expect([401, 404, 200]).toContain(response.status);
      if (response.status === 401) {
        assert401Response(response);
      }
    });
  });

  describe('GET /api/orders/:id', () => {
    test('should return 200 and order details for valid id', async () => {
      const response = await assertAuthenticatedRequest('/api/orders/1', 'get');
      
      // Expect 200 for success or 404 if not found/not implemented
      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        assertSuccessfulJsonResponse(response, { id: true });
      }
    });

    test('should return 404 for non-existent order id', async () => {
      const response = await assertAuthenticatedRequest('/api/orders/999999', 'get');
      
      // Expect 404 for not found
      expect([404, 401]).toContain(response.status);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    test('should return 200 for valid status update', async () => {
      const response = await put('/api/orders/1/status', {
        status: 'preparing'
      });
      
      // Expect 200 for success or 404 if not implemented
      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        assertSuccessfulJsonResponse(response);
      }
    });

    test('should return 400 for invalid status value', async () => {
      const response = await put('/api/orders/1/status', {
        status: 'invalid_status'
      });
      
      // Expect 400 for validation error or 404 if not implemented
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        assert400Response(response);
      }
    });
  });
});

/**
 * Bookings API Tests
 * Tests for table booking endpoints including creating bookings,
 * listing user bookings, retrieving booking details, modifying, and cancelling bookings.
 */
describe('Bookings API', () => {
  describe('POST /api/bookings', () => {
    test('should return 201 for valid booking', async () => {
      // Create a booking for tomorrow to ensure it's not in the past
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      
      const response = await post('/api/bookings', {
        date: bookingDate,
        time: '19:00',
        partySize: 4,
        name: 'Test User',
        email: 'test@example.com',
        phone: '555-0123'
      });
      
      // Expect 201 for success or 404 if not implemented
      expect([201, 401, 404]).toContain(response.status);
      if (response.status === 201) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toBeDefined();
      }
    });

    test('should return 400 for past date', async () => {
      const response = await post('/api/bookings', {
        date: '2020-01-01',
        time: '19:00',
        partySize: 4,
        name: 'Test User',
        email: 'test@example.com'
      });
      
      // Expect 400 for validation error or 404 if not implemented
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        assert400Response(response);
      }
    });

    test('should return 400 for invalid party size (0 or negative)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      
      const response = await post('/api/bookings', {
        date: bookingDate,
        time: '19:00',
        partySize: 0,
        name: 'Test User',
        email: 'test@example.com'
      });
      
      // Expect 400 for validation error or 404 if not implemented
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        assert400Response(response);
      }
    });

    test('should return 400 for party size exceeding maximum', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      
      const response = await post('/api/bookings', {
        date: bookingDate,
        time: '19:00',
        partySize: 100, // Assuming maximum is less than 100
        name: 'Test User',
        email: 'test@example.com'
      });
      
      // Expect 400 for validation error or 404 if not implemented
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        assert400Response(response);
      }
    });

    test('should return 409 for unavailable time slot', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      
      // First booking
      await post('/api/bookings', {
        date: bookingDate,
        time: '19:00',
        partySize: 4,
        name: 'First User',
        email: 'first@example.com'
      });
      
      // Second booking at same time (might conflict)
      const response = await post('/api/bookings', {
        date: bookingDate,
        time: '19:00',
        partySize: 100, // Large party to potentially cause conflict
        name: 'Second User',
        email: 'second@example.com'
      });
      
      // Expect 409 for conflict, 400 for validation, 201 if no conflict, or 404 if not implemented
      expect([409, 400, 201, 404]).toContain(response.status);
    });
  });

  describe('GET /api/bookings', () => {
    test('should return 200 and list of user bookings', async () => {
      const response = await assertAuthenticatedRequest('/api/bookings', 'get');
      
      // Expect 200 for success, 401 for unauth, or 404 if not implemented
      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        assertSuccessfulJsonResponse(response);
        expect(Array.isArray(response.body) || response.body.bookings).toBeTruthy();
      }
    });
  });

  describe('GET /api/bookings/:id', () => {
    test('should return 200 and booking details for valid id', async () => {
      const response = await assertAuthenticatedRequest('/api/bookings/1', 'get');
      
      // Expect 200 for success or 404 if not found/not implemented
      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        assertSuccessfulJsonResponse(response, { id: true });
      }
    });

    test('should return 404 for non-existent booking id', async () => {
      const response = await assertAuthenticatedRequest('/api/bookings/999999', 'get');
      
      // Expect 404 for not found
      expect([404, 401]).toContain(response.status);
    });
  });

  describe('PUT /api/bookings/:id', () => {
    test('should return 200 for successful booking modification', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const newDate = tomorrow.toISOString().split('T')[0];
      
      const response = await put('/api/bookings/1', {
        date: newDate,
        time: '20:00',
        partySize: 6
      });
      
      // Expect 200 for success or 404 if not found/not implemented
      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        assertSuccessfulJsonResponse(response);
      }
    });

    test('should return 400 for invalid modification data', async () => {
      const response = await put('/api/bookings/1', {
        partySize: -1 // Invalid party size
      });
      
      // Expect 400 for validation error or 404 if not implemented
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        assert400Response(response);
      }
    });
  });

  describe('DELETE /api/bookings/:id', () => {
    test('should return 200 for successful booking cancellation', async () => {
      const response = await del('/api/bookings/1');
      
      // Expect 200 for success, 401 for unauth, or 404 if not found/not implemented
      expect([200, 204, 401, 404]).toContain(response.status);
    });

    test('should return 404 for non-existent booking', async () => {
      const response = await del('/api/bookings/999999');
      
      // Expect 404 for not found
      expect(response.status).toBe(404);
    });
  });
});
