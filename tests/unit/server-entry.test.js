/**
 * @fileoverview Unit tests for the listen-error and signal-shutdown paths of the
 * server.js entry point, complementing the frozen lifecycle suite.
 * @module tests/unit/server-entry
 */

'use strict';

/**
 * @typedef {Object} TestConfig
 * @property {string} host - Server host
 * @property {number} port - Server port
 * @property {string} env - Environment name
 */

/**
 * @typedef {Object} MockServer
 * @property {jest.Mock} close - Close method mock
 * @property {jest.Mock} on - Event listener registration mock
 * @property {jest.Mock} address - Address getter mock
 * @property {Function} [_errorHandler] - Stored 'error' listener
 * @property {Function} [_callback] - Stored listen callback
 */

/**
 * @typedef {Object} EntryOptions
 * @property {TestConfig} [config] - Configuration handed to the entry point
 * @property {boolean} [executeListenCallback] - Whether the mocked listen runs its callback
 * @property {Function} [closeImplementation] - Replacement for the mock server's close
 * @property {Function} [closeDbImplementation] - Replacement for the mocked closeDb
 */

/**
 * @typedef {Object} EntryHarness
 * @property {MockServer} mockServer - HTTP server object the entry point received
 * @property {jest.Mock} mockListen - Stand-in for app.listen
 * @property {jest.Mock} mockCloseDb - Stand-in for closeDb from src/db
 * @property {TestConfig} config - Configuration the entry point ran against
 */

/** @type {TestConfig} */
const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'test'
};

/**
 * Creates a mock HTTP server exposing the methods the entry point uses.
 * @param {TestConfig} [config=DEFAULT_CONFIG] - Configuration reported by address()
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
 * Creates a mock listen function bound to a mock server.
 * @param {MockServer} mockServer - Server the mock listen returns
 * @param {boolean} [executeCallback=true] - Whether listen runs its callback
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
 * Registers the module mocks and loads the entry point under them.
 *
 * src/app is replaced by an object exposing only listen, which is the whole of
 * the app object the entry point is allowed to touch, and src/db is replaced by
 * a spy so the lazily required shutdown path stays observable without loading
 * the native SQLite driver.
 *
 * @param {EntryOptions} [options={}] - Overrides for the default harness
 * @returns {EntryHarness} The mocks and configuration the entry point ran against
 */
function setupEntry(options = {}) {
  const {
    config = DEFAULT_CONFIG,
    executeListenCallback = true,
    closeImplementation,
    closeDbImplementation
  } = options;

  const mockServer = createMockServer(config);

  if (typeof closeImplementation === 'function') {
    mockServer.close.mockImplementation(closeImplementation);
  }

  const mockListen = createMockListen(mockServer, executeListenCallback);
  const mockCloseDb = typeof closeDbImplementation === 'function'
    ? jest.fn(closeDbImplementation)
    : jest.fn();

  jest.doMock('../../src/app', () => ({ listen: mockListen }));
  jest.doMock('../../src/config', () => ({ ...config }));
  jest.doMock('../../src/db', () => ({ closeDb: mockCloseDb }));

  require('../../server');

  return { mockServer, mockListen, mockCloseDb, config };
}

/**
 * Joins everything a console spy recorded into one searchable string.
 * @param {jest.SpyInstance} spy - Spy on console.log or console.error
 * @returns {string} Recorded output, one call per line
 */
function capturedOutput(spy) {
  return spy.mock.calls.map(args => args.map(arg => String(arg)).join(' ')).join('\n');
}

/**
 * Builds the error Node emits when a bind fails.
 * @param {string} code - Errno code such as EADDRINUSE
 * @param {number} port - Port the bind targeted
 * @param {string} [message] - Error message
 * @returns {NodeJS.ErrnoException} The error the HTTP server emits
 */
function createBindError(code, port, message = `listen ${code}: bind failed`) {
  return Object.assign(new Error(message), { code, port });
}

/**
 * Records a handler registered for a process event.
 * @param {Map<string, Function[]>} registry - Event name to registered handlers
 * @param {string} event - Event name
 * @param {Function} handler - Registered handler
 * @returns {NodeJS.Process} The process object, as process.on() returns
 */
function recordHandler(registry, event, handler) {
  const handlers = registry.get(event) || [];
  handlers.push(handler);
  registry.set(event, handlers);
  return process;
}

/**
 * Returns the last handler the entry point registered for a signal.
 * @param {Map<string, Function[]>} registry - Event name to registered handlers
 * @param {string} signal - Signal name
 * @returns {Function} The registered handler
 * @throws {Error} When no handler was registered for the signal
 */
function getSignalHandler(registry, signal) {
  const handlers = registry.get(signal) || [];
  if (handlers.length === 0) {
    throw new Error(`server.js registered no handler for ${signal}`);
  }
  return handlers[handlers.length - 1];
}

/**
 * Puts an environment variable back the way it was, deleting it when it was unset.
 * @param {string} name - Variable name
 * @param {string|undefined} value - Value seen before the test changed it
 * @returns {void}
 */
function restoreEnvVariable(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe('Server Entry Point - error and shutdown paths', () => {
  /** @type {jest.SpyInstance} */
  let consoleLogSpy;

  /** @type {jest.SpyInstance} */
  let consoleErrorSpy;

  /** @type {jest.SpyInstance} */
  let processExitSpy;

  /** @type {Map<string, Function[]>} */
  let signalHandlers;

  /** @type {string|number|undefined} */
  let originalExitCode;

  beforeEach(() => {
    jest.resetModules();
    originalExitCode = process.exitCode;
    signalHandlers = new Map();

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // The entry point must never terminate a process that merely hosts it, and a
    // real exit here would end the Jest run, so the exit is recorded, not performed.
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined);
    jest.spyOn(process, 'on').mockImplementation((event, handler) => recordHandler(signalHandlers, event, handler));
    jest.spyOn(process, 'once').mockImplementation((event, handler) => recordHandler(signalHandlers, event, handler));
  });

  afterEach(() => {
    // Restored whatever the outcome, so a failing case cannot leak a non-zero exit
    // code into the Jest process and turn a green run non-zero.
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('listen error reporting', () => {
    test('should report EADDRINUSE with the configured host and port without throwing', () => {
      const { mockServer, config } = setupEntry();
      const exitCodeBefore = process.exitCode;

      expect(typeof mockServer._errorHandler).toBe('function');

      const bindError = createBindError('EADDRINUSE', config.port, 'listen EADDRINUSE: address already in use');
      expect(() => mockServer._errorHandler(bindError)).not.toThrow();

      const output = capturedOutput(consoleErrorSpy);
      expect(output).toContain(config.host);
      expect(output).toContain(String(config.port));
      expect(output).toContain('EADDRINUSE');
      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(process.exitCode).toBe(exitCodeBefore);
    });

    test('should report a bind failure other than EADDRINUSE the same way', () => {
      const { mockServer, config } = setupEntry();

      const bindError = createBindError('EACCES', 80, 'listen EACCES: permission denied');
      expect(() => mockServer._errorHandler(bindError)).not.toThrow();

      const output = capturedOutput(consoleErrorSpy);
      expect(output).toContain(config.host);
      expect(output).toContain(String(config.port));
      expect(output).toContain('EACCES');
      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(process.exitCode).toBe(originalExitCode);
    });

    test('should leave the exit code and the process lifetime to the hosting process', () => {
      const { mockServer } = setupEntry();

      expect(() => mockServer._errorHandler(createBindError('EADDRINUSE', DEFAULT_CONFIG.port))).not.toThrow();

      expect(process.exitCode).toBe(originalExitCode);
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    test('should tolerate a failed bind whose server never began listening', () => {
      const notRunning = Object.assign(new Error('Server is not running.'), { code: 'ERR_SERVER_NOT_RUNNING' });
      const { mockServer } = setupEntry({
        closeImplementation: (callback) => callback(notRunning)
      });

      expect(() => mockServer._errorHandler(createBindError('EADDRINUSE', DEFAULT_CONFIG.port))).not.toThrow();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(capturedOutput(consoleErrorSpy)).not.toContain('Failed to close the HTTP server');
    });

    test('should report a close failure other than a server that never started', () => {
      const closeFailure = Object.assign(new Error('release failed'), { code: 'EIO' });
      const { mockServer } = setupEntry({
        closeImplementation: (callback) => callback(closeFailure)
      });

      expect(() => mockServer._errorHandler(createBindError('EADDRINUSE', DEFAULT_CONFIG.port))).not.toThrow();

      const output = capturedOutput(consoleErrorSpy);
      expect(output).toContain('Failed to close the HTTP server');
      expect(output).toContain('release failed');
    });

    test('should not report the server as running when the listen callback carries a bind error', () => {
      const { mockServer } = setupEntry({ executeListenCallback: false });

      expect(typeof mockServer._callback).toBe('function');
      expect(() => mockServer._callback(createBindError('EADDRINUSE', DEFAULT_CONFIG.port))).not.toThrow();

      expect(capturedOutput(consoleLogSpy)).not.toContain('Server running at');
    });

    test('should report a failing close during the bind error instead of rethrowing it', () => {
      const { mockServer } = setupEntry({
        closeImplementation: () => {
          throw new Error('close failed after the bind error');
        }
      });

      expect(() => mockServer._errorHandler(createBindError('EADDRINUSE', DEFAULT_CONFIG.port))).not.toThrow();

      expect(capturedOutput(consoleErrorSpy)).toContain('close failed after the bind error');
    });

    test('should never bind a second socket from the error path', () => {
      const { mockServer, mockListen } = setupEntry();

      mockServer._errorHandler(createBindError('EADDRINUSE', DEFAULT_CONFIG.port));

      expect(mockListen).toHaveBeenCalledTimes(1);
    });
  });

  describe('graceful shutdown', () => {
    test.each(['SIGTERM', 'SIGINT'])(
      'should close the HTTP server before the database on %s',
      (signal) => {
        const { mockServer, mockCloseDb } = setupEntry();
        const shutdown = getSignalHandler(signalHandlers, signal);

        expect(() => shutdown()).not.toThrow();

        expect(mockServer.close).toHaveBeenCalledTimes(1);
        expect(mockCloseDb).toHaveBeenCalledTimes(1);
        expect(mockServer.close.mock.invocationCallOrder[0])
          .toBeLessThan(mockCloseDb.mock.invocationCallOrder[0]);
        // The exit code is the contract, and exiting explicitly is what the
        // shutdown path must not do: a pipe drains after the process returns.
        expect(process.exitCode).toBe(0);
        expect(processExitSpy).not.toHaveBeenCalled();
        expect(capturedOutput(consoleLogSpy)).toContain(signal);
      }
    );

    test('should register a handler for both SIGTERM and SIGINT', () => {
      setupEntry();

      expect(typeof getSignalHandler(signalHandlers, 'SIGTERM')).toBe('function');
      expect(typeof getSignalHandler(signalHandlers, 'SIGINT')).toBe('function');
    });

    test('should register the listen error handler on the server it was given', () => {
      const { mockServer } = setupEntry();

      const errorRegistrations = mockServer.on.mock.calls.filter(([event]) => event === 'error');
      expect(errorRegistrations).toHaveLength(1);
      expect(errorRegistrations[0][1]).toBe(mockServer._errorHandler);
      expect(typeof errorRegistrations[0][1]).toBe('function');
    });

    test('should shut down only once when a second signal arrives', () => {
      const { mockServer, mockCloseDb } = setupEntry();
      const shutdown = getSignalHandler(signalHandlers, 'SIGTERM');

      shutdown();
      shutdown();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(mockCloseDb).toHaveBeenCalledTimes(1);
      expect(process.exitCode).toBe(0);
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    test('should release the database only after the HTTP server finishes closing', () => {
      /** @type {Function|null} */
      let pendingClose = null;
      const { mockServer, mockCloseDb } = setupEntry({
        closeImplementation: (callback) => {
          pendingClose = callback;
        }
      });

      getSignalHandler(signalHandlers, 'SIGTERM')();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(mockCloseDb).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(originalExitCode);
      expect(processExitSpy).not.toHaveBeenCalled();

      expect(typeof pendingClose).toBe('function');
      expect(() => pendingClose()).not.toThrow();
      expect(mockCloseDb).toHaveBeenCalledTimes(1);
      expect(process.exitCode).toBe(0);
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    test('should report a failing close during shutdown but still release the database', () => {
      const closeError = Object.assign(new Error('server close failed during shutdown'), { code: 'ERR_CLOSE' });
      const { mockCloseDb } = setupEntry({
        closeImplementation: (callback) => callback(closeError)
      });

      expect(() => getSignalHandler(signalHandlers, 'SIGTERM')()).not.toThrow();

      expect(capturedOutput(consoleErrorSpy)).toContain('server close failed during shutdown');
      expect(mockCloseDb).toHaveBeenCalledTimes(1);
      expect(process.exitCode).toBe(0);
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    test('should exit successfully even when closing the database fails', () => {
      const { mockCloseDb } = setupEntry({
        closeDbImplementation: () => {
          throw new Error('database is locked');
        }
      });

      expect(() => getSignalHandler(signalHandlers, 'SIGINT')()).not.toThrow();

      expect(mockCloseDb).toHaveBeenCalledTimes(1);
      expect(capturedOutput(consoleErrorSpy)).toContain('database is locked');
      expect(process.exitCode).toBe(0);
      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });

  describe('sole listener and configuration owner', () => {
    test('should call app.listen exactly once with the configured port, host and a callback', () => {
      const { mockListen, config } = setupEntry();

      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(mockListen.mock.calls[0][0]).toBe(config.port);
      expect(mockListen.mock.calls[0][1]).toBe(config.host);
      expect(typeof mockListen.mock.calls[0][2]).toBe('function');
    });

    test('should take its settings from the config module rather than process.env', () => {
      /** @type {TestConfig} */
      const customConfig = {
        host: '0.0.0.0',
        port: 8080,
        env: 'production'
      };
      const previousHost = process.env.HOST;
      const previousPort = process.env.PORT;

      process.env.HOST = '192.0.2.10';
      process.env.PORT = '4321';

      try {
        const { mockListen } = setupEntry({ config: customConfig });

        expect(mockListen.mock.calls[0][0]).toBe(customConfig.port);
        expect(mockListen.mock.calls[0][1]).toBe(customConfig.host);

        const output = capturedOutput(consoleLogSpy);
        expect(output).toContain(`http://${customConfig.host}:${customConfig.port}/`);
        expect(output).not.toContain('4321');
      } finally {
        restoreEnvVariable('HOST', previousHost);
        restoreEnvVariable('PORT', previousPort);
      }
    });
  });
});

