/**
 * @fileoverview Unit tests for the configuration module (src/config/index.js)
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
      // Security configuration properties
      expect(config).toHaveProperty('corsOrigin');
      expect(config).toHaveProperty('rateLimitWindowMs');
      expect(config).toHaveProperty('rateLimitMax');
      expect(config).toHaveProperty('httpsEnabled');
      expect(config).toHaveProperty('sslKeyPath');
      expect(config).toHaveProperty('sslCertPath');
      expect(config).toHaveProperty('trustProxy');
    });

    test('should not have undefined values for any configuration property', () => {
      const config = require('../../src/config');
      expect(config.host).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.env).toBeDefined();
      // Security configuration properties
      expect(config.corsOrigin).toBeDefined();
      expect(config.rateLimitWindowMs).toBeDefined();
      expect(config.rateLimitMax).toBeDefined();
      expect(config.httpsEnabled).toBeDefined();
      expect(config.sslKeyPath).toBeDefined();
      expect(config.sslCertPath).toBeDefined();
      expect(config.trustProxy).toBeDefined();
    });
  });

  // =========================================================================
  // Security Configuration Tests
  // =========================================================================

  describe('Security Configuration Defaults', () => {
    test('should default corsOrigin to http://localhost:3000 when CORS_ORIGIN not set', () => {
      const config = loadConfigWithoutEnv(['CORS_ORIGIN']);
      expect(config.corsOrigin).toBe('http://localhost:3000');
    });

    test('should default rateLimitWindowMs to 900000 when RATE_LIMIT_WINDOW_MS not set', () => {
      const config = loadConfigWithoutEnv(['RATE_LIMIT_WINDOW_MS']);
      expect(config.rateLimitWindowMs).toBe(900000);
    });

    test('should default rateLimitMax to 100 when RATE_LIMIT_MAX not set', () => {
      const config = loadConfigWithoutEnv(['RATE_LIMIT_MAX']);
      expect(config.rateLimitMax).toBe(100);
    });

    test('should default httpsEnabled to false when HTTPS_ENABLED not set', () => {
      const config = loadConfigWithoutEnv(['HTTPS_ENABLED']);
      expect(config.httpsEnabled).toBe(false);
    });

    test('should default sslKeyPath to empty string when SSL_KEY_PATH not set', () => {
      const config = loadConfigWithoutEnv(['SSL_KEY_PATH']);
      expect(config.sslKeyPath).toBe('');
    });

    test('should default sslCertPath to empty string when SSL_CERT_PATH not set', () => {
      const config = loadConfigWithoutEnv(['SSL_CERT_PATH']);
      expect(config.sslCertPath).toBe('');
    });

    test('should default trustProxy to false when TRUST_PROXY not set', () => {
      const config = loadConfigWithoutEnv(['TRUST_PROXY']);
      expect(config.trustProxy).toBe(false);
    });
  });

  describe('Security Configuration Custom Values', () => {
    test('should use CORS_ORIGIN env var when set', () => {
      const config = loadConfigWithEnv({ CORS_ORIGIN: 'https://example.com' });
      expect(config.corsOrigin).toBe('https://example.com');
    });

    test('should use RATE_LIMIT_WINDOW_MS env var as integer when set', () => {
      const config = loadConfigWithEnv({ RATE_LIMIT_WINDOW_MS: '600000' });
      expect(config.rateLimitWindowMs).toBe(600000);
    });

    test('should use RATE_LIMIT_MAX env var as integer when set', () => {
      const config = loadConfigWithEnv({ RATE_LIMIT_MAX: '50' });
      expect(config.rateLimitMax).toBe(50);
    });

    test('should set httpsEnabled to true when HTTPS_ENABLED is "true"', () => {
      const config = loadConfigWithEnv({ HTTPS_ENABLED: 'true' });
      expect(config.httpsEnabled).toBe(true);
    });

    test('should use SSL_KEY_PATH env var when set', () => {
      const config = loadConfigWithEnv({ SSL_KEY_PATH: '/etc/ssl/key.pem' });
      expect(config.sslKeyPath).toBe('/etc/ssl/key.pem');
    });

    test('should use SSL_CERT_PATH env var when set', () => {
      const config = loadConfigWithEnv({ SSL_CERT_PATH: '/etc/ssl/cert.pem' });
      expect(config.sslCertPath).toBe('/etc/ssl/cert.pem');
    });

    test('should set trustProxy to true when TRUST_PROXY is "true"', () => {
      const config = loadConfigWithEnv({ TRUST_PROXY: 'true' });
      expect(config.trustProxy).toBe(true);
    });
  });

  describe('Security Configuration Type Checking', () => {
    test('should return corsOrigin as a string type', () => {
      const config = loadConfigWithEnv({ CORS_ORIGIN: 'https://example.com' });
      expect(typeof config.corsOrigin).toBe('string');
    });

    test('should return rateLimitWindowMs as a number type', () => {
      const config = loadConfigWithEnv({ RATE_LIMIT_WINDOW_MS: '600000' });
      expect(typeof config.rateLimitWindowMs).toBe('number');
    });

    test('should return rateLimitMax as a number type', () => {
      const config = loadConfigWithEnv({ RATE_LIMIT_MAX: '50' });
      expect(typeof config.rateLimitMax).toBe('number');
    });

    test('should return httpsEnabled as a boolean type', () => {
      const config = loadConfigWithEnv({ HTTPS_ENABLED: 'true' });
      expect(typeof config.httpsEnabled).toBe('boolean');
    });

    test('should return sslKeyPath as a string type', () => {
      const config = loadConfigWithEnv({ SSL_KEY_PATH: '/path/to/key.pem' });
      expect(typeof config.sslKeyPath).toBe('string');
    });

    test('should return sslCertPath as a string type', () => {
      const config = loadConfigWithEnv({ SSL_CERT_PATH: '/path/to/cert.pem' });
      expect(typeof config.sslCertPath).toBe('string');
    });

    test('should return trustProxy as a boolean type', () => {
      const config = loadConfigWithEnv({ TRUST_PROXY: 'true' });
      expect(typeof config.trustProxy).toBe('boolean');
    });
  });
});
