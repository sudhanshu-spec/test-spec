/**
 * @fileoverview Unit tests for server.js module exports verification.
 * Contains tests that verify the Express application export pattern enables proper
 * testing with Supertest without network binding. Tests cover:
 * - Module exports structure (app property existence)
 * - Express application instance validity
 * - Middleware capability (app.use function)
 * - Routing capability (app.get, app.post functions)
 * - Server startup capability (app.listen function)
 * - Testability pattern verification (Supertest integration)
 * - Module singleton behavior (same instance on multiple imports)
 * 
 * @module tests/unit/test_server_exports
 * @requires supertest
 * @requires ../../server
 * 
 * @see https://expressjs.com/en/api.html - Express.js API documentation
 * @see https://github.com/ladjs/supertest - Supertest documentation
 * 
 * @author Blitzy Test Team
 * @version 1.0.0
 * @license MIT
 */

'use strict';

// =============================================================================
// Test Dependencies
// =============================================================================

const request = require('supertest');

// Import server module in two ways to test both patterns
const serverModule = require('../../server');
const { app } = require('../../server');

// =============================================================================
// Server Exports - Module Structure Tests
// =============================================================================

/**
 * Test Suite: Module Structure
 * 
 * Verifies that server.js exports the correct structure for testing.
 * The module should export an object containing the Express app instance,
 * enabling Supertest and other testing frameworks to make HTTP requests
 * without starting an actual network-bound server.
 */
describe('Server Exports - Module Structure', () => {
  /**
   * Test 1: Verify module exports contains 'app' property
   * 
   * The server module must export an object with an 'app' property
   * to enable destructuring imports like: const { app } = require('./server');
   */
  it('should export an object with app property', () => {
    // Verify serverModule is an object
    expect(serverModule).toBeDefined();
    expect(typeof serverModule).toBe('object');
    
    // Verify 'app' property exists using Jest's toHaveProperty matcher
    expect(serverModule).toHaveProperty('app');
    
    // Verify the app property is not undefined
    expect(typeof serverModule.app).not.toBe('undefined');
    expect(serverModule.app).not.toBeNull();
  });

  /**
   * Test 2: Verify app is a valid Express application
   * 
   * Express applications are functions that can be called with (req, res, next).
   * This is a fundamental characteristic that enables middleware and routing.
   */
  it('should export app as a valid Express application', () => {
    // Express apps are functions (they handle requests)
    expect(typeof app).toBe('function');
    
    // Express apps have specific properties that identify them
    expect(app).toBeDefined();
    
    // Verify it's callable (a function)
    expect(app).toBeInstanceOf(Function);
  });

  /**
   * Test 3: Verify app has 'use' method for middleware
   * 
   * The app.use() method is essential for adding middleware to the Express
   * application. This enables features like body parsing, CORS, helmet, etc.
   */
  it('should export app with use method for middleware', () => {
    // Verify app.use is defined
    expect(app.use).toBeDefined();
    
    // Verify app.use is a function
    expect(typeof app.use).toBe('function');
  });

  /**
   * Test 4: Verify app has 'get' method for routing
   * 
   * The app.get() method is used to define GET route handlers.
   * This is essential for the server's route definitions (/, /evening, /health).
   */
  it('should export app with get method for routing', () => {
    // Verify app.get is defined
    expect(app.get).toBeDefined();
    
    // Verify app.get is a function
    expect(typeof app.get).toBe('function');
  });

  /**
   * Test 5: Verify app has 'listen' method for server startup
   * 
   * The app.listen() method starts the HTTP server on a specified port.
   * While Supertest doesn't use this directly, it's essential for production.
   */
  it('should export app with listen method for server startup', () => {
    // Verify app.listen is defined
    expect(app.listen).toBeDefined();
    
    // Verify app.listen is a function
    expect(typeof app.listen).toBe('function');
  });
});

// =============================================================================
// Server Exports - Testability Tests
// =============================================================================

/**
 * Test Suite: Testability
 * 
 * Verifies that the export pattern enables proper testing with Supertest.
 * Supertest can make HTTP requests to the Express app without starting
 * an actual network-bound server, which is essential for unit testing.
 */
describe('Server Exports - Testability', () => {
  /**
   * Test 6: Verify Supertest can make requests without starting server
   * 
   * Supertest wraps the Express app and handles request/response internally.
   * This test verifies the app is properly exported to enable this pattern.
   * No server.listen() call is needed - this is the key testability feature.
   */
  it('should allow Supertest to make requests without starting server', async () => {
    // Make a GET request to root endpoint using Supertest
    // This demonstrates that the app can be tested without network binding
    const response = await request(app)
      .get('/')
      .expect(200);
    
    // Verify we received a response
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    
    // Verify the response text matches expected output
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test 7: Verify same app instance on multiple imports
   * 
   * Node.js caches modules after the first require(), so multiple imports
   * should return the same instance. This is important for test isolation
   * and ensures middleware is not duplicated.
   */
  it('should provide same app instance on multiple imports', () => {
    // Import app again using destructuring
    const { app: app1 } = require('../../server');
    const { app: app2 } = require('../../server');
    
    // Both imports should reference the exact same object
    expect(app1).toBe(app2);
    
    // Also verify against the module-level import
    expect(app1).toBe(app);
    expect(app2).toBe(app);
    
    // Verify the serverModule.app is the same reference
    expect(serverModule.app).toBe(app);
    expect(serverModule.app).toBe(app1);
    expect(serverModule.app).toBe(app2);
  });
});

// =============================================================================
// Server Exports - Express Methods Tests
// =============================================================================

/**
 * Test Suite: Express Methods
 * 
 * Verifies that the exported app has all essential Express.js methods
 * for routing and configuration. These methods are used by the server
 * to define routes and configure application settings.
 */
describe('Server Exports - Express Methods', () => {
  /**
   * Test 8: Verify app has 'post' method for POST routes
   * 
   * The app.post() method is used to define POST route handlers.
   * While the current server primarily uses GET routes, POST capability
   * is essential for future enhancements and completeness verification.
   */
  it('should have post method for POST routes', () => {
    // Verify app.post is defined
    expect(app.post).toBeDefined();
    
    // Verify app.post is a function
    expect(typeof app.post).toBe('function');
  });

  /**
   * Test 9: Verify app has 'set' method for app settings
   * 
   * The app.set() method is used to configure Express application settings
   * such as 'trust proxy', 'view engine', 'env', etc. This is essential
   * for server configuration.
   */
  it('should have set method for app settings', () => {
    // Verify app.set is defined
    expect(app.set).toBeDefined();
    
    // Verify app.set is a function
    expect(typeof app.set).toBe('function');
  });

  /**
   * Test 10: Verify app has additional HTTP method handlers
   * 
   * Express apps should have methods for all HTTP verbs.
   * This verifies the app is a complete Express instance.
   */
  it('should have all standard HTTP method handlers', () => {
    // Verify standard HTTP method handlers exist
    expect(typeof app.put).toBe('function');
    expect(typeof app.delete).toBe('function');
    expect(typeof app.patch).toBe('function');
    expect(typeof app.options).toBe('function');
    expect(typeof app.head).toBe('function');
  });

  /**
   * Test 11: Verify app has 'all' method for catch-all routes
   * 
   * The app.all() method matches all HTTP methods for a given path.
   * This is useful for middleware that should run for all request types.
   */
  it('should have all method for catch-all routes', () => {
    // Verify app.all is defined
    expect(app.all).toBeDefined();
    
    // Verify app.all is a function
    expect(typeof app.all).toBe('function');
  });

  /**
   * Test 12: Verify app has router method for modular routing
   * 
   * Express.Router is used for modular routing. While the server doesn't
   * currently use it, this verifies the Express instance is complete.
   */
  it('should have route method for route chaining', () => {
    // Verify app.route is defined (for route chaining)
    expect(app.route).toBeDefined();
    
    // Verify app.route is a function
    expect(typeof app.route).toBe('function');
  });
});

// =============================================================================
// Server Exports - Application Configuration Tests
// =============================================================================

/**
 * Test Suite: Application Configuration
 * 
 * Verifies that the exported app has proper configuration methods
 * and can retrieve application settings.
 */
describe('Server Exports - Application Configuration', () => {
  /**
   * Test 13: Verify app settings can be retrieved
   * 
   * The app.get() method when called with a single string argument
   * retrieves application settings (dual purpose method).
   */
  it('should be able to retrieve app settings', () => {
    // Retrieve the 'env' setting (typically 'development' or 'test')
    const env = app.get('env');
    
    // The environment should be a string
    expect(typeof env).toBe('string');
    
    // Environment should be one of the standard values
    expect(['development', 'test', 'production']).toContain(env);
  });

  /**
   * Test 14: Verify app has locals object for shared data
   * 
   * app.locals is an object available throughout the application lifecycle.
   * It's used for sharing data between middleware and routes.
   */
  it('should have locals object for shared data', () => {
    // Verify app.locals exists
    expect(app.locals).toBeDefined();
    
    // Verify app.locals is an object
    expect(typeof app.locals).toBe('object');
  });

  /**
   * Test 15: Verify app has mountpath property
   * 
   * The app.mountpath property contains the path pattern(s) on which
   * a sub-app was mounted. For the main app, this is typically '/'.
   */
  it('should have mountpath property', () => {
    // Verify mountpath property exists
    expect(app.mountpath).toBeDefined();
  });
});
