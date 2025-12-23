/**
 * Helmet Security Headers Configuration Module
 * 
 * This module provides comprehensive security header configuration for the Express.js
 * application using helmet.js middleware. It implements defense-in-depth security
 * through multiple HTTP security headers following OWASP Secure Headers Project guidelines.
 * 
 * Security Headers Implemented:
 * - Content-Security-Policy (CSP): Prevents XSS and data injection attacks
 * - HTTP Strict Transport Security (HSTS): Enforces HTTPS connections
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME-type sniffing
 * - Referrer-Policy: Controls referrer information sent with requests
 * - Cross-Origin-Embedder-Policy: Controls cross-origin resource loading
 * 
 * @module config/helmet
 * @see https://helmetjs.github.io/
 * @see https://owasp.org/www-project-secure-headers/
 */

'use strict';

/**
 * Determines if the application is running in production mode
 * Used for environment-specific security configurations
 * @type {boolean}
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Determines if the application is running in development mode
 * Allows for relaxed security policies during local development
 * @type {boolean}
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Content-Security-Policy (CSP) Configuration
 * 
 * CSP is a security layer that helps detect and mitigate certain types of attacks,
 * including Cross-Site Scripting (XSS) and data injection attacks.
 * 
 * In production, strict CSP is enforced. In development, some policies are relaxed
 * to allow for debugging tools and hot-reload functionality.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 * @see https://owasp.org/www-project-secure-headers/#content-security-policy
 */
const contentSecurityPolicyConfig = {
  directives: {
    /**
     * default-src: Fallback for other fetch directives
     * Restricts loading of all content types to same origin by default
     */
    defaultSrc: ["'self'"],

    /**
     * script-src: Restricts sources for JavaScript
     * Only allows scripts from same origin to prevent XSS attacks
     * In development, 'unsafe-inline' and 'unsafe-eval' may be needed for dev tools
     */
    scriptSrc: isDevelopment 
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] 
      : ["'self'"],

    /**
     * style-src: Restricts sources for stylesheets
     * Allows same-origin styles and inline styles for flexibility
     * Note: 'unsafe-inline' for styles is generally acceptable and often necessary
     */
    styleSrc: ["'self'", "'unsafe-inline'"],

    /**
     * img-src: Restricts sources for images
     * Allows same-origin images and data URIs (for inline images/icons)
     */
    imgSrc: ["'self'", 'data:'],

    /**
     * connect-src: Restricts URLs for fetch, XHR, WebSocket, EventSource
     * Only allows connections to same origin by default
     * In development, allows localhost for API calls during development
     */
    connectSrc: isDevelopment 
      ? ["'self'", 'http://localhost:*', 'ws://localhost:*'] 
      : ["'self'"],

    /**
     * font-src: Restricts sources for fonts
     * Only allows fonts from same origin
     */
    fontSrc: ["'self'"],

    /**
     * object-src: Restricts sources for <object>, <embed>, and <applet>
     * Set to 'none' to prevent Flash, Java, and other plugin-based attacks
     */
    objectSrc: ["'none'"],

    /**
     * media-src: Restricts sources for <audio> and <video>
     * Only allows media from same origin
     */
    mediaSrc: ["'self'"],

    /**
     * frame-src: Restricts sources for <frame> and <iframe>
     * Set to 'none' to prevent embedding external frames
     */
    frameSrc: ["'none'"],

    /**
     * child-src: Restricts sources for web workers and nested browsing contexts
     * Only allows same-origin sources
     */
    childSrc: ["'self'"],

    /**
     * worker-src: Restricts sources for Worker, SharedWorker, or ServiceWorker
     * Only allows same-origin workers
     */
    workerSrc: ["'self'"],

    /**
     * form-action: Restricts targets for form submissions
     * Only allows forms to submit to same origin
     */
    formAction: ["'self'"],

    /**
     * frame-ancestors: Restricts embedding of the page in frames/iframes
     * Set to 'none' to prevent clickjacking attacks
     * This is the CSP equivalent of X-Frame-Options: DENY
     */
    frameAncestors: ["'none'"],

    /**
     * base-uri: Restricts URLs for the <base> element
     * Prevents attackers from changing the base URL for relative URLs
     */
    baseUri: ["'self'"],

    /**
     * upgrade-insecure-requests: Upgrades HTTP requests to HTTPS
     * Only enabled in production where HTTPS is expected
     */
    ...(isProduction && { upgradeInsecureRequests: [] }),

    /**
     * block-all-mixed-content: Blocks HTTP resources on HTTPS pages
     * Prevents mixed content vulnerabilities in production
     */
    ...(isProduction && { blockAllMixedContent: [] }),
  },
  /**
   * Report-only mode can be enabled for testing CSP without blocking
   * Set to false in production to actively enforce the policy
   */
  reportOnly: false,
};

/**
 * HTTP Strict Transport Security (HSTS) Configuration
 * 
 * HSTS tells browsers to only use HTTPS for the domain, preventing
 * protocol downgrade attacks and cookie hijacking.
 * 
 * Note: HSTS headers are only effective when served over HTTPS.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
 * @see https://owasp.org/www-project-secure-headers/#http-strict-transport-security
 */
const hstsConfig = {
  /**
   * max-age: Time in seconds the browser should remember HSTS
   * 31536000 seconds = 1 year (OWASP recommended minimum)
   */
  maxAge: 31536000,

  /**
   * includeSubDomains: Apply HSTS to all subdomains
   * Protects against attacks on subdomains
   */
  includeSubDomains: true,

  /**
   * preload: Allow inclusion in browser HSTS preload lists
   * Set to false by default - opt-in when ready for preload submission
   * To enable, set to true and submit domain to hstspreload.org
   * Warning: Preloading is difficult to undo
   */
  preload: false,
};

/**
 * X-Frame-Options Configuration
 * 
 * Protects against clickjacking attacks by preventing the page
 * from being embedded in frames or iframes on other sites.
 * 
 * Note: frame-ancestors CSP directive is the modern replacement,
 * but X-Frame-Options is included for older browser compatibility.
 * 
 * Options: 'DENY' | 'SAMEORIGIN'
 * - 'DENY': Prevents all framing
 * - 'SAMEORIGIN': Allows framing only by same origin
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
 */
const xFrameOptionsConfig = {
  action: 'deny',
};

/**
 * Referrer-Policy Configuration
 * 
 * Controls how much referrer information is included with requests.
 * 'strict-origin-when-cross-origin' provides a good balance between
 * functionality and privacy.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
 * @see https://owasp.org/www-project-secure-headers/#referrer-policy
 */
const referrerPolicyConfig = {
  policy: ['strict-origin-when-cross-origin'],
};

/**
 * Cross-Origin-Embedder-Policy Configuration
 * 
 * Controls loading of cross-origin resources. When enabled, requires
 * cross-origin resources to explicitly grant permission via CORS or CORP headers.
 * 
 * Disabled by default in helmet 8.x as it can break many legitimate use cases.
 * Enable only if you need SharedArrayBuffer or high-resolution timers.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
 */
const crossOriginEmbedderPolicyConfig = false;

/**
 * Cross-Origin-Opener-Policy Configuration
 * 
 * Controls window interactions with cross-origin documents.
 * 'same-origin' isolates the browsing context from cross-origin documents.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
 */
const crossOriginOpenerPolicyConfig = {
  policy: 'same-origin',
};

/**
 * Cross-Origin-Resource-Policy Configuration
 * 
 * Controls which origins can load this resource.
 * 'same-origin' restricts loading to same-origin requests only.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy
 */
const crossOriginResourcePolicyConfig = {
  policy: 'same-origin',
};

/**
 * DNS Prefetch Control Configuration
 * 
 * Controls browser DNS prefetching. Disabled for privacy as DNS prefetch
 * can be used to track user navigation patterns.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
 */
const dnsPrefetchControlConfig = {
  allow: false,
};

/**
 * Origin-Agent-Cluster Configuration
 * 
 * Requests that the document be placed in its own origin-keyed agent cluster.
 * Provides better isolation between different origins.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin-Agent-Cluster
 */
const originAgentClusterConfig = true;

/**
 * Permitted Cross-Domain Policies Configuration
 * 
 * Controls loading of cross-domain content by Adobe Flash and PDF readers.
 * Set to 'none' to prevent any cross-domain data loading by these plugins.
 * 
 * @see https://owasp.org/www-project-secure-headers/#x-permitted-cross-domain-policies
 */
const permittedCrossDomainPoliciesConfig = {
  permittedPolicies: 'none',
};

/**
 * X-Download-Options Configuration
 * 
 * Prevents Internet Explorer from executing downloads in the site's context.
 * Set 'noopen' to force the user to save the file instead of opening it.
 * 
 * Legacy protection for Internet Explorer.
 * 
 * @see https://docs.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/jj542450(v=vs.85)
 */
const xDownloadOptionsConfig = true;

/**
 * X-Powered-By Configuration
 * 
 * By default, Express sends the X-Powered-By header revealing the technology stack.
 * Helmet removes this header to reduce information disclosure.
 * This is handled automatically by helmet, no explicit configuration needed.
 */

/**
 * Helmet Configuration Object
 * 
 * Comprehensive security headers configuration for helmet.js middleware.
 * This configuration follows OWASP Secure Headers Project recommendations
 * and implements defense-in-depth security strategy.
 * 
 * Security Headers Applied:
 * - Content-Security-Policy: Mitigates XSS and injection attacks
 * - Strict-Transport-Security: Enforces HTTPS
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Referrer-Policy: Controls referrer leakage
 * - Cross-Origin-* headers: Controls cross-origin access
 * - X-DNS-Prefetch-Control: Privacy protection
 * - X-Download-Options: IE download protection
 * - X-Permitted-Cross-Domain-Policies: Adobe plugin protection
 * 
 * Note: X-Powered-By header is removed automatically by helmet
 * 
 * @type {Object}
 * @property {Object|boolean} contentSecurityPolicy - CSP configuration
 * @property {Object|boolean} hsts - HSTS configuration (strictTransportSecurity in helmet)
 * @property {Object|boolean} xFrameOptions - X-Frame-Options configuration (frameguard in helmet)
 * @property {boolean} xContentTypeOptions - X-Content-Type-Options (noSniff in helmet)
 * @property {Object|boolean} referrerPolicy - Referrer-Policy configuration
 * @property {Object|boolean} crossOriginEmbedderPolicy - COEP configuration
 */
const helmetConfig = {
  /**
   * Content-Security-Policy Configuration
   * Prevents XSS, clickjacking, and other code injection attacks
   */
  contentSecurityPolicy: contentSecurityPolicyConfig,

  /**
   * HTTP Strict Transport Security (HSTS)
   * In helmet, this is called strictTransportSecurity
   * Ensures browsers only connect via HTTPS
   */
  hsts: hstsConfig,

  /**
   * X-Frame-Options Configuration
   * In helmet, this is called frameguard
   * Prevents clickjacking by controlling iframe embedding
   */
  xFrameOptions: xFrameOptionsConfig,

  /**
   * X-Content-Type-Options
   * In helmet, this is called noSniff
   * Set to true to enable 'nosniff' directive
   * Prevents browsers from MIME-sniffing responses
   */
  xContentTypeOptions: true,

  /**
   * Referrer-Policy Configuration
   * Controls how much referrer information is included in requests
   */
  referrerPolicy: referrerPolicyConfig,

  /**
   * Cross-Origin-Embedder-Policy Configuration
   * Disabled by default as it can break legitimate cross-origin resources
   */
  crossOriginEmbedderPolicy: crossOriginEmbedderPolicyConfig,

  /**
   * Cross-Origin-Opener-Policy Configuration
   * Isolates browsing context from cross-origin documents
   */
  crossOriginOpenerPolicy: crossOriginOpenerPolicyConfig,

  /**
   * Cross-Origin-Resource-Policy Configuration
   * Restricts resource loading to same-origin
   */
  crossOriginResourcePolicy: crossOriginResourcePolicyConfig,

  /**
   * DNS Prefetch Control Configuration
   * Disables DNS prefetching for privacy
   */
  dnsPrefetchControl: dnsPrefetchControlConfig,

  /**
   * Origin-Agent-Cluster Configuration
   * Enables origin-keyed agent clusters for better isolation
   */
  originAgentCluster: originAgentClusterConfig,

  /**
   * Permitted Cross-Domain Policies Configuration
   * Prevents Adobe Flash/PDF cross-domain data loading
   */
  permittedCrossDomainPolicies: permittedCrossDomainPoliciesConfig,

  /**
   * X-Download-Options Configuration
   * Legacy IE protection for file downloads
   */
  xDownloadOptions: xDownloadOptionsConfig,

  /**
   * X-XSS-Protection is NOT included
   * This header is deprecated and can actually introduce vulnerabilities
   * Modern browsers have disabled their XSS auditors
   * CSP provides better XSS protection
   */

  /**
   * X-Powered-By Removal
   * Helmet removes this header by default (hidePoweredBy)
   * No explicit configuration needed - included automatically
   */
};

/**
 * Mapping of exposed member names to helmet middleware option names
 * This helps clarify the relationship between our config and helmet's API
 * 
 * Our Config Property -> Helmet Middleware Option
 * - contentSecurityPolicy -> contentSecurityPolicy
 * - hsts -> strictTransportSecurity (alias: hsts)
 * - xFrameOptions -> frameguard (alias: xFrameOptions)
 * - xContentTypeOptions -> noSniff
 * - referrerPolicy -> referrerPolicy
 * - crossOriginEmbedderPolicy -> crossOriginEmbedderPolicy
 */

/**
 * Export the helmet configuration as the default module export
 * 
 * Usage in server.js:
 * ```javascript
 * const helmet = require('helmet');
 * const helmetConfig = require('./config/helmet');
 * 
 * // Apply helmet with our configuration
 * app.use(helmet({
 *   contentSecurityPolicy: helmetConfig.contentSecurityPolicy,
 *   strictTransportSecurity: helmetConfig.hsts,
 *   frameguard: helmetConfig.xFrameOptions,
 *   noSniff: helmetConfig.xContentTypeOptions,
 *   referrerPolicy: helmetConfig.referrerPolicy,
 *   crossOriginEmbedderPolicy: helmetConfig.crossOriginEmbedderPolicy,
 *   crossOriginOpenerPolicy: helmetConfig.crossOriginOpenerPolicy,
 *   crossOriginResourcePolicy: helmetConfig.crossOriginResourcePolicy,
 *   dnsPrefetchControl: helmetConfig.dnsPrefetchControl,
 *   originAgentCluster: helmetConfig.originAgentCluster,
 *   permittedCrossDomainPolicies: helmetConfig.permittedCrossDomainPolicies,
 *   xDownloadOptions: helmetConfig.xDownloadOptions,
 * }));
 * ```
 * 
 * Or simply use the full config object directly:
 * ```javascript
 * const helmet = require('helmet');
 * const helmetConfig = require('./config/helmet');
 * app.use(helmet(helmetConfig));
 * ```
 * 
 * Note: When using the full config object, the property names in helmetConfig
 * are designed to work directly with helmet() function. The aliases (hsts, xFrameOptions)
 * are handled by helmet internally.
 */
module.exports = helmetConfig;
