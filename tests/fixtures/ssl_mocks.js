/**
 * @fileoverview Mock SSL certificate data and paths for HTTPS server testing.
 * This module provides test fixtures for SSL/TLS certificate handling in unit tests,
 * including valid-looking mock certificates, invalid data for error scenarios,
 * and helper functions for simulating file system operations.
 * 
 * Test fixtures support:
 * - HTTPS server startup testing
 * - SSL certificate loading success and failure scenarios
 * - Error handling for ENOENT, malformed certificates, and type errors
 * - Integration with jest.mock() for fs module simulation
 * 
 * @module tests/fixtures/ssl_mocks
 * 
 * @example
 * // Import all fixtures
 * const {
 *   MOCK_SSL_CERTIFICATES,
 *   SSL_MOCK_PATHS,
 *   SSL_NONEXISTENT_PATHS,
 *   INVALID_SSL_DATA,
 *   getMockCertificates,
 *   getMockPaths,
 *   createMockFsReadSync
 * } = require('../fixtures/ssl_mocks');
 * 
 * // Use in jest.mock() setup
 * jest.mock('fs');
 * const fs = require('fs');
 * fs.readFileSync.mockImplementation(createMockFsReadSync({
 *   [SSL_MOCK_PATHS.key]: MOCK_SSL_CERTIFICATES.privateKey,
 *   [SSL_MOCK_PATHS.cert]: MOCK_SSL_CERTIFICATES.certificate
 * }));
 * 
 * @author Blitzy Test Team
 * @version 1.0.0
 * @license MIT
 */

'use strict';

// =============================================================================
// Mock SSL Certificate Data
// =============================================================================

/**
 * Mock SSL certificates with valid PEM format structure.
 * These are NOT cryptographically valid certificates - they are mock data
 * that mimics the correct format for testing file reading and parsing logic.
 * 
 * @constant {Object} MOCK_SSL_CERTIFICATES
 * @property {string} privateKey - Mock RSA private key in PEM format
 * @property {string} certificate - Mock X.509 certificate in PEM format
 */
const MOCK_SSL_CERTIFICATES = {
  /**
   * Mock RSA private key with proper PEM markers and Base64-like content.
   * Used to simulate successful SSL key file reading in tests.
   */
  privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MnXxTz7YquVz0wEB
kN5Rc7kuGQTjGnJP2W7PFgBQ7F3X8V8qbNRqG5T2P3JfqJQyBqBsZPlg+XzWfNlT
X3bCa0B8MHXgJPVsXLXPBBPqA2D9xwVLqQmT5L4hF9rFMH7EqPo3UMHzX7FQklXl
FdGJ8sSHtD7eqJXLmvV3xK6KkQvG0VTFPq0cHEJT0oQxHmzPBgCcL3L7DVjFNxOE
M3Y0QdG0nz7VLgfV8gN0nU0sFMLk5cUfXK7d9cPoJ7t7W3R6BqT8aYl3qWLRZQ0N
xA3FNQrdKLbnXqGUxvG9lGCgN6qLxHPBzj3LCwIDAQABAoIBAEH7bXNVhGvZPL1c
lGZPwFNVpzL0MKHwSK9m3kJBplEfaFEBHLSN0tvB2Q6xPfvLcK9lFHLxPG4J3L5U
DVkpCFVz9SBa0ZVA8Y5hGCM3X5FfLqPxHUBxRGkM2n9F6XnVnBLVhm1x4dR3WFDa
KBLfJ0g+D8xXPE2N3MYxqGS4ULK9xE0VGWxNTqYxlQV6L7t5B8NcqRfL9Q7cCHRL
pSkDHGKLUKGH8hxqGMY9v0KPv4m3XGsYMvN5cLfx6RcX0lM7vVcDn1RCQ7kF4bXH
vBSNz9ANqQv7F9rFBOLKY8l3Y7qCd7kJHLUpCzDN6cF0RPZM3LJNW0REVLjPLCgR
HhQ3QiECgYEA7KPqL4P1JKGBGDQ9m3Y5P3LOfw8l0bQT2FZqBPBYWBqT8ggLFFyS
ByEt7W8fJ7P8tR6M9F4QvE5tvRrZ5Lg1v7RQp8EF0bLd3FBfwjM5r5HQK8G1vhEC
7aMJqvRr7Wz5P3LP0Q5LBk5ChM4kQe5Y3P1s3g1J2AVZ2L5vOKbR2ZsCgYEA4wt8
nM3HvLhXRqQSrRwZ2V0zpbJKHQCBLqUd3bhR5fF3PCQxbM5WTpv8cLmJ1YKPxK1l
c3f6L7v3N3LFBPdTdrgD8bYN2R6m9L4H7zLfvhGW3ggCLRh0LL7W8P0KfwW7cV3t
4KPvJ7VqN9lDYQT3r3LJP2S4K9p0H8LxF4M5L1ECgYB4dkW8D6C7gPm5gQP5Yc3N
Q7Z0F3m9Z0JD1K5v8PLRZF7C3tR2kKL7BgLYW8M1Y5vQ6M8rL3S9TwK5L7vR5QPf
N9F3k5LpYRY9vK8M3gLd7R5qW6J7K9PLR5FqCt3P8F7LK9R5Q7vN3TpM5L7YK9Rq
K3W5tFP8D9NLJ7YR5K8M3wKBgDdL5J7FPL8K9R3tY5vQ6M8rN7F5K9R2Y3QpLj7R
K5M3FP8D7LCt9R5qN3T7M5L8YK9RqK3W5tFP8D9NLJ7YR5K8M3dL5J7FPL8K9R3t
Y5vQ6M8rN7F5K9R2Y3QpLj7RK5M3FP8D7LCt9R5qN3T7M5L8YK9RqK3W5tFP8D9N
LJ7YR5K1AoGBAOcL7D9F5K8M3dL5J7FPL8K9R3tY5vQ6M8rN7F5K9R2Y3QpLj7RK
5M3FP8D7LCt9R5qN3T7M5L8YK9RqK3W5tFP8D9NLJ7YR5K8M3dL5J7FPL8K9R3tY
5vQ6M8rN7F5K9R2Y3QpLj7RK5M3FP8D7LCt9R5qN3T7M5L8YK9RqK3W5tFP8D
-----END RSA PRIVATE KEY-----`,

  /**
   * Mock X.509 certificate with proper PEM markers and Base64-like content.
   * Used to simulate successful SSL certificate file reading in tests.
   */
  certificate: `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0GCSqGSIb3Qq0teleQFTMRMwEQYDVQ
QFEwlteFRlc3RSb290MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC2K5Lft0
lWBEPGOJausQXPT5Ky1Om0p7F5wtn8GXE2O4S5IrenV8M3FQPQH4P4F0HxFGQJz
d3QVH0p/LUP0m3Z9P7gQBT9LMT5vqJQNP8K4H4BQdTpL5Kj7QH0CjQFTMRMwEQY
DVQQFEwlteFRlc3RSb290MIIBPAIDAQABMA0GCSqGSIb3DQEBBQUAA4GBAHL4caE
wXX9P8LxEqJs7P3vLcK9lFHLxPG4J3L5UDVkpCFVz9SBa0ZVA8Y5hGCM3X5FfLq
PxHUBxRGkM2n9F6XnVnBLVhm1x4dR3WFDaKBLfJ0g+D8xXPE2N3MYxqGS4ULK9x
E0VGWxNTqYxlQV6L7t5B8NcqRfL9Q7cCHRLpSkDHGKLUKGH8hxqGMY9v0KPv4m3
XGsYMvN5cLfx6RcX0lM7vVcDn1RCQ7kF4bXHvBSNz9ANqQv7F9rFBOLKY8l3Y7q
Cd7kJHLUpCzDN6cF0RPZM3LJNW0REVLjPLCgRHhQ3QiE=
-----END CERTIFICATE-----`
};

// =============================================================================
// SSL Path Configuration
// =============================================================================

/**
 * Mock SSL file paths that match server.js default path pattern.
 * Used for successful SSL certificate loading scenarios.
 * 
 * @constant {Object} SSL_MOCK_PATHS
 * @property {string} key - Path to mock SSL private key file
 * @property {string} cert - Path to mock SSL certificate file
 */
const SSL_MOCK_PATHS = {
  key: './certs/key.pem',
  cert: './certs/cert.pem'
};

/**
 * SSL file paths that do not exist on the filesystem.
 * Used for ENOENT error scenario testing.
 * 
 * @constant {Object} SSL_NONEXISTENT_PATHS
 * @property {string} key - Non-existent private key path
 * @property {string} cert - Non-existent certificate path
 */
const SSL_NONEXISTENT_PATHS = {
  key: '/nonexistent/path/key.pem',
  cert: '/nonexistent/path/cert.pem'
};

// =============================================================================
// Invalid SSL Data for Error Testing
// =============================================================================

/**
 * Collection of invalid SSL data for testing error handling scenarios.
 * Includes malformed PEM data, empty strings, null values, and incorrect types.
 * 
 * @constant {Object} INVALID_SSL_DATA
 * @property {string} malformedKey - Key string without proper PEM markers
 * @property {string} malformedCert - Certificate string without proper PEM markers
 * @property {string} emptyKey - Empty string for key
 * @property {string} emptyCert - Empty string for certificate
 * @property {null} nullKey - Null value for key
 * @property {null} nullCert - Null value for certificate
 * @property {Buffer} binaryData - Non-string binary data for type checking
 */
const INVALID_SSL_DATA = {
  /**
   * Key data without proper PEM BEGIN/END markers.
   * Should trigger certificate parsing errors.
   */
  malformedKey: 'MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MnXxTz7Yquv',

  /**
   * Certificate data without proper PEM BEGIN/END markers.
   * Should trigger certificate parsing errors.
   */
  malformedCert: 'MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0GCSqGSIb3Qq0tele',

  /**
   * Empty string representing missing key content.
   */
  emptyKey: '',

  /**
   * Empty string representing missing certificate content.
   */
  emptyCert: '',

  /**
   * Null value for key - tests null pointer handling.
   */
  nullKey: null,

  /**
   * Null value for certificate - tests null pointer handling.
   */
  nullCert: null,

  /**
   * Binary data (Buffer) instead of string - tests type validation.
   */
  binaryData: Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Returns the mock SSL certificates object.
 * Convenience function for easy access to mock certificate data in tests.
 * 
 * @function getMockCertificates
 * @returns {Object} Object containing privateKey and certificate PEM strings
 * 
 * @example
 * const { privateKey, certificate } = getMockCertificates();
 * expect(privateKey).toContain('BEGIN RSA PRIVATE KEY');
 */
function getMockCertificates() {
  return MOCK_SSL_CERTIFICATES;
}

/**
 * Returns the mock SSL file paths object.
 * Convenience function for easy access to mock paths in tests.
 * 
 * @function getMockPaths
 * @returns {Object} Object containing key and cert path strings
 * 
 * @example
 * const { key, cert } = getMockPaths();
 * expect(key).toBe('./certs/key.pem');
 */
function getMockPaths() {
  return SSL_MOCK_PATHS;
}

/**
 * Factory function that creates a mock implementation of fs.readFileSync.
 * Returns a function suitable for use with jest.mock() or jest.spyOn().
 * The mock function returns content for known paths and throws ENOENT
 * errors for unknown paths, simulating actual file system behavior.
 * 
 * @function createMockFsReadSync
 * @param {Object} successPaths - Object mapping file paths to their return values
 * @returns {Function} Mock function that simulates fs.readFileSync behavior
 * 
 * @example
 * // Setup mock in test file
 * jest.mock('fs');
 * const fs = require('fs');
 * const mockFsReadSync = createMockFsReadSync({
 *   './certs/key.pem': MOCK_SSL_CERTIFICATES.privateKey,
 *   './certs/cert.pem': MOCK_SSL_CERTIFICATES.certificate
 * });
 * fs.readFileSync.mockImplementation(mockFsReadSync);
 * 
 * @example
 * // Test ENOENT error handling
 * const mockFsReadSync = createMockFsReadSync({});
 * expect(() => mockFsReadSync('/nonexistent/file')).toThrow();
 */
function createMockFsReadSync(successPaths) {
  /**
   * Mock implementation of fs.readFileSync.
   * 
   * @param {string} filePath - Path to the file to read
   * @param {string|Object} [options] - Encoding or options object
   * @returns {string|Buffer} File content if path exists in successPaths
   * @throws {Error} ENOENT error if path not found in successPaths
   */
  return function mockReadFileSync(filePath, options) {
    // Normalize the path for comparison
    const normalizedPath = filePath.toString();
    
    // Check if the path exists in our success paths
    if (Object.prototype.hasOwnProperty.call(successPaths, normalizedPath)) {
      return successPaths[normalizedPath];
    }
    
    // Create ENOENT error for unknown paths
    const error = new Error(`ENOENT: no such file or directory, open '${normalizedPath}'`);
    error.code = 'ENOENT';
    error.errno = -2;
    error.syscall = 'open';
    error.path = normalizedPath;
    
    throw error;
  };
}

// =============================================================================
// Module Exports
// =============================================================================

module.exports = {
  // Certificate data constants
  MOCK_SSL_CERTIFICATES,
  SSL_MOCK_PATHS,
  SSL_NONEXISTENT_PATHS,
  INVALID_SSL_DATA,
  
  // Helper functions
  getMockCertificates,
  getMockPaths,
  createMockFsReadSync
};
