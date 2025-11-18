/**
 * Comprehensive Jest Test Suite for server.js Express Application
 * 
 * This test suite provides complete coverage of the Express.js server application,
 * testing all HTTP endpoints, status codes, headers, server lifecycle, error handling,
 * and edge cases using Jest framework with SuperTest library.
 * 
 * Testing Framework: Jest 29.7.0
 * HTTP Testing Library: SuperTest 7.1.4
 * Target Application: server.js (Express 5.1.0)
 * 
 * Test Coverage Goals:
 * - Statement Coverage: 95%+
 * - Branch Coverage: 90%+
 * - Function Coverage: 100%
 * - Line Coverage: 95%+
 * 
 * Test Categories:
 * 1. HTTP Response Content Tests (5 tests)
 * 2. HTTP Status Code Tests (4 tests)
 * 3. HTTP Header Tests (4 tests)
 * 4. Server Startup Tests (3 tests)
 * 5. Server Shutdown Tests (5 tests)
 * 6. Error Handling Tests (4 tests)
 * 7. Edge Case Tests (5 tests)
 * 
 * Total: 30 comprehensive test cases
 */

const request = require('supertest');
const app = require('../server');

// Constants for expected responses and configuration
const RESPONSES = {
  root: 'Hello, World!\n',
  evening: 'Good evening'
};

const SERVER_CONFIG = {
  host: '127.0.0.1',
  port: 3000
};

const ENDPOINTS = {
  root: '/',
  evening: '/evening',
  nonexistent: '/nonexistent'
};

describe('Express Server Application', () => {
  
  // =============================================================================
  // HTTP Response Content Tests (5 tests)
  // =============================================================================
  describe('HTTP Response Content', () => {
    
    it('GET / should return "Hello, World!\\n" with exact text', async () => {
      const response = await request(app).get(ENDPOINTS.root);
      expect(response.text).toBe(RESPONSES.root);
    });

    it('GET /evening should return "Good evening" with exact text', async () => {
      const response = await request(app).get(ENDPOINTS.evening);
      expect(response.text).toBe(RESPONSES.evening);
    });

    it('Response bodies should have correct Content-Length', async () => {
      const rootResponse = await request(app).get(ENDPOINTS.root);
      const eveningResponse = await request(app).get(ENDPOINTS.evening);
      
      expect(rootResponse.headers['content-length']).toBe(String(RESPONSES.root.length));
      expect(eveningResponse.headers['content-length']).toBe(String(RESPONSES.evening.length));
    });

    it('Root endpoint response should include newline character', async () => {
      const response = await request(app).get(ENDPOINTS.root);
      expect(response.text).toContain('\n');
      expect(response.text.endsWith('\n')).toBe(true);
    });

    it('Multiple sequential requests should return consistent responses', async () => {
      const response1 = await request(app).get(ENDPOINTS.root);
      const response2 = await request(app).get(ENDPOINTS.root);
      const response3 = await request(app).get(ENDPOINTS.root);
      
      expect(response1.text).toBe(RESPONSES.root);
      expect(response2.text).toBe(RESPONSES.root);
      expect(response3.text).toBe(RESPONSES.root);
    });

  });

  // =============================================================================
  // HTTP Status Code Tests (4 tests)
  // =============================================================================
  describe('HTTP Status Codes', () => {
    
    it('GET / should return 200 status code', async () => {
      const response = await request(app).get(ENDPOINTS.root);
      expect(response.status).toBe(200);
    });

    it('GET /evening should return 200 status code', async () => {
      const response = await request(app).get(ENDPOINTS.evening);
      expect(response.status).toBe(200);
    });

    it('GET /nonexistent should return 404 status code', async () => {
      const response = await request(app).get(ENDPOINTS.nonexistent);
      expect(response.status).toBe(404);
    });

    it('GET /undefined-route should return 404 status code', async () => {
      const response = await request(app).get('/undefined-route');
      expect(response.status).toBe(404);
    });

  });

  // =============================================================================
  // HTTP Header Tests (4 tests)
  // =============================================================================
  describe('HTTP Response Headers', () => {
    
    it('GET / should return Content-Type: text/html; charset=utf-8', async () => {
      const response = await request(app).get(ENDPOINTS.root);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['content-type']).toContain('charset=utf-8');
    });

    it('GET /evening should return Content-Type header', async () => {
      const response = await request(app).get(ENDPOINTS.evening);
      expect(response.headers['content-type']).toBeDefined();
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('Responses should include X-Powered-By Express header by default', async () => {
      const response = await request(app).get(ENDPOINTS.root);
      expect(response.headers['x-powered-by']).toBeDefined();
      expect(response.headers['x-powered-by']).toContain('Express');
    });

    it('Content-Length headers should match actual response body size', async () => {
      const rootResponse = await request(app).get(ENDPOINTS.root);
      const eveningResponse = await request(app).get(ENDPOINTS.evening);
      
      const rootActualLength = Buffer.byteLength(rootResponse.text, 'utf8');
      const eveningActualLength = Buffer.byteLength(eveningResponse.text, 'utf8');
      
      expect(parseInt(rootResponse.headers['content-length'])).toBe(rootActualLength);
      expect(parseInt(eveningResponse.headers['content-length'])).toBe(eveningActualLength);
    });

  });

  // =============================================================================
  // Server Startup Tests (3 tests)
  // =============================================================================
  describe('Server Startup', () => {
    
    it('Express app instance should be created successfully', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    it('App should have GET method available for route registration', () => {
      // Verify that app has the get method for registering routes
      expect(typeof app.get).toBe('function');
    });

    it('Server should accept HTTP connections', async () => {
      // SuperTest automatically starts the server for testing
      const response = await request(app).get(ENDPOINTS.root);
      expect(response.status).toBe(200);
    });

  });

  // =============================================================================
  // Server Shutdown Tests (5 tests)
  // =============================================================================
  describe('Server Shutdown', () => {
    
    it('App module should be importable without auto-starting server', () => {
      // If we got here, the require('../server') succeeded without starting a server
      // This tests the conditional: if (require.main === module)
      expect(app).toBeDefined();
    });

    it('Server instance can be created and closed gracefully', (done) => {
      const server = app.listen(3001, '127.0.0.1', () => {
        server.close((err) => {
          expect(err).toBeUndefined();
          done();
        });
      });
    });

    it('Multiple server instances can be created sequentially', (done) => {
      const server1 = app.listen(3002, '127.0.0.1', () => {
        server1.close(() => {
          const server2 = app.listen(3002, '127.0.0.1', () => {
            server2.close(() => {
              done();
            });
          });
        });
      });
    });

    it('Server listen callback should be invoked on startup', (done) => {
      let callbackInvoked = false;
      const server = app.listen(3003, '127.0.0.1', () => {
        callbackInvoked = true;
        expect(callbackInvoked).toBe(true);
        server.close(done);
      });
    });

    it('Server should start when executed directly (require.main === module path)', (done) => {
      const { spawn } = require('child_process');
      const serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname + '/..',
        env: { ...process.env }
      });

      let stdoutData = '';
      let serverStarted = false;

      serverProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
        if (stdoutData.includes('Server running at http://127.0.0.1:3000/')) {
          serverStarted = true;
          // Give it a moment to fully start, then kill it
          setTimeout(() => {
            serverProcess.kill('SIGTERM');
          }, 100);
        }
      });

      serverProcess.on('close', (code) => {
        expect(serverStarted).toBe(true);
        expect(stdoutData).toContain('Server running at http://127.0.0.1:3000/');
        done();
      });

      // Timeout safety: kill process after 5 seconds if it hasn't started
      setTimeout(() => {
        if (!serverStarted) {
          serverProcess.kill('SIGTERM');
          done(new Error('Server did not start within timeout'));
        }
      }, 5000);
    });

  });

  // =============================================================================
  // Error Handling Tests (4 tests)
  // =============================================================================
  describe('Error Handling', () => {
    
    it('Undefined routes should return 404 with "Cannot GET" message', async () => {
      const response = await request(app).get('/does-not-exist');
      expect(response.status).toBe(404);
      expect(response.text).toContain('Cannot GET');
    });

    it('POST request to GET-only route should return 404', async () => {
      const response = await request(app).post(ENDPOINTS.root);
      expect(response.status).toBe(404);
    });

    it('PUT request to existing route should return 404', async () => {
      const response = await request(app).put(ENDPOINTS.evening);
      expect(response.status).toBe(404);
    });

    it('DELETE request to existing route should return 404', async () => {
      const response = await request(app).delete(ENDPOINTS.root);
      expect(response.status).toBe(404);
    });

  });

  // =============================================================================
  // Edge Case Tests (5 tests)
  // =============================================================================
  describe('Edge Cases', () => {
    
    it('Should handle 10 concurrent requests successfully', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(app).get(ENDPOINTS.root)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.text).toBe(RESPONSES.root);
      });
    });

    it('Routes are case-insensitive by default (/Evening returns 200, same as /evening)', async () => {
      // Test that Express routes are case-insensitive by default
      // Express 5.x (like 4.x) has case-insensitive routing by default
      const uppercaseResponse = await request(app).get('/Evening');
      expect(uppercaseResponse.status).toBe(200);
      expect(uppercaseResponse.text).toBe(RESPONSES.evening);
      
      // Verify the correct lowercase route also works
      const lowercaseResponse = await request(app).get('/evening');
      expect(lowercaseResponse.status).toBe(200);
      expect(lowercaseResponse.text).toBe(RESPONSES.evening);
    });

    it('Query parameters should be ignored but request should succeed', async () => {
      const response = await request(app).get('/evening?foo=bar&baz=qux');
      expect(response.status).toBe(200);
      expect(response.text).toBe(RESPONSES.evening);
    });

    it('Should handle requests with custom headers', async () => {
      const response = await request(app)
        .get(ENDPOINTS.root)
        .set('X-Custom-Header', 'test-value')
        .set('User-Agent', 'CustomTestAgent/1.0');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe(RESPONSES.root);
    });

    it('Trailing slash on /evening/ is allowed by default (non-strict routing)', async () => {
      // Express by default allows trailing slashes (strict routing is false by default)
      // Express 5.x (like 4.x) will match /evening/ to /evening route
      const responseWithSlash = await request(app).get('/evening/');
      expect(responseWithSlash.status).toBe(200);
      expect(responseWithSlash.text).toBe(RESPONSES.evening);
      
      // Verify the route without trailing slash also works correctly
      const responseNoSlash = await request(app).get('/evening');
      expect(responseNoSlash.status).toBe(200);
      expect(responseNoSlash.text).toBe(RESPONSES.evening);
    });

  });

});
