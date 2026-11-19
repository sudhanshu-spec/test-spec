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
    });

    test('should not have undefined values for any configuration property', () => {
      const config = require('../../src/config');
      expect(config.host).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.env).toBeDefined();
    });
  });

  describe('Database File Configuration', () => {
    test('should default dbFile to data/app.db when DB_FILE not set', () => {
      const config = loadConfigWithoutEnv(['DB_FILE']);
      expect(config.dbFile).toBe('data/app.db');
    });

    test('should use DB_FILE env var when set', () => {
      const config = loadConfigWithEnv({ DB_FILE: '/tmp/custom.db' });
      expect(config.dbFile).toBe('/tmp/custom.db');
    });

    test('should return dbFile as a string type', () => {
      const config = loadConfigWithoutEnv(['DB_FILE']);
      expect(typeof config.dbFile).toBe('string');
    });
  });

  describe('CORS Origin Configuration', () => {
    test('should default corsOrigin to http://localhost:5173 when CORS_ORIGIN not set', () => {
      const config = loadConfigWithoutEnv(['CORS_ORIGIN']);
      expect(config.corsOrigin).toBe('http://localhost:5173');
    });

    test('should use CORS_ORIGIN env var when set', () => {
      const config = loadConfigWithEnv({ CORS_ORIGIN: 'http://localhost:4000' });
      expect(config.corsOrigin).toBe('http://localhost:4000');
    });

    test('should return corsOrigin as a string type', () => {
      const config = loadConfigWithoutEnv(['CORS_ORIGIN']);
      expect(typeof config.corsOrigin).toBe('string');
    });
  });

  describe('Token TTL Configuration', () => {
    test('should default tokenTtlHours to 24 when TOKEN_TTL_HOURS not set', () => {
      const config = loadConfigWithoutEnv(['TOKEN_TTL_HOURS']);
      expect(config.tokenTtlHours).toBe(24);
    });

    test('should parse TOKEN_TTL_HOURS env var as a number when set', () => {
      const config = loadConfigWithEnv({ TOKEN_TTL_HOURS: '48' });
      expect(config.tokenTtlHours).toBe(48);
    });

    test('should return tokenTtlHours as a number type', () => {
      const config = loadConfigWithoutEnv(['TOKEN_TTL_HOURS']);
      expect(typeof config.tokenTtlHours).toBe('number');
    });
  });

  describe('Service Window Configuration', () => {
    test('should default serviceOpenTime to 17:00 when SERVICE_OPEN_TIME not set', () => {
      const config = loadConfigWithoutEnv(['SERVICE_OPEN_TIME']);
      expect(config.serviceOpenTime).toBe('17:00');
    });

    test('should use SERVICE_OPEN_TIME env var when set', () => {
      const config = loadConfigWithEnv({ SERVICE_OPEN_TIME: '16:30' });
      expect(config.serviceOpenTime).toBe('16:30');
    });

    test('should default serviceCloseTime to 22:00 when SERVICE_CLOSE_TIME not set', () => {
      const config = loadConfigWithoutEnv(['SERVICE_CLOSE_TIME']);
      expect(config.serviceCloseTime).toBe('22:00');
    });

    test('should use SERVICE_CLOSE_TIME env var when set', () => {
      const config = loadConfigWithEnv({ SERVICE_CLOSE_TIME: '23:00' });
      expect(config.serviceCloseTime).toBe('23:00');
    });

    test('should return both service window times as string types', () => {
      const config = loadConfigWithoutEnv(['SERVICE_OPEN_TIME', 'SERVICE_CLOSE_TIME']);
      expect(typeof config.serviceOpenTime).toBe('string');
      expect(typeof config.serviceCloseTime).toBe('string');
    });
  });

  describe('Reservation Horizon Configuration', () => {
    test('should default reservationHorizonDays to 90 when RESERVATION_HORIZON_DAYS not set', () => {
      const config = loadConfigWithoutEnv(['RESERVATION_HORIZON_DAYS']);
      expect(config.reservationHorizonDays).toBe(90);
    });

    test('should parse RESERVATION_HORIZON_DAYS env var as a number when set', () => {
      const config = loadConfigWithEnv({ RESERVATION_HORIZON_DAYS: '30' });
      expect(config.reservationHorizonDays).toBe(30);
    });

    test('should return reservationHorizonDays as a number type', () => {
      const config = loadConfigWithoutEnv(['RESERVATION_HORIZON_DAYS']);
      expect(typeof config.reservationHorizonDays).toBe('number');
    });
  });

  describe('Party Size Configuration', () => {
    test('should default maxPartySize to 12 when MAX_PARTY_SIZE not set', () => {
      const config = loadConfigWithoutEnv(['MAX_PARTY_SIZE']);
      expect(config.maxPartySize).toBe(12);
    });

    test('should parse MAX_PARTY_SIZE env var as a number when set', () => {
      const config = loadConfigWithEnv({ MAX_PARTY_SIZE: '8' });
      expect(config.maxPartySize).toBe(8);
    });

    test('should return maxPartySize as a number type', () => {
      const config = loadConfigWithoutEnv(['MAX_PARTY_SIZE']);
      expect(typeof config.maxPartySize).toBe('number');
    });
  });

  describe('Extended Configuration Object Structure', () => {
    test('should expose all seven extended configuration properties', () => {
      const config = require('../../src/config');
      expect(config).toHaveProperty('dbFile');
      expect(config).toHaveProperty('corsOrigin');
      expect(config).toHaveProperty('tokenTtlHours');
      expect(config).toHaveProperty('serviceOpenTime');
      expect(config).toHaveProperty('serviceCloseTime');
      expect(config).toHaveProperty('maxPartySize');
      expect(config).toHaveProperty('reservationHorizonDays');
      expect(config.dbFile).toBeDefined();
      expect(config.corsOrigin).toBeDefined();
      expect(config.tokenTtlHours).toBeDefined();
      expect(config.serviceOpenTime).toBeDefined();
      expect(config.serviceCloseTime).toBeDefined();
      expect(config.maxPartySize).toBeDefined();
      expect(config.reservationHorizonDays).toBeDefined();
    });

    test('should keep host, port and env defaults while every extended variable is set', () => {
      const config = loadConfigWithEnv({
        HOST: undefined,
        PORT: undefined,
        NODE_ENV: undefined,
        DB_FILE: 'data/test.db',
        CORS_ORIGIN: 'http://localhost:4000',
        TOKEN_TTL_HOURS: '12',
        SERVICE_OPEN_TIME: '16:30',
        SERVICE_CLOSE_TIME: '23:00',
        MAX_PARTY_SIZE: '8',
        RESERVATION_HORIZON_DAYS: '30'
      });

      expect(config.host).toBe('127.0.0.1');
      expect(config.port).toBe(3000);
      expect(config.env).toBe('development');
    });
  });
});

/**
 * Domain validation of the environment settings. A value that parses but lies
 * outside what the application can honour stops the require with an error that
 * names the offending variable; an unset, empty or unparsable value keeps the
 * documented default. The describe block restores process.env itself, so a
 * throwing require cannot leak its value into a later case.
 */
describe('Configuration Domain Validation', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('PORT', () => {
    test.each(['-1', '99999', '70000'])('rejects the out-of-domain value %s, naming PORT', (value) => {
      expect(() => loadConfigWithEnv({ PORT: value }))
        .toThrow('Invalid PORT: ' + value + '. Expected an integer between 1 and 65535.');
    });

    test.each([
      ['0', 3000],
      ['abc', 3000],
      ['', 3000],
      ['1', 1],
      ['65535', 65535]
    ])('keeps PORT=%j at its documented value %i', (value, expected) => {
      expect(loadConfigWithEnv({ PORT: value }).port).toBe(expected);
    });
  });

  describe('TOKEN_TTL_HOURS', () => {
    test.each(['-5', '-1'])('rejects the out-of-domain value %s, naming TOKEN_TTL_HOURS', (value) => {
      expect(() => loadConfigWithEnv({ TOKEN_TTL_HOURS: value }))
        .toThrow('Invalid TOKEN_TTL_HOURS: ' + value + '. Expected an integer of at least 1.');
    });

    test.each([
      ['abc', 24],
      ['', 24],
      ['1', 1],
      ['48', 48]
    ])('keeps TOKEN_TTL_HOURS=%j at its documented value %i', (value, expected) => {
      expect(loadConfigWithEnv({ TOKEN_TTL_HOURS: value }).tokenTtlHours).toBe(expected);
    });
  });

  describe('RESERVATION_HORIZON_DAYS', () => {
    test.each(['-3', '-1'])('rejects the out-of-domain value %s, naming RESERVATION_HORIZON_DAYS', (value) => {
      expect(() => loadConfigWithEnv({ RESERVATION_HORIZON_DAYS: value }))
        .toThrow('Invalid RESERVATION_HORIZON_DAYS: ' + value + '. Expected an integer of at least 1.');
    });

    test.each([
      ['abc', 90],
      ['', 90],
      ['30', 30]
    ])('keeps RESERVATION_HORIZON_DAYS=%j at its documented value %i', (value, expected) => {
      expect(loadConfigWithEnv({ RESERVATION_HORIZON_DAYS: value }).reservationHorizonDays).toBe(expected);
    });
  });

  describe('MAX_PARTY_SIZE', () => {
    test.each(['13', '20'])('rejects the value %s above the schema ceiling, naming MAX_PARTY_SIZE', (value) => {
      expect(() => loadConfigWithEnv({ MAX_PARTY_SIZE: value }))
        .toThrow('Invalid MAX_PARTY_SIZE: ' + value + '. Expected an integer between 1 and 12.');
    });

    test.each([
      ['1', 1],
      ['12', 12],
      ['abc', 12],
      ['', 12]
    ])('keeps MAX_PARTY_SIZE=%j at its documented value %i', (value, expected) => {
      expect(loadConfigWithEnv({ MAX_PARTY_SIZE: value }).maxPartySize).toBe(expected);
    });
  });

  describe('Service window', () => {
    test.each([
      ['SERVICE_OPEN_TIME', 'garbage'],
      ['SERVICE_OPEN_TIME', '7:00'],
      ['SERVICE_OPEN_TIME', '24:00'],
      ['SERVICE_CLOSE_TIME', 'nonsense'],
      ['SERVICE_CLOSE_TIME', '18:60']
    ])('rejects %s=%j as not an HH:MM time', (name, value) => {
      expect(() => loadConfigWithEnv({ [name]: value }))
        .toThrow('Invalid ' + name + ': ' + value + '. Expected a 24-hour HH:MM time.');
    });

    test.each([
      ['23:00', '17:00'],
      ['18:00', '18:00']
    ])('rejects the non-positive window %s-%s, naming both variables', (open, close) => {
      expect(() => loadConfigWithEnv({ SERVICE_OPEN_TIME: open, SERVICE_CLOSE_TIME: close }))
        .toThrow('Invalid SERVICE_OPEN_TIME: ' + open + ' with SERVICE_CLOSE_TIME: ' + close + '. '
          + 'Expected SERVICE_OPEN_TIME earlier than SERVICE_CLOSE_TIME.');
    });

    test.each(['', '   '])('keeps the default open time when SERVICE_OPEN_TIME is %j', (value) => {
      const config = loadConfigWithEnv({ SERVICE_OPEN_TIME: value, SERVICE_CLOSE_TIME: undefined });
      expect(config.serviceOpenTime).toBe('17:00');
      expect(config.serviceCloseTime).toBe('22:00');
    });

    test('keeps the default close time when SERVICE_CLOSE_TIME is empty', () => {
      const config = loadConfigWithEnv({ SERVICE_OPEN_TIME: undefined, SERVICE_CLOSE_TIME: '' });
      expect(config.serviceOpenTime).toBe('17:00');
      expect(config.serviceCloseTime).toBe('22:00');
    });

    test('accepts a valid window and trims a padded time', () => {
      const config = loadConfigWithEnv({ SERVICE_OPEN_TIME: ' 11:00 ', SERVICE_CLOSE_TIME: '23:30' });
      expect(config.serviceOpenTime).toBe('11:00');
      expect(config.serviceCloseTime).toBe('23:30');
    });
  });

  describe('CORS_ORIGIN', () => {
    test.each(['*', ' * '])('rejects the wildcard %j, naming CORS_ORIGIN', (value) => {
      expect(() => loadConfigWithEnv({ CORS_ORIGIN: value }))
        .toThrow("Invalid CORS_ORIGIN: '*'. Expected a single origin, not a wildcard.");
    });

    test.each(['', '   '])('keeps the default origin when CORS_ORIGIN is %j', (value) => {
      expect(loadConfigWithEnv({ CORS_ORIGIN: value }).corsOrigin).toBe('http://localhost:5173');
    });

    test('keeps a concrete configured origin', () => {
      expect(loadConfigWithEnv({ CORS_ORIGIN: 'https://burger.example' }).corsOrigin).toBe('https://burger.example');
    });
  });

  describe('Valid override set', () => {
    test('accepts every variable at a valid override and keeps the ten-key shape', () => {
      const config = loadConfigWithEnv({
        PORT: '3100',
        CORS_ORIGIN: 'http://localhost:4173',
        TOKEN_TTL_HOURS: '2',
        SERVICE_OPEN_TIME: '11:00',
        SERVICE_CLOSE_TIME: '23:30',
        MAX_PARTY_SIZE: '6',
        RESERVATION_HORIZON_DAYS: '14'
      });

      expect(Object.keys(config)).toEqual([
        'host', 'port', 'env', 'dbFile', 'corsOrigin', 'tokenTtlHours',
        'serviceOpenTime', 'serviceCloseTime', 'maxPartySize', 'reservationHorizonDays'
      ]);
      expect(config.port).toBe(3100);
      expect(config.corsOrigin).toBe('http://localhost:4173');
      expect(config.tokenTtlHours).toBe(2);
      expect(config.serviceOpenTime).toBe('11:00');
      expect(config.serviceCloseTime).toBe('23:30');
      expect(config.maxPartySize).toBe(6);
      expect(config.reservationHorizonDays).toBe(14);
    });
  });
});

