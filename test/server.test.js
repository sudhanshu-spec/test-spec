/**
 * Comprehensive Unit Test Suite for Server Module
 *
 * This test suite validates all production-ready features of server.js:
 * - Server startup functionality
 * - Graceful shutdown handlers (SIGTERM and SIGINT)
 * - Server error handling (EADDRINUSE, EACCES, EADDRNOTAVAIL)
 * - Configuration validation (port range, invalid values)
 * - Process-level error handlers (uncaughtException, unhandledRejection)
 *
 * @module test/server.test
 */

'use strict';

const assert = require('assert');
const { EventEmitter } = require('events');
const path = require('path');

// ---------------------------------------------------------------------------
// Test Configuration
// ---------------------------------------------------------------------------

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Store original process methods for restoration
const originalExit = process.exit;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Captured output for verification
let capturedLogs = [];
let capturedErrors = [];
let exitCode = null;

// ---------------------------------------------------------------------------
// Test Utilities
// ---------------------------------------------------------------------------

/**
 * Mock process.exit to capture exit code without exiting
 */
function mockProcessExit() {
  exitCode = null;
  process.exit = (code) => {
    exitCode = code;
    // Don't actually exit
  };
}

/**
 * Restore original process.exit
 */
function restoreProcessExit() {
  process.exit = originalExit;
}

/**
 * Mock console.log to capture output
 */
function mockConsoleLog() {
  capturedLogs = [];
  console.log = (...args) => {
    capturedLogs.push(args.join(' '));
  };
}

/**
 * Mock console.error to capture output
 */
function mockConsoleError() {
  capturedErrors = [];
  console.error = (...args) => {
    capturedErrors.push(args.join(' '));
  };
}

/**
 * Restore original console methods
 */
function restoreConsole() {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}

/**
 * Run a test and track results
 */
async function runTest(name, testFn) {
  try {
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    originalConsoleLog(`  ✓ ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
    originalConsoleLog(`  ✗ ${name}`);
    originalConsoleLog(`    Error: ${error.message}`);
  }
}

/**
 * Clear module cache to get fresh imports
 */
function clearModuleCache() {
  const serverPath = require.resolve('../server');
  const appPath = require.resolve('../src/app');
  const configPath = require.resolve('../src/config');
  
  delete require.cache[serverPath];
  delete require.cache[appPath];
  delete require.cache[configPath];
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

async function runTestSuite() {
  originalConsoleLog('');
  originalConsoleLog('Server Module Unit Tests');
  originalConsoleLog('========================');
  originalConsoleLog('');

  // -------------------------------------------------------------------------
  // Test 1: Server Startup Test
  // -------------------------------------------------------------------------
  await runTest('Server Startup Test - server starts and stores reference', async () => {
    mockProcessExit();
    mockConsoleLog();
    mockConsoleError();
    
    try {
      // Clear cache and require fresh module
      clearModuleCache();
      const serverModule = require('../server');
      
      // Verify all exports exist
      assert.strictEqual(typeof serverModule.startServer, 'function', 'startServer should be a function');
      assert.strictEqual(typeof serverModule.gracefulShutdown, 'function', 'gracefulShutdown should be a function');
      assert.strictEqual(typeof serverModule.validateConfig, 'function', 'validateConfig should be a function');
      assert.strictEqual(typeof serverModule.getServer, 'function', 'getServer should be a function');
      
      // Start the server
      const server = await serverModule.startServer();
      
      // Verify server is returned and stored
      assert.ok(server, 'Server should be returned');
      assert.strictEqual(serverModule.getServer(), server, 'getServer() should return the same server instance');
      
      // Verify server is listening
      const address = server.address();
      assert.ok(address, 'Server should have an address');
      assert.strictEqual(typeof address.port, 'number', 'Server should be bound to a port');
      
      // Check that startup message was logged
      const hasStartupLog = capturedLogs.some(log => log.includes('Server running at'));
      assert.ok(hasStartupLog, 'Startup message should be logged');
      
      // Clean up - close the server
      await new Promise((resolve) => {
        server.close(resolve);
      });
    } finally {
      restoreProcessExit();
      restoreConsole();
    }
  });

  // -------------------------------------------------------------------------
  // Test 2: SIGTERM Graceful Shutdown Test
  // -------------------------------------------------------------------------
  await runTest('SIGTERM Graceful Shutdown Test - handles SIGTERM signal', async () => {
    mockProcessExit();
    mockConsoleLog();
    mockConsoleError();
    
    try {
      clearModuleCache();
      const serverModule = require('../server');
      
      // Start the server first
      const server = await serverModule.startServer();
      capturedLogs = []; // Clear startup logs
      
      // Call gracefulShutdown with SIGTERM
      serverModule.gracefulShutdown('SIGTERM');
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify shutdown message was logged
      const hasSigtermLog = capturedLogs.some(log => log.includes('SIGTERM received'));
      assert.ok(hasSigtermLog, 'SIGTERM shutdown message should be logged');
      
      // Verify graceful shutdown message
      const hasShutdownLog = capturedLogs.some(log => 
        log.includes('graceful shutdown') || log.includes('Server closed')
      );
      assert.ok(hasShutdownLog, 'Graceful shutdown completion should be logged');
      
      // Verify exit was called with code 0
      assert.strictEqual(exitCode, 0, 'Should exit with code 0 on graceful shutdown');
    } finally {
      restoreProcessExit();
      restoreConsole();
    }
  });

  // -------------------------------------------------------------------------
  // Test 3: SIGINT Graceful Shutdown Test
  // -------------------------------------------------------------------------
  await runTest('SIGINT Graceful Shutdown Test - handles SIGINT signal (Ctrl+C)', async () => {
    mockProcessExit();
    mockConsoleLog();
    mockConsoleError();
    
    try {
      clearModuleCache();
      const serverModule = require('../server');
      
      // Start the server first
      const server = await serverModule.startServer();
      capturedLogs = []; // Clear startup logs
      
      // Call gracefulShutdown with SIGINT
      serverModule.gracefulShutdown('SIGINT');
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify shutdown message was logged
      const hasSigintLog = capturedLogs.some(log => log.includes('SIGINT received'));
      assert.ok(hasSigintLog, 'SIGINT shutdown message should be logged');
      
      // Verify exit was called with code 0
      assert.strictEqual(exitCode, 0, 'Should exit with code 0 on graceful shutdown');
    } finally {
      restoreProcessExit();
      restoreConsole();
    }
  });

  // -------------------------------------------------------------------------
  // Test 4: EADDRINUSE Error Handling Test
  // -------------------------------------------------------------------------
  await runTest('EADDRINUSE Error Handling Test - handles port already in use', async () => {
    mockProcessExit();
    mockConsoleLog();
    mockConsoleError();
    
    try {
      clearModuleCache();
      const serverModule = require('../server');
      
      // Start first server
      const server1 = await serverModule.startServer();
      const port = server1.address().port;
      
      // Clear cache and try to start another server on same port
      clearModuleCache();
      
      // Temporarily override config to use same port
      const config = require('../src/config');
      const originalPort = config.port;
      config.port = port;
      
      capturedErrors = [];
      exitCode = null;
      
      const serverModule2 = require('../server');
      
      try {
        await serverModule2.startServer();
      } catch (e) {
        // Expected to fail
      }
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify error message was logged
      const hasAddressInUseError = capturedErrors.some(err => 
        err.includes('already in use') || err.includes('EADDRINUSE')
      );
      assert.ok(hasAddressInUseError, 'Port in use error message should be logged');
      
      // Verify exit with code 1
      assert.strictEqual(exitCode, 1, 'Should exit with code 1 on EADDRINUSE');
      
      // Restore config and clean up
      config.port = originalPort;
      await new Promise(resolve => server1.close(resolve));
    } finally {
      restoreProcessExit();
      restoreConsole();
    }
  });

  // -------------------------------------------------------------------------
  // Test 5: EACCES Error Handling Test
  // -------------------------------------------------------------------------
  await runTest('EACCES Error Handling Test - handles permission denied', async () => {
    mockProcessExit();
    mockConsoleLog();
    mockConsoleError();
    
    try {
      // Create a mock error with EACCES code
      const error = new Error('listen EACCES: permission denied 0.0.0.0:80');
      error.code = 'EACCES';
      error.syscall = 'listen';
      
      clearModuleCache();
      
      // Load config first
      const config = require('../src/config');
      const originalPort = config.port;
      config.port = 80; // Privileged port
      
      // Create mock server that emits error
      const mockServer = new EventEmitter();
      mockServer.listen = function(port, host, cb) {
        process.nextTick(() => {
          this.emit('error', error);
        });
        return this;
      };
      mockServer.close = function(cb) {
        if (cb) cb();
      };
      mockServer.address = function() {
        return { port: 80, address: '0.0.0.0' };
      };
      
      // Mock app.listen
      const app = require('../src/app');
      const originalListen = app.listen;
      app.listen = mockServer.listen.bind(mockServer);
      
      capturedErrors = [];
      exitCode = null;
      
      const serverModule = require('../server');
      
      try {
        await serverModule.startServer();
      } catch (e) {
        // Expected to fail
      }
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify error message for permission denied
      const hasPermissionError = capturedErrors.some(err => 
        err.includes('Permission denied') || err.includes('EACCES')
      );
      assert.ok(hasPermissionError, 'Permission denied error message should be logged');
      
      // Verify exit with code 1
      assert.strictEqual(exitCode, 1, 'Should exit with code 1 on EACCES');
      
      // Restore
      app.listen = originalListen;
      config.port = originalPort;
    } finally {
      restoreProcessExit();
      restoreConsole();
    }
  });

  // -------------------------------------------------------------------------
  // Test 6: EADDRNOTAVAIL Error Handling Test
  // -------------------------------------------------------------------------
  await runTest('EADDRNOTAVAIL Error Handling Test - handles address not available', async () => {
    mockProcessExit();
    mockConsoleLog();
    mockConsoleError();
    
    try {
      // Create a mock error with EADDRNOTAVAIL code
      const error = new Error('listen EADDRNOTAVAIL: address not available 192.168.255.255:3000');
      error.code = 'EADDRNOTAVAIL';
      error.syscall = 'listen';
      
      clearModuleCache();
      
      // Load config first and set invalid host
      const config = require('../src/config');
      const originalHost = config.host;
      config.host = '192.168.255.255'; // Non-existent address
      
      // Create mock server that emits error
      const mockServer = new EventEmitter();
      mockServer.listen = function(port, host, cb) {
        process.nextTick(() => {
          this.emit('error', error);
        });
        return this;
      };
      mockServer.close = function(cb) {
        if (cb) cb();
      };
      mockServer.address = function() {
        return null;
      };
      
      // Mock app.listen
      const app = require('../src/app');
      const originalListen = app.listen;
      app.listen = mockServer.listen.bind(mockServer);
      
      capturedErrors = [];
      exitCode = null;
      
      const serverModule = require('../server');
      
      try {
        await serverModule.startServer();
      } catch (e) {
        // Expected to fail
      }
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify error message for address not available
      const hasAddrError = capturedErrors.some(err => 
        err.includes('not available') || err.includes('EADDRNOTAVAIL') || err.includes('Address')
      );
      assert.ok(hasAddrError, 'Address not available error message should be logged');
      
      // Verify exit with code 1
      assert.strictEqual(exitCode, 1, 'Should exit with code 1 on EADDRNOTAVAIL');
      
      // Restore
      app.listen = originalListen;
      config.host = originalHost;
    } finally {
      restoreProcessExit();
      restoreConsole();
    }
  });

  // -------------------------------------------------------------------------
  // Test 7: Port Range Validation Test
  // -------------------------------------------------------------------------
  await runTest('Port Range Validation Test - validates port in range 0-65535', async () => {
    mockProcessExit();
    mockConsoleLog();
    mockConsoleError();
    
    try {
      clearModuleCache();
      const config = require('../src/config');
      const serverModule = require('../server');
      
      // Store original values
      const originalPort = config.port;
      const originalHost = config.host;
      
      // Test valid ports
      const validPorts = [0, 1, 80, 443, 3000, 8080, 65535];
      for (const port of validPorts) {
        config.port = port;
        config.host = '127.0.0.1';
        const result = serverModule.validateConfig();
        assert.strictEqual(result.success, true, `Port ${port} should be valid`);
        assert.strictEqual(result.error, null, `Port ${port} should have no error`);
      }
      
      // Test invalid ports (out of range)
      const invalidPorts = [-1, -100, 65536, 99999, 100000];
      for (const port of invalidPorts) {
        config.port = port;
        config.host = '127.0.0.1';
        const result = serverModule.validateConfig();
        assert.strictEqual(result.success, false, `Port ${port} should be invalid`);
        assert.ok(result.error, `Port ${port} should have an error message`);
        assert.ok(result.error.includes('Invalid port'), `Error for port ${port} should mention invalid port`);
      }
      
      // Restore original values
      config.port = originalPort;
      config.host = originalHost;
    } finally {
      restoreProcessExit();
      restoreConsole();
    }
  });

  // -------------------------------------------------------------------------
  // Test 8: Invalid Port Value Test
  // -------------------------------------------------------------------------
  await runTest('Invalid Port Value Test - validates non-numeric and edge case ports', async () => {
    mockProcessExit();
    mockConsoleLog();
    mockConsoleError();
    
    try {
      clearModuleCache();
      const config = require('../src/config');
      const serverModule = require('../server');
      
      // Store original values
      const originalPort = config.port;
      const originalHost = config.host;
      
      // Test non-numeric port values
      const invalidValues = ['abc', 'three thousand', '', null, undefined, NaN, {}, [], true, false];
      for (const value of invalidValues) {
        config.port = value;
        config.host = '127.0.0.1';
        const result = serverModule.validateConfig();
        
        // All non-numeric values should fail validation
        // Note: null and undefined will be coerced, but NaN check should catch them
        if (typeof value !== 'number' || isNaN(value)) {
          assert.strictEqual(result.success, false, `Port value "${value}" (${typeof value}) should be invalid`);
          assert.ok(result.error, `Port value "${value}" should have an error message`);
        }
      }
      
      // Test empty host
      config.port = 3000;
      config.host = '';
      const emptyHostResult = serverModule.validateConfig();
      assert.strictEqual(emptyHostResult.success, false, 'Empty host should be invalid');
      assert.ok(emptyHostResult.error.includes('Invalid host'), 'Error should mention invalid host');
      
      // Test whitespace-only host
      config.host = '   ';
      const whitespaceHostResult = serverModule.validateConfig();
      assert.strictEqual(whitespaceHostResult.success, false, 'Whitespace-only host should be invalid');
      
      // Restore original values
      config.port = originalPort;
      config.host = originalHost;
    } finally {
      restoreProcessExit();
      restoreConsole();
    }
  });

  // -------------------------------------------------------------------------
  // Test 9: Process Error Handlers Test
  // -------------------------------------------------------------------------
  await runTest('Process Error Handlers Test - verifies uncaughtException and unhandledRejection handlers', async () => {
    mockProcessExit();
    mockConsoleLog();
    mockConsoleError();
    
    try {
      clearModuleCache();
      
      // Count listeners before requiring server module
      const uncaughtListenersBefore = process.listenerCount('uncaughtException');
      const rejectionListenersBefore = process.listenerCount('unhandledRejection');
      const sigtermListenersBefore = process.listenerCount('SIGTERM');
      const sigintListenersBefore = process.listenerCount('SIGINT');
      
      // Require the server module - this should register the handlers
      require('../server');
      
      // Count listeners after
      const uncaughtListenersAfter = process.listenerCount('uncaughtException');
      const rejectionListenersAfter = process.listenerCount('unhandledRejection');
      const sigtermListenersAfter = process.listenerCount('SIGTERM');
      const sigintListenersAfter = process.listenerCount('SIGINT');
      
      // Verify handlers are registered
      assert.ok(
        uncaughtListenersAfter > uncaughtListenersBefore,
        'uncaughtException handler should be registered'
      );
      assert.ok(
        rejectionListenersAfter > rejectionListenersBefore,
        'unhandledRejection handler should be registered'
      );
      assert.ok(
        sigtermListenersAfter > sigtermListenersBefore,
        'SIGTERM handler should be registered'
      );
      assert.ok(
        sigintListenersAfter > sigintListenersBefore,
        'SIGINT handler should be registered'
      );
      
      // Verify total count of process listeners
      assert.ok(
        uncaughtListenersAfter >= 1,
        'At least one uncaughtException listener should exist'
      );
      assert.ok(
        rejectionListenersAfter >= 1,
        'At least one unhandledRejection listener should exist'
      );
    } finally {
      restoreProcessExit();
      restoreConsole();
    }
  });

  // -------------------------------------------------------------------------
  // Test Results Summary
  // -------------------------------------------------------------------------
  originalConsoleLog('');
  originalConsoleLog('------------------------');
  originalConsoleLog(`Results: ${testResults.passed} passed, ${testResults.failed} failed`);
  originalConsoleLog('------------------------');
  originalConsoleLog('');

  // Exit with appropriate code
  if (testResults.failed > 0) {
    originalConsoleLog('Some tests failed. See details above.');
    process.exit(1);
  } else {
    originalConsoleLog('All tests passed!');
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Run Tests
// ---------------------------------------------------------------------------

runTestSuite().catch((error) => {
  originalConsoleLog('Test suite failed with error:');
  originalConsoleLog(error.stack || error.message || error);
  process.exit(1);
});
