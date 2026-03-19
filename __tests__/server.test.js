'use strict';

/**
 * Unit tests for server.js — HTTP Server Entry Point
 *
 * Tests the server lifecycle: app.listen() invocation, startup console logs,
 * module loading, graceful shutdown via .close(), and callback execution.
 *
 * server.js executes side effects at module load time — it calls app.listen()
 * and console.log() immediately upon require(). This requires careful mocking:
 *   - jest.mock() for ../src/app to prevent actual Express app creation and port binding
 *   - jest.resetModules() before each test for fresh module evaluation
 *   - jest.spyOn(console, 'log') BEFORE requiring server.js
 *   - process.env save/restore for complete test isolation
 *
 * @module __tests__/server.test
 */

// ---------------------------------------------------------------------------
// Mock Setup — Variables prefixed with 'mock' for Jest hoisting compatibility
// ---------------------------------------------------------------------------

/**
 * Mock HTTP server instance returned by app.listen().
 * Provides close() and address() methods for shutdown and inspection tests.
 */
const mockServer = {
  close: jest.fn(),
  address: jest.fn()
};

/**
 * Mock app.listen function.
 * Captures invocation arguments and optionally invokes the callback.
 * Returns mockServer to simulate the real http.Server instance.
 */
const mockListen = jest.fn();

/**
 * Mock app.use function.
 * Prevents actual Express middleware mounting during server.js evaluation.
 */
const mockUse = jest.fn();

/**
 * Replace the real Express app module with our mock object.
 * This prevents actual Express app creation, middleware mounting, and port
 * binding when server.js is required during tests. The mock is registered
 * in Jest's mock registry (separate from module registry) and persists
 * across jest.resetModules() calls.
 */
jest.mock('../src/app', () => ({
  listen: mockListen,
  use: mockUse
}));

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('server.js', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment variables for restoration after each test
    originalEnv = { ...process.env };

    // Clear the module registry so require('../server') evaluates fresh each time.
    // The jest.mock() registration persists (mock registry != module registry).
    jest.resetModules();

    // Reset all mock functions — clears call history AND removes custom implementations
    mockListen.mockReset();
    mockUse.mockReset();
    mockServer.close.mockReset();
    mockServer.address.mockReset();

    // Set default implementations for mock functions
    mockListen.mockImplementation((port, host, cb) => {
      if (cb) cb();
      return mockServer;
    });
    mockServer.close.mockImplementation((cb) => {
      if (cb) cb();
    });
    mockServer.address.mockImplementation(() => ({
      port: 3000,
      address: '127.0.0.1'
    }));

    // Spy on console.log BEFORE requiring server.js, because server.js calls
    // console.log at module evaluation time (top-level side effects).
    // mockImplementation suppresses output during tests.
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment variables to ensure complete test isolation
    process.env = originalEnv;
    // Restore all spied methods (console.log) to their original implementations
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Module Loading
  // -------------------------------------------------------------------------

  describe('Module loading', () => {
    it('should load without throwing an error', () => {
      expect(() => {
        require('../server');
      }).not.toThrow();
    });

    it('should not export any module members', () => {
      // server.js does not set module.exports, so require returns the default {}
      const serverModule = require('../server');
      expect(serverModule).toEqual({});
    });

    it('should require the app module', () => {
      require('../server');
      // Verify that our mock app was used (listen was called on it)
      expect(mockListen).toHaveBeenCalled();
    });

    it('should require the config module for host and port', () => {
      // Ensure default config values are used when no env vars are set
      delete process.env.HOST;
      delete process.env.PORT;
      require('../server');
      // Default config: port 3000, host '127.0.0.1'
      expect(mockListen).toHaveBeenCalledWith(
        3000,
        '127.0.0.1',
        expect.any(Function)
      );
    });
  });

  // -------------------------------------------------------------------------
  // app.listen() Invocation
  // -------------------------------------------------------------------------

  describe('app.listen() invocation', () => {
    it('should call app.listen with correct port, host, and callback', () => {
      delete process.env.HOST;
      delete process.env.PORT;
      require('../server');
      expect(mockListen).toHaveBeenCalledWith(
        3000,
        '127.0.0.1',
        expect.any(Function)
      );
    });

    it('should call app.listen exactly once', () => {
      require('../server');
      expect(mockListen).toHaveBeenCalledTimes(1);
    });

    it('should pass port as a number to app.listen', () => {
      require('../server');
      const callArgs = mockListen.mock.calls[0];
      expect(typeof callArgs[0]).toBe('number');
    });

    it('should pass host as a string to app.listen', () => {
      require('../server');
      const callArgs = mockListen.mock.calls[0];
      expect(typeof callArgs[1]).toBe('string');
    });

    it('should pass a callback function as the third argument to app.listen', () => {
      require('../server');
      const callArgs = mockListen.mock.calls[0];
      expect(typeof callArgs[2]).toBe('function');
    });

    it('should pass exactly three arguments to app.listen', () => {
      require('../server');
      const callArgs = mockListen.mock.calls[0];
      expect(callArgs).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Listen Callback
  // -------------------------------------------------------------------------

  describe('Listen callback', () => {
    it('should invoke the listen callback which logs the server URL', () => {
      delete process.env.HOST;
      delete process.env.PORT;
      require('../server');
      // Our default mock invokes the callback synchronously
      expect(console.log).toHaveBeenCalledWith(
        'Server running at http://127.0.0.1:3000/'
      );
    });

    it('should format the server URL with config host and port', () => {
      process.env.HOST = '0.0.0.0';
      process.env.PORT = '9999';
      require('../server');
      expect(console.log).toHaveBeenCalledWith(
        'Server running at http://0.0.0.0:9999/'
      );
    });

    it('should not log the server URL when the callback is not invoked', () => {
      // Override listen to NOT call the callback
      mockListen.mockImplementation((port, host, cb) => {
        // Deliberately omit cb() invocation
        return mockServer;
      });
      require('../server');
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Server running at')
      );
    });

    it('should use the exact URL format http://host:port/', () => {
      process.env.HOST = 'example.com';
      process.env.PORT = '443';
      require('../server');
      expect(console.log).toHaveBeenCalledWith(
        'Server running at http://example.com:443/'
      );
    });
  });

  // -------------------------------------------------------------------------
  // Console Output
  // -------------------------------------------------------------------------

  describe('Console output', () => {
    it('should log "Application module loaded successfully"', () => {
      require('../server');
      expect(console.log).toHaveBeenCalledWith(
        'Application module loaded successfully'
      );
    });

    it('should log "Express.js server initialization complete - PR validation log"', () => {
      require('../server');
      expect(console.log).toHaveBeenCalledWith(
        'Express.js server initialization complete - PR validation log'
      );
    });

    it('should log "PR update test: Server module fully initialized"', () => {
      require('../server');
      expect(console.log).toHaveBeenCalledWith(
        'PR update test: Server module fully initialized'
      );
    });

    it('should produce all four console.log messages when listen callback is invoked', () => {
      delete process.env.HOST;
      delete process.env.PORT;
      require('../server');
      // With synchronous callback invocation, 4 log calls are expected:
      // 1. 'Server running at http://127.0.0.1:3000/' (from callback)
      // 2. 'Application module loaded successfully'
      // 3. 'Express.js server initialization complete - PR validation log'
      // 4. 'PR update test: Server module fully initialized'
      expect(console.log).toHaveBeenCalledTimes(4);
    });

    it('should produce exactly three console.log messages when listen callback is not invoked', () => {
      mockListen.mockImplementation((port, host, cb) => {
        // Do not invoke callback — callback log should be skipped
        return mockServer;
      });
      require('../server');
      // Only the 3 top-level log calls, no callback log
      expect(console.log).toHaveBeenCalledTimes(3);
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Server running at')
      );
    });

    it('should log messages in the correct order when callback is invoked synchronously', () => {
      delete process.env.HOST;
      delete process.env.PORT;
      require('../server');
      const logCalls = console.log.mock.calls.map((call) => call[0]);
      // The callback is invoked synchronously inside app.listen, so its log
      // appears first, followed by the three top-level logs in source order.
      expect(logCalls).toEqual([
        'Server running at http://127.0.0.1:3000/',
        'Application module loaded successfully',
        'Express.js server initialization complete - PR validation log',
        'PR update test: Server module fully initialized'
      ]);
    });

    it('should log the three top-level messages in correct order even without callback', () => {
      mockListen.mockImplementation((port, host, cb) => {
        return mockServer;
      });
      require('../server');
      const logCalls = console.log.mock.calls.map((call) => call[0]);
      expect(logCalls).toEqual([
        'Application module loaded successfully',
        'Express.js server initialization complete - PR validation log',
        'PR update test: Server module fully initialized'
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Graceful Shutdown
  // -------------------------------------------------------------------------

  describe('Graceful shutdown', () => {
    it('should return a server instance from app.listen', () => {
      require('../server');
      const returnValue = mockListen.mock.results[0].value;
      expect(returnValue).toBe(mockServer);
    });

    it('should return a server instance that has a close method', () => {
      require('../server');
      const returnValue = mockListen.mock.results[0].value;
      expect(typeof returnValue.close).toBe('function');
    });

    it('should allow closing the server via the returned instance', () => {
      require('../server');
      const serverInstance = mockListen.mock.results[0].value;
      serverInstance.close();
      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    it('should invoke the close callback when server is closed with a callback', () => {
      require('../server');
      const serverInstance = mockListen.mock.results[0].value;
      const closeCb = jest.fn();
      serverInstance.close(closeCb);
      expect(closeCb).toHaveBeenCalledTimes(1);
    });

    it('should support closing without a callback argument', () => {
      require('../server');
      const serverInstance = mockListen.mock.results[0].value;
      expect(() => {
        serverInstance.close();
      }).not.toThrow();
    });

    it('should return a server instance that has an address method', () => {
      require('../server');
      const returnValue = mockListen.mock.results[0].value;
      expect(typeof returnValue.address).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Error Cases
  // -------------------------------------------------------------------------

  describe('Error cases', () => {
    it('should propagate errors when app.listen throws', () => {
      mockListen.mockImplementation(() => {
        throw new Error('EADDRINUSE: address already in use');
      });
      expect(() => {
        require('../server');
      }).toThrow('EADDRINUSE: address already in use');
    });

    it('should propagate a generic error from app.listen', () => {
      mockListen.mockImplementation(() => {
        throw new Error('bind EACCES');
      });
      expect(() => {
        require('../server');
      }).toThrow('bind EACCES');
    });

    it('should propagate errors thrown inside the listen callback', () => {
      // Restore the beforeEach spy and create a new one that conditionally throws
      jest.restoreAllMocks();
      jest.spyOn(console, 'log').mockImplementation((msg) => {
        if (typeof msg === 'string' && msg.startsWith('Server running at')) {
          throw new Error('Callback log failure');
        }
        // Allow other console.log calls to pass silently
      });
      expect(() => {
        require('../server');
      }).toThrow('Callback log failure');
    });
  });

  // -------------------------------------------------------------------------
  // Environment Variable Integration
  // -------------------------------------------------------------------------

  describe('Environment variable integration', () => {
    it('should use custom port from PORT env var', () => {
      process.env.PORT = '8080';
      require('../server');
      expect(mockListen).toHaveBeenCalledWith(
        8080,
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should use custom host from HOST env var', () => {
      process.env.HOST = '0.0.0.0';
      require('../server');
      expect(mockListen).toHaveBeenCalledWith(
        expect.any(Number),
        '0.0.0.0',
        expect.any(Function)
      );
    });

    it('should use custom port and host together from env vars', () => {
      process.env.PORT = '8080';
      process.env.HOST = '0.0.0.0';
      require('../server');
      expect(mockListen).toHaveBeenCalledWith(
        8080,
        '0.0.0.0',
        expect.any(Function)
      );
    });

    it('should format the server URL log with custom host and port from env vars', () => {
      process.env.PORT = '5000';
      process.env.HOST = 'localhost';
      require('../server');
      expect(console.log).toHaveBeenCalledWith(
        'Server running at http://localhost:5000/'
      );
    });

    it('should use default port 3000 when PORT env var is not set', () => {
      delete process.env.PORT;
      require('../server');
      expect(mockListen).toHaveBeenCalledWith(
        3000,
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should use default host 127.0.0.1 when HOST env var is not set', () => {
      delete process.env.HOST;
      require('../server');
      expect(mockListen).toHaveBeenCalledWith(
        expect.any(Number),
        '127.0.0.1',
        expect.any(Function)
      );
    });

    it('should fall back to default port 3000 when PORT is a non-numeric string', () => {
      process.env.PORT = 'abc';
      require('../server');
      // parseInt('abc', 10) -> NaN, which is falsy, so NaN || 3000 -> 3000
      expect(mockListen).toHaveBeenCalledWith(
        3000,
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should fall back to default port 3000 when PORT is an empty string', () => {
      process.env.PORT = '';
      require('../server');
      // parseInt('', 10) -> NaN, which is falsy, so NaN || 3000 -> 3000
      expect(mockListen).toHaveBeenCalledWith(
        3000,
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should fall back to default port 3000 when PORT is zero', () => {
      process.env.PORT = '0';
      require('../server');
      // parseInt('0', 10) -> 0, which is falsy, so 0 || 3000 -> 3000
      expect(mockListen).toHaveBeenCalledWith(
        3000,
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should truncate decimal PORT values via parseInt', () => {
      process.env.PORT = '3000.7';
      require('../server');
      // parseInt('3000.7', 10) -> 3000 (truncates, does not round)
      expect(mockListen).toHaveBeenCalledWith(
        3000,
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should accept a large port number', () => {
      process.env.PORT = '65535';
      require('../server');
      expect(mockListen).toHaveBeenCalledWith(
        65535,
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should accept HOST with hostname containing hyphens and dots', () => {
      process.env.HOST = 'my-app.example.com';
      require('../server');
      expect(mockListen).toHaveBeenCalledWith(
        expect.any(Number),
        'my-app.example.com',
        expect.any(Function)
      );
    });
  });
});
