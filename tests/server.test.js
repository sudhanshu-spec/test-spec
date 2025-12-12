/**
 * Server Lifecycle Tests
 *
 * This test file validates server startup/shutdown behavior using Jest mocking.
 * Tests verify that app.listen is called with correct arguments, the startup
 * callback executes properly, and console.log receives the correct startup message.
 *
 * Test Categories:
 * - Server startup with app.listen
 * - Startup callback execution
 * - Console.log message validation
 * - Environment variable effects on startup
 * - Error handling scenarios
 *
 * @module tests/server.test
 * @requires ./helpers/test-utils - Test utility functions
 * @requires ./fixtures/env.fixtures - Environment variable test data
 */

'use strict';

const {
  resetEnvironment,
  resetModules,
  mockConsole,
  saveEnvironment,
  restoreEnvironment,
  applyEnvironment
} = require('./helpers/test-utils');

const {
  CUSTOM_PORT,
  CUSTOM_HOST,
  FULL_CUSTOM
} = require('./fixtures/env.fixtures');

// ---------------------------------------------------------------------------
// Test Setup and Teardown
// ---------------------------------------------------------------------------

describe('Server Lifecycle', () => {
  let originalEnv;
  let consoleSpy;
  let mockListen;
  let mockApp;

  beforeAll(() => {
    originalEnv = saveEnvironment();
  });

  afterAll(() => {
    restoreEnvironment(originalEnv);
  });

  beforeEach(() => {
    resetModules();
    resetEnvironment();
    consoleSpy = mockConsole();

    // Mock the app module with a listen function
    mockListen = jest.fn();
    mockApp = {
      listen: mockListen
    };

    // Setup mock implementation that invokes callback
    mockListen.mockImplementation((port, host, callback) => {
      if (typeof callback === 'function') {
        callback();
      }
      return { close: jest.fn() };
    });

    // Mock the app module
    jest.doMock('../src/app', () => mockApp);
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Server Startup Tests
  // -------------------------------------------------------------------------

  describe('Server Startup', () => {
    test('should call app.listen with config.port and config.host', () => {
      // Require server to trigger startup
      require('../server');

      expect(mockListen).toHaveBeenCalled();
      expect(mockListen).toHaveBeenCalledWith(
        3000, // default port
        '127.0.0.1', // default host
        expect.any(Function) // callback
      );
    });

    test('should execute callback on successful binding', () => {
      require('../server');

      expect(mockListen).toHaveBeenCalled();
      // Callback was invoked (verified by console.log being called)
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    test("should log startup message in format 'Server running at http://{host}:{port}/'", () => {
      require('../server');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Server running at http://127.0.0.1:3000/'
      );
    });

    test('should use default port 3000 when PORT env not set', () => {
      require('../server');

      expect(mockListen).toHaveBeenCalledWith(
        3000,
        expect.any(String),
        expect.any(Function)
      );
    });

    test("should use default host '127.0.0.1' when HOST env not set", () => {
      require('../server');

      expect(mockListen).toHaveBeenCalledWith(
        expect.any(Number),
        '127.0.0.1',
        expect.any(Function)
      );
    });

    test('should call app.listen exactly once', () => {
      require('../server');

      expect(mockListen).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Environment Configuration Tests
  // -------------------------------------------------------------------------

  describe('Environment Configuration', () => {
    test('should respect PORT environment variable override', () => {
      applyEnvironment(CUSTOM_PORT);
      resetModules();

      // Re-mock after module reset
      mockListen = jest.fn().mockImplementation((port, host, cb) => {
        if (cb) cb();
        return { close: jest.fn() };
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      require('../server');

      expect(mockListen).toHaveBeenCalledWith(
        8080,
        expect.any(String),
        expect.any(Function)
      );
    });

    test('should respect HOST environment variable override', () => {
      applyEnvironment(CUSTOM_HOST);
      resetModules();

      mockListen = jest.fn().mockImplementation((port, host, cb) => {
        if (cb) cb();
        return { close: jest.fn() };
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      require('../server');

      expect(mockListen).toHaveBeenCalledWith(
        expect.any(Number),
        '0.0.0.0',
        expect.any(Function)
      );
    });

    test('should handle multiple environment variable overrides', () => {
      applyEnvironment(FULL_CUSTOM);
      resetModules();

      mockListen = jest.fn().mockImplementation((port, host, cb) => {
        if (cb) cb();
        return { close: jest.fn() };
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      require('../server');

      expect(mockListen).toHaveBeenCalledWith(
        9000,
        '127.0.0.1',
        expect.any(Function)
      );
    });

    test('should log correct message with custom PORT', () => {
      applyEnvironment(CUSTOM_PORT);
      resetModules();

      mockListen = jest.fn().mockImplementation((port, host, cb) => {
        if (cb) cb();
        return { close: jest.fn() };
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));
      consoleSpy = mockConsole();

      require('../server');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Server running at http://127.0.0.1:8080/'
      );
    });

    test('should log correct message with custom HOST', () => {
      applyEnvironment(CUSTOM_HOST);
      resetModules();

      mockListen = jest.fn().mockImplementation((port, host, cb) => {
        if (cb) cb();
        return { close: jest.fn() };
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));
      consoleSpy = mockConsole();

      require('../server');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Server running at http://0.0.0.0:3000/'
      );
    });
  });

  // -------------------------------------------------------------------------
  // Callback Behavior Tests
  // -------------------------------------------------------------------------

  describe('Callback Behavior', () => {
    test('should pass callback as third argument to listen', () => {
      require('../server');

      const callArgs = mockListen.mock.calls[0];
      expect(typeof callArgs[2]).toBe('function');
    });

    test('callback should invoke console.log when called', () => {
      require('../server');

      // The callback was called in beforeEach mock setup
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    test('callback should log exactly one message', () => {
      require('../server');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    test('startup message should contain protocol http://', () => {
      require('../server');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('http://')
      );
    });

    test('startup message should contain "Server running at"', () => {
      require('../server');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Server running at')
      );
    });

    test('startup message should end with trailing slash', () => {
      require('../server');

      const message = consoleSpy.log.mock.calls[0][0];
      expect(message.endsWith('/')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Error Handling Tests (Simulated)
  // -------------------------------------------------------------------------

  describe('Error Handling Scenarios', () => {
    test('should handle listen being called without callback', () => {
      resetModules();
      mockListen = jest.fn().mockImplementation(() => {
        return { close: jest.fn() };
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      // This shouldn't throw
      expect(() => {
        require('../server');
      }).not.toThrow();
    });

    test('listen mock should return server-like object with close method', () => {
      const result = mockListen();
      expect(result).toHaveProperty('close');
      expect(typeof result.close).toBe('function');
    });

    test('should handle port binding failure gracefully when listen throws synchronously', () => {
      resetModules();
      const bindError = new Error('EADDRINUSE: address already in use');
      bindError.code = 'EADDRINUSE';

      mockListen = jest.fn().mockImplementation(() => {
        throw bindError;
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      // The server.js does not have try/catch, so error should propagate
      expect(() => {
        require('../server');
      }).toThrow('EADDRINUSE: address already in use');
    });

    test('should propagate error when listen throws with EACCES (permission denied)', () => {
      resetModules();
      const permError = new Error('EACCES: permission denied');
      permError.code = 'EACCES';

      mockListen = jest.fn().mockImplementation(() => {
        throw permError;
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      expect(() => {
        require('../server');
      }).toThrow('EACCES: permission denied');
    });

    test('should handle listen returning error via callback', () => {
      resetModules();
      const callbackError = new Error('Connection refused');
      let capturedCallback;

      mockListen = jest.fn().mockImplementation((port, host, cb) => {
        capturedCallback = cb;
        return { close: jest.fn() };
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      // Require server - this captures the callback
      require('../server');

      expect(mockListen).toHaveBeenCalled();
      expect(typeof capturedCallback).toBe('function');

      // Callback in server.js doesn't handle errors, it just logs
      // So calling callback should succeed even without error handling
      expect(() => {
        capturedCallback();
      }).not.toThrow();
    });

    test('should verify callback is passed correctly even when listen succeeds', () => {
      resetModules();
      let capturedCallback;
      let capturedPort;
      let capturedHost;

      mockListen = jest.fn().mockImplementation((port, host, cb) => {
        capturedPort = port;
        capturedHost = host;
        capturedCallback = cb;
        // Don't invoke callback automatically
        return { close: jest.fn() };
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      require('../server');

      expect(capturedPort).toBe(3000);
      expect(capturedHost).toBe('127.0.0.1');
      expect(typeof capturedCallback).toBe('function');
    });

    test('should not call console.log if callback is never invoked', () => {
      resetModules();
      consoleSpy = mockConsole();

      mockListen = jest.fn().mockImplementation((port, host, cb) => {
        // Don't invoke callback - simulates pending connection
        return { close: jest.fn() };
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      require('../server');

      // Since callback was never invoked, console.log should not be called
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('should handle graceful shutdown scenario', () => {
      resetModules();
      const mockClose = jest.fn().mockImplementation((cb) => {
        if (typeof cb === 'function') {
          cb();
        }
      });
      const mockServerInstance = { close: mockClose };

      mockListen = jest.fn().mockImplementation((port, host, cb) => {
        if (cb) cb();
        return mockServerInstance;
      });
      jest.doMock('../src/app', () => ({ listen: mockListen }));

      require('../server');

      // Verify server instance can be closed
      expect(mockListen).toHaveBeenCalled();
      expect(typeof mockServerInstance.close).toBe('function');

      // Simulate graceful shutdown
      let shutdownComplete = false;
      mockServerInstance.close(() => {
        shutdownComplete = true;
      });

      expect(shutdownComplete).toBe(true);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Module Structure Tests
  // -------------------------------------------------------------------------

  describe('Server Module Structure', () => {
    test('server.js should require src/app module', () => {
      // Verify that the mock was called (meaning require happened)
      require('../server');
      expect(mockListen).toHaveBeenCalled();
    });

    test('server.js should require src/config module', () => {
      // The config values are used in listen call
      require('../server');

      // Verify default config values were used
      expect(mockListen).toHaveBeenCalledWith(
        3000,
        '127.0.0.1',
        expect.any(Function)
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Server Integration Tests (Without Mocking)
// ---------------------------------------------------------------------------

describe('Server Module Integration', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = {
      PORT: process.env.PORT,
      HOST: process.env.HOST,
      NODE_ENV: process.env.NODE_ENV
    };
    // Clear all mocks from previous describe blocks
    jest.unmock('../src/app');
  });

  afterAll(() => {
    // Restore original environment
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  });

  beforeEach(() => {
    // Unmock and reset modules before each test
    jest.unmock('../src/app');
    jest.resetModules();
    delete process.env.PORT;
    delete process.env.HOST;
    delete process.env.NODE_ENV;
  });

  describe('Config Module Integration', () => {
    test('config module exports correct default structure', () => {
      const config = require('../src/config');

      expect(config).toEqual({
        port: 3000,
        host: '127.0.0.1',
        env: 'development'
      });
    });

    test('config module responds to environment variables', () => {
      process.env.PORT = '4000';
      process.env.HOST = '0.0.0.0';
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const config = require('../src/config');

      expect(config.port).toBe(4000);
      expect(config.host).toBe('0.0.0.0');
      expect(config.env).toBe('production');
    });
  });

  describe('App Module Integration', () => {
    test('app module exports Express application', () => {
      // Ensure we get the real module, not a mock
      jest.unmock('../src/app');
      jest.resetModules();
      const app = require('../src/app');

      expect(typeof app).toBe('function');
      expect(typeof app.listen).toBe('function');
    });

    test('app module has routes mounted', async () => {
      // Ensure we get the real module, not a mock
      jest.unmock('../src/app');
      jest.resetModules();
      const app = require('../src/app');
      const request = require('supertest');

      // Verify routes are working
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello, World!\n');
    });
  });
});
