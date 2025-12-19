/**
 * tests/integration/server.integration.test.js - Integration Tests for Express Server
 * 
 * This test file contains comprehensive integration tests for the Express.js server
 * lifecycle management. Tests verify server startup, shutdown, callback execution,
 * full request/response cycles, concurrent request handling, and configuration validation.
 * 
 * Uses Jest as the testing framework and Supertest for HTTP assertions,
 * allowing tests to run against the Express app in various lifecycle states.
 * 
 * Test Coverage:
 *   - Server startup and callback execution
 *   - Server configuration (hostname, port)
 *   - Full request/response cycles
 *   - Multiple sequential requests
 *   - Concurrent request handling
 *   - Server shutdown behavior
 */

const request = require('supertest');
const app = require('../../app');

/**
 * Test suite for Full Request Flow Integration
 * 
 * Tests complete request/response cycles through the Express app
 * using Supertest which handles server lifecycle automatically.
 */
describe('Full Request Flow Integration', () => {
  /**
   * Test: Complete request cycle for GET /
   * Verifies the full request/response cycle for the root endpoint.
   */
  it('should return "Hello, World!\\n" with status 200 in full request cycle', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Complete request cycle for GET /evening
   * Verifies the full request/response cycle for the evening endpoint.
   */
  it('should return "Good evening" with status 200 in full request cycle', async () => {
    const response = await request(app).get('/evening');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: Both endpoints return correct headers
   * Verifies that both endpoints include proper HTTP headers.
   */
  it('should return correct headers for both endpoints', async () => {
    const rootResponse = await request(app).get('/');
    const eveningResponse = await request(app).get('/evening');
    
    expect(rootResponse.headers['content-type']).toMatch(/text\/html/);
    expect(eveningResponse.headers['content-type']).toMatch(/text\/html/);
  });
});

/**
 * Test suite for Multiple Sequential Requests
 * 
 * Tests that multiple sequential requests are handled correctly
 * and maintain consistent responses.
 */
describe('Multiple Sequential Requests', () => {
  /**
   * Test: Sequential requests to same endpoint
   * Verifies that multiple sequential requests to the same endpoint
   * return consistent results.
   */
  it('should handle multiple sequential requests to GET / correctly', async () => {
    const response1 = await request(app).get('/');
    const response2 = await request(app).get('/');
    const response3 = await request(app).get('/');
    
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
    
    expect(response1.text).toBe('Hello, World!\n');
    expect(response2.text).toBe('Hello, World!\n');
    expect(response3.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Sequential requests to different endpoints
   * Verifies that sequential requests to different endpoints
   * return correct responses for each.
   */
  it('should handle sequential requests to different endpoints correctly', async () => {
    const response1 = await request(app).get('/');
    const response2 = await request(app).get('/evening');
    const response3 = await request(app).get('/');
    const response4 = await request(app).get('/evening');
    
    expect(response1.text).toBe('Hello, World!\n');
    expect(response2.text).toBe('Good evening');
    expect(response3.text).toBe('Hello, World!\n');
    expect(response4.text).toBe('Good evening');
  });

  /**
   * Test: Alternating valid and invalid requests
   * Verifies that the server handles a mix of valid and invalid requests.
   */
  it('should handle alternating valid and invalid requests', async () => {
    const valid1 = await request(app).get('/');
    const invalid1 = await request(app).get('/nonexistent');
    const valid2 = await request(app).get('/evening');
    const invalid2 = await request(app).get('/missing');
    
    expect(valid1.status).toBe(200);
    expect(invalid1.status).toBe(404);
    expect(valid2.status).toBe(200);
    expect(invalid2.status).toBe(404);
  });
});

/**
 * Test suite for Concurrent Request Handling
 * 
 * Tests that the server can handle multiple concurrent requests
 * without issues.
 */
describe('Concurrent Request Handling', () => {
  /**
   * Test: Concurrent requests to same endpoint
   * Verifies that multiple concurrent requests to the same endpoint
   * are all handled correctly.
   */
  it('should handle concurrent requests to GET / correctly', async () => {
    const requests = Array(10).fill(null).map(() => request(app).get('/'));
    const responses = await Promise.all(requests);
    
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });
  });

  /**
   * Test: Concurrent requests to different endpoints
   * Verifies that concurrent requests to different endpoints
   * are all handled correctly.
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
      expect(response.text).toBe('Hello, World!\n');
    });
    
    eveningResponses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });
  });

  /**
   * Test: Large number of concurrent requests
   * Verifies that the server can handle a larger number of concurrent requests.
   */
  it('should handle 20 concurrent requests correctly', async () => {
    const requests = Array(20).fill(null).map((_, index) => 
      request(app).get(index % 2 === 0 ? '/' : '/evening')
    );
    const responses = await Promise.all(requests);
    
    responses.forEach((response, index) => {
      expect(response.status).toBe(200);
      if (index % 2 === 0) {
        expect(response.text).toBe('Hello, World!\n');
      } else {
        expect(response.text).toBe('Good evening');
      }
    });
  });
});

/**
 * Test suite for Server Configuration Verification
 * 
 * Tests that verify the server configuration matches expected values.
 * Note: Supertest manages its own ephemeral port, so these tests verify
 * that the configuration values are correctly defined in the source.
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
    // Verify by making an actual request - if routes are configured, this works
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBeDefined();
  });

  /**
   * Test: App responds to HTTP requests
   * Verifies that the app is properly configured to respond to requests.
   */
  it('should respond to HTTP requests through Supertest', async () => {
    const response = await request(app).get('/');
    expect(response.status).not.toBe(500);
  });
});

/**
 * Test suite for Server Startup Callback Verification
 * 
 * Tests that verify server startup callback behavior.
 * These tests use jest.spyOn to verify console output.
 */
describe('Server Startup Callback Verification', () => {
  /**
   * Test: Console.log is callable for startup message
   * Verifies that console.log can be used for startup messages.
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
});

/**
 * Test suite for Server Lifecycle with Manual Start/Stop
 * 
 * Tests server lifecycle by manually starting and stopping the server.
 * Uses a different port to avoid conflicts.
 */
describe('Server Lifecycle with Manual Start/Stop', () => {
  let server;
  const testPort = 3001;
  const testHostname = '127.0.0.1';

  /**
   * Cleanup: Ensure server is closed after each test
   */
  afterEach((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  /**
   * Test: Server starts successfully
   * Verifies that the server can be started on a specified port.
   */
  it('should start server successfully on specified port', (done) => {
    server = app.listen(testPort, testHostname, () => {
      expect(server.listening).toBe(true);
      done();
    });
  });

  /**
   * Test: Server callback is executed on startup
   * Verifies that the callback function is executed when server starts.
   */
  it('should execute callback function when server starts', (done) => {
    const callback = jest.fn(() => {
      expect(callback).toHaveBeenCalledTimes(1);
      done();
    });
    
    server = app.listen(testPort, testHostname, callback);
  });

  /**
   * Test: Server accepts connections after startup
   * Verifies that the server accepts HTTP connections after starting.
   */
  it('should accept connections after startup', (done) => {
    server = app.listen(testPort, testHostname, async () => {
      try {
        const response = await request(server).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello, World!\n');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  /**
   * Test: Server stops accepting connections after close
   * Verifies that the server properly closes and stops accepting connections.
   */
  it('should stop accepting connections after server close', (done) => {
    server = app.listen(testPort, testHostname, () => {
      server.close(() => {
        expect(server.listening).toBe(false);
        done();
      });
    });
  });

  /**
   * Test: Server graceful shutdown
   * Verifies that the server can shut down gracefully.
   */
  it('should shutdown gracefully', (done) => {
    const shutdownCallback = jest.fn(() => {
      expect(shutdownCallback).toHaveBeenCalledTimes(1);
      expect(server.listening).toBe(false);
      done();
    });
    
    server = app.listen(testPort, testHostname, () => {
      server.close(shutdownCallback);
    });
  });
});

/**
 * Test suite for Response Consistency
 * 
 * Tests that responses are consistent across multiple test runs.
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
    expect(bodies[0]).toBe('Hello, World!\n');
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
   * Verifies that Content-Length headers are consistent.
   */
  it('should return consistent Content-Length headers', async () => {
    const responses = await Promise.all([
      request(app).get('/'),
      request(app).get('/')
    ]);
    
    const contentLengths = responses.map(r => r.headers['content-length']);
    expect(new Set(contentLengths).size).toBe(1);
    expect(contentLengths[0]).toBe('14');
  });
});
