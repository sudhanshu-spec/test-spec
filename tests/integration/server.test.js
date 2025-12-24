'use strict';

/**
 * Server Lifecycle Integration Tests
 *
 * This test file validates the server.js entry point module's lifecycle behavior,
 * including server startup, callback execution, and console logging verification.
 * Tests are designed to mock app.listen to prevent actual network port binding
 * while still validating the complete initialization sequence.
 *
 * Test Categories:
 * - Server module loading and initialization
 * - app.listen() invocation with correct arguments
 * - Startup callback execution
 * - Console logging message verification
 * - Log message ordering validation
 *
 * @module tests/integration/server.test.js
 * @requires jest - Testing framework (globals automatically injected)
 */

/**
 * Server Lifecycle Integration Test Suite
 *
 * Tests the server.js module's initialization behavior including:
 * - Module loading without errors
 * - app.listen called with correct config values
 * - Startup callback execution
 * - Console log messages appear in correct order
 *
 * Important: server.js has side effects at module load time (calls app.listen),
 * so we must use jest.resetModules() and require() within tests rather than
 * top-level imports.
 */
describe('Server Lifecycle', () => {
  // Store references to mocks and spies for verification
  let consoleSpy;
  let mockListen;
  let mockServer;

  /**
   * Setup before each test
   * - Resets module cache for fresh server imports
   * - Creates console.log spy to capture logging
   * - Mocks app.listen to prevent actual network binding
   * - Mocks config module with test values
   */
  beforeEach(() => {
    // Reset module cache to ensure fresh imports for each test
    // This is critical because server.js has side effects on import
    jest.resetModules();

    // Create spy on console.log to capture and verify log messages
    // Using mockImplementation to prevent actual console output during tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Create mock server object with close method for cleanup testing
    mockServer = {
      close: jest.fn((callback) => {
        if (callback) callback();
      }),
      address: jest.fn(() => ({ port: 3000, address: '127.0.0.1' }))
    };

    // Create mock for app.listen that:
    // 1. Captures the arguments (port, host, callback)
    // 2. Immediately invokes the callback to simulate successful startup
    // 3. Returns mock server object
    mockListen = jest.fn((port, host, callback) => {
      // Invoke callback to simulate successful server binding
      if (typeof callback === 'function') {
        callback();
      }
      return mockServer;
    });

    // Mock the app module to use our mock listen function
    // This prevents actual Express server startup
    jest.doMock('../../src/app', () => ({
      listen: mockListen
    }));
  });

  /**
   * Cleanup after each test
   * - Clears all mock call histories
   * - Restores original implementations
   */
  afterEach(() => {
    // Clear mock call history for clean slate
    jest.clearAllMocks();

    // Restore original console.log implementation
    jest.restoreAllMocks();
  });

  /**
   * Server Startup Tests
   *
   * Tests that verify the server starts correctly with proper configuration
   * and executes expected initialization steps.
   */
  describe('Server Startup', () => {
    /**
     * Test: Server module loads without throwing errors
     *
     * Validates that requiring the server module doesn't throw any exceptions
     * during the initialization process.
     */
    test('should load server module without errors', () => {
      // Act & Assert: requiring server should not throw
      expect(() => {
        require('../../server');
      }).not.toThrow();
    });

    /**
     * Test: app.listen is called when server module is loaded
     *
     * Validates that the server module properly calls app.listen
     * as part of its initialization sequence.
     */
    test('should call app.listen when server module is loaded', () => {
      // Act: Load the server module (triggers side effects)
      require('../../server');

      // Assert: app.listen was called
      expect(mockListen).toHaveBeenCalled();
      expect(mockListen).toHaveBeenCalledTimes(1);
    });

    /**
     * Test: app.listen is called with correct port from config
     *
     * Validates that the server uses the configured port value
     * when starting the HTTP server.
     */
    test('should call app.listen with correct port', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: First argument (port) matches default config
      const [port] = mockListen.mock.calls[0];
      expect(port).toBe(3000);
    });

    /**
     * Test: app.listen is called with correct host from config
     *
     * Validates that the server uses the configured host value
     * when binding the HTTP server.
     */
    test('should call app.listen with correct host', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: Second argument (host) matches default config
      const [, host] = mockListen.mock.calls[0];
      expect(host).toBe('127.0.0.1');
    });

    /**
     * Test: app.listen is called with a callback function
     *
     * Validates that a callback function is provided to app.listen
     * for handling successful server startup.
     */
    test('should call app.listen with a callback function', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: Third argument is a function (callback)
      const [, , callback] = mockListen.mock.calls[0];
      expect(typeof callback).toBe('function');
    });

    /**
     * Test: app.listen callback is executed on startup
     *
     * Validates that the startup callback function is properly invoked
     * when the server successfully binds to the port.
     */
    test('should execute startup callback', () => {
      // Act: Load the server module
      // The callback is invoked by our mock automatically
      require('../../server');

      // Assert: Callback execution is verified by the log message it produces
      // The callback logs "Server running at http://..." (line 64)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server running at')
      );
    });
  });

  /**
   * Console Logging Tests
   *
   * Tests that verify all expected console log messages are output
   * during server initialization and appear in the correct order.
   */
  describe('Console Logging', () => {
    /**
     * Test: Console.log is called during server startup
     *
     * Basic verification that logging occurs during initialization.
     */
    test('should call console.log during startup', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: console.log was called
      expect(consoleSpy).toHaveBeenCalled();
    });

    /**
     * Test: Server running message is logged (line 64)
     *
     * Verifies the server startup URL message is logged
     * when the app.listen callback fires.
     * Expected: "Server running at http://127.0.0.1:3000/"
     */
    test('should log server running message with URL', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: Server running message logged (from callback at line 64)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Server running at http://127.0.0.1:3000/'
      );
    });

    /**
     * Test: Application module loaded message is logged (line 68)
     *
     * Verifies the application module loaded message appears
     * during initialization.
     * Expected: "Application module loaded successfully"
     */
    test('should log application module loaded message', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: Application loaded message logged (line 68)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Application module loaded successfully'
      );
    });

    /**
     * Test: Express initialization complete message is logged (line 71)
     *
     * Verifies the Express.js server initialization complete message
     * appears during startup.
     * Expected: "Express.js server initialization complete - PR validation log"
     */
    test('should log Express.js initialization complete message', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: Express initialization message logged (line 71)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Express.js server initialization complete - PR validation log'
      );
    });

    /**
     * Test: PR update test message is logged (line 74)
     *
     * Verifies the final PR validation message appears during startup.
     * Expected: "PR update test: Server module fully initialized"
     */
    test('should log PR update test message', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: PR update message logged (line 74)
      expect(consoleSpy).toHaveBeenCalledWith(
        'PR update test: Server module fully initialized'
      );
    });

    /**
     * Test: All four expected log messages are present
     *
     * Verifies that all required log messages from server.js
     * are captured during initialization.
     */
    test('should log all four expected startup messages', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: Exactly 4 log messages should be recorded
      expect(consoleSpy).toHaveBeenCalledTimes(4);

      // Verify each message is present using string matching
      const logCalls = consoleSpy.mock.calls.map(call => call[0]);

      expect(logCalls).toContainEqual(
        expect.stringContaining('Server running at')
      );
      expect(logCalls).toContainEqual('Application module loaded successfully');
      expect(logCalls).toContainEqual(
        'Express.js server initialization complete - PR validation log'
      );
      expect(logCalls).toContainEqual(
        'PR update test: Server module fully initialized'
      );
    });

    /**
     * Test: Log messages appear in correct order
     *
     * Verifies that log messages are output in the expected sequence:
     * 1. Server running at... (callback - line 64)
     * 2. Application module loaded... (line 68)
     * 3. Express.js server... (line 71)
     * 4. PR update test... (line 74)
     *
     * Note: The callback message appears first because our mock
     * immediately invokes the callback synchronously.
     */
    test('should log messages in correct order', () => {
      // Act: Load the server module
      require('../../server');

      // Get all log calls in order
      const logCalls = consoleSpy.mock.calls.map(call => call[0]);

      // Assert: Messages appear in expected order
      // Index 0: Server running message (from callback at line 64)
      expect(logCalls[0]).toContain('Server running at');

      // Index 1: Application module loaded (line 68)
      expect(logCalls[1]).toBe('Application module loaded successfully');

      // Index 2: Express initialization complete (line 71)
      expect(logCalls[2]).toBe(
        'Express.js server initialization complete - PR validation log'
      );

      // Index 3: PR update test (line 74)
      expect(logCalls[3]).toBe('PR update test: Server module fully initialized');
    });
  });

  /**
   * Configuration Integration Tests
   *
   * Tests that verify the server properly integrates with the config module
   * and uses configuration values correctly.
   */
  describe('Configuration Integration', () => {
    /**
     * Test: Server uses config port and host values
     *
     * Comprehensive test verifying both port and host from config
     * are passed to app.listen in the correct order.
     */
    test('should pass config port and host to app.listen', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: app.listen called with correct config values
      expect(mockListen).toHaveBeenCalledWith(
        3000,           // default port from config
        '127.0.0.1',    // default host from config
        expect.any(Function)  // callback function
      );
    });

    /**
     * Test: Server URL in log message matches config
     *
     * Verifies that the logged server URL correctly reflects
     * the configured host and port values.
     */
    test('should log server URL with correct host and port', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: URL contains both host and port from config
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Server running at http:\/\/127\.0\.0\.1:3000\//)
      );
    });
  });

  /**
   * Mock Server Object Tests
   *
   * Tests that verify the server object returned by app.listen
   * can be used for lifecycle management.
   */
  describe('Server Object', () => {
    /**
     * Test: app.listen returns a server object
     *
     * Validates that calling app.listen returns an object that
     * can be used for server management (e.g., closing).
     */
    test('should return a server object from app.listen', () => {
      // Act: Load the server module
      require('../../server');

      // Assert: Our mock was called and would return the mock server
      expect(mockListen).toHaveBeenCalled();

      // Verify the mock server object has expected methods
      expect(mockServer.close).toBeDefined();
      expect(typeof mockServer.close).toBe('function');
    });
  });

  /**
   * Error Handling Tests
   *
   * Tests that verify appropriate behavior when errors occur
   * during server initialization (mocked scenarios).
   */
  describe('Error Handling', () => {
    /**
     * Test: Server handles listen errors gracefully
     *
     * Validates behavior when app.listen encounters an error
     * (e.g., port already in use).
     */
    test('should not throw if app.listen callback is not invoked', () => {
      // Reset modules for this specific test
      jest.resetModules();

      // Re-create console spy
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create mock that doesn't invoke callback (simulates delayed startup)
      const noCallbackMock = jest.fn(() => mockServer);

      jest.doMock('../../src/app', () => ({
        listen: noCallbackMock
      }));

      // Act & Assert: Module should load without throwing
      expect(() => {
        require('../../server');
      }).not.toThrow();

      // Verify listen was called but callback wasn't
      expect(noCallbackMock).toHaveBeenCalled();

      // Only non-callback logs should appear (lines 68, 71, 74)
      // The callback log (line 64) should NOT appear
      expect(consoleSpy).toHaveBeenCalledWith(
        'Application module loaded successfully'
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Server running at')
      );
    });
  });

  /**
   * Module Caching Behavior Tests
   *
   * Tests that verify Node.js module caching behavior is handled
   * correctly in our test setup.
   */
  describe('Module Caching', () => {
    /**
     * Test: Subsequent requires return cached module
     *
     * Without resetModules, requiring server multiple times
     * returns the cached version (side effects only happen once).
     */
    test('should use cached module on subsequent requires without reset', () => {
      // Act: Load the server module twice without resetting
      require('../../server');
      const callCountAfterFirst = mockListen.mock.calls.length;

      require('../../server');
      const callCountAfterSecond = mockListen.mock.calls.length;

      // Assert: app.listen only called once due to caching
      expect(callCountAfterFirst).toBe(1);
      expect(callCountAfterSecond).toBe(1);
    });

    /**
     * Test: resetModules allows fresh import
     *
     * Validates that jest.resetModules() clears the cache
     * and allows server.js side effects to execute again.
     */
    test('should execute side effects again after resetModules', () => {
      // First load
      require('../../server');
      expect(mockListen).toHaveBeenCalledTimes(1);

      // Reset modules to clear cache
      jest.resetModules();

      // Re-create mocks after reset
      mockListen = jest.fn((port, host, callback) => {
        if (typeof callback === 'function') callback();
        return mockServer;
      });

      jest.doMock('../../src/app', () => ({
        listen: mockListen
      }));

      // Second load after reset
      require('../../server');

      // Assert: app.listen called again
      expect(mockListen).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * Server Startup with Custom Configuration Tests
 *
 * Tests server behavior when environment variables override defaults.
 * These tests manipulate process.env to verify configuration integration.
 */
describe('Server with Custom Configuration', () => {
  let consoleSpy;
  let mockListen;
  let mockServer;
  let originalEnv;

  /**
   * Store original environment before tests
   */
  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  /**
   * Restore environment after all tests
   */
  afterAll(() => {
    process.env = { ...originalEnv };
  });

  /**
   * Setup before each test with custom environment
   */
  beforeEach(() => {
    // Reset module cache
    jest.resetModules();

    // Set up console spy
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Create mock server
    mockServer = {
      close: jest.fn(),
      address: jest.fn(() => ({ port: 8080, address: '0.0.0.0' }))
    };

    // Create mock listen
    mockListen = jest.fn((port, host, callback) => {
      if (typeof callback === 'function') callback();
      return mockServer;
    });

    // Mock the app module
    jest.doMock('../../src/app', () => ({
      listen: mockListen
    }));
  });

  /**
   * Cleanup after each test
   */
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Reset environment to original
    process.env = { ...originalEnv };
  });

  /**
   * Test: Server uses custom PORT from environment
   *
   * Validates that setting PORT environment variable
   * changes the port passed to app.listen.
   */
  test('should use PORT from environment variable', () => {
    // Arrange: Set custom PORT
    process.env.PORT = '8080';

    // Reset modules to pick up new env var in config
    jest.resetModules();

    // Re-create mocks after reset
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockListen = jest.fn((port, host, callback) => {
      if (typeof callback === 'function') callback();
      return mockServer;
    });
    jest.doMock('../../src/app', () => ({
      listen: mockListen
    }));

    // Act: Load server
    require('../../server');

    // Assert: Port from environment was used
    const [port] = mockListen.mock.calls[0];
    expect(port).toBe(8080);
  });

  /**
   * Test: Server uses custom HOST from environment
   *
   * Validates that setting HOST environment variable
   * changes the host passed to app.listen.
   */
  test('should use HOST from environment variable', () => {
    // Arrange: Set custom HOST
    process.env.HOST = '0.0.0.0';

    // Reset modules to pick up new env var in config
    jest.resetModules();

    // Re-create mocks after reset
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockListen = jest.fn((port, host, callback) => {
      if (typeof callback === 'function') callback();
      return mockServer;
    });
    jest.doMock('../../src/app', () => ({
      listen: mockListen
    }));

    // Act: Load server
    require('../../server');

    // Assert: Host from environment was used
    const [, host] = mockListen.mock.calls[0];
    expect(host).toBe('0.0.0.0');
  });

  /**
   * Test: Server logs correct URL with custom config
   *
   * Validates that the logged server URL reflects
   * the custom host and port from environment.
   */
  test('should log correct URL with custom host and port', () => {
    // Arrange: Set custom HOST and PORT
    process.env.HOST = '0.0.0.0';
    process.env.PORT = '9000';

    // Reset modules to pick up new env vars in config
    jest.resetModules();

    // Re-create mocks after reset
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockListen = jest.fn((port, host, callback) => {
      if (typeof callback === 'function') callback();
      return mockServer;
    });
    jest.doMock('../../src/app', () => ({
      listen: mockListen
    }));

    // Act: Load server
    require('../../server');

    // Assert: URL contains custom host and port
    expect(consoleSpy).toHaveBeenCalledWith(
      'Server running at http://0.0.0.0:9000/'
    );
  });
});
