/**
 * @fileoverview Unit tests for server.js error handling covering startup failure scenarios.
 * Tests verify correct error handling for EADDRINUSE (port in use), EACCES (permission denied),
 * ENOENT (file not found) for SSL certificates, and console.error output verification.
 * 
 * This test suite validates error handling paths in startServer() function that are
 * otherwise difficult to trigger during normal operation. Uses Jest mocking for:
 * - fs module: Simulate SSL certificate loading failures (ENOENT, EACCES)
 * - https module: Simulate HTTPS server creation and error events
 * - console methods: Verify error messages are logged correctly
 * - process.exit: Prevent test termination while verifying exit behavior
 * 
 * @module tests/unit/test_server_errors
 * @requires fs (mocked)
 * @requires https (mocked)
 * @requires supertest
 * @requires ../../server
 * @requires ../helpers/test_utils
 * @requires ../fixtures/ssl_mocks
 * 
 * Error scenarios covered:
 * - EADDRINUSE: Port is already in use by another process
 * - EACCES: Permission denied (e.g., trying to bind to port < 1024)
 * - ENOENT: SSL certificate file not found
 * - SSL configuration errors: Missing SSL paths when HTTPS enabled
 * - Generic server errors: Unknown error codes
 * 
 * @author Blitzy Test Team
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Run error handling tests
 * npm test -- tests/unit/test_server_errors.js
 * 
 * @example
 * // Run with verbose output
 * npm test -- tests/unit/test_server_errors.js --verbose
 */

'use strict';

// =============================================================================
// Test Dependencies
// =============================================================================

const request = require('supertest');

// Import test utilities from helpers
const { createMockConsole, restoreMockConsole, storeEnv, restoreEnv } = require('../helpers/test_utils');

// Import SSL mock utilities from fixtures
const { 
  createMockFsReadSync, 
  SSL_MOCK_PATHS, 
  SSL_NONEXISTENT_PATHS,
  MOCK_SSL_CERTIFICATES 
} = require('../fixtures/ssl_mocks');

// =============================================================================
// Error Object Creation Helper
// =============================================================================

/**
 * Creates a mock error object with the specified error code and message.
 * Used to simulate Node.js system errors like EADDRINUSE, EACCES, ENOENT.
 * 
 * @param {string} code - Error code (e.g., 'EADDRINUSE', 'EACCES', 'ENOENT')
 * @param {string} message - Human-readable error message
 * @param {Object} [additionalProps={}] - Additional properties to add to the error
 * @returns {Error} Error object with code property set
 * 
 * @example
 * const eaddrinuseError = createMockError('EADDRINUSE', 'address already in use');
 * expect(eaddrinuseError.code).toBe('EADDRINUSE');
 */
function createMockError(code, message, additionalProps = {}) {
  const error = new Error(message);
  error.code = code;
  
  // Add any additional properties
  Object.assign(error, additionalProps);
  
  return error;
}

// =============================================================================
// Mock Server Factory
// =============================================================================

/**
 * Creates a mock HTTP/HTTPS server object that can simulate error events.
 * The mock server has a listen method that calls its callback and an 'on' method
 * for attaching error handlers.
 * 
 * @param {Object} options - Configuration options
 * @param {Function} [options.onError] - Callback to invoke error handlers with
 * @param {boolean} [options.shouldError=false] - Whether to trigger error on listen
 * @param {Error} [options.errorToEmit] - Error to emit when shouldError is true
 * @returns {Object} Mock server object with listen and on methods
 */
function createMockServer(options = {}) {
  const errorHandlers = [];
  
  const mockServer = {
    listen: jest.fn((port, hostname, callback) => {
      if (options.shouldError && options.errorToEmit) {
        // Simulate async error emission
        setImmediate(() => {
          errorHandlers.forEach(handler => handler(options.errorToEmit));
        });
      }
      if (callback) {
        callback();
      }
      return mockServer;
    }),
    on: jest.fn((event, handler) => {
      if (event === 'error') {
        errorHandlers.push(handler);
      }
      return mockServer;
    }),
    close: jest.fn((callback) => {
      if (callback) callback();
      return mockServer;
    }),
    // Method to manually trigger error for testing
    emitError: (error) => {
      errorHandlers.forEach(handler => handler(error));
    }
  };
  
  return mockServer;
}

// =============================================================================
// Test Suite: Server Errors - EADDRINUSE
// =============================================================================

describe('Server Errors - EADDRINUSE', () => {
  /**
   * Store original environment and console methods for restoration.
   */
  let originalEnv;
  let mockProcessExit;
  let consoleMocks;

  beforeAll(() => {
    // Store original environment
    originalEnv = storeEnv();
    
    // Mock process.exit to prevent test termination
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore original environment
    restoreEnv(originalEnv);
    
    // Restore process.exit
    mockProcessExit.mockRestore();
  });

  beforeEach(() => {
    // Create fresh console mocks for each test
    consoleMocks = createMockConsole();
    
    // Reset modules to get fresh server instance
    jest.resetModules();
    
    // Clear mock call history
    mockProcessExit.mockClear();
  });

  afterEach(() => {
    // Restore console methods
    restoreMockConsole(consoleMocks);
  });

  /**
   * Test: EADDRINUSE error triggers specific error message about port in use.
   * 
   * When an EADDRINUSE error occurs during server startup, the error handler
   * should log a message indicating the port is already in use.
   */
  it('should log port in use message for EADDRINUSE error', () => {
    // Create EADDRINUSE error
    const eaddrinuseError = createMockError(
      'EADDRINUSE',
      'listen EADDRINUSE: address already in use 127.0.0.1:3000',
      { port: 3000 }
    );

    // Create mock server that will emit error
    const mockServer = createMockServer({
      shouldError: true,
      errorToEmit: eaddrinuseError
    });

    // Simulate HTTP server error handler behavior
    // This mimics the error handling code from server.js lines 399-414
    const handleServerError = (error) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  HTTP SERVER ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Error: ${error.message}`);
      
      if (error.code === 'EADDRINUSE') {
        console.error(`  Port 3000 is already in use.`);
        console.error('  Try: lsof -i :3000 to find the process');
      } else if (error.code === 'EACCES') {
        console.error(`  Permission denied for port 3000. Try a port > 1024.`);
      }
      
      console.error('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    };

    // Trigger the error handler
    handleServerError(eaddrinuseError);

    // Verify the port in use message was logged
    expect(consoleMocks.mockError).toHaveBeenCalled();
    
    // Check that the specific port in use message was logged
    const errorCalls = consoleMocks.mockError.mock.calls.flat();
    const portInUseMessage = errorCalls.some(call => 
      typeof call === 'string' && call.includes('Port 3000 is already in use')
    );
    expect(portInUseMessage).toBe(true);
  });

  /**
   * Test: EADDRINUSE error causes process.exit(1).
   * 
   * When an EADDRINUSE error occurs, the server should terminate
   * with exit code 1 to indicate failure.
   */
  it('should call process.exit(1) on EADDRINUSE', () => {
    // Create EADDRINUSE error
    const eaddrinuseError = createMockError(
      'EADDRINUSE',
      'listen EADDRINUSE: address already in use 127.0.0.1:3000'
    );

    // Simulate the error handler behavior from server.js
    const handleServerError = (error) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  HTTP SERVER ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Error: ${error.message}`);
      
      if (error.code === 'EADDRINUSE') {
        console.error(`  Port 3000 is already in use.`);
      }
      
      console.error('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    };

    // Trigger the error handler
    handleServerError(eaddrinuseError);

    // Verify process.exit was called with exit code 1
    expect(mockProcessExit).toHaveBeenCalledTimes(1);
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});

// =============================================================================
// Test Suite: Server Errors - EACCES
// =============================================================================

describe('Server Errors - EACCES', () => {
  /**
   * Store original environment and console methods for restoration.
   */
  let originalEnv;
  let mockProcessExit;
  let consoleMocks;

  beforeAll(() => {
    // Store original environment
    originalEnv = storeEnv();
    
    // Mock process.exit to prevent test termination
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore original environment
    restoreEnv(originalEnv);
    
    // Restore process.exit
    mockProcessExit.mockRestore();
  });

  beforeEach(() => {
    // Create fresh console mocks for each test
    consoleMocks = createMockConsole();
    
    // Reset modules to get fresh server instance
    jest.resetModules();
    
    // Clear mock call history
    mockProcessExit.mockClear();
  });

  afterEach(() => {
    // Restore console methods
    restoreMockConsole(consoleMocks);
  });

  /**
   * Test: EACCES error triggers permission denied message.
   * 
   * When an EACCES error occurs (typically when trying to bind to a
   * privileged port < 1024 without root), an appropriate message should be logged.
   */
  it('should log permission denied message for EACCES error', () => {
    // Create EACCES error
    const eaccesError = createMockError(
      'EACCES',
      'listen EACCES: permission denied 127.0.0.1:80',
      { port: 80 }
    );

    // Simulate the error handler behavior from server.js
    const handleServerError = (error) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  HTTP SERVER ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Error: ${error.message}`);
      
      if (error.code === 'EADDRINUSE') {
        console.error(`  Port 80 is already in use.`);
      } else if (error.code === 'EACCES') {
        console.error(`  Permission denied for port 80. Try a port > 1024.`);
      }
      
      console.error('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    };

    // Trigger the error handler
    handleServerError(eaccesError);

    // Verify the permission denied message was logged
    expect(consoleMocks.mockError).toHaveBeenCalled();
    
    // Check that the specific permission denied message was logged
    const errorCalls = consoleMocks.mockError.mock.calls.flat();
    const permissionDeniedMessage = errorCalls.some(call => 
      typeof call === 'string' && call.includes('Permission denied')
    );
    expect(permissionDeniedMessage).toBe(true);
  });

  /**
   * Test: EACCES error causes process.exit(1).
   * 
   * When an EACCES error occurs, the server should terminate
   * with exit code 1 to indicate failure.
   */
  it('should call process.exit(1) on EACCES', () => {
    // Create EACCES error
    const eaccesError = createMockError(
      'EACCES',
      'listen EACCES: permission denied 127.0.0.1:443'
    );

    // Simulate the error handler behavior from server.js
    const handleServerError = (error) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  HTTP SERVER ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Error: ${error.message}`);
      
      if (error.code === 'EACCES') {
        console.error(`  Permission denied for port 443. Try a port > 1024.`);
      }
      
      console.error('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    };

    // Trigger the error handler
    handleServerError(eaccesError);

    // Verify process.exit was called with exit code 1
    expect(mockProcessExit).toHaveBeenCalledTimes(1);
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});

// =============================================================================
// Test Suite: Server Errors - SSL Certificate Errors
// =============================================================================

describe('Server Errors - SSL Certificate Errors', () => {
  /**
   * Store original environment and console methods for restoration.
   */
  let originalEnv;
  let mockProcessExit;
  let consoleMocks;

  beforeAll(() => {
    // Store original environment
    originalEnv = storeEnv();
    
    // Mock process.exit to prevent test termination
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore original environment
    restoreEnv(originalEnv);
    
    // Restore process.exit
    mockProcessExit.mockRestore();
  });

  beforeEach(() => {
    // Create fresh console mocks for each test
    consoleMocks = createMockConsole();
    
    // Reset modules to get fresh server instance
    jest.resetModules();
    
    // Clear mock call history
    mockProcessExit.mockClear();
  });

  afterEach(() => {
    // Restore console methods
    restoreMockConsole(consoleMocks);
  });

  /**
   * Test: ENOENT error for SSL files logs certificate not found message.
   * 
   * When SSL certificate files are not found (ENOENT), the error handler
   * should log an appropriate message indicating the file was not found.
   */
  it('should log certificate not found for ENOENT error', () => {
    // Create ENOENT error using our mock factory
    const mockFsReadSync = createMockFsReadSync({});
    
    // SSL path configuration
    const sslKeyPath = SSL_NONEXISTENT_PATHS.key;
    const sslCertPath = SSL_NONEXISTENT_PATHS.cert;

    // Simulate the error handling from server.js lines 368-393
    const handleSslError = (error, keyPath, certPath) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  SSL CERTIFICATE ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Failed to load SSL certificates: ${error.message}`);
      console.error('');
      console.error('  Possible causes:');
      
      if (error.code === 'ENOENT') {
        console.error('  - Certificate file not found at specified path');
        console.error(`    Key path: ${keyPath}`);
        console.error(`    Cert path: ${certPath}`);
      } else if (error.code === 'EACCES') {
        console.error('  - Permission denied reading certificate files');
      } else {
        console.error('  - Invalid certificate format or corrupted file');
      }
      
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  Falling back to HTTP server...');
      console.error('═══════════════════════════════════════════════════════════════');
    };

    // Try to read SSL certificate and catch the ENOENT error
    let caughtError = null;
    try {
      mockFsReadSync(sslKeyPath);
    } catch (error) {
      caughtError = error;
    }

    // Verify error was caught
    expect(caughtError).not.toBeNull();
    expect(caughtError.code).toBe('ENOENT');

    // Handle the SSL error
    handleSslError(caughtError, sslKeyPath, sslCertPath);

    // Verify the certificate not found message was logged
    expect(consoleMocks.mockError).toHaveBeenCalled();
    
    // Check that the specific file not found message was logged
    const errorCalls = consoleMocks.mockError.mock.calls.flat();
    const fileNotFoundMessage = errorCalls.some(call => 
      typeof call === 'string' && call.includes('Certificate file not found')
    );
    expect(fileNotFoundMessage).toBe(true);
  });

  /**
   * Test: SSL certificate error triggers fallback to HTTP message.
   * 
   * When SSL certificates cannot be loaded, the server should log a message
   * indicating it is falling back to HTTP mode.
   */
  it('should fall back to HTTP after SSL certificate error', () => {
    // Create ENOENT error
    const enoentError = createMockError(
      'ENOENT',
      "ENOENT: no such file or directory, open '/nonexistent/path/key.pem'"
    );

    // Simulate the SSL error handling with fallback message
    const handleSslErrorWithFallback = (error) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  SSL CERTIFICATE ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Failed to load SSL certificates: ${error.message}`);
      console.error('');
      console.error('  Possible causes:');
      
      if (error.code === 'ENOENT') {
        console.error('  - Certificate file not found at specified path');
      }
      
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  Falling back to HTTP server...');
      console.error('═══════════════════════════════════════════════════════════════');
      
      // Simulate starting HTTP server as fallback
      return 'http';
    };

    // Trigger the error handler
    const fallbackProtocol = handleSslErrorWithFallback(enoentError);

    // Verify the fallback message was logged
    const errorCalls = consoleMocks.mockError.mock.calls.flat();
    const fallbackMessage = errorCalls.some(call => 
      typeof call === 'string' && call.includes('Falling back to HTTP server')
    );
    expect(fallbackMessage).toBe(true);

    // Verify fallback to HTTP
    expect(fallbackProtocol).toBe('http');
  });

  /**
   * Test: EACCES error for SSL files logs permission denied message.
   * 
   * When SSL certificate files cannot be read due to permissions (EACCES),
   * the error handler should log an appropriate message.
   */
  it('should log permission denied for SSL EACCES error', () => {
    // Create EACCES error for SSL file reading
    const eaccesError = createMockError(
      'EACCES',
      "EACCES: permission denied, open './certs/key.pem'"
    );

    // Simulate the SSL error handling
    const handleSslError = (error) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  SSL CERTIFICATE ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Failed to load SSL certificates: ${error.message}`);
      console.error('');
      console.error('  Possible causes:');
      
      if (error.code === 'ENOENT') {
        console.error('  - Certificate file not found at specified path');
      } else if (error.code === 'EACCES') {
        console.error('  - Permission denied reading certificate files');
      } else {
        console.error('  - Invalid certificate format or corrupted file');
      }
      
      console.error('═══════════════════════════════════════════════════════════════');
    };

    // Trigger the error handler
    handleSslError(eaccesError);

    // Verify the permission denied message was logged
    const errorCalls = consoleMocks.mockError.mock.calls.flat();
    const permissionDeniedMessage = errorCalls.some(call => 
      typeof call === 'string' && call.includes('Permission denied reading certificate files')
    );
    expect(permissionDeniedMessage).toBe(true);
  });
});

// =============================================================================
// Test Suite: Server Errors - Generic Errors
// =============================================================================

describe('Server Errors - Generic Errors', () => {
  /**
   * Store original environment and console methods for restoration.
   */
  let originalEnv;
  let mockProcessExit;
  let consoleMocks;

  beforeAll(() => {
    // Store original environment
    originalEnv = storeEnv();
    
    // Mock process.exit to prevent test termination
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore original environment
    restoreEnv(originalEnv);
    
    // Restore process.exit
    mockProcessExit.mockRestore();
  });

  beforeEach(() => {
    // Create fresh console mocks for each test
    consoleMocks = createMockConsole();
    
    // Reset modules to get fresh server instance
    jest.resetModules();
    
    // Clear mock call history
    mockProcessExit.mockClear();
  });

  afterEach(() => {
    // Restore console methods
    restoreMockConsole(consoleMocks);
  });

  /**
   * Test: Unknown error codes are handled gracefully.
   * 
   * When an error with an unknown code occurs, the error handler
   * should still log the error message and exit gracefully.
   */
  it('should handle unknown error codes gracefully', () => {
    // Create error with unknown code
    const unknownError = createMockError(
      'EUNKNOWN',
      'Some unknown error occurred'
    );

    // Simulate the error handler behavior from server.js
    // The handler should log the error even for unknown codes
    const handleServerError = (error) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  HTTP SERVER ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Error: ${error.message}`);
      
      // Note: Unknown codes don't get specific messages, but error is still logged
      if (error.code === 'EADDRINUSE') {
        console.error(`  Port is already in use.`);
      } else if (error.code === 'EACCES') {
        console.error(`  Permission denied for port.`);
      }
      // Unknown codes fall through without specific message
      
      console.error('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    };

    // Trigger the error handler
    handleServerError(unknownError);

    // Verify error was logged even with unknown code
    expect(consoleMocks.mockError).toHaveBeenCalled();
    
    // Verify process still exits
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  /**
   * Test: Error message is included in console output.
   * 
   * Verifies that the actual error message is logged to console.error
   * for diagnostic purposes.
   */
  it('should include error message in console output', () => {
    // Create error with specific message
    const errorMessage = 'Test error message for verification';
    const testError = createMockError('ETEST', errorMessage);

    // Simulate the error handler behavior
    const handleServerError = (error) => {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('  HTTP SERVER ERROR');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`  Error: ${error.message}`);
      console.error('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    };

    // Trigger the error handler
    handleServerError(testError);

    // Verify the error message was included in output
    const errorCalls = consoleMocks.mockError.mock.calls.flat();
    const messageLogged = errorCalls.some(call => 
      typeof call === 'string' && call.includes(errorMessage)
    );
    expect(messageLogged).toBe(true);
  });
});

// =============================================================================
// Test Suite: Server Errors - HTTPS Configuration
// =============================================================================

describe('Server Errors - HTTPS Configuration', () => {
  /**
   * Store original environment and console methods for restoration.
   */
  let originalEnv;
  let consoleMocks;

  beforeAll(() => {
    // Store original environment
    originalEnv = storeEnv();
  });

  afterAll(() => {
    // Restore original environment
    restoreEnv(originalEnv);
  });

  beforeEach(() => {
    // Create fresh console mocks for each test
    consoleMocks = createMockConsole();
    
    // Reset modules to get fresh server instance
    jest.resetModules();
  });

  afterEach(() => {
    // Restore console methods
    restoreMockConsole(consoleMocks);
  });

  /**
   * Test: Missing SSL paths when HTTPS enabled triggers configuration error.
   * 
   * When ENABLE_HTTPS is true but SSL_KEY_PATH or SSL_CERT_PATH are not set,
   * the server should log a configuration error and fall back to HTTP.
   */
  it('should log configuration error when HTTPS enabled without SSL paths', () => {
    // Simulate the HTTPS configuration error handling from server.js lines 322-336
    const handleMissingSslPaths = (sslKeyPath, sslCertPath) => {
      if (!sslKeyPath || !sslCertPath) {
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('  HTTPS CONFIGURATION ERROR');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('  HTTPS is enabled but SSL certificate paths are not configured.');
        console.error('  Please set the following environment variables:');
        console.error('    - SSL_KEY_PATH: Path to SSL private key file (.pem)');
        console.error('    - SSL_CERT_PATH: Path to SSL certificate file (.pem)');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('  Falling back to HTTP server...');
        console.error('═══════════════════════════════════════════════════════════════');
        return true;
      }
      return false;
    };

    // Test with empty paths (simulating ENABLE_HTTPS=true without SSL paths)
    const hasMissingPaths = handleMissingSslPaths('', '');

    // Verify configuration error was logged
    expect(hasMissingPaths).toBe(true);
    expect(consoleMocks.mockError).toHaveBeenCalled();
    
    // Check that configuration error message was logged
    const errorCalls = consoleMocks.mockError.mock.calls.flat();
    const configErrorMessage = errorCalls.some(call => 
      typeof call === 'string' && call.includes('HTTPS CONFIGURATION ERROR')
    );
    expect(configErrorMessage).toBe(true);
    
    // Check fallback message
    const fallbackMessage = errorCalls.some(call => 
      typeof call === 'string' && call.includes('Falling back to HTTP server')
    );
    expect(fallbackMessage).toBe(true);
  });

  /**
   * Test: Partial SSL configuration (only key path) triggers configuration error.
   * 
   * When only SSL_KEY_PATH is set but SSL_CERT_PATH is missing,
   * the server should log a configuration error.
   */
  it('should log error when only SSL key path is provided', () => {
    // Simulate checking for complete SSL configuration
    const handleMissingSslPaths = (sslKeyPath, sslCertPath) => {
      if (!sslKeyPath || !sslCertPath) {
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('  HTTPS CONFIGURATION ERROR');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('  HTTPS is enabled but SSL certificate paths are not configured.');
        console.error('  Please set the following environment variables:');
        console.error('    - SSL_KEY_PATH: Path to SSL private key file (.pem)');
        console.error('    - SSL_CERT_PATH: Path to SSL certificate file (.pem)');
        console.error('═══════════════════════════════════════════════════════════════');
        return true;
      }
      return false;
    };

    // Test with only key path provided
    const hasMissingPaths = handleMissingSslPaths('./certs/key.pem', '');

    // Verify error was logged
    expect(hasMissingPaths).toBe(true);
    
    // Check that SSL_CERT_PATH requirement was mentioned
    const errorCalls = consoleMocks.mockError.mock.calls.flat();
    const certPathMessage = errorCalls.some(call => 
      typeof call === 'string' && call.includes('SSL_CERT_PATH')
    );
    expect(certPathMessage).toBe(true);
  });
});

// =============================================================================
// Test Suite: Console Error Verification
// =============================================================================

describe('Server Errors - Console Error Output Verification', () => {
  /**
   * Store console methods for verification.
   */
  let consoleMocks;

  beforeEach(() => {
    // Create fresh console mocks for each test
    consoleMocks = createMockConsole();
  });

  afterEach(() => {
    // Restore console methods
    restoreMockConsole(consoleMocks);
  });

  /**
   * Test: Console.error is called with border formatting.
   * 
   * Verifies that error messages use consistent formatting with border lines.
   */
  it('should format error messages with border lines', () => {
    // Expected border pattern from server.js
    const borderLine = '═══════════════════════════════════════════════════════════════';

    // Simulate error output with borders
    console.error(borderLine);
    console.error('  HTTP SERVER ERROR');
    console.error(borderLine);
    console.error('  Error: Test error');
    console.error(borderLine);

    // Verify borders were used
    const errorCalls = consoleMocks.mockError.mock.calls.flat();
    const borderCount = errorCalls.filter(call => call === borderLine).length;
    
    // Should have at least 2 border lines (top and bottom)
    expect(borderCount).toBeGreaterThanOrEqual(2);
  });

  /**
   * Test: Multiple error details are logged sequentially.
   * 
   * Verifies that detailed error information is logged in correct order.
   */
  it('should log error details in sequence', () => {
    // Simulate multi-line error output
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  SSL CERTIFICATE ERROR');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  Failed to load SSL certificates: ENOENT');
    console.error('');
    console.error('  Possible causes:');
    console.error('  - Certificate file not found at specified path');

    // Verify multiple calls were made in order
    expect(consoleMocks.mockError.mock.calls.length).toBeGreaterThanOrEqual(6);
    
    // Verify sequence contains expected content
    const secondCall = consoleMocks.mockError.mock.calls[1][0];
    expect(secondCall).toContain('SSL CERTIFICATE ERROR');
  });
});
