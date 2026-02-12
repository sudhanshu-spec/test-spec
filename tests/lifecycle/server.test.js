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
 * @property {jest.Mock} [listen] - Listen method mock (for HTTPS server)
 * @property {Function} [_errorHandler] - Stored error handler
 * @property {Function} [_callback] - Stored callback
 */

/**
 * @typedef {Object} TestConfig
 * @property {string} host - Server host
 * @property {number} port - Server port
 * @property {string} env - Environment name
 * @property {boolean} httpsEnabled - Whether HTTPS is enabled
 * @property {string} sslKeyPath - Path to SSL key file
 * @property {string} sslCertPath - Path to SSL certificate file
 */

/** @type {TestConfig} */
const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'test',
  httpsEnabled: false,
  sslKeyPath: '',
  sslCertPath: ''
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
    })),
    listen: jest.fn((port, host, callback) => {
      if (typeof callback === 'function') {
        callback();
      }
      return mockServer;
    })
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
 * Sets up mocks for app, config, and optionally https and fs modules.
 * When HTTPS tests are executed, the options parameter allows mocking
 * the Node.js built-in https and fs modules alongside the standard
 * app and config mocks.
 * @param {jest.Mock} mockListen - Mock listen function
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration values
 * @param {Object} [options={}] - Additional module mock options for HTTPS tests
 * @param {Object} [options.mockHttps] - Mock https module (e.g., { createServer: jest.fn() })
 * @param {Object} [options.mockFs] - Mock fs module (e.g., { readFileSync: jest.fn() })
 */
function setupMocks(mockListen, config = DEFAULT_CONFIG, options = {}) {
  jest.doMock('../../src/app', () => ({ listen: mockListen }));
  jest.doMock('../../src/config', () => ({ ...config }));

  if (options.mockHttps) {
    jest.doMock('https', () => options.mockHttps);
  }
  if (options.mockFs) {
    jest.doMock('fs', () => options.mockFs);
  }
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

  // =========================================================================
  // HTTPS Server Support Tests
  // =========================================================================

  describe('HTTPS Server Support', () => {
    test('should create HTTPS server when httpsEnabled is true and cert paths are configured', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      /** @type {TestConfig} */
      const httpsConfig = {
        host: '127.0.0.1',
        port: 3000,
        env: 'test',
        httpsEnabled: true,
        sslKeyPath: '/path/to/key.pem',
        sslCertPath: '/path/to/cert.pem'
      };

      const httpsMockServer = createMockServer(httpsConfig);

      /** @type {jest.Mock} - Mock fs.readFileSync returning key/cert content */
      const mockReadFileSync = jest.fn((filePath) => {
        if (filePath === '/path/to/key.pem') return 'mock-key-content';
        if (filePath === '/path/to/cert.pem') return 'mock-cert-content';
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      });

      /** @type {jest.Mock} - Mock https.createServer returning HTTPS mock server */
      const mockCreateServer = jest.fn(() => httpsMockServer);

      // Use extended setupMocks with https and fs module mocks
      setupMocks(jest.fn(), httpsConfig, {
        mockHttps: { createServer: mockCreateServer },
        mockFs: { readFileSync: mockReadFileSync }
      });

      require('../../server');

      // Retrieve the mocked app module for reference comparison in createServer assertion
      const mockedApp = require('../../src/app');

      // Assert fs.readFileSync was called with the correct certificate paths
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/key.pem');
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/cert.pem');

      // Assert https.createServer was called with key, cert, and the app
      expect(mockCreateServer).toHaveBeenCalledTimes(1);
      expect(mockCreateServer).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'mock-key-content',
          cert: 'mock-cert-content'
        }),
        mockedApp
      );

      // Assert the HTTPS mock server's listen was called with port, host, and callback
      expect(httpsMockServer.listen).toHaveBeenCalledWith(
        httpsConfig.port,
        httpsConfig.host,
        expect.any(Function)
      );

      // Assert startup log message includes 'https://' protocol prefix
      expect(consoleSpy).toHaveBeenCalledWith(
        `HTTPS Server running at https://${httpsConfig.host}:${httpsConfig.port}/`
      );
    });

    test('should create HTTP server when httpsEnabled is false (default behavior)', () => {
      jest.resetModules();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      /** @type {TestConfig} */
      const httpConfig = {
        ...DEFAULT_CONFIG,
        httpsEnabled: false
      };

      const httpMockServer = createMockServer(httpConfig);
      const httpMockListen = createMockListen(httpMockServer);

      // Use setupMocks with default HTTP configuration (no HTTPS options needed)
      setupMocks(httpMockListen, httpConfig);

      require('../../server');

      // Assert app.listen was called (existing HTTP behavior preserved)
      expect(httpMockListen).toHaveBeenCalledTimes(1);

      // Assert startup log message includes 'http://' protocol prefix (not 'https://')
      expect(consoleSpy).toHaveBeenCalledWith(
        `Server running at http://${httpConfig.host}:${httpConfig.port}/`
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('https://')
      );
    });

    test('should handle error when HTTPS enabled but cert files are missing or unreadable', () => {
      jest.resetModules();

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      /** @type {TestConfig} */
      const httpsConfig = {
        ...DEFAULT_CONFIG,
        httpsEnabled: true,
        sslKeyPath: '/invalid/key.pem',
        sslCertPath: '/invalid/cert.pem'
      };

      /** @type {jest.Mock} - Mock fs.readFileSync that throws ENOENT error */
      const mockReadFileSync = jest.fn(() => {
        const err = new Error("ENOENT: no such file or directory, open '/invalid/key.pem'");
        err.code = 'ENOENT';
        throw err;
      });

      const fallbackMockServer = createMockServer();
      const fallbackMockListen = createMockListen(fallbackMockServer);

      // Use extended setupMocks with fs mock that throws on readFileSync
      setupMocks(fallbackMockListen, httpsConfig, {
        mockFs: { readFileSync: mockReadFileSync }
      });

      // Require should NOT throw — graceful error handling with fallback to HTTP
      expect(() => require('../../server')).not.toThrow();

      // Assert console.error was called with appropriate certificate error message
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read SSL certificate files')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to HTTP server')
      );

      // Assert it fell back to HTTP server after certificate read failure
      expect(fallbackMockListen).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });
  });
});
