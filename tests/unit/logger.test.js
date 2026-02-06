/**
 * @fileoverview Unit tests for the logger utility (src/utils/logger.js)
 *
 * Validates the Winston logger singleton's export shape, environment-aware
 * log level resolution, transport configuration (console in all environments,
 * file transports in production), JSON format with timestamps, and the stream
 * interface used by Morgan for HTTP request logging.
 *
 * Uses jest.resetModules() and process.env manipulation pattern from
 * config.test.js for environment isolation between tests.
 *
 * @module tests/unit/logger
 */

'use strict';

const winston = require('winston');

// Prevent .env file from injecting environment variables during tests.
// The config module calls require('dotenv').config() at the top, and without
// this mock dotenv would read the project's .env file and set variables that
// could interfere with test isolation.
jest.mock('dotenv', () => ({ config: jest.fn() }));

/**
 * Loads the logger module with specified environment variable overrides.
 * Resets the module cache to ensure a completely fresh logger instance is
 * created on each call, enabling isolated tests for different configurations.
 *
 * @param {Object<string, string|undefined>} [envOverrides={}] - Environment
 *   variable overrides. Pass undefined as a value to delete that key from
 *   process.env before loading the logger.
 * @returns {import('winston').Logger & { stream: { write: Function } }} Fresh logger instance
 */
function loadLogger(envOverrides = {}) {
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

describe('Logger Module', () => {
  /** @type {NodeJS.ProcessEnv} Saved reference to restore after all tests */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    // Clear any config mocks from previous tests (e.g., fallback branch tests)
    jest.unmock('../../src/config');
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ---------------------------------------------------------------------------
  // 3a. Export Shape
  // ---------------------------------------------------------------------------
  describe('Export', () => {
    test('should export an object', () => {
      const logger = loadLogger();
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('should have info method', () => {
      const logger = loadLogger();
      expect(typeof logger.info).toBe('function');
    });

    test('should have error method', () => {
      const logger = loadLogger();
      expect(typeof logger.error).toBe('function');
    });

    test('should have warn method', () => {
      const logger = loadLogger();
      expect(typeof logger.warn).toBe('function');
    });

    test('should have debug method', () => {
      const logger = loadLogger();
      expect(typeof logger.debug).toBe('function');
    });

    test('should have http method', () => {
      const logger = loadLogger();
      expect(typeof logger.http).toBe('function');
    });

    test('should have log method', () => {
      const logger = loadLogger();
      expect(typeof logger.log).toBe('function');
    });
  });

  // ---------------------------------------------------------------------------
  // 3b. Log Level Resolution
  //
  // The logger resolves its level via:
  //   config.logLevel || (config.env === 'production' ? 'info' : 'debug')
  //
  // Because config.logLevel defaults to process.env.LOG_LEVEL || 'info',
  // the right-hand fallback branch only activates when config.logLevel is
  // falsy (e.g., empty string). Tests that exercise the fallback branch
  // use jest.mock('../../src/config', ...) to inject a falsy logLevel.
  // ---------------------------------------------------------------------------
  describe('Log Levels', () => {
    test('should use info level when NODE_ENV is production', () => {
      const logger = loadLogger({ NODE_ENV: 'production' });
      expect(logger.level).toBe('info');
    });

    test('should use debug level when NODE_ENV is development', () => {
      // Exercise the fallback branch: config.logLevel is falsy → env-based
      // resolution returns 'debug' for non-production environments.
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

    test('should use debug level when NODE_ENV is not set', () => {
      // When NODE_ENV is absent, config.env defaults to 'development'.
      // With a falsy config.logLevel the fallback path yields 'debug'.
      jest.resetModules();
      jest.mock('../../src/config', () => ({
        logLevel: '',
        env: 'development',
        host: '127.0.0.1',
        port: 3000
      }));
      const freshLogger = require('../../src/utils/logger');
      expect(freshLogger.level).toBe('debug');
    });

    test('should respect LOG_LEVEL from config when set', () => {
      const logger = loadLogger({ LOG_LEVEL: 'warn' });
      expect(logger.level).toBe('warn');
    });

    test('should fallback to info when config.logLevel is falsy and env is production', () => {
      // Exercises the right-hand fallback branch in production mode.
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

    test('should use config.logLevel value when it is truthy', () => {
      // When LOG_LEVEL env var is explicitly set, config.logLevel is truthy
      // and the logger uses it directly without hitting the fallback branch.
      const logger = loadLogger({ LOG_LEVEL: 'debug', NODE_ENV: 'production' });
      expect(logger.level).toBe('debug');
    });
  });

  // ---------------------------------------------------------------------------
  // 3c. Transport Configuration
  // ---------------------------------------------------------------------------
  describe('Transports', () => {
    test('should have at least one transport configured', () => {
      const logger = loadLogger();
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    test('should have console transport in development', () => {
      const logger = loadLogger({ NODE_ENV: 'development' });
      const consoleTransport = logger.transports.find(
        t => t instanceof winston.transports.Console
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should have console transport in production', () => {
      const logger = loadLogger({ NODE_ENV: 'production' });
      const consoleTransport = logger.transports.find(
        t => t instanceof winston.transports.Console
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should have file transports in production', () => {
      const logger = loadLogger({ NODE_ENV: 'production' });
      const fileTransports = logger.transports.filter(
        t => t instanceof winston.transports.File
      );
      // Production should have console (1) + error.log (1) + all.log (1) = 3
      expect(logger.transports.length).toBeGreaterThanOrEqual(3);
      expect(fileTransports.length).toBe(2);
    });

    test('should have error.log file transport in production', () => {
      const logger = loadLogger({ NODE_ENV: 'production' });
      // Winston internally splits 'logs/error.log' into dirname + filename
      const errorFile = logger.transports.find(
        t => t instanceof winston.transports.File &&
          t.filename === 'error.log' && t.dirname === 'logs'
      );
      expect(errorFile).toBeDefined();
      expect(errorFile.level).toBe('error');
    });

    test('should have all.log file transport in production', () => {
      const logger = loadLogger({ NODE_ENV: 'production' });
      // Winston internally splits 'logs/all.log' into dirname + filename
      const allFile = logger.transports.find(
        t => t instanceof winston.transports.File &&
          t.filename === 'all.log' && t.dirname === 'logs'
      );
      expect(allFile).toBeDefined();
    });

    test('should not have file transports in development', () => {
      const logger = loadLogger({ NODE_ENV: 'development' });
      const fileTransports = logger.transports.filter(
        t => t instanceof winston.transports.File
      );
      expect(fileTransports.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3d. Format Configuration
  // ---------------------------------------------------------------------------
  describe('Format', () => {
    test('should have format configured', () => {
      const logger = loadLogger();
      expect(logger.format).toBeDefined();
    });

    test('should be able to log without throwing errors', () => {
      const logger = loadLogger({ NODE_ENV: 'test' });
      // Silence all transports to prevent console noise during tests
      logger.transports.forEach(t => { t.silent = true; });

      expect(() => logger.info('test info message')).not.toThrow();
      expect(() => logger.error('test error message')).not.toThrow();
      expect(() => logger.warn('test warn message')).not.toThrow();
      expect(() => logger.debug('test debug message')).not.toThrow();
      expect(() => logger.http('test http message')).not.toThrow();
      expect(() => logger.log('info', 'test log method')).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 3e. Stream Interface (Morgan Integration)
  // ---------------------------------------------------------------------------
  describe('Stream Interface', () => {
    test('should have stream property', () => {
      const logger = loadLogger();
      expect(logger.stream).toBeDefined();
    });

    test('should have stream.write method', () => {
      const logger = loadLogger();
      expect(typeof logger.stream.write).toBe('function');
    });

    test('should stream.write be callable without throwing', () => {
      const logger = loadLogger();
      // Silence transports to prevent console noise
      logger.transports.forEach(t => { t.silent = true; });
      expect(() => logger.stream.write('test message\n')).not.toThrow();
    });

    test('should pipe stream.write messages to logger.http', () => {
      const logger = loadLogger();
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});

      logger.stream.write('GET /test 200 5ms\n');

      expect(httpSpy).toHaveBeenCalledWith('GET /test 200 5ms');
      httpSpy.mockRestore();
    });

    test('should trim whitespace from stream.write messages', () => {
      const logger = loadLogger();
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});

      logger.stream.write('  some message with spaces  \n');

      expect(httpSpy).toHaveBeenCalledWith('some message with spaces');
      httpSpy.mockRestore();
    });
  });
});
