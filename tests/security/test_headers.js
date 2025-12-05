/**
 * @fileoverview Security test suite for HTTP security headers verification.
 * Contains 10 tests that verify helmet.js middleware properly adds security
 * headers to all responses. Tests cover:
 * - X-Frame-Options (clickjacking protection)
 * - Content-Security-Policy (XSS protection)
 * - Strict-Transport-Security (HTTPS enforcement)
 * - X-Content-Type-Options (MIME sniffing prevention)
 * - X-DNS-Prefetch-Control
 * - X-Download-Options
 * - X-Permitted-Cross-Domain-Policies
 * - Referrer-Policy
 * - Cross-Origin headers configuration
 * - Consistent headers across all endpoints
 * 
 * @module tests/security/test_headers
 * @requires supertest
 * @requires ../../server
 * 
 * @see https://helmetjs.github.io/ - Helmet.js documentation
 * @see https://owasp.org/www-project-secure-headers/ - OWASP Secure Headers Project
 * 
 * @author Blitzy Security Team
 * @version 1.0.0
 * @license MIT
 */

'use strict';

// =============================================================================
// Test Dependencies
// =============================================================================

const request = require('supertest');
const { app } = require('../../server');

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates that a specific header exists in the response.
 * 
 * @param {Object} headers - Response headers object
 * @param {string} headerName - Name of the header to check (case-insensitive)
 * @returns {boolean} True if header exists
 */
function hasHeader(headers, headerName) {
  const lowerName = headerName.toLowerCase();
  return Object.keys(headers).some(key => key.toLowerCase() === lowerName);
}

/**
 * Gets a header value from response headers (case-insensitive).
 * 
 * @param {Object} headers - Response headers object
 * @param {string} headerName - Name of the header to get (case-insensitive)
 * @returns {string|undefined} Header value or undefined if not found
 */
function getHeader(headers, headerName) {
  const lowerName = headerName.toLowerCase();
  const key = Object.keys(headers).find(k => k.toLowerCase() === lowerName);
  return key ? headers[key] : undefined;
}

/**
 * Validates multiple security headers exist in response.
 * 
 * @param {Object} headers - Response headers object
 * @param {string[]} expectedHeaders - Array of expected header names
 * @returns {Object} Validation result with missing headers list
 */
function validateSecurityHeaders(headers, expectedHeaders) {
  const missingHeaders = [];
  const presentHeaders = [];
  
  expectedHeaders.forEach(headerName => {
    if (hasHeader(headers, headerName)) {
      presentHeaders.push(headerName);
    } else {
      missingHeaders.push(headerName);
    }
  });
  
  return {
    allPresent: missingHeaders.length === 0,
    missingHeaders,
    presentHeaders
  };
}

/**
 * Parses HSTS header and extracts max-age value.
 * 
 * @param {string} hstsValue - Strict-Transport-Security header value
 * @returns {number|null} max-age value in seconds or null if not found
 */
function parseHstsMaxAge(hstsValue) {
  if (!hstsValue) return null;
  const match = hstsValue.match(/max-age=(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

// =============================================================================
// Security Headers Test Suite
// =============================================================================

describe('Security Headers - Helmet Middleware', () => {
  /**
   * Test 1: X-Frame-Options Header (Clickjacking Protection)
   * 
   * Verifies that X-Frame-Options header is present to prevent clickjacking attacks.
   * The header should be set to 'DENY' or 'SAMEORIGIN' to control iframe embedding.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
   */
  it('should include X-Frame-Options header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    const xFrameOptions = getHeader(response.headers, 'x-frame-options');
    
    expect(xFrameOptions).toBeDefined();
    expect(['DENY', 'SAMEORIGIN', 'deny', 'sameorigin']).toContain(xFrameOptions);
  });

  /**
   * Test 2: Content-Security-Policy Header (XSS Protection)
   * 
   * Verifies that Content-Security-Policy header is present to mitigate XSS attacks.
   * The CSP should include a default-src directive at minimum.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
   */
  it('should include Content-Security-Policy header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    const csp = getHeader(response.headers, 'content-security-policy');
    
    expect(csp).toBeDefined();
    expect(typeof csp).toBe('string');
    expect(csp.length).toBeGreaterThan(0);
    // Verify CSP contains default-src directive
    expect(csp.toLowerCase()).toMatch(/default-src/);
  });

  /**
   * Test 3: Strict-Transport-Security Header (HTTPS Enforcement)
   * 
   * Verifies that HSTS header is present to enforce HTTPS connections.
   * The max-age should be at least 31536000 seconds (1 year) per OWASP recommendations.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
   */
  it('should include Strict-Transport-Security header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    const hsts = getHeader(response.headers, 'strict-transport-security');
    
    expect(hsts).toBeDefined();
    expect(typeof hsts).toBe('string');
    
    // Parse and verify max-age value (should be >= 1 year = 31536000 seconds)
    const maxAge = parseHstsMaxAge(hsts);
    expect(maxAge).not.toBeNull();
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  /**
   * Test 4: X-Content-Type-Options Header (MIME Sniffing Prevention)
   * 
   * Verifies that X-Content-Type-Options header is set to 'nosniff' to prevent
   * browsers from MIME-sniffing a response away from the declared content-type.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
   */
  it('should include X-Content-Type-Options header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    const xContentTypeOptions = getHeader(response.headers, 'x-content-type-options');
    
    expect(xContentTypeOptions).toBeDefined();
    expect(xContentTypeOptions.toLowerCase()).toBe('nosniff');
  });

  /**
   * Test 5: X-DNS-Prefetch-Control Header
   * 
   * Verifies that X-DNS-Prefetch-Control header is present to control
   * browser DNS prefetching behavior. Should be 'off' for security.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
   */
  it('should include X-DNS-Prefetch-Control header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    const dnsPrefetch = getHeader(response.headers, 'x-dns-prefetch-control');
    
    expect(dnsPrefetch).toBeDefined();
    expect(dnsPrefetch.toLowerCase()).toBe('off');
  });

  /**
   * Test 6: X-Download-Options Header
   * 
   * Verifies that X-Download-Options header is set to 'noopen' to prevent
   * IE from executing downloads in the site's context.
   * 
   * @see https://docs.microsoft.com/en-us/archive/blogs/ie/ie8-security-part-v-comprehensive-protection
   */
  it('should include X-Download-Options header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    const xDownloadOptions = getHeader(response.headers, 'x-download-options');
    
    expect(xDownloadOptions).toBeDefined();
    expect(xDownloadOptions.toLowerCase()).toBe('noopen');
  });

  /**
   * Test 7: X-Permitted-Cross-Domain-Policies Header
   * 
   * Verifies that X-Permitted-Cross-Domain-Policies header is set to 'none'
   * to prevent Adobe Flash and Acrobat from loading data from the domain.
   * 
   * @see https://owasp.org/www-project-secure-headers/
   */
  it('should include X-Permitted-Cross-Domain-Policies header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    const crossDomainPolicies = getHeader(response.headers, 'x-permitted-cross-domain-policies');
    
    expect(crossDomainPolicies).toBeDefined();
    expect(crossDomainPolicies.toLowerCase()).toBe('none');
  });

  /**
   * Test 8: Referrer-Policy Header
   * 
   * Verifies that Referrer-Policy header is present to control how much
   * referrer information is sent with requests.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
   */
  it('should include Referrer-Policy header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    const referrerPolicy = getHeader(response.headers, 'referrer-policy');
    
    expect(referrerPolicy).toBeDefined();
    expect(typeof referrerPolicy).toBe('string');
    expect(referrerPolicy.length).toBeGreaterThan(0);
    
    // Valid Referrer-Policy values
    const validPolicies = [
      'no-referrer',
      'no-referrer-when-downgrade',
      'origin',
      'origin-when-cross-origin',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
      'unsafe-url'
    ];
    
    // Referrer-Policy can contain multiple policies separated by commas
    const policies = referrerPolicy.split(',').map(p => p.trim().toLowerCase());
    const hasValidPolicy = policies.some(p => validPolicies.includes(p));
    
    expect(hasValidPolicy).toBe(true);
  });

  /**
   * Test 9: Cross-Origin Headers Configuration
   * 
   * Verifies that Cross-Origin headers are properly configured:
   * - Cross-Origin-Embedder-Policy (COEP)
   * - Cross-Origin-Opener-Policy (COOP)
   * - Cross-Origin-Resource-Policy (CORP)
   * 
   * Note: These headers may be optional depending on helmet configuration.
   * This test verifies they are present when configured.
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Cross-Origin_Resource_Policy
   */
  it('should include Cross-Origin headers', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    // Cross-Origin headers that Helmet may set
    const crossOriginHeaders = [
      'cross-origin-embedder-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy'
    ];
    
    // Check which cross-origin headers are present
    const headerPresence = crossOriginHeaders.map(header => ({
      header,
      present: hasHeader(response.headers, header),
      value: getHeader(response.headers, header)
    }));
    
    // At least one cross-origin header should be present with Helmet's default config
    // Helmet v8+ includes cross-origin-opener-policy by default
    const hasAnyCrossOriginHeader = headerPresence.some(h => h.present);
    
    expect(hasAnyCrossOriginHeader).toBe(true);
    
    // Verify specific header values if present
    headerPresence.forEach(({ header, present, value }) => {
      if (present && value) {
        // Validate expected values for each cross-origin header
        if (header === 'cross-origin-opener-policy') {
          expect(['same-origin', 'same-origin-allow-popups', 'unsafe-none']).toContain(value);
        }
        if (header === 'cross-origin-embedder-policy') {
          expect(['require-corp', 'credentialless', 'unsafe-none']).toContain(value);
        }
        if (header === 'cross-origin-resource-policy') {
          expect(['same-site', 'same-origin', 'cross-origin']).toContain(value);
        }
      }
    });
  });

  /**
   * Test 10: Security Headers Present on All Endpoints
   * 
   * Verifies that security headers are consistently applied across all
   * application endpoints, ensuring uniform protection. Tests both the
   * root endpoint (/) and the /evening endpoint.
   * 
   * This test ensures that Helmet middleware is properly configured as
   * application-level middleware and not just route-specific.
   */
  it('should apply security headers to all endpoints', async () => {
    // Core security headers that must be present on all endpoints
    const coreSecurityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-dns-prefetch-control',
      'x-download-options',
      'strict-transport-security',
      'content-security-policy'
    ];
    
    // Test root endpoint (/)
    const rootResponse = await request(app)
      .get('/')
      .expect(200);
    
    const rootValidation = validateSecurityHeaders(rootResponse.headers, coreSecurityHeaders);
    expect(rootValidation.allPresent).toBe(true);
    
    // Test /evening endpoint
    const eveningResponse = await request(app)
      .get('/evening')
      .expect(200);
    
    const eveningValidation = validateSecurityHeaders(eveningResponse.headers, coreSecurityHeaders);
    expect(eveningValidation.allPresent).toBe(true);
    
    // Verify header values are consistent across endpoints
    coreSecurityHeaders.forEach(header => {
      const rootValue = getHeader(rootResponse.headers, header);
      const eveningValue = getHeader(eveningResponse.headers, header);
      
      // Both endpoints should have the same security header values
      expect(rootValue).toBe(eveningValue);
    });
  });
});

// =============================================================================
// Additional Security Header Verification
// =============================================================================

describe('Security Headers - Extended Verification', () => {
  /**
   * Verifies that deprecated or removed security headers are NOT present.
   * 
   * X-XSS-Protection was removed from Helmet v4+ as it can introduce
   * additional vulnerabilities in modern browsers.
   */
  it('should not include deprecated X-XSS-Protection header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    // X-XSS-Protection is deprecated and removed in Helmet v4+
    // Modern browsers have built-in XSS protection through CSP
    const xssProtection = getHeader(response.headers, 'x-xss-protection');
    
    // If present, it should be '0' (disabled) or not present at all
    if (xssProtection !== undefined) {
      expect(xssProtection).toBe('0');
    }
  });

  /**
   * Verifies that security headers are present even for error responses.
   */
  it('should include security headers on 404 responses', async () => {
    const response = await request(app)
      .get('/nonexistent-endpoint-404-test')
      .expect(404);
    
    // Core security headers should still be present on error pages
    expect(getHeader(response.headers, 'x-frame-options')).toBeDefined();
    expect(getHeader(response.headers, 'x-content-type-options')).toBeDefined();
    expect(getHeader(response.headers, 'strict-transport-security')).toBeDefined();
  });

  /**
   * Verifies that sensitive headers are not leaked in the response.
   */
  it('should not expose X-Powered-By header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    // X-Powered-By header reveals server technology and should be hidden
    const xPoweredBy = getHeader(response.headers, 'x-powered-by');
    
    expect(xPoweredBy).toBeUndefined();
  });
});
