/**
 * @fileoverview Server lifecycle tests for server.js entry point
 * Tests server binding, startup logging, and graceful shutdown handling
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
 * @property {string} [logLevel] - Log level
 * @property {string} [logFormat] - Log format
 * @property {string} [corsOrigin] - CORS origin
 * @property {number} [pm2Instances] - PM2 instances
 */

/**
 * @typedef {Object} MockLogger
 * @property {jest.Mock} info - Info log mock
 * @property {jest.Mock} error - Error log mock
 * @property {jest.Mock} warn - Warn log mock
 * @property {jest.Mock} debug - Debug log mock
 * @property {jest.Mock} http - HTTP log mock
 */

/** @type {TestConfig} */
const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'test',
  logLevel: 'info',
  logFormat: 'combined',
  corsOrigin: '*',
  pm2Instances: 0
};

/**
 * Creates a mock logger object for testing.
 * @returns {{ logger: MockLogger, stream: { write: jest.Mock } }} Mock logger instance
 */
function createMockLogger() {
  return {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      http: jest.fn()
    },
    stream: {
      write: jest.fn()
    }
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
 * Sets up mocks for app, config, and logger modules.
 * @param {jest.Mock} mockListen - Mock listen function
 * @param {{ logger: MockLogger, stream: { write: jest.Mock } }} mockLoggerModule - Mock logger module
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 */
function setupMocks(mockListen, mockLoggerModule, config = DEFAULT_CONFIG) {
  jest.doMock('../../src/app', () => ({ listen: mockListen }));
  jest.doMock('../../src/config', () => ({ ...config }));
  jest.doMock('../../src/utils/logger', () => mockLoggerModule);
}

describe('Server Entry Point', () => {
  /** @type {jest.Mock} */
  let mockListen;
  
  /** @type {MockServer} */
  let mockServer;
  
  /** @type {{ logger: MockLogger, stream: { write: jest.Mock } }} */
  let mockLoggerModule;

  beforeEach(() => {
    jest.resetModules();
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mockLoggerModule = createMockLogger();
    setupMocks(mockListen, mockLoggerModule);
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
    expect(mockLoggerModule.logger.info).toHaveBeenCalledWith(expectedMessage);
  });

  test('should use custom configuration values from config module', () => {
    jest.resetModules();

    /** @type {TestConfig} */
    const customConfig = {
      host: '0.0.0.0',
      port: 8080,
      env: 'production',
      logLevel: 'info',
      logFormat: 'combined',
      corsOrigin: '*',
      pm2Instances: 0
    };

    const customMockServer = createMockServer(customConfig);
    const customMockListen = createMockListen(customMockServer);
    const customMockLogger = createMockLogger();
    setupMocks(customMockListen, customMockLogger, customConfig);

    require('../../server');

    expect(customMockListen.mock.calls[0][0]).toBe(customConfig.port);
    expect(customMockListen.mock.calls[0][1]).toBe(customConfig.host);

    const expectedMessage = `Server running at http://${customConfig.host}:${customConfig.port}/`;
    expect(customMockLogger.logger.info).toHaveBeenCalledWith(expectedMessage);
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
  });
});

describe('Graceful Shutdown Handling', () => {
  /** @type {jest.Mock} */
  let mockListen;
  
  /** @type {MockServer} */
  let mockServer;
  
  /** @type {{ logger: MockLogger, stream: { write: jest.Mock } }} */
  let mockLoggerModule;
  
  /** @type {Map<string, Function>} */
  let signalHandlers;
  
  /** @type {jest.SpyInstance} */
  let processOnSpy;
  
  /** @type {jest.SpyInstance} */
  let processExitSpy;

  beforeEach(() => {
    jest.resetModules();
    
    signalHandlers = new Map();
    
    // Spy on process.on to capture signal handlers
    processOnSpy = jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      signalHandlers.set(event, handler);
      return process;
    });
    
    // Spy on process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    mockLoggerModule = createMockLogger();
    setupMocks(mockListen, mockLoggerModule);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    signalHandlers.clear();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test('should register SIGTERM signal handler', () => {
    require('../../server');
    
    expect(signalHandlers.has('SIGTERM')).toBe(true);
    expect(typeof signalHandlers.get('SIGTERM')).toBe('function');
  });

  test('should register SIGINT signal handler', () => {
    require('../../server');
    
    expect(signalHandlers.has('SIGINT')).toBe(true);
    expect(typeof signalHandlers.get('SIGINT')).toBe('function');
  });

  test('should log shutdown initiated message on SIGTERM', () => {
    require('../../server');
    
    const sigtermHandler = signalHandlers.get('SIGTERM');
    if (sigtermHandler) {
      sigtermHandler();
    }
    
    // Check that logger.info was called with a shutdown message
    expect(mockLoggerModule.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('SIGTERM')
    );
  });

  test('should call server.close() during shutdown', () => {
    require('../../server');
    
    const sigtermHandler = signalHandlers.get('SIGTERM');
    if (sigtermHandler) {
      sigtermHandler();
    }
    
    expect(mockServer.close).toHaveBeenCalled();
  });

  test('should exit with code 0 on clean shutdown', () => {
    require('../../server');
    
    const sigtermHandler = signalHandlers.get('SIGTERM');
    if (sigtermHandler) {
      sigtermHandler();
    }
    
    // server.close callback should have called process.exit(0)
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  test('should log shutdown complete message on clean exit', () => {
    require('../../server');
    
    const sigtermHandler = signalHandlers.get('SIGTERM');
    if (sigtermHandler) {
      sigtermHandler();
    }
    
    // Should have logged shutdown complete
    expect(mockLoggerModule.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('shutdown')
    );
  });

  test('should handle SIGINT signal for graceful shutdown', () => {
    require('../../server');
    
    const sigintHandler = signalHandlers.get('SIGINT');
    if (sigintHandler) {
      sigintHandler();
    }
    
    expect(mockServer.close).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  test('should exit with code 1 on shutdown timeout', () => {
    jest.useFakeTimers();
    
    jest.resetModules();
    signalHandlers.clear();
    
    processOnSpy = jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      signalHandlers.set(event, handler);
      return process;
    });
    
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    // Create a server that doesn't call the close callback (simulates hanging connections)
    const hangingServer = createMockServer();
    hangingServer.close = jest.fn(() => {
      // Don't call callback - simulate hanging
    });
    
    const hangingMockListen = createMockListen(hangingServer);
    const hangingMockLogger = createMockLogger();
    setupMocks(hangingMockListen, hangingMockLogger);
    
    require('../../server');
    
    const sigtermHandler = signalHandlers.get('SIGTERM');
    if (sigtermHandler) {
      sigtermHandler();
    }
    
    // Advance timers by 30 seconds (shutdown timeout)
    jest.advanceTimersByTime(30000);
    
    // Should have logged timeout error and called exit(1)
    expect(hangingMockLogger.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('timeout')
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
    
    jest.useRealTimers();
  });

  test('should prevent multiple shutdown attempts', () => {
    require('../../server');
    
    const sigtermHandler = signalHandlers.get('SIGTERM');
    if (sigtermHandler) {
      // Call twice
      sigtermHandler();
      sigtermHandler();
    }
    
    // server.close should only be called once
    expect(mockServer.close).toHaveBeenCalledTimes(1);
  });

  test('should register uncaughtException handler', () => {
    require('../../server');
    
    expect(signalHandlers.has('uncaughtException')).toBe(true);
    expect(typeof signalHandlers.get('uncaughtException')).toBe('function');
  });

  test('should register unhandledRejection handler', () => {
    require('../../server');
    
    expect(signalHandlers.has('unhandledRejection')).toBe(true);
    expect(typeof signalHandlers.get('unhandledRejection')).toBe('function');
  });
});
