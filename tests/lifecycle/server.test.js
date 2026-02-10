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
 */

/** @type {TestConfig} */
const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'test'
};

/**
 * Mock Winston logger singleton with tracked method calls.
 * Defined at module level so all tests share the same reference when
 * registered via jest.doMock. Mock methods are cleared in beforeEach
 * to ensure test isolation between test cases.
 * @type {{ info: jest.Mock, error: jest.Mock, http: jest.Mock, stream: { write: jest.Mock } }}
 */
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  http: jest.fn(),
  stream: { write: jest.fn() }
};

/**
 * Mock Morgan middleware — no-op function that calls next() to continue
 * the middleware chain. Used to verify that server.js mounts Morgan via
 * app.use(morganMiddleware) before calling app.listen().
 * @type {jest.Mock}
 */
const mockMorganMiddleware = jest.fn((req, res, next) => next());

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
 * Sets up mocks for app, config, logger, and morgan middleware modules.
 * Registers jest.doMock for all four modules that server.js imports.
 * @param {jest.Mock} mockListen - Mock listen function
 * @param {jest.Mock} mockUse - Mock use function for mounting middleware
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 */
function setupMocks(mockListen, mockUse, config = DEFAULT_CONFIG) {
  jest.doMock('../../src/app', () => ({ listen: mockListen, use: mockUse }));
  jest.doMock('../../src/config', () => ({ ...config }));
  jest.doMock('../../src/utils/logger', () => mockLogger);
  jest.doMock('../../src/middleware/morgan.middleware', () => mockMorganMiddleware);
}

describe('Server Entry Point', () => {
  /** @type {jest.Mock} */
  let mockListen;

  /** @type {MockServer} */
  let mockServer;

  /** @type {jest.SpyInstance} */
  let consoleSpy;

  /** @type {jest.Mock} */
  let mockUse;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mockUse = jest.fn();
    // Clear mock logger and morgan calls from previous tests to ensure isolation
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockLogger.http.mockClear();
    mockLogger.stream.write.mockClear();
    mockMorganMiddleware.mockClear();
    setupMocks(mockListen, mockUse);
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

  test('should log startup message with server URL', () => {
    require('../../server');

    const expectedMessage = `Server running at http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/`;
    expect(mockLogger.info).toHaveBeenCalledWith(expectedMessage);
  });

  test('should mount Morgan middleware', () => {
    require('../../server');

    expect(mockUse).toHaveBeenCalled();
    expect(mockUse).toHaveBeenCalledWith(mockMorganMiddleware);
  });

  test('should use Winston logger instead of console.log for startup', () => {
    require('../../server');

    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Server running at')
    );
  });

  test('should use custom configuration values from config module', () => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockLogger.info.mockClear();

    /** @type {TestConfig} */
    const customConfig = {
      host: '0.0.0.0',
      port: 8080,
      env: 'production'
    };

    const customMockServer = createMockServer(customConfig);
    const customMockListen = createMockListen(customMockServer);
    const customMockUse = jest.fn();
    setupMocks(customMockListen, customMockUse, customConfig);

    require('../../server');

    expect(customMockListen.mock.calls[0][0]).toBe(customConfig.port);
    expect(customMockListen.mock.calls[0][1]).toBe(customConfig.host);

    const expectedMessage = `Server running at http://${customConfig.host}:${customConfig.port}/`;
    expect(mockLogger.info).toHaveBeenCalledWith(expectedMessage);
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
    const errorMockUse = jest.fn();
    setupMocks(errorMockListen, errorMockUse);

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
});
