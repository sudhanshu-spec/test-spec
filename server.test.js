/**
 * Server Test Suite
 * 
 * Comprehensive tests for the Express server covering:
 * - Basic route functionality
 * - 404 handler for undefined routes
 * - Server exports for testing
 * - Edge cases (query params, trailing slashes, different methods)
 */

const request = require('supertest');
const { app, server } = require('./server');

// Close server after all tests complete
afterAll((done) => {
  if (server && server.listening) {
    server.close(done);
  } else {
    done();
  }
});

describe('Server Tests', () => {
  
  // ===========================================================================
  // Basic Routes Tests
  // ===========================================================================
  
  describe('Basic Routes', () => {
    
    test('GET / should return "Hello, World!"', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });
    
    test('GET /evening should return "Good evening"', async () => {
      const response = await request(app).get('/evening');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });
    
  });
  
  // ===========================================================================
  // 404 Handler Tests
  // ===========================================================================
  
  describe('404 Handler', () => {
    
    test('GET /nonexistent should return 404', async () => {
      const response = await request(app).get('/nonexistent');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });
    
    test('GET /random/path should return 404', async () => {
      const response = await request(app).get('/random/path');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });
    
    test('POST / should return 404 (method not defined)', async () => {
      const response = await request(app).post('/');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });
    
  });
  
  // ===========================================================================
  // Server Export Tests
  // ===========================================================================
  
  describe('Server Export', () => {
    
    test('app should be exported', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });
    
    test('server should be exported', () => {
      expect(server).toBeDefined();
      expect(typeof server.close).toBe('function');
    });
    
  });
  
  // ===========================================================================
  // Edge Cases Tests
  // ===========================================================================
  
  describe('Edge Cases', () => {
    
    test('GET / with query params should still work', async () => {
      const response = await request(app).get('/?name=test&value=123');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });
    
    test('GET /evening with trailing slash should return 404', async () => {
      const response = await request(app).get('/evening/');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });
    
  });
  
});
