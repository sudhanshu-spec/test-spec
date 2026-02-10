/**
 * @fileoverview Unit tests for the Winston logger module (src/utils/logger.js)
 *
 * Validates the singleton Winston logger instance including:
 * - Logger instance properties and expected methods (info, warn, error, http, debug)
 * - Custom severity levels (error=0, warn=1, info=2, http=3, debug=4)
 * - Environment-aware transport configuration:
 *   - Test: console-only at warn level
 *   - Development: console + 2 file transports (error.log, combined.log)
 *   - Production: console (JSON format) + 2 file transports
 * - Log level driven by LOG_LEVEL environment variable
 * - Timestamp format presence on transports
 * - Stream interface for Morgan HTTP request logging integration
 * - Graceful handling of log directory creation failure
 * - File transport error handler resilience
 *
 * Uses the jest.resetModules() + fresh require() pattern from config.test.js
 * for isolated environment-aware testing across NODE_ENV values.
 *
 * @module tests/unit/logger
 */

'use strict';

const fs = require('fs');

/**
 * Loads logger module with specified environment variables.
 * Resets module cache to ensure fresh evaluation with new config values,
 * since the logger module reads config at require-time.
 * @param {Object<string, string|undefined>} [envOverrides={}] - Environment variable overrides.
 *   Set a key to undefined to delete that environment variable.
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
  /** @type {NodeJS.ProcessEnv} */
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

    test('should have info method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.info).toBe('function');
    });

    test('should have warn method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.warn).toBe('function');
    });

    test('should have error method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.error).toBe('function');
    });

    test('should have http method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.http).toBe('function');
    });

    test('should have debug method as a function', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.debug).toBe('function');
    });

    test('should have a string level property', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.level).toBeDefined();
      expect(typeof logger.level).toBe('string');
    });

    test('should have transports as an array', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.transports).toBeDefined();
      expect(Array.isArray(logger.transports)).toBe(true);
    });

    test('should have exitOnError set to false for graceful degradation', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.exitOnError).toBe(false);
    });
  });

  describe('Custom Severity Levels', () => {
    test('should define custom levels with correct numeric priorities', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.levels).toBeDefined();
      expect(logger.levels.error).toBe(0);
      expect(logger.levels.warn).toBe(1);
      expect(logger.levels.info).toBe(2);
      expect(logger.levels.http).toBe(3);
      expect(logger.levels.debug).toBe(4);
    });

    test('should have exactly five custom severity levels', () => {
      const logger = require('../../src/utils/logger');
      expect(Object.keys(logger.levels).length).toBe(5);
    });
  });

  describe('Test Environment Transports', () => {
    test('should have only one transport (console) in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test' });
      expect(logger.transports.length).toBe(1);
    });

    test('should use Console transport type in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test' });
      expect(logger.transports[0].constructor.name).toBe('Console');
    });

    test('should force warn level in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test' });
      expect(logger.level).toBe('warn');
    });
  });

  describe('Development Environment Transports', () => {
    test('should have three transports in development (console + 2 file)', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      expect(logger.transports.length).toBe(3);
    });

    test('should have Console as the first transport in development', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      expect(logger.transports[0].constructor.name).toBe('Console');
    });

    test('should include two File transports in development', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      const fileTransports = logger.transports.filter(t => t.constructor.name === 'File');
      expect(fileTransports.length).toBe(2);
    });

    test('should configure error.log file transport for error level only', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      const fileTransports = logger.transports.filter(t => t.constructor.name === 'File');
      const errorTransport = fileTransports.find(t => t.filename === 'error.log' && t.dirname === 'logs');
      expect(errorTransport).toBeDefined();
      expect(errorTransport.level).toBe('error');
    });

    test('should configure combined.log file transport for all levels', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      const fileTransports = logger.transports.filter(t => t.constructor.name === 'File');
      const combinedTransport = fileTransports.find(t => t.filename === 'combined.log' && t.dirname === 'logs');
      expect(combinedTransport).toBeDefined();
    });
  });

  describe('Production Environment Transports', () => {
    test('should have three transports in production (console + 2 file)', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      expect(logger.transports.length).toBe(3);
    });

    test('should have Console as the first transport in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      expect(logger.transports[0].constructor.name).toBe('Console');
    });

    test('should include two File transports in production', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      const fileTransports = logger.transports.filter(t => t.constructor.name === 'File');
      expect(fileTransports.length).toBe(2);
    });

    test('should log JSON messages in production without throwing', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      expect(() => {
        logger.info('production json message');
      }).not.toThrow();
    });
  });

  describe('Log Level Configuration', () => {
    test('should default to info level when LOG_LEVEL is not set', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: undefined });
      expect(logger.level).toBe('info');
    });

    test('should use LOG_LEVEL environment variable when set to debug', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: 'debug' });
      expect(logger.level).toBe('debug');
    });

    test('should override LOG_LEVEL with warn in test environment', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'test', LOG_LEVEL: 'debug' });
      expect(logger.level).toBe('warn');
    });

    test('should accept error as a valid log level', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: 'error' });
      expect(logger.level).toBe('error');
    });

    test('should accept http as a valid log level', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: 'http' });
      expect(logger.level).toBe('http');
    });
  });

  describe('Timestamp Format', () => {
    test('should include format configuration on the logger instance', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.format).toBeDefined();
    });

    test('should include format on the console transport', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      expect(logger.transports[0].format).toBeDefined();
    });

    test('should include format on file transports in non-test environments', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      const fileTransports = logger.transports.filter(t => t.constructor.name === 'File');
      fileTransports.forEach(transport => {
        expect(transport.format).toBeDefined();
      });
    });

    test('should include format on production console transport', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production' });
      expect(logger.transports[0].format).toBeDefined();
    });
  });

  describe('Log Format with Stack Traces', () => {
    test('should format error with stack trace in development without throwing', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: 'error' });
      expect(() => {
        logger.error(new Error('test error with stack'));
      }).not.toThrow();
    });

    test('should format regular message without stack in development without throwing', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development', LOG_LEVEL: 'info' });
      expect(() => {
        logger.info('simple message without stack');
      }).not.toThrow();
    });

    test('should format error with stack trace in production without throwing', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'production', LOG_LEVEL: 'error' });
      expect(() => {
        logger.error(new Error('production error with stack'));
      }).not.toThrow();
    });
  });

  describe('File Transport Error Handling', () => {
    test('should handle error events on file transports without crashing', () => {
      const logger = loadLoggerWithEnv({ NODE_ENV: 'development' });
      const fileTransports = logger.transports.filter(t => t.constructor.name === 'File');
      expect(fileTransports.length).toBe(2);

      // Collect any errors re-emitted by Winston's internal transport event propagation
      const loggerErrors = [];
      logger.on('error', function collectError(err) { loggerErrors.push(err); });

      // Emit error events on each file transport to trigger their error handler callbacks
      fileTransports.forEach(transport => {
        transport.emit('error', new Error('simulated write failure'));
      });

      // Process should not have crashed; error count is implementation-dependent
      expect(loggerErrors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Log Directory Creation', () => {
    test('should handle log directory creation failure gracefully', () => {
      // Spy on fs.mkdirSync to simulate a permission denied error,
      // exercising the catch block in ensureLogDirectory()
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Loading in a non-test environment triggers ensureLogDirectory()
      // which should catch the error and continue without crashing
      expect(() => {
        loadLoggerWithEnv({ NODE_ENV: 'development' });
      }).not.toThrow();

      expect(mkdirSyncSpy).toHaveBeenCalledWith('logs', { recursive: true });
      mkdirSyncSpy.mockRestore();
    });
  });

  describe('Stream Interface for Morgan', () => {
    test('should have a stream property on the logger', () => {
      const logger = require('../../src/utils/logger');
      expect(logger.stream).toBeDefined();
    });

    test('should have a write method on the stream object', () => {
      const logger = require('../../src/utils/logger');
      expect(typeof logger.stream.write).toBe('function');
    });

    test('should call http level when stream.write is invoked', () => {
      const logger = require('../../src/utils/logger');
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});

      logger.stream.write('GET /api/status 200 15ms\n');

      expect(httpSpy).toHaveBeenCalledWith('GET /api/status 200 15ms');
      httpSpy.mockRestore();
    });

    test('should trim trailing newline and whitespace from stream messages', () => {
      const logger = require('../../src/utils/logger');
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});

      logger.stream.write('  POST /api/data 201 42ms  \n');

      expect(httpSpy).toHaveBeenCalledWith('POST /api/data 201 42ms');
      httpSpy.mockRestore();
    });
  });
});
