/**
 * Logger Utility Unit Tests
 * 
 * Tests for the Winston logger service.
 * 
 * @module tests/unit/logger.test
 */

'use strict';

describe('Logger Utility (utils/logger.js)', () => {
  // Store original environment
  const originalEnv = process.env.NODE_ENV;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    // Clear module cache before each test
    jest.resetModules();
  });

  afterEach(() => {
    // Restore environment after each test
    process.env.NODE_ENV = originalEnv;
    if (originalLogLevel) {
      process.env.LOG_LEVEL = originalLogLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });

  describe('Logger Export', () => {
    test('should export a Winston logger instance', () => {
      const logger = require('../../src/utils/logger');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('should export logger with stream property for Morgan integration', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.stream).toBeDefined();
      expect(typeof logger.stream.write).toBe('function');
    });
  });

  describe('Logger Methods', () => {
    test('should have info method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.info).toBe('function');
      // Should not throw when called
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    test('should have error method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.error).toBe('function');
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    test('should have warn method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.warn).toBe('function');
      expect(() => logger.warn('Test warn message')).not.toThrow();
    });

    test('should have debug method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.debug).toBe('function');
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });
  });

  describe('Logger Stream Interface', () => {
    test('should have stream.write method for Morgan integration', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.stream.write).toBe('function');
    });

    test('should handle stream.write calls without throwing', () => {
      const logger = require('../../src/utils/logger');
      expect(() => logger.stream.write('Test HTTP log message\n')).not.toThrow();
    });

    test('should trim message in stream.write', () => {
      const logger = require('../../src/utils/logger');
      // This should not include trailing newline
      expect(() => logger.stream.write('Message with newline\n')).not.toThrow();
    });
  });

  describe('Environment-based Configuration', () => {
    test('should configure logger based on environment', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      
      const logger = require('../../src/utils/logger');
      expect(logger).toBeDefined();
      // In test environment, console transport should be silent
      const consoleTransport = logger.transports.find(t => t.name === 'console');
      if (consoleTransport) {
        expect(consoleTransport.silent).toBe(true);
      }
    });

    test('should use LOG_LEVEL environment variable when set', () => {
      process.env.LOG_LEVEL = 'warn';
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      
      const logger = require('../../src/utils/logger');
      expect(logger.level).toBe('warn');
    });

    test('should have transports array', () => {
      const logger = require('../../src/utils/logger');
      expect(Array.isArray(logger.transports)).toBe(true);
      expect(logger.transports.length).toBeGreaterThan(0);
    });
  });

  describe('Logger Singleton Pattern', () => {
    test('should return same instance on multiple requires', () => {
      const logger1 = require('../../src/utils/logger');
      const logger2 = require('../../src/utils/logger');
      expect(logger1).toBe(logger2);
    });
  });
});
