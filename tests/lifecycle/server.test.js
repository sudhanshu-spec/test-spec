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
 * Sets up mocks for app and config modules.
 * @param {jest.Mock} mockListen - Mock listen function
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 */
function setupMocks(mockListen, config = DEFAULT_CONFIG) {
  jest.doMock('../../src/app', () => ({ listen: mockListen }));
  jest.doMock('../../src/config', () => ({ ...config }));
}

describe('Server Entry Point', () => {
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
    expect(consoleSpy).toHaveBeenCalledWith(expectedMessage);
  });

  test('should use custom configuration values from config module', () => {
    jest.resetModules();
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

    expect(customMockListen.mock.calls[0][0]).toBe(customConfig.port);
    expect(customMockListen.mock.calls[0][1]).toBe(customConfig.host);

    const expectedMessage = `Server running at http://${customConfig.host}:${customConfig.port}/`;
    expect(consoleSpy).toHaveBeenCalledWith(expectedMessage);
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

  test('should handle EACCES error for privileged ports', () => {
    jest.resetModules();

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    /** @type {TestConfig} */
    const privilegedPortConfig = {
      host: '127.0.0.1',
      port: 80,
      env: 'test'
    };

    /** @type {Function|null} */
    let errorHandler = null;

    const errorMockServer = createMockServer(privilegedPortConfig);
    errorMockServer.on = jest.fn((event, handler) => {
      if (event === 'error') {
        errorHandler = handler;
      }
      return errorMockServer;
    });

    const errorMockListen = createMockListen(errorMockServer, false);
    setupMocks(errorMockListen, privilegedPortConfig);

    require('../../server');

    expect(errorMockListen).toHaveBeenCalled();

    const eaccesError = new Error('listen EACCES: permission denied');
    /** @type {NodeJS.ErrnoException} */
    const errnoException = Object.assign(eaccesError, {
      code: 'EACCES',
      port: privilegedPortConfig.port
    });

    if (errorHandler) {
      expect(() => errorHandler(errnoException)).not.toThrow();
    }

    expect(errorMockListen).toHaveBeenCalledWith(
      privilegedPortConfig.port,
      privilegedPortConfig.host,
      expect.any(Function)
    );

    consoleErrorSpy.mockRestore();
  });

  test('should support IPv6 host binding', () => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    /** @type {TestConfig} */
    const ipv6Config = {
      host: '::1',
      port: 3000,
      env: 'test'
    };

    const ipv6MockServer = createMockServer(ipv6Config);
    const ipv6MockListen = createMockListen(ipv6MockServer);
    setupMocks(ipv6MockListen, ipv6Config);

    require('../../server');

    expect(ipv6MockListen).toHaveBeenCalledTimes(1);
    expect(ipv6MockListen.mock.calls[0][0]).toBe(ipv6Config.port);
    expect(ipv6MockListen.mock.calls[0][1]).toBe(ipv6Config.host);
    expect(typeof ipv6MockListen.mock.calls[0][2]).toBe('function');

    const expectedMessage = `Server running at http://${ipv6Config.host}:${ipv6Config.port}/`;
    expect(consoleSpy).toHaveBeenCalledWith(expectedMessage);
  });

  test('should work with zero port for dynamic assignment', () => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    /** @type {TestConfig} */
    const dynamicPortConfig = {
      host: '127.0.0.1',
      port: 0,
      env: 'test'
    };

    const dynamicMockServer = createMockServer(dynamicPortConfig);
    const dynamicMockListen = createMockListen(dynamicMockServer);
    setupMocks(dynamicMockListen, dynamicPortConfig);

    require('../../server');

    expect(dynamicMockListen).toHaveBeenCalledTimes(1);
    expect(dynamicMockListen.mock.calls[0][0]).toBe(0);
    expect(dynamicMockListen.mock.calls[0][1]).toBe(dynamicPortConfig.host);
    expect(typeof dynamicMockListen.mock.calls[0][2]).toBe('function');

    const expectedMessage = `Server running at http://${dynamicPortConfig.host}:${dynamicPortConfig.port}/`;
    expect(consoleSpy).toHaveBeenCalledWith(expectedMessage);
  });
});
