/**
 * tests/dashboard.test.js
 *
 * Integration tests for the collapsible dashboard feature.
 * Validates that the Express server correctly serves static dashboard assets
 * (HTML, CSS, JavaScript) and preserves the existing API endpoints.
 *
 * Uses ONLY Node.js built-in modules — no external test frameworks.
 * Spawns server.js as a child process to avoid side-effect imports.
 *
 * Run: node --test tests/dashboard.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

/* ====================================================================== */
/*  Constants                                                              */
/* ====================================================================== */

/** Base URL the Express server binds to (per server.js configuration). */
const BASE_URL = 'http://127.0.0.1:3000';

/** Maximum milliseconds to wait for the server process to emit its ready message. */
const SERVER_START_TIMEOUT_MS = 10000;

/** Maximum milliseconds to wait for the server process to exit after SIGTERM. */
const SERVER_STOP_TIMEOUT_MS = 5000;

/** Maximum milliseconds to wait for an individual HTTP response. */
const HTTP_REQUEST_TIMEOUT_MS = 5000;

/* ====================================================================== */
/*  Server lifecycle helpers                                               */
/* ====================================================================== */

/**
 * Spawns `node server.js` as a child process and resolves once the server
 * prints its "Server running at" banner to stdout, indicating it is ready
 * to accept connections.
 *
 * @returns {Promise<import('child_process').ChildProcess>} The spawned process.
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let startupResolved = false;
    let stderrBuffer = '';

    const timeout = setTimeout(() => {
      if (!startupResolved) {
        startupResolved = true;
        serverProcess.kill('SIGKILL');
        reject(
          new Error(
            `Server failed to start within ${SERVER_START_TIMEOUT_MS}ms. stderr: ${stderrBuffer}`
          )
        );
      }
    }, SERVER_START_TIMEOUT_MS);

    serverProcess.stdout.on('data', (chunk) => {
      const output = chunk.toString();
      if (!startupResolved && output.includes('Server running at')) {
        startupResolved = true;
        clearTimeout(timeout);
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
    });

    serverProcess.on('error', (err) => {
      if (!startupResolved) {
        startupResolved = true;
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn server process: ${err.message}`));
      }
    });

    serverProcess.on('exit', (code) => {
      if (!startupResolved) {
        startupResolved = true;
        clearTimeout(timeout);
        reject(
          new Error(
            `Server process exited unexpectedly with code ${code}. stderr: ${stderrBuffer}`
          )
        );
      }
    });
  });
}

/**
 * Gracefully stops the server child process by sending SIGTERM, then
 * force-kills with SIGKILL if it does not exit within the timeout.
 *
 * @param {import('child_process').ChildProcess} serverProcess
 * @returns {Promise<void>}
 */
function stopServer(serverProcess) {
  return new Promise((resolve) => {
    if (!serverProcess || serverProcess.killed) {
      resolve();
      return;
    }

    let resolved = false;

    const forceKillTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          serverProcess.kill('SIGKILL');
        } catch (_ignored) {
          /* Process may already have exited. */
        }
        resolve();
      }
    }, SERVER_STOP_TIMEOUT_MS);

    serverProcess.on('exit', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(forceKillTimer);
        resolve();
      }
    });

    try {
      serverProcess.kill('SIGTERM');
    } catch (_ignored) {
      /* Process may already have exited. */
      if (!resolved) {
        resolved = true;
        clearTimeout(forceKillTimer);
        resolve();
      }
    }
  });
}

/* ====================================================================== */
/*  HTTP request helper                                                    */
/* ====================================================================== */

/**
 * Issues an HTTP GET request to the server and collects the full response.
 *
 * @param {string} urlPath - The path portion of the URL (e.g., '/dashboard.html').
 * @returns {Promise<{statusCode: number, headers: object, body: string}>}
 */
function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}${urlPath}`, (res) => {
      let body = '';
      res.setEncoding('utf8');
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
      reject(new Error(`HTTP GET ${urlPath} failed: ${err.message}`));
    });
    req.setTimeout(HTTP_REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`HTTP GET ${urlPath} timed out after ${HTTP_REQUEST_TIMEOUT_MS}ms`));
    });
  });
}

/* ====================================================================== */
/*  Test suite                                                             */
/* ====================================================================== */

describe('Dashboard Static File Serving', () => {
  /** @type {import('child_process').ChildProcess | null} */
  let serverProcess = null;

  before(async () => {
    serverProcess = await startServer();
  });

  after(async () => {
    await stopServer(serverProcess);
    serverProcess = null;
  });

  /* ------------------------------------------------------------------ */
  /*  Group 1: Existing Endpoints Preservation                           */
  /* ------------------------------------------------------------------ */

  describe('Existing Endpoints Preservation', () => {
    it('GET / returns Hello World with trailing newline', async () => {
      const res = await httpGet('/');
      assert.strictEqual(res.statusCode, 200, 'Expected 200 status for GET /');
      assert.strictEqual(
        res.body,
        'Hello, World!\n',
        'Response body must be exactly "Hello, World!\\n" (byte-perfect)'
      );
    });

    it('GET /evening returns Good evening without trailing newline', async () => {
      const res = await httpGet('/evening');
      assert.strictEqual(res.statusCode, 200, 'Expected 200 status for GET /evening');
      assert.strictEqual(
        res.body,
        'Good evening',
        'Response body must be exactly "Good evening" with no trailing newline'
      );
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 2: Static Asset Delivery                                     */
  /* ------------------------------------------------------------------ */

  describe('Static Asset Delivery', () => {
    it('GET /dashboard.html returns 200 with text/html content type', async () => {
      const res = await httpGet('/dashboard.html');
      assert.strictEqual(res.statusCode, 200, 'Expected 200 status for GET /dashboard.html');
      assert.ok(
        res.headers['content-type'].includes('text/html'),
        `Expected content-type to include "text/html", got "${res.headers['content-type']}"`
      );
      assert.ok(
        res.body.includes('<!DOCTYPE html>') || res.body.includes('<html'),
        'Response body should contain valid HTML document structure'
      );
      assert.ok(
        res.body.toLowerCase().includes('dashboard') ||
          res.body.toLowerCase().includes('collapsible'),
        'Response body should reference the dashboard or collapsible feature'
      );
    });

    it('GET /css/dashboard.css returns 200 with text/css content type', async () => {
      const res = await httpGet('/css/dashboard.css');
      assert.strictEqual(res.statusCode, 200, 'Expected 200 status for GET /css/dashboard.css');
      assert.ok(
        res.headers['content-type'].includes('text/css'),
        `Expected content-type to include "text/css", got "${res.headers['content-type']}"`
      );
      assert.ok(
        res.body.includes('.panel') || res.body.includes('.dashboard'),
        'CSS body should contain .panel or .dashboard selectors'
      );
    });

    it('GET /js/collapsible-dashboard.js returns 200 with JavaScript content type', async () => {
      const res = await httpGet('/js/collapsible-dashboard.js');
      assert.strictEqual(
        res.statusCode,
        200,
        'Expected 200 status for GET /js/collapsible-dashboard.js'
      );
      assert.ok(
        res.headers['content-type'].includes('application/javascript') ||
          res.headers['content-type'].includes('text/javascript'),
        `Expected content-type to include "application/javascript" or "text/javascript", got "${res.headers['content-type']}"`
      );
      assert.ok(
        res.body.includes('ResizeObserver'),
        'JavaScript body should contain ResizeObserver usage'
      );
    });

    it('GET /dashboard serves dashboard.html via sendFile route', async () => {
      const res = await httpGet('/dashboard');
      assert.strictEqual(res.statusCode, 200, 'Expected 200 status for GET /dashboard');
      assert.ok(
        res.headers['content-type'].includes('text/html'),
        `Expected content-type to include "text/html", got "${res.headers['content-type']}"`
      );
      assert.ok(
        res.body.includes('<!DOCTYPE html>') || res.body.includes('<html'),
        'Response body should contain valid HTML document structure via /dashboard route'
      );
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 3: Content Validation                                        */
  /* ------------------------------------------------------------------ */

  describe('Content Validation', () => {
    it('Dashboard HTML contains accessibility attributes and panel structure', async () => {
      const res = await httpGet('/dashboard.html');
      assert.strictEqual(res.statusCode, 200, 'Expected 200 status');

      assert.ok(
        res.body.includes('aria-expanded'),
        'Dashboard HTML must include aria-expanded attributes for accessibility'
      );
      assert.ok(
        res.body.includes('panel-header') || res.body.includes('panel-content'),
        'Dashboard HTML must include panel-header or panel-content class names'
      );

      const bodyLower = res.body.toLowerCase();
      assert.ok(
        !bodyLower.includes('"react"') && !bodyLower.includes("'react'"),
        'Dashboard must not reference React framework'
      );
      assert.ok(
        !bodyLower.includes('"vue"') && !bodyLower.includes("'vue'"),
        'Dashboard must not reference Vue framework'
      );
      assert.ok(
        !bodyLower.includes('"angular"') && !bodyLower.includes("'angular'"),
        'Dashboard must not reference Angular framework'
      );
    });

    it('Dashboard CSS contains transition and overflow rules', async () => {
      const res = await httpGet('/css/dashboard.css');
      assert.strictEqual(res.statusCode, 200, 'Expected 200 status');

      assert.ok(
        res.body.includes('transition'),
        'Dashboard CSS must include transition property for height animation'
      );
      assert.ok(
        res.body.includes('overflow'),
        'Dashboard CSS must include overflow property (overflow: hidden on content wrapper)'
      );
    });

    it('Dashboard JS contains ResizeObserver with proper measurement and cleanup', async () => {
      const res = await httpGet('/js/collapsible-dashboard.js');
      assert.strictEqual(res.statusCode, 200, 'Expected 200 status');

      assert.ok(
        res.body.includes('ResizeObserver'),
        'Dashboard JS must use the ResizeObserver API'
      );
      assert.ok(
        res.body.includes('contentBoxSize') ||
          res.body.includes('borderBoxSize') ||
          res.body.includes('contentRect'),
        'Dashboard JS must access contentBoxSize, borderBoxSize, or contentRect for height measurement'
      );
      assert.ok(
        res.body.includes('disconnect'),
        'Dashboard JS must call disconnect() for observer lifecycle cleanup'
      );
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 4: Error Handling                                            */
  /* ------------------------------------------------------------------ */

  describe('Error Handling', () => {
    it('GET /nonexistent-file.html returns 404', async () => {
      const res = await httpGet('/nonexistent-file.html');
      assert.strictEqual(
        res.statusCode,
        404,
        'Expected 404 status for a nonexistent static file'
      );
    });
  });
});
