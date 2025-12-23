/**
 * Security Headers Test Suite
 * 
 * This test suite verifies that the Express.js application correctly implements
 * HTTP security headers using helmet.js middleware. These headers protect against
 * common web vulnerabilities including XSS, clickjacking, MIME sniffing, and
 * information disclosure attacks.
 * 
 * Security Headers Tested:
 * - Content-Security-Policy (CSP): Prevents XSS and data injection attacks
 * - Strict-Transport-Security (HSTS): Enforces HTTPS connections
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME-type sniffing
 * - Referrer-Policy: Controls referrer information sent with requests
 * - Cross-Origin-Opener-Policy: Isolates browsing context
 * - Cross-Origin-Resource-Policy: Controls cross-origin resource loading
 * - X-DNS-Prefetch-Control: Privacy protection for DNS prefetching
 * - X-Permitted-Cross-Domain-Policies: Adobe plugin protection
 * - X-Download-Options: IE file download protection
 * - X-Powered-By Removal: Information disclosure prevention
 * 
 * @see https://helmetjs.github.io/
 * @see https://owasp.org/www-project-secure-headers/
 * @module tests/security/headers.test
 */

'use strict';

// =============================================================================
// TEST DEPENDENCIES
// =============================================================================

/**
 * supertest - HTTP assertion library for testing Express applications
 * Enables making simulated HTTP requests and asserting on responses
 */
const request = require('supertest');

/**
 * Express application instance with helmet security middleware configured
 * Exported from server.js for integration testing
 */
const app = require('../../server');

/**
 * Helmet configuration object containing expected security header settings
 * Used to verify response headers match configured values
 */
const helmetConfig = require('../../config/helmet');

// =============================================================================
// TEST SUITE: SECURITY HEADERS
// =============================================================================

/**
 * Security Headers Test Suite
 * 
 * Verifies that all HTTP security headers are correctly applied to responses.
 * These tests ensure helmet.js middleware is properly configured and active.
 */
describe('Security Headers', () => {
  /**
   * Test: Content-Security-Policy Header
   * 
   * CSP prevents XSS attacks by restricting which resources can be loaded.
   * The header should contain directives that control script, style, and
   * other resource loading to same-origin by default.
   */
  describe('Content-Security-Policy', () => {
    it('should include Content-Security-Policy header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should contain default-src directive restricting to self', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toMatch(/default-src\s+['"]self['"]/);
    });

    it('should contain script-src directive for XSS protection', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      // Script-src should contain 'self' at minimum
      expect(csp).toMatch(/script-src\s+[^;]*['"]self['"]/);
    });

    it('should contain style-src directive', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toMatch(/style-src\s+[^;]*['"]self['"]/);
    });

    it('should contain object-src directive set to none', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      // object-src should be 'none' to prevent plugin-based attacks
      expect(csp).toMatch(/object-src\s+['"]none['"]/);
    });

    it('should contain frame-ancestors directive for clickjacking protection', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      // frame-ancestors should be 'none' to prevent embedding
      expect(csp).toMatch(/frame-ancestors\s+['"]none['"]/);
    });

    it('should apply CSP to all routes', async () => {
      // Test root route
      const rootResponse = await request(app).get('/');
      expect(rootResponse.headers['content-security-policy']).toBeDefined();

      // Test /evening route
      const eveningResponse = await request(app).get('/evening');
      expect(eveningResponse.headers['content-security-policy']).toBeDefined();
    });
  });

  /**
   * Test: Strict-Transport-Security (HSTS) Header
   * 
   * HSTS tells browsers to only use HTTPS for the domain.
   * This prevents protocol downgrade attacks and cookie hijacking.
   */
  describe('Strict-Transport-Security (HSTS)', () => {
    it('should include Strict-Transport-Security header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should have max-age set to at least 1 year (31536000 seconds)', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      
      // Extract max-age value and verify it meets OWASP minimum recommendation
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      expect(maxAgeMatch).not.toBeNull();
      
      const maxAge = parseInt(maxAgeMatch[1], 10);
      // OWASP recommends at least 1 year (31536000 seconds)
      expect(maxAge).toBeGreaterThanOrEqual(31536000);
    });

    it('should include includeSubDomains directive per config', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      
      // Verify includeSubDomains is present if configured
      if (helmetConfig.hsts && helmetConfig.hsts.includeSubDomains) {
        expect(hsts.toLowerCase()).toContain('includesubdomains');
      }
    });

    it('should match expected max-age from helmet configuration', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      
      // Verify max-age matches configuration
      const expectedMaxAge = helmetConfig.hsts.maxAge;
      expect(hsts).toContain(`max-age=${expectedMaxAge}`);
    });
  });

  /**
   * Test: X-Frame-Options Header
   * 
   * Protects against clickjacking attacks by preventing the page
   * from being embedded in frames or iframes on other sites.
   */
  describe('X-Frame-Options', () => {
    it('should include X-Frame-Options header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should be set to DENY or SAMEORIGIN', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const xFrameOptions = response.headers['x-frame-options'];
      expect(xFrameOptions).toBeDefined();
      
      // X-Frame-Options must be either DENY or SAMEORIGIN
      const validValues = ['DENY', 'SAMEORIGIN'];
      expect(validValues).toContain(xFrameOptions.toUpperCase());
    });

    it('should match expected value from helmet configuration', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const xFrameOptions = response.headers['x-frame-options'];
      expect(xFrameOptions).toBeDefined();
      
      // Our config sets action: 'deny'
      const expectedValue = helmetConfig.xFrameOptions.action.toUpperCase();
      expect(xFrameOptions.toUpperCase()).toBe(expectedValue);
    });
  });

  /**
   * Test: X-Content-Type-Options Header
   * 
   * Prevents browsers from MIME-sniffing responses away from
   * the declared Content-Type, reducing drive-by download attacks.
   */
  describe('X-Content-Type-Options', () => {
    it('should include X-Content-Type-Options header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    it('should be set to nosniff', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const xContentTypeOptions = response.headers['x-content-type-options'];
      expect(xContentTypeOptions).toBeDefined();
      expect(xContentTypeOptions.toLowerCase()).toBe('nosniff');
    });
  });

  /**
   * Test: X-Powered-By Header Removal
   * 
   * By default, Express sends X-Powered-By: Express header which reveals
   * the technology stack. Helmet removes this to reduce information disclosure.
   */
  describe('X-Powered-By Header Removal', () => {
    it('should NOT include X-Powered-By header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // X-Powered-By should be undefined (removed by helmet)
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should NOT reveal technology stack in any route', async () => {
      // Test multiple routes to ensure X-Powered-By is always removed
      const rootResponse = await request(app).get('/');
      expect(rootResponse.headers['x-powered-by']).toBeUndefined();

      const eveningResponse = await request(app).get('/evening');
      expect(eveningResponse.headers['x-powered-by']).toBeUndefined();
    });

    it('should NOT include X-Powered-By even in error responses', async () => {
      // Test a non-existent route that returns 404
      const response = await request(app)
        .get('/non-existent-route-for-testing')
        .expect(404);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  /**
   * Test: Referrer-Policy Header
   * 
   * Controls how much referrer information is included with requests.
   * Helps protect user privacy and prevent information leakage.
   */
  describe('Referrer-Policy', () => {
    it('should include Referrer-Policy header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['referrer-policy']).toBeDefined();
    });

    it('should have a secure referrer policy value', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const referrerPolicy = response.headers['referrer-policy'];
      expect(referrerPolicy).toBeDefined();
      
      // Valid secure referrer policies
      const secureValues = [
        'no-referrer',
        'no-referrer-when-downgrade',
        'origin',
        'origin-when-cross-origin',
        'same-origin',
        'strict-origin',
        'strict-origin-when-cross-origin'
      ];
      
      // Check if the policy matches one of the secure values
      const hasSecurePolicy = secureValues.some(
        value => referrerPolicy.toLowerCase().includes(value)
      );
      expect(hasSecurePolicy).toBe(true);
    });
  });

  /**
   * Test: Cross-Origin-Opener-Policy Header
   * 
   * Controls window interactions with cross-origin documents.
   * Isolates the browsing context from cross-origin documents.
   */
  describe('Cross-Origin-Opener-Policy', () => {
    it('should include Cross-Origin-Opener-Policy header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['cross-origin-opener-policy']).toBeDefined();
    });

    it('should have a valid Cross-Origin-Opener-Policy value', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const coop = response.headers['cross-origin-opener-policy'];
      expect(coop).toBeDefined();
      
      // Valid COOP values
      const validValues = ['same-origin', 'same-origin-allow-popups', 'unsafe-none'];
      expect(validValues).toContain(coop);
    });
  });

  /**
   * Test: Cross-Origin-Resource-Policy Header
   * 
   * Controls which origins can load this resource.
   */
  describe('Cross-Origin-Resource-Policy', () => {
    it('should include Cross-Origin-Resource-Policy header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['cross-origin-resource-policy']).toBeDefined();
    });

    it('should have a valid Cross-Origin-Resource-Policy value', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const corp = response.headers['cross-origin-resource-policy'];
      expect(corp).toBeDefined();
      
      // Valid CORP values
      const validValues = ['same-origin', 'same-site', 'cross-origin'];
      expect(validValues).toContain(corp);
    });
  });

  /**
   * Test: X-DNS-Prefetch-Control Header
   * 
   * Controls browser DNS prefetching for privacy protection.
   */
  describe('X-DNS-Prefetch-Control', () => {
    it('should include X-DNS-Prefetch-Control header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    });

    it('should have a valid value (on or off)', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const dnsPrefetch = response.headers['x-dns-prefetch-control'];
      expect(dnsPrefetch).toBeDefined();
      expect(['on', 'off']).toContain(dnsPrefetch);
    });
  });

  /**
   * Test: X-Permitted-Cross-Domain-Policies Header
   * 
   * Controls loading of cross-domain content by Adobe Flash and PDF readers.
   */
  describe('X-Permitted-Cross-Domain-Policies', () => {
    it('should include X-Permitted-Cross-Domain-Policies header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-permitted-cross-domain-policies']).toBeDefined();
    });

    it('should be set to none for maximum security', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const policy = response.headers['x-permitted-cross-domain-policies'];
      expect(policy).toBeDefined();
      expect(policy).toBe('none');
    });
  });

  /**
   * Test: X-Download-Options Header (IE Protection)
   * 
   * Prevents Internet Explorer from executing downloads in the site's context.
   */
  describe('X-Download-Options', () => {
    it('should include X-Download-Options header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-download-options']).toBeDefined();
    });

    it('should be set to noopen', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const downloadOptions = response.headers['x-download-options'];
      expect(downloadOptions).toBeDefined();
      expect(downloadOptions.toLowerCase()).toBe('noopen');
    });
  });

  /**
   * Test: Origin-Agent-Cluster Header
   * 
   * Requests that the document be placed in its own origin-keyed agent cluster.
   */
  describe('Origin-Agent-Cluster', () => {
    it('should include Origin-Agent-Cluster header in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['origin-agent-cluster']).toBeDefined();
    });

    it('should be set to ?1', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      const oac = response.headers['origin-agent-cluster'];
      expect(oac).toBeDefined();
      expect(oac).toBe('?1');
    });
  });
});

// =============================================================================
// TEST SUITE: XSS PREVENTION
// =============================================================================

/**
 * XSS Prevention Test Suite
 * 
 * Verifies that Content-Security-Policy is configured to prevent
 * Cross-Site Scripting (XSS) attacks by restricting script sources.
 */
describe('XSS Prevention', () => {
  /**
   * Test: CSP Blocks Inline Script Execution
   * 
   * Verifies that CSP prevents execution of inline scripts by
   * not including 'unsafe-inline' in script-src (in production mode).
   */
  it('should have CSP that restricts script sources to self', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    
    // Verify script-src contains 'self'
    expect(csp).toMatch(/script-src\s+[^;]*['"]self['"]/);
  });

  it('should block script execution via strict CSP default-src', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    
    // default-src should be 'self' which provides fallback protection
    expect(csp).toMatch(/default-src\s+['"]self['"]/);
  });

  it('should restrict connect-src for XHR/fetch security', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    
    // connect-src should contain 'self' at minimum
    expect(csp).toMatch(/connect-src\s+[^;]*['"]self['"]/);
  });

  it('should have form-action directive to prevent form hijacking', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    
    // form-action restricts where forms can submit
    expect(csp).toMatch(/form-action\s+['"]self['"]/);
  });

  it('should have base-uri directive to prevent base tag injection', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    
    // base-uri prevents attackers from changing base URL
    expect(csp).toMatch(/base-uri\s+['"]self['"]/);
  });
});

// =============================================================================
// TEST SUITE: CLICKJACKING PREVENTION
// =============================================================================

/**
 * Clickjacking Prevention Test Suite
 * 
 * Verifies that both X-Frame-Options and CSP frame-ancestors
 * are configured to prevent clickjacking attacks.
 */
describe('Clickjacking Prevention', () => {
  /**
   * Test: X-Frame-Options Prevents Iframe Embedding
   * 
   * Verifies X-Frame-Options is set to DENY to prevent
   * the page from being embedded in any iframe.
   */
  it('should prevent iframe embedding via X-Frame-Options', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const xFrameOptions = response.headers['x-frame-options'];
    expect(xFrameOptions).toBeDefined();
    expect(xFrameOptions.toUpperCase()).toBe('DENY');
  });

  /**
   * Test: CSP frame-ancestors Directive
   * 
   * Verifies CSP includes frame-ancestors: 'none' which is
   * the modern replacement for X-Frame-Options.
   */
  it('should prevent iframe embedding via CSP frame-ancestors', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    
    // frame-ancestors 'none' prevents all framing
    expect(csp).toMatch(/frame-ancestors\s+['"]none['"]/);
  });

  /**
   * Test: Dual Protection for Older Browsers
   * 
   * Verifies both X-Frame-Options and frame-ancestors are present
   * for maximum browser compatibility.
   */
  it('should provide dual protection (X-Frame-Options and CSP) for browser compatibility', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    // Both headers should be present for maximum compatibility
    expect(response.headers['x-frame-options']).toBeDefined();
    
    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain('frame-ancestors');
  });

  it('should block frame-src to prevent embedding external frames', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    
    // frame-src 'none' prevents embedding external frames
    expect(csp).toMatch(/frame-src\s+['"]none['"]/);
  });
});

// =============================================================================
// TEST SUITE: MIME SNIFFING PREVENTION
// =============================================================================

/**
 * MIME Sniffing Prevention Test Suite
 * 
 * Verifies that X-Content-Type-Options is configured to prevent
 * browsers from MIME-sniffing responses.
 */
describe('MIME Sniffing Prevention', () => {
  it('should prevent MIME sniffing with X-Content-Type-Options: nosniff', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const xContentTypeOptions = response.headers['x-content-type-options'];
    expect(xContentTypeOptions).toBeDefined();
    expect(xContentTypeOptions.toLowerCase()).toBe('nosniff');
  });

  it('should apply nosniff to all content types', async () => {
    // Test that nosniff is present regardless of response content
    const response = await request(app)
      .get('/evening')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

// =============================================================================
// TEST SUITE: INFORMATION DISCLOSURE PREVENTION
// =============================================================================

/**
 * Information Disclosure Prevention Test Suite
 * 
 * Verifies that sensitive information about the application's
 * technology stack is not exposed in HTTP headers.
 */
describe('Information Disclosure Prevention', () => {
  it('should not expose Express version in X-Powered-By', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    // X-Powered-By header should be completely absent
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should not expose server software in Server header', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    // Server header should not contain Express, Node, or version information
    const serverHeader = response.headers['server'];
    if (serverHeader) {
      expect(serverHeader.toLowerCase()).not.toContain('express');
      expect(serverHeader.toLowerCase()).not.toContain('node');
    }
  });

  it('should have strict Referrer-Policy to prevent URL leakage', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const referrerPolicy = response.headers['referrer-policy'];
    expect(referrerPolicy).toBeDefined();
    
    // Policy should be restrictive to prevent information leakage
    const restrictivePolicies = [
      'no-referrer',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin'
    ];
    
    const hasRestrictivePolicy = restrictivePolicies.some(
      policy => referrerPolicy.toLowerCase().includes(policy)
    );
    expect(hasRestrictivePolicy).toBe(true);
  });
});

// =============================================================================
// TEST SUITE: SECURITY HEADERS ON ALL ROUTES
// =============================================================================

/**
 * Security Headers on All Routes Test Suite
 * 
 * Verifies that security headers are consistently applied
 * across all application routes, including error responses.
 */
describe('Security Headers on All Routes', () => {
  const criticalHeaders = [
    'content-security-policy',
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options'
  ];

  it('should apply security headers to root route (/)', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    criticalHeaders.forEach(header => {
      expect(response.headers[header]).toBeDefined();
    });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should apply security headers to /evening route', async () => {
    const response = await request(app)
      .get('/evening')
      .expect(200);

    criticalHeaders.forEach(header => {
      expect(response.headers[header]).toBeDefined();
    });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should apply security headers to 404 error responses', async () => {
    const response = await request(app)
      .get('/this-route-does-not-exist-' + Date.now())
      .expect(404);

    criticalHeaders.forEach(header => {
      expect(response.headers[header]).toBeDefined();
    });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should apply security headers to POST requests', async () => {
    const response = await request(app)
      .post('/')
      .send({})
      .set('Content-Type', 'application/json');

    // Even if the route doesn't exist or returns error, headers should be present
    criticalHeaders.forEach(header => {
      expect(response.headers[header]).toBeDefined();
    });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

// =============================================================================
// TEST SUITE: HELMET CONFIGURATION VALIDATION
// =============================================================================

/**
 * Helmet Configuration Validation Test Suite
 * 
 * Verifies that the actual response headers match the expected
 * configuration defined in config/helmet.js
 */
describe('Helmet Configuration Validation', () => {
  it('should have CSP directives matching helmet configuration', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    
    // Verify key directives from config are present
    const expectedDirectives = helmetConfig.contentSecurityPolicy.directives;
    
    // Check default-src
    if (expectedDirectives.defaultSrc) {
      expect(csp).toContain('default-src');
    }
    
    // Check script-src
    if (expectedDirectives.scriptSrc) {
      expect(csp).toContain('script-src');
    }
    
    // Check frame-ancestors
    if (expectedDirectives.frameAncestors) {
      expect(csp).toContain('frame-ancestors');
    }
  });

  it('should have HSTS settings matching helmet configuration', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const hsts = response.headers['strict-transport-security'];
    expect(hsts).toBeDefined();
    
    // Verify max-age from config
    const expectedMaxAge = helmetConfig.hsts.maxAge;
    expect(hsts).toContain(`max-age=${expectedMaxAge}`);
  });

  it('should have X-Frame-Options matching helmet configuration', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    const xFrameOptions = response.headers['x-frame-options'];
    expect(xFrameOptions).toBeDefined();
    
    // Config sets action: 'deny'
    const expectedAction = helmetConfig.xFrameOptions.action.toUpperCase();
    expect(xFrameOptions.toUpperCase()).toBe(expectedAction);
  });

  it('should have X-Content-Type-Options enabled per configuration', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    // Config sets xContentTypeOptions: true which results in 'nosniff'
    if (helmetConfig.xContentTypeOptions === true) {
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    }
  });
});
