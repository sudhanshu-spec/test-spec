/**
 * @fileoverview Unit tests for Winston logger utility (src/utils/logger.js)
 * @module tests/unit/logger
 */

'use strict';

describe('Logger Utility Module', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * Loads a fresh logger instance with optional env overrides.
   * @param {Object<string, string>} [envOverrides={}] - Environment variable overrides
   * @returns {import('../../src/utils/logger')} Fresh logger instance
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

  describe('Logger Export', () => {
    test('should export a Winston logger instance', () => {
      const logger = require('../../src/utils/logger');
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('should have info method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.info).toBe('function');
    });

    test('should have error method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.error).toBe('function');
    });

    test('should have warn method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.warn).toBe('function');
    });

    test('should have debug method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.debug).toBe('function');
    });

    test('should have http method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.http).toBe('function');
    });
  });

  describe('Logger Transports', () => {
    test('should have at least 3 transports configured', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThanOrEqual(3);
    });

    test('should include a Console transport', () => {
      const logger = require('../../src/utils/logger');
      const winston = require('winston');
      const consoleTransport = logger.transports.find(
        t => t instanceof winston.transports.Console
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should include a File transport for error.log', () => {
      const logger = require('../../src/utils/logger');
      const winston = require('winston');
      const errorFile = logger.transports.find(
        t => t instanceof winston.transports.File && t.filename === 'error.log' && t.dirname === 'logs'
      );
      expect(errorFile).toBeDefined();
      expect(errorFile.level).toBe('error');
    });

    test('should include a File transport for combined.log', () => {
      const logger = require('../../src/utils/logger');
      const winston = require('winston');
      const combinedFile = logger.transports.find(
        t => t instanceof winston.transports.File && t.filename === 'combined.log' && t.dirname === 'logs'
      );
      expect(combinedFile).toBeDefined();
    });
  });

  describe('Logger Log Level', () => {
    test('should default to info log level', () => {
      const logger = loadLoggerWithEnv({ LOG_LEVEL: undefined });
      expect(logger.level).toBe('info');
    });

    test('should use custom log level from LOG_LEVEL env var', () => {
      const logger = loadLoggerWithEnv({ LOG_LEVEL: 'debug' });
      expect(logger.level).toBe('debug');
    });

    test('should use npm log levels', () => {
      const logger = require('../../src/utils/logger');
      const winston = require('winston');
      expect(logger.levels).toEqual(winston.config.npm.levels);
    });
  });

  describe('Stream Interface', () => {
    test('should have a stream property', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.stream).toBeDefined();
      expect(typeof logger.stream).toBe('object');
    });

    test('should have a write method on stream', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.stream.write).toBe('function');
    });

    test('stream.write should call logger.http with trimmed message', () => {
      const logger = require('../../src/utils/logger');
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});
      
      logger.stream.write('test message\n');
      
      expect(httpSpy).toHaveBeenCalledWith('test message');
      httpSpy.mockRestore();
    });
  });

  describe('Logger Functionality', () => {
    test('should not throw when logging at info level', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.info('test info message')).not.toThrow();
    });

    test('should not throw when logging at error level', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.error('test error message')).not.toThrow();
    });

    test('should not throw when logging at warn level', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.warn('test warn message')).not.toThrow();
    });

    test('should not throw when logging at http level', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.http('test http message')).not.toThrow();
    });

    test('should not throw when logging at debug level', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.debug('test debug message')).not.toThrow();
    });
  });
});
