/**
 * Configuration Module Test Suite
 *
 * Verifies that src/config/index.js correctly provides default values
 * and respects environment variable overrides for all configuration
 * settings including security-related parameters.
 *
 * @module tests/config.test
 */

'use strict';

describe('Configuration Module', () => {
  // Store original environment to restore after tests
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module cache to re-evaluate config with new env vars
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Default Values', () => {
    it('should export host with default 127.0.0.1', () => {
      delete process.env.HOST;
      const config = require('../src/config');
      expect(config.host).toBe('127.0.0.1');
    });

    it('should export port with default 3000', () => {
      delete process.env.PORT;
      const config = require('../src/config');
      expect(config.port).toBe(3000);
    });

    it('should export env with default development', () => {
      delete process.env.NODE_ENV;
      const config = require('../src/config');
      expect(config.env).toBe('development');
    });

    it('should export rateLimitWindowMs with default 900000 (15 minutes)', () => {
      delete process.env.RATE_LIMIT_WINDOW_MS;
      const config = require('../src/config');
      expect(config.rateLimitWindowMs).toBe(900000);
    });

    it('should export rateLimitMax with default 100', () => {
      delete process.env.RATE_LIMIT_MAX;
      const config = require('../src/config');
      expect(config.rateLimitMax).toBe(100);
    });

    it('should export corsOrigins with default *', () => {
      delete process.env.CORS_ORIGINS;
      const config = require('../src/config');
      expect(config.corsOrigins).toBe('*');
    });

    it('should export httpsEnabled with default false', () => {
      delete process.env.HTTPS_ENABLED;
      const config = require('../src/config');
      expect(config.httpsEnabled).toBe(false);
    });

    it('should export sslKeyPath with default undefined', () => {
      delete process.env.SSL_KEY_PATH;
      const config = require('../src/config');
      expect(config.sslKeyPath).toBeUndefined();
    });

    it('should export sslCertPath with default undefined', () => {
      delete process.env.SSL_CERT_PATH;
      const config = require('../src/config');
      expect(config.sslCertPath).toBeUndefined();
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should respect HOST environment variable', () => {
      process.env.HOST = '0.0.0.0';
      const config = require('../src/config');
      expect(config.host).toBe('0.0.0.0');
    });

    it('should respect PORT environment variable and parse as integer', () => {
      process.env.PORT = '8080';
      const config = require('../src/config');
      expect(config.port).toBe(8080);
      expect(typeof config.port).toBe('number');
    });

    it('should respect NODE_ENV environment variable', () => {
      process.env.NODE_ENV = 'production';
      const config = require('../src/config');
      expect(config.env).toBe('production');
    });

    it('should respect RATE_LIMIT_WINDOW_MS environment variable', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '60000';
      const config = require('../src/config');
      expect(config.rateLimitWindowMs).toBe(60000);
    });

    it('should respect RATE_LIMIT_MAX environment variable', () => {
      process.env.RATE_LIMIT_MAX = '50';
      const config = require('../src/config');
      expect(config.rateLimitMax).toBe(50);
    });

    it('should respect CORS_ORIGINS environment variable', () => {
      process.env.CORS_ORIGINS = 'http://localhost:3000';
      const config = require('../src/config');
      expect(config.corsOrigins).toBe('http://localhost:3000');
    });

    it('should set httpsEnabled to true when HTTPS_ENABLED is "true"', () => {
      process.env.HTTPS_ENABLED = 'true';
      const config = require('../src/config');
      expect(config.httpsEnabled).toBe(true);
    });

    it('should set httpsEnabled to false for non-"true" values', () => {
      process.env.HTTPS_ENABLED = 'false';
      const config = require('../src/config');
      expect(config.httpsEnabled).toBe(false);
    });

    it('should respect SSL_KEY_PATH environment variable', () => {
      process.env.SSL_KEY_PATH = '/etc/ssl/key.pem';
      const config = require('../src/config');
      expect(config.sslKeyPath).toBe('/etc/ssl/key.pem');
    });

    it('should respect SSL_CERT_PATH environment variable', () => {
      process.env.SSL_CERT_PATH = '/etc/ssl/cert.pem';
      const config = require('../src/config');
      expect(config.sslCertPath).toBe('/etc/ssl/cert.pem');
    });
  });
});
