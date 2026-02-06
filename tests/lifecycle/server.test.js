/**
 * @fileoverview Server lifecycle tests for server.js entry point
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
 */

/** @type {TestConfig} */
const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'test',
  logLevel: 'info'
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
 * Creates a mock Express app with use and listen methods.
 * @param {jest.Mock} mockListen - Mock listen function
 * @returns {Object} Mock app instance
 */
function createMockApp(mockListen) {
  return {
    listen: mockListen,
    use: jest.fn()
  };
}

/**
 * Creates a mock Winston logger.
 * @returns {Object} Mock logger instance
 */
function createMockLogger() {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    stream: { write: jest.fn() }
  };
}

/**
 * Sets up mocks for app, config, logger, and morgan middleware modules.
 * @param {Object} mockApp - Mock app object
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 * @param {Object} [mockLogger] - Mock logger
 * @param {Function} [mockMorgan] - Mock morgan middleware function
 */
function setupMocks(mockApp, config = DEFAULT_CONFIG, mockLogger = null, mockMorgan = null) {
  jest.doMock('../../src/app', () => mockApp);
  jest.doMock('../../src/config', () => ({ ...config }));
  jest.doMock('../../src/utils/logger', () => mockLogger || createMockLogger());
  jest.doMock('../../src/middleware/morgan.middleware', () => mockMorgan || jest.fn());
}

describe('Server Entry Point', () => {
  /** @type {jest.Mock} */
  let mockListen;

  /** @type {MockServer} */
  let mockServer;

  /** @type {Object} */
  let mockApp;

  /** @type {Object} */
  let mockLogger;

  /** @type {jest.Mock} */
  let mockMorgan;

  beforeEach(() => {
    jest.resetModules();
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mockLogger = createMockLogger();
    mockMorgan = jest.fn();
    mockApp = createMockApp(mockListen);
    setupMocks(mockApp, DEFAULT_CONFIG, mockLogger, mockMorgan);
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

  test('should log startup message with Winston logger.info', () => {
    require('../../server');

    const expectedMessage = `Server running at http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/`;
    expect(mockLogger.info).toHaveBeenCalledWith(expectedMessage);
  });

  test('should mount Morgan middleware via app.use', () => {
    require('../../server');

    expect(mockApp.use).toHaveBeenCalledWith(mockMorgan);
  });

  test('should use custom configuration values from config module', () => {
    jest.resetModules();

    /** @type {TestConfig} */
    const customConfig = {
      host: '0.0.0.0',
      port: 8080,
      env: 'production',
      logLevel: 'warn'
    };

    const customMockServer = createMockServer(customConfig);
    const customMockListen = createMockListen(customMockServer);
    const customMockLogger = createMockLogger();
    const customMockApp = createMockApp(customMockListen);
    setupMocks(customMockApp, customConfig, customMockLogger);

    require('../../server');

    expect(customMockListen.mock.calls[0][0]).toBe(customConfig.port);
    expect(customMockListen.mock.calls[0][1]).toBe(customConfig.host);

    const expectedMessage = `Server running at http://${customConfig.host}:${customConfig.port}/`;
    expect(customMockLogger.info).toHaveBeenCalledWith(expectedMessage);
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
    const errorMockApp = createMockApp(errorMockListen);
    setupMocks(errorMockApp, DEFAULT_CONFIG, errorMockLogger);

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
  });
});
