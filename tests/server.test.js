'use strict';

// ---------------------------------------------------------------------------
// server.js — Server Robustness Test Suite
//
// Tests for the refactored server.js entry point covering:
// - Server startup and listen callback verification
// - Graceful shutdown on SIGTERM and SIGINT signals
// - Idempotent shutdown guard preventing duplicate shutdown sequences
// - Force-kill shutdown timeout with .unref() safety net
// - Process-level error handlers (uncaughtException, unhandledRejection)
// - Server binding error handling (EADDRINUSE, EACCES, unknown)
//
// Mocking Strategy:
// -----------------
// server.js is a side-effect module — requiring it immediately starts the
// server and registers process handlers. Tests use jest.resetModules() and
// jest.doMock() to get a fresh module evaluation per test, with captured
// handlers invoked directly to verify behavior in isolation.
// ---------------------------------------------------------------------------

describe('server.js', () => {
  // -------------------------------------------------------------------------
  // Save original globals that will be mocked during tests
  // -------------------------------------------------------------------------
  const realSetTimeout = global.setTimeout;
  const originalProcessOn = process.on.bind(process);

  // -------------------------------------------------------------------------
  // Shared mock references and handler capture maps
  // -------------------------------------------------------------------------

  /** @type {{ close: jest.Mock, on: jest.Mock }} */
  let mockServer;

  /** @type {jest.Mock} */
  let mockListen;

  /** @type {Record<string, Function>} */
  let processHandlers;

  /** @type {Record<string, Function>} */
  let serverOnHandlers;

  /** @type {jest.Mock} */
  let setTimeoutMock;

  /** @type {jest.Mock} */
  let mockUnref;

  // -------------------------------------------------------------------------
  // Test Lifecycle — Fresh mocks and module isolation for every test
  // -------------------------------------------------------------------------
  beforeEach(() => {
    // Clear the module registry so each test evaluates a fresh server.js
    jest.resetModules();

    // Initialize handler capture maps
    processHandlers = {};
    serverOnHandlers = {};

    // Create mock http.Server object (returned by app.listen())
    mockServer = {
      close: jest.fn(),
      on: jest.fn((event, handler) => {
        serverOnHandlers[event] = handler;
      })
    };

    // Create mock Express app whose listen() returns the mock server
    mockListen = jest.fn().mockReturnValue(mockServer);

    // Register module mocks using jest.doMock (not hoisted, works with resetModules)
    jest.doMock('../src/app', () => ({
      listen: mockListen
    }));

    jest.doMock('../src/config', () => ({
      host: '127.0.0.1',
      port: 3000,
      env: 'test',
      shutdownTimeout: 5000,
      requestTimeout: 30000
    }));

    // Intercept process.on to capture signal/error handlers WITHOUT
    // actually registering them on the real Node.js process object.
    // Only test-relevant events are intercepted; all others (Jest internals)
    // pass through to the original process.on.
    jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      const capturedEvents = [
        'uncaughtException',
        'unhandledRejection',
        'SIGTERM',
        'SIGINT'
      ];
      if (capturedEvents.includes(event)) {
        processHandlers[event] = handler;
        return process;
      }
      return originalProcessOn(event, handler);
    });

    // Mock process.exit to prevent the test runner from actually terminating
    jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Suppress console output during tests while enabling call assertions
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock global setTimeout for force-kill timeout verification.
    // Returns a mock timer object with an unref() method.
    mockUnref = jest.fn();
    setTimeoutMock = jest.fn().mockReturnValue({ unref: mockUnref });
    global.setTimeout = setTimeoutMock;
  });

  afterEach(() => {
    // Restore all Jest spies (process.on, process.exit, console.log, console.error)
    jest.restoreAllMocks();

    // Restore the real global setTimeout
    global.setTimeout = realSetTimeout;
  });

  // -------------------------------------------------------------------------
  // Helper: load server.js to trigger all side effects (module evaluation)
  // -------------------------------------------------------------------------
  function loadServer() {
    require('../server');
  }

  // =========================================================================
  // Test Suite 1: Server Startup
  // =========================================================================
  describe('Server Startup', () => {
    test('calls app.listen with the configured port, host, and a callback function', () => {
      loadServer();

      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(mockListen).toHaveBeenCalledWith(
        3000,
        '127.0.0.1',
        expect.any(Function)
      );
    });

    test('startup callback logs the correct server address', () => {
      loadServer();

      // Extract the listen callback (third argument to app.listen)
      const listenCallback = mockListen.mock.calls[0][2];
      listenCallback();

      expect(console.log).toHaveBeenCalledWith(
        'Server running at http://127.0.0.1:3000/'
      );
    });

    test('logs application initialization message on module load', () => {
      loadServer();

      expect(console.log).toHaveBeenCalledWith(
        'Application module loaded successfully'
      );
    });

    test('registers an error handler on the server instance for binding errors', () => {
      loadServer();

      expect(mockServer.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(serverOnHandlers.error).toBeDefined();
    });

    test('registers all four required process event handlers', () => {
      loadServer();

      expect(processHandlers.uncaughtException).toEqual(expect.any(Function));
      expect(processHandlers.unhandledRejection).toEqual(expect.any(Function));
      expect(processHandlers.SIGTERM).toEqual(expect.any(Function));
      expect(processHandlers.SIGINT).toEqual(expect.any(Function));
    });
  });

  // =========================================================================
  // Test Suite 2: Graceful Shutdown — Signal Handling
  // =========================================================================
  describe('Graceful Shutdown — Signal Handling', () => {
    test('SIGTERM triggers graceful shutdown and calls server.close', () => {
      loadServer();

      processHandlers.SIGTERM();

      expect(console.log).toHaveBeenCalledWith(
        'SIGTERM received. Shutting down gracefully...'
      );
      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(mockServer.close).toHaveBeenCalledWith(expect.any(Function));
    });

    test('SIGINT triggers graceful shutdown and calls server.close', () => {
      loadServer();

      processHandlers.SIGINT();

      expect(console.log).toHaveBeenCalledWith(
        'SIGINT received. Shutting down gracefully...'
      );
      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(mockServer.close).toHaveBeenCalledWith(expect.any(Function));
    });

    test('successful server.close invokes process.exit with code 0', () => {
      // Configure server.close to invoke its callback immediately (simulates
      // all in-flight connections draining successfully)
      mockServer.close.mockImplementation((cb) => {
        if (cb) cb();
      });

      loadServer();
      processHandlers.SIGTERM();

      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('logs shutdown completion message when server closes successfully', () => {
      mockServer.close.mockImplementation((cb) => {
        if (cb) cb();
      });

      loadServer();
      processHandlers.SIGTERM();

      expect(console.log).toHaveBeenCalledWith('Server closed. Exiting...');
    });
  });

  // =========================================================================
  // Test Suite 3: Idempotent Shutdown Guard
  // =========================================================================
  describe('Idempotent Shutdown Guard', () => {
    test('multiple SIGTERM signals only trigger server.close once', () => {
      loadServer();

      processHandlers.SIGTERM();
      processHandlers.SIGTERM();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    test('SIGINT after SIGTERM does not trigger a second shutdown', () => {
      loadServer();

      processHandlers.SIGTERM();
      processHandlers.SIGINT();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    test('SIGTERM after SIGINT does not trigger a second shutdown', () => {
      loadServer();

      processHandlers.SIGINT();
      processHandlers.SIGTERM();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    test('setTimeout is called only once across multiple shutdown attempts', () => {
      loadServer();

      processHandlers.SIGTERM();
      processHandlers.SIGINT();

      expect(setTimeoutMock).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Test Suite 4: Shutdown Timeout (Force-Kill)
  // =========================================================================
  describe('Shutdown Timeout (Force-Kill)', () => {
    test('sets a force-kill timeout with config.shutdownTimeout delay', () => {
      loadServer();

      processHandlers.SIGTERM();

      expect(setTimeoutMock).toHaveBeenCalledTimes(1);
      expect(setTimeoutMock).toHaveBeenCalledWith(
        expect.any(Function),
        5000
      );
    });

    test('calls .unref() on the force-kill timer to prevent keeping event loop alive', () => {
      loadServer();

      processHandlers.SIGTERM();

      expect(mockUnref).toHaveBeenCalledTimes(1);
    });

    test('force-kill timeout callback calls process.exit with code 1', () => {
      loadServer();

      processHandlers.SIGTERM();

      // Extract the setTimeout callback (first argument) and invoke it
      const timeoutCallback = setTimeoutMock.mock.calls[0][0];
      timeoutCallback();

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('force-kill timeout callback logs a forcing-shutdown message', () => {
      loadServer();

      processHandlers.SIGTERM();

      // Extract and invoke the setTimeout callback
      const timeoutCallback = setTimeoutMock.mock.calls[0][0];
      timeoutCallback();

      expect(console.error).toHaveBeenCalledWith(
        'Forcing shutdown due to timeout'
      );
    });

    test('force-kill timeout uses the exact shutdownTimeout value from config', () => {
      loadServer();

      processHandlers.SIGTERM();

      const delay = setTimeoutMock.mock.calls[0][1];
      expect(delay).toBe(5000);
    });
  });

  // =========================================================================
  // Test Suite 5: Process Error Handlers
  // =========================================================================
  describe('Process Error Handlers', () => {
    test('uncaughtException handler logs the error with descriptive prefix', () => {
      loadServer();

      const testError = new Error('test uncaught exception');
      processHandlers.uncaughtException(testError);

      expect(console.error).toHaveBeenCalledWith(
        'Uncaught Exception:',
        testError
      );
    });

    test('uncaughtException handler triggers graceful shutdown', () => {
      loadServer();

      const testError = new Error('test uncaught exception');
      processHandlers.uncaughtException(testError);

      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(mockServer.close).toHaveBeenCalledWith(expect.any(Function));
    });

    test('unhandledRejection handler logs the reason with descriptive prefix', () => {
      loadServer();

      const testReason = new Error('test unhandled rejection');
      processHandlers.unhandledRejection(testReason);

      expect(console.error).toHaveBeenCalledWith(
        'Unhandled Rejection:',
        testReason
      );
    });

    test('unhandledRejection handler triggers graceful shutdown', () => {
      loadServer();

      const testReason = new Error('test unhandled rejection');
      processHandlers.unhandledRejection(testReason);

      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(mockServer.close).toHaveBeenCalledWith(expect.any(Function));
    });

    test('unhandledRejection handler works with non-Error string reason', () => {
      loadServer();

      const stringReason = 'string rejection reason';
      processHandlers.unhandledRejection(stringReason);

      expect(console.error).toHaveBeenCalledWith(
        'Unhandled Rejection:',
        stringReason
      );
      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Test Suite 6: Server Binding Error Handling
  // =========================================================================
  describe('Server Binding Error Handling', () => {
    test('EADDRINUSE error logs port-in-use message and exits with code 1', () => {
      loadServer();

      const bindError = new Error('listen EADDRINUSE: address already in use');
      bindError.code = 'EADDRINUSE';
      serverOnHandlers.error(bindError);

      expect(console.error).toHaveBeenCalledWith(
        'Port 3000 is already in use'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('EACCES error logs elevated-privileges message and exits with code 1', () => {
      loadServer();

      const bindError = new Error('listen EACCES: permission denied');
      bindError.code = 'EACCES';
      serverOnHandlers.error(bindError);

      expect(console.error).toHaveBeenCalledWith(
        'Port 3000 requires elevated privileges'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('unknown server error logs the error details and exits with code 1', () => {
      loadServer();

      const unknownError = new Error('some unknown server error');
      unknownError.code = 'UNKNOWN';
      serverOnHandlers.error(unknownError);

      expect(console.error).toHaveBeenCalledWith(
        'Server error:',
        unknownError
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('binding error handler always calls process.exit(1) regardless of error code', () => {
      loadServer();

      const genericError = new Error('generic');
      genericError.code = 'ECONNREFUSED';
      serverOnHandlers.error(genericError);

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
