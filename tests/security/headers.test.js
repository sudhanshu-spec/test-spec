/**
 * Security Headers Test Suite
 *
 * Verifies that helmet.js middleware correctly sets all expected HTTP
 * security headers on every response and removes the X-Powered-By header
 * to prevent Express framework fingerprinting.
 *
 * @module tests/security/headers.test
 */

'use strict';

const request = require('supertest');
const express = require('express');
const app = require('../../src/app');
const { createSecurityMiddleware } = require('../../src/middleware/security');
const { mainRoutes } = require('../../src/routes');

/**
 * Creates a test app with production environment to verify headers that
 * are only enabled in production (such as Strict-Transport-Security).
 *
 * @returns {express.Application} Express app configured for production
 */
function createProductionApp() {
  const prodApp = express();
  const { helmetMiddleware, corsMiddleware, rateLimitMiddleware } = createSecurityMiddleware({
    env: 'production',
    rateLimitWindowMs: 15 * 60 * 1000,
    rateLimitMax: 1000,
    corsOrigins: '*'
  });
  prodApp.use(helmetMiddleware);
  prodApp.use(corsMiddleware);
  prodApp.use(rateLimitMiddleware);
  prodApp.use('/', mainRoutes);
  return prodApp;
}

describe('Security Headers (Helmet)', () => {
  /**
   * Helmet removes the X-Powered-By header that Express sets by default.
   * This prevents attackers from fingerprinting the framework.
   */
  it('should remove X-Powered-By header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  /**
   * Content-Security-Policy prevents XSS and data injection attacks
   * by restricting what resources the browser can load.
   */
  it('should set Content-Security-Policy header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  /**
   * Cross-Origin-Opener-Policy isolates the browsing context to prevent
   * cross-origin attacks via window references.
   */
  it('should set Cross-Origin-Opener-Policy header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['cross-origin-opener-policy']).toBeDefined();
  });

  /**
   * Cross-Origin-Resource-Policy prevents other origins from reading
   * the response content of this origin's resources.
   */
  it('should set Cross-Origin-Resource-Policy header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['cross-origin-resource-policy']).toBeDefined();
  });

  /**
   * Origin-Agent-Cluster requests that the browser isolates this origin
   * into its own agent cluster for security benefits.
   */
  it('should set Origin-Agent-Cluster header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['origin-agent-cluster']).toBeDefined();
  });

  /**
   * Referrer-Policy controls how much referrer information is sent
   * with requests, preventing information leakage.
   */
  it('should set Referrer-Policy header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['referrer-policy']).toBeDefined();
  });

  /**
   * Strict-Transport-Security (HSTS) tells browsers to only access the site
   * via HTTPS, preventing protocol downgrade attacks.
   * HSTS is deliberately disabled in development/test environments to avoid
   * breaking HTTP connections. It is only enabled in production.
   */
  it('should not set Strict-Transport-Security in development mode', async () => {
    const res = await request(app).get('/');
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  /**
   * Verify HSTS is enabled in production mode to enforce HTTPS-only access.
   */
  it('should set Strict-Transport-Security in production mode', async () => {
    const prodApp = createProductionApp();
    const res = await request(prodApp).get('/');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  /**
   * X-Content-Type-Options prevents browsers from MIME-sniffing the
   * response content type, which could lead to XSS attacks.
   */
  it('should set X-Content-Type-Options header to nosniff', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  /**
   * X-DNS-Prefetch-Control controls DNS prefetching to prevent
   * information leakage about which links are on the page.
   */
  it('should set X-DNS-Prefetch-Control header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });

  /**
   * X-Download-Options prevents Internet Explorer from executing
   * downloaded files in the site's context.
   */
  it('should set X-Download-Options header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-download-options']).toBeDefined();
  });

  /**
   * X-Frame-Options prevents the page from being embedded in iframes,
   * protecting against clickjacking attacks.
   */
  it('should set X-Frame-Options header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  /**
   * X-Permitted-Cross-Domain-Policies restricts Adobe Flash and PDF
   * from loading data from the domain.
   */
  it('should set X-Permitted-Cross-Domain-Policies header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-permitted-cross-domain-policies']).toBeDefined();
  });

  /**
   * Verify security headers are also present on the /evening endpoint
   * to ensure middleware applies to all routes.
   */
  it('should apply security headers to /evening endpoint', async () => {
    const res = await request(app).get('/evening');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});
