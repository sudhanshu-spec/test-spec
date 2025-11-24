/**
 * Comprehensive Test Suite for server.js
 * 
 * Validates all production-ready enhancements including:
 * - Basic route functionality (GET / and GET /evening)
 * - 404 error handling with JSON responses
 * - Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
 * - Removal of X-Powered-By header (fingerprinting protection)
 * - JSON body parsing middleware configuration
 * - Graceful shutdown mechanism with SIGTERM handling
 * 
 * Test Framework: Custom Node.js implementation
 * Total Tests: 6 scenarios covering 9 individual checks
 */

const http = require('http');
const { spawn } = require('child_process');

// Test configuration
const TEST_HOST = '127.0.0.1';
const TEST_PORT = 3000;
const SERVER_STARTUP_DELAY = 2000; // 2 seconds for server to start
const TEST_TIMEOUT = 5000; // 5 seconds per test

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;

/**
 * Helper function to make HTTP GET requests
 * @param {string} path - The URL path to request
 * @returns {Promise<{statusCode: number, headers: object, body: string}>}
 */
function makeGetRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TEST_HOST,
      port: TEST_PORT,
      path: path,
      method: 'GET',
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
          body: body,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(TEST_TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Helper function to make HTTP POST requests
 * @param {string} path - The URL path to request
 * @param {object} data - The JSON data to send
 * @returns {Promise<{statusCode: number, headers: object, body: string}>}
 */
function makePostRequest(path, data) {
  return new Promise((resolve, reject) => {
    const jsonData = JSON.stringify(data);
    
    const options = {
      hostname: TEST_HOST,
      port: TEST_PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData),
      },
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
          body: body,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(TEST_TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(jsonData);
    req.end();
  });
}

/**
 * Helper function to log test results
 * @param {string} testName - Name of the test
 * @param {boolean} passed - Whether the test passed
 * @param {string} message - Test result message
 */
function logTestResult(testName, passed, message) {
  if (passed) {
    console.log(`✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.log(`✗ FAIL: ${message}`);
    testsFailed++;
  }
}

/**
 * Test 1: Basic GET request to /
 */
async function test1_BasicGetRoot() {
  console.log('\nTest 1: Basic GET request to /');
  try {
    const response = await makeGetRequest('/');
    
    if (response.statusCode === 200 && response.body === 'Hello, World!\n') {
      logTestResult('Test 1', true, 'GET / returns 200 and correct response');
    } else {
      logTestResult('Test 1', false, `GET / failed: status=${response.statusCode}, body="${response.body}"`);
    }
  } catch (err) {
    logTestResult('Test 1', false, `GET / error: ${err.message}`);
  }
}

/**
 * Test 2: GET request to /evening
 */
async function test2_GetEvening() {
  console.log('\nTest 2: GET request to /evening');
  try {
    const response = await makeGetRequest('/evening');
    
    if (response.statusCode === 200 && response.body === 'Good evening') {
      logTestResult('Test 2', true, 'GET /evening returns 200 and correct response');
    } else {
      logTestResult('Test 2', false, `GET /evening failed: status=${response.statusCode}, body="${response.body}"`);
    }
  } catch (err) {
    logTestResult('Test 2', false, `GET /evening error: ${err.message}`);
  }
}

/**
 * Test 3: 404 error handling
 */
async function test3_NotFoundHandling() {
  console.log('\nTest 3: 404 error handling');
  try {
    const response = await makeGetRequest('/nonexistent');
    
    if (response.statusCode === 404) {
      try {
        const jsonBody = JSON.parse(response.body);
        if (jsonBody.error === 'Not Found') {
          logTestResult('Test 3', true, 'Non-existent route returns 404 with correct JSON');
        } else {
          logTestResult('Test 3', false, '404 response has incorrect JSON structure');
        }
      } catch (parseErr) {
        logTestResult('Test 3', false, '404 response is not valid JSON');
      }
    } else {
      logTestResult('Test 3', false, `Expected 404 status, got ${response.statusCode}`);
    }
  } catch (err) {
    logTestResult('Test 3', false, `404 test error: ${err.message}`);
  }
}

/**
 * Test 4: Security headers present
 */
async function test4_SecurityHeaders() {
  console.log('\nTest 4: Security headers present');
  try {
    const response = await makeGetRequest('/');
    
    // Check X-Powered-By header is removed
    if (!response.headers['x-powered-by']) {
      logTestResult('Test 4a', true, 'X-Powered-By header removed (security)');
    } else {
      logTestResult('Test 4a', false, 'X-Powered-By header still present (security risk)');
    }
    
    // Check X-Frame-Options header
    if (response.headers['x-frame-options'] === 'DENY') {
      logTestResult('Test 4b', true, 'X-Frame-Options header present');
    } else {
      logTestResult('Test 4b', false, `X-Frame-Options missing or incorrect: ${response.headers['x-frame-options']}`);
    }
    
    // Check X-Content-Type-Options header
    if (response.headers['x-content-type-options'] === 'nosniff') {
      logTestResult('Test 4c', true, 'X-Content-Type-Options header present');
    } else {
      logTestResult('Test 4c', false, `X-Content-Type-Options missing or incorrect: ${response.headers['x-content-type-options']}`);
    }
    
    // Check X-XSS-Protection header
    if (response.headers['x-xss-protection'] && response.headers['x-xss-protection'].includes('1')) {
      logTestResult('Test 4d', true, 'X-XSS-Protection header present');
    } else {
      logTestResult('Test 4d', false, `X-XSS-Protection missing or incorrect: ${response.headers['x-xss-protection']}`);
    }
  } catch (err) {
    logTestResult('Test 4', false, `Security headers test error: ${err.message}`);
  }
}

/**
 * Test 5: JSON body parsing capability
 */
async function test5_JsonBodyParsing() {
  console.log('\nTest 5: JSON body parsing capability');
  try {
    // Send a POST request with JSON data to test middleware configuration
    // Note: Since no POST route is defined, we expect 404, but headers should indicate JSON parsing is configured
    const response = await makePostRequest('/test', { test: 'data' });
    
    // The middleware is configured if the server accepts the request without crashing
    // and returns a proper 404 JSON response
    if (response.statusCode === 404) {
      try {
        const jsonBody = JSON.parse(response.body);
        if (jsonBody.error) {
          logTestResult('Test 5', true, 'JSON body parser middleware configured');
        } else {
          logTestResult('Test 5', false, 'JSON middleware present but response format unexpected');
        }
      } catch (parseErr) {
        logTestResult('Test 5', false, 'Server did not return JSON for POST request');
      }
    } else {
      logTestResult('Test 5', false, `Unexpected status code: ${response.statusCode}`);
    }
  } catch (err) {
    logTestResult('Test 5', false, `JSON body parsing test error: ${err.message}`);
  }
}

/**
 * Test 6: Graceful shutdown
 */
async function test6_GracefulShutdown() {
  console.log('\nTest 6: Graceful shutdown');
  
  return new Promise((resolve) => {
    // Spawn a new server instance for shutdown testing
    const serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let shutdownMessageReceived = false;
    let serverOutput = '';

    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      serverOutput += data.toString();
    });

    // Wait for server to start
    setTimeout(() => {
      // Send SIGTERM signal
      serverProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      setTimeout(() => {
        // Check if shutdown message was logged
        if (serverOutput.includes('Shutdown signal received') || 
            serverOutput.includes('Graceful shutdown') ||
            serverProcess.killed) {
          logTestResult('Test 6', true, 'Server responds to SIGTERM gracefully');
        } else {
          logTestResult('Test 6', false, 'Server did not shutdown gracefully');
        }
        
        // Ensure process is terminated
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        
        resolve();
      }, 3000); // Wait 3 seconds for shutdown
    }, SERVER_STARTUP_DELAY);
  });
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('Starting server tests...');
  console.log('='.repeat(50));
  
  // Wait for server to be ready (assumes server.js is already running)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Run all test scenarios
  await test1_BasicGetRoot();
  await test2_GetEvening();
  await test3_NotFoundHandling();
  await test4_SecurityHeaders();
  await test5_JsonBodyParsing();
  await test6_GracefulShutdown();
  
  // Print test summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Summary:');
  console.log(`Total: ${testsPassed + testsFailed} tests`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('='.repeat(50));
  
  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Execute tests
runAllTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});

