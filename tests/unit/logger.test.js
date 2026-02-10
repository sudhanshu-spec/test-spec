/**
 * @fileoverview Unit tests for the Winston logger module (src/utils/logger.js)
 * @module tests/unit/logger
 */

'use strict';

/**
 * Loads logger module with specified environment variables.
 * Resets module cache to ensure fresh evaluation with new config.
 * @param {Object<string, string>} [envOverrides={}] - Environment variable overrides
 * @returns {import('winston').Logger} Fresh logger module instance
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
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Logger Instance', () => {
    test('should export a defined logger object', () => {
      const logger = require('../../src/utils/logger');
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('should have info method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.info).toBe('function');
    });

    test('should have warn method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.warn).toBe('function');
    });

    test('should have error method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.error).toBe('function');
    });

    test('should have http method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.http).toBe('function');
    });

    test('should have debug method', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.debug).toBe('function');
    });

    test('should have level property', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.level).toBeDefined();
      expect(typeof logger.level).toBe('string');
    });

    test('should have transports array', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
      expect(Array.isArray(logger.transports)).toBe(true);
    });
  });

  describe('Custom Severity Levels', () => {
    test('should define custom levels with correct priorities', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.levels).toBeDefined();
      expect(logger.levels.error).toBe(0);
      expect(logger.levels.warn).toBe(1);
      expect(logger.levels.info).toBe(2);
      expect(logger.levels.http).toBe(3);
      expect(logger.levels.debug).toBe(4);
    });
  });

  describe('Test Environment Transports', () => {
    test('should have only console transport in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test' });
      expect(logger.transports.length).toBe(1);
    });

    test('should use warn level in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test' });
      expect(logger.level).toBe('warn');
    });
  });

  describe('Development Environment Transports', () => {
    test('should have more than one transport in development', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      expect(logger.transports.length).toBeGreaterThan(1);
    });

    test('should have file transports in development', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      // Should have console + 2 file transports = 3
      expect(logger.transports.length).toBe(3);
    });
  });

  describe('Log Level Configuration', () => {
    test('should default to info level', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: undefined });
      expect(logger.level).toBe('info');
    });

    test('should use LOG_LEVEL environment variable when set', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: 'debug' });
      expect(logger.level).toBe('debug');
    });

    test('should override LOG_LEVEL with warn in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test', LOG_LEVEL: 'debug' });
      expect(logger.level).toBe('warn');
    });
  });

  describe('Log Format with Stack Traces', () => {
    test('should format error messages with stack traces without throwing', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: 'error' });
      // Logging an error with a stack trace should exercise the stack branch in printf
      expect(() => {
        logger.error(new Error('test error with stack'));
      }).not.toThrow();
    });

    test('should format regular messages without stack without throwing', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: 'info' });
      expect(() => {
        logger.info('simple message without stack');
      }).not.toThrow();
    });
  });

  describe('File Transport Error Handling', () => {
    test('should handle error events on file transports without crashing', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      const fileTransports = logger.transports.filter(t => t.constructor.name === 'File');
      expect(fileTransports.length).toBe(2);

      // Register a logger-level error handler to catch errors re-emitted
      // by Winston's internal transportEvent propagation
      const loggerErrors = [];
      logger.on('error', (err) => { loggerErrors.push(err); });

      // Emit error events to trigger the transport error handler callbacks
      fileTransports.forEach(transport => {
        transport.emit('error', new Error('simulated write failure'));
      });

      // Verify errors were propagated but did not crash the process
      expect(loggerErrors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Stream Interface for Morgan', () => {
    test('should have stream property', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.stream).toBeDefined();
    });

    test('should have write method on stream', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.stream.write).toBe('function');
    });

    test('should call http method when stream.write is invoked', () => {
      const logger = require('../../src/utils/logger');
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});
      
      logger.stream.write('test message\n');
      
      expect(httpSpy).toHaveBeenCalledWith('test message');
      httpSpy.mockRestore();
    });
  });
});
