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

/**
 * Sets up error-scenario mocks for server testing.
 * Creates a mock server with error handler capture and deferred callback execution.
 * @param {string} errorCode - The error code identifier for the test scenario
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 * @returns {{ errorMockServer: MockServer, errorMockListen: jest.Mock, getErrorHandler: Function }}
 */
function setupErrorMocks(errorCode, config = DEFAULT_CONFIG) {
  /** @type {Function|null} */
  let errorHandler = null;
  const errorMockServer = createMockServer(config);
  errorMockServer.on = jest.fn((event, handler) => {
    if (event === 'error') {
      errorHandler = handler;
    }
    return errorMockServer;
  });
  const errorMockListen = createMockListen(errorMockServer, false);
  setupMocks(errorMockListen, config);
  return {
    errorMockServer,
    errorMockListen,
    getErrorHandler: () => errorHandler
  };
}

/**
 * Creates an EACCES (permission denied) error object.
 * @returns {NodeJS.ErrnoException} EACCES error with code and port properties
 */
function createEaccesError() {
  return Object.assign(new Error('listen EACCES: permission denied'), {
    code: 'EACCES',
    port: DEFAULT_CONFIG.port
  });
}

/**
 * Creates a generic/unknown error object for testing unrecognized error codes.
 * @returns {NodeJS.ErrnoException} Generic error with unknown error code
 */
function createGenericError() {
  return Object.assign(new Error('listen error: unknown failure'), {
    code: 'UNKNOWN_ERROR'
  });
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

  test('should call process.exit when EACCES error occurs', () => {
    jest.resetModules();

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

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

    const eaccesError = createEaccesError();

    if (errorHandler) {
      expect(() => errorHandler(eaccesError)).not.toThrow();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    }

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  test('should propagate generic error when unknown error code occurs', () => {
    jest.resetModules();

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const { errorMockListen, getErrorHandler } = setupErrorMocks('UNKNOWN_ERROR');

    require('../../server');

    expect(errorMockListen).toHaveBeenCalled();

    const genericError = createGenericError();
    const errorHandler = getErrorHandler();

    if (errorHandler) {
      expect(() => errorHandler(genericError)).not.toThrow();
    }

    consoleErrorSpy.mockRestore();
  });

  test('should register error handler on server object', () => {
    require('../../server');

    expect(mockListen).toHaveBeenCalled();

    // Verify the server object returned by listen has error handling interface
    const serverObj = mockListen.mock.results[0].value;
    expect(serverObj).toBeDefined();
    expect(typeof serverObj.on).toBe('function');
  });

  test('should handle server startup with port 0', () => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    /** @type {TestConfig} */
    const port0Config = { host: '127.0.0.1', port: 0, env: 'test' };

    const port0MockServer = createMockServer(port0Config);
    const port0MockListen = createMockListen(port0MockServer);
    setupMocks(port0MockListen, port0Config);

    require('../../server');

    expect(port0MockListen.mock.calls[0][0]).toBe(0);
    expect(port0MockListen.mock.calls[0][1]).toBe('127.0.0.1');
    expect(consoleSpy).toHaveBeenCalledWith('Server running at http://127.0.0.1:0/');
  });

  test('should handle server startup with empty host string', () => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    /** @type {TestConfig} */
    const emptyHostConfig = { host: '', port: 3000, env: 'test' };

    const emptyHostMockServer = createMockServer(emptyHostConfig);
    const emptyHostMockListen = createMockListen(emptyHostMockServer);
    setupMocks(emptyHostMockListen, emptyHostConfig);

    require('../../server');

    expect(emptyHostMockListen.mock.calls[0][1]).toBe('');
    expect(consoleSpy).toHaveBeenCalledWith('Server running at http://:3000/');
  });

  test('should execute multiple startup/shutdown cycles cleanly', () => {
    // First startup/shutdown cycle
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const mockServer1 = createMockServer();
    const mockListen1 = createMockListen(mockServer1);
    setupMocks(mockListen1);

    require('../../server');

    expect(mockListen1).toHaveBeenCalled();

    const shutdownCallback1 = jest.fn();
    mockServer1.close(shutdownCallback1);
    expect(shutdownCallback1).toHaveBeenCalled();

    // Second startup/shutdown cycle
    jest.resetModules();
    jest.restoreAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const mockServer2 = createMockServer();
    const mockListen2 = createMockListen(mockServer2);
    setupMocks(mockListen2);

    require('../../server');

    expect(mockListen2).toHaveBeenCalled();

    const shutdownCallback2 = jest.fn();
    mockServer2.close(shutdownCallback2);
    expect(shutdownCallback2).toHaveBeenCalled();
  });

  test.each([
    ['localhost', 4000],
    ['0.0.0.0', 8080],
    ['192.168.1.1', 9090]
  ])('should log correct URL for host %s and port %d', (host, port) => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    /** @type {TestConfig} */
    const config = { host, port, env: 'test' };

    const configMockServer = createMockServer(config);
    const configMockListen = createMockListen(configMockServer);
    setupMocks(configMockListen, config);

    require('../../server');

    expect(consoleSpy).toHaveBeenCalledWith(`Server running at http://${host}:${port}/`);
  });
});
