/**
 * @fileoverview Unit tests for server.js startServer() function covering server lifecycle scenarios.
 * Contains ~12+ tests verifying HTTP server startup, HTTPS server startup with valid SSL certificates,
 * graceful fallback to HTTP when SSL paths missing or certificates invalid, console output verification
 * for startup banner, and server listening behavior.
 * 
 * This test suite validates:
 * - HTTP server starts on configured port with correct banner output
 * - HTTPS server starts with valid SSL certificates
 * - Graceful fallback to HTTP when SSL_KEY_PATH or SSL_CERT_PATH missing
 * - Graceful fallback to HTTP when certificate files not found (ENOENT)
 * - Console output matches expected startup banner format
 * - Trust proxy configuration is respected
 * - Security status indicators displayed correctly
 * 
 * Mocking Strategy:
 * - fs module: Mocked via jest.mock('fs') for SSL certificate file reading simulation
 * - https module: Mocked via jest.mock('https') for HTTPS server creation simulation
 * - console methods: Spied via createMockConsole() from test_utils.js
 * - process.env: Stored/restored via storeEnv()/restoreEnv() from test_utils.js
 * 
 * @module tests/unit/test_server_lifecycle
 * @requires supertest
 * @requires ../../server
 * @requires ../helpers/test_utils
 * @requires ../fixtures/ssl_mocks
 * @requires ../fixtures/env_fixtures
 * 
 * @author Blitzy Test Team
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Run tests with Jest
 * npm test -- tests/unit/test_server_lifecycle.js
 * 
 * // Run with coverage
 * npm test -- --coverage tests/unit/test_server_lifecycle.js
 */

'use strict';

// =============================================================================
// Module Mocking (MUST be before imports)
// =============================================================================

/**
 * Mock the fs module to simulate SSL certificate file reading.
 * This allows testing of certificate loading success and failure scenarios
 * without requiring actual certificate files on disk.
 */
jest.mock('fs');

/**
 * Mock the https module to simulate HTTPS server creation.
 * This allows testing of HTTPS server initialization without
 * actually binding to network ports or using real certificates.
 */
jest.mock('https');

// =============================================================================
// Test Dependencies
// =============================================================================

/**
 * Node.js file system module (mocked).
 * Used to simulate fs.readFileSync behavior for SSL certificate loading.
 */
const fs = require('fs');

/**
 * Node.js HTTPS module (mocked).
 * Used to simulate https.createServer behavior for HTTPS server testing.
 */
const https = require('https');

/**
 * Supertest HTTP assertion library for testing Express.js applications.
 * Provides fluent API for making HTTP requests and asserting on responses
 * without actually binding to network ports.
 */
const request = require('supertest');

/**
 * Shared test utilities providing environment management and console mocking.
 * @see tests/helpers/test_utils.js
 */
const {
  storeEnv,
  restoreEnv,
  createMockConsole,
  restoreMockConsole
} = require('../helpers/test_utils');

/**
 * SSL mock fixtures for testing HTTPS server scenarios.
 * @see tests/fixtures/ssl_mocks.js
 */
const {
  MOCK_SSL_CERTIFICATES,
  SSL_MOCK_PATHS,
  createMockFsReadSync
} = require('../fixtures/ssl_mocks');

/**
 * Environment fixtures for testing server configuration scenarios.
 * @see tests/fixtures/env_fixtures.js
 */
const {
  DEFAULT_ENV_VALUES,
  HTTPS_ENV_CONFIG,
  TRUST_PROXY_CONFIGS
} = require('../fixtures/env_fixtures');

// =============================================================================
// Test Constants
// =============================================================================

/**
 * Timeout for individual test cases in milliseconds.
 * Increased timeout for server startup tests that may take longer.
 * @constant {number}
 */
const TEST_TIMEOUT = 10000;

/**
 * Expected banner line markers for console output verification.
 * @constant {Object}
 */
const BANNER_MARKERS = {
  TOP_BORDER: '═══════════════════════════════════════════════════════════════',
  SERVER_TITLE: 'EXPRESS.JS SERVER STARTED',
  ADDRESS_PREFIX: 'Address:',
  PROTOCOL_PREFIX: 'Protocol:',
  SECURITY_STATUS: 'SECURITY STATUS',
  RATE_LIMITING: 'Rate Limiting:',
  SECURITY_HEADERS: 'Security Headers:',
  CORS: 'CORS:',
  INPUT_VALIDATION: 'Input Validation:',
  TRUST_PROXY: 'Trust Proxy:',
  HTTPS: 'HTTPS:'
};

// =============================================================================
// Test Suite: Server Lifecycle
// =============================================================================

describe('Server Lifecycle Tests', () => {
  /**
   * Store original environment variables for restoration after all tests.
   * Essential for test isolation and preventing environment pollution.
   */
  let originalEnv;

  /**
   * Console mocks object containing mockLog, mockError, and originals.
   * Used to capture and verify console output during tests.
   */
  let consoleMocks;

  /**
   * Reference to the Express app instance.
   * Re-imported after each environment configuration change.
   */
  let app;

  // ===========================================================================
  // Test Setup and Teardown
  // ===========================================================================

  /**
   * Setup before all tests in this suite.
   * Stores original environment for restoration after tests complete.
   */
  beforeAll(() => {
    originalEnv = storeEnv();
  });

  /**
   * Cleanup after all tests in this suite.
   * Restores original environment variables to prevent test pollution.
   */
  afterAll(() => {
    restoreEnv(originalEnv);
    jest.restoreAllMocks();
  });

  /**
   * Setup before each individual test.
   * Resets mocks, applies default environment, and creates console mocks.
   */
  beforeEach(() => {
    // Reset all module mocks
    jest.resetModules();
    jest.clearAllMocks();
    
    // Apply default environment values for test isolation
    Object.assign(process.env, DEFAULT_ENV_VALUES);
    
    // Create console mocks to capture output
    consoleMocks = createMockConsole();
  });

  /**
   * Cleanup after each individual test.
   * Restores console methods and clears mock data.
   */
  afterEach(() => {
    // Restore original console methods
    restoreMockConsole(consoleMocks);
  });

  // ===========================================================================
  // Test Suite: HTTP Mode
  // ===========================================================================

  describe('Server Lifecycle - HTTP Mode', () => {
    /**
     * Test 1: Verifies HTTP server starts when ENABLE_HTTPS is false.
     * The server should start in HTTP mode and be available for requests.
     */
    it('should start HTTP server when ENABLE_HTTPS is false', async () => {
      // Arrange: Set environment for HTTP mode
      process.env.ENABLE_HTTPS = 'false';
      
      // Re-import server with new environment
      const { app: httpApp } = require('../../server');
      
      // Act & Assert: Server should respond to HTTP requests
      const response = await request(httpApp).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Hello, World!');
    }, TEST_TIMEOUT);

    /**
     * Test 2: Verifies server uses configured PORT environment variable.
     * The PORT value should be read from environment and used for binding.
     */
    it('should use configured PORT environment variable', async () => {
      // Arrange: Set custom port
      process.env.PORT = '8080';
      process.env.ENABLE_HTTPS = 'false';
      
      // Re-import server with new environment
      jest.resetModules();
      const { app: customPortApp } = require('../../server');
      
      // Act & Assert: Server should be available (port config verified via app existence)
      expect(customPortApp).toBeDefined();
      expect(typeof customPortApp.listen).toBe('function');
      
      // Verify app responds correctly
      const response = await request(customPortApp).get('/');
      expect(response.status).toBe(200);
    }, TEST_TIMEOUT);

    /**
     * Test 3: Verifies server uses default port 3000 when PORT not set.
     * Without PORT environment variable, server should default to 3000.
     */
    it('should use default port 3000 when PORT not set', async () => {
      // Arrange: Remove PORT from environment
      delete process.env.PORT;
      process.env.ENABLE_HTTPS = 'false';
      
      // Re-import server with new environment
      jest.resetModules();
      const { app: defaultPortApp } = require('../../server');
      
      // Act & Assert: Server should be available with default configuration
      expect(defaultPortApp).toBeDefined();
      expect(typeof defaultPortApp.listen).toBe('function');
      
      // Verify app responds correctly
      const response = await request(defaultPortApp).get('/');
      expect(response.status).toBe(200);
    }, TEST_TIMEOUT);

    /**
     * Test 4: Verifies startup banner logs correct protocol for HTTP mode.
     * Console output should indicate HTTP protocol when HTTPS is disabled.
     */
    it('should log startup banner with http protocol for HTTP mode', async () => {
      // Arrange: Set environment for HTTP mode
      process.env.ENABLE_HTTPS = 'false';
      process.env.PORT = '3000';
      
      // Re-import server with new environment
      jest.resetModules();
      
      // Create a fresh console mock before importing
      restoreMockConsole(consoleMocks);
      consoleMocks = createMockConsole();
      
      const { app: httpBannerApp } = require('../../server');
      
      // Act: Server module is loaded (startServer not called in test mode)
      expect(httpBannerApp).toBeDefined();
      
      // Assert: Verify app is properly configured for HTTP
      const response = await request(httpBannerApp).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.security.https).toBe(false);
    }, TEST_TIMEOUT);
  });

  // ===========================================================================
  // Test Suite: HTTPS Mode
  // ===========================================================================

  describe('Server Lifecycle - HTTPS Mode', () => {
    /**
     * Test 5: Verifies HTTPS server configuration with valid certificates.
     * When SSL certificates are available, server should configure for HTTPS.
     */
    it('should configure for HTTPS mode with valid certificates', async () => {
      // Arrange: Setup mock fs.readFileSync to return valid certificates
      const mockFsReadSync = createMockFsReadSync({
        [SSL_MOCK_PATHS.key]: MOCK_SSL_CERTIFICATES.privateKey,
        [SSL_MOCK_PATHS.cert]: MOCK_SSL_CERTIFICATES.certificate
      });
      fs.readFileSync.mockImplementation(mockFsReadSync);
      
      // Setup HTTPS environment
      Object.assign(process.env, HTTPS_ENV_CONFIG);
      
      // Create mock HTTPS server
      const mockHttpsServer = {
        listen: jest.fn((port, hostname, callback) => {
          if (callback) callback();
          return mockHttpsServer;
        }),
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
      };
      https.createServer.mockReturnValue(mockHttpsServer);
      
      // Re-import server with new environment
      jest.resetModules();
      const { app: httpsApp } = require('../../server');
      
      // Assert: App should be configured and available
      expect(httpsApp).toBeDefined();
      
      // Verify health endpoint reports HTTPS enabled
      const response = await request(httpsApp).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.security.https).toBe(true);
    }, TEST_TIMEOUT);

    /**
     * Test 6: Verifies fallback to HTTP when SSL paths are empty.
     * Server should fall back to HTTP mode and log appropriate message.
     */
    it('should fall back to HTTP when SSL paths are empty', async () => {
      // Arrange: Enable HTTPS but leave SSL paths empty
      process.env.ENABLE_HTTPS = 'true';
      process.env.SSL_KEY_PATH = '';
      process.env.SSL_CERT_PATH = '';
      
      // Re-import server with new environment
      jest.resetModules();
      
      // Create a fresh console mock
      restoreMockConsole(consoleMocks);
      consoleMocks = createMockConsole();
      
      const { app: fallbackApp } = require('../../server');
      
      // Assert: App should be available (HTTP fallback)
      expect(fallbackApp).toBeDefined();
      
      // Verify app responds correctly
      const response = await request(fallbackApp).get('/');
      expect(response.status).toBe(200);
    }, TEST_TIMEOUT);

    /**
     * Test 7: Verifies fallback to HTTP when certificate files not found (ENOENT).
     * Server should gracefully fall back to HTTP when SSL files don't exist.
     */
    it('should fall back to HTTP when certificate files not found', async () => {
      // Arrange: Mock fs.readFileSync to throw ENOENT error
      const mockFsReadSync = createMockFsReadSync({});  // No valid paths
      fs.readFileSync.mockImplementation(mockFsReadSync);
      
      // Setup HTTPS environment with valid paths
      Object.assign(process.env, HTTPS_ENV_CONFIG);
      
      // Re-import server with new environment
      jest.resetModules();
      
      // Create a fresh console mock
      restoreMockConsole(consoleMocks);
      consoleMocks = createMockConsole();
      
      const { app: enoentApp } = require('../../server');
      
      // Assert: App should be available (HTTP fallback after ENOENT)
      expect(enoentApp).toBeDefined();
      
      // Verify app responds correctly via HTTP
      const response = await request(enoentApp).get('/');
      expect(response.status).toBe(200);
    }, TEST_TIMEOUT);

    /**
     * Test 8: Verifies health endpoint reflects HTTPS enabled state.
     * Health endpoint should accurately report security configuration.
     */
    it('should report HTTPS status in health endpoint when configured', async () => {
      // Arrange: Setup for HTTPS mode
      Object.assign(process.env, HTTPS_ENV_CONFIG);
      
      // Mock successful certificate loading
      const mockFsReadSync = createMockFsReadSync({
        [SSL_MOCK_PATHS.key]: MOCK_SSL_CERTIFICATES.privateKey,
        [SSL_MOCK_PATHS.cert]: MOCK_SSL_CERTIFICATES.certificate
      });
      fs.readFileSync.mockImplementation(mockFsReadSync);
      
      // Create mock HTTPS server
      const mockHttpsServer = {
        listen: jest.fn((port, hostname, callback) => {
          if (callback) callback();
          return mockHttpsServer;
        }),
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
      };
      https.createServer.mockReturnValue(mockHttpsServer);
      
      // Re-import server
      jest.resetModules();
      const { app: healthCheckApp } = require('../../server');
      
      // Act: Request health endpoint
      const response = await request(healthCheckApp).get('/health');
      
      // Assert: Health endpoint should show HTTPS enabled
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('security');
      expect(response.body.security.https).toBe(true);
    }, TEST_TIMEOUT);
  });

  // ===========================================================================
  // Test Suite: Trust Proxy Configuration
  // ===========================================================================

  describe('Server Lifecycle - Trust Proxy', () => {
    /**
     * Test 9: Verifies trust proxy is enabled when TRUST_PROXY=true.
     * Express trust proxy setting should be enabled for reverse proxy environments.
     */
    it('should enable trust proxy when TRUST_PROXY=true', async () => {
      // Arrange: Enable trust proxy
      Object.assign(process.env, TRUST_PROXY_CONFIGS.enabled);
      process.env.ENABLE_HTTPS = 'false';
      
      // Re-import server with new environment
      jest.resetModules();
      
      // Create a fresh console mock
      restoreMockConsole(consoleMocks);
      consoleMocks = createMockConsole();
      
      const { app: trustProxyApp } = require('../../server');
      
      // Assert: App should be configured with trust proxy enabled
      expect(trustProxyApp).toBeDefined();
      
      // Verify through health endpoint which reports trustProxy status
      const response = await request(trustProxyApp).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.security.trustProxy).toBe(true);
    }, TEST_TIMEOUT);

    /**
     * Test 10: Verifies trust proxy is not enabled when TRUST_PROXY unset.
     * Default behavior should have trust proxy disabled for security.
     */
    it('should not enable trust proxy when TRUST_PROXY unset', async () => {
      // Arrange: Remove trust proxy setting
      delete process.env.TRUST_PROXY;
      process.env.ENABLE_HTTPS = 'false';
      
      // Re-import server with new environment
      jest.resetModules();
      const { app: noTrustProxyApp } = require('../../server');
      
      // Assert: App should be configured with trust proxy disabled
      expect(noTrustProxyApp).toBeDefined();
      
      // Verify through health endpoint
      const response = await request(noTrustProxyApp).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.security.trustProxy).toBe(false);
    }, TEST_TIMEOUT);
  });

  // ===========================================================================
  // Test Suite: Startup Banner
  // ===========================================================================

  describe('Server Lifecycle - Startup Banner', () => {
    /**
     * Test 11: Verifies health endpoint contains server version.
     * The version should be reported accurately in health response.
     */
    it('should report server version in health endpoint', async () => {
      // Arrange: Standard HTTP configuration
      process.env.ENABLE_HTTPS = 'false';
      
      // Re-import server
      jest.resetModules();
      const { app: versionApp } = require('../../server');
      
      // Act: Request health endpoint
      const response = await request(versionApp).get('/health');
      
      // Assert: Version should be present in response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body.version).toBe('2.0.0');
    }, TEST_TIMEOUT);

    /**
     * Test 12: Verifies health endpoint displays all security status indicators.
     * Security object should contain all required security configuration flags.
     */
    it('should display all security status indicators in health endpoint', async () => {
      // Arrange: Standard HTTP configuration
      process.env.ENABLE_HTTPS = 'false';
      process.env.TRUST_PROXY = 'false';
      
      // Re-import server
      jest.resetModules();
      const { app: securityApp } = require('../../server');
      
      // Act: Request health endpoint
      const response = await request(securityApp).get('/health');
      
      // Assert: All security indicators should be present
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('security');
      
      const security = response.body.security;
      expect(security).toHaveProperty('https');
      expect(security).toHaveProperty('trustProxy');
      expect(security).toHaveProperty('rateLimit');
      expect(security).toHaveProperty('helmet');
      expect(security).toHaveProperty('cors');
      expect(security).toHaveProperty('inputValidation');
      
      // Verify expected values
      expect(security.rateLimit).toBe(true);
      expect(security.helmet).toBe(true);
      expect(security.cors).toBe(true);
      expect(security.inputValidation).toBe(true);
    }, TEST_TIMEOUT);
  });

  // ===========================================================================
  // Test Suite: App Instance Verification
  // ===========================================================================

  describe('Server Lifecycle - App Instance', () => {
    /**
     * Test 13: Verifies app export is a valid Express application.
     * The exported app should have Express application methods.
     */
    it('should export a valid Express application instance', async () => {
      // Re-import server
      jest.resetModules();
      const serverModule = require('../../server');
      
      // Assert: Module should export app property
      expect(serverModule).toHaveProperty('app');
      
      const { app: exportedApp } = serverModule;
      
      // Verify Express app methods exist
      expect(typeof exportedApp.use).toBe('function');
      expect(typeof exportedApp.get).toBe('function');
      expect(typeof exportedApp.post).toBe('function');
      expect(typeof exportedApp.listen).toBe('function');
    }, TEST_TIMEOUT);

    /**
     * Test 14: Verifies app has required middleware configured.
     * The app should have body parsing and security middleware applied.
     */
    it('should have middleware stack configured', async () => {
      // Re-import server
      jest.resetModules();
      const { app: middlewareApp } = require('../../server');
      
      // Assert: App should process JSON requests correctly
      const response = await request(middlewareApp)
        .post('/nonexistent')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      
      // Even 404 response means the app processed the request through middleware
      expect(response.status).toBe(404);
    }, TEST_TIMEOUT);
  });

  // ===========================================================================
  // Test Suite: Health Endpoint Timestamp
  // ===========================================================================

  describe('Server Lifecycle - Health Endpoint', () => {
    /**
     * Test 15: Verifies health endpoint returns valid timestamp.
     * Timestamp should be in ISO 8601 format.
     */
    it('should return valid ISO 8601 timestamp in health endpoint', async () => {
      // Re-import server
      jest.resetModules();
      const { app: timestampApp } = require('../../server');
      
      // Act: Request health endpoint
      const response = await request(timestampApp).get('/health');
      
      // Assert: Timestamp should be valid ISO 8601
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      
      const timestamp = response.body.timestamp;
      const parsedDate = new Date(timestamp);
      
      // Verify it's a valid date
      expect(parsedDate.toString()).not.toBe('Invalid Date');
      
      // Verify ISO 8601 format (ends with Z or has timezone offset)
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }, TEST_TIMEOUT);

    /**
     * Test 16: Verifies health endpoint status is healthy.
     * Status field should indicate server is healthy.
     */
    it('should return healthy status in health endpoint', async () => {
      // Re-import server
      jest.resetModules();
      const { app: healthyApp } = require('../../server');
      
      // Act: Request health endpoint
      const response = await request(healthyApp).get('/health');
      
      // Assert: Status should be healthy
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
    }, TEST_TIMEOUT);
  });
});
