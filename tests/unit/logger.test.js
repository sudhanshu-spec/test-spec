/**
 * @fileoverview Unit tests for the Winston logger utility (src/utils/logger.js)
 * @module tests/unit/logger
 */

'use strict';

const winston = require('winston');

// Mock dotenv to prevent .env file from injecting values during tests
jest.mock('dotenv', () => ({ config: jest.fn() }));

/**
 * Loads logger module with specified environment overrides.
 * Resets module cache to ensure fresh evaluation.
 * @param {Object<string, string>} [envOverrides={}] - Environment variable overrides
 * @returns {import('winston').Logger} Fresh logger instance
 */
function loadLoggerWithEnv(envOverrides = {}) {
  jest.resetModules();

  Object.keys(envOverrides).forEach(key => {
    if (envOverrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = envOverrides[key];
    }
  });

  return require('../../src/utils/logger');
}

describe('Winston Logger Utility', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    // Clear any manual config mocks from previous tests (e.g., fallback branch tests)
    jest.unmock('../../src/config');
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Logger Export', () => {
    test('should export a Winston logger instance', () => {
      const logger = loadLoggerWithEnv({});
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.http).toBe('function');
    });

    test('should be a singleton instance', () => {
      const logger1 = require('../../src/utils/logger');
      const logger2 = require('../../src/utils/logger');
      expect(logger1).toBe(logger2);
    });
  });

  describe('Log Level Configuration', () => {
    test('should use LOG_LEVEL env var when set', () => {
      const logger = loadLoggerWithEnv({ LOG_LEVEL: 'warn', NODE_ENV: 'development' });
      expect(logger.level).toBe('warn');
    });

    test('should default to info level in development when LOG_LEVEL not set', () => {
      // config.logLevel defaults to 'info' when LOG_LEVEL env var is not set,
      // so the logger uses 'info' regardless of NODE_ENV
      const logger = loadLoggerWithEnv({ LOG_LEVEL: undefined, NODE_ENV: 'development' });
      expect(logger.level).toBe('info');
    });

    test('should default to info level in production when LOG_LEVEL not set', () => {
      const logger = loadLoggerWithEnv({ LOG_LEVEL: undefined, NODE_ENV: 'production' });
      expect(logger.level).toBe('info');
    });

    test('should use info as fallback logLevel default', () => {
      const logger = loadLoggerWithEnv({ LOG_LEVEL: undefined, NODE_ENV: undefined });
      // Config defaults to 'info' for logLevel, and 'development' for env
      // So the level should be 'info' (from config.logLevel default)
      expect(logger.level).toBe('info');
    });

    test('should fallback to debug level when config.logLevel is falsy and env is development', () => {
      // Mock config module to return empty logLevel, triggering the fallback branch
      // in logger.js: config.logLevel || (config.env === 'production' ? 'info' : 'debug')
      jest.resetModules();
      jest.mock('../../src/config', () => ({
        logLevel: '',
        env: 'development',
        host: '127.0.0.1',
        port: 3000
      }));
      const logger = require('../../src/utils/logger');
      expect(logger.level).toBe('debug');
    });

    test('should fallback to info level when config.logLevel is falsy and env is production', () => {
      // Mock config module to return empty logLevel in production mode
      jest.resetModules();
      jest.mock('../../src/config', () => ({
        logLevel: '',
        env: 'production',
        host: '127.0.0.1',
        port: 3000
      }));
      const logger = require('../../src/utils/logger');
      expect(logger.level).toBe('info');
    });
  });

  describe('Transport Configuration', () => {
    test('should have at least one transport in development', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      expect(logger.transports.length).toBeGreaterThanOrEqual(1);
    });

    test('should have Console transport in development', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      const consoleTransport = logger.transports.find(
        t => t instanceof winston.transports.Console
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should not have File transports in development', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      const fileTransports = logger.transports.filter(
        t => t instanceof winston.transports.File
      );
      expect(fileTransports.length).toBe(0);
    });

    test('should have Console transport in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      const consoleTransport = logger.transports.find(
        t => t instanceof winston.transports.Console
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should have File transports in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      const fileTransports = logger.transports.filter(
        t => t instanceof winston.transports.File
      );
      expect(fileTransports.length).toBe(2);
    });

    test('should have error.log file transport in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      // Winston splits 'logs/error.log' into dirname='logs' and filename='error.log'
      const errorFile = logger.transports.find(
        t => t instanceof winston.transports.File &&
          t.filename === 'error.log' && t.dirname === 'logs'
      );
      expect(errorFile).toBeDefined();
      expect(errorFile.level).toBe('error');
    });

    test('should have all.log file transport in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      // Winston splits 'logs/all.log' into dirname='logs' and filename='all.log'
      const allFile = logger.transports.find(
        t => t instanceof winston.transports.File &&
          t.filename === 'all.log' && t.dirname === 'logs'
      );
      expect(allFile).toBeDefined();
    });
  });

  describe('Stream Interface', () => {
    test('should have a stream property for Morgan integration', () => {
      const logger = loadLoggerWithEnv({});
      expect(logger.stream).toBeDefined();
      expect(typeof logger.stream.write).toBe('function');
    });

    test('should pipe stream write messages to logger.http', () => {
      const logger = loadLoggerWithEnv({});
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});

      logger.stream.write('GET /test 200 5ms\n');

      expect(httpSpy).toHaveBeenCalledWith('GET /test 200 5ms');
      httpSpy.mockRestore();
    });

    test('should trim whitespace from stream write messages', () => {
      const logger = loadLoggerWithEnv({});
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});

      logger.stream.write('  some message with spaces  \n');

      expect(httpSpy).toHaveBeenCalledWith('some message with spaces');
      httpSpy.mockRestore();
    });
  });

  describe('Format Configuration', () => {
    test('should include timestamp in log format', () => {
      const logger = loadLoggerWithEnv({});
      // Winston format is an internal object; verify it exists on the logger
      expect(logger.format).toBeDefined();
    });

    test('should be able to log without throwing errors', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test' });
      // Silence output for test
      logger.transports.forEach(t => { t.silent = true; });

      expect(() => logger.info('test info message')).not.toThrow();
      expect(() => logger.error('test error message')).not.toThrow();
      expect(() => logger.warn('test warn message')).not.toThrow();
      expect(() => logger.debug('test debug message')).not.toThrow();
      expect(() => logger.http('test http message')).not.toThrow();
    });
  });
});
