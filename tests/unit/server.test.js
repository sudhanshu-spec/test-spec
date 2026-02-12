/**
 * Server Entry Point Unit Tests
 *
 * Tests for server.js — validates HTTP server startup behavior by mocking
 * app.listen() and console.log to prevent actual network binding during tests.
 *
 * Mocking strategy:
 *   - jest.mock('../../src/app')  → Replaces the Express app with a mock
 *     object containing a listen spy, preventing actual TCP port binding
 *   - jest.mock('../../src/config') → Returns predictable config values
 *     { host: '127.0.0.1', port: 3000, env: 'test' }
 *   - jest.spyOn(console, 'log') → Captures and suppresses startup message
 *
 * IMPORTANT: Requiring server.js is side-effectful — it immediately calls
 * app.listen(). Each test must use jest.resetModules() and require server.js
 * inside the test block to get fresh evaluation.
 *
 * @module tests/unit/server.test
 */

'use strict';

// =============================================================================
// Module-Level Mocks (must be declared before any require of server.js)
// =============================================================================

// Mock the Express app module to prevent actual network binding
jest.mock('../../src/app', () => {
  return {
    listen: jest.fn()
  };
});

// Mock the config module to provide predictable test values
jest.mock('../../src/config', () => {
  return {
    host: '127.0.0.1',
    port: 3000,
    env: 'test'
  };
});

describe('Server Entry Point', () => {
  /** @type {jest.SpyInstance} */
  let consoleSpy;

  beforeEach(() => {
    // Clear all mock call counts and instances between tests
    jest.clearAllMocks();
    // Reset module cache so server.js can be freshly required in each test
    jest.resetModules();
    // Suppress console.log output during tests and capture calls
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console.log behavior
    consoleSpy.mockRestore();
  });

  test('should call app.listen with configured port and host', () => {
    // Require server.js — this triggers the side-effectful app.listen() call
    require('../../server');

    // Retrieve the mocked app to inspect calls
    const app = require('../../src/app');

    // Verify app.listen was called exactly once
    expect(app.listen).toHaveBeenCalled();
    // Verify it received the correct port and host from config
    expect(app.listen).toHaveBeenCalledWith(
      3000,
      '127.0.0.1',
      expect.any(Function)
    );
  });

  test('should pass a callback function to app.listen', () => {
    // Require server.js to trigger the listen call
    require('../../server');

    const app = require('../../src/app');

    // The third argument to app.listen should be the startup callback
    const callArgs = app.listen.mock.calls[0];
    expect(typeof callArgs[2]).toBe('function');
  });

  test('should log startup message with correct URL when server starts', () => {
    // Require server.js to trigger the listen call
    require('../../server');

    const app = require('../../src/app');

    // Extract the callback function (third argument) passed to app.listen
    const callback = app.listen.mock.calls[0][2];

    // Invoke the callback to simulate the server becoming ready
    callback();

    // Verify console.log was called with the expected startup message
    expect(consoleSpy).toHaveBeenCalled();
    // The message should contain the server URL in the format http://host:port/
    expect(consoleSpy.mock.calls[0][0]).toContain(
      'Server running at http://127.0.0.1:3000/'
    );
  });
});
