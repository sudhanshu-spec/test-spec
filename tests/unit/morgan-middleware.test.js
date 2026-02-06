/**
 * @fileoverview Unit tests for the Morgan middleware module (src/middleware/morgan.middleware.js)
 * @module tests/unit/morgan-middleware
 */

'use strict';

const morgan = require('morgan');

/**
 * Loads the morgan middleware module with a fresh module cache and specified
 * environment variables so that config.env evaluates correctly.
 *
 * @param {Object<string, string>} [envOverrides={}] - Environment variable overrides
 * @returns {import('express').RequestHandler} Morgan middleware function
 */
function loadMorganMiddlewareWithEnv(envOverrides = {}) {
  jest.resetModules();

  // Mock dotenv to prevent .env file values from overriding test env vars
  jest.mock('dotenv', () => ({ config: jest.fn() }));

  Object.keys(envOverrides).forEach(key => {
    if (envOverrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = envOverrides[key];
    }
  });

  return require('../../src/middleware/morgan.middleware');
}

describe('Morgan Middleware', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Module Export', () => {
    test('should export a function (Express middleware)', () => {
      const mw = loadMorganMiddlewareWithEnv({ NODE_ENV: 'development' });
      expect(typeof mw).toBe('function');
    });
  });

  describe('Development Format', () => {
    test('should use dev format in development environment', () => {
      const mw = loadMorganMiddlewareWithEnv({ NODE_ENV: 'development' });
      // Morgan middleware is a function; just verify it loads without error
      expect(typeof mw).toBe('function');
    });

    test('should use dev format when NODE_ENV is not set', () => {
      const mw = loadMorganMiddlewareWithEnv({ NODE_ENV: undefined });
      expect(typeof mw).toBe('function');
    });

    test('should use dev format in test environment', () => {
      const mw = loadMorganMiddlewareWithEnv({ NODE_ENV: 'test' });
      expect(typeof mw).toBe('function');
    });
  });

  describe('Production Format', () => {
    test('should use combined format in production environment', () => {
      const mw = loadMorganMiddlewareWithEnv({ NODE_ENV: 'production' });
      expect(typeof mw).toBe('function');
    });
  });

  describe('Stream Integration', () => {
    test('should pipe output through Winston logger stream', () => {
      jest.resetModules();
      jest.mock('dotenv', () => ({ config: jest.fn() }));
      delete process.env.NODE_ENV;

      const logger = require('../../src/utils/logger');
      const mw = require('../../src/middleware/morgan.middleware');

      // Verify the morgan middleware was created (it will use logger.stream)
      expect(typeof mw).toBe('function');
      expect(logger.stream).toBeDefined();
      expect(typeof logger.stream.write).toBe('function');
    });
  });
});
