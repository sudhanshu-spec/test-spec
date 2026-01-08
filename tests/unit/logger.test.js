/**
 * @fileoverview Unit tests for Winston logger utility
 * Tests logger configuration, transports, and streaming
 * @module tests/unit/logger
 */

'use strict';

describe('Logger Module', () => {
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    // Reset module cache to allow re-requiring with different env
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Module Export', () => {
    test('should export a logger object', () => {
      const { logger } = require('../../src/utils/logger');
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('should export a stream object', () => {
      const { stream } = require('../../src/utils/logger');
      expect(stream).toBeDefined();
      expect(typeof stream).toBe('object');
    });

    test('should have stream.write function', () => {
      const { stream } = require('../../src/utils/logger');
      expect(typeof stream.write).toBe('function');
    });
  });

  describe('Logger Instance', () => {
    test('should have info method', () => {
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.info).toBe('function');
    });

    test('should have error method', () => {
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.error).toBe('function');
    });

    test('should have warn method', () => {
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.warn).toBe('function');
    });

    test('should have debug method', () => {
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.debug).toBe('function');
    });

    test('should have http method', () => {
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.http).toBe('function');
    });
  });

  describe('Development Environment Configuration', () => {
    test('should use info level by default in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      // Logger uses config.logLevel || 'info' as default
      expect(logger.level).toBe('info');
    });

    test('should respect LOG_LEVEL override in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'warn';
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('warn');
    });

    test('should use debug level when LOG_LEVEL is debug', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'debug';
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('debug');
    });
  });

  describe('Production Environment Configuration', () => {
    test('should use info level in production when LOG_LEVEL not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('info');
    });

    test('should respect LOG_LEVEL in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'error';
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('error');
    });

    test('should have transports configured in production', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
      expect(Array.isArray(logger.transports)).toBe(true);
      expect(logger.transports.length).toBeGreaterThan(0);
    });
  });

  describe('Test Environment Configuration', () => {
    test('should use info level by default in test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      // Logger uses config.logLevel || 'info' as default
      expect(logger.level).toBe('info');
    });

    test('should respect LOG_LEVEL override in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.LOG_LEVEL = 'error';
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('error');
    });
  });

  describe('Stream for Morgan', () => {
    test('should write messages to logger', () => {
      const { logger, stream } = require('../../src/utils/logger');
      const mockHttp = jest.spyOn(logger, 'http').mockImplementation(() => {});
      stream.write('GET / 200 10ms\n');
      expect(mockHttp).toHaveBeenCalledWith('GET / 200 10ms');
    });

    test('should trim trailing newline from messages', () => {
      const { logger, stream } = require('../../src/utils/logger');
      const mockHttp = jest.spyOn(logger, 'http').mockImplementation(() => {});
      stream.write('Test message\n');
      expect(mockHttp).toHaveBeenCalledWith('Test message');
    });

    test('should handle messages without newline', () => {
      const { logger, stream } = require('../../src/utils/logger');
      const mockHttp = jest.spyOn(logger, 'http').mockImplementation(() => {});
      stream.write('No newline message');
      expect(mockHttp).toHaveBeenCalledWith('No newline message');
    });
  });

  describe('Logger Functionality', () => {
    test('should log info messages without error', () => {
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    test('should log error messages without error', () => {
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    test('should log warn messages without error', () => {
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.warn('Test warn message')).not.toThrow();
    });

    test('should log debug messages without error', () => {
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    test('should log http messages without error', () => {
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.http('Test http message')).not.toThrow();
    });

    test('should accept metadata objects', () => {
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.info('Message with meta', { userId: 123 })).not.toThrow();
    });

    test('should accept error objects', () => {
      const { logger } = require('../../src/utils/logger');
      const error = new Error('Test error');
      expect(() => logger.error('Error occurred', error)).not.toThrow();
    });
  });
});
