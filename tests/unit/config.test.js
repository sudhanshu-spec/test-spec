/**
 * @fileoverview Unit tests for the configuration module (src/config/index.js)
 * Tests environment variable parsing and default values for:
 * - HOST, PORT, NODE_ENV (original configuration)
 * - LOG_LEVEL, LOG_FORMAT (logging configuration)
 * - CORS_ORIGIN (security configuration)
 * - PM2_INSTANCES (process management configuration)
 * @module tests/unit/config
 */

'use strict';

/**
 * Loads config module with specified environment variables.
 * Resets module cache to ensure fresh evaluation.
 * @param {Object<string, string>} [envOverrides={}] - Environment variable overrides
 * @returns {import('../../src/config')} Fresh config module instance
 */
function loadConfigWithEnv(envOverrides = {}) {
  jest.resetModules();
  
  Object.keys(envOverrides).forEach(key => {
    if (envOverrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = envOverrides[key];
    }
  });
  
  return require('../../src/config');
}

/**
 * Clears specified environment variables before loading config.
 * @param {string[]} keys - Environment variable keys to clear
 * @returns {import('../../src/config')} Fresh config module instance
 */
function loadConfigWithoutEnv(keys) {
  jest.resetModules();
  keys.forEach(key => delete process.env[key]);
  return require('../../src/config');
}

describe('Configuration Module', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Default Values', () => {
    test('should default host to 127.0.0.1 when HOST not set', () => {
      const config = loadConfigWithoutEnv(['HOST']);
      expect(config.host).toBe('127.0.0.1');
    });

    test('should default port to 3000 when PORT not set', () => {
      const config = loadConfigWithoutEnv(['PORT']);
      expect(config.port).toBe(3000);
    });

    test('should default env to development when NODE_ENV not set', () => {
      const config = loadConfigWithoutEnv(['NODE_ENV']);
      expect(config.env).toBe('development');
    });
  });

  describe('Custom Values', () => {
    test('should use HOST env var when set', () => {
      const config = loadConfigWithEnv({ HOST: '0.0.0.0' });
      expect(config.host).toBe('0.0.0.0');
    });

    test('should use PORT env var when set', () => {
      const config = loadConfigWithEnv({ PORT: '8080' });
      expect(config.port).toBe(8080);
    });

    test('should use NODE_ENV env var when set', () => {
      const config = loadConfigWithEnv({ NODE_ENV: 'production' });
      expect(config.env).toBe('production');
    });
  });

  describe('Edge Cases', () => {
    test('should fallback to default port for invalid PORT string', () => {
      const config = loadConfigWithEnv({ PORT: 'abc' });
      expect(config.port).toBe(3000);
    });

    test('should fallback to default port for empty PORT string', () => {
      const config = loadConfigWithEnv({ PORT: '' });
      expect(config.port).toBe(3000);
    });

    test('should handle PORT with leading/trailing whitespace', () => {
      const config = loadConfigWithEnv({ PORT: '  9000  ' });
      expect(config.port).toBe(9000);
    });

    test('should parse PORT with decimal by truncating', () => {
      const config = loadConfigWithEnv({ PORT: '3000.5' });
      expect(config.port).toBe(3000);
    });
  });

  describe('Type Checking', () => {
    test('should return port as a number type', () => {
      const config = loadConfigWithEnv({ PORT: '8080' });
      expect(typeof config.port).toBe('number');
    });

    test('should return host as a string type', () => {
      const config = loadConfigWithEnv({ HOST: '192.168.1.1' });
      expect(typeof config.host).toBe('string');
    });

    test('should return env as a string type', () => {
      const config = loadConfigWithEnv({ NODE_ENV: 'test' });
      expect(typeof config.env).toBe('string');
    });
  });

  describe('Configuration Object Structure', () => {
    test('should export an object with host, port, and env properties', () => {
      const config = require('../../src/config');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('env');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('logFormat');
      expect(config).toHaveProperty('corsOrigin');
      expect(config).toHaveProperty('pm2Instances');
    });

    test('should not have undefined values for any configuration property', () => {
      const config = require('../../src/config');
      expect(config.host).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.env).toBeDefined();
      expect(config.logLevel).toBeDefined();
      expect(config.logFormat).toBeDefined();
      expect(config.corsOrigin).toBeDefined();
      expect(config.pm2Instances).toBeDefined();
    });
  });

  describe('New Configuration Properties', () => {
    describe('logLevel Configuration', () => {
      test('should default logLevel to info when LOG_LEVEL not set', () => {
        const config = loadConfigWithoutEnv(['LOG_LEVEL']);
        expect(config.logLevel).toBe('info');
      });

      test('should use LOG_LEVEL env var when set', () => {
        const config = loadConfigWithEnv({ LOG_LEVEL: 'debug' });
        expect(config.logLevel).toBe('debug');
      });

      test('should return logLevel as string type', () => {
        const config = loadConfigWithEnv({ LOG_LEVEL: 'warn' });
        expect(typeof config.logLevel).toBe('string');
      });
    });

    describe('logFormat Configuration', () => {
      test('should default logFormat to combined when LOG_FORMAT not set', () => {
        const config = loadConfigWithoutEnv(['LOG_FORMAT']);
        expect(config.logFormat).toBe('combined');
      });

      test('should use LOG_FORMAT env var when set', () => {
        const config = loadConfigWithEnv({ LOG_FORMAT: 'dev' });
        expect(config.logFormat).toBe('dev');
      });
    });

    describe('corsOrigin Configuration', () => {
      test('should default corsOrigin to * when CORS_ORIGIN not set', () => {
        const config = loadConfigWithoutEnv(['CORS_ORIGIN']);
        expect(config.corsOrigin).toBe('*');
      });

      test('should use CORS_ORIGIN env var when set', () => {
        const config = loadConfigWithEnv({ CORS_ORIGIN: 'https://example.com' });
        expect(config.corsOrigin).toBe('https://example.com');
      });
    });

    describe('pm2Instances Configuration', () => {
      test('should default pm2Instances to 0 when PM2_INSTANCES not set', () => {
        const config = loadConfigWithoutEnv(['PM2_INSTANCES']);
        expect(config.pm2Instances).toBe(0);
      });

      test('should use PM2_INSTANCES env var when set', () => {
        const config = loadConfigWithEnv({ PM2_INSTANCES: '4' });
        expect(config.pm2Instances).toBe(4);
      });

      test('should return pm2Instances as number type', () => {
        const config = loadConfigWithEnv({ PM2_INSTANCES: '2' });
        expect(typeof config.pm2Instances).toBe('number');
      });
    });
  });
});
