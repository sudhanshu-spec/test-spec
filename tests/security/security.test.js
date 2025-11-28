/**
 * Security Tests
 * 
 * Validates that all security middleware is properly configured
 * and functioning correctly. Tests HTTP security headers, CORS,
 * rate limiting, input validation, and error handling.
 * 
 * @module tests/security/security.test
 */

'use strict';

const http = require('http');

// Test configuration
const TEST_HOST = '127.0.0.1';
const TEST_PORT = 3000;

// Store server reference for cleanup
let serverInstance = null;

/**
 * Makes an HTTP request and returns response with headers and body
 * 
 * @param {string} path - Request path
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response object with statusCode, headers, body
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: TEST_HOST,
      port: TEST_PORT,
      path,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// =============================================================================
// CONFIG MODULE TESTS
// =============================================================================

describe('Config Module Tests', () => {
  
  test('Security config module should load', () => {
    const securityConfig = require('../../config/security');
    expect(securityConfig).toBeDefined();
    expect(securityConfig.contentSecurityPolicy).toBeDefined();
    expect(securityConfig.frameguard).toBeDefined();
    expect(securityConfig.noSniff).toBe(true);
    expect(securityConfig.xssFilter).toBe(true);
    expect(securityConfig.hidePoweredBy).toBe(true);
  });

  test('Security config CSP has correct directives', () => {
    const securityConfig = require('../../config/security');
    const csp = securityConfig.contentSecurityPolicy;
    
    expect(csp.directives).toBeDefined();
    expect(csp.directives.defaultSrc).toContain("'self'");
    expect(csp.directives.scriptSrc).toBeDefined();
    expect(csp.directives.styleSrc).toContain("'self'");
    expect(csp.directives.styleSrc).toContain("'unsafe-inline'");
    expect(csp.directives.imgSrc).toContain("'self'");
    expect(csp.directives.imgSrc).toContain('data:');
  });

  test('Security config has Cross-Origin policies', () => {
    const securityConfig = require('../../config/security');
    
    expect(securityConfig.crossOriginEmbedderPolicy).toBeDefined();
    expect(securityConfig.crossOriginOpenerPolicy).toBeDefined();
    expect(securityConfig.crossOriginResourcePolicy).toBeDefined();
  });

  test('CORS config module should load', () => {
    const corsConfig = require('../../config/cors');
    expect(corsConfig).toBeDefined();
  });

  test('Rate limit config module should load', () => {
    const rateLimitConfig = require('../../config/rate-limit');
    expect(rateLimitConfig).toBeDefined();
  });
  
  test('Error handler middleware should load and be a function', () => {
    const errorHandler = require('../../middleware/errorHandler');
    expect(typeof errorHandler).toBe('function');
    expect(errorHandler.length).toBe(4); // Express error handler has 4 params
  });

  test('Error handler should have createError utility', () => {
    const errorHandler = require('../../middleware/errorHandler');
    expect(typeof errorHandler.createError).toBe('function');
    
    const error = errorHandler.createError('Test error', 400);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
  });

  test('Validation middleware should load with expected exports', () => {
    const validation = require('../../middleware/validation');
    
    expect(validation.handleValidationErrors).toBeDefined();
    expect(typeof validation.handleValidationErrors).toBe('function');
    
    expect(validation.sanitizeQuery).toBeDefined();
    expect(typeof validation.sanitizeQuery).toBe('function');
    
    expect(validation.sanitizeParams).toBeDefined();
    expect(typeof validation.sanitizeParams).toBe('function');
    
    expect(validation.validateRequestBody).toBeDefined();
    expect(typeof validation.validateRequestBody).toBe('function');
  });

  test('Validation middleware should export express-validator functions', () => {
    const validation = require('../../middleware/validation');
    
    expect(validation.body).toBeDefined();
    expect(validation.query).toBeDefined();
    expect(validation.param).toBeDefined();
    expect(validation.validationResult).toBeDefined();
  });
});

// =============================================================================
// INTEGRATION TESTS (require running server)
// =============================================================================

describe('Server Integration Tests', () => {
  // Start server before all tests
  beforeAll(async () => {
    // Clear any cached modules
    jest.resetModules();
    
    // Set test port
    process.env.PORT = TEST_PORT.toString();
    
    // Require server to start it
    require('../../server');
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  // Stop server after all tests
  afterAll(async () => {
    // Give server time to close
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Security Headers', () => {
    test('Should remove X-Powered-By header', async () => {
      const res = await makeRequest('/');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    test('Should set X-Content-Type-Options to nosniff', async () => {
      const res = await makeRequest('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Should set X-Frame-Options header', async () => {
      const res = await makeRequest('/');
      expect(['DENY', 'SAMEORIGIN']).toContain(res.headers['x-frame-options']);
    });

    test('Should set Content-Security-Policy header', async () => {
      const res = await makeRequest('/');
      const hasCSP = res.headers['content-security-policy'] || 
                     res.headers['content-security-policy-report-only'];
      expect(hasCSP).toBeDefined();
      expect(hasCSP).toContain("'self'");
    });

    test('Should set Cross-Origin-Opener-Policy header', async () => {
      const res = await makeRequest('/');
      expect(res.headers['cross-origin-opener-policy']).toBeDefined();
    });

    test('Should set Cross-Origin-Resource-Policy header', async () => {
      const res = await makeRequest('/');
      expect(res.headers['cross-origin-resource-policy']).toBeDefined();
    });

    test('Should set Strict-Transport-Security header', async () => {
      const res = await makeRequest('/');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['strict-transport-security']).toContain('max-age');
    });

    test('Should set Referrer-Policy header', async () => {
      const res = await makeRequest('/');
      expect(res.headers['referrer-policy']).toBeDefined();
    });
  });

  describe('CORS', () => {
    test('Should include CORS-related headers', async () => {
      const res = await makeRequest('/', {
        headers: { 'Origin': 'http://localhost:3000' }
      });
      const hasCORSHeaders = res.headers['access-control-allow-credentials'] !== undefined ||
                            res.headers['vary']?.includes('Origin');
      expect(hasCORSHeaders).toBe(true);
    });

    test('Should handle OPTIONS preflight request', async () => {
      const res = await makeRequest('/', {
        method: 'OPTIONS',
        headers: { 
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET'
        }
      });
      expect(res.statusCode).toBeLessThan(500);
    });
  });

  describe('Rate Limiting', () => {
    test('Should include RateLimit headers in response', async () => {
      const res = await makeRequest('/');
      const hasRateLimitHeaders = 
        res.headers['ratelimit-limit'] !== undefined ||
        res.headers['ratelimit-remaining'] !== undefined ||
        res.headers['x-ratelimit-limit'] !== undefined;
      expect(hasRateLimitHeaders).toBe(true);
    });

    test('Should include RateLimit-Policy header', async () => {
      const res = await makeRequest('/');
      expect(res.headers['ratelimit-policy']).toBeDefined();
    });
  });

  describe('Routes', () => {
    test('GET / should return "Hello, World!"', async () => {
      const res = await makeRequest('/');
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Hello, World!');
    });

    test('GET /evening should return "Good evening"', async () => {
      const res = await makeRequest('/evening');
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Good evening');
    });

    test('GET /health should return health status', async () => {
      const res = await makeRequest('/health');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('healthy');
    });

    test('GET /nonexistent should return 404', async () => {
      const res = await makeRequest('/nonexistent');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Error Handling', () => {
    test('404 response should be JSON format', async () => {
      const res = await makeRequest('/nonexistent');
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toBeDefined();
      expect(body.error.status).toBe(404);
    });

    test('Error response should have message property', async () => {
      const res = await makeRequest('/nonexistent');
      const body = JSON.parse(res.body);
      expect(body.error.message).toBeDefined();
      expect(typeof body.error.message).toBe('string');
    });
  });
});

// =============================================================================
// HELMET INTEGRATION TESTS
// =============================================================================

describe('Helmet Integration', () => {
  test('Should be able to create helmet middleware with security config', () => {
    const helmet = require('helmet');
    const securityConfig = require('../../config/security');
    
    const middleware = helmet(securityConfig);
    expect(typeof middleware).toBe('function');
  });
});
