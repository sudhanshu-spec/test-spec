/**
 * @fileoverview Unit tests for the Winston logger module (src/utils/logger.js)
 *
 * Tests verify logger creation, transport configuration, log level settings,
 * and environment-aware behavior (development vs production).
 *
 * @module tests/unit/logger
 */

'use strict';

/**
 * Loads the logger module with specified environment variables.
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

describe('Winston Logger Module', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Module Export', () => {
    test('should export a Winston logger instance', () => {
      const logger = require('../../src/utils/logger');
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('should export logger with standard logging methods', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.http).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('should use npm log levels', () => {
      const logger = require('../../src/utils/logger');
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
      const logger = require('../../src/utils/logger');
      expect(logger.exitOnError).toBe(false);
    });
  });

  describe('Log Level Configuration', () => {
    test('should default to debug level in development environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: undefined, LOG_LEVEL: undefined });
      expect(logger.level).toBe('debug');
    });

    test('should use debug level when NODE_ENV is development', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      expect(logger.level).toBe('debug');
    });

    test('should use configured LOG_LEVEL in production environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production', LOG_LEVEL: 'warn' });
      expect(logger.level).toBe('warn');
    });

    test('should default to info level in production when LOG_LEVEL not set', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production', LOG_LEVEL: undefined });
      expect(logger.level).toBe('info');
    });

    test('should use configured LOG_LEVEL in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test', LOG_LEVEL: 'error' });
      expect(logger.level).toBe('error');
    });

    test('should fallback to info level for non-development environment without LOG_LEVEL', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'staging', LOG_LEVEL: undefined });
      expect(logger.level).toBe('info');
    });
  });

  describe('Transport Configuration', () => {
    test('should have at least one transport', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThanOrEqual(1);
    });

    test('should have only console transport in development', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      expect(logger.transports.length).toBe(1);
      const consoleTransports = logger.transports.filter(
        t => t.constructor.name === 'Console'
      );
      expect(consoleTransports.length).toBe(1);
    });

    test('should have only console transport when NODE_ENV is not set', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: undefined });
      expect(logger.transports.length).toBe(1);
    });

    test('should have console and file transports in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
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
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      const fileTransports = logger.transports.filter(
        t => t.constructor.name === 'File'
      );
      const errorTransport = fileTransports.find(t => t.level === 'error');
      expect(errorTransport).toBeDefined();
      expect(errorTransport.filename).toContain('error.log');
    });

    test('should have combined file transport in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      const fileTransports = logger.transports.filter(
        t => t.constructor.name === 'File'
      );
      const combinedTransport = fileTransports.find(t => !t.level);
      expect(combinedTransport).toBeDefined();
      expect(combinedTransport.filename).toContain('combined.log');
    });

    test('should have only console transport in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test' });
      expect(logger.transports.length).toBe(1);
      expect(logger.transports[0].constructor.name).toBe('Console');
    });
  });

  describe('Logging Functionality', () => {
    test('should log info messages without errors', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.info('test info message')).not.toThrow();
    });

    test('should log error messages without errors', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.error('test error message')).not.toThrow();
    });

    test('should log warn messages without errors', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.warn('test warn message')).not.toThrow();
    });

    test('should log http messages without errors', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.http('test http message')).not.toThrow();
    });

    test('should log debug messages without errors', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.debug('test debug message')).not.toThrow();
    });

    test('should accept metadata objects with log messages', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.info('test with metadata', { key: 'value' })).not.toThrow();
    });

    test('should accept error objects with log messages', () => {
      const logger = require('../../src/utils/logger');
      const error = new Error('test error');
      expect(() => logger.error('error occurred', { error: error.message, stack: error.stack })).not.toThrow();
    });
  });
});
