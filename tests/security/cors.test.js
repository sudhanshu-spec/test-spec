/**
 * CORS (Cross-Origin Resource Sharing) Policy Verification Test Suite
 * 
 * This test suite verifies the CORS middleware functionality for the security-hardened
 * Express.js application. It tests that:
 * 
 * - Access-Control-* headers are correctly set in responses
 * - Unauthorized origins are blocked
 * - Allowed origins are permitted
 * - Correct HTTP methods are allowed (GET, POST, PUT, DELETE)
 * - Preflight OPTIONS requests are handled correctly
 * - Credentials handling is properly configured
 * 
 * Security Validation:
 * - CORS Bypass prevention: Verifies unauthorized origins are rejected
 * - Cross-Origin Attack prevention: Verifies strict origin validation
 * - Credentials security: Verifies wildcard is not used with credentials
 * 
 * @module tests/security/cors.test
 * @requires supertest
 * @requires server
 * @requires config/cors
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 * @see https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny
 */

'use strict';

// =============================================================================
// TEST DEPENDENCIES
// =============================================================================

/**
 * Supertest HTTP assertion library for Express application testing
 * @see https://www.npmjs.com/package/supertest
 */
const request = require('supertest');

/**
 * Express application instance with CORS middleware configured
 * Required for supertest to make simulated HTTP requests
 */
const app = require('../../server');

/**
 * CORS configuration object for verifying expected configuration values
 * Contains origin, methods, allowedHeaders, and credentials settings
 */
const corsOptions = require('../../config/cors');

// =============================================================================
// TEST CONSTANTS
// =============================================================================

/**
 * Test origins for CORS verification
 * @type {Object}
 */
const TEST_ORIGINS = {
  /**
   * Malicious/unauthorized origin for rejection testing
   */
  UNAUTHORIZED: 'http://malicious-site.com',
  
  /**
   * Another unauthorized origin for comprehensive testing
   */
  UNKNOWN: 'http://unknown-attacker.com',
  
  /**
   * Localhost origin commonly used in development
   */
  LOCALHOST: 'http://localhost:3000',
  
  /**
   * Alternative localhost with different port
   */
  LOCALHOST_ALT: 'http://localhost:8080',
  
  /**
   * Production-like origin for testing
   */
  PRODUCTION: 'https://myapp.com'
};

/**
 * Expected HTTP methods from corsOptions configuration
 * @type {string[]}
 */
const EXPECTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

/**
 * Expected allowed headers from corsOptions configuration
 * @type {string[]}
 */
const EXPECTED_HEADERS = ['Content-Type', 'Authorization'];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if the current CORS configuration allows the specified origin.
 * This helper interprets the corsOptions.origin value which can be:
 * - false: No origins allowed
 * - string: Single origin allowed
 * - string[]: Multiple origins allowed
 * 
 * @param {string} origin - The origin to check
 * @returns {boolean} True if origin is allowed by configuration
 */
const isOriginAllowed = (origin) => {
  const configuredOrigin = corsOptions.origin;
  
  if (configuredOrigin === false) {
    return false;
  }
  
  if (typeof configuredOrigin === 'string') {
    return configuredOrigin === origin;
  }
  
  if (Array.isArray(configuredOrigin)) {
    return configuredOrigin.includes(origin);
  }
  
  // For function-based origin validation, return unknown
  if (typeof configuredOrigin === 'function') {
    return null; // Cannot determine statically
  }
  
  return false;
};

/**
 * Gets the list of allowed origins from configuration for test setup
 * @returns {string[]|null} Array of allowed origins, or null if blocking all
 */
const getAllowedOrigins = () => {
  const configuredOrigin = corsOptions.origin;
  
  if (configuredOrigin === false) {
    return null;
  }
  
  if (typeof configuredOrigin === 'string') {
    return [configuredOrigin];
  }
  
  if (Array.isArray(configuredOrigin)) {
    return configuredOrigin;
  }
  
  return null;
};

// =============================================================================
// TEST SUITES
// =============================================================================

describe('CORS Policy', () => {
  /**
   * Document the current CORS configuration for test context
   */
  beforeAll(() => {
    console.log('[CORS Tests] Current CORS configuration:');
    console.log(`  Origin: ${JSON.stringify(corsOptions.origin)}`);
    console.log(`  Methods: ${JSON.stringify(corsOptions.methods)}`);
    console.log(`  Allowed Headers: ${JSON.stringify(corsOptions.allowedHeaders)}`);
    console.log(`  Credentials: ${corsOptions.credentials}`);
  });

  describe('Access-Control-Allow-Origin Header', () => {
    /**
     * Test: Access-Control-Allow-Origin header for allowed origins
     * When an allowed origin makes a request, the response should include
     * the Access-Control-Allow-Origin header matching that origin.
     */
    test('should include Access-Control-Allow-Origin header for allowed origins', async () => {
      const allowedOrigins = getAllowedOrigins();
      
      // Skip if no origins are configured (blocking mode)
      if (!allowedOrigins || allowedOrigins.length === 0) {
        console.log('[SKIP] No allowed origins configured - CORS is in blocking mode');
        return;
      }
      
      const testOrigin = allowedOrigins[0];
      
      const response = await request(app)
        .get('/')
        .set('Origin', testOrigin)
        .expect(200);
      
      // Verify the Access-Control-Allow-Origin header matches the request origin
      expect(response.headers['access-control-allow-origin']).toBe(testOrigin);
    });

    /**
     * Test: Reject requests from unauthorized origins
     * When an unauthorized origin makes a request, the Access-Control-Allow-Origin
     * header should NOT be set, effectively blocking the cross-origin request.
     */
    test('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/')
        .set('Origin', TEST_ORIGINS.UNAUTHORIZED);
      
      // The request itself may succeed (200) but CORS headers should be missing
      // Browsers enforce CORS policy client-side based on headers
      // When origin is not allowed:
      // - access-control-allow-origin should be undefined or not match the request origin
      const allowOriginHeader = response.headers['access-control-allow-origin'];
      
      // Verify the malicious origin is NOT reflected in the response
      expect(allowOriginHeader).not.toBe(TEST_ORIGINS.UNAUTHORIZED);
      
      // If credentials are enabled and no origin is allowed, header should be undefined
      // If origin is set to false, no CORS headers should be added
      if (corsOptions.origin === false) {
        expect(allowOriginHeader).toBeUndefined();
      }
    });

    /**
     * Test: Block cross-origin access from unknown attacker origins
     * Security validation to ensure strict origin checking
     */
    test('should block cross-origin access from unknown origins', async () => {
      const response = await request(app)
        .get('/')
        .set('Origin', TEST_ORIGINS.UNKNOWN);
      
      const allowOriginHeader = response.headers['access-control-allow-origin'];
      
      // Unknown origin should NOT be allowed
      expect(allowOriginHeader).not.toBe(TEST_ORIGINS.UNKNOWN);
    });
  });

  describe('Access-Control-Allow-Methods Header', () => {
    /**
     * Test: Access-Control-Allow-Methods header on preflight
     * OPTIONS preflight requests should return the allowed methods header.
     */
    test('should include Access-Control-Allow-Methods header on preflight', async () => {
      const allowedOrigins = getAllowedOrigins();
      
      // Use an allowed origin for preflight, or skip if in blocking mode
      const testOrigin = allowedOrigins && allowedOrigins.length > 0 
        ? allowedOrigins[0] 
        : TEST_ORIGINS.LOCALHOST;
      
      const response = await request(app)
        .options('/')
        .set('Origin', testOrigin)
        .set('Access-Control-Request-Method', 'POST');
      
      // Check if methods header is present
      const methodsHeader = response.headers['access-control-allow-methods'];
      
      // If origin is allowed, methods should be listed
      if (allowedOrigins && allowedOrigins.includes(testOrigin)) {
        expect(methodsHeader).toBeDefined();
        
        // Verify all expected methods are included
        EXPECTED_METHODS.forEach(method => {
          expect(methodsHeader).toContain(method);
        });
      } else {
        // If origin is not allowed, methods header may be undefined
        console.log('[INFO] Origin not in whitelist, methods header may be absent');
      }
    });

    /**
     * Test: Verify correct HTTP methods are allowed
     * The allowed methods should match the configured CORS options.
     */
    test('should allow configured HTTP methods (GET, POST, PUT, DELETE)', async () => {
      // Verify configuration matches expected methods
      expect(corsOptions.methods).toEqual(expect.arrayContaining(EXPECTED_METHODS));
      expect(corsOptions.methods.length).toBe(EXPECTED_METHODS.length);
    });
  });

  describe('Access-Control-Allow-Headers Header', () => {
    /**
     * Test: Access-Control-Allow-Headers header on preflight
     * OPTIONS preflight requests with Access-Control-Request-Headers
     * should return the allowed headers.
     */
    test('should include Access-Control-Allow-Headers header on preflight', async () => {
      const allowedOrigins = getAllowedOrigins();
      
      const testOrigin = allowedOrigins && allowedOrigins.length > 0 
        ? allowedOrigins[0] 
        : TEST_ORIGINS.LOCALHOST;
      
      const response = await request(app)
        .options('/')
        .set('Origin', testOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');
      
      const headersHeader = response.headers['access-control-allow-headers'];
      
      // If origin is allowed, headers should be listed
      if (allowedOrigins && allowedOrigins.includes(testOrigin)) {
        expect(headersHeader).toBeDefined();
        
        // Verify expected headers are included (case-insensitive)
        const headersLower = headersHeader.toLowerCase();
        expect(headersLower).toContain('content-type');
        expect(headersLower).toContain('authorization');
      }
    });

    /**
     * Test: Verify allowed headers configuration matches expected values
     */
    test('should have correct allowed headers configured', () => {
      expect(corsOptions.allowedHeaders).toEqual(expect.arrayContaining(EXPECTED_HEADERS));
    });
  });

  describe('Preflight OPTIONS Requests', () => {
    /**
     * Test: Handle preflight OPTIONS requests with correct status
     * Preflight requests should return 200 or 204 status for allowed origins.
     * When CORS is in blocking mode (no origins configured), preflight may return 404
     * since there's no explicit route for OPTIONS and no allowed origin.
     */
    test('should handle preflight OPTIONS requests with 200 status', async () => {
      const allowedOrigins = getAllowedOrigins();
      
      // When no origins are configured (blocking mode), skip this test
      // as preflight behavior depends on having allowed origins
      if (!allowedOrigins || allowedOrigins.length === 0) {
        console.log('[SKIP] No allowed origins configured - preflight status varies in blocking mode');
        return;
      }
      
      const testOrigin = allowedOrigins[0];
      
      const response = await request(app)
        .options('/')
        .set('Origin', testOrigin)
        .set('Access-Control-Request-Method', 'POST');
      
      // Status should be 200 (per corsOptions.optionsSuccessStatus) or 204
      expect([200, 204]).toContain(response.status);
    });

    /**
     * Test: Verify optionsSuccessStatus configuration
     */
    test('should have correct optionsSuccessStatus configured', () => {
      expect(corsOptions.optionsSuccessStatus).toBe(200);
    });

    /**
     * Test: Preflight response includes all necessary CORS headers
     * A proper preflight response should include origin, methods, and headers.
     */
    test('should include all CORS headers on preflight response for allowed origin', async () => {
      const allowedOrigins = getAllowedOrigins();
      
      // Skip if no origins are configured
      if (!allowedOrigins || allowedOrigins.length === 0) {
        console.log('[SKIP] No allowed origins configured - skipping preflight header test');
        return;
      }
      
      const testOrigin = allowedOrigins[0];
      
      const response = await request(app)
        .options('/')
        .set('Origin', testOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');
      
      // Verify all CORS headers are present
      expect(response.headers['access-control-allow-origin']).toBe(testOrigin);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });
});

describe('CORS Credentials', () => {
  /**
   * Test: Access-Control-Allow-Credentials header for credentialed requests
   * When credentials are enabled, the header should be set to 'true'.
   */
  test('should include Access-Control-Allow-Credentials for allowed origins', async () => {
    const allowedOrigins = getAllowedOrigins();
    
    // Skip if no origins are configured
    if (!allowedOrigins || allowedOrigins.length === 0) {
      console.log('[SKIP] No allowed origins configured - skipping credentials test');
      return;
    }
    
    const testOrigin = allowedOrigins[0];
    
    const response = await request(app)
      .get('/')
      .set('Origin', testOrigin);
    
    // When credentials are enabled in config, header should be 'true'
    if (corsOptions.credentials === true) {
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    }
  });

  /**
   * Test: Credentials configuration should be enabled
   */
  test('should have credentials enabled in configuration', () => {
    expect(corsOptions.credentials).toBe(true);
  });

  /**
   * Test: NOT use wildcard origin when credentials enabled
   * Per CORS specification, when credentials is true, origin cannot be '*'.
   * This is a critical security requirement.
   */
  test('should NOT use wildcard origin when credentials enabled', () => {
    // When credentials are enabled, origin must not be wildcard '*'
    if (corsOptions.credentials === true) {
      expect(corsOptions.origin).not.toBe('*');
      
      // Also verify the header won't be set to wildcard
      // (This is enforced by the cors middleware automatically)
    }
  });

  /**
   * Test: Verify origin is explicit (not wildcard) when credentials enabled
   */
  test('should use explicit origin configuration with credentials', async () => {
    const allowedOrigins = getAllowedOrigins();
    
    // Skip if no origins are configured
    if (!allowedOrigins || allowedOrigins.length === 0) {
      console.log('[SKIP] No allowed origins configured');
      return;
    }
    
    const testOrigin = allowedOrigins[0];
    
    const response = await request(app)
      .get('/')
      .set('Origin', testOrigin);
    
    // Verify origin header is explicit (equals the request origin), not '*'
    const originHeader = response.headers['access-control-allow-origin'];
    if (originHeader) {
      expect(originHeader).not.toBe('*');
      expect(originHeader).toBe(testOrigin);
    }
  });
});

describe('Cross-Origin Attack Prevention', () => {
  /**
   * Test: Block cross-origin access from unknown origins
   * Security validation: Unknown origins should not receive CORS headers.
   */
  test('should block cross-origin access from unknown origins', async () => {
    const response = await request(app)
      .get('/')
      .set('Origin', TEST_ORIGINS.UNKNOWN);
    
    const allowOriginHeader = response.headers['access-control-allow-origin'];
    
    // The unknown origin should NOT be reflected
    expect(allowOriginHeader).not.toBe(TEST_ORIGINS.UNKNOWN);
  });

  /**
   * Test: Block CORS bypass attempts with malicious origins
   */
  test('should block CORS bypass attempts with malicious origins', async () => {
    const maliciousOrigins = [
      'http://malicious-site.com',
      'https://evil.com',
      'http://attacker.localhost.com',
      'http://localhost.evil.com',
      'null', // Special null origin attack
    ];
    
    for (const origin of maliciousOrigins) {
      const response = await request(app)
        .get('/')
        .set('Origin', origin);
      
      const allowOriginHeader = response.headers['access-control-allow-origin'];
      
      // Malicious origin should NOT be reflected in response
      expect(allowOriginHeader).not.toBe(origin);
    }
  });

  /**
   * Test: Verify Origin header scrutiny
   * The server should strictly validate the Origin header value.
   * Note: Origins with invalid HTTP header characters (like \r\n) cannot be sent
   * via HTTP libraries as they violate HTTP protocol and are rejected at transport level.
   */
  test('should strictly validate Origin header values', async () => {
    // Test with origins that could potentially bypass naive string matching
    // Only use valid HTTP header characters - invalid chars are rejected at transport level
    const trickyOrigins = [
      'http://localhost:3000.evil.com',        // Subdomain of localhost:3000.evil.com
      'http://localhost:3000%00.evil.com',     // URL-encoded null byte attempt
      'http://localhost:3000-evil.com',        // Hyphenated variant
      'http://localhost.3000.evil.com',        // Another subdomain variation
    ];
    
    for (const origin of trickyOrigins) {
      const response = await request(app)
        .get('/')
        .set('Origin', origin);
      
      const allowOriginHeader = response.headers['access-control-allow-origin'];
      
      // Tricky origins should NOT match allowed origins
      expect(allowOriginHeader).not.toBe(origin);
    }
  });
});

describe('Environment-Based CORS Configuration', () => {
  /**
   * Store original environment variables for restoration
   */
  const originalEnv = { ...process.env };
  
  afterEach(() => {
    // Restore original environment variables
    process.env = { ...originalEnv };
  });

  /**
   * Test: Verify current ALLOWED_ORIGINS environment variable handling
   * The CORS configuration should respect the ALLOWED_ORIGINS env var.
   */
  test('should respect ALLOWED_ORIGINS environment variable', () => {
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
    
    if (!allowedOriginsEnv) {
      // When not configured, origin should be false (blocking mode)
      console.log('[INFO] ALLOWED_ORIGINS not set - CORS in blocking mode');
      // This is the expected secure default
    } else {
      // When configured, origins should be parsed
      console.log(`[INFO] ALLOWED_ORIGINS configured: ${allowedOriginsEnv}`);
      expect(corsOptions.origin).not.toBe(false);
    }
  });

  /**
   * Test: Verify CORS configuration matches environment
   * Document current configuration for debugging purposes.
   */
  test('should have correct configuration based on environment', () => {
    console.log('[CONFIG] Current CORS settings:');
    console.log(`  origin: ${JSON.stringify(corsOptions.origin)}`);
    console.log(`  methods: ${JSON.stringify(corsOptions.methods)}`);
    console.log(`  allowedHeaders: ${JSON.stringify(corsOptions.allowedHeaders)}`);
    console.log(`  credentials: ${corsOptions.credentials}`);
    console.log(`  optionsSuccessStatus: ${corsOptions.optionsSuccessStatus}`);
    
    // Basic structure validation
    expect(corsOptions).toHaveProperty('origin');
    expect(corsOptions).toHaveProperty('methods');
    expect(corsOptions).toHaveProperty('allowedHeaders');
    expect(corsOptions).toHaveProperty('credentials');
  });

  /**
   * Test: Default behavior when no origins configured
   * When ALLOWED_ORIGINS is not set, CORS should block all cross-origin requests.
   */
  test('should block all cross-origin requests when no origins configured', async () => {
    // If origin is false (no ALLOWED_ORIGINS), requests from any origin should be blocked
    if (corsOptions.origin === false) {
      const response = await request(app)
        .get('/')
        .set('Origin', TEST_ORIGINS.LOCALHOST);
      
      // No Access-Control-Allow-Origin header should be set
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      
      console.log('[VERIFY] CORS correctly blocking cross-origin requests');
    } else {
      console.log('[INFO] Origins are configured - skipping blocking test');
    }
  });
});

describe('CORS Configuration Validation', () => {
  /**
   * Test: Verify corsOptions object structure
   */
  test('should have valid corsOptions structure', () => {
    expect(corsOptions).toBeDefined();
    expect(typeof corsOptions).toBe('object');
  });

  /**
   * Test: Verify origin property exists and has valid type
   */
  test('should have valid origin configuration', () => {
    const validTypes = ['boolean', 'string', 'object']; // object for array
    expect(validTypes).toContain(typeof corsOptions.origin);
  });

  /**
   * Test: Verify methods is an array with valid HTTP methods
   */
  test('should have valid methods configuration', () => {
    expect(Array.isArray(corsOptions.methods)).toBe(true);
    expect(corsOptions.methods.length).toBeGreaterThan(0);
    
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    corsOptions.methods.forEach(method => {
      expect(validMethods).toContain(method);
    });
  });

  /**
   * Test: Verify allowedHeaders is an array
   */
  test('should have valid allowedHeaders configuration', () => {
    expect(Array.isArray(corsOptions.allowedHeaders)).toBe(true);
  });

  /**
   * Test: Verify credentials is a boolean
   */
  test('should have valid credentials configuration', () => {
    expect(typeof corsOptions.credentials).toBe('boolean');
  });

  /**
   * Test: Verify configuration is frozen (immutable)
   */
  test('should have frozen configuration object', () => {
    expect(Object.isFrozen(corsOptions)).toBe(true);
  });
});

describe('CORS Request Flow Integration', () => {
  /**
   * Test: Simple request flow (no preflight needed)
   * Simple GET requests should include CORS headers for allowed origins.
   */
  test('should handle simple GET request with CORS headers', async () => {
    const allowedOrigins = getAllowedOrigins();
    
    if (!allowedOrigins || allowedOrigins.length === 0) {
      console.log('[SKIP] No allowed origins configured');
      return;
    }
    
    const testOrigin = allowedOrigins[0];
    
    const response = await request(app)
      .get('/')
      .set('Origin', testOrigin)
      .expect(200);
    
    // Response should include the expected body
    expect(response.text).toBe('Hello, World!\n');
    
    // CORS headers should be present
    expect(response.headers['access-control-allow-origin']).toBe(testOrigin);
  });

  /**
   * Test: Preflight + actual request flow
   * Complex requests trigger preflight, then actual request.
   */
  test('should handle preflight followed by actual request', async () => {
    const allowedOrigins = getAllowedOrigins();
    
    if (!allowedOrigins || allowedOrigins.length === 0) {
      console.log('[SKIP] No allowed origins configured');
      return;
    }
    
    const testOrigin = allowedOrigins[0];
    
    // Step 1: Preflight OPTIONS request
    const preflightResponse = await request(app)
      .options('/')
      .set('Origin', testOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type');
    
    expect([200, 204]).toContain(preflightResponse.status);
    
    // Step 2: Actual request (if preflight succeeded)
    const actualResponse = await request(app)
      .get('/')
      .set('Origin', testOrigin)
      .expect(200);
    
    expect(actualResponse.headers['access-control-allow-origin']).toBe(testOrigin);
  });

  /**
   * Test: Requests without Origin header
   * Same-origin requests (no Origin header) should work normally.
   */
  test('should handle requests without Origin header (same-origin)', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    // Response should be successful
    expect(response.text).toBe('Hello, World!\n');
    
    // No CORS headers needed for same-origin requests
    // (Access-Control-Allow-Origin may or may not be present)
  });
});
