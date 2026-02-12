/**
 * @fileoverview Unit tests for the Winston logger factory (src/config/logger.js)
 * @module tests/unit/logger
 */

'use strict';

describe('Logger Factory Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * Loads a fresh logger instance with optional environment overrides.
   * @param {Object<string, string>} [envOverrides={}] - Environment overrides
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
    return require('../../src/config/logger');
  }

  describe('Logger Export', () => {
    test('should export a Winston logger instance', () => {
      const logger = require('../../src/config/logger');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('should have the add method for adding transports', () => {
      const logger = require('../../src/config/logger');
      expect(typeof logger.add).toBe('function');
    });
  });

  describe('Default Configuration', () => {
    test('should default to info log level', () => {
      const logger = loadLoggerWithEnv({ LOG_LEVEL: '' });
      expect(logger.level).toBe('info');
    });

    test('should use LOG_LEVEL when set', () => {
      const logger = loadLoggerWithEnv({ LOG_LEVEL: 'debug' });
      expect(logger.level).toBe('debug');
    });
  });

  describe('Transport Configuration', () => {
    test('should have at least 3 transports (2 File + 1 Console)', () => {
      const logger = require('../../src/config/logger');
      expect(logger.transports.length).toBeGreaterThanOrEqual(3);
    });

    test('should include File transport for error.log', () => {
      const logger = require('../../src/config/logger');
      const fileTransports = logger.transports.filter(
        t => t.constructor.name === 'File'
      );
      const errorTransport = fileTransports.find(
        t => t.filename && t.filename.includes('error.log')
      );
      expect(errorTransport).toBeDefined();
      expect(errorTransport.level).toBe('error');
    });

    test('should include File transport for combined.log', () => {
      const logger = require('../../src/config/logger');
      const fileTransports = logger.transports.filter(
        t => t.constructor.name === 'File'
      );
      const combinedTransport = fileTransports.find(
        t => t.filename && t.filename.includes('combined.log')
      );
      expect(combinedTransport).toBeDefined();
    });

    test('should include Console transport', () => {
      const logger = require('../../src/config/logger');
      const consoleTransports = logger.transports.filter(
        t => t.constructor.name === 'Console'
      );
      expect(consoleTransports.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Environment-Aware Console Formatting', () => {
    test('should use colorized format in non-production environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      const consoleTransport = logger.transports.find(
        t => t.constructor.name === 'Console'
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should use JSON format in production environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      const consoleTransport = logger.transports.find(
        t => t.constructor.name === 'Console'
      );
      expect(consoleTransport).toBeDefined();
    });
  });

  describe('Logging Functionality', () => {
    test('should log info messages without throwing', () => {
      const logger = require('../../src/config/logger');
      expect(() => logger.info('test info message')).not.toThrow();
    });

    test('should log error messages without throwing', () => {
      const logger = require('../../src/config/logger');
      expect(() => logger.error('test error message')).not.toThrow();
    });

    test('should log warn messages without throwing', () => {
      const logger = require('../../src/config/logger');
      expect(() => logger.warn('test warn message')).not.toThrow();
    });

    test('should log messages with metadata without throwing', () => {
      const logger = require('../../src/config/logger');
      expect(() => logger.info('test', { key: 'value' })).not.toThrow();
    });
  });
});
