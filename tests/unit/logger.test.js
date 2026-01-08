/**
 * @fileoverview Unit tests for the logger utility (src/utils/logger.js)
 * @module tests/unit/logger
 */

'use strict';

describe('Logger Utility', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Logger Exports', () => {
    test('should export logger object', () => {
      jest.resetModules();
      const loggerModule = require('../../src/utils/logger');
      expect(loggerModule).toHaveProperty('logger');
      expect(loggerModule.logger).toBeDefined();
    });

    test('should export stream object for morgan integration', () => {
      jest.resetModules();
      const loggerModule = require('../../src/utils/logger');
      expect(loggerModule).toHaveProperty('stream');
      expect(loggerModule.stream).toBeDefined();
    });
  });

  describe('Logger Instance', () => {
    test('should have info method', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.info).toBe('function');
    });

    test('should have warn method', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.warn).toBe('function');
    });

    test('should have error method', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.error).toBe('function');
    });

    test('should have debug method', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.debug).toBe('function');
    });

    test('should have http method', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(typeof logger.http).toBe('function');
    });

    test('should be a winston logger instance', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      // Winston logger has specific properties
      expect(logger.transports).toBeDefined();
      expect(Array.isArray(logger.transports)).toBe(true);
      expect(logger.levels).toBeDefined();
    });

    test('should log info messages without error', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    test('should log warn messages without error', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.warn('Test warn message')).not.toThrow();
    });

    test('should log error messages without error', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    test('should log debug messages without error', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    test('should log http messages without error', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.http('Test http message')).not.toThrow();
    });

    test('should accept metadata objects', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      expect(() => logger.info('Message with metadata', { userId: 123, action: 'test' })).not.toThrow();
    });

    test('should accept error objects', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      const error = new Error('Test error');
      expect(() => logger.error('Error occurred', error)).not.toThrow();
    });
  });

  describe('Stream Export', () => {
    test('should have write method', () => {
      jest.resetModules();
      const { stream } = require('../../src/utils/logger');
      expect(stream).toHaveProperty('write');
    });

    test('write method should be a function', () => {
      jest.resetModules();
      const { stream } = require('../../src/utils/logger');
      expect(typeof stream.write).toBe('function');
    });

    test('write should trim message and call logger.http', () => {
      jest.resetModules();
      const { logger, stream } = require('../../src/utils/logger');
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});

      stream.write('test message with newline\n');

      expect(httpSpy).toHaveBeenCalledWith('test message with newline');
      httpSpy.mockRestore();
    });

    test('write should handle messages without trailing newline', () => {
      jest.resetModules();
      const { logger, stream } = require('../../src/utils/logger');
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});

      stream.write('message without newline');

      expect(httpSpy).toHaveBeenCalledWith('message without newline');
      httpSpy.mockRestore();
    });

    test('write should handle HTTP request log format', () => {
      jest.resetModules();
      const { logger, stream } = require('../../src/utils/logger');
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});

      stream.write('GET /api/users 200 15ms\n');

      expect(httpSpy).toHaveBeenCalledWith('GET /api/users 200 15ms');
      httpSpy.mockRestore();
    });
  });

  describe('Log Level Configuration', () => {
    test('should use LOG_LEVEL from environment', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'debug';
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('debug');
    });

    test('should default to info level when LOG_LEVEL not set', () => {
      jest.resetModules();
      delete process.env.LOG_LEVEL;
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('info');
    });

    test('should use warn level when LOG_LEVEL is warn', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'warn';
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('warn');
    });

    test('should use error level when LOG_LEVEL is error', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'error';
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('error');
    });

    test('should use http level when LOG_LEVEL is http', () => {
      jest.resetModules();
      process.env.LOG_LEVEL = 'http';
      const { logger } = require('../../src/utils/logger');
      expect(logger.level).toBe('http');
    });
  });

  describe('Environment-Specific Behavior', () => {
    test('should configure transports in development environment', () => {
      jest.resetModules();
      process.env.NODE_ENV = 'development';
      const { logger } = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
      expect(Array.isArray(logger.transports)).toBe(true);
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    test('should configure transports in production environment', () => {
      jest.resetModules();
      process.env.NODE_ENV = 'production';
      const { logger } = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
      expect(Array.isArray(logger.transports)).toBe(true);
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    test('should configure transports in test environment', () => {
      jest.resetModules();
      process.env.NODE_ENV = 'test';
      const { logger } = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
      expect(Array.isArray(logger.transports)).toBe(true);
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    test('should use npm log levels', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      // Winston npm levels include these standard levels
      expect(logger.levels).toHaveProperty('error');
      expect(logger.levels).toHaveProperty('warn');
      expect(logger.levels).toHaveProperty('info');
      expect(logger.levels).toHaveProperty('http');
      expect(logger.levels).toHaveProperty('debug');
    });

    test('should not exit on error', () => {
      jest.resetModules();
      const { logger } = require('../../src/utils/logger');
      // Winston logger should have exitOnError set to false for graceful handling
      expect(logger.exitOnError).toBe(false);
    });

    test('should use devFormat printf callback in development environment', () => {
      jest.resetModules();
      process.env.NODE_ENV = 'development';
      
      const { logger } = require('../../src/utils/logger');
      
      // Actually log something to trigger the printf callback
      // The devFormat printf callback is invoked when logging occurs in dev mode
      expect(() => logger.info('Test message for printf')).not.toThrow();
      
      // Verify logger transports exist and are configured
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    test('should format log with metadata using devFormat in development', () => {
      jest.resetModules();
      process.env.NODE_ENV = 'development';
      
      const { logger } = require('../../src/utils/logger');
      
      // Log with metadata to trigger the metaStr branch in printf
      expect(() => logger.info('Test message', { key: 'value', count: 42 })).not.toThrow();
    });
  });
});
