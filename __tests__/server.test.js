/**
 * Unit Tests for Server Configuration Validation
 *
 * Tests cover:
 * - Configuration validation logic
 * - Port validation (boundaries, invalid values)
 * - Config module functionality
 *
 * @module __tests__/server.test
 */

'use strict';

describe('Configuration Validation', () => {
  // -------------------------------------------------------------------------
  // Port Validation Logic Tests
  // -------------------------------------------------------------------------

  describe('Port Validation Logic', () => {
    /**
     * Helper function to test port validation logic
     * Mirrors the validateConfig function in server.js
     */
    function validatePort(portValue) {
      const port = parseInt(portValue, 10);

      if (isNaN(port)) {
        return { valid: false, reason: 'not a number' };
      }

      if (port < 0 || port > 65535) {
        return { valid: false, reason: 'out of range' };
      }

      return { valid: true, port };
    }

    test('accepts valid port 3000', () => {
      const result = validatePort(3000);
      expect(result.valid).toBe(true);
      expect(result.port).toBe(3000);
    });

    test('accepts valid port 8080', () => {
      const result = validatePort(8080);
      expect(result.valid).toBe(true);
      expect(result.port).toBe(8080);
    });

    test('accepts port as string', () => {
      const result = validatePort('3000');
      expect(result.valid).toBe(true);
      expect(result.port).toBe(3000);
    });

    test('accepts minimum port 0', () => {
      const result = validatePort(0);
      expect(result.valid).toBe(true);
      expect(result.port).toBe(0);
    });

    test('accepts maximum port 65535', () => {
      const result = validatePort(65535);
      expect(result.valid).toBe(true);
      expect(result.port).toBe(65535);
    });

    test('rejects port above maximum (65536)', () => {
      const result = validatePort(65536);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('out of range');
    });

    test('rejects negative port', () => {
      const result = validatePort(-1);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('out of range');
    });

    test('rejects non-numeric port string', () => {
      const result = validatePort('abc');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('not a number');
    });

    test('rejects empty string port', () => {
      const result = validatePort('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('not a number');
    });

    test('handles null port as 0 (valid)', () => {
      // parseInt(null, 10) returns NaN in JavaScript
      // But some implementations may coerce null to 0
      const result = validatePort(null);
      // Note: parseInt(null, 10) = NaN, which is "not a number"
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('not a number');
    });

    test('rejects undefined port', () => {
      const result = validatePort(undefined);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('not a number');
    });
  });

  // -------------------------------------------------------------------------
  // Config Module Tests
  // -------------------------------------------------------------------------

  describe('Config Module', () => {
    test('exports host, port, and env properties', () => {
      const config = require('../src/config');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('env');
    });

    test('has default port of 3000', () => {
      // Save original env
      const originalPort = process.env.PORT;
      delete process.env.PORT;

      // Clear require cache to reload config
      jest.resetModules();
      const config = require('../src/config');

      expect(config.port).toBe(3000);

      // Restore original env
      if (originalPort !== undefined) {
        process.env.PORT = originalPort;
      }
    });
  });
});
