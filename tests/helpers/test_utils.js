/**
 * @fileoverview Shared test utilities module providing reusable helper functions
 * for all unit tests. Exports case-insensitive header checking functions,
 * environment variable management functions, and console mock utilities.
 * 
 * These utilities are extracted from established patterns in:
 * - tests/security/test_headers.js (header validation functions)
 * - tests/security/test_rate_limit.js (environment management patterns)
 * 
 * @module tests/helpers/test_utils
 * 
 * @description Provides the following utility categories:
 * - Header Utilities: hasHeader, getHeader, validateSecurityHeaders
 * - Environment Utilities: storeEnv, restoreEnv
 * - Console Mock Utilities: createMockConsole, restoreMockConsole
 * 
 * @author Blitzy Test Team
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Using header utilities
 * const { hasHeader, getHeader } = require('../helpers/test_utils');
 * const hasContentType = hasHeader(response.headers, 'Content-Type');
 * const contentTypeValue = getHeader(response.headers, 'Content-Type');
 * 
 * @example
 * // Using environment utilities
 * const { storeEnv, restoreEnv } = require('../helpers/test_utils');
 * let originalEnv;
 * beforeAll(() => { originalEnv = storeEnv(); });
 * afterAll(() => { restoreEnv(originalEnv); });
 * 
 * @example
 * // Using console mock utilities
 * const { createMockConsole, restoreMockConsole } = require('../helpers/test_utils');
 * let mocks;
 * beforeEach(() => { mocks = createMockConsole(); });
 * afterEach(() => { restoreMockConsole(mocks); });
 * expect(mocks.mockLog).toHaveBeenCalledWith('expected message');
 */

'use strict';

// =============================================================================
// Header Utility Functions
// =============================================================================

/**
 * Validates that a specific header exists in the response.
 * Performs case-insensitive comparison of header names, as HTTP headers
 * are case-insensitive per RFC 7230.
 * 
 * @param {Object} headers - Response headers object from supertest/http response
 * @param {string} headerName - Name of the header to check (case-insensitive)
 * @returns {boolean} True if header exists, false otherwise
 * 
 * @example
 * // Check if Content-Type header exists
 * const exists = hasHeader(response.headers, 'Content-Type');
 * expect(exists).toBe(true);
 * 
 * @example
 * // Case-insensitive matching works
 * const exists = hasHeader(response.headers, 'content-type');
 * expect(exists).toBe(true);
 */
function hasHeader(headers, headerName) {
  const lowerName = headerName.toLowerCase();
  return Object.keys(headers).some(key => key.toLowerCase() === lowerName);
}

/**
 * Gets a header value from response headers (case-insensitive).
 * Returns the value of the first header that matches the given name
 * in a case-insensitive manner.
 * 
 * @param {Object} headers - Response headers object from supertest/http response
 * @param {string} headerName - Name of the header to get (case-insensitive)
 * @returns {string|undefined} Header value if found, undefined if not found
 * 
 * @example
 * // Get Content-Type header value
 * const contentType = getHeader(response.headers, 'Content-Type');
 * expect(contentType).toBe('application/json; charset=utf-8');
 * 
 * @example
 * // Returns undefined for missing headers
 * const missing = getHeader(response.headers, 'X-Custom-Header');
 * expect(missing).toBeUndefined();
 */
function getHeader(headers, headerName) {
  const lowerName = headerName.toLowerCase();
  const key = Object.keys(headers).find(k => k.toLowerCase() === lowerName);
  return key ? headers[key] : undefined;
}

/**
 * Validates multiple security headers exist in response.
 * Checks an array of expected header names against the response headers
 * and returns a detailed validation result.
 * 
 * @param {Object} headers - Response headers object from supertest/http response
 * @param {string[]} expectedHeaders - Array of expected header names to check
 * @returns {Object} Validation result object with the following properties:
 *   - allPresent {boolean}: True if all expected headers are present
 *   - missingHeaders {string[]}: Array of header names that were not found
 *   - presentHeaders {string[]}: Array of header names that were found
 * 
 * @example
 * // Validate multiple security headers
 * const result = validateSecurityHeaders(response.headers, [
 *   'X-Frame-Options',
 *   'X-Content-Type-Options',
 *   'Strict-Transport-Security'
 * ]);
 * expect(result.allPresent).toBe(true);
 * expect(result.missingHeaders).toHaveLength(0);
 * 
 * @example
 * // Handle missing headers
 * const result = validateSecurityHeaders(response.headers, ['X-Custom-Header']);
 * if (!result.allPresent) {
 *   console.log('Missing headers:', result.missingHeaders);
 * }
 */
function validateSecurityHeaders(headers, expectedHeaders) {
  const missingHeaders = [];
  const presentHeaders = [];
  
  expectedHeaders.forEach(headerName => {
    if (hasHeader(headers, headerName)) {
      presentHeaders.push(headerName);
    } else {
      missingHeaders.push(headerName);
    }
  });
  
  return {
    allPresent: missingHeaders.length === 0,
    missingHeaders,
    presentHeaders
  };
}

// =============================================================================
// Environment Variable Utility Functions
// =============================================================================

/**
 * Stores the current process.env for later restoration.
 * Creates a shallow copy of the current environment variables,
 * which can be restored later using restoreEnv().
 * 
 * This pattern is essential for test isolation when tests need to
 * modify environment variables without affecting other tests.
 * 
 * @returns {Object} Shallow copy of the current process.env object
 * 
 * @example
 * // Store environment in beforeAll hook
 * let originalEnv;
 * beforeAll(() => {
 *   originalEnv = storeEnv();
 *   process.env.NODE_ENV = 'test';
 *   process.env.PORT = '4000';
 * });
 * 
 * @see restoreEnv
 */
function storeEnv() {
  return { ...process.env };
}

/**
 * Restores process.env to a previously stored state.
 * Replaces the entire process.env object with the provided originalEnv,
 * effectively reverting all environment variable changes made during tests.
 * 
 * This function should be called in afterAll or afterEach hooks to ensure
 * test isolation and prevent environment pollution between test suites.
 * 
 * @param {Object} originalEnv - Previously stored environment object from storeEnv()
 * @returns {void}
 * 
 * @example
 * // Restore environment in afterAll hook
 * afterAll(() => {
 *   restoreEnv(originalEnv);
 * });
 * 
 * @example
 * // Complete test lifecycle with environment isolation
 * describe('Environment-dependent tests', () => {
 *   let originalEnv;
 *   
 *   beforeAll(() => {
 *     originalEnv = storeEnv();
 *     process.env.ENABLE_HTTPS = 'true';
 *   });
 *   
 *   afterAll(() => {
 *     restoreEnv(originalEnv);
 *   });
 *   
 *   it('should use HTTPS configuration', () => {
 *     expect(process.env.ENABLE_HTTPS).toBe('true');
 *   });
 * });
 * 
 * @see storeEnv
 */
function restoreEnv(originalEnv) {
  process.env = originalEnv;
}

// =============================================================================
// Console Mock Utility Functions
// =============================================================================

/**
 * Creates mock functions for console.log and console.error.
 * Stores the original console methods and replaces them with Jest mock functions,
 * allowing tests to verify console output without actual logging.
 * 
 * The returned mocks object contains:
 * - originalLog: Reference to the original console.log function
 * - originalError: Reference to the original console.error function
 * - mockLog: Jest mock function replacing console.log
 * - mockError: Jest mock function replacing console.error
 * 
 * @returns {Object} Mocks object containing original and mock console functions:
 *   - originalLog {Function}: Original console.log reference
 *   - originalError {Function}: Original console.error reference
 *   - mockLog {Function}: Jest mock function for console.log
 *   - mockError {Function}: Jest mock function for console.error
 * 
 * @example
 * // Create mocks and verify console output
 * const mocks = createMockConsole();
 * 
 * // Code that calls console.log
 * console.log('Server started on port 3000');
 * 
 * // Verify the mock was called
 * expect(mocks.mockLog).toHaveBeenCalledWith('Server started on port 3000');
 * 
 * // Clean up
 * restoreMockConsole(mocks);
 * 
 * @example
 * // Use in test lifecycle hooks
 * describe('Server Lifecycle', () => {
 *   let mocks;
 *   
 *   beforeEach(() => {
 *     mocks = createMockConsole();
 *   });
 *   
 *   afterEach(() => {
 *     restoreMockConsole(mocks);
 *   });
 *   
 *   it('should log startup message', () => {
 *     startServer();
 *     expect(mocks.mockLog).toHaveBeenCalled();
 *   });
 * });
 * 
 * @see restoreMockConsole
 */
function createMockConsole() {
  // Store original console methods for restoration
  const originalLog = console.log;
  const originalError = console.error;
  
  // Create Jest mock functions
  const mockLog = jest.fn();
  const mockError = jest.fn();
  
  // Replace console methods with mocks
  console.log = mockLog;
  console.error = mockError;
  
  // Return object containing both originals and mocks
  return {
    originalLog,
    originalError,
    mockLog,
    mockError
  };
}

/**
 * Restores original console.log and console.error methods.
 * Takes the mocks object returned by createMockConsole and restores
 * the original console methods, then clears the mock implementations.
 * 
 * This function should always be called after createMockConsole to ensure
 * proper cleanup and prevent console method pollution between tests.
 * 
 * @param {Object} mocks - Mocks object returned by createMockConsole
 * @param {Function} mocks.originalLog - Original console.log function to restore
 * @param {Function} mocks.originalError - Original console.error function to restore
 * @param {Function} mocks.mockLog - Mock log function to clear
 * @param {Function} mocks.mockError - Mock error function to clear
 * @returns {void}
 * 
 * @example
 * // Restore console methods after test
 * const mocks = createMockConsole();
 * // ... run tests ...
 * restoreMockConsole(mocks);
 * 
 * // console.log and console.error are now restored to original functions
 * 
 * @example
 * // Use in afterEach hook for automatic cleanup
 * afterEach(() => {
 *   restoreMockConsole(mocks);
 * });
 * 
 * @see createMockConsole
 */
function restoreMockConsole(mocks) {
  // Restore original console methods
  console.log = mocks.originalLog;
  console.error = mocks.originalError;
  
  // Clear mock implementations to reset call tracking
  mocks.mockLog.mockClear();
  mocks.mockError.mockClear();
}

// =============================================================================
// Module Exports
// =============================================================================

module.exports = {
  // Header utilities
  hasHeader,
  getHeader,
  validateSecurityHeaders,
  
  // Environment utilities
  storeEnv,
  restoreEnv,
  
  // Console mock utilities
  createMockConsole,
  restoreMockConsole
};
