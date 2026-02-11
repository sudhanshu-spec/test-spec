/**
 * @fileoverview Unit tests for the Winston logger module (src/utils/logger.js)
 *
 * Tests verify logger creation, transport configuration, log level settings,
 * and environment-aware behavior (development vs production).
 *
 * Uses jest.doMock() to mock the configuration module (src/config/index.js)
 * with controlled values, ensuring tests are independent of actual environment
 * variables. Follows conventions established in tests/unit/config.test.js and
 * tests/lifecycle/server.test.js.
 *
 * @module tests/unit/logger
 */

'use strict';

/**
 * @typedef {Object} MockConfig
 * @property {string} host - Server host
 * @property {number} port - Server port
 * @property {string} env - Environment name
 * @property {string} logLevel - Winston log level
 * @property {string} appName - Application name
 * @property {string} corsOrigin - Allowed CORS origin(s)
 */

/** @type {MockConfig} */
const DEFAULT_MOCK_CONFIG = {
  host: '127.0.0.1',
  port: 3000,
  env: 'development',
  logLevel: 'info',
  appName: 'hello_world',
  corsOrigin: '*'
};

/**
 * Loads the logger module with a mocked configuration.
 * Resets the module cache and uses jest.doMock to inject controlled
 * configuration values into the config dependency, then requires
 * a fresh logger instance.
 *
 * @param {Partial<MockConfig>} [configOverrides={}] - Configuration overrides
 * @returns {import('winston').Logger} Fresh logger instance
 */
function loadLoggerWithConfig(configOverrides = {}) {
  jest.resetModules();

  const mockConfig = { ...DEFAULT_MOCK_CONFIG, ...configOverrides };
  jest.doMock('../../src/config', () => mockConfig);

  return require('../../src/utils/logger');
}

describe('Winston Logger Module', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Module Export', () => {
    test('should export a logger instance', () => {
      const logger = loadLoggerWithConfig();
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('should have standard log methods', () => {
      const logger = loadLoggerWithConfig();
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.http).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('should use npm log levels with correct priority values', () => {
      const logger = loadLoggerWithConfig();
      expect(logger.levels).toBeDefined();
      expect(logger.levels.error).toBe(0);
      expect(logger.levels.warn).toBe(1);
      expect(logger.levels.info).toBe(2);
      expect(logger.levels.http).toBe(3);
      expect(logger.levels.verbose).toBe(4);
      expect(logger.levels.debug).toBe(5);
      expect(logger.levels.silly).toBe(6);
    });

    test('should not exit on error', () => {
      const logger = loadLoggerWithConfig();
      expect(logger.exitOnError).toBe(false);
    });
  });

  describe('Log Level Configuration', () => {
    test('should use debug level when environment is development', () => {
      const logger = loadLoggerWithConfig({ env: 'development' });
      expect(logger.level).toBe('debug');
    });

    test('should use debug level in development regardless of configured logLevel', () => {
      const logger = loadLoggerWithConfig({ env: 'development', logLevel: 'warn' });
      expect(logger.level).toBe('debug');
    });

    test('should use log level from configuration in production', () => {
      const logger = loadLoggerWithConfig({ env: 'production', logLevel: 'warn' });
      expect(logger.level).toBe('warn');
    });

    test('should default to info log level when logLevel is not configured', () => {
      const logger = loadLoggerWithConfig({ env: 'production', logLevel: '' });
      expect(logger.level).toBe('info');
    });

    test('should use configured logLevel in test environment', () => {
      const logger = loadLoggerWithConfig({ env: 'test', logLevel: 'error' });
      expect(logger.level).toBe('error');
    });

    test('should default to info level for non-development environment without logLevel', () => {
      const logger = loadLoggerWithConfig({ env: 'staging', logLevel: '' });
      expect(logger.level).toBe('info');
    });

    test('should default to debug when env defaults to development', () => {
      const logger = loadLoggerWithConfig({ env: undefined });
      expect(logger.level).toBe('debug');
    });
  });

  describe('Transport Configuration', () => {
    test('should have console transport configured', () => {
      const logger = loadLoggerWithConfig();
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThanOrEqual(1);
      const consoleTransports = logger.transports.filter(
        t => t.constructor.name === 'Console'
      );
      expect(consoleTransports.length).toBe(1);
    });

    test('should only have console transport in development mode', () => {
      const logger = loadLoggerWithConfig({ env: 'development' });
      expect(logger.transports.length).toBe(1);
      expect(logger.transports[0].constructor.name).toBe('Console');
    });

    test('should only have console transport when env defaults', () => {
      const logger = loadLoggerWithConfig({ env: undefined });
      expect(logger.transports.length).toBe(1);
      const consoleTransports = logger.transports.filter(
        t => t.constructor.name === 'Console'
      );
      expect(consoleTransports.length).toBe(1);
    });

    test('should add file transports in production mode', () => {
      const logger = loadLoggerWithConfig({ env: 'production' });
      expect(logger.transports.length).toBe(3);
      const consoleTransports = logger.transports.filter(
        t => t.constructor.name === 'Console'
      );
      const fileTransports = logger.transports.filter(
        t => t.constructor.name === 'File'
      );
      expect(consoleTransports.length).toBe(1);
      expect(fileTransports.length).toBe(2);
    });

    test('should have error-level file transport in production', () => {
      const logger = loadLoggerWithConfig({ env: 'production' });
      const fileTransports = logger.transports.filter(
        t => t.constructor.name === 'File'
      );
      const errorTransport = fileTransports.find(t => t.level === 'error');
      expect(errorTransport).toBeDefined();
      expect(errorTransport.filename).toContain('error.log');
    });

    test('should have combined file transport in production', () => {
      const logger = loadLoggerWithConfig({ env: 'production' });
      const fileTransports = logger.transports.filter(
        t => t.constructor.name === 'File'
      );
      const combinedTransport = fileTransports.find(t => !t.level);
      expect(combinedTransport).toBeDefined();
      expect(combinedTransport.filename).toContain('combined.log');
    });

    test('should only have console transport in test environment', () => {
      const logger = loadLoggerWithConfig({ env: 'test' });
      expect(logger.transports.length).toBe(1);
      expect(logger.transports[0].constructor.name).toBe('Console');
    });

    test('should have at least one transport in any configuration', () => {
      const logger = loadLoggerWithConfig({ env: 'staging' });
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Logging Functionality', () => {
    test('should log error messages without throwing', () => {
      const logger = loadLoggerWithConfig();
      expect(() => logger.error('test error message')).not.toThrow();
    });

    test('should log warn messages without throwing', () => {
      const logger = loadLoggerWithConfig();
      expect(() => logger.warn('test warn message')).not.toThrow();
    });

    test('should log info messages without throwing', () => {
      const logger = loadLoggerWithConfig();
      expect(() => logger.info('test info message')).not.toThrow();
    });

    test('should log http messages without throwing', () => {
      const logger = loadLoggerWithConfig();
      expect(() => logger.http('test http message')).not.toThrow();
    });

    test('should log debug messages without throwing', () => {
      const logger = loadLoggerWithConfig();
      expect(() => logger.debug('test debug message')).not.toThrow();
    });

    test('should accept metadata objects with log messages', () => {
      const logger = loadLoggerWithConfig();
      expect(() => logger.info('test with metadata', { key: 'value' })).not.toThrow();
    });

    test('should accept error objects with log messages', () => {
      const logger = loadLoggerWithConfig();
      const error = new Error('test error');
      expect(() => logger.error('error occurred', {
        error: error.message,
        stack: error.stack
      })).not.toThrow();
    });
  });

  describe('Configuration Integration', () => {
    test('should respect appName and corsOrigin in mock config without errors', () => {
      const logger = loadLoggerWithConfig({
        appName: 'test_app',
        corsOrigin: 'http://localhost:3000'
      });
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    test('should create logger with full config including host and port', () => {
      const logger = loadLoggerWithConfig({
        host: '0.0.0.0',
        port: 8080,
        env: 'production',
        logLevel: 'warn',
        appName: 'custom_app',
        corsOrigin: 'https://example.com'
      });
      expect(logger).toBeDefined();
      expect(logger.level).toBe('warn');
      expect(logger.transports.length).toBe(3);
    });
  });
});
