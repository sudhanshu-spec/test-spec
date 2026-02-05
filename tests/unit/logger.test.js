/**
 * @fileoverview Unit tests for Winston logger service (src/utils/logger.js)
 * 
 * Tests validate logger exports, Winston logger methods (info, error, debug, warn),
 * transports array existence, and environment-aware log level configuration based
 * on NODE_ENV (debug in development, info in production).
 * 
 * @module tests/unit/logger
 */

'use strict';

/**
 * Loads logger module with specified environment variables.
 * Resets module cache to ensure fresh evaluation.
 * @param {Object<string, string>} [envOverrides={}] - Environment variable overrides
 * @returns {import('../../src/utils/logger')} Fresh logger module instance
 */
function loadLoggerWithEnv(envOverrides = {}) {
  jest.resetModules();
  const originalEnv = { ...process.env };
  
  Object.keys(envOverrides).forEach(key => {
    if (envOverrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = envOverrides[key];
    }
  });
  
  const logger = require('../../src/utils/logger');
  
  // Restore original env
  Object.keys(originalEnv).forEach(key => {
    process.env[key] = originalEnv[key];
  });
  Object.keys(process.env).forEach(key => {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  });
  
  return logger;
}

/**
 * Clears specified environment variables before loading logger.
 * @param {string[]} keys - Environment variable keys to clear
 * @returns {import('../../src/utils/logger')} Fresh logger module instance
 */
function loadLoggerWithoutEnv(keys) {
  jest.resetModules();
  keys.forEach(key => delete process.env[key]);
  return require('../../src/utils/logger');
}

describe('Winston Logger Service', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Logger Export', () => {
    test('should export a logger instance', () => {
      const logger = require('../../src/utils/logger');
      expect(logger).toBeDefined();
    });

    test('should export logger as an object', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger).toBe('object');
    });

    test('should export logger with expected Winston properties', () => {
      const logger = require('../../src/utils/logger');
      expect(logger).toHaveProperty('level');
      expect(logger).toHaveProperty('transports');
    });

    test('should export logger with stream property for Morgan integration', () => {
      const logger = require('../../src/utils/logger');
      expect(logger).toHaveProperty('stream');
      expect(logger.stream).toHaveProperty('write');
    });
  });

  describe('Logger Methods', () => {
    test('should have info method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.info).toBe('function');
    });

    test('should have error method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.error).toBe('function');
    });

    test('should have debug method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.debug).toBe('function');
    });

    test('should have warn method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.warn).toBe('function');
    });

    test('should not throw when calling info method', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    test('should not throw when calling error method', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    test('should not throw when calling debug method', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    test('should not throw when calling warn method', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.warn('Test warn message')).not.toThrow();
    });

    test('should have http method for Morgan integration', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.http).toBe('function');
    });
  });

  describe('Logger Transports', () => {
    test('should have transports property', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
    });

    test('should have transports as an array', () => {
      const logger = require('../../src/utils/logger');
      expect(Array.isArray(logger.transports)).toBe(true);
    });

    test('should have at least one transport configured', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    test('should include console transport', () => {
      const logger = require('../../src/utils/logger');
      const consoleTransport = logger.transports.find(t => t.name === 'console');
      expect(consoleTransport).toBeDefined();
    });
  });

  describe('Log Level Configuration', () => {
    test('should have log level as debug in development environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      expect(logger.level).toBe('debug');
    });

    test('should have log level as info in production environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      expect(logger.level).toBe('info');
    });

    test('should default to debug level when NODE_ENV not set', () => {
      const logger = loadLoggerWithoutEnv(['NODE_ENV', 'LOG_LEVEL']);
      expect(logger.level).toBe('debug');
    });

    test('should respect LOG_LEVEL environment variable override', () => {
      const logger = loadLoggerWithEnv({ LOG_LEVEL: 'warn', NODE_ENV: 'development' });
      expect(logger.level).toBe('warn');
    });

    test('should respect LOG_LEVEL override in production', () => {
      const logger = loadLoggerWithEnv({ LOG_LEVEL: 'error', NODE_ENV: 'production' });
      expect(logger.level).toBe('error');
    });

    test('should return level as a string type', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.level).toBe('string');
    });
  });

  describe('Test Environment Configuration', () => {
    test('should configure silent console in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test' });
      const consoleTransport = logger.transports.find(t => t.name === 'console');
      if (consoleTransport) {
        expect(consoleTransport.silent).toBe(true);
      }
    });

    test('should not add file transports in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test' });
      const fileTransports = logger.transports.filter(t => t.name === 'file');
      expect(fileTransports.length).toBe(0);
    });
  });

  describe('Production Environment Configuration', () => {
    test('should add file transports in production environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      const fileTransports = logger.transports.filter(t => t.name === 'file');
      expect(fileTransports.length).toBeGreaterThan(0);
    });

    test('should have error log file transport in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      const errorFileTransport = logger.transports.find(
        t => t.name === 'file' && t.filename && t.filename.includes('error')
      );
      expect(errorFileTransport).toBeDefined();
    });

    test('should have combined log file transport in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      const combinedFileTransport = logger.transports.find(
        t => t.name === 'file' && t.filename && t.filename.includes('combined')
      );
      expect(combinedFileTransport).toBeDefined();
    });
  });

  describe('Stream Interface', () => {
    test('should have stream.write method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.stream.write).toBe('function');
    });

    test('should not throw when calling stream.write', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.stream.write('Test HTTP log message\n')).not.toThrow();
    });

    test('should handle stream.write with trailing newline', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.stream.write('GET /api/test 200 15ms\n')).not.toThrow();
    });
  });

  describe('Logger Singleton Pattern', () => {
    test('should return same instance on multiple requires', () => {
      const logger1 = require('../../src/utils/logger');
      const logger2 = require('../../src/utils/logger');
      expect(logger1).toBe(logger2);
    });

    test('should maintain state across requires', () => {
      const logger1 = require('../../src/utils/logger');
      const originalLevel = logger1.level;
      const logger2 = require('../../src/utils/logger');
      expect(logger2.level).toBe(originalLevel);
    });
  });

  describe('Logger Object Structure', () => {
    test('should export an object with level and transports properties', () => {
      const logger = require('../../src/utils/logger');
      expect(logger).toHaveProperty('level');
      expect(logger).toHaveProperty('transports');
    });

    test('should not have undefined values for level property', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.level).toBeDefined();
    });

    test('should not have undefined values for transports property', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
    });
  });
});
