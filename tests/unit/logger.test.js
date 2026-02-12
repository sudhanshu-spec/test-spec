/**
 * @fileoverview Unit tests for the Winston logger factory (src/config/logger.js)
 *
 * Validates that the logger singleton is properly configured:
 * - Logger instance is defined and is an object
 * - Exposes standard logging methods (info, warn, error, debug)
 * - Defaults to 'info' log level when LOG_LEVEL is not set
 * - Has expected transports (Console + File for error.log and combined.log)
 * - Adapts Console transport format based on NODE_ENV (development vs production)
 *
 * Uses jest.resetModules() pattern from config.test.js for environment isolation
 * when testing different NODE_ENV configurations.
 *
 * @module tests/unit/logger
 */

'use strict';

/**
 * Loads a fresh logger instance with optional environment variable overrides.
 * Resets the module cache to ensure a completely fresh logger evaluation,
 * which is critical because the logger module is a singleton.
 * @param {Object<string, string|undefined>} [envOverrides={}] - Environment variable overrides.
 *   Set a key to undefined to delete that environment variable.
 * @returns {import('winston').Logger} Fresh Winston logger instance
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

  return require('../../src/config/logger');
}

describe('Logger Module', () => {
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
    test('should export a defined logger instance', () => {
      const logger = loadLogger();
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('should have info method', () => {
      const logger = loadLogger();
      expect(typeof logger.info).toBe('function');
    });

    test('should have warn method', () => {
      const logger = loadLogger();
      expect(typeof logger.warn).toBe('function');
    });

    test('should have error method', () => {
      const logger = loadLogger();
      expect(typeof logger.error).toBe('function');
    });

    test('should have debug method', () => {
      const logger = loadLogger();
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Logger Configuration', () => {
    test('should default log level to info', () => {
      delete process.env.LOG_LEVEL;
      const logger = loadLogger();
      expect(logger.level).toBe('info');
    });

    test('should respect LOG_LEVEL environment variable', () => {
      const logger = loadLogger({ LOG_LEVEL: 'debug' });
      expect(logger.level).toBe('debug');
    });

    test('should have transports configured', () => {
      const logger = loadLogger();
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    test('should have Console transport', () => {
      const logger = loadLogger();
      const consoleTransport = logger.transports.find(
        t => t.constructor.name === 'Console'
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should have File transports', () => {
      const logger = loadLogger();
      const fileTransports = logger.transports.filter(
        t => t.constructor.name === 'File'
      );
      expect(fileTransports.length).toBeGreaterThanOrEqual(2);
    });

    test('should include File transport for error.log with error level', () => {
      const logger = loadLogger();
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
      const logger = loadLogger();
      const fileTransports = logger.transports.filter(
        t => t.constructor.name === 'File'
      );
      const combinedTransport = fileTransports.find(
        t => t.filename && t.filename.includes('combined.log')
      );
      expect(combinedTransport).toBeDefined();
    });
  });

  describe('Environment-Aware Configuration', () => {
    test('should configure logger in development mode', () => {
      const logger = loadLogger({ NODE_ENV: 'development' });
      expect(logger).toBeDefined();
      const consoleTransport = logger.transports.find(
        t => t.constructor.name === 'Console'
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should configure logger in production mode', () => {
      const logger = loadLogger({ NODE_ENV: 'production' });
      expect(logger).toBeDefined();
      const consoleTransport = logger.transports.find(
        t => t.constructor.name === 'Console'
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should have at least 3 transports in development mode', () => {
      const logger = loadLogger({ NODE_ENV: 'development' });
      expect(logger.transports.length).toBeGreaterThanOrEqual(3);
    });

    test('should have at least 3 transports in production mode', () => {
      const logger = loadLogger({ NODE_ENV: 'production' });
      expect(logger.transports.length).toBeGreaterThanOrEqual(3);
    });
  });
});
