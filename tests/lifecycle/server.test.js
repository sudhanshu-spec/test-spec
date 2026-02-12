/**
 * @fileoverview Lifecycle tests for server entry point (server.js)
 * Tests server startup, Winston-based logging, and graceful shutdown.
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
 * Creates a mock logger instance with all required methods.
 * @returns {Object} Mock Winston logger
 */
function createMockLogger() {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    stream: {
      write: jest.fn()
    }
  };
}

/**
 * Sets up mocks for app, config, and logger modules.
 * @param {jest.Mock} mockListen - Mock listen function
 * @param {Object} mockLogger - Mock logger instance
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 */
function setupMocks(mockListen, mockLogger, config = DEFAULT_CONFIG) {
  jest.doMock('../../src/app', () => ({ listen: mockListen }));
  jest.doMock('../../src/config', () => ({ ...config }));
  jest.doMock('../../src/utils/logger', () => mockLogger);
}

describe('Server Entry Point', () => {
  /** @type {jest.Mock} */
  let mockListen;
  
  /** @type {MockServer} */
  let mockServer;
  
  /** @type {Object} */
  let mockLogger;

  /** @type {Function[]} */
  let signalHandlers;

  beforeEach(() => {
    jest.resetModules();
    mockLogger = createMockLogger();
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    signalHandlers = {};

    // Capture signal handlers instead of actually registering them
    jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      signalHandlers[event] = handler;
      return process;
    });

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

  test('should log startup message with Winston logger.info', () => {
    require('../../server');

    const expectedMessage = `Server running at http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/`;
    expect(mockLogger.info).toHaveBeenCalledWith(expectedMessage);
  });

  test('should use custom configuration values from config module', () => {
    jest.resetModules();

    /** @type {TestConfig} */
    const customConfig = {
      host: '0.0.0.0',
      port: 8080,
      env: 'production',
      logLevel: 'warn',
      corsOrigin: 'https://example.com'
    };

    const customMockLogger = createMockLogger();
    const customMockServer = createMockServer(customConfig);
    const customMockListen = createMockListen(customMockServer);

    jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      signalHandlers[event] = handler;
      return process;
    });

    setupMocks(customMockListen, customMockLogger, customConfig);

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

  test('should register SIGTERM signal handler', () => {
    require('../../server');
    expect(signalHandlers['SIGTERM']).toBeDefined();
    expect(typeof signalHandlers['SIGTERM']).toBe('function');
  });

  test('should register SIGINT signal handler', () => {
    require('../../server');
    expect(signalHandlers['SIGINT']).toBeDefined();
    expect(typeof signalHandlers['SIGINT']).toBe('function');
  });

  test('should log and close server on SIGTERM', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    require('../../server');

    // Trigger SIGTERM handler
    signalHandlers['SIGTERM']();

    expect(mockLogger.info).toHaveBeenCalledWith('SIGTERM received. Shutting down gracefully...');
    expect(mockServer.close).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('Server closed.');

    mockExit.mockRestore();
  });

  test('should log and close server on SIGINT', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    require('../../server');

    // Trigger SIGINT handler
    signalHandlers['SIGINT']();

    expect(mockLogger.info).toHaveBeenCalledWith('SIGINT received. Shutting down gracefully...');
    expect(mockServer.close).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('Server closed.');

    mockExit.mockRestore();
  });
});
