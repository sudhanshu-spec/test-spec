'use strict';

/**
 * Unit Tests — Server Entry Point (server.js)
 *
 * Tests the server startup lifecycle by mocking the Express application
 * (src/app.js) and configuration (src/config/index.js) modules before
 * requiring server.js. This prevents actual HTTP port binding during tests.
 *
 * server.js executes side effects at module scope:
 *   - Calls app.listen(config.port, config.host, callback)
 *   - Logs 'Application module loaded successfully'
 *   - Logs 'Express.js server initialization complete - PR validation log'
 *   - Logs 'PR update test: Server module fully initialized'
 *   - The listen callback logs 'Server running at http://<host>:<port>/'
 *
 * Each test uses jest.resetModules() + jest.doMock() to control the mock
 * state before the fresh require('../server') triggers those side effects.
 */

// ---------------------------------------------------------------------------
// Default mock configuration values (mirrors src/config/index.js defaults)
// ---------------------------------------------------------------------------
const DEFAULT_MOCK_HOST = '127.0.0.1';
const DEFAULT_MOCK_PORT = 3000;
const DEFAULT_MOCK_ENV = 'development';

describe('server.js', () => {
  /** Mock function for app.listen — captured per test */
  let mockListen;

  /** Spy on console.log to verify startup messages */
  let consoleSpy;

  /**
   * Helper: register jest.doMock for ../src/app and ../src/config
   * with the provided (or default) configuration values.
   *
   * Must be called AFTER jest.resetModules() and BEFORE require('../server').
   *
   * @param {object} [config] - Override config values for this test
   * @param {string} [config.host]
   * @param {number} [config.port]
   * @param {string} [config.env]
   */
  function setupMocks(config) {
    const mockConfig = config || {
      host: DEFAULT_MOCK_HOST,
      port: DEFAULT_MOCK_PORT,
      env: DEFAULT_MOCK_ENV
    };

    jest.doMock('../src/app', () => ({
      listen: mockListen
    }));

    jest.doMock('../src/config', () => mockConfig);
  }

  beforeEach(() => {
    // Clear the module registry so server.js is re-evaluated on each require
    jest.resetModules();
    jest.clearAllMocks();

    // Create a fresh mock for app.listen per test
    mockListen = jest.fn();

    // Spy on console.log and suppress output during tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.log implementation
    consoleSpy.mockRestore();
  });

  // =========================================================================
  // 1. app.listen() Invocation
  // =========================================================================
  describe('app.listen() invocation', () => {
    it('should call app.listen with correct port and host from config', () => {
      setupMocks();

      require('../server');

      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(mockListen).toHaveBeenCalledWith(
        DEFAULT_MOCK_PORT,
        DEFAULT_MOCK_HOST,
        expect.any(Function)
      );
    });

    it('should propagate custom config values to app.listen', () => {
      const customConfig = { host: '0.0.0.0', port: 8080, env: 'production' };
      setupMocks(customConfig);

      require('../server');

      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(mockListen).toHaveBeenCalledWith(
        8080,
        '0.0.0.0',
        expect.any(Function)
      );
    });

    it('should call app.listen exactly once', () => {
      setupMocks();

      require('../server');

      expect(mockListen).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 2. Console Log Messages on Module Load
  // =========================================================================
  describe('Startup log messages', () => {
    it('should log "Application module loaded successfully" on module load', () => {
      setupMocks();

      require('../server');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Application module loaded successfully'
      );
    });

    it('should log "Express.js server initialization complete - PR validation log" on module load', () => {
      setupMocks();

      require('../server');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Express.js server initialization complete - PR validation log'
      );
    });

    it('should log "PR update test: Server module fully initialized" on module load', () => {
      setupMocks();

      require('../server');

      expect(consoleSpy).toHaveBeenCalledWith(
        'PR update test: Server module fully initialized'
      );
    });

    it('should log all three immediate startup messages on module load', () => {
      setupMocks();

      require('../server');

      const logCalls = consoleSpy.mock.calls.map((call) => call[0]);

      expect(logCalls).toContain('Application module loaded successfully');
      expect(logCalls).toContain(
        'Express.js server initialization complete - PR validation log'
      );
      expect(logCalls).toContain(
        'PR update test: Server module fully initialized'
      );
    });
  });

  // =========================================================================
  // 3. Listen Callback — Server Running Log
  // =========================================================================
  describe('Listen callback', () => {
    it('should log server URL when listen callback is invoked', () => {
      setupMocks();

      require('../server');

      // Extract the callback passed as the third argument to app.listen
      const listenCallback = mockListen.mock.calls[0][2];
      expect(typeof listenCallback).toBe('function');

      // Invoke the callback to simulate a successful server bind
      listenCallback();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Server running at http://127.0.0.1:3000/'
      );
    });

    it('should log custom host and port in URL when callback is invoked', () => {
      const customConfig = { host: '0.0.0.0', port: 8080, env: 'production' };
      setupMocks(customConfig);

      require('../server');

      // Extract and invoke the callback
      const listenCallback = mockListen.mock.calls[0][2];
      listenCallback();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Server running at http://0.0.0.0:8080/'
      );
    });
  });
});
