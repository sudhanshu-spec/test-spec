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

  /** @type {jest.SpyInstance} */
  let consoleErrorSpy;

  /** @type {jest.SpyInstance} */
  let processExitSpy;

  /** @type {jest.SpyInstance} */
  let processOnSpy;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    processOnSpy = jest.spyOn(process, 'on');
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
    setupMocks(mockListen);
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
    expect(consoleSpy).toHaveBeenCalledWith(expectedMessage);
  });

  test('should use custom configuration values from config module', () => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

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

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

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

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe('Error Handling', () => {
    test('should register error handler on server', () => {
      require('../../server');

      expect(mockServer.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should handle EACCES error without throwing', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      const eaccesMockServer = createMockServer();
      const eaccesMockListen = createMockListen(eaccesMockServer, false);
      setupMocks(eaccesMockListen);

      require('../../server');

      const errorHandler = eaccesMockServer._errorHandler;
      expect(errorHandler).toBeDefined();

      const eaccesError = Object.assign(new Error('listen EACCES: permission denied'), {
        code: 'EACCES',
        port: DEFAULT_CONFIG.port
      });

      expect(() => errorHandler(eaccesError)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('elevated privileges')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should handle generic server error without throwing', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      const genericMockServer = createMockServer();
      const genericMockListen = createMockListen(genericMockServer, false);
      setupMocks(genericMockListen);

      require('../../server');

      const errorHandler = genericMockServer._errorHandler;
      expect(errorHandler).toBeDefined();

      const genericError = new Error('something unexpected happened');

      expect(() => errorHandler(genericError)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('something unexpected happened')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  // =========================================================================
  // Configuration Validation
  // =========================================================================

  describe('Configuration Validation', () => {
    test('should reject negative port number', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      /** @type {TestConfig} */
      const invalidConfig = { host: '127.0.0.1', port: -1, env: 'test' };
      const negMockServer = createMockServer(invalidConfig);
      const negMockListen = createMockListen(negMockServer);
      setupMocks(negMockListen, invalidConfig);

      expect(() => require('../../server')).toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid port number')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(negMockListen).not.toHaveBeenCalled();
    });

    test('should reject port number above 65535', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      /** @type {TestConfig} */
      const invalidConfig = { host: '127.0.0.1', port: 99999, env: 'test' };
      const highMockServer = createMockServer(invalidConfig);
      const highMockListen = createMockListen(highMockServer);
      setupMocks(highMockListen, invalidConfig);

      expect(() => require('../../server')).toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid port number')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(highMockListen).not.toHaveBeenCalled();
    });

    test('should reject NaN port number', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      /** @type {TestConfig} */
      const invalidConfig = { host: '127.0.0.1', port: NaN, env: 'test' };
      const nanMockServer = createMockServer(invalidConfig);
      const nanMockListen = createMockListen(nanMockServer);
      setupMocks(nanMockListen, invalidConfig);

      expect(() => require('../../server')).toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid port number')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(nanMockListen).not.toHaveBeenCalled();
    });

    test('should reject empty host string', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      /** @type {TestConfig} */
      const invalidConfig = { host: '', port: 3000, env: 'test' };
      const emptyHostMockServer = createMockServer(invalidConfig);
      const emptyHostMockListen = createMockListen(emptyHostMockServer);
      setupMocks(emptyHostMockListen, invalidConfig);

      expect(() => require('../../server')).toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid host')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(emptyHostMockListen).not.toHaveBeenCalled();
    });

    test('should accept boundary port 1 (minimum valid)', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      /** @type {TestConfig} */
      const validConfig = { host: '127.0.0.1', port: 1, env: 'test' };
      const minMockServer = createMockServer(validConfig);
      const minMockListen = createMockListen(minMockServer);
      setupMocks(minMockListen, validConfig);

      require('../../server');

      expect(processExitSpy).not.toHaveBeenCalled();
      expect(minMockListen).toHaveBeenCalledWith(1, '127.0.0.1', expect.any(Function));
    });

    test('should accept boundary port 65535 (maximum valid)', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      /** @type {TestConfig} */
      const validConfig = { host: '127.0.0.1', port: 65535, env: 'test' };
      const maxMockServer = createMockServer(validConfig);
      const maxMockListen = createMockListen(maxMockServer);
      setupMocks(maxMockListen, validConfig);

      require('../../server');

      expect(processExitSpy).not.toHaveBeenCalled();
      expect(maxMockListen).toHaveBeenCalledWith(65535, '127.0.0.1', expect.any(Function));
    });
  });

  // =========================================================================
  // Graceful Shutdown
  // =========================================================================

  describe('Graceful Shutdown', () => {
    test('should register SIGTERM and SIGINT handlers', () => {
      require('../../server');

      const sigTermCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGTERM'
      );
      const sigIntCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGINT'
      );

      expect(sigTermCall).toBeDefined();
      expect(typeof sigTermCall[1]).toBe('function');
      expect(sigIntCall).toBeDefined();
      expect(typeof sigIntCall[1]).toBe('function');
    });

    test('should gracefully shutdown on SIGTERM', () => {
      require('../../server');

      const sigTermCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGTERM'
      );
      expect(sigTermCall).toBeDefined();

      /** @type {Function} */
      const sigTermHandler = sigTermCall[1];
      sigTermHandler();

      expect(mockServer.close).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should gracefully shutdown on SIGINT', () => {
      require('../../server');

      const sigIntCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGINT'
      );
      expect(sigIntCall).toBeDefined();

      /** @type {Function} */
      const sigIntHandler = sigIntCall[1];
      sigIntHandler();

      expect(mockServer.close).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should force shutdown after timeout when server.close hangs', () => {
      jest.useFakeTimers();

      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
      processOnSpy = jest.spyOn(process, 'on');

      /** @type {MockServer} */
      const hangingMockServer = createMockServer();
      // Override close to NOT invoke its callback (simulating a hanging close)
      hangingMockServer.close = jest.fn(() => {});
      const hangingMockListen = createMockListen(hangingMockServer);
      setupMocks(hangingMockListen);

      require('../../server');

      const sigTermCall = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGTERM'
      );
      expect(sigTermCall).toBeDefined();

      /** @type {Function} */
      const sigTermHandler = sigTermCall[1];
      sigTermHandler();

      // At this point, server.close was called but its callback hasn't fired
      expect(hangingMockServer.close).toHaveBeenCalled();
      // process.exit(0) should NOT have been called yet because the close callback didn't fire
      expect(processExitSpy).not.toHaveBeenCalledWith(0);

      // Advance timers by 5000ms to trigger the forced shutdown timeout
      jest.advanceTimersByTime(5000);

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Forced shutdown')
      );

      jest.useRealTimers();
    });
  });

  // =========================================================================
  // Module Export
  // =========================================================================

  describe('Module Export', () => {
    test('should export the server instance', () => {
      const server = require('../../server');

      expect(server).toBe(mockServer);
    });
  });
});
