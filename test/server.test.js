/**
 * Server Integration Tests
 * 
 * Integration tests for Express server endpoints.
 * 
 * IMPORTANT: These tests require a running server at http://127.0.0.1:3000
 * Start the server before running tests: node server.js
 * 
 * Tests verify:
 * - GET / returns "Hello, World!"
 * - GET /evening returns "Good evening"
 * - GET /nonexistent returns 404
 * - 404 response is valid JSON with error format
 * - POST /api/unknown returns 404
 * - 404 response Content-Type is application/json
 * - GET / Content-Type is text/html
 * 
 * Usage: npm run test:server
 * 
 * @module test/server.test
 */

'use strict';

const http = require('http');

// ---------------------------------------------------------------------------
// Test Configuration
// ---------------------------------------------------------------------------

const BASE_URL = 'http://127.0.0.1:3000';
const HOSTNAME = '127.0.0.1';
const PORT = 3000;

// ---------------------------------------------------------------------------
// Test Runner Setup
// ---------------------------------------------------------------------------

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Make an HTTP request and return a promise with the response
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - Request path (e.g., '/', '/evening')
 * @returns {Promise<{statusCode: number, headers: Object, body: string}>}
 */
function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOSTNAME,
      port: PORT,
      path: path,
      method: method,
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
}

/**
 * Run a single async test and track results
 * @param {string} name - Test description
 * @param {Function} testFn - Async test function that returns true for pass, false for fail
 */
async function test(name, testFn) {
  totalTests++;
  
  try {
    const result = await testFn();
    if (result) {
      passedTests++;
      console.log(`✓ PASS: ${name}`);
    } else {
      failedTests++;
      console.log(`✗ FAIL: ${name}`);
    }
  } catch (err) {
    failedTests++;
    console.log(`✗ FAIL: ${name}`);
    console.log(`  Error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------

async function runTests() {
  console.log('');
  console.log('=====================================');
  console.log('Server Integration Tests');
  console.log('=====================================');
  console.log(`Testing server at ${BASE_URL}`);
  console.log('');

  // Check if server is running
  try {
    await makeRequest('GET', '/');
    console.log('Server connection verified.');
    console.log('');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('');
      console.log('=====================================');
      console.log('ERROR: Server not running');
      console.log('=====================================');
      console.log('');
      console.log('Start the server before running tests:');
      console.log('  node server.js');
      console.log('');
      console.log('Then run tests in a separate terminal:');
      console.log('  npm run test:server');
      console.log('');
      process.exit(1);
    }
    throw err;
  }

  // Test 1: GET / returns Hello, World!
  await test('GET / returns Hello, World!', async () => {
    const res = await makeRequest('GET', '/');
    return res.statusCode === 200 && res.body.includes('Hello, World!');
  });

  // Test 2: GET /evening returns Good evening
  await test('GET /evening returns Good evening', async () => {
    const res = await makeRequest('GET', '/evening');
    return res.statusCode === 200 && res.body === 'Good evening';
  });

  // Test 3: GET /nonexistent returns 404
  await test('GET /nonexistent returns 404', async () => {
    const res = await makeRequest('GET', '/nonexistent');
    return res.statusCode === 404;
  });

  // Test 4: 404 response is valid JSON with error format
  await test('404 response is valid JSON with error format', async () => {
    const res = await makeRequest('GET', '/nonexistent');
    try {
      const json = JSON.parse(res.body);
      return (
        json.status === 'error' &&
        typeof json.message === 'string' &&
        json.statusCode === 404
      );
    } catch (e) {
      return false;
    }
  });

  // Test 5: POST /api/unknown returns 404
  await test('POST /api/unknown returns 404', async () => {
    const res = await makeRequest('POST', '/api/unknown');
    return res.statusCode === 404;
  });

  // Test 6: 404 response Content-Type is application/json
  await test('404 response Content-Type is application/json', async () => {
    const res = await makeRequest('GET', '/nonexistent');
    const contentType = res.headers['content-type'] || '';
    return contentType.includes('application/json');
  });

  // Test 7: GET / Content-Type is text/html
  await test('GET / Content-Type is text/html', async () => {
    const res = await makeRequest('GET', '/');
    const contentType = res.headers['content-type'] || '';
    return contentType.includes('text/html');
  });

  // ---------------------------------------------------------------------------
  // Test Summary
  // ---------------------------------------------------------------------------

  console.log('');
  console.log('=====================================');
  console.log(`${passedTests}/${totalTests} tests passed`);
  console.log('=====================================');
  console.log('');

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
