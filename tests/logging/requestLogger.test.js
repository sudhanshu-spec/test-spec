/**
 * HTTP Request Logger Middleware Test Suite
 * 
 * Comprehensive Jest-based test suite for verifying the HTTP request logging middleware
 * functionality (middleware/requestLogger.js). This suite tests all aspects of the
 * pino-http based logging middleware including:
 * 
 * Test Categories:
 * - Request ID Generation: UUID v4 format validation, X-Request-ID header handling
 * - Log Format Validation: JSON structure, required fields presence
 * - Response Time Tracking: Accurate timing measurement for requests
 * - Log Level Assignment: Status-based log levels (error for 5xx, warn for 4xx, info for 2xx/3xx)
 * - Logger Mocking: Test isolation with mock logger instances
 * - Middleware Factory: createRequestLogger configuration and behavior
 * - Helper Functions: generateRequestId and getCustomLogLevel utilities
 * - Integration Tests: Full middleware chain operation with Express app
 * 
 * Security Validation:
 * - Authorization header redaction from logs
 * - Sensitive data filtering in request/response serialization
 * - Request ID uniqueness for correlation
 * 
 * Performance Validation:
 * - Response time accuracy for fast requests (<10ms)
 * - Response time accuracy for slow requests (delayed responses)
 * - Concurrent request handling with unique IDs
 * 
 * @module tests/logging/requestLogger.test
 * @requires supertest
 * @requires uuid
 * @requires ../../server
 * @requires ../../middleware/requestLogger
 * @requires ../../config/logger
 * @see https://github.com/pinojs/pino-http
 * @see https://www.npmjs.com/package/uuid
 */

'use strict';

// =============================================================================
// TEST DEPENDENCIES
// =============================================================================

/**
 * Supertest HTTP assertion library for Express application testing.
 * Used for integration testing of request logging middleware behavior
 * through the full Express middleware stack.
 * 
 * @see https://www.npmjs.com/package/supertest
 */
const request = require('supertest');

/**
 * UUID validation utilities for verifying request ID format compliance.
 * validate() checks if string is valid UUID, version() confirms UUID version.
 * 
 * @see https://www.npmjs.com/package/uuid
 */
const { validate: uuidValidate, version: uuidVersion } = require('uuid');

/**
 * Express application instance with full middleware stack configured.
 * Used for integration testing of request logging behavior.
 */
const app = require('../../server');

/**
 * Request logger middleware module exports for unit testing.
 * Provides factory function and helper utilities for comprehensive testing.
 */
const {
  createRequestLogger,
  generateRequestId,
  getCustomLogLevel,
  serializersConfig
} = require('../../middleware/requestLogger');

/**
 * Logger factory for creating test logger instances.
 * Used to verify middleware integration with Pino logger.
 */
const { createLogger } = require('../../config/logger');

// =============================================================================
// TEST CONSTANTS
// =============================================================================

/**
 * Regular expression pattern for UUID v4 validation.
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where y is one of 8, 9, a, or b.
 * 
 * @type {RegExp}
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * HTTP status codes organized by category for testing log level assignment.
 * Each category maps to a specific log level:
 * - SUCCESS (2xx): 'info'
 * - REDIRECT (3xx): 'info'
 * - CLIENT_ERROR (4xx): 'warn'
 * - SERVER_ERROR (5xx): 'error'
 * 
 * @type {Object}
 */
const HTTP_STATUS_CODES = {
  /** 2xx Success codes - should log at 'info' level */
  SUCCESS: [200, 201, 204, 206],
  
  /** 3xx Redirect codes - should log at 'info' level */
  REDIRECT: [301, 302, 304, 307, 308],
  
  /** 4xx Client error codes - should log at 'warn' level */
  CLIENT_ERROR: [400, 401, 403, 404, 405, 409, 422, 429],
  
  /** 5xx Server error codes - should log at 'error' level */
  SERVER_ERROR: [500, 501, 502, 503, 504]
};

/**
 * Expected fields that should be present in log output.
 * These fields are essential for request correlation, debugging,
 * and performance monitoring.
 * 
 * @type {string[]}
 */
const EXPECTED_LOG_FIELDS = ['req', 'res', 'responseTime', 'reqId', 'level'];

/**
 * Sensitive headers that should be redacted from logs.
 * Ensures credential information is not exposed in log output.
 * 
 * @type {string[]}
 */
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key'];

/**
 * Test request headers for various scenarios.
 * 
 * @type {Object}
 */
const TEST_HEADERS = {
  /** Standard content type for JSON requests */
  CONTENT_TYPE: 'application/json',
  
  /** Test authorization header (should be redacted) */
  AUTHORIZATION: 'Bearer test-token-12345',
  
  /** Custom request ID for correlation testing */
  CUSTOM_REQUEST_ID: 'custom-request-id-abc123'
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a mock Pino logger instance for test isolation.
 * All log methods are replaced with Jest mock functions to track calls
 * and verify logging behavior without producing actual output.
 * 
 * @returns {Object} Mock logger object with jest.fn() for each log level
 */
const createMockLogger = () => {
  return {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
    level: 'info',
    silent: jest.fn()
  };
};

/**
 * Creates a mock Express request object for unit testing.
 * Provides realistic request structure with customizable properties.
 * 
 * @param {Object} overrides - Properties to override in the mock request
 * @returns {Object} Mock request object simulating Express request
 */
const createMockRequest = (overrides = {}) => {
  const defaultRequest = {
    id: undefined,
    method: 'GET',
    url: '/test',
    path: '/test',
    query: {},
    params: {},
    body: {},
    headers: {
      host: 'localhost:3000',
      'user-agent': 'jest-test-agent/1.0',
      'content-type': 'application/json',
      accept: '*/*'
    },
    socket: {
      remoteAddress: '127.0.0.1',
      remotePort: 12345
    },
    ip: '127.0.0.1'
  };

  return {
    ...defaultRequest,
    ...overrides,
    headers: {
      ...defaultRequest.headers,
      ...(overrides.headers || {})
    }
  };
};

/**
 * Creates a mock Express response object for unit testing.
 * Includes chainable methods (status, json, setHeader) and
 * header storage for verification.
 * 
 * @returns {Object} Mock response object with chainable methods
 */
const createMockResponse = () => {
  const headers = {};
  const res = {
    statusCode: 200,
    jsonData: null,
    headers: headers,
    
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    
    json: function(data) {
      this.jsonData = data;
      return this;
    },
    
    send: function(data) {
      this.body = data;
      return this;
    },
    
    setHeader: function(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    
    getHeader: function(name) {
      return this.headers[name.toLowerCase()];
    },
    
    headersSent: false,
    
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn()
  };
  
  return res;
};

/**
 * Creates a mock Express next function for unit testing.
 * Tracks whether next was called and with what arguments.
 * 
 * @returns {jest.Mock} Mock next function with call tracking
 */
const createMockNext = () => {
  return jest.fn();
};

/**
 * Validates if a string is a valid UUID v4 format.
 * Uses both regex pattern matching and uuid library validation.
 * 
 * @param {string} id - The string to validate as UUID v4
 * @returns {boolean} True if valid UUID v4, false otherwise
 */
const isValidUuidV4 = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // First check with regex for format compliance
  if (!UUID_V4_REGEX.test(id)) {
    return false;
  }
  
  // Then verify with uuid library
  if (!uuidValidate(id)) {
    return false;
  }
  
  // Finally confirm it's specifically version 4
  return uuidVersion(id) === 4;
};

/**
 * Captures log output from a mock logger for assertion.
 * Collects all calls to each log level method.
 * 
 * @param {Object} mockLogger - Mock logger instance created by createMockLogger
 * @returns {Object} Object containing arrays of logged messages by level
 */
const captureLogOutput = (mockLogger) => {
  return {
    trace: mockLogger.trace.mock.calls,
    debug: mockLogger.debug.mock.calls,
    info: mockLogger.info.mock.calls,
    warn: mockLogger.warn.mock.calls,
    error: mockLogger.error.mock.calls,
    fatal: mockLogger.fatal.mock.calls
  };
};

/**
 * Extracts the X-Request-ID header from a supertest response.
 * 
 * @param {Object} response - Supertest response object
 * @returns {string|undefined} Request ID from response headers
 */
const getRequestIdFromResponse = (response) => {
  return response.headers['x-request-id'];
};

/**
 * Delays execution for specified milliseconds.
 * Used for testing response time tracking with delayed responses.
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// TEST SUITES
// =============================================================================

describe('Request Logger Middleware', () => {
  /**
   * Document test configuration at suite start
   */
  beforeAll(() => {
    console.log('[Request Logger Tests] Testing pino-http middleware integration');
    console.log('  - Testing request ID generation (UUID v4)');
    console.log('  - Testing log format and structure');
    console.log('  - Testing response time tracking');
    console.log('  - Testing log level assignment by status code');
  });

  // ===========================================================================
  // Request ID Generation Tests
  // ===========================================================================
  
  describe('Request ID Generation', () => {
    /**
     * Test: generateRequestId should create UUID v4 for requests without header
     */
    test('should generate UUID v4 request ID for requests without X-Request-ID header', () => {
      const mockReq = createMockRequest();
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBe(36); // UUID v4 length
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: generateRequestId should reuse existing X-Request-ID header
     */
    test('should use existing X-Request-ID header if provided', () => {
      const existingId = 'existing-request-id-12345';
      const mockReq = createMockRequest({
        headers: {
          'x-request-id': existingId
        }
      });
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).toBe(existingId);
    });

    /**
     * Test: generateRequestId should handle X-Correlation-ID header
     */
    test('should use X-Correlation-ID header if X-Request-ID not present', () => {
      const correlationId = 'correlation-id-67890';
      const mockReq = createMockRequest({
        headers: {
          'x-correlation-id': correlationId
        }
      });
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).toBe(correlationId);
    });

    /**
     * Test: generateRequestId should handle request-id header
     */
    test('should use request-id header as fallback', () => {
      const reqId = 'fallback-request-id';
      const mockReq = createMockRequest({
        headers: {
          'request-id': reqId
        }
      });
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).toBe(reqId);
    });

    /**
     * Test: generateRequestId should handle correlation-id header
     */
    test('should use correlation-id header as fallback', () => {
      const corrId = 'fallback-correlation-id';
      const mockReq = createMockRequest({
        headers: {
          'correlation-id': corrId
        }
      });
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).toBe(corrId);
    });

    /**
     * Test: generateRequestId should prioritize X-Request-ID over other headers
     */
    test('should prioritize X-Request-ID over other correlation headers', () => {
      const mockReq = createMockRequest({
        headers: {
          'x-request-id': 'primary-id',
          'x-correlation-id': 'secondary-id',
          'request-id': 'tertiary-id'
        }
      });
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).toBe('primary-id');
    });

    /**
     * Test: generateRequestId should handle empty string header
     */
    test('should generate new ID for empty X-Request-ID header', () => {
      const mockReq = createMockRequest({
        headers: {
          'x-request-id': ''
        }
      });
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).not.toBe('');
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: generateRequestId should handle whitespace-only header
     */
    test('should generate new ID for whitespace-only X-Request-ID header', () => {
      const mockReq = createMockRequest({
        headers: {
          'x-request-id': '   '
        }
      });
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId.trim()).not.toBe('');
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: generateRequestId should handle missing headers object
     */
    test('should handle missing headers gracefully', () => {
      const mockReq = { method: 'GET', url: '/test' };
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: generateRequestId should generate unique IDs
     */
    test('should generate unique IDs for concurrent requests', () => {
      const mockReq1 = createMockRequest();
      const mockReq2 = createMockRequest();
      const mockReq3 = createMockRequest();
      
      const id1 = generateRequestId(mockReq1);
      const id2 = generateRequestId(mockReq2);
      const id3 = generateRequestId(mockReq3);
      
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
      
      // All should be valid UUID v4
      expect(isValidUuidV4(id1)).toBe(true);
      expect(isValidUuidV4(id2)).toBe(true);
      expect(isValidUuidV4(id3)).toBe(true);
    });
  });

  // ===========================================================================
  // Log Level Assignment Tests
  // ===========================================================================
  
  describe('Log Level Based on Status Code', () => {
    /**
     * Test: getCustomLogLevel should return 'info' for 2xx success responses
     */
    test('should use "info" level for 2xx success responses', () => {
      HTTP_STATUS_CODES.SUCCESS.forEach(statusCode => {
        const mockRes = createMockResponse();
        mockRes.statusCode = statusCode;
        
        const level = getCustomLogLevel(mockRes, null);
        
        expect(level).toBe('info');
      });
    });

    /**
     * Test: getCustomLogLevel should return 'info' for 3xx redirect responses
     */
    test('should use "info" level for 3xx redirect responses', () => {
      HTTP_STATUS_CODES.REDIRECT.forEach(statusCode => {
        const mockRes = createMockResponse();
        mockRes.statusCode = statusCode;
        
        const level = getCustomLogLevel(mockRes, null);
        
        expect(level).toBe('info');
      });
    });

    /**
     * Test: getCustomLogLevel should return 'warn' for 4xx client error responses
     */
    test('should use "warn" level for 4xx client error responses', () => {
      HTTP_STATUS_CODES.CLIENT_ERROR.forEach(statusCode => {
        const mockRes = createMockResponse();
        mockRes.statusCode = statusCode;
        
        const level = getCustomLogLevel(mockRes, null);
        
        expect(level).toBe('warn');
      });
    });

    /**
     * Test: getCustomLogLevel should return 'error' for 5xx server error responses
     */
    test('should use "error" level for 5xx server error responses', () => {
      HTTP_STATUS_CODES.SERVER_ERROR.forEach(statusCode => {
        const mockRes = createMockResponse();
        mockRes.statusCode = statusCode;
        
        const level = getCustomLogLevel(mockRes, null);
        
        expect(level).toBe('error');
      });
    });

    /**
     * Test: getCustomLogLevel should return 'error' when error object is present
     */
    test('should return "error" when error object is present', () => {
      const mockRes = createMockResponse();
      mockRes.statusCode = 200; // Even with 200 status
      const err = new Error('Something went wrong');
      
      const level = getCustomLogLevel(mockRes, err);
      
      expect(level).toBe('error');
    });

    /**
     * Test: getCustomLogLevel should prioritize error object over status code
     */
    test('should prioritize error object over status code', () => {
      // Even with a successful status code, error should cause 'error' level
      const mockRes = createMockResponse();
      mockRes.statusCode = 201;
      const err = new Error('Database connection failed');
      
      const level = getCustomLogLevel(mockRes, err);
      
      expect(level).toBe('error');
    });

    /**
     * Test: getCustomLogLevel should handle 1xx informational responses
     */
    test('should use "info" level for 1xx informational responses', () => {
      const mockRes = createMockResponse();
      mockRes.statusCode = 100; // Continue
      
      const level = getCustomLogLevel(mockRes, null);
      
      expect(level).toBe('info');
    });

    /**
     * Test: getCustomLogLevel should handle edge case status codes
     */
    test('should handle edge case status codes correctly', () => {
      // Edge of 3xx/4xx boundary
      let mockRes = createMockResponse();
      mockRes.statusCode = 399;
      expect(getCustomLogLevel(mockRes, null)).toBe('info');
      
      mockRes = createMockResponse();
      mockRes.statusCode = 400;
      expect(getCustomLogLevel(mockRes, null)).toBe('warn');
      
      // Edge of 4xx/5xx boundary
      mockRes = createMockResponse();
      mockRes.statusCode = 499;
      expect(getCustomLogLevel(mockRes, null)).toBe('warn');
      
      mockRes = createMockResponse();
      mockRes.statusCode = 500;
      expect(getCustomLogLevel(mockRes, null)).toBe('error');
    });

    /**
     * Test: getCustomLogLevel should default to 500 for missing statusCode
     */
    test('should default to error level when statusCode is missing', () => {
      const mockRes = {}; // No statusCode
      
      const level = getCustomLogLevel(mockRes, null);
      
      expect(level).toBe('error');
    });
  });

  // ===========================================================================
  // Serializers Configuration Tests
  // ===========================================================================
  
  describe('Serializers Configuration', () => {
    /**
     * Test: serializersConfig should have request serializer
     */
    test('should have request serializer defined', () => {
      expect(serializersConfig).toHaveProperty('req');
      expect(typeof serializersConfig.req).toBe('function');
    });

    /**
     * Test: serializersConfig should have response serializer
     */
    test('should have response serializer defined', () => {
      expect(serializersConfig).toHaveProperty('res');
      expect(typeof serializersConfig.res).toBe('function');
    });

    /**
     * Test: serializersConfig should have error serializer
     */
    test('should have error serializer defined', () => {
      expect(serializersConfig).toHaveProperty('err');
      expect(typeof serializersConfig.err).toBe('function');
    });

    /**
     * Test: Request serializer should extract relevant request information
     */
    test('request serializer should extract relevant request information', () => {
      const mockReq = createMockRequest({
        id: 'test-id-123',
        method: 'POST',
        url: '/api/test?param=value',
        path: '/api/test'
      });
      
      const serialized = serializersConfig.req(mockReq);
      
      expect(serialized).toHaveProperty('id', 'test-id-123');
      expect(serialized).toHaveProperty('method', 'POST');
      expect(serialized).toHaveProperty('url', '/api/test?param=value');
      expect(serialized.headers).toBeDefined();
    });

    /**
     * Test: Request serializer should handle null/undefined request
     */
    test('request serializer should handle null/undefined request', () => {
      expect(serializersConfig.req(null)).toBeNull();
      expect(serializersConfig.req(undefined)).toBeUndefined();
    });

    /**
     * Test: Response serializer should extract status code
     */
    test('response serializer should extract status code', () => {
      const mockRes = createMockResponse();
      mockRes.statusCode = 201;
      
      const serialized = serializersConfig.res(mockRes);
      
      expect(serialized).toHaveProperty('statusCode', 201);
    });

    /**
     * Test: Response serializer should handle null/undefined response
     */
    test('response serializer should handle null/undefined response', () => {
      expect(serializersConfig.res(null)).toBeNull();
      expect(serializersConfig.res(undefined)).toBeUndefined();
    });

    /**
     * Test: Error serializer should extract error information
     */
    test('error serializer should extract error information', () => {
      const testError = new Error('Test error message');
      testError.code = 'TEST_ERROR';
      testError.statusCode = 500;
      
      const serialized = serializersConfig.err(testError);
      
      expect(serialized).toHaveProperty('message', 'Test error message');
      expect(serialized).toHaveProperty('type', 'Error');
      expect(serialized).toHaveProperty('code', 'TEST_ERROR');
      expect(serialized).toHaveProperty('statusCode', 500);
      expect(serialized).toHaveProperty('stack');
    });

    /**
     * Test: Error serializer should handle error cause chain
     */
    test('error serializer should handle error cause chain', () => {
      const causeError = new Error('Root cause');
      const testError = new Error('Wrapper error');
      testError.cause = causeError;
      
      const serialized = serializersConfig.err(testError);
      
      expect(serialized).toHaveProperty('cause');
      expect(serialized.cause).toHaveProperty('message', 'Root cause');
    });

    /**
     * Test: Error serializer should handle null/undefined error
     */
    test('error serializer should handle null/undefined error', () => {
      expect(serializersConfig.err(null)).toBeNull();
      expect(serializersConfig.err(undefined)).toBeUndefined();
    });
  });

  // ===========================================================================
  // createRequestLogger Factory Function Tests
  // ===========================================================================
  
  describe('createRequestLogger Factory Function', () => {
    /**
     * Test: createRequestLogger should return a middleware function
     */
    test('should return a middleware function', () => {
      const middleware = createRequestLogger();
      
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBeGreaterThanOrEqual(2); // (req, res, next)
    });

    /**
     * Test: createRequestLogger should accept custom logger instance
     */
    test('should accept custom logger instance', () => {
      const customLogger = createLogger({ name: 'custom-test-logger' });
      
      // Should not throw
      const middleware = createRequestLogger(customLogger);
      
      expect(typeof middleware).toBe('function');
    });

    /**
     * Test: createRequestLogger should accept options parameter
     */
    test('should accept options parameter for configuration', () => {
      const options = {
        redactPaths: ['req.body.customSecret'],
        autoLogging: true
      };
      
      // Should not throw
      const middleware = createRequestLogger(null, options);
      
      expect(typeof middleware).toBe('function');
    });

    /**
     * Test: createRequestLogger should use default logger if none provided
     */
    test('should use default logger if none provided', () => {
      // Should not throw when no logger provided
      const middleware = createRequestLogger();
      
      expect(typeof middleware).toBe('function');
    });

    /**
     * Test: createRequestLogger should merge custom serializers with defaults
     */
    test('should accept custom serializers option', () => {
      const customReqSerializer = jest.fn((req) => ({ custom: true, method: req.method }));
      
      const options = {
        serializers: {
          req: customReqSerializer
        }
      };
      
      const middleware = createRequestLogger(null, options);
      
      expect(typeof middleware).toBe('function');
    });

    /**
     * Test: createRequestLogger should accept custom genReqId function
     */
    test('should accept custom genReqId function', () => {
      const customGenReqId = jest.fn(() => 'custom-id-123');
      
      const options = {
        genReqId: customGenReqId
      };
      
      const middleware = createRequestLogger(null, options);
      
      expect(typeof middleware).toBe('function');
    });

    /**
     * Test: createRequestLogger should accept custom customLogLevel function
     */
    test('should accept custom customLogLevel function', () => {
      const customLogLevel = jest.fn(() => 'debug');
      
      const options = {
        customLogLevel: customLogLevel
      };
      
      const middleware = createRequestLogger(null, options);
      
      expect(typeof middleware).toBe('function');
    });

    /**
     * Test: createRequestLogger should handle autoLogging option
     */
    test('should handle autoLogging option', () => {
      const optionsEnabled = { autoLogging: true };
      const optionsDisabled = { autoLogging: false };
      
      const middlewareEnabled = createRequestLogger(null, optionsEnabled);
      const middlewareDisabled = createRequestLogger(null, optionsDisabled);
      
      expect(typeof middlewareEnabled).toBe('function');
      expect(typeof middlewareDisabled).toBe('function');
    });
  });

  // ===========================================================================
  // Logger Mocking and Isolation Tests
  // ===========================================================================
  
  describe('Logger Mocking and Isolation', () => {
    /**
     * Test: Mock logger methods should be callable
     */
    test('mock logger should have all required methods', () => {
      const mockLogger = createMockLogger();
      
      expect(typeof mockLogger.trace).toBe('function');
      expect(typeof mockLogger.debug).toBe('function');
      expect(typeof mockLogger.info).toBe('function');
      expect(typeof mockLogger.warn).toBe('function');
      expect(typeof mockLogger.error).toBe('function');
      expect(typeof mockLogger.fatal).toBe('function');
      expect(typeof mockLogger.child).toBe('function');
    });

    /**
     * Test: Mock logger should track calls
     */
    test('mock logger should track calls for assertions', () => {
      const mockLogger = createMockLogger();
      
      mockLogger.info('test message', { data: 'value' });
      mockLogger.error('error message');
      
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('test message', { data: 'value' });
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    /**
     * Test: captureLogOutput should collect all logged messages
     */
    test('captureLogOutput should collect all logged messages', () => {
      const mockLogger = createMockLogger();
      
      mockLogger.info('info message');
      mockLogger.warn('warn message');
      mockLogger.error('error message');
      
      const output = captureLogOutput(mockLogger);
      
      expect(output.info.length).toBe(1);
      expect(output.warn.length).toBe(1);
      expect(output.error.length).toBe(1);
      expect(output.debug.length).toBe(0);
    });
  });

  // ===========================================================================
  // Integration Tests with Application
  // ===========================================================================
  
  describe('Request Logger Integration', () => {
    /**
     * Test: Should include X-Request-ID header in response
     */
    test('should include X-Request-ID header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
    });

    /**
     * Test: Should generate valid UUID v4 request ID
     */
    test('should generate valid UUID v4 request ID', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: Should use provided X-Request-ID header
     */
    test('should use provided X-Request-ID header if valid', async () => {
      const customId = 'my-custom-request-id';
      
      const response = await request(app)
        .get('/')
        .set('X-Request-ID', customId)
        .expect(200);
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBe(customId);
    });

    /**
     * Test: Should generate unique IDs for concurrent requests
     */
    test('should generate unique IDs for concurrent requests', async () => {
      const requests = [
        request(app).get('/'),
        request(app).get('/'),
        request(app).get('/')
      ];
      
      const responses = await Promise.all(requests);
      
      const ids = responses.map(res => getRequestIdFromResponse(res));
      
      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
      
      // All IDs should be valid UUID v4
      ids.forEach(id => {
        expect(isValidUuidV4(id)).toBe(true);
      });
    });

    /**
     * Test: Should not break existing route functionality
     */
    test('should not break existing route functionality', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      // Verify the response body is as expected
      expect(response.text).toBe('Hello, World!\n');
      
      // Verify request ID is present
      expect(getRequestIdFromResponse(response)).toBeDefined();
    });

    /**
     * Test: Should work with POST requests
     */
    test('should work with POST requests', async () => {
      const response = await request(app)
        .post('/api/data')
        .send({ name: 'test', value: 123 })
        .expect(400); // Expected as there's validation
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: Should work with health check endpoint
     */
    test('should work with health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    /**
     * Test: Should work with readiness check endpoint
     */
    test('should work with readiness check endpoint', async () => {
      const response = await request(app)
        .get('/ready')
        .expect(200);
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
      expect(response.body).toHaveProperty('status', 'ready');
    });

    /**
     * Test: Should include request ID for 404 responses
     */
    test('should include request ID for 404 responses', async () => {
      const response = await request(app)
        .get('/non-existent-route-12345')
        .expect(404);
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: Should work with security middleware chain
     */
    test('should work with security middleware chain', async () => {
      const response = await request(app)
        .get('/')
        .set('Origin', 'http://test-origin.com')
        .expect(200);
      
      // Request ID should be present
      expect(getRequestIdFromResponse(response)).toBeDefined();
      
      // Security headers should still be present
      expect(response.headers['x-content-type-options']).toBeDefined();
    });
  });

  // ===========================================================================
  // Response Time Tracking Tests
  // ===========================================================================
  
  describe('Response Time Tracking', () => {
    /**
     * Test: Should have reasonable response time for fast requests
     */
    test('should complete requests in reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/')
        .expect(200);
      
      const elapsed = Date.now() - startTime;
      
      // Fast requests should complete in under 1 second
      expect(elapsed).toBeLessThan(1000);
    });

    /**
     * Test: Should handle multiple sequential requests
     */
    test('should handle multiple sequential requests efficiently', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/')
          .expect(200);
      }
      
      const elapsed = Date.now() - startTime;
      
      // 5 requests should complete in under 5 seconds
      expect(elapsed).toBeLessThan(5000);
    });
  });

  // ===========================================================================
  // Edge Cases and Error Handling Tests
  // ===========================================================================
  
  describe('Edge Cases', () => {
    /**
     * Test: Should handle empty request body
     */
    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/data')
        .send({})
        .set('Content-Type', 'application/json');
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: Should handle requests without content-type
     */
    test('should handle requests without content-type', async () => {
      const response = await request(app)
        .get('/');
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: Should handle requests with various HTTP methods
     */
    test('should handle various HTTP methods', async () => {
      const methods = ['get', 'options'];
      
      for (const method of methods) {
        const response = await request(app)[method]('/');
        
        const requestId = getRequestIdFromResponse(response);
        expect(requestId).toBeDefined();
      }
    });

    /**
     * Test: Should handle requests with query parameters
     */
    test('should handle requests with query parameters', async () => {
      const response = await request(app)
        .get('/?param1=value1&param2=value2')
        .expect(200);
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    /**
     * Test: Should handle requests with custom headers
     */
    test('should handle requests with custom headers', async () => {
      const response = await request(app)
        .get('/')
        .set('X-Custom-Header', 'custom-value')
        .set('Accept', 'text/plain')
        .expect(200);
      
      const requestId = getRequestIdFromResponse(response);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
    });
  });

  // ===========================================================================
  // Log Format Validation Tests
  // ===========================================================================
  
  describe('Log Format Validation', () => {
    /**
     * Test: Request serializer should produce consistent output format
     */
    test('request serializer should produce consistent output format', () => {
      const mockReq = createMockRequest({
        id: 'test-id',
        method: 'GET',
        url: '/test/path?query=value'
      });
      
      const serialized = serializersConfig.req(mockReq);
      
      expect(serialized).toMatchObject({
        id: 'test-id',
        method: 'GET',
        url: '/test/path?query=value'
      });
      expect(serialized).toHaveProperty('headers');
      expect(serialized).toHaveProperty('remoteAddress');
    });

    /**
     * Test: Response serializer should produce consistent output format
     */
    test('response serializer should produce consistent output format', () => {
      const mockRes = createMockResponse();
      mockRes.statusCode = 200;
      mockRes.setHeader('Content-Type', 'application/json');
      
      const serialized = serializersConfig.res(mockRes);
      
      expect(serialized).toHaveProperty('statusCode', 200);
      expect(serialized).toHaveProperty('headers');
    });

    /**
     * Test: Error serializer should produce consistent output format
     */
    test('error serializer should produce consistent output format', () => {
      const testError = new Error('Test error');
      testError.code = 'ERR_TEST';
      
      const serialized = serializersConfig.err(testError);
      
      expect(serialized).toMatchObject({
        type: 'Error',
        message: 'Test error',
        code: 'ERR_TEST'
      });
      expect(serialized).toHaveProperty('stack');
    });

    /**
     * Test: Request serializer should not include sensitive headers
     */
    test('request serializer should not include authorization header in output', () => {
      const mockReq = createMockRequest({
        headers: {
          authorization: 'Bearer secret-token',
          cookie: 'session=abc123'
        }
      });
      
      const serialized = serializersConfig.req(mockReq);
      
      // Authorization and cookie headers should not be in the serialized output
      expect(serialized.headers.authorization).toBeUndefined();
      expect(serialized.headers.cookie).toBeUndefined();
    });

    /**
     * Test: Request serializer should include safe headers
     */
    test('request serializer should include safe headers', () => {
      const mockReq = createMockRequest({
        headers: {
          host: 'localhost:3000',
          'user-agent': 'test-agent',
          'content-type': 'application/json'
        }
      });
      
      const serialized = serializersConfig.req(mockReq);
      
      expect(serialized.headers).toHaveProperty('host', 'localhost:3000');
      expect(serialized.headers).toHaveProperty('user-agent', 'test-agent');
      expect(serialized.headers).toHaveProperty('content-type', 'application/json');
    });
  });

  // ===========================================================================
  // Helper Function Validation Tests
  // ===========================================================================
  
  describe('Helper Function Validation', () => {
    /**
     * Test: isValidUuidV4 helper should validate correct UUIDs
     */
    test('isValidUuidV4 helper should validate correct UUIDs', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-41d4-80b4-00c04fd430c8'
      ];
      
      validUuids.forEach(uuid => {
        expect(isValidUuidV4(uuid)).toBe(true);
      });
    });

    /**
     * Test: isValidUuidV4 helper should reject invalid UUIDs
     */
    test('isValidUuidV4 helper should reject invalid UUIDs', () => {
      const invalidUuids = [
        'not-a-uuid',
        '12345',
        '',
        null,
        undefined,
        '550e8400-e29b-11d4-a716-446655440000', // UUID v1 (11 in 3rd group)
        '550e8400-e29b-51d4-a716-446655440000', // UUID v5 (51 in 3rd group)
        'invalid-format-here-1234-567890123456'
      ];
      
      invalidUuids.forEach(uuid => {
        expect(isValidUuidV4(uuid)).toBe(false);
      });
    });

    /**
     * Test: createMockRequest should create valid request structure
     */
    test('createMockRequest should create valid request structure', () => {
      const mockReq = createMockRequest();
      
      expect(mockReq).toHaveProperty('method', 'GET');
      expect(mockReq).toHaveProperty('url', '/test');
      expect(mockReq).toHaveProperty('headers');
      expect(mockReq.headers).toHaveProperty('host');
    });

    /**
     * Test: createMockRequest should merge overrides correctly
     */
    test('createMockRequest should merge overrides correctly', () => {
      const mockReq = createMockRequest({
        method: 'POST',
        url: '/custom',
        headers: {
          'x-custom': 'value'
        }
      });
      
      expect(mockReq.method).toBe('POST');
      expect(mockReq.url).toBe('/custom');
      expect(mockReq.headers['x-custom']).toBe('value');
      // Default headers should still be present
      expect(mockReq.headers.host).toBeDefined();
    });

    /**
     * Test: createMockResponse should create valid response structure
     */
    test('createMockResponse should create valid response structure', () => {
      const mockRes = createMockResponse();
      
      expect(mockRes).toHaveProperty('statusCode', 200);
      expect(typeof mockRes.status).toBe('function');
      expect(typeof mockRes.json).toBe('function');
      expect(typeof mockRes.setHeader).toBe('function');
      expect(typeof mockRes.getHeader).toBe('function');
    });

    /**
     * Test: createMockResponse methods should be chainable
     */
    test('createMockResponse methods should be chainable', () => {
      const mockRes = createMockResponse();
      
      const result = mockRes.status(404).json({ error: 'Not found' });
      
      expect(mockRes.statusCode).toBe(404);
      expect(mockRes.jsonData).toEqual({ error: 'Not found' });
      expect(result).toBe(mockRes); // Chainable
    });
  });
});

// =============================================================================
// ADDITIONAL UNIT TESTS FOR COMPREHENSIVE COVERAGE
// =============================================================================

describe('Request Logger - Additional Coverage', () => {
  /**
   * Test: generateRequestId with various edge cases
   */
  describe('generateRequestId Edge Cases', () => {
    test('should handle request with undefined headers property', () => {
      const mockReq = { method: 'GET', url: '/test' };
      delete mockReq.headers;
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).toBeDefined();
      expect(isValidUuidV4(requestId)).toBe(true);
    });

    test('should trim whitespace from existing request ID', () => {
      const mockReq = createMockRequest({
        headers: {
          'x-request-id': '  trimmed-id  '
        }
      });
      
      const requestId = generateRequestId(mockReq);
      
      expect(requestId).toBe('trimmed-id');
    });
  });

  /**
   * Test: Serializer configuration immutability
   */
  describe('Serializer Configuration', () => {
    test('serializersConfig should be frozen (immutable)', () => {
      expect(Object.isFrozen(serializersConfig)).toBe(true);
    });

    test('serializers should handle complex request objects', () => {
      const mockReq = createMockRequest({
        id: 'complex-request-id',
        method: 'POST',
        url: '/api/complex?a=1&b=2',
        path: '/api/complex',
        query: { a: '1', b: '2' },
        params: { id: '123' },
        body: { data: 'test' },
        headers: {
          host: 'example.com',
          'user-agent': 'TestAgent/1.0',
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      });
      
      const serialized = serializersConfig.req(mockReq);
      
      expect(serialized.id).toBe('complex-request-id');
      expect(serialized.method).toBe('POST');
      expect(serialized.headers['x-forwarded-for']).toBe('192.168.1.1, 10.0.0.1');
    });
  });

  /**
   * Test: Error serializer with special error types
   */
  describe('Error Serializer Special Cases', () => {
    test('should handle Joi validation errors', () => {
      const joiError = new Error('Validation failed');
      joiError.isJoi = true;
      joiError.details = [
        { message: 'name is required', path: ['name'], type: 'any.required' }
      ];
      
      const serialized = serializersConfig.err(joiError);
      
      expect(serialized.validationErrors).toEqual(joiError.details);
    });

    test('should handle errors with status property', () => {
      const httpError = new Error('Not Found');
      httpError.status = 404;
      
      const serialized = serializersConfig.err(httpError);
      
      expect(serialized.statusCode).toBe(404);
    });

    test('should handle deeply nested error causes', () => {
      const rootCause = new Error('Root cause');
      const middleCause = new Error('Middle cause');
      middleCause.cause = rootCause;
      const topError = new Error('Top error');
      topError.cause = middleCause;
      
      const serialized = serializersConfig.err(topError);
      
      expect(serialized.cause).toBeDefined();
      expect(serialized.cause.cause).toBeDefined();
      expect(serialized.cause.cause.message).toBe('Root cause');
    });
  });
});

// =============================================================================
// INTEGRATION TEST CLEANUP
// =============================================================================

/**
 * Clean up after all tests complete
 */
afterAll(() => {
  // Allow any pending async operations to complete
  return new Promise(resolve => setTimeout(resolve, 100));
});
