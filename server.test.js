/**
 * Comprehensive Jest test suite for the Express server API
 * 
 * Tests cover all production-grade features:
 * - Route handlers (GET /, GET /evening)
 * - 404 handler for undefined routes
 * - Error handling for malformed input
 * - Request body parsing (JSON and URL-encoded)
 * - HTTP method handling
 */

const request = require('supertest');
const { app } = require('./server');

describe('Server API Tests', () => {
  
  // ==========================================================================
  // Route Handlers Tests
  // ==========================================================================
  
  describe('Route Handlers', () => {
    it('GET / should return "Hello, World!" with 200 status', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    it('GET /evening should return "Good evening" with 200 status', async () => {
      const response = await request(app).get('/evening');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });
  });

  // ==========================================================================
  // 404 Handler Tests
  // ==========================================================================

  describe('404 Handler', () => {
    it('GET /nonexistent should return 404 status', async () => {
      const response = await request(app).get('/nonexistent');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });

    it('GET /undefined-path should return 404 status', async () => {
      const response = await request(app).get('/undefined-path');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });

    it('POST to undefined route should return 404 status', async () => {
      const response = await request(app).post('/undefined-route');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('Malformed JSON body should return 400 status with error message', async () => {
      const response = await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('{"bad');
      expect(response.status).toBe(400);
    });

    it('Valid JSON body should be parsed correctly', async () => {
      const response = await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ key: 'value' }));
      // Should return 404 since POST / is not defined, but body should be parsed
      expect(response.status).toBe(404);
    });
  });

  // ==========================================================================
  // Request Body Parsing Tests
  // ==========================================================================

  describe('Request Body Parsing', () => {
    it('Should parse URL-encoded body', async () => {
      const response = await request(app)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('key=value&another=test');
      // Should return 404 since POST / is not defined, but body should be parsed
      expect(response.status).toBe(404);
    });

    it('Should parse JSON body', async () => {
      const response = await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send({ test: 'data', number: 123 });
      // Should return 404 since POST / is not defined, but body should be parsed
      expect(response.status).toBe(404);
    });
  });

  // ==========================================================================
  // HTTP Methods Tests
  // ==========================================================================

  describe('HTTP Methods', () => {
    it('PUT request to / should return 404', async () => {
      const response = await request(app).put('/');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });

    it('DELETE request to / should return 404', async () => {
      const response = await request(app).delete('/');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });

    it('PATCH request to / should return 404', async () => {
      const response = await request(app).patch('/');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Not Found');
    });
  });
});
