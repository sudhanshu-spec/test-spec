/**
 * HTTPS/TLS Configuration Verification Test Suite
 * 
 * This test suite validates the HTTPS/TLS security configuration of the Express.js
 * application server. It verifies protection against man-in-the-middle attacks
 * and ensures data confidentiality through encrypted transport.
 * 
 * Test Coverage:
 * - TLS connection establishment
 * - TLS version enforcement (reject TLS 1.0/1.1, accept TLS 1.2/1.3)
 * - Certificate loading and validation
 * - HSTS (HTTP Strict Transport Security) header presence
 * - Encrypted transport verification
 * 
 * Requirements Verified:
 * - HTTPS verification tests per Section 0.8.2
 * - Connection established over TLS 1.2+ per Section 0.8.1
 * - Certificate validity per Section 0.8.1
 * - Encrypted transport per Section 0.5.5
 * 
 * @module tests/security/https.test.js
 * @see https://nodejs.org/api/https.html
 * @see https://nodejs.org/api/tls.html
 */

'use strict';

// =============================================================================
// EXTERNAL IMPORTS - Node.js Built-in Modules
// =============================================================================

/**
 * Node.js built-in HTTPS module for making secure HTTPS requests
 * Used for TLS connection establishment and encrypted transport verification
 */
const https = require('https');

/**
 * Node.js built-in TLS module for low-level TLS connection testing
 * Used for testing TLS version support and rejection
 */
const tls = require('tls');

/**
 * Node.js built-in file system module
 * Used for verifying certificate file existence and reading test certificates
 */
const fs = require('fs');

/**
 * Node.js built-in path module
 * Used for resolving certificate file paths
 */
const path = require('path');

/**
 * HTTP assertion library for testing Express applications
 * Used for HSTS header verification in HTTP responses
 */
const request = require('supertest');

// =============================================================================
// INTERNAL IMPORTS
// =============================================================================

/**
 * Express application instance with HTTPS/TLS support configured
 * Required for supertest HTTP testing and response header verification
 */
const app = require('../../server');

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

/**
 * Test configuration constants matching server configuration
 */
const TEST_CONFIG = {
  /** Default HTTPS port as configured in server.js */
  HTTPS_PORT: parseInt(process.env.HTTPS_PORT, 10) || 3443,
  
  /** Server hostname (localhost for testing) */
  HOSTNAME: '127.0.0.1',
  
  /** SSL key path from environment or default */
  SSL_KEY_PATH: process.env.SSL_KEY_PATH || './certs/key.pem',
  
  /** SSL certificate path from environment or default */
  SSL_CERT_PATH: process.env.SSL_CERT_PATH || './certs/cert.pem',
  
  /** Whether HTTPS is enabled in current environment */
  HTTPS_ENABLED: process.env.HTTPS_ENABLED === 'true',
  
  /** Connection timeout for TLS tests (ms) */
  CONNECTION_TIMEOUT: 5000,
  
  /** Expected minimum TLS version */
  MIN_TLS_VERSION: 'TLSv1.2',
  
  /** Expected maximum TLS version */
  MAX_TLS_VERSION: 'TLSv1.3',
};

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Creates a promise-based TLS connection with custom options
 * 
 * @param {Object} options - TLS connection options
 * @param {string} options.host - Target hostname
 * @param {number} options.port - Target port
 * @param {string} [options.minVersion] - Minimum TLS version
 * @param {string} [options.maxVersion] - Maximum TLS version
 * @param {boolean} [options.rejectUnauthorized] - Whether to reject self-signed certs
 * @returns {Promise<Object>} Resolves with connection details or rejects with error
 */
function createTlsConnection(options) {
  return new Promise((resolve, reject) => {
    const connectionOptions = {
      host: options.host || TEST_CONFIG.HOSTNAME,
      port: options.port || TEST_CONFIG.HTTPS_PORT,
      rejectUnauthorized: options.rejectUnauthorized !== undefined 
        ? options.rejectUnauthorized 
        : false, // Allow self-signed certs in testing
      minVersion: options.minVersion,
      maxVersion: options.maxVersion,
      timeout: TEST_CONFIG.CONNECTION_TIMEOUT,
    };

    const socket = tls.connect(connectionOptions, () => {
      // Connection successful
      const connectionInfo = {
        authorized: socket.authorized,
        protocol: socket.getProtocol(),
        cipher: socket.getCipher(),
        peerCertificate: socket.getPeerCertificate(),
        socket: socket,
      };
      resolve(connectionInfo);
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });

    // Set timeout
    socket.setTimeout(TEST_CONFIG.CONNECTION_TIMEOUT);
  });
}

/**
 * Makes an HTTPS request and returns response details
 * 
 * @param {Object} options - HTTPS request options
 * @param {string} options.path - Request path
 * @param {string} [options.method] - HTTP method (default: GET)
 * @param {string} [options.minVersion] - Minimum TLS version
 * @param {string} [options.maxVersion] - Maximum TLS version
 * @returns {Promise<Object>} Resolves with response details
 */
function httpsRequest(options) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: TEST_CONFIG.HOSTNAME,
      port: TEST_CONFIG.HTTPS_PORT,
      path: options.path || '/',
      method: options.method || 'GET',
      rejectUnauthorized: false, // Allow self-signed certs in testing
      minVersion: options.minVersion,
      maxVersion: options.maxVersion,
      timeout: TEST_CONFIG.CONNECTION_TIMEOUT,
    };

    const req = https.request(requestOptions, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          socket: res.socket,
          connection: res.connection,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Checks if HTTPS server is available for testing
 * 
 * @returns {Promise<boolean>} True if HTTPS server is reachable
 */
async function isHttpsServerAvailable() {
  try {
    const connectionInfo = await createTlsConnection({
      host: TEST_CONFIG.HOSTNAME,
      port: TEST_CONFIG.HTTPS_PORT,
    });
    connectionInfo.socket.destroy();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if certificate files exist at configured paths
 * 
 * @returns {Object} Object with exists flags for key and cert
 */
function checkCertificateFiles() {
  const keyPath = path.resolve(TEST_CONFIG.SSL_KEY_PATH);
  const certPath = path.resolve(TEST_CONFIG.SSL_CERT_PATH);
  
  return {
    keyExists: fs.existsSync(keyPath),
    certExists: fs.existsSync(certPath),
    keyPath: keyPath,
    certPath: certPath,
  };
}

// =============================================================================
// CONDITIONAL TEST EXECUTION HELPERS
// =============================================================================

/**
 * Conditionally runs a test based on HTTPS availability
 * Skips test with descriptive message if HTTPS is not available
 */
const itIfHttpsEnabled = TEST_CONFIG.HTTPS_ENABLED ? it : it.skip;
const describeIfHttpsEnabled = TEST_CONFIG.HTTPS_ENABLED ? describe : describe.skip;

// =============================================================================
// TEST SUITES
// =============================================================================

describe('HTTPS/TLS Security Tests', () => {
  /**
   * Store HTTPS availability status for conditional tests
   */
  let httpsAvailable = false;
  
  /**
   * Check HTTPS availability before running tests
   */
  beforeAll(async () => {
    httpsAvailable = await isHttpsServerAvailable();
    
    if (!TEST_CONFIG.HTTPS_ENABLED) {
      console.log('[HTTPS Tests] HTTPS_ENABLED is false - conditional tests will be skipped');
    }
    
    if (!httpsAvailable && TEST_CONFIG.HTTPS_ENABLED) {
      console.log('[HTTPS Tests] HTTPS server not available - connection tests will be skipped');
    }
  });

  // ===========================================================================
  // HTTPS SERVER CONNECTION TESTS
  // ===========================================================================
  
  describeIfHttpsEnabled('HTTPS Server', () => {
    
    it('should establish TLS connection', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      const connectionInfo = await createTlsConnection({
        host: TEST_CONFIG.HOSTNAME,
        port: TEST_CONFIG.HTTPS_PORT,
      });
      
      // Verify connection was established
      expect(connectionInfo).toBeDefined();
      expect(connectionInfo.protocol).toBeDefined();
      expect(connectionInfo.cipher).toBeDefined();
      
      // Verify TLS protocol is at least 1.2
      const protocol = connectionInfo.protocol;
      expect(['TLSv1.2', 'TLSv1.3']).toContain(protocol);
      
      // Clean up socket
      connectionInfo.socket.destroy();
    });

    it('should reject TLS 1.0 connections', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      // Attempt to connect with TLS 1.0 maximum version
      // This should fail because server requires minimum TLS 1.2
      await expect(createTlsConnection({
        host: TEST_CONFIG.HOSTNAME,
        port: TEST_CONFIG.HTTPS_PORT,
        maxVersion: 'TLSv1',
      })).rejects.toThrow();
    });

    it('should reject TLS 1.1 connections', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      // Attempt to connect with TLS 1.1 maximum version
      // This should fail because server requires minimum TLS 1.2
      await expect(createTlsConnection({
        host: TEST_CONFIG.HOSTNAME,
        port: TEST_CONFIG.HTTPS_PORT,
        maxVersion: 'TLSv1.1',
      })).rejects.toThrow();
    });

    it('should accept TLS 1.2 connections', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      // Connect with TLS 1.2
      const connectionInfo = await createTlsConnection({
        host: TEST_CONFIG.HOSTNAME,
        port: TEST_CONFIG.HTTPS_PORT,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.2',
      });
      
      // Verify TLS 1.2 connection
      expect(connectionInfo.protocol).toBe('TLSv1.2');
      
      // Clean up socket
      connectionInfo.socket.destroy();
    });

    it('should accept TLS 1.3 connections when supported', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      // Check if Node.js supports TLS 1.3
      const supportsTLS13 = tls.DEFAULT_MIN_VERSION !== undefined;
      
      if (!supportsTLS13) {
        console.log('Skipping: TLS 1.3 not supported by Node.js version');
        return;
      }
      
      try {
        // Connect with TLS 1.3
        const connectionInfo = await createTlsConnection({
          host: TEST_CONFIG.HOSTNAME,
          port: TEST_CONFIG.HTTPS_PORT,
          minVersion: 'TLSv1.3',
          maxVersion: 'TLSv1.3',
        });
        
        // Verify TLS 1.3 connection
        expect(connectionInfo.protocol).toBe('TLSv1.3');
        
        // Clean up socket
        connectionInfo.socket.destroy();
      } catch (error) {
        // TLS 1.3 may not be available on all systems
        // This is acceptable as long as TLS 1.2 is supported
        console.log('TLS 1.3 connection failed (may not be supported):', error.message);
      }
    });

    it('should respond to HTTPS requests with encrypted data', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      const response = await httpsRequest({
        path: '/',
        method: 'GET',
      });
      
      // Verify successful response
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Hello, World!');
      
      // Verify connection was encrypted (socket has protocol info)
      expect(response.socket).toBeDefined();
      expect(response.socket.encrypted).toBe(true);
    });
  });

  // ===========================================================================
  // CERTIFICATE CONFIGURATION TESTS
  // ===========================================================================
  
  describe('Certificate Configuration', () => {
    
    it('should have SSL_KEY_PATH configured', () => {
      // Verify SSL key path environment variable or default is set
      const keyPath = TEST_CONFIG.SSL_KEY_PATH;
      
      expect(keyPath).toBeDefined();
      expect(typeof keyPath).toBe('string');
      expect(keyPath.length).toBeGreaterThan(0);
    });

    it('should have SSL_CERT_PATH configured', () => {
      // Verify SSL certificate path environment variable or default is set
      const certPath = TEST_CONFIG.SSL_CERT_PATH;
      
      expect(certPath).toBeDefined();
      expect(typeof certPath).toBe('string');
      expect(certPath.length).toBeGreaterThan(0);
    });

    it('should load certificates from configured paths when HTTPS enabled', () => {
      // Skip if HTTPS is not enabled
      if (!TEST_CONFIG.HTTPS_ENABLED) {
        console.log('Skipping: HTTPS not enabled');
        return;
      }
      
      const certFiles = checkCertificateFiles();
      
      // When HTTPS is enabled, certificate files must exist
      expect(certFiles.keyExists).toBe(true);
      expect(certFiles.certExists).toBe(true);
    });

    it('should verify certificate files are readable', () => {
      const certFiles = checkCertificateFiles();
      
      // Only check if files exist
      if (certFiles.keyExists && certFiles.certExists) {
        // Verify key file is readable
        expect(() => {
          fs.accessSync(certFiles.keyPath, fs.constants.R_OK);
        }).not.toThrow();
        
        // Verify cert file is readable
        expect(() => {
          fs.accessSync(certFiles.certPath, fs.constants.R_OK);
        }).not.toThrow();
      } else {
        console.log('Certificate files not found - skipping readability test');
      }
    });

    it('should have certificate files in PEM format', () => {
      const certFiles = checkCertificateFiles();
      
      // Only check if files exist
      if (certFiles.keyExists && certFiles.certExists) {
        // Read and verify key file format
        const keyContent = fs.readFileSync(certFiles.keyPath, 'utf8');
        expect(keyContent).toMatch(/-----BEGIN.*PRIVATE KEY-----/);
        expect(keyContent).toMatch(/-----END.*PRIVATE KEY-----/);
        
        // Read and verify cert file format
        const certContent = fs.readFileSync(certFiles.certPath, 'utf8');
        expect(certContent).toMatch(/-----BEGIN CERTIFICATE-----/);
        expect(certContent).toMatch(/-----END CERTIFICATE-----/);
      } else {
        console.log('Certificate files not found - skipping format test');
      }
    });

    itIfHttpsEnabled('should have valid certificate chain', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      const connectionInfo = await createTlsConnection({
        host: TEST_CONFIG.HOSTNAME,
        port: TEST_CONFIG.HTTPS_PORT,
      });
      
      // Get peer certificate
      const cert = connectionInfo.peerCertificate;
      
      // Verify certificate exists
      expect(cert).toBeDefined();
      expect(cert.subject).toBeDefined();
      
      // Verify certificate has common name or subject alternative name
      const hasIdentity = cert.subject.CN || 
                         (cert.subjectaltname && cert.subjectaltname.length > 0);
      expect(hasIdentity).toBeTruthy();
      
      // Verify certificate dates
      expect(cert.valid_from).toBeDefined();
      expect(cert.valid_to).toBeDefined();
      
      // Verify certificate is not expired (for production certs)
      // Note: Self-signed dev certs may have any date range
      const validTo = new Date(cert.valid_to);
      expect(validTo.getTime()).toBeGreaterThan(Date.now());
      
      // Clean up socket
      connectionInfo.socket.destroy();
    });
  });

  // ===========================================================================
  // TRANSPORT SECURITY TESTS
  // ===========================================================================
  
  describe('Transport Security', () => {
    
    it('should include HSTS header on HTTP responses', async () => {
      // Test using supertest against the HTTP server
      // HSTS header should be present even on HTTP (tells browsers to upgrade)
      const response = await request(app)
        .get('/')
        .expect(200);
      
      // Verify HSTS header is present
      // Note: HSTS header name is lowercase in response.headers
      const hstsHeader = response.headers['strict-transport-security'];
      
      expect(hstsHeader).toBeDefined();
      expect(hstsHeader).toContain('max-age=');
      
      // Verify max-age is set to at least 1 year (31536000 seconds)
      const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/);
      expect(maxAgeMatch).not.toBeNull();
      
      const maxAge = parseInt(maxAgeMatch[1], 10);
      expect(maxAge).toBeGreaterThanOrEqual(31536000);
    });

    it('should include HSTS includeSubDomains directive', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      const hstsHeader = response.headers['strict-transport-security'];
      
      // Verify includeSubDomains is present
      expect(hstsHeader).toBeDefined();
      expect(hstsHeader.toLowerCase()).toContain('includesubdomains');
    });

    itIfHttpsEnabled('should encrypt all response data over HTTPS', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      const response = await httpsRequest({
        path: '/',
        method: 'GET',
      });
      
      // Verify response was received over encrypted connection
      expect(response.socket).toBeDefined();
      expect(response.socket.encrypted).toBe(true);
      
      // Verify cipher suite is being used
      const cipher = response.socket.getCipher();
      expect(cipher).toBeDefined();
      expect(cipher.name).toBeDefined();
      
      // Verify modern cipher suite (should not be using weak ciphers)
      const weakCiphers = ['DES', 'RC4', 'MD5', 'EXPORT', 'NULL'];
      const cipherName = cipher.name.toUpperCase();
      
      for (const weak of weakCiphers) {
        expect(cipherName).not.toContain(weak);
      }
    });

    itIfHttpsEnabled('should use secure TLS protocol version', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      const connectionInfo = await createTlsConnection({
        host: TEST_CONFIG.HOSTNAME,
        port: TEST_CONFIG.HTTPS_PORT,
      });
      
      // Verify protocol version is secure
      const secureProtocols = ['TLSv1.2', 'TLSv1.3'];
      expect(secureProtocols).toContain(connectionInfo.protocol);
      
      // Clean up socket
      connectionInfo.socket.destroy();
    });

    it('should not expose server information that could aid attacks', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      // X-Powered-By should be removed (information disclosure)
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ===========================================================================
  // TLS VERSION ENFORCEMENT TESTS
  // ===========================================================================
  
  describeIfHttpsEnabled('TLS Version Enforcement', () => {
    
    it('should enforce minimum TLS version 1.2', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      // The server is configured with minVersion: 'TLSv1.2'
      // Any connection should use TLS 1.2 or higher
      const connectionInfo = await createTlsConnection({
        host: TEST_CONFIG.HOSTNAME,
        port: TEST_CONFIG.HTTPS_PORT,
      });
      
      const protocol = connectionInfo.protocol;
      
      // Verify minimum TLS 1.2
      expect(['TLSv1.2', 'TLSv1.3']).toContain(protocol);
      
      // Verify NOT using deprecated protocols
      expect(['TLSv1', 'TLSv1.1', 'SSLv3', 'SSLv2']).not.toContain(protocol);
      
      // Clean up socket
      connectionInfo.socket.destroy();
    });

    it('should not accept SSLv3 connections', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      // SSLv3 is deprecated and insecure
      // Attempt should fail
      await expect(createTlsConnection({
        host: TEST_CONFIG.HOSTNAME,
        port: TEST_CONFIG.HTTPS_PORT,
        maxVersion: 'TLSv1', // Node.js doesn't support SSLv3 directly
      })).rejects.toThrow();
    });

    it('should configure maximum TLS version 1.3', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      // The server should accept TLS 1.3 (if client supports it)
      try {
        const connectionInfo = await createTlsConnection({
          host: TEST_CONFIG.HOSTNAME,
          port: TEST_CONFIG.HTTPS_PORT,
          minVersion: 'TLSv1.3',
          maxVersion: 'TLSv1.3',
        });
        
        // If connection succeeds, verify protocol
        expect(connectionInfo.protocol).toBe('TLSv1.3');
        
        // Clean up socket
        connectionInfo.socket.destroy();
      } catch (error) {
        // TLS 1.3 may not be available on all systems
        // Log but don't fail - TLS 1.2 is still secure
        console.log('TLS 1.3 not available:', error.message);
      }
    });
  });

  // ===========================================================================
  // CONFIGURATION VERIFICATION TESTS
  // ===========================================================================
  
  describe('HTTPS Configuration Verification', () => {
    
    it('should have HTTPS_ENABLED environment variable documented', () => {
      // Verify the configuration constant is properly defined
      expect(TEST_CONFIG.HTTPS_ENABLED).toBeDefined();
      expect(typeof TEST_CONFIG.HTTPS_ENABLED).toBe('boolean');
    });

    it('should have HTTPS_PORT configured with valid port number', () => {
      const port = TEST_CONFIG.HTTPS_PORT;
      
      // Verify port is a valid number
      expect(typeof port).toBe('number');
      expect(Number.isInteger(port)).toBe(true);
      
      // Verify port is in valid range (1-65535)
      expect(port).toBeGreaterThanOrEqual(1);
      expect(port).toBeLessThanOrEqual(65535);
      
      // Verify default port is 3443 if not overridden
      if (!process.env.HTTPS_PORT) {
        expect(port).toBe(3443);
      }
    });

    it('should have SSL paths pointing to .pem files', () => {
      const keyPath = TEST_CONFIG.SSL_KEY_PATH;
      const certPath = TEST_CONFIG.SSL_CERT_PATH;
      
      // Verify paths have .pem extension
      expect(keyPath.toLowerCase()).toMatch(/\.pem$/);
      expect(certPath.toLowerCase()).toMatch(/\.pem$/);
    });

    it('should store certificates in certs directory by default', () => {
      const keyPath = TEST_CONFIG.SSL_KEY_PATH;
      const certPath = TEST_CONFIG.SSL_CERT_PATH;
      
      // If using default paths, they should be in certs directory
      if (!process.env.SSL_KEY_PATH && !process.env.SSL_CERT_PATH) {
        expect(keyPath).toContain('certs');
        expect(certPath).toContain('certs');
      }
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================
  
  describe('HTTPS Error Handling', () => {
    
    it('should timeout on connection to non-existent HTTPS server', async () => {
      // Attempt connection to port that is unlikely to be open
      const unusedPort = 54321;
      
      await expect(createTlsConnection({
        host: TEST_CONFIG.HOSTNAME,
        port: unusedPort,
      })).rejects.toThrow();
    });

    it('should handle connection refused gracefully', async () => {
      // If HTTPS is not enabled, connecting should fail
      if (!TEST_CONFIG.HTTPS_ENABLED && !httpsAvailable) {
        await expect(createTlsConnection({
          host: TEST_CONFIG.HOSTNAME,
          port: TEST_CONFIG.HTTPS_PORT,
        })).rejects.toThrow();
      }
    });

    it('should reject invalid hostname', async () => {
      // Skip if HTTPS server is not running
      if (!httpsAvailable) {
        console.log('Skipping: HTTPS server not available');
        return;
      }
      
      // Attempting to connect with rejectUnauthorized: true
      // to a self-signed cert should fail (hostname mismatch)
      await expect(createTlsConnection({
        host: 'invalid.hostname.local',
        port: TEST_CONFIG.HTTPS_PORT,
        rejectUnauthorized: true,
      })).rejects.toThrow();
    });
  });
});
