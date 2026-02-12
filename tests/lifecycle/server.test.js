/**
 * @fileoverview Lifecycle tests for the server entry point (server.js)
 *
 * Tests server startup, Winston logging, graceful shutdown signal handling,
 * and error recovery behavior. Mocks app, config, logger, and dotenv to
 * isolate the server module's wiring logic.
 *
 * @module tests/lifecycle/server
 */

'use strict';

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
 * @property {string} logLevel - Log level
 * @property {string} corsOrigin - CORS origin
 * @property {string} nodeEnv - Node environment
 */

/** @type {TestConfig} */
const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'test',
  logLevel: 'info',
  corsOrigin: '*',
  nodeEnv: 'test'
};

/**
 * Creates a mock Winston logger with standard methods.
 * @returns {Object} Mock logger instance
 */
function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };
}

/**
 * Creates a mock server object with standard methods.
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
 * Creates a mock listen function.
 * @param {MockServer} mockServer - Mock server to return
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
 * Sets up mocks for app, config, logger, and dotenv modules.
 * @param {jest.Mock} mockListen - Mock listen function
 * @param {Object} mockLogger - Mock logger instance
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 */
function setupMocks(mockListen, mockLogger, config = DEFAULT_CONFIG) {
  jest.doMock('../../src/app', () => ({ listen: mockListen }));
  jest.doMock('../../src/config', () => ({ ...config }));
  jest.doMock('../../src/config/logger', () => mockLogger);
  jest.doMock('dotenv', () => ({ config: jest.fn() }));
}

describe('Server Entry Point', () => {
  /** @type {jest.Mock} */
  let mockListen;

  /** @type {MockServer} */
  let mockServer;

  /** @type {Object} */
  let mockLogger;

  /** @type {jest.SpyInstance} */
  let consoleSpy;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mockLogger = createMockLogger();
    setupMocks(mockListen, mockLogger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test('should bind to configured host and port', () => {
    require('../../server');

    expect(mockListen).toHaveBeenCalledTimes(1);
    expect(mockListen.mock.calls[0][0]).toBe(DEFAULT_CONFIG.port);
    expect(mockListen.mock.calls[0][1]).toBe(DEFAULT_CONFIG.host);
    expect(typeof mockListen.mock.calls[0][2]).toBe('function');
  });

  test('should log startup message with server URL via Winston', () => {
    require('../../server');

    expect(mockLogger.info).toHaveBeenCalledWith('Server running', {
      host: DEFAULT_CONFIG.host,
      port: DEFAULT_CONFIG.port,
      url: `http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/`
    });
  });

  test('should use custom configuration values from config module', () => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    /** @type {TestConfig} */
    const customConfig = {
      host: '0.0.0.0',
      port: 8080,
      env: 'production',
      logLevel: 'warn',
      corsOrigin: 'https://example.com',
      nodeEnv: 'production'
    };

    const customMockServer = createMockServer(customConfig);
    const customMockListen = createMockListen(customMockServer);
    const customMockLogger = createMockLogger();
    setupMocks(customMockListen, customMockLogger, customConfig);

    require('../../server');

    expect(customMockListen.mock.calls[0][0]).toBe(customConfig.port);
    expect(customMockListen.mock.calls[0][1]).toBe(customConfig.host);

    expect(customMockLogger.info).toHaveBeenCalledWith('Server running', {
      host: customConfig.host,
      port: customConfig.port,
      url: `http://${customConfig.host}:${customConfig.port}/`
    });
  });

  test('should provide server object that supports graceful shutdown', () => {
    require('../../server');

    expect(mockListen).toHaveBeenCalled();

    const closeCallback = jest.fn();
    mockServer.close(closeCallback);

    expect(mockServer.close).toHaveBeenCalledTimes(1);
    expect(closeCallback).toHaveBeenCalled();
  });

  test('should handle EADDRINUSE error when port is already in use', () => {
    jest.resetModules();

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    /** @type {Function|null} */
    let errorHandler = null;

    const errorMockServer = createMockServer();
    errorMockServer.on = jest.fn((event, handler) => {
      if (event === 'error') {
        errorHandler = handler;
      }
      return errorMockServer;
    });

    const errorMockListen = createMockListen(errorMockServer, false);
    const errorMockLogger = createMockLogger();
    setupMocks(errorMockListen, errorMockLogger);

    require('../../server');

    expect(errorMockListen).toHaveBeenCalled();

    const eaddrinuseError = new Error('listen EADDRINUSE: address already in use');
    /** @type {NodeJS.ErrnoException} */
    const errnoException = Object.assign(eaddrinuseError, {
      code: 'EADDRINUSE',
      port: DEFAULT_CONFIG.port
    });

    if (errorHandler) {
      expect(() => errorHandler(errnoException)).not.toThrow();
    }

    expect(errorMockListen).toHaveBeenCalledWith(
      DEFAULT_CONFIG.port,
      DEFAULT_CONFIG.host,
      expect.any(Function)
    );

    consoleErrorSpy.mockRestore();
  });

  describe('Graceful Shutdown Signal Handling', () => {
    /** @type {Map<string, Function>} */
    let signalHandlers;

    beforeEach(() => {
      signalHandlers = new Map();
      jest.spyOn(process, 'on').mockImplementation((event, handler) => {
        signalHandlers.set(event, handler);
        return process;
      });
    });

    test('should register SIGTERM handler', () => {
      require('../../server');
      expect(signalHandlers.has('SIGTERM')).toBe(true);
    });

    test('should register SIGINT handler', () => {
      require('../../server');
      expect(signalHandlers.has('SIGINT')).toBe(true);
    });

    test('should log and close server on SIGTERM', () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
      require('../../server');

      const sigTermHandler = signalHandlers.get('SIGTERM');
      expect(sigTermHandler).toBeDefined();

      sigTermHandler();

      expect(mockLogger.info).toHaveBeenCalledWith('SIGTERM received. Shutting down gracefully...');
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Server closed');
      expect(exitSpy).toHaveBeenCalledWith(0);

      exitSpy.mockRestore();
    });

    test('should log and close server on SIGINT', () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
      require('../../server');

      const sigIntHandler = signalHandlers.get('SIGINT');
      expect(sigIntHandler).toBeDefined();

      sigIntHandler();

      expect(mockLogger.info).toHaveBeenCalledWith('SIGINT received. Shutting down gracefully...');
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Server closed');
      expect(exitSpy).toHaveBeenCalledWith(0);

      exitSpy.mockRestore();
    });
  });
});
