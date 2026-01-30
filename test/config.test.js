/**
 * Configuration Module Unit Tests
 * 
 * Tests for src/config/index.js to verify:
 * - Default values for host, port, env
 * - Environment variable overrides
 * - Port validation with warnings for invalid values
 * - Integer parsing for port values
 * 
 * Usage: npm run test:config
 * 
 * @module test/config.test
 */

'use strict';

const path = require('path');

// ---------------------------------------------------------------------------
// Test Runner Setup
// ---------------------------------------------------------------------------

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Store original environment variables for restoration after each test
 */
const originalEnv = { ...process.env };

/**
 * Get the full path to the config module for cache invalidation
 */
const configModulePath = path.resolve(__dirname, '../src/config/index.js');

/**
 * Reset environment and clear module cache before each test
 */
function resetEnvironment() {
  // Restore original environment variables
  process.env = { ...originalEnv };
  
  // Clear the config module from cache to get fresh require
  delete require.cache[configModulePath];
}

/**
 * Clear specific environment variables for isolated testing
 */
function clearEnvVars(...vars) {
  vars.forEach(v => {
    delete process.env[v];
  });
}

/**
 * Run a single test and track results
 * @param {string} name - Test description
 * @param {Function} testFn - Test function that returns true for pass, false for fail
 */
function test(name, testFn) {
  totalTests++;
  resetEnvironment();
  
  try {
    const result = testFn();
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

/**
 * Capture console.warn output during a function execution
 * @param {Function} fn - Function to execute while capturing warnings
 * @returns {{ result: *, warnings: string[] }} The function result and captured warnings
 */
function captureWarnings(fn) {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.join(' '));
  };
  
  let result;
  try {
    result = fn();
  } finally {
    console.warn = originalWarn;
  }
  
  return { result, warnings };
}

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

console.log('');
console.log('=====================================');
console.log('Configuration Module Tests');
console.log('=====================================');
console.log('');

// Test 1: Default host is 127.0.0.1
test('Default host is 127.0.0.1', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  const config = require('../src/config');
  return config.host === '127.0.0.1';
});

// Test 2: Default port is 3000
test('Default port is 3000', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  const config = require('../src/config');
  return config.port === 3000;
});

// Test 3: Default env is development
test('Default env is development', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  const config = require('../src/config');
  return config.env === 'development';
});

// Test 4: HOST environment variable overrides default
test('HOST environment variable overrides default', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  process.env.HOST = '0.0.0.0';
  const config = require('../src/config');
  return config.host === '0.0.0.0';
});

// Test 5: PORT environment variable overrides default
test('PORT environment variable overrides default', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  process.env.PORT = '8080';
  const config = require('../src/config');
  return config.port === 8080;
});

// Test 6: NODE_ENV environment variable overrides default
test('NODE_ENV environment variable overrides default', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  process.env.NODE_ENV = 'production';
  const config = require('../src/config');
  return config.env === 'production';
});

// Test 7: Invalid PORT value warns and falls back to default
test('Invalid PORT value warns and falls back to default', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  process.env.PORT = 'abc';
  
  const { result: config, warnings } = captureWarnings(() => {
    return require('../src/config');
  });
  
  const hasWarning = warnings.some(w => w.includes('Invalid PORT value'));
  return config.port === 3000 && hasWarning;
});

// Test 8: PORT 0 warns and falls back to default
test('PORT 0 warns and falls back to default', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  process.env.PORT = '0';
  
  const { result: config, warnings } = captureWarnings(() => {
    return require('../src/config');
  });
  
  const hasWarning = warnings.some(w => w.includes('out of valid range'));
  return config.port === 3000 && hasWarning;
});

// Test 9: PORT above 65535 warns and falls back to default
test('PORT above 65535 warns and falls back to default', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  process.env.PORT = '65536';
  
  const { result: config, warnings } = captureWarnings(() => {
    return require('../src/config');
  });
  
  const hasWarning = warnings.some(w => w.includes('out of valid range'));
  return config.port === 3000 && hasWarning;
});

// Test 10: PORT is parsed as integer (not string)
test('PORT is parsed as integer (not string)', () => {
  clearEnvVars('HOST', 'PORT', 'NODE_ENV');
  process.env.PORT = '3001';
  const config = require('../src/config');
  return typeof config.port === 'number' && config.port === 3001;
});

// ---------------------------------------------------------------------------
// Test Summary
// ---------------------------------------------------------------------------

console.log('');
console.log('=====================================');
console.log(`${passedTests}/${totalTests} tests passed`);
console.log('=====================================');
console.log('');

// Restore original environment
process.env = originalEnv;

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);
