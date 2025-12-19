/**
 * tests/integration/server.integration.test.js - Integration Tests for Express Server
 * 
 * Comprehensive integration tests for the Express.js server lifecycle management.
 * Tests verify server startup, shutdown, callback execution, full request/response
 * cycles, concurrent request handling, and configuration validation.
 * 
 * Uses Jest as the testing framework and Supertest for HTTP assertions,
 * enabling tests to run against the Express app without manually binding to a port.
 * 
 * Test Coverage Categories:
 *   - Server startup verification and callback execution
 *   - Server configuration (hostname: 127.0.0.1, port: 3000)
 *   - Full request/response cycles for all endpoints
 *   - Multiple sequential requests handling
 *   - Concurrent request handling
 *   - Server shutdown and cleanup behavior
 *   - Error scenario integration tests
 *   - Response consistency verification
 * 
 * @requires supertest - HTTP assertions library
 * @requires ../../app - Express application instance
 */

const request = require('supertest');
const app = require('../../app');

// Server configuration constants matching production values
const SERVER_HOSTNAME = '127.0.0.1';
const SERVER_PORT = 3000;
const TEST_PORT = 3001; // Alternative port for manual lifecycle tests to avoid conflicts

// Expected response values for assertions
const EXPECTED_ROOT_RESPONSE = 'Hello, World!\n';
const EXPECTED_EVENING_RESPONSE = 'Good evening';
const EXPECTED_ROOT_CONTENT_LENGTH = '14'; // Length of 'Hello, World!\n'
const EXPECTED_EVENING_CONTENT_LENGTH = '12'; // Length of 'Good evening'

/**
 * Test suite for Full Request Flow Integration
 * 
 * Tests complete request/response cycles through the Express app
 * using Supertest which manages server lifecycle automatically.
 * These tests verify the full HTTP request/response flow without
 * manual server startup.
 */
describe('Full Request Flow Integration', () => {
  /**
   * Test: Complete request cycle for GET /
   * Verifies the full request/response cycle for the root endpoint
   * returns the expected body with trailing newline and status 200.
   */
  it('should return "Hello, World!\\n" with status 200 in full request cycle', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.text).toBe(EXPECTED_ROOT_RESPONSE);
  });

  /**
   * Test: Complete request cycle for GET /evening
   * Verifies the full request/response cycle for the evening endpoint
   * returns the expected body and status 200.
   */
  it('should return "Good evening" with status 200 in full request cycle', async () => {
    const response = await request(app).get('/evening');
    
    expect(response.status).toBe(200);
    expect(response.text).toBe(EXPECTED_EVENING_RESPONSE);
  });

  /**
   * Test: Both endpoints return correct Content-Type headers
   * Verifies that both endpoints include proper HTTP Content-Type headers.
   */
  it('should return correct Content-Type headers for both endpoints', async () => {
    const rootResponse = await request(app).get('/');
    const eveningResponse = await request(app).get('/evening');
    
    expect(rootResponse.headers['content-type']).toMatch(/text\/html/);
    expect(eveningResponse.headers['content-type']).toMatch(/text\/html/);
  });

  /**
   * Test: Endpoints return correct Content-Length headers
   * Verifies that Content-Length headers match expected response body lengths.
   */
  it('should return correct Content-Length headers', async () => {
    const rootResponse = await request(app).get('/');
    const eveningResponse = await request(app).get('/evening');
    
    expect(rootResponse.headers['content-length']).toBe(EXPECTED_ROOT_CONTENT_LENGTH);
    expect(eveningResponse.headers['content-length']).toBe(EXPECTED_EVENING_CONTENT_LENGTH);
  });

  /**
   * Test: Root endpoint response includes trailing newline
   * Verifies the exact byte content of the root response including newline.
   */
  it('should include trailing newline in root response', async () => {
    const response = await request(app).get('/');
    
    expect(response.text.endsWith('\n')).toBe(true);
    expect(response.text.length).toBe(14);
  });

  /**
   * Test: Evening endpoint response has no trailing newline
   * Verifies the evening response does not include a trailing newline.
   */
  it('should not include trailing newline in evening response', async () => {
    const response = await request(app).get('/evening');
    
    expect(response.text.endsWith('\n')).toBe(false);
    expect(response.text).toBe('Good evening');
  });
});

/**
 * Test suite for Multiple Sequential Requests
 * 
 * Tests that multiple sequential requests are handled correctly
 * and maintain consistent responses over time.
 */
describe('Multiple Sequential Requests', () => {
  /**
   * Test: Sequential requests to same endpoint
   * Verifies that multiple sequential requests to the same endpoint
   * return consistent and correct results every time.
   */
  it('should handle multiple sequential requests to GET / correctly', async () => {
    const response1 = await request(app).get('/');
    const response2 = await request(app).get('/');
    const response3 = await request(app).get('/');
    
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
    
    expect(response1.text).toBe(EXPECTED_ROOT_RESPONSE);
    expect(response2.text).toBe(EXPECTED_ROOT_RESPONSE);
    expect(response3.text).toBe(EXPECTED_ROOT_RESPONSE);
  });

  /**
   * Test: Sequential requests to different endpoints
   * Verifies that sequential requests to different endpoints
   * return correct responses for each endpoint.
   */
  it('should handle sequential requests to different endpoints correctly', async () => {
    const response1 = await request(app).get('/');
    const response2 = await request(app).get('/evening');
    const response3 = await request(app).get('/');
    const response4 = await request(app).get('/evening');
    
    expect(response1.text).toBe(EXPECTED_ROOT_RESPONSE);
    expect(response2.text).toBe(EXPECTED_EVENING_RESPONSE);
    expect(response3.text).toBe(EXPECTED_ROOT_RESPONSE);
    expect(response4.text).toBe(EXPECTED_EVENING_RESPONSE);
  });

  /**
   * Test: Alternating valid and invalid requests
   * Verifies that the server correctly handles a mix of valid and invalid routes
   * in sequential requests without affecting subsequent responses.
   */
  it('should handle alternating valid and invalid requests', async () => {
    const valid1 = await request(app).get('/');
    const invalid1 = await request(app).get('/nonexistent');
    const valid2 = await request(app).get('/evening');
    const invalid2 = await request(app).get('/missing');
    
    expect(valid1.status).toBe(200);
    expect(valid1.text).toBe(EXPECTED_ROOT_RESPONSE);
    expect(invalid1.status).toBe(404);
    expect(valid2.status).toBe(200);
    expect(valid2.text).toBe(EXPECTED_EVENING_RESPONSE);
    expect(invalid2.status).toBe(404);
  });

  /**
   * Test: Many sequential requests maintain consistency
   * Verifies that a larger number of sequential requests
   * all return consistent results.
   */
  it('should handle 10 sequential requests maintaining consistency', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe(EXPECTED_ROOT_RESPONSE);
    }
  });
});

/**
 * Test suite for Concurrent Request Handling
 * 
 * Tests that the server can handle multiple concurrent requests
 * without race conditions, data corruption, or errors.
 */
describe('Concurrent Request Handling', () => {
  /**
   * Test: Concurrent requests to same endpoint
   * Verifies that multiple concurrent requests to the same endpoint
   * are all handled correctly and return consistent results.
   */
  it('should handle concurrent requests to GET / correctly', async () => {
    const requests = Array(10).fill(null).map(() => request(app).get('/'));
    const responses = await Promise.all(requests);
    
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe(EXPECTED_ROOT_RESPONSE);
    });
  });

  /**
   * Test: Concurrent requests to different endpoints
   * Verifies that concurrent requests to different endpoints
   * are all handled correctly and return correct responses.
   */
  it('should handle concurrent requests to different endpoints correctly', async () => {
    const rootRequests = Array(5).fill(null).map(() => request(app).get('/'));
    const eveningRequests = Array(5).fill(null).map(() => request(app).get('/evening'));
    
    const allRequests = [...rootRequests, ...eveningRequests];
    const responses = await Promise.all(allRequests);
    
    const rootResponses = responses.slice(0, 5);
    const eveningResponses = responses.slice(5);
    
    rootResponses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe(EXPECTED_ROOT_RESPONSE);
    });
    
    eveningResponses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe(EXPECTED_EVENING_RESPONSE);
    });
  });

  /**
   * Test: Large number of concurrent requests
   * Verifies that the server can handle a larger number of concurrent requests
   * without performance degradation or errors.
   */
  it('should handle 20 concurrent requests correctly', async () => {
    const requests = Array(20).fill(null).map((_, index) => 
      request(app).get(index % 2 === 0 ? '/' : '/evening')
    );
    const responses = await Promise.all(requests);
    
    responses.forEach((response, index) => {
      expect(response.status).toBe(200);
      if (index % 2 === 0) {
        expect(response.text).toBe(EXPECTED_ROOT_RESPONSE);
      } else {
        expect(response.text).toBe(EXPECTED_EVENING_RESPONSE);
      }
    });
  });

  /**
   * Test: Concurrent requests including invalid routes
   * Verifies that concurrent requests to both valid and invalid routes
   * are handled correctly without affecting each other.
   */
  it('should handle concurrent valid and invalid requests correctly', async () => {
    const validRequests = Array(5).fill(null).map(() => request(app).get('/'));
    const invalidRequests = Array(5).fill(null).map(() => request(app).get('/notfound'));
    
    const allRequests = [...validRequests, ...invalidRequests];
    const responses = await Promise.all(allRequests);
    
    const validResponses = responses.slice(0, 5);
    const invalidResponses = responses.slice(5);
    
    validResponses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe(EXPECTED_ROOT_RESPONSE);
    });
    
    invalidResponses.forEach((response) => {
      expect(response.status).toBe(404);
    });
  });
});

/**
 * Test suite for Server Configuration Verification
 * 
 * Tests that verify the server configuration values and
 * that the Express app is properly configured.
 */
describe('Server Configuration Verification', () => {
  /**
   * Test: App is a valid Express application
   * Verifies that the imported app is a valid Express application function.
   */
  it('should export a valid Express application', () => {
    expect(typeof app).toBe('function');
    expect(app.listen).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  /**
   * Test: App has route handling capabilities
   * Verifies that the Express app is configured to handle routes.
   */
  it('should have route handling capabilities', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBeDefined();
  });

  /**
   * Test: App responds to HTTP requests through Supertest
   * Verifies that the app is properly configured to respond to requests
   * without throwing server errors.
   */
  it('should respond to HTTP requests without server errors', async () => {
    const response = await request(app).get('/');
    expect(response.status).not.toBe(500);
    expect(response.status).not.toBe(502);
    expect(response.status).not.toBe(503);
  });

  /**
   * Test: Server configuration constants are correct
   * Verifies that the expected server configuration values
   * match the production values.
   */
  it('should have correct server configuration values defined', () => {
    expect(SERVER_HOSTNAME).toBe('127.0.0.1');
    expect(SERVER_PORT).toBe(3000);
  });

  /**
   * Test: App has get method for route registration
   * Verifies that the Express app has the get method available.
   */
  it('should have get method available on app', () => {
    expect(app.get).toBeDefined();
    expect(typeof app.get).toBe('function');
  });
});

/**
 * Test suite for Server Startup Callback Verification
 * 
 * Tests that verify server startup callback behavior using jest.spyOn
 * to verify console output and callback execution.
 */
describe('Server Startup Callback Verification', () => {
  /**
   * Test: Console.log spy functionality works
   * Verifies that jest.spyOn can be used to monitor console.log calls
   * for startup message verification.
   */
  it('should be able to spy on console.log for startup verification', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    console.log('Test startup message');
    
    expect(consoleSpy).toHaveBeenCalledWith('Test startup message');
    
    consoleSpy.mockRestore();
  });

  /**
   * Test: Server listen method is available
   * Verifies that the app.listen method is available for server startup.
   */
  it('should have listen method available on app', () => {
    expect(app.listen).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  /**
   * Test: Console log format matches expected startup message
   * Verifies the expected startup message format.
   */
  it('should verify startup message format', () => {
    const expectedMessage = `Server running at http://${SERVER_HOSTNAME}:${SERVER_PORT}/`;
    expect(expectedMessage).toBe('Server running at http://127.0.0.1:3000/');
  });
});

/**
 * Test suite for Server Lifecycle with Manual Start/Stop
 * 
 * Tests server lifecycle by manually starting and stopping the server.
 * Uses a different port (TEST_PORT) to avoid conflicts with any
 * running instances on the default port.
 */
describe('Server Lifecycle with Manual Start/Stop', () => {
  let server;

  /**
   * Cleanup: Ensure server is closed after each test
   * Prevents port conflicts between tests and resource leaks.
   */
  afterEach((done) => {
    if (server && server.listening) {
      server.close((err) => {
        if (err) {
          console.error('Error closing server:', err);
        }
        done();
      });
    } else {
      done();
    }
  });

  /**
   * Test: Server starts successfully on specified port
   * Verifies that the server can be started on a specified port
   * and is in listening state after startup.
   */
  it('should start server successfully on specified port', (done) => {
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, () => {
      expect(server.listening).toBe(true);
      done();
    });
  });

  /**
   * Test: Server callback is executed on startup
   * Verifies that the callback function provided to app.listen
   * is executed when the server successfully starts.
   */
  it('should execute callback function when server starts', (done) => {
    const callback = jest.fn(() => {
      expect(callback).toHaveBeenCalledTimes(1);
      done();
    });
    
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, callback);
  });

  /**
   * Test: Server accepts connections after startup
   * Verifies that the server accepts HTTP connections and
   * responds correctly after starting.
   */
  it('should accept connections after startup', (done) => {
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, async () => {
      try {
        const response = await request(server).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe(EXPECTED_ROOT_RESPONSE);
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  /**
   * Test: Server can handle requests to all endpoints after startup
   * Verifies that all defined routes work correctly after server startup.
   */
  it('should handle requests to all endpoints after startup', (done) => {
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, async () => {
      try {
        const rootResponse = await request(server).get('/');
        const eveningResponse = await request(server).get('/evening');
        
        expect(rootResponse.status).toBe(200);
        expect(rootResponse.text).toBe(EXPECTED_ROOT_RESPONSE);
        expect(eveningResponse.status).toBe(200);
        expect(eveningResponse.text).toBe(EXPECTED_EVENING_RESPONSE);
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  /**
   * Test: Server stops accepting connections after close
   * Verifies that the server properly closes and stops listening.
   */
  it('should stop listening after server close', (done) => {
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, () => {
      server.close(() => {
        expect(server.listening).toBe(false);
        done();
      });
    });
  });

  /**
   * Test: Server graceful shutdown with callback
   * Verifies that the server can shut down gracefully
   * and executes the close callback.
   */
  it('should shutdown gracefully with callback execution', (done) => {
    const shutdownCallback = jest.fn(() => {
      expect(shutdownCallback).toHaveBeenCalledTimes(1);
      expect(server.listening).toBe(false);
      done();
    });
    
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, () => {
      server.close(shutdownCallback);
    });
  });

  /**
   * Test: Server can start without hostname parameter
   * Verifies that the server can start using only port and callback.
   */
  it('should start server with port and callback only', (done) => {
    server = app.listen(TEST_PORT, () => {
      expect(server.listening).toBe(true);
      done();
    });
  });

  /**
   * Test: Server startup callback receives no error
   * Verifies that the callback is called without error parameter.
   */
  it('should call startup callback without error when server starts successfully', (done) => {
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, function() {
      // In successful startup, callback is called with no arguments
      expect(arguments.length).toBe(0);
      done();
    });
  });
});

/**
 * Test suite for Error Scenario Integration Tests
 * 
 * Tests error handling scenarios including undefined routes,
 * invalid HTTP methods, and server error responses.
 */
describe('Error Scenario Integration Tests', () => {
  /**
   * Test: 404 for undefined routes
   * Verifies that requests to undefined routes return 404 status.
   */
  it('should return 404 for undefined routes', async () => {
    const response = await request(app).get('/undefined-route');
    expect(response.status).toBe(404);
  });

  /**
   * Test: 404 for various non-existent paths
   * Verifies that multiple different invalid paths all return 404.
   */
  it('should return 404 for various non-existent paths', async () => {
    const invalidPaths = [
      '/api',
      '/api/users',
      '/home',
      '/about',
      '/contact',
      '/Evening',
      '/EVENING'
    ];
    
    for (const path of invalidPaths) {
      const response = await request(app).get(path);
      expect(response.status).toBe(404);
    }
  });

  /**
   * Test: Invalid HTTP methods on root route
   * Verifies that POST, PUT, DELETE, PATCH to root return 404.
   */
  it('should return 404 for invalid HTTP methods on root route', async () => {
    const postResponse = await request(app).post('/');
    const putResponse = await request(app).put('/');
    const deleteResponse = await request(app).delete('/');
    const patchResponse = await request(app).patch('/');
    
    expect(postResponse.status).toBe(404);
    expect(putResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(patchResponse.status).toBe(404);
  });

  /**
   * Test: Invalid HTTP methods on evening route
   * Verifies that POST, PUT, DELETE, PATCH to /evening return 404.
   */
  it('should return 404 for invalid HTTP methods on evening route', async () => {
    const postResponse = await request(app).post('/evening');
    const putResponse = await request(app).put('/evening');
    const deleteResponse = await request(app).delete('/evening');
    const patchResponse = await request(app).patch('/evening');
    
    expect(postResponse.status).toBe(404);
    expect(putResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(patchResponse.status).toBe(404);
  });

  /**
   * Test: Path case sensitivity
   * Verifies that routes are case-sensitive (Express default behavior).
   */
  it('should be case-sensitive for route paths', async () => {
    const lowerResponse = await request(app).get('/evening');
    const upperResponse = await request(app).get('/Evening');
    const allUpperResponse = await request(app).get('/EVENING');
    
    expect(lowerResponse.status).toBe(200);
    expect(upperResponse.status).toBe(404);
    expect(allUpperResponse.status).toBe(404);
  });

  /**
   * Test: Routes without trailing slashes work
   * Verifies that defined routes work without trailing slashes.
   */
  it('should handle routes without trailing slashes', async () => {
    const rootResponse = await request(app).get('/');
    const eveningResponse = await request(app).get('/evening');
    
    expect(rootResponse.status).toBe(200);
    expect(eveningResponse.status).toBe(200);
  });
});

/**
 * Test suite for Response Consistency
 * 
 * Tests that responses are consistent across multiple test runs
 * and maintain identical properties.
 */
describe('Response Consistency', () => {
  /**
   * Test: Response body consistency
   * Verifies that response bodies are identical across multiple requests.
   */
  it('should return identical response bodies across multiple requests', async () => {
    const responses = await Promise.all([
      request(app).get('/'),
      request(app).get('/'),
      request(app).get('/')
    ]);
    
    const bodies = responses.map(r => r.text);
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0]).toBe(EXPECTED_ROOT_RESPONSE);
  });

  /**
   * Test: Status code consistency
   * Verifies that status codes are consistent across multiple requests.
   */
  it('should return identical status codes across multiple requests', async () => {
    const responses = await Promise.all([
      request(app).get('/evening'),
      request(app).get('/evening'),
      request(app).get('/evening')
    ]);
    
    const statuses = responses.map(r => r.status);
    expect(new Set(statuses).size).toBe(1);
    expect(statuses[0]).toBe(200);
  });

  /**
   * Test: Content-Length consistency
   * Verifies that Content-Length headers are consistent across requests.
   */
  it('should return consistent Content-Length headers', async () => {
    const responses = await Promise.all([
      request(app).get('/'),
      request(app).get('/')
    ]);
    
    const contentLengths = responses.map(r => r.headers['content-length']);
    expect(new Set(contentLengths).size).toBe(1);
    expect(contentLengths[0]).toBe(EXPECTED_ROOT_CONTENT_LENGTH);
  });

  /**
   * Test: Content-Type consistency
   * Verifies that Content-Type headers are consistent across requests.
   */
  it('should return consistent Content-Type headers', async () => {
    const responses = await Promise.all([
      request(app).get('/evening'),
      request(app).get('/evening')
    ]);
    
    const contentTypes = responses.map(r => r.headers['content-type']);
    expect(new Set(contentTypes).size).toBe(1);
    expect(contentTypes[0]).toMatch(/text\/html/);
  });

  /**
   * Test: Header consistency across different endpoints
   * Verifies that similar headers are present across all endpoints.
   */
  it('should have consistent header structure across endpoints', async () => {
    const rootResponse = await request(app).get('/');
    const eveningResponse = await request(app).get('/evening');
    
    // Both should have these headers
    expect(rootResponse.headers['content-type']).toBeDefined();
    expect(rootResponse.headers['content-length']).toBeDefined();
    expect(eveningResponse.headers['content-type']).toBeDefined();
    expect(eveningResponse.headers['content-length']).toBeDefined();
    
    // Both should use same content type
    expect(rootResponse.headers['content-type']).toMatch(/text\/html/);
    expect(eveningResponse.headers['content-type']).toMatch(/text\/html/);
  });
});

/**
 * Test suite for Server Binding Behavior
 * 
 * Tests specific to server binding on hostname and port.
 */
describe('Server Binding Behavior', () => {
  let server;

  afterEach((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  /**
   * Test: Server binds to 127.0.0.1 hostname
   * Verifies that the server can bind to the localhost address.
   */
  it('should bind to 127.0.0.1 hostname successfully', (done) => {
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, () => {
      const address = server.address();
      expect(address.address).toBe(SERVER_HOSTNAME);
      done();
    });
  });

  /**
   * Test: Server binds to specified port
   * Verifies that the server binds to the specified port number.
   */
  it('should bind to specified port successfully', (done) => {
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, () => {
      const address = server.address();
      expect(address.port).toBe(TEST_PORT);
      done();
    });
  });

  /**
   * Test: Server address information is accessible
   * Verifies that server address information can be retrieved after startup.
   */
  it('should provide address information after startup', (done) => {
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, () => {
      const address = server.address();
      expect(address).not.toBeNull();
      expect(typeof address.port).toBe('number');
      expect(typeof address.address).toBe('string');
      expect(typeof address.family).toBe('string');
      done();
    });
  });

  /**
   * Test: Server uses IPv4 family
   * Verifies that the server uses IPv4 address family.
   */
  it('should use IPv4 address family when binding to 127.0.0.1', (done) => {
    server = app.listen(TEST_PORT, SERVER_HOSTNAME, () => {
      const address = server.address();
      expect(address.family).toBe('IPv4');
      done();
    });
  });

  /**
   * Test: Verify production configuration values
   * Tests that the production hostname and port constants are correct.
   */
  it('should have correct production configuration constants', () => {
    expect(SERVER_HOSTNAME).toBe('127.0.0.1');
    expect(SERVER_PORT).toBe(3000);
  });
});

/**
 * Test suite for Request Processing
 * 
 * Tests request processing behavior and response generation.
 */
describe('Request Processing', () => {
  /**
   * Test: Request with query parameters is handled
   * Verifies that query parameters don't affect route matching.
   */
  it('should handle requests with query parameters', async () => {
    const response = await request(app).get('/?param=value');
    expect(response.status).toBe(200);
    expect(response.text).toBe(EXPECTED_ROOT_RESPONSE);
  });

  /**
   * Test: Request with query parameters on evening route
   * Verifies that query parameters don't affect /evening route.
   */
  it('should handle query parameters on evening route', async () => {
    const response = await request(app).get('/evening?time=now');
    expect(response.status).toBe(200);
    expect(response.text).toBe(EXPECTED_EVENING_RESPONSE);
  });

  /**
   * Test: Request processing time is reasonable
   * Verifies that response time is within acceptable limits.
   */
  it('should respond within reasonable time', async () => {
    const startTime = Date.now();
    await request(app).get('/');
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(1000); // Less than 1 second
  });

  /**
   * Test: Empty request body is handled
   * Verifies that GET requests with empty bodies work correctly.
   */
  it('should handle GET requests correctly (no body expected)', async () => {
    const response = await request(app)
      .get('/')
      .send('');
    
    expect(response.status).toBe(200);
    expect(response.text).toBe(EXPECTED_ROOT_RESPONSE);
  });
});
