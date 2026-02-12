'use strict';

/**
 * Unit Tests — Configuration Module (src/config/index.js)
 *
 * Validates the configuration module's three exported properties (host, port, env)
 * across all six OR-expression branches:
 *   Branch 1 – HOST environment variable is set         → uses env value
 *   Branch 2 – HOST environment variable is NOT set     → defaults to '127.0.0.1'
 *   Branch 3 – PORT environment variable is valid number → parsed integer used
 *   Branch 4 – PORT environment variable is absent/NaN  → defaults to 3000
 *   Branch 5 – NODE_ENV environment variable is set      → uses env value
 *   Branch 6 – NODE_ENV environment variable is NOT set  → defaults to 'development'
 *
 * Each test calls jest.resetModules() then re-requires the config module so that
 * process.env mutations are picked up by the module-level expressions. The original
 * process.env snapshot is saved before each test and restored after to prevent
 * cross-test contamination.
 */

// ---------------------------------------------------------------------------
// Expected default values (mirrors src/config/index.js lines 26, 33, 40)
// ---------------------------------------------------------------------------
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;
const DEFAULT_ENV = 'development';

describe('Configuration Module (src/config/index.js)', () => {
  /**
   * Snapshot of the original process.env captured before every test so that
   * mutations made inside tests can be fully reversed in afterEach.
   */
  let originalEnv;

  beforeEach(() => {
    // Save the entire environment so we can restore it after each test
    originalEnv = { ...process.env };

    // Clear the module registry so the next require() evaluates the config
    // module afresh with whatever process.env state the test has set up.
    jest.resetModules();

    // Remove the three variables under test so each test starts from a known
    // clean slate. Individual tests will set them as needed.
    delete process.env.HOST;
    delete process.env.PORT;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore the original environment — prevents cross-test contamination
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. Default Values (Happy Path — branches 2, 4, 6)
  // =========================================================================
  describe('Default Values', () => {
    it('should default host to 127.0.0.1 when HOST is not set', () => {
      const config = require('../src/config');

      expect(config.host).toBe(DEFAULT_HOST);
    });

    it('should default port to 3000 when PORT is not set', () => {
      const config = require('../src/config');

      expect(config.port).toBe(DEFAULT_PORT);
    });

    it('should default env to development when NODE_ENV is not set', () => {
      const config = require('../src/config');

      expect(config.env).toBe(DEFAULT_ENV);
    });

    it('should export an object with host, port, and env properties', () => {
      const config = require('../src/config');

      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('env');
    });

    it('should export exactly three properties', () => {
      const config = require('../src/config');

      expect(Object.keys(config)).toHaveLength(3);
    });

    it('should return all default values simultaneously when no env vars are set', () => {
      const config = require('../src/config');

      expect(config.host).toBe(DEFAULT_HOST);
      expect(config.port).toBe(DEFAULT_PORT);
      expect(config.env).toBe(DEFAULT_ENV);
    });
  });

  // =========================================================================
  // 2. Environment Variable Overrides (branches 1, 3, 5)
  // =========================================================================
  describe('Environment Variable Overrides', () => {
    it('should use HOST environment variable when set', () => {
      process.env.HOST = '0.0.0.0';

      const config = require('../src/config');

      expect(config.host).toBe('0.0.0.0');
    });

    it('should use PORT environment variable when set to a valid number', () => {
      process.env.PORT = '8080';

      const config = require('../src/config');

      expect(config.port).toBe(8080);
    });

    it('should use NODE_ENV environment variable when set', () => {
      process.env.NODE_ENV = 'production';

      const config = require('../src/config');

      expect(config.env).toBe('production');
    });

    it('should handle all overrides simultaneously', () => {
      process.env.HOST = '0.0.0.0';
      process.env.PORT = '9090';
      process.env.NODE_ENV = 'test';

      const config = require('../src/config');

      expect(config.host).toBe('0.0.0.0');
      expect(config.port).toBe(9090);
      expect(config.env).toBe('test');
    });

    it('should accept any string for HOST', () => {
      process.env.HOST = 'my-custom-host.local';

      const config = require('../src/config');

      expect(config.host).toBe('my-custom-host.local');
    });

    it('should accept any string for NODE_ENV', () => {
      process.env.NODE_ENV = 'staging';

      const config = require('../src/config');

      expect(config.env).toBe('staging');
    });
  });

  // =========================================================================
  // 3. PORT parseInt Edge Cases
  // =========================================================================
  describe('PORT parseInt Edge Cases', () => {
    it('should fallback to 3000 when PORT is non-numeric string (abc)', () => {
      // parseInt('abc', 10) → NaN, NaN || 3000 → 3000
      process.env.PORT = 'abc';

      const config = require('../src/config');

      expect(config.port).toBe(DEFAULT_PORT);
    });

    it('should fallback to 3000 when PORT is empty string', () => {
      // parseInt('', 10) → NaN, NaN || 3000 → 3000
      process.env.PORT = '';

      const config = require('../src/config');

      expect(config.port).toBe(DEFAULT_PORT);
    });

    it('should fallback to 3000 when PORT is 0 (falsy value)', () => {
      // parseInt('0', 10) → 0, 0 || 3000 → 3000  (0 is falsy in JS)
      process.env.PORT = '0';

      const config = require('../src/config');

      expect(config.port).toBe(DEFAULT_PORT);
    });

    it('should parse valid numeric PORT string correctly', () => {
      process.env.PORT = '4000';

      const config = require('../src/config');

      expect(config.port).toBe(4000);
    });

    it('should parse high numeric PORT value', () => {
      process.env.PORT = '65535';

      const config = require('../src/config');

      expect(config.port).toBe(65535);
    });

    it('should return number type for port when PORT env var is set', () => {
      process.env.PORT = '5000';

      const config = require('../src/config');

      expect(typeof config.port).toBe('number');
    });

    it('should return number type for port when using default', () => {
      const config = require('../src/config');

      expect(typeof config.port).toBe('number');
    });

    it('should fallback to 3000 when PORT contains mixed alphanumeric starting with letters', () => {
      // parseInt('port8080', 10) → NaN
      process.env.PORT = 'port8080';

      const config = require('../src/config');

      expect(config.port).toBe(DEFAULT_PORT);
    });

    it('should parse leading digits from PORT with trailing non-numeric characters', () => {
      // parseInt('8080abc', 10) → 8080 (parseInt stops at first non-digit)
      // 8080 is truthy → 8080 || 3000 → 8080
      process.env.PORT = '8080abc';

      const config = require('../src/config');

      expect(config.port).toBe(8080);
    });

    it('should fallback to 3000 when PORT contains only whitespace', () => {
      // parseInt('   ', 10) → NaN, NaN || 3000 → 3000
      process.env.PORT = '   ';

      const config = require('../src/config');

      expect(config.port).toBe(DEFAULT_PORT);
    });

    it('should parse negative PORT values as truthy numbers', () => {
      // parseInt('-1', 10) → -1, -1 || 3000 → -1 (truthy)
      process.env.PORT = '-1';

      const config = require('../src/config');

      expect(config.port).toBe(-1);
    });
  });

  // =========================================================================
  // 4. Type Verification
  // =========================================================================
  describe('Type Verification', () => {
    it('should export host as a string', () => {
      const config = require('../src/config');

      expect(typeof config.host).toBe('string');
    });

    it('should export port as a number', () => {
      const config = require('../src/config');

      expect(typeof config.port).toBe('number');
    });

    it('should export env as a string', () => {
      const config = require('../src/config');

      expect(typeof config.env).toBe('string');
    });

    it('should export host as a string when HOST is overridden', () => {
      process.env.HOST = '0.0.0.0';

      const config = require('../src/config');

      expect(typeof config.host).toBe('string');
    });

    it('should export port as a number when PORT is overridden', () => {
      process.env.PORT = '9999';

      const config = require('../src/config');

      expect(typeof config.port).toBe('number');
    });

    it('should export env as a string when NODE_ENV is overridden', () => {
      process.env.NODE_ENV = 'production';

      const config = require('../src/config');

      expect(typeof config.env).toBe('string');
    });
  });

  // =========================================================================
  // 5. Module Re-evaluation Isolation
  // =========================================================================
  describe('Module Re-evaluation Isolation', () => {
    it('should reflect changed process.env values on fresh require', () => {
      // First require — defaults
      const config1 = require('../src/config');
      expect(config1.port).toBe(DEFAULT_PORT);

      // Mutate environment and reset module cache
      process.env.PORT = '7777';
      jest.resetModules();

      // Second require — picks up new PORT
      const config2 = require('../src/config');
      expect(config2.port).toBe(7777);
    });

    it('should return independent config objects on separate requires', () => {
      const config1 = require('../src/config');

      jest.resetModules();
      process.env.HOST = '10.0.0.1';

      const config2 = require('../src/config');

      // The first reference still holds the old value because it was captured
      // before the module was re-evaluated
      expect(config1.host).toBe(DEFAULT_HOST);
      expect(config2.host).toBe('10.0.0.1');
    });
  });
});
