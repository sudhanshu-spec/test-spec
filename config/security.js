/**
 * Security Configuration Module
 * 
 * Centralized Helmet.js security middleware configuration that exports
 * security header options for the Express application.
 * 
 * This module configures:
 * - Content-Security-Policy (CSP) to protect against XSS attacks
 * - Cross-Origin policies for resource isolation
 * - X-Frame-Options for clickjacking protection
 * - X-Content-Type-Options to prevent MIME sniffing
 * - HTTP Strict Transport Security (HSTS)
 * - Referrer Policy for privacy protection
 * 
 * Supports environment-based configuration:
 * - Production: Strict security policies
 * - Development: Relaxed policies for debugging
 * 
 * @module config/security
 */

'use strict';

/**
 * Determines if the application is running in production mode
 * @type {boolean}
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy (CSP) configuration
 * Defines trusted sources for various resource types to prevent XSS attacks
 * 
 * @type {Object}
 */
const contentSecurityPolicyConfig = {
  useDefaults: true,
  directives: {
    // Default source for all content types not explicitly specified
    defaultSrc: ["'self'"],
    
    // Script sources - restrict to same origin to prevent XSS
    // In development, allow unsafe-inline for debugging tools
    scriptSrc: isProduction 
      ? ["'self'"] 
      : ["'self'", "'unsafe-inline'"],
    
    // Style sources - allow same origin and inline styles
    // Inline styles are commonly needed for dynamic styling
    styleSrc: ["'self'", "'unsafe-inline'"],
    
    // Image sources - allow same origin and data URIs for inline images
    imgSrc: ["'self'", 'data:'],
    
    // Font sources - restrict to same origin
    fontSrc: ["'self'"],
    
    // Connect sources for XHR, WebSocket, fetch API
    connectSrc: ["'self'"],
    
    // Object sources - disable plugins like Flash
    objectSrc: ["'none'"],
    
    // Frame ancestors - prevent clickjacking by not allowing embedding
    frameAncestors: ["'self'"],
    
    // Form action targets
    formAction: ["'self'"],
    
    // Base URI restriction
    baseUri: ["'self'"],
    
    // Upgrade insecure requests in production
    upgradeInsecureRequests: isProduction ? [] : null,
  },
  // Report violations to this endpoint (can be configured)
  reportOnly: !isProduction,
};

/**
 * Cross-Origin-Embedder-Policy configuration
 * Controls whether a document can load cross-origin resources
 * 
 * @type {Object}
 */
const crossOriginEmbedderPolicyConfig = {
  // 'require-corp' ensures all resources are same-origin or explicitly grant permission
  // 'credentialless' allows cross-origin no-CORS requests without credentials
  policy: isProduction ? 'require-corp' : 'credentialless',
};

/**
 * Cross-Origin-Opener-Policy configuration
 * Prevents other windows from accessing the opener reference
 * 
 * @type {Object}
 */
const crossOriginOpenerPolicyConfig = {
  // 'same-origin' isolates browsing context to same-origin documents only
  // Provides protection against cross-origin attacks like Spectre
  policy: 'same-origin',
};

/**
 * Cross-Origin-Resource-Policy configuration
 * Protects against certain cross-origin requests
 * 
 * @type {Object}
 */
const crossOriginResourcePolicyConfig = {
  // 'same-origin' blocks cross-origin requests
  // 'same-site' allows requests from the same site
  // 'cross-origin' allows all requests (least restrictive)
  policy: isProduction ? 'same-origin' : 'same-site',
};

/**
 * X-Frame-Options configuration via frameguard
 * Protects against clickjacking attacks by controlling iframe embedding
 * 
 * @type {Object}
 */
const frameguardConfig = {
  // 'deny' - prevents any site from framing
  // 'sameorigin' - allows same origin to frame
  action: 'deny',
};

/**
 * X-Content-Type-Options configuration via noSniff
 * Prevents MIME type sniffing which can lead to security vulnerabilities
 * 
 * Setting this to true adds the 'X-Content-Type-Options: nosniff' header
 * which prevents browsers from MIME-sniffing a response away from the declared content-type
 * 
 * @type {boolean}
 */
const noSniffConfig = true;

/**
 * X-XSS-Protection configuration
 * Enables the cross-site scripting filter built into most browsers
 * Note: This is a legacy header, modern browsers rely on CSP instead
 * 
 * @type {boolean}
 */
const xssFilterConfig = true;

/**
 * Hide X-Powered-By header configuration
 * Removes the X-Powered-By header to prevent server fingerprinting
 * This makes it harder for attackers to identify the server technology
 * 
 * @type {boolean}
 */
const hidePoweredByConfig = true;

/**
 * HTTP Strict Transport Security (HSTS) configuration
 * Forces HTTPS connections for enhanced security
 * 
 * @type {Object}
 */
const hstsConfig = {
  // Max age in seconds (1 year recommended for production)
  maxAge: isProduction ? 31536000 : 86400, // 1 year in production, 1 day in development
  
  // Include subdomains in the HSTS policy
  includeSubDomains: isProduction,
  
  // Allow preloading in browser HSTS lists (production only)
  preload: isProduction,
};

/**
 * Referrer Policy configuration
 * Controls how much referrer information is included with requests
 * 
 * @type {Object}
 */
const referrerPolicyConfig = {
  // 'strict-origin-when-cross-origin' - sends full URL for same-origin,
  // only origin for cross-origin requests, and nothing for downgrades
  // This is a good balance between privacy and functionality
  policy: ['strict-origin-when-cross-origin'],
};

/**
 * Complete Helmet.js configuration object
 * Aggregates all security configurations into a single exportable object
 * 
 * This configuration is designed to:
 * - Protect against XSS attacks via CSP
 * - Prevent clickjacking via X-Frame-Options
 * - Stop MIME type sniffing via X-Content-Type-Options
 * - Enforce HTTPS via HSTS
 * - Isolate browsing context via Cross-Origin policies
 * - Hide server fingerprints by removing X-Powered-By
 * - Control referrer information for privacy
 * 
 * @type {Object}
 * @property {Object} contentSecurityPolicy - CSP header configuration
 * @property {Object} crossOriginEmbedderPolicy - COEP header configuration
 * @property {Object} crossOriginOpenerPolicy - COOP header configuration
 * @property {Object} crossOriginResourcePolicy - CORP header configuration
 * @property {Object} frameguard - X-Frame-Options configuration
 * @property {boolean} noSniff - X-Content-Type-Options configuration
 * @property {boolean} xssFilter - X-XSS-Protection configuration (legacy)
 * @property {boolean} hidePoweredBy - Remove X-Powered-By header
 * @property {Object} hsts - HTTP Strict Transport Security configuration
 * @property {Object} referrerPolicy - Referrer-Policy header configuration
 */
const helmetConfig = {
  /**
   * Content Security Policy configuration
   * Controls which resources can be loaded and executed
   */
  contentSecurityPolicy: contentSecurityPolicyConfig,
  
  /**
   * Cross-Origin Embedder Policy configuration
   * Controls cross-origin resource loading
   */
  crossOriginEmbedderPolicy: crossOriginEmbedderPolicyConfig,
  
  /**
   * Cross-Origin Opener Policy configuration
   * Controls browsing context isolation
   */
  crossOriginOpenerPolicy: crossOriginOpenerPolicyConfig,
  
  /**
   * Cross-Origin Resource Policy configuration
   * Controls cross-origin resource access
   */
  crossOriginResourcePolicy: crossOriginResourcePolicyConfig,
  
  /**
   * Frame guard (X-Frame-Options) configuration
   * Prevents clickjacking attacks
   */
  frameguard: frameguardConfig,
  
  /**
   * No MIME type sniffing configuration
   * Prevents browsers from MIME-sniffing responses
   */
  noSniff: noSniffConfig,
  
  /**
   * XSS Filter configuration (legacy browsers)
   * Enables built-in browser XSS protection
   */
  xssFilter: xssFilterConfig,
  
  /**
   * Hide X-Powered-By header
   * Removes server technology fingerprint
   */
  hidePoweredBy: hidePoweredByConfig,
  
  /**
   * HTTP Strict Transport Security configuration
   * Forces HTTPS connections
   */
  hsts: hstsConfig,
  
  /**
   * Referrer Policy configuration
   * Controls referrer information in requests
   */
  referrerPolicy: referrerPolicyConfig,
};

/**
 * Export the Helmet configuration object as the default export
 * 
 * Usage in server.js:
 * const helmetConfig = require('./config/security');
 * app.use(helmet(helmetConfig));
 */
module.exports = helmetConfig;
