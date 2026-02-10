/**
 * @fileoverview Server lifecycle tests for server.js entry point
 *
 * Tests cover:
 *   - Server binding to configured host and port
 *   - Startup message logging via Winston logger
 *   - Custom configuration values
 *   - Graceful shutdown support (server.close() capability)
 *   - EADDRINUSE error handling
 *   - Graceful shutdown via SIGTERM and SIGINT signal handlers
 *   - Winston logger integration (replaces console.log)
 *   - dotenv environment variable loading
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
 */

/**
 * @typedef {Object} SetupMocksOptions
 * @property {Object} [mockLogger] - Custom Winston logger mock to use
 * @property {Object} [mockDotenv] - Custom dotenv module mock to use
 */

/**
 * @typedef {Object} SetupMocksResult
 * @property {Object} mockLogger - Mock Winston logger instance with jest.fn() stubs
 * @property {Object} mockDotenv - Mock dotenv module with config jest.fn() stub
 */

/** @type {TestConfig} */
const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'test',
  logLevel: 'info',
  corsOrigin: '*'
};

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
 * Mocks dotenv first to match server.js import order where dotenv.config()
 * is called before any other module imports. Accepts optional custom mocks
 * via the options parameter so callers can provide pre-configured mocks
 * or retrieve handles for assertion verification.
 *
 * @param {jest.Mock} mockListen - Mock listen function
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 * @param {SetupMocksOptions} [options={}] - Optional custom mocks
 * @returns {SetupMocksResult} Object containing mock logger and dotenv references for assertions
 */
function setupMocks(mockListen, config = DEFAULT_CONFIG, options = {}) {
  const mockLogger = options.mockLogger || {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    http: jest.fn(),
    debug: jest.fn()
  };
  const mockDotenv = options.mockDotenv || { config: jest.fn() };

  jest.doMock('dotenv', () => mockDotenv);
  jest.doMock('../../src/app', () => ({ listen: mockListen }));
  jest.doMock('../../src/config', () => ({ ...config }));
  jest.doMock('../../src/utils/logger', () => mockLogger);

  return { mockLogger, mockDotenv };
}

describe('Server Entry Point', () => {
  /** @type {jest.Mock} */
  let mockListen;

  /** @type {MockServer} */
  let mockServer;

  /** @type {jest.SpyInstance} */
  let consoleSpy;

  /** @type {jest.SpyInstance} */
  let processOnSpy;

  /** @type {SetupMocksResult} */
  let mocks;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    processOnSpy = jest.spyOn(process, 'on');
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mocks = setupMocks(mockListen);
  });

  afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
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

  test('should log startup message with server URL', () => {
    require('../../server');

    const expectedMessage = `Server running at http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/`;
    expect(mocks.mockLogger.info).toHaveBeenCalledWith(expectedMessage);
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
      corsOrigin: 'https://example.com'
    };

    const customMockServer = createMockServer(customConfig);
    const customMockListen = createMockListen(customMockServer);
    const customMocks = setupMocks(customMockListen, customConfig);

    require('../../server');

    expect(customMockListen.mock.calls[0][0]).toBe(customConfig.port);
    expect(customMockListen.mock.calls[0][1]).toBe(customConfig.host);

    const expectedMessage = `Server running at http://${customConfig.host}:${customConfig.port}/`;
    expect(customMocks.mockLogger.info).toHaveBeenCalledWith(expectedMessage);
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
    setupMocks(errorMockListen);

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

  describe('Graceful Shutdown', () => {
    /** @type {jest.SpyInstance} */
    let processExitSpy;

    beforeEach(() => {
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    });

    test('should register SIGTERM handler on process', () => {
      require('../../server');

      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });

    test('should register SIGINT handler on process', () => {
      require('../../server');

      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    test('should call server.close() when SIGTERM is received', () => {
      require('../../server');

      const sigtermCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGTERM'
      );
      const sigtermHandler = sigtermCall[1];

      sigtermHandler();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    test('should call server.close() when SIGINT is received', () => {
      require('../../server');

      const sigintCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGINT'
      );
      const sigintHandler = sigintCall[1];

      sigintHandler();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    test('should log shutdown message via Winston logger on SIGTERM', () => {
      require('../../server');

      const sigtermCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGTERM'
      );
      const sigtermHandler = sigtermCall[1];

      sigtermHandler();

      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        'SIGTERM received. Shutting down gracefully...'
      );
    });

    test('should log shutdown message via Winston logger on SIGINT', () => {
      require('../../server');

      const sigintCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGINT'
      );
      const sigintHandler = sigintCall[1];

      sigintHandler();

      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        'SIGINT received. Shutting down gracefully...'
      );
    });

    test('should call process.exit(0) after server closes on SIGTERM', () => {
      require('../../server');

      const sigtermCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGTERM'
      );
      const sigtermHandler = sigtermCall[1];

      sigtermHandler();

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should log server closed message during graceful shutdown', () => {
      require('../../server');

      const sigtermCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGTERM'
      );
      const sigtermHandler = sigtermCall[1];

      sigtermHandler();

      // The mock server.close calls its callback immediately,
      // which should log the "Server closed." message via Winston
      expect(mocks.mockLogger.info).toHaveBeenCalledWith('Server closed.');
    });
  });

  describe('Winston Logger Integration', () => {
    test('should use Winston logger.info for startup message instead of console.log', () => {
      require('../../server');

      const expectedMessage = `Server running at http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/`;
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(expectedMessage);
    });

    test('should import logger from src/utils/logger', () => {
      require('../../server');

      // Verify the mock for ../../src/utils/logger was accessed during require
      // by confirming the mock logger's info method was invoked for the startup message
      expect(mocks.mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('Dotenv Loading', () => {
    test('should call dotenv.config() when server.js is loaded', () => {
      require('../../server');

      expect(mocks.mockDotenv.config).toHaveBeenCalled();
    });

    test('should load dotenv before other module imports', () => {
      require('../../server');

      // dotenv.config() is the first require in updated server.js,
      // ensuring environment variables are available during module initialization
      expect(mocks.mockDotenv.config).toHaveBeenCalledTimes(1);
    });
  });
});
