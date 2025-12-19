/**
 * @fileoverview Input Validation Verification Test Suite
 * 
 * Comprehensive test suite for Joi-based input validation middleware functionality.
 * Tests verify that:
 * - Malformed JSON requests are rejected with 400 status
 * - Invalid request bodies fail schema validation
 * - Validation error messages are descriptive and secure
 * - Injection attack attempts are blocked (SQL, NoSQL, XSS)
 * - Valid requests pass through unchanged
 * 
 * This test suite covers both integration tests (using supertest against the Express app)
 * and unit tests (testing validation middleware directly with mocked request/response objects).
 * 
 * @module tests/security/validation
 * @requires supertest
 * @requires joi
 * @requires ../../server
 * @requires ../../middleware/validation
 * @see Section 0.8.2 of Agent Action Plan - Input validation verification tests
 */

'use strict';

// =============================================================================
// TEST DEPENDENCIES
// =============================================================================

/**
 * HTTP assertion library for testing Express applications
 * Used for integration testing of validation middleware behavior
 */
const request = require('supertest');

/**
 * Joi schema validation library
 * Used to create test schemas for verifying validation middleware behavior
 */
const Joi = require('joi');

/**
 * Express application instance for integration testing
 */
const app = require('../../server');

/**
 * Validation middleware exports for unit testing
 * Includes validate factory, helpers, and utilities
 */
const {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateData,
  ValidationError,
  commonSchemas
} = require('../../middleware/validation');

// =============================================================================
// TEST UTILITIES AND HELPERS
// =============================================================================

/**
 * Creates a mock Express request object for unit testing
 * @param {Object} overrides - Properties to override in the mock request
 * @returns {Object} Mock request object
 */
const createMockRequest = (overrides = {}) => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  ...overrides
});

/**
 * Creates a mock Express response object for unit testing
 * @returns {Object} Mock response object with chainable methods
 */
const createMockResponse = () => {
  const res = {
    statusCode: 200,
    jsonData: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
};

/**
 * Creates a mock next function for unit testing
 * @returns {Object} Mock next function with tracking
 */
const createMockNext = () => {
  const next = jest.fn();
  return next;
};

/**
 * Test schemas used throughout the test suite
 */
const testSchemas = {
  // Basic user schema for testing required fields and types
  user: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    age: Joi.number().integer().min(0).max(150)
  }),

  // Schema with strict type constraints for testing type coercion
  typedData: Joi.object({
    stringField: Joi.string().required(),
    numberField: Joi.number().required(),
    booleanField: Joi.boolean().required(),
    arrayField: Joi.array().items(Joi.string())
  }),

  // Schema with length constraints for testing validation limits
  limitedString: Joi.object({
    shortText: Joi.string().max(10).required(),
    mediumText: Joi.string().max(100),
    longText: Joi.string().max(1000)
  }),

  // Query parameter schema for testing query validation
  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('asc')
  }),

  // Route parameters schema for testing params validation
  routeParams: Joi.object({
    id: Joi.string().pattern(/^[a-f\d]{24}$/i).required()
  })
};

// =============================================================================
// INPUT VALIDATION MIDDLEWARE - UNIT TESTS
// =============================================================================

describe('Input Validation Middleware', () => {
  
  describe('validate() factory function', () => {
    
    test('should return a middleware function', () => {
      const middleware = validate(testSchemas.user, 'body');
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // (req, res, next)
    });

    test('should throw error for invalid schema', () => {
      expect(() => validate(null, 'body')).toThrow('Invalid schema');
      expect(() => validate({}, 'body')).toThrow('Invalid schema');
      expect(() => validate('not-a-schema', 'body')).toThrow('Invalid schema');
    });

    test('should throw error for invalid property', () => {
      expect(() => validate(testSchemas.user, 'invalid')).toThrow('Invalid property');
      expect(() => validate(testSchemas.user, 'cookies')).toThrow('Invalid property');
    });

    test('should accept valid JSON body', () => {
      const middleware = validate(testSchemas.user, 'body');
      const req = createMockRequest({
        body: { name: 'John Doe', email: 'john@example.com', age: 30 }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200); // Unchanged
      expect(req.body).toEqual({ name: 'John Doe', email: 'john@example.com', age: 30 });
    });

    test('should reject body not matching schema', () => {
      const middleware = validate(testSchemas.user, 'body');
      const req = createMockRequest({
        body: { name: 'John Doe' } // Missing required email
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toHaveProperty('error', 'Validation Error');
      expect(res.jsonData).toHaveProperty('message');
      expect(res.jsonData).toHaveProperty('details');
      expect(res.jsonData.message).toContain('email');
    });

    test('should return descriptive error messages', () => {
      const middleware = validate(testSchemas.user, 'body');
      const req = createMockRequest({
        body: { name: 'J', email: 'invalid-email' } // name too short, invalid email
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe('Validation Error');
      expect(res.jsonData.details).toBeInstanceOf(Array);
      expect(res.jsonData.details.length).toBeGreaterThanOrEqual(2);
      
      // Verify details include field path and validation failure reason
      const nameError = res.jsonData.details.find(d => d.path === 'name');
      const emailError = res.jsonData.details.find(d => d.path === 'email');
      
      expect(nameError).toBeDefined();
      expect(nameError).toHaveProperty('type');
      expect(nameError).toHaveProperty('message');
      
      expect(emailError).toBeDefined();
      expect(emailError).toHaveProperty('type');
      expect(emailError).toHaveProperty('message');
    });

    test('should include timestamp in error response', () => {
      const middleware = validate(testSchemas.user, 'body');
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.jsonData).toHaveProperty('timestamp');
      expect(new Date(res.jsonData.timestamp)).toBeInstanceOf(Date);
    });

  });

  describe('validateBody() convenience wrapper', () => {
    
    test('should validate request body', () => {
      const middleware = validateBody(testSchemas.user);
      const req = createMockRequest({
        body: { name: 'Jane Doe', email: 'jane@example.com' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject invalid body', () => {
      const middleware = validateBody(testSchemas.user);
      const req = createMockRequest({ body: { invalid: 'data' } });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

  });

  describe('validateQuery() convenience wrapper', () => {
    
    test('should validate query parameters', () => {
      const middleware = validateQuery(testSchemas.queryParams);
      const req = createMockRequest({
        query: { page: '2', limit: '25', sort: 'desc' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // Check type coercion - strings should be converted to numbers
      expect(req.query.page).toBe(2);
      expect(req.query.limit).toBe(25);
    });

    test('should reject invalid query parameters', () => {
      const middleware = validateQuery(testSchemas.queryParams);
      const req = createMockRequest({
        query: { page: '-1', limit: '1000', sort: 'invalid' } // Invalid values
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

    test('should apply default values', () => {
      const middleware = validateQuery(testSchemas.queryParams);
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(10);
      expect(req.query.sort).toBe('asc');
    });

  });

  describe('validateParams() convenience wrapper', () => {
    
    test('should validate route parameters', () => {
      const middleware = validateParams(testSchemas.routeParams);
      const req = createMockRequest({
        params: { id: '507f1f77bcf86cd799439011' } // Valid MongoDB ObjectId
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject invalid route parameters', () => {
      const middleware = validateParams(testSchemas.routeParams);
      const req = createMockRequest({
        params: { id: 'invalid-id' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

  });

});

// =============================================================================
// QUERY PARAMETER VALIDATION TESTS
// =============================================================================

describe('Query Parameter Validation', () => {
  
  test('should validate query parameters', () => {
    const middleware = validateQuery(testSchemas.queryParams);
    const req = createMockRequest({
      query: { page: '5', limit: '50' }
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe(5);
    expect(req.query.limit).toBe(50);
  });

  test('should sanitize query parameters by stripping unknown fields', () => {
    const middleware = validateQuery(testSchemas.queryParams);
    const req = createMockRequest({
      query: { 
        page: '1', 
        unknownParam: 'should-be-removed',
        maliciousParam: 'attack'
      }
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).not.toHaveProperty('unknownParam');
    expect(req.query).not.toHaveProperty('maliciousParam');
    expect(req.query.page).toBe(1);
  });

  test('should reject out-of-range values', () => {
    const middleware = validateQuery(testSchemas.queryParams);
    const req = createMockRequest({
      query: { page: '0', limit: '500' } // page < 1, limit > 100
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

});

// =============================================================================
// INJECTION ATTACK PREVENTION TESTS
// =============================================================================

describe('Injection Attack Prevention', () => {
  
  describe('SQL Injection Prevention', () => {
    
    test('should handle SQL injection attempts in string fields', () => {
      const sqlInjectionSchema = Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required()
      });
      const middleware = validate(sqlInjectionSchema, 'body');
      
      const sqlPayloads = [
        "'; DROP TABLE users;--",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM users",
        "' UNION SELECT * FROM passwords--",
        "1' OR 1=1--"
      ];

      sqlPayloads.forEach(payload => {
        const req = createMockRequest({ body: { username: payload } });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        // SQL injection payloads should fail validation due to non-alphanumeric characters
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
      });
    });

    test('should sanitize SQL injection in allowed characters', () => {
      // Even with relaxed string validation, stripUnknown removes dangerous payloads
      const relaxedSchema = Joi.object({
        search: Joi.string().max(100).required()
      });
      const middleware = validate(relaxedSchema, 'body');
      
      const req = createMockRequest({
        body: { 
          search: "normal search",
          sqlInjection: "'; DROP TABLE--" // Extra field should be stripped
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).not.toHaveProperty('sqlInjection');
      expect(req.body.search).toBe('normal search');
    });

  });

  describe('NoSQL Injection Prevention', () => {
    
    test('should block NoSQL injection attempts with $gt operator', () => {
      const userSchema = Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required()
      });
      const middleware = validate(userSchema, 'body');
      
      // NoSQL injection attempt using MongoDB operators
      const req = createMockRequest({
        body: { 
          username: { '$gt': '' }, // Malicious operator
          password: { '$ne': null }
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      // Should reject because objects are not valid strings
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe('Validation Error');
    });

    test('should block NoSQL injection with $where operator', () => {
      const schema = Joi.object({
        query: Joi.string().required()
      });
      const middleware = validate(schema, 'body');
      
      const req = createMockRequest({
        body: { 
          query: { '$where': 'this.password.length > 0' }
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

    test('should block NoSQL injection with $regex operator', () => {
      const schema = Joi.object({
        search: Joi.string().max(100).required()
      });
      const middleware = validate(schema, 'body');
      
      const req = createMockRequest({
        body: { 
          search: { '$regex': '.*', '$options': 'i' }
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

  });

  describe('XSS Payload Prevention', () => {
    
    test('should handle XSS payloads in input fields', () => {
      // For strict validation, XSS payloads in alphanum fields fail
      const strictSchema = Joi.object({
        comment: Joi.string().alphanum().max(500)
      });
      const middleware = validate(strictSchema, 'body');
      
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert('xss')>",
        "<body onload=alert('xss')>",
        "javascript:alert('xss')",
        "<svg onload=alert('xss')>",
        "'\"><script>alert(document.domain)</script>"
      ];

      xssPayloads.forEach(payload => {
        const req = createMockRequest({ body: { comment: payload } });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        // XSS payloads should fail validation due to non-alphanumeric characters
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
      });
    });

    test('should strip unknown XSS fields from request', () => {
      const safeSchema = Joi.object({
        title: Joi.string().max(100).required()
      });
      const middleware = validate(safeSchema, 'body');
      
      const req = createMockRequest({
        body: { 
          title: "Safe Title",
          xss: "<script>alert('xss')</script>",
          malicious: "<img src=x onerror=alert(1)>"
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).not.toHaveProperty('xss');
      expect(req.body).not.toHaveProperty('malicious');
    });

    test('should handle script injection with event handlers', () => {
      const schema = Joi.object({
        data: Joi.string().pattern(/^[a-zA-Z0-9\s]+$/).required() // Only alphanumeric and spaces
      });
      const middleware = validate(schema, 'body');
      
      const eventHandlerPayloads = [
        "<div onclick='alert(1)'>",
        "<input onfocus='alert(1)'>",
        "<a onmouseover='alert(1)'>",
        "onload='alert(1)'"
      ];

      eventHandlerPayloads.forEach(payload => {
        const req = createMockRequest({ body: { data: payload } });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
      });
    });

  });

  describe('Command Injection Prevention', () => {
    
    test('should reject command injection payloads', () => {
      const schema = Joi.object({
        filename: Joi.string().alphanum().max(50).required()
      });
      const middleware = validate(schema, 'body');
      
      const commandPayloads = [
        "; ls -la",
        "| cat /etc/passwd",
        "$(whoami)",
        "`id`",
        "&& rm -rf /",
        "file.txt; cat /etc/passwd"
      ];

      commandPayloads.forEach(payload => {
        const req = createMockRequest({ body: { filename: payload } });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
      });
    });

  });

  describe('Path Traversal Prevention', () => {
    
    test('should reject path traversal attempts', () => {
      const schema = Joi.object({
        filepath: Joi.string().pattern(/^[a-zA-Z0-9_\-]+\.[a-zA-Z]+$/).required() // filename.ext only
      });
      const middleware = validate(schema, 'body');
      
      const pathTraversalPayloads = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32",
        "/etc/passwd",
        "C:\\Windows\\System32",
        "....//....//etc/passwd"
      ];

      pathTraversalPayloads.forEach(payload => {
        const req = createMockRequest({ body: { filepath: payload } });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
      });
    });

  });

});

// =============================================================================
// SCHEMA ENFORCEMENT TESTS
// =============================================================================

describe('Schema Enforcement', () => {
  
  describe('Type Constraints', () => {
    
    test('should enforce type constraints - string where number expected', () => {
      const middleware = validate(testSchemas.typedData, 'body');
      const req = createMockRequest({
        body: {
          stringField: 'valid',
          numberField: 'not-a-number', // Should be a number
          booleanField: true,
          arrayField: []
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.message).toContain('numberField');
    });

    test('should coerce valid string to number when possible', () => {
      const middleware = validate(testSchemas.typedData, 'body');
      const req = createMockRequest({
        body: {
          stringField: 'valid',
          numberField: '42', // String that can be coerced to number
          booleanField: true,
          arrayField: []
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.numberField).toBe(42);
    });

    test('should enforce boolean type', () => {
      const middleware = validate(testSchemas.typedData, 'body');
      const req = createMockRequest({
        body: {
          stringField: 'valid',
          numberField: 42,
          booleanField: 'not-a-boolean', // Invalid boolean
          arrayField: []
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

    test('should enforce array type', () => {
      const middleware = validate(testSchemas.typedData, 'body');
      const req = createMockRequest({
        body: {
          stringField: 'valid',
          numberField: 42,
          booleanField: true,
          arrayField: 'not-an-array' // Should be array
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

  });

  describe('Length Constraints', () => {
    
    test('should enforce maximum length constraints', () => {
      const middleware = validate(testSchemas.limitedString, 'body');
      const req = createMockRequest({
        body: {
          shortText: 'This string is way too long for the limit' // Max 10 chars
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.message).toContain('shortText');
    });

    test('should accept strings within length limits', () => {
      const middleware = validate(testSchemas.limitedString, 'body');
      const req = createMockRequest({
        body: {
          shortText: 'Short', // 5 chars, max is 10
          mediumText: 'Medium length text here',
          longText: 'This is a longer text but still within the 1000 char limit'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should enforce minimum length constraints', () => {
      const minLengthSchema = Joi.object({
        password: Joi.string().min(8).required()
      });
      const middleware = validate(minLengthSchema, 'body');
      
      const req = createMockRequest({
        body: { password: 'short' } // Less than 8 characters
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

  });

  describe('Unknown Properties Handling', () => {
    
    test('should strip unknown properties when configured', () => {
      const middleware = validate(testSchemas.user, 'body');
      const req = createMockRequest({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          unknownField1: 'should be removed',
          unknownField2: { nested: 'data' },
          __proto__: { polluted: true } // Prototype pollution attempt
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(req.body).not.toHaveProperty('unknownField1');
      expect(req.body).not.toHaveProperty('unknownField2');
    });

    test('should preserve known optional fields', () => {
      const middleware = validate(testSchemas.user, 'body');
      const req = createMockRequest({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30 // Optional field
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.age).toBe(30);
    });

  });

  describe('Required Fields Enforcement', () => {
    
    test('should reject when required fields are missing', () => {
      const middleware = validate(testSchemas.user, 'body');
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      // Should report both name and email as missing
      expect(res.jsonData.details.length).toBeGreaterThanOrEqual(2);
    });

    test('should reject when only some required fields are provided', () => {
      const middleware = validate(testSchemas.user, 'body');
      const req = createMockRequest({
        body: { name: 'John Doe' } // Missing required email
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.message).toContain('email');
    });

  });

  describe('Email Validation', () => {
    
    test('should reject invalid email formats', () => {
      const middleware = validate(testSchemas.user, 'body');
      const invalidEmails = [
        'not-an-email',
        '@missing-local.com',
        'missing-domain@',
        'spaces in@email.com',
        'double@@at.com',
        'missing.tld@domain'
      ];

      invalidEmails.forEach(email => {
        const req = createMockRequest({
          body: { name: 'Test User', email }
        });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
      });
    });

    test('should accept valid email formats', () => {
      const middleware = validate(testSchemas.user, 'body');
      const validEmails = [
        'simple@example.com',
        'test.user@example.org',
        'user+tag@example.net',
        'user123@subdomain.example.co.uk'
      ];

      validEmails.forEach(email => {
        const req = createMockRequest({
          body: { name: 'Test User', email }
        });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        next.mockClear();
      });
    });

  });

});

// =============================================================================
// VALIDATION DATA UTILITY TESTS
// =============================================================================

describe('validateData() utility function', () => {
  
  test('should return validated data on success', () => {
    const data = { name: 'John Doe', email: 'john@example.com' };
    const result = validateData(data, testSchemas.user);
    
    expect(result).toEqual(data);
  });

  test('should throw ValidationError on failure', () => {
    const data = { name: 'J' }; // Missing email, name too short
    
    expect(() => validateData(data, testSchemas.user)).toThrow(ValidationError);
  });

  test('should strip unknown properties', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      extraField: 'should be removed'
    };
    const result = validateData(data, testSchemas.user);
    
    expect(result).not.toHaveProperty('extraField');
  });

  test('should include error details when validation fails', () => {
    const data = { invalid: 'data' };
    
    try {
      validateData(data, testSchemas.user);
      fail('Should have thrown ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeDefined();
    }
  });

});

// =============================================================================
// VALIDATION ERROR CLASS TESTS
// =============================================================================

describe('ValidationError class', () => {
  
  test('should create error with correct properties', () => {
    const error = new ValidationError('Test error', [{ path: 'test', message: 'Test detail' }]);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.details).toHaveLength(1);
  });

  test('should have stack trace', () => {
    const error = new ValidationError('Test error');
    
    expect(error.stack).toBeDefined();
  });

});

// =============================================================================
// COMMON SCHEMAS TESTS
// =============================================================================

describe('Common Schemas', () => {
  
  describe('id schema', () => {
    
    test('should validate MongoDB ObjectId format', () => {
      const validId = '507f1f77bcf86cd799439011';
      const result = commonSchemas.id.validate({ id: validId });
      
      expect(result.error).toBeUndefined();
      expect(result.value.id).toBe(validId);
    });

    test('should reject invalid ObjectId', () => {
      const invalidId = 'not-a-valid-id';
      const result = commonSchemas.id.validate({ id: invalidId });
      
      expect(result.error).toBeDefined();
    });

  });

  describe('uuid schema', () => {
    
    test('should validate UUID v4 format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = commonSchemas.uuid.validate({ id: validUuid });
      
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid UUID', () => {
      const invalidUuid = 'not-a-uuid';
      const result = commonSchemas.uuid.validate({ id: invalidUuid });
      
      expect(result.error).toBeDefined();
    });

  });

  describe('pagination schema', () => {
    
    test('should accept valid pagination params', () => {
      const params = { page: 2, limit: 25, sortBy: 'name', sortOrder: 'asc' };
      const result = commonSchemas.pagination.validate(params);
      
      expect(result.error).toBeUndefined();
    });

    test('should apply defaults', () => {
      const result = commonSchemas.pagination.validate({});
      
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(10);
      expect(result.value.sortOrder).toBe('desc');
    });

    test('should reject invalid sort order', () => {
      const result = commonSchemas.pagination.validate({ sortOrder: 'invalid' });
      
      expect(result.error).toBeDefined();
    });

  });

});

// =============================================================================
// INTEGRATION TESTS WITH EXPRESS APP
// =============================================================================

describe('Integration Tests - Express App', () => {
  
  describe('JSON Body Parsing', () => {
    
    test('should reject invalid JSON syntax with 400 status', async () => {
      // Send malformed JSON directly
      const response = await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('{"invalid": "json"'); // Missing closing brace
      
      // Express's JSON parser should reject malformed JSON
      expect(response.status).toBe(400);
    });

    test('should handle empty body gracefully', async () => {
      const response = await request(app)
        .get('/');
      
      // Existing routes should still work
      expect(response.status).toBe(200);
      expect(response.text).toContain('Hello, World!');
    });

    test('should handle request with valid JSON body', async () => {
      // The existing routes don't use body, but body parsing should work
      const response = await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' });
      
      // POST to / returns 404 (no POST handler), but JSON parsing succeeded
      expect([404, 200]).toContain(response.status);
    });

  });

  describe('Existing Routes Functionality', () => {
    
    test('should maintain functionality of / route', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should maintain functionality of /evening route', async () => {
      const response = await request(app).get('/evening');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });

  });

  describe('Error Response Format', () => {
    
    test('should return JSON error for 404', async () => {
      const response = await request(app).get('/nonexistent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

  });

});

// =============================================================================
// EDGE CASES AND BOUNDARY TESTS
// =============================================================================

describe('Edge Cases and Boundary Tests', () => {
  
  test('should handle null body gracefully', () => {
    const middleware = validate(testSchemas.user, 'body');
    const req = createMockRequest({ body: null });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    // Should fail validation because required fields are missing
    expect(res.statusCode).toBe(400);
  });

  test('should handle undefined body gracefully', () => {
    const middleware = validate(testSchemas.user, 'body');
    const req = createMockRequest({ body: undefined });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    // Should fail validation because required fields are missing
    expect(res.statusCode).toBe(400);
  });

  test('should handle deeply nested objects', () => {
    const nestedSchema = Joi.object({
      level1: Joi.object({
        level2: Joi.object({
          level3: Joi.string().required()
        }).required()
      }).required()
    });
    const middleware = validate(nestedSchema, 'body');
    
    const req = createMockRequest({
      body: {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      }
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should handle empty string values', () => {
    const schema = Joi.object({
      name: Joi.string().min(1).required() // Empty string should fail
    });
    const middleware = validate(schema, 'body');
    
    const req = createMockRequest({ body: { name: '' } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  test('should handle very long strings', () => {
    const schema = Joi.object({
      text: Joi.string().max(100).required()
    });
    const middleware = validate(schema, 'body');
    
    const longString = 'a'.repeat(200); // Exceeds max of 100
    const req = createMockRequest({ body: { text: longString } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  test('should handle array with invalid items', () => {
    const schema = Joi.object({
      items: Joi.array().items(Joi.number()).required()
    });
    const middleware = validate(schema, 'body');
    
    const req = createMockRequest({
      body: { items: [1, 2, 'not-a-number', 4] }
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  test('should handle special characters in strings', () => {
    const schema = Joi.object({
      text: Joi.string().max(100).required()
    });
    const middleware = validate(schema, 'body');
    
    const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
    const req = createMockRequest({ body: { text: specialChars } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.text).toBe(specialChars);
  });

  test('should handle Unicode characters', () => {
    const schema = Joi.object({
      text: Joi.string().max(100).required()
    });
    const middleware = validate(schema, 'body');
    
    const unicodeText = '你好世界 🌍 مرحبا العالم';
    const req = createMockRequest({ body: { text: unicodeText } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.text).toBe(unicodeText);
  });

});
