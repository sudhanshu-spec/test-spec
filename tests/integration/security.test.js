/**
 * @fileoverview Security integration tests for the Express application
 * Tests HTTPS server configuration and security-related functionality
 * @module tests/integration/security
 */

'use strict';

describe('HTTPS Server Security', () => {
  let mockListen;
  let mockServer;
  let mockHttpsServer;
  let consoleSpy;
  let consoleWarnSpy;
  
  const DEFAULT_CONFIG = {
    host: '127.0.0.1',
    port: 3000,
    env: 'test',
    httpsEnabled: false,
    sslKeyPath: './certs/server.key',
    sslCertPath: './certs/server.cert',
    rateLimitWindowMs: 900000,
    rateLimitMax: 100,
    corsAllowedOrigins: '*'
  };

  function createMockServer(config = DEFAULT_CONFIG) {
    return {
      close: jest.fn((callback) => { if (callback) callback(); }),
      on: jest.fn(() => mockServer),
      address: jest.fn(() => ({ address: config.host, port: config.port }))
    };
  }

  function createMockListen(server, executeCallback = true) {
    return jest.fn((port, host, callback) => {
      if (executeCallback && typeof callback === 'function') {
        callback();
      }
      return server;
    });
  }

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockServer = createMockServer();
    mockListen = createMockListen(mockServer);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('HTTP Fallback', () => {
    test('should start HTTP server when httpsEnabled is false', () => {
      jest.doMock('../../src/app', () => ({ listen: mockListen }));
      jest.doMock('../../src/config', () => ({ ...DEFAULT_CONFIG, httpsEnabled: false }));

      require('../../server');

      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server running at http://')
      );
    });

    test('should fallback to HTTP when HTTPS enabled but certificates do not exist', () => {
      jest.doMock('../../src/app', () => ({ listen: mockListen }));
      jest.doMock('../../src/config', () => ({
        ...DEFAULT_CONFIG,
        httpsEnabled: true,
        sslKeyPath: './nonexistent/server.key',
        sslCertPath: './nonexistent/server.cert'
      }));
      
      jest.doMock('fs', () => ({
        readFileSync: jest.fn(() => {
          const error = new Error('ENOENT: no such file or directory');
          error.code = 'ENOENT';
          throw error;
        })
      }));

      require('../../server');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load SSL certificates'),
        expect.any(String)
      );
      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server running at http://')
      );
    });

    test('should not start HTTPS when sslKeyPath is missing', () => {
      jest.doMock('../../src/app', () => ({ listen: mockListen }));
      jest.doMock('../../src/config', () => ({
        ...DEFAULT_CONFIG,
        httpsEnabled: true,
        sslKeyPath: '',
        sslCertPath: './certs/server.cert'
      }));

      require('../../server');

      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server running at http://')
      );
    });

    test('should not start HTTPS when sslCertPath is missing', () => {
      jest.doMock('../../src/app', () => ({ listen: mockListen }));
      jest.doMock('../../src/config', () => ({
        ...DEFAULT_CONFIG,
        httpsEnabled: true,
        sslKeyPath: './certs/server.key',
        sslCertPath: ''
      }));

      require('../../server');

      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server running at http://')
      );
    });
  });

  describe('HTTPS Server', () => {
    test('should start HTTPS server when certificates are available', () => {
      mockHttpsServer = createMockServer();
      const mockHttpsListen = createMockListen(mockHttpsServer);
      
      const mockCreateServer = jest.fn(() => ({
        listen: mockHttpsListen
      }));

      jest.doMock('../../src/app', () => ({ listen: mockListen }));
      jest.doMock('../../src/config', () => ({
        ...DEFAULT_CONFIG,
        httpsEnabled: true,
        sslKeyPath: './valid/server.key',
        sslCertPath: './valid/server.cert'
      }));
      jest.doMock('https', () => ({
        createServer: mockCreateServer
      }));
      jest.doMock('fs', () => ({
        readFileSync: jest.fn((path) => {
          if (path.includes('key')) return 'mock-key-content';
          if (path.includes('cert')) return 'mock-cert-content';
          return '';
        })
      }));

      require('../../server');

      expect(mockCreateServer).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'mock-key-content',
          cert: 'mock-cert-content'
        }),
        expect.any(Object)
      );
      expect(mockHttpsListen).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTPS Server running at https://')
      );
      expect(mockListen).not.toHaveBeenCalled();
    });

    test('should use sslKeyPath and sslCertPath from config', () => {
      mockHttpsServer = createMockServer();
      const mockHttpsListen = createMockListen(mockHttpsServer);
      
      const readPaths = [];
      jest.doMock('fs', () => ({
        readFileSync: jest.fn((path) => {
          readPaths.push(path);
          return 'mock-content';
        })
      }));

      const customKeyPath = './custom/my.key';
      const customCertPath = './custom/my.cert';

      jest.doMock('../../src/config', () => ({
        ...DEFAULT_CONFIG,
        httpsEnabled: true,
        sslKeyPath: customKeyPath,
        sslCertPath: customCertPath
      }));
      jest.doMock('../../src/app', () => ({ listen: mockListen }));
      jest.doMock('https', () => ({
        createServer: jest.fn(() => ({ listen: mockHttpsListen }))
      }));

      require('../../server');

      expect(readPaths).toContain(customKeyPath);
      expect(readPaths).toContain(customCertPath);
    });

    test('should log correct host and port for HTTPS server', () => {
      mockHttpsServer = createMockServer();
      const mockHttpsListen = createMockListen(mockHttpsServer);

      const customConfig = {
        ...DEFAULT_CONFIG,
        host: '0.0.0.0',
        port: 443,
        httpsEnabled: true,
        sslKeyPath: './certs/server.key',
        sslCertPath: './certs/server.cert'
      };

      jest.doMock('../../src/app', () => ({ listen: mockListen }));
      jest.doMock('../../src/config', () => customConfig);
      jest.doMock('https', () => ({
        createServer: jest.fn(() => ({ listen: mockHttpsListen }))
      }));
      jest.doMock('fs', () => ({
        readFileSync: jest.fn(() => 'mock-cert-content')
      }));

      require('../../server');

      expect(consoleSpy).toHaveBeenCalledWith('HTTPS Server running at https://0.0.0.0:443/');
    });
  });
});
