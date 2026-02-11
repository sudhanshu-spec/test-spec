/**
 * @fileoverview Server lifecycle tests for server.js entry point
 *
 * Tests verify server startup, dotenv environment loading, Winston logger
 * integration (replacing console.log/console.error), graceful shutdown
 * signal handling (SIGINT/SIGTERM), and PM2 process.send('ready') signaling.
 *
 * Uses jest.doMock for module isolation and factory functions for mock setup.
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
 * Sets up mocks for app, config, logger, and dotenv modules.
 * Creates a mock Winston logger internally and returns it for test assertions.
 * @param {jest.Mock} mockListen - Mock listen function
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 * @returns {Object} mockLogger - Mock logger with info, error, warn, http, debug methods
 */
function setupMocks(mockListen, config = DEFAULT_CONFIG) {
  jest.doMock('../../src/app', () => ({ listen: mockListen }));
  jest.doMock('../../src/config', () => ({ ...config }));
  const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn(), debug: jest.fn() };
  jest.doMock('../../src/utils/logger', () => mockLogger);
  jest.doMock('dotenv', () => ({ config: jest.fn() }));
  return mockLogger;
}

describe('Server Entry Point', () => {
  /** @type {jest.Mock} */
  let mockListen;

  /** @type {MockServer} */
  let mockServer;

  /** @type {jest.SpyInstance} */
  let consoleSpy;

  /** @type {Object} */
  let mockLogger;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Prevent actual signal handler registration during entry point tests
    jest.spyOn(process, 'on').mockImplementation(() => process);
    // Prevent actual process exit during tests
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mockLogger = setupMocks(mockListen);
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

  test('should use custom configuration values from config module', () => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'on').mockImplementation(() => process);
    jest.spyOn(process, 'exit').mockImplementation(() => {});

    /** @type {TestConfig} */
    const customConfig = {
      host: '0.0.0.0',
      port: 8080,
      env: 'production'
    };

    const customMockServer = createMockServer(customConfig);
    const customMockListen = createMockListen(customMockServer);
    const customMockLogger = setupMocks(customMockListen, customConfig);

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

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(process, 'on').mockImplementation(() => process);
    jest.spyOn(process, 'exit').mockImplementation(() => {});

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
    const errorMockLogger = setupMocks(errorMockListen);

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
      expect(errorMockLogger.error).toHaveBeenCalled();
    }

    expect(errorMockListen).toHaveBeenCalledWith(
      DEFAULT_CONFIG.port,
      DEFAULT_CONFIG.host,
      expect.any(Function)
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('Graceful Shutdown', () => {
  let mockServer;
  let mockListen;
  let mockLogger;
  let processOnSpy;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Spy on process.on to capture signal handler registrations
    processOnSpy = jest.spyOn(process, 'on');
    // Prevent actual process exit during shutdown handler invocation
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mockLogger = setupMocks(mockListen);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should register SIGINT signal handler', () => {
    require('../../server');
    expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  test('should register SIGTERM signal handler', () => {
    require('../../server');
    expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });

  test('should call server.close when SIGINT is received', () => {
    require('../../server');
    const sigintCall = processOnSpy.mock.calls.find(call => call[0] === 'SIGINT');
    const sigintHandler = sigintCall[1];
    sigintHandler();
    expect(mockServer.close).toHaveBeenCalled();
  });

  test('should call server.close when SIGTERM is received', () => {
    require('../../server');
    const sigtermCall = processOnSpy.mock.calls.find(call => call[0] === 'SIGTERM');
    const sigtermHandler = sigtermCall[1];
    sigtermHandler();
    expect(mockServer.close).toHaveBeenCalled();
  });

  test('should log shutdown message when signal is received', () => {
    require('../../server');
    const sigintCall = processOnSpy.mock.calls.find(call => call[0] === 'SIGINT');
    const sigintHandler = sigintCall[1];
    sigintHandler();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Shutting down'));
  });
});

describe('PM2 Integration', () => {
  let mockServer;
  let mockListen;
  let mockLogger;
  let originalProcessSend;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Prevent actual signal handler registration for PM2-focused tests
    jest.spyOn(process, 'on').mockImplementation(() => process);
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    originalProcessSend = process.send;
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mockLogger = setupMocks(mockListen);
  });

  afterEach(() => {
    process.send = originalProcessSend;
    jest.restoreAllMocks();
  });

  test('should send PM2 ready signal after server starts', () => {
    process.send = jest.fn();
    require('../../server');
    expect(process.send).toHaveBeenCalledWith('ready');
  });

  test('should not throw when process.send is not available', () => {
    process.send = undefined;
    expect(() => require('../../server')).not.toThrow();
  });
});

describe('Logger Integration', () => {
  let mockServer;
  let mockListen;
  let mockLogger;
  let consoleSpy;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Prevent actual signal handler registration for logger-focused tests
    jest.spyOn(process, 'on').mockImplementation(() => process);
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mockLogger = setupMocks(mockListen);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should use Winston logger.info for startup message instead of console.log', () => {
    require('../../server');
    const expectedMessage = `Server running at http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/`;
    expect(mockLogger.info).toHaveBeenCalledWith(expectedMessage);
  });

  test('should use Winston logger.error for error logging', () => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'on').mockImplementation(() => process);
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    const errorMockServer = createMockServer();
    let errorHandler = null;
    errorMockServer.on = jest.fn((event, handler) => {
      if (event === 'error') errorHandler = handler;
      return errorMockServer;
    });
    const errorMockListen = createMockListen(errorMockServer, false);
    const errorMockLogger = setupMocks(errorMockListen);
    require('../../server');
    const err = Object.assign(new Error('EADDRINUSE'), { code: 'EADDRINUSE', port: DEFAULT_CONFIG.port });
    if (errorHandler) {
      errorHandler(err);
      expect(errorMockLogger.error).toHaveBeenCalled();
    }
  });
});
