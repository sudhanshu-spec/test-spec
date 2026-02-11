/**
 * @fileoverview Server lifecycle tests for server.js
 *
 * Tests verify server startup, dotenv loading, Winston logger usage,
 * graceful shutdown signal handling (SIGINT/SIGTERM), and PM2 ready signal.
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
 * @property {string} logLevel - Log level
 * @property {string} appName - App name
 * @property {string} corsOrigin - CORS origin
 */

/** @type {TestConfig} */
const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'test',
  logLevel: 'info',
  appName: 'hello_world',
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
 * Creates a mock Winston logger.
 * @returns {Object} Mock logger with standard methods
 */
function createMockLogger() {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn()
  };
}

/**
 * Sets up mocks for app, config, logger, and dotenv modules.
 * @param {jest.Mock} mockListen - Mock listen function
 * @param {Object} mockLogger - Mock logger instance
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 */
function setupMocks(mockListen, mockLogger, config = DEFAULT_CONFIG) {
  jest.doMock('dotenv', () => ({
    config: jest.fn()
  }));
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

  /** @type {jest.SpyInstance} */
  let processExitSpy;

  /** @type {Function|null} */
  let sigintHandler;

  /** @type {Function|null} */
  let sigtermHandler;

  beforeEach(() => {
    jest.resetModules();
    mockLogger = createMockLogger();
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    sigintHandler = null;
    sigtermHandler = null;

    // Spy on process.on to capture signal handlers
    jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      if (event === 'SIGINT') sigintHandler = handler;
      if (event === 'SIGTERM') sigtermHandler = handler;
      return process;
    });

    // Spy on process.exit to prevent actual exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

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

  test('should log startup message with Winston logger', () => {
    require('../../server');

    const expectedMessage = `Server running at http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/`;
    expect(mockLogger.info).toHaveBeenCalledWith(expectedMessage);
  });

  test('should use custom configuration values from config module', () => {
    jest.resetModules();
    mockLogger = createMockLogger();

    /** @type {TestConfig} */
    const customConfig = {
      host: '0.0.0.0',
      port: 8080,
      env: 'production',
      logLevel: 'warn',
      appName: 'custom_app',
      corsOrigin: 'https://example.com'
    };

    const customMockServer = createMockServer(customConfig);
    const customMockListen = createMockListen(customMockServer);

    // Re-spy on process.on for new module load
    jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      if (event === 'SIGINT') sigintHandler = handler;
      if (event === 'SIGTERM') sigtermHandler = handler;
      return process;
    });

    setupMocks(customMockListen, mockLogger, customConfig);

    require('../../server');

    expect(customMockListen.mock.calls[0][0]).toBe(customConfig.port);
    expect(customMockListen.mock.calls[0][1]).toBe(customConfig.host);

    const expectedMessage = `Server running at http://${customConfig.host}:${customConfig.port}/`;
    expect(mockLogger.info).toHaveBeenCalledWith(expectedMessage);
  });

  test('should register SIGINT signal handler', () => {
    require('../../server');

    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(sigintHandler).toBeDefined();
  });

  test('should register SIGTERM signal handler', () => {
    require('../../server');

    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(sigtermHandler).toBeDefined();
  });

  test('should log shutdown message and close server on SIGINT', () => {
    require('../../server');

    expect(sigintHandler).toBeDefined();
    sigintHandler();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('SIGINT')
    );
    expect(mockServer.close).toHaveBeenCalled();
  });

  test('should log shutdown message and close server on SIGTERM', () => {
    require('../../server');

    expect(sigtermHandler).toBeDefined();
    sigtermHandler();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('SIGTERM')
    );
    expect(mockServer.close).toHaveBeenCalled();
  });

  test('should exit with code 0 after graceful shutdown', () => {
    require('../../server');

    sigintHandler();

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  test('should call process.send ready when process.send exists', () => {
    // Mock process.send to simulate PM2 environment
    const originalSend = process.send;
    process.send = jest.fn();

    jest.resetModules();
    mockLogger = createMockLogger();
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);

    jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      if (event === 'SIGINT') sigintHandler = handler;
      if (event === 'SIGTERM') sigtermHandler = handler;
      return process;
    });

    setupMocks(mockListen, mockLogger);

    require('../../server');

    expect(process.send).toHaveBeenCalledWith('ready');

    // Restore
    process.send = originalSend;
  });

  test('should not throw when process.send is undefined (non-PM2 environment)', () => {
    const originalSend = process.send;
    delete process.send;

    jest.resetModules();
    mockLogger = createMockLogger();
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);

    jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      return process;
    });

    setupMocks(mockListen, mockLogger);

    expect(() => require('../../server')).not.toThrow();

    process.send = originalSend;
  });

  test('should export the server instance', () => {
    const server = require('../../server');
    expect(server).toBeDefined();
  });
});
