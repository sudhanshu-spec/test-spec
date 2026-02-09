/**
 * @fileoverview Unit tests for server.js entry point module behavior
 * @module tests/unit/server
 */

/**
 * @typedef {Object} MockServer
 * @property {jest.Mock} close - Close method mock
 * @property {jest.Mock} on - Event listener registration mock
 * @property {jest.Mock} address - Address getter mock
 * @property {Function} [_errorHandler] - Stored error handler
 * @property {Function} [_callback] - Stored callback
 */

/**
 * @typedef {Object} TestConfig
 * @property {string} host - Server host
 * @property {number} port - Server port
 * @property {string} env - Environment name
 */

'use strict';

// =============================================================================
// Test Constants
// =============================================================================

/** @type {TestConfig} */
const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'test'
};

// =============================================================================
// Mock Factory Functions
// =============================================================================

/**
 * Creates a mock server object with standard methods.
 * Mirrors the http.Server interface used by Express's app.listen() return value.
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Server configuration
 * @returns {MockServer} Mock server instance
 */
function createMockServer(config = DEFAULT_CONFIG) {
  /** @type {MockServer} */
  const mockServer = {
    close: jest.fn((callback) => {
      if (callback) callback();
    }),
    on: jest.fn((event, handler) => {
      if (event === 'error') {
        mockServer._errorHandler = handler;
      }
      return mockServer;
    }),
    address: jest.fn(() => ({
      address: config.host,
      port: config.port
    }))
  };
  return mockServer;
}

/**
 * Creates a mock listen function that simulates Express app.listen() behavior.
 * When executeCallback is true, the listen callback is invoked immediately.
 * When false, the callback is stored on the mock server for manual invocation.
 * @param {MockServer} mockServer - Mock server to return from listen
 * @param {boolean} [executeCallback=true] - Whether to execute the listen callback
 * @returns {jest.Mock} Mock listen function
 */
function createMockListen(mockServer, executeCallback = true) {
  return jest.fn((port, host, callback) => {
    if (executeCallback && typeof callback === 'function') {
      callback();
    } else if (!executeCallback) {
      mockServer._callback = callback;
    }
    return mockServer;
  });
}

/**
 * Sets up jest.doMock() interceptors for the app and config modules.
 * Must be called before require('../../server') to intercept module-level side effects.
 * @param {jest.Mock} mockListen - Mock listen function to attach to app mock
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values for config mock
 */
function setupMocks(mockListen, config = DEFAULT_CONFIG) {
  jest.doMock('../../src/app', () => ({ listen: mockListen }));
  jest.doMock('../../src/config', () => ({ ...config }));
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Server Entry Point - Unit Tests', () => {
  /** @type {jest.Mock} */
  let mockListen;

  /** @type {MockServer} */
  let mockServer;

  /** @type {jest.SpyInstance} */
  let consoleSpy;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    setupMocks(mockListen);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Module Dependencies
  // ===========================================================================

  describe('Module Dependencies', () => {
    test('should require src/app module when loaded', () => {
      require('../../server');

      // If mockListen was called, it proves server.js imported the app module
      // and invoked its listen method, since our mock provides listen via doMock
      expect(mockListen).toHaveBeenCalled();
    });

    test('should require src/config module when loaded', () => {
      require('../../server');

      // Verify that mockListen received the config.port value from our mock,
      // proving server.js imported and used the config module's port property
      expect(mockListen.mock.calls[0][0]).toBe(DEFAULT_CONFIG.port);
    });

    test('should use app and config from their respective modules', () => {
      require('../../server');

      // Verify app.listen was invoked (proving app module was used)
      expect(mockListen).toHaveBeenCalled();

      // Verify console.log was called with a message containing the config
      // host and port values (proving config module values were used)
      const expectedMessage = `Server running at http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/`;
      expect(consoleSpy).toHaveBeenCalledWith(expectedMessage);
    });
  });

  // ===========================================================================
  // Server Initialization
  // ===========================================================================

  describe('Server Initialization', () => {
    test('should call app.listen exactly once', () => {
      require('../../server');

      expect(mockListen).toHaveBeenCalledTimes(1);
    });

    test('should pass config.port as first argument to listen', () => {
      require('../../server');

      expect(mockListen.mock.calls[0][0]).toBe(DEFAULT_CONFIG.port);
    });

    test('should pass config.host as second argument to listen', () => {
      require('../../server');

      expect(mockListen.mock.calls[0][1]).toBe(DEFAULT_CONFIG.host);
    });

    test('should pass a callback function as third argument to listen', () => {
      require('../../server');

      expect(typeof mockListen.mock.calls[0][2]).toBe('function');
    });

    test('should return server object from listen call', () => {
      require('../../server');

      // Verify that the mock listen function returned the mockServer object,
      // confirming that app.listen() produces the server instance
      const returnedValue = mockListen.mock.results[0].value;
      expect(returnedValue).toBe(mockServer);
    });
  });

  // ===========================================================================
  // Startup Callback
  // ===========================================================================

  describe('Startup Callback', () => {
    test('should call console.log when startup callback executes', () => {
      require('../../server');

      expect(consoleSpy).toHaveBeenCalled();
    });

    test('should log message matching exact format with default configuration', () => {
      require('../../server');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Server running at http://127.0.0.1:3000/'
      );
    });

    test('should log correct URL with custom host and port configuration', () => {
      // Reset modules and restore spies to set up a fresh isolated test context
      jest.resetModules();
      jest.restoreAllMocks();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      /** @type {TestConfig} */
      const customConfig = {
        host: '0.0.0.0',
        port: 8080,
        env: 'production'
      };

      const customMockServer = createMockServer(customConfig);
      const customMockListen = createMockListen(customMockServer);
      setupMocks(customMockListen, customConfig);

      require('../../server');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Server running at http://0.0.0.0:8080/'
      );
    });

    test('should call console.log exactly once during startup', () => {
      require('../../server');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });
});
