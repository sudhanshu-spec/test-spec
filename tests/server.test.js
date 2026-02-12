'use strict';

/**
 * Unit Tests — Server Entry Point (server.js)
 *
 * Tests the server startup lifecycle by mocking the Express application
 * (src/app.js) and configuration (src/config/index.js) modules before
 * requiring server.js. This prevents actual HTTP port binding during tests.
 *
 * server.js executes side effects at module scope (lines 62-74):
 *   1. Calls app.listen(config.port, config.host, callback)     [line 62]
 *   2. Logs 'Application module loaded successfully'             [line 68]
 *   3. Logs 'Express.js server initialization complete - PR validation log' [line 71]
 *   4. Logs 'PR update test: Server module fully initialized'    [line 74]
 *   5. The listen callback logs 'Server running at http://<host>:<port>/' [line 64]
 *
 * Each test uses jest.resetModules() + jest.doMock() to control the mock
 * state before the fresh require('../server') triggers those side effects.
 *
 * @module tests/server.test
 */

// ---------------------------------------------------------------------------
// Default mock configuration values (mirrors src/config/index.js defaults)
// ---------------------------------------------------------------------------
const DEFAULT_MOCK_HOST = '127.0.0.1';
const DEFAULT_MOCK_PORT = 3000;
const DEFAULT_MOCK_ENV = 'development';

// Expected immediate console.log messages (in execution order from server.js)
const EXPECTED_LOG_APP_LOADED = 'Application module loaded successfully';
const EXPECTED_LOG_PR_VALIDATION = 'Express.js server initialization complete - PR validation log';
const EXPECTED_LOG_PR_UPDATE = 'PR update test: Server module fully initialized';

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
   * @param {object} [configOverride] - Override config values for this test
   * @param {string} [configOverride.host]  - Server host binding address
   * @param {number} [configOverride.port]  - Server port number
   * @param {string} [configOverride.env]   - Application environment
   */
  function setupMocks(configOverride) {
    const mockConfig = configOverride || {
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
  // 1. app.listen() Invocation — Happy Path
  // =========================================================================
  describe('app.listen() invocation', () => {
    it('should call app.listen with correct port and host from config', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert
      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(mockListen).toHaveBeenCalledWith(
        DEFAULT_MOCK_PORT,
        DEFAULT_MOCK_HOST,
        expect.any(Function)
      );
    });

    it('should call app.listen exactly once per module load', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert
      expect(mockListen).toHaveBeenCalledTimes(1);
    });

    it('should pass exactly three arguments to app.listen (port, host, callback)', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert — verify the argument count matches the (port, host, cb) signature
      const listenArgs = mockListen.mock.calls[0];
      expect(listenArgs).toHaveLength(3);
      expect(typeof listenArgs[0]).toBe('number');
      expect(typeof listenArgs[1]).toBe('string');
      expect(typeof listenArgs[2]).toBe('function');
    });

    it('should pass port as the first argument and host as the second argument', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert — verify argument order: port first, host second
      const listenArgs = mockListen.mock.calls[0];
      expect(listenArgs[0]).toBe(DEFAULT_MOCK_PORT);
      expect(listenArgs[1]).toBe(DEFAULT_MOCK_HOST);
    });
  });

  // =========================================================================
  // 2. Console Log Messages on Module Load
  // =========================================================================
  describe('Startup log messages', () => {
    it('should log "Application module loaded successfully" on module load', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(EXPECTED_LOG_APP_LOADED);
    });

    it('should log "Express.js server initialization complete - PR validation log" on module load', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(EXPECTED_LOG_PR_VALIDATION);
    });

    it('should log "PR update test: Server module fully initialized" on module load', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(EXPECTED_LOG_PR_UPDATE);
    });

    it('should log all three immediate startup messages on module load', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert
      const logMessages = consoleSpy.mock.calls.map((call) => call[0]);

      expect(logMessages).toContain(EXPECTED_LOG_APP_LOADED);
      expect(logMessages).toContain(EXPECTED_LOG_PR_VALIDATION);
      expect(logMessages).toContain(EXPECTED_LOG_PR_UPDATE);
    });

    it('should produce exactly three console.log calls on module load (before callback)', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert — listen callback not invoked, so only 3 immediate logs
      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });

    it('should log immediate messages in the correct execution order', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert — verify order matches server.js lines 68, 71, 74
      const logMessages = consoleSpy.mock.calls.map((call) => call[0]);

      expect(logMessages[0]).toBe(EXPECTED_LOG_APP_LOADED);
      expect(logMessages[1]).toBe(EXPECTED_LOG_PR_VALIDATION);
      expect(logMessages[2]).toBe(EXPECTED_LOG_PR_UPDATE);
    });

    it('should NOT log the "Server running at" message before callback invocation', () => {
      // Arrange
      setupMocks();

      // Act
      require('../server');

      // Assert — the callback-only message must not appear in immediate logs
      const logMessages = consoleSpy.mock.calls.map((call) => call[0]);
      const serverRunningPattern = /^Server running at/;

      logMessages.forEach((msg) => {
        expect(msg).not.toMatch(serverRunningPattern);
      });
    });
  });

  // =========================================================================
  // 3. Listen Callback — Server Running Log
  // =========================================================================
  describe('Listen callback', () => {
    it('should log server URL when listen callback is invoked with default config', () => {
      // Arrange
      setupMocks();
      require('../server');

      // Act — extract the callback passed as the third argument to app.listen
      const listenCallback = mockListen.mock.calls[0][2];
      expect(typeof listenCallback).toBe('function');
      listenCallback();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Server running at http://127.0.0.1:3000/'
      );
    });

    it('should log custom host and port in URL when callback is invoked', () => {
      // Arrange
      const customConfig = { host: '0.0.0.0', port: 8080, env: 'production' };
      setupMocks(customConfig);
      require('../server');

      // Act — extract and invoke the callback
      const listenCallback = mockListen.mock.calls[0][2];
      listenCallback();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Server running at http://0.0.0.0:8080/'
      );
    });

    it('should produce exactly four console.log calls after callback invocation', () => {
      // Arrange
      setupMocks();
      require('../server');

      // Act
      const listenCallback = mockListen.mock.calls[0][2];
      listenCallback();

      // Assert — 3 immediate + 1 callback = 4 total
      expect(consoleSpy).toHaveBeenCalledTimes(4);
    });

    it('should log the "Server running at" message as the fourth console.log call', () => {
      // Arrange
      setupMocks();
      require('../server');

      // Act
      const listenCallback = mockListen.mock.calls[0][2];
      listenCallback();

      // Assert — the 4th call (index 3) should be the server URL message
      expect(consoleSpy.mock.calls[3][0]).toBe(
        'Server running at http://127.0.0.1:3000/'
      );
    });
  });

  // =========================================================================
  // 4. Edge Cases — Custom Configuration Propagation
  // =========================================================================
  describe('Custom config value propagation', () => {
    it('should propagate custom config values to app.listen', () => {
      // Arrange
      const customConfig = { host: '0.0.0.0', port: 8080, env: 'production' };
      setupMocks(customConfig);

      // Act
      require('../server');

      // Assert
      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(mockListen).toHaveBeenCalledWith(
        8080,
        '0.0.0.0',
        expect.any(Function)
      );
    });

    it('should propagate port 443 and a hostname to app.listen', () => {
      // Arrange
      const httpsConfig = { host: 'example.com', port: 443, env: 'production' };
      setupMocks(httpsConfig);

      // Act
      require('../server');

      // Assert
      expect(mockListen).toHaveBeenCalledWith(
        443,
        'example.com',
        expect.any(Function)
      );
    });

    it('should propagate port 0 (ephemeral port) to app.listen', () => {
      // Arrange
      const ephemeralConfig = { host: '127.0.0.1', port: 0, env: 'test' };
      setupMocks(ephemeralConfig);

      // Act
      require('../server');

      // Assert
      expect(mockListen).toHaveBeenCalledWith(
        0,
        '127.0.0.1',
        expect.any(Function)
      );
    });

    it('should format the server URL with custom config in the listen callback', () => {
      // Arrange
      const customConfig = { host: 'localhost', port: 9090, env: 'staging' };
      setupMocks(customConfig);
      require('../server');

      // Act
      const listenCallback = mockListen.mock.calls[0][2];
      listenCallback();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Server running at http://localhost:9090/'
      );
    });

    it('should format the server URL with ephemeral port 0 in the listen callback', () => {
      // Arrange
      const ephemeralConfig = { host: '127.0.0.1', port: 0, env: 'test' };
      setupMocks(ephemeralConfig);
      require('../server');

      // Act
      const listenCallback = mockListen.mock.calls[0][2];
      listenCallback();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Server running at http://127.0.0.1:0/'
      );
    });
  });

  // =========================================================================
  // 5. Module Isolation — jest.resetModules() Effectiveness
  // =========================================================================
  describe('Module isolation', () => {
    it('should re-execute all side effects when server.js is required after resetModules', () => {
      // Arrange — first load
      setupMocks();
      require('../server');
      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledTimes(3);

      // Act — reset and reload
      jest.resetModules();
      jest.clearAllMocks();
      mockListen = jest.fn();
      setupMocks();
      require('../server');

      // Assert — side effects fire again with fresh module evaluation
      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });

    it('should use updated config values after module reset', () => {
      // Arrange — first load with defaults
      setupMocks();
      require('../server');
      expect(mockListen).toHaveBeenCalledWith(
        DEFAULT_MOCK_PORT,
        DEFAULT_MOCK_HOST,
        expect.any(Function)
      );

      // Act — reset and reload with different config
      jest.resetModules();
      jest.clearAllMocks();
      mockListen = jest.fn();
      const newConfig = { host: '10.0.0.1', port: 5000, env: 'staging' };
      setupMocks(newConfig);
      require('../server');

      // Assert — new config values are used
      expect(mockListen).toHaveBeenCalledWith(
        5000,
        '10.0.0.1',
        expect.any(Function)
      );
    });
  });
});
