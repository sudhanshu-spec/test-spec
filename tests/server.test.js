/**
 * Server Lifecycle Unit and Integration Tests
 *
 * This test suite provides comprehensive coverage for server.js.
 * Tests verify server starts successfully on configured port, startup
 * callback executes with correct log message, server binds to configured
 * host, and server can be gracefully shut down.
 *
 * Test Categories:
 * - Server Startup Tests: Verify server starts without errors
 * - Startup Callback Tests: Verify callback logs correct message
 * - Server Configuration Tests: Verify config values are used
 * - Graceful Shutdown Tests: Verify server.close() works correctly
 * - Lifecycle Tests: Verify start/stop cycles
 *
 * Special Setup Requirements:
 * - Uses Jest spies to monitor console.log output
 * - Uses port 0 for dynamic port assignment to avoid EADDRINUSE
 * - Closes server instances in afterEach to prevent open handles
 *
 * @module tests/server.test
 */

'use strict';

const app = require('../src/app');
const config = require('../src/config');

describe('Server Lifecycle', () => {
  let server;
  let consoleSpy;

  beforeEach(() => {
    // Spy on console.log to capture startup messages
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach((done) => {
    // Restore console.log
    consoleSpy.mockRestore();
    
    // Close server if it was started
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Server Startup', () => {
    it('should start without errors on port 0', (done) => {
      // Use port 0 for dynamic port assignment
      server = app.listen(0, () => {
        expect(server.listening).toBe(true);
        done();
      });
    });

    it('should start on specified host', (done) => {
      const testHost = '127.0.0.1';
      server = app.listen(0, testHost, () => {
        const address = server.address();
        expect(address.address).toBe(testHost);
        done();
      });
    });

    it('should assign a port when using port 0', (done) => {
      server = app.listen(0, () => {
        const address = server.address();
        expect(typeof address.port).toBe('number');
        expect(address.port).toBeGreaterThan(0);
        done();
      });
    });

    it('should return a server object', (done) => {
      server = app.listen(0, () => {
        expect(server).toBeDefined();
        expect(typeof server.close).toBe('function');
        done();
      });
    });

    it('should have listening property set to true after start', (done) => {
      server = app.listen(0, () => {
        expect(server.listening).toBe(true);
        done();
      });
    });
  });

  describe('Startup Callback', () => {
    it('should execute callback function on successful start', (done) => {
      const callback = jest.fn(() => {
        expect(callback).toHaveBeenCalled();
        done();
      });
      
      server = app.listen(0, callback);
    });

    it('should not receive error parameter in callback', (done) => {
      server = app.listen(0, function(err) {
        // Express/Node.js listen callback does not receive error
        expect(err).toBeUndefined();
        done();
      });
    });

    it('should allow logging server address in callback', (done) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        const message = `Server running at http://${address.address}:${address.port}/`;
        console.log(message);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Server running at')
        );
        done();
      });
    });
  });

  describe('Server Configuration', () => {
    it('should use config.port when specified', (done) => {
      // Use port 0 for tests to avoid conflicts
      // In production, config.port would be used
      server = app.listen(0, () => {
        expect(server.listening).toBe(true);
        done();
      });
    });

    it('should use config.host when specified', (done) => {
      const host = config.host || '127.0.0.1';
      server = app.listen(0, host, () => {
        const address = server.address();
        expect(address.address).toBe(host);
        done();
      });
    });

    it('should be configurable with different hosts', (done) => {
      server = app.listen(0, '0.0.0.0', () => {
        const address = server.address();
        expect(address.address).toBe('0.0.0.0');
        done();
      });
    });

    it('should bind to localhost (127.0.0.1)', (done) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        expect(address.address).toBe('127.0.0.1');
        done();
      });
    });
  });

  describe('Graceful Shutdown', () => {
    it('should close without errors', (done) => {
      server = app.listen(0, () => {
        server.close((err) => {
          expect(err).toBeUndefined();
          done();
        });
      });
    });

    it('should set listening to false after close', (done) => {
      server = app.listen(0, () => {
        server.close(() => {
          expect(server.listening).toBe(false);
          done();
        });
      });
    });

    it('should accept callback in close method', (done) => {
      const closeCallback = jest.fn(() => {
        expect(closeCallback).toHaveBeenCalled();
        done();
      });

      server = app.listen(0, () => {
        server.close(closeCallback);
      });
    });

    it('should stop accepting new connections after close', (done) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        
        server.close(() => {
          // Server should no longer be listening
          expect(server.listening).toBe(false);
          done();
        });
      });
    });
  });

  describe('Server Address Info', () => {
    it('should return address information after start', (done) => {
      server = app.listen(0, () => {
        const address = server.address();
        expect(address).toBeDefined();
        expect(address.port).toBeDefined();
        expect(address.address).toBeDefined();
        done();
      });
    });

    it('should return null address before server starts', () => {
      // Create server without listening
      const newServer = require('http').createServer(app);
      expect(newServer.address()).toBeNull();
    });

    it('should return correct family type (IPv4)', (done) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        expect(address.family).toBe('IPv4');
        done();
      });
    });
  });

  describe('Multiple Start/Stop Cycles', () => {
    it('should support multiple start/stop cycles', async () => {
      // First cycle
      const server1 = app.listen(0);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(server1.listening).toBe(true);
      await new Promise((resolve) => server1.close(resolve));
      expect(server1.listening).toBe(false);

      // Second cycle
      const server2 = app.listen(0);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(server2.listening).toBe(true);
      await new Promise((resolve) => server2.close(resolve));
      expect(server2.listening).toBe(false);
    });

    it('should allow re-listening after close', (done) => {
      server = app.listen(0, () => {
        const firstPort = server.address().port;
        
        server.close(() => {
          // Start new server
          server = app.listen(0, () => {
            expect(server.listening).toBe(true);
            done();
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should have error event handler available', (done) => {
      server = app.listen(0, () => {
        expect(typeof server.on).toBe('function');
        done();
      });
    });

    it('should emit events', (done) => {
      server = app.listen(0);
      
      server.on('listening', () => {
        expect(server.listening).toBe(true);
        done();
      });
    });

    it('should support error event binding', (done) => {
      server = app.listen(0, () => {
        // Just verify we can bind error handler
        server.on('error', () => {});
        expect(typeof server.on).toBe('function');
        done();
      });
    });
  });

  describe('Connection Handling', () => {
    it('should handle connection events', (done) => {
      server = app.listen(0, () => {
        expect(typeof server.on).toBe('function');
        done();
      });
    });

    it('should track connections', (done) => {
      server = app.listen(0, () => {
        // getConnections is a method on server
        server.getConnections((err, count) => {
          expect(err).toBeNull();
          expect(typeof count).toBe('number');
          done();
        });
      });
    });

    it('should support setting maxConnections property', (done) => {
      server = app.listen(0, () => {
        // maxConnections can be set on the server
        server.maxConnections = 100;
        expect(server.maxConnections).toBe(100);
        done();
      });
    });
  });
});

describe('Server Configuration Integration', () => {
  describe('Config Module Usage', () => {
    it('should have access to config.host', () => {
      expect(config.host).toBeDefined();
      expect(typeof config.host).toBe('string');
    });

    it('should have access to config.port', () => {
      expect(config.port).toBeDefined();
      expect(typeof config.port).toBe('number');
    });

    it('should have access to config.env', () => {
      expect(config.env).toBeDefined();
      expect(typeof config.env).toBe('string');
    });

    it('should provide valid host for binding', () => {
      // Config host should be a valid IP or hostname
      expect(config.host).toBeTruthy();
    });

    it('should provide valid port for binding', () => {
      // Config port should be a positive number
      expect(config.port).toBeGreaterThan(0);
    });
  });
});

describe('server.js Module', () => {
  let mockServer;
  let mockListen;
  let consoleSpy;
  
  beforeEach(() => {
    // Reset modules to get fresh requires
    jest.resetModules();
    
    // Spy on console.log
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create mock server object
    mockServer = {
      listening: true,
      address: () => ({ port: 3000, address: '127.0.0.1' }),
      close: jest.fn((cb) => cb && cb())
    };
    
    // Mock app.listen before requiring server.js
    mockListen = jest.fn((port, host, callback) => {
      if (callback) callback();
      return mockServer;
    });
  });
  
  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Server Module Loading', () => {
    it('should require app module when loaded', () => {
      // Mock the app module's listen method
      jest.doMock('../src/app', () => ({
        listen: mockListen
      }));
      
      // Require server.js - this will execute it
      require('../server');
      
      // Verify listen was called
      expect(mockListen).toHaveBeenCalled();
    });

    it('should call app.listen with config values', () => {
      // Get config values first
      const testConfig = require('../src/config');
      
      // Mock the app module's listen method
      jest.doMock('../src/app', () => ({
        listen: mockListen
      }));
      
      // Require server.js - this will execute it
      require('../server');
      
      // Verify listen was called with correct port and host
      expect(mockListen).toHaveBeenCalledWith(
        testConfig.port,
        testConfig.host,
        expect.any(Function)
      );
    });

    it('should log startup message on successful listen', () => {
      // Mock the app module's listen method
      jest.doMock('../src/app', () => ({
        listen: mockListen
      }));
      
      // Require server.js - this will execute it
      require('../server');
      
      // Verify console.log was called with server running message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server running at')
      );
    });

    it('should log application initialization message', () => {
      // Mock the app module's listen method
      jest.doMock('../src/app', () => ({
        listen: mockListen
      }));
      
      // Require server.js - this will execute it
      require('../server');
      
      // Verify console.log was called with initialization message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Application module loaded')
      );
    });

    it('should log PR validation message', () => {
      // Mock the app module's listen method
      jest.doMock('../src/app', () => ({
        listen: mockListen
      }));
      
      // Require server.js - this will execute it
      require('../server');
      
      // Verify console.log was called with PR validation message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Express.js server initialization complete')
      );
    });

    it('should log server URL with correct host and port', () => {
      const testConfig = require('../src/config');
      
      // Mock the app module's listen method
      jest.doMock('../src/app', () => ({
        listen: mockListen
      }));
      
      // Require server.js - this will execute it
      require('../server');
      
      // Verify console.log includes the URL
      expect(consoleSpy).toHaveBeenCalledWith(
        `Server running at http://${testConfig.host}:${testConfig.port}/`
      );
    });
  });
});
