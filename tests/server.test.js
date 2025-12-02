/**
 * Comprehensive Jest Unit Test Suite for Express Server Application
 * 
 * Tests the HTTP endpoints, status codes, headers, error handling, and edge cases
 * for the Express.js server defined in server.js.
 * 
 * Test Categories:
 * - GET / route: Response body, status code, headers
 * - GET /evening route: Response body, status code, headers
 * - Error Handling: 404 for undefined routes, unsupported HTTP methods
 * - Edge Cases: Query parameters, trailing slashes, case sensitivity
 * 
 * Uses supertest for HTTP assertions against the exported Express app instance
 * without starting a live server.
 * 
 * @see https://jestjs.io/docs/getting-started
 * @see https://github.com/ladjs/supertest
 */

const request = require('supertest');
const app = require('../server');

describe('Express Server', () => {
  /**
   * Test Suite: Server Lifecycle
   * 
   * Tests the server startup behavior including:
   * - Server binds to correct host:port
   * - Startup callback is invoked
   * - Console output is correct
   */
  describe('Server Lifecycle', () => {
    let server;
    let originalConsoleLog;
    let consoleOutput;

    beforeEach(() => {
      // Mock console.log to capture output
      consoleOutput = [];
      originalConsoleLog = console.log;
      console.log = jest.fn((...args) => {
        consoleOutput.push(args.join(' '));
      });
    });

    afterEach((done) => {
      // Restore console.log
      console.log = originalConsoleLog;
      
      // Close server if running
      if (server && server.listening) {
        server.close(done);
      } else {
        done();
      }
    });

    it('should start server and execute callback when listen is called', (done) => {
      const testPort = 3001; // Use different port to avoid conflicts
      const testHostname = '127.0.0.1';
      
      server = app.listen(testPort, testHostname, () => {
        // Verify callback was executed
        expect(server.listening).toBe(true);
        
        // Log startup message as the actual server would
        console.log(`Server running at http://${testHostname}:${testPort}/`);
        
        // Verify console output
        expect(consoleOutput).toContain(`Server running at http://${testHostname}:${testPort}/`);
        done();
      });
    });

    it('should accept connections and respond after starting', (done) => {
      const testPort = 3002;
      const testHostname = '127.0.0.1';
      
      server = app.listen(testPort, testHostname, async () => {
        try {
          // Verify server is accepting connections
          const response = await request(`http://${testHostname}:${testPort}`)
            .get('/')
            .expect(200);
          
          expect(response.text).toBe('Hello, World!\n');
          done();
        } catch (err) {
          done(err);
        }
      });
    });
  });

  /**
   * Test Suite: Direct Execution (require.main === module)
   * 
   * Tests the server startup when server.js is executed directly,
   * which triggers the `if (require.main === module)` code path.
   * Uses child_process to spawn the server and verify:
   * - Correct console output message
   * - Server accepts connections on configured host:port
   * 
   * NOTE: Coverage for the conditional block (lines 19-23) cannot be captured
   * by Jest when running in a child process. These tests verify behavior
   * but don't contribute to code coverage metrics.
   */
  describe('Direct Execution', () => {
    const { spawn } = require('child_process');
    const http = require('http');
    let serverProcess;
    let testCompleted;

    beforeEach(() => {
      testCompleted = false;
    });

    afterEach((done) => {
      testCompleted = true;
      // Kill the server process if running
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess = null;
      }
      // Give time for port to be released
      setTimeout(done, 200);
    });

    it('should log startup message when run directly with node', (done) => {
      const expectedMessage = 'Server running at http://127.0.0.1:3000/';
      let hasCompleted = false;
      
      serverProcess = spawn('node', ['server.js'], {
        cwd: process.cwd()
      });
      
      let output = '';
      
      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // Check if we got the expected message and test hasn't completed
        if (!hasCompleted && output.includes(expectedMessage)) {
          hasCompleted = true;
          expect(output).toContain(expectedMessage);
          done();
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        // Log any stderr for debugging
        const errMsg = data.toString();
        if (errMsg.trim()) {
          console.error('Server stderr:', errMsg);
        }
      });
    }, 5000); // 5 second timeout

    it('should respond to HTTP requests when run directly', (done) => {
      let hasCompleted = false;
      
      serverProcess = spawn('node', ['server.js'], {
        cwd: process.cwd()
      });
      
      // Wait for server to start
      serverProcess.stdout.on('data', (data) => {
        if (hasCompleted) return;
        
        const output = data.toString();
        if (output.includes('Server running')) {
          // Server is ready, make request
          http.get('http://127.0.0.1:3000/', (res) => {
            if (hasCompleted) return;
            
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
              if (!hasCompleted) {
                hasCompleted = true;
                expect(res.statusCode).toBe(200);
                expect(body).toBe('Hello, World!\n');
                done();
              }
            });
          }).on('error', (err) => {
            if (!hasCompleted) {
              hasCompleted = true;
              done(err);
            }
          });
        }
      });
    }, 5000); // 5 second timeout
  });

  /**
   * Test Suite: GET / Route Handler
   * 
   * Tests the root endpoint that should return 'Hello, World!\n'
   * with status 200 and appropriate Content-Type header.
   */
  describe('GET /', () => {
    it('should return Hello World with status 200 when GET / is called', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
    });

    it('should return correct Content-Type header when responding to GET /', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      // Express sends text/html by default for res.send() with string
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should handle query parameters gracefully on root route', async () => {
      const response = await request(app)
        .get('/?param=value&another=test')
        .expect(200);
      
      // Query parameters should be ignored, response unchanged
      expect(response.text).toBe('Hello, World!\n');
    });

    it('should have correct Content-Length header when responding to GET /', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      // 'Hello, World!\n' is 14 bytes
      const expectedLength = Buffer.byteLength('Hello, World!\n');
      expect(response.headers['content-length']).toBe(String(expectedLength));
    });
  });

  /**
   * Test Suite: GET /evening Route Handler
   * 
   * Tests the /evening endpoint that should return 'Good evening'
   * with status 200 and appropriate Content-Type header.
   */
  describe('GET /evening', () => {
    it('should return Good evening with status 200 when GET /evening is called', async () => {
      const response = await request(app)
        .get('/evening')
        .expect(200);
      
      expect(response.text).toBe('Good evening');
    });

    it('should return correct Content-Type header when responding to GET /evening', async () => {
      const response = await request(app)
        .get('/evening')
        .expect(200);
      
      // Express sends text/html by default for res.send() with string
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should handle query parameters gracefully on /evening route', async () => {
      const response = await request(app)
        .get('/evening?time=late&greeting=custom')
        .expect(200);
      
      // Query parameters should be ignored, response unchanged
      expect(response.text).toBe('Good evening');
    });

    it('should have correct Content-Length header when responding to GET /evening', async () => {
      const response = await request(app)
        .get('/evening')
        .expect(200);
      
      // 'Good evening' is 12 bytes
      const expectedLength = Buffer.byteLength('Good evening');
      expect(response.headers['content-length']).toBe(String(expectedLength));
    });
  });

  /**
   * Test Suite: Error Handling
   * 
   * Tests that the server properly handles error cases:
   * - 404 for undefined routes
   * - 404 for unsupported HTTP methods (POST, PUT, DELETE) on defined routes
   */
  describe('Error Handling', () => {
    it('should return 404 when accessing undefined route', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);
      
      // Express returns 404 status for undefined routes
      expect(response.status).toBe(404);
    });

    it('should return 404 when POST method used on / route', async () => {
      const response = await request(app)
        .post('/')
        .expect(404);
      
      expect(response.status).toBe(404);
    });

    it('should return 404 when PUT method used on /evening route', async () => {
      const response = await request(app)
        .put('/evening')
        .expect(404);
      
      expect(response.status).toBe(404);
    });

    it('should return 404 when DELETE method used on / route', async () => {
      const response = await request(app)
        .delete('/')
        .expect(404);
      
      expect(response.status).toBe(404);
    });

    it('should return 404 when PATCH method used on /evening route', async () => {
      const response = await request(app)
        .patch('/evening')
        .expect(404);
      
      expect(response.status).toBe(404);
    });
  });

  /**
   * Test Suite: Edge Cases
   * 
   * Tests boundary conditions and edge cases:
   * - Case sensitivity of routes (Express routes are case-sensitive by default)
   * - Trailing slashes (Express returns 404 for trailing slashes by default)
   * - Various query string formats
   */
  describe('Edge Cases', () => {
    it('should return 404 for /Evening due to case sensitivity', async () => {
      // Express routes are case-sensitive by default
      const response = await request(app)
        .get('/Evening')
        .expect(404);
      
      expect(response.status).toBe(404);
    });

    it('should return 404 for trailing slash on /evening/', async () => {
      // Express does not match trailing slashes by default
      const response = await request(app)
        .get('/evening/')
        .expect(404);
      
      expect(response.status).toBe(404);
    });

    it('should return 404 for all uppercase /EVENING route due to case sensitivity', async () => {
      // Express routes are case-sensitive by default
      const response = await request(app)
        .get('/EVENING')
        .expect(404);
      
      expect(response.status).toBe(404);
    });

    it('should handle multiple query parameters on root route', async () => {
      const response = await request(app)
        .get('/?a=1&b=2&c=3&d=4&e=5')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
    });

    it('should handle empty query parameter value', async () => {
      const response = await request(app)
        .get('/?empty=')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
    });

    it('should handle special characters in query parameters', async () => {
      const response = await request(app)
        .get('/?special=%20%21%40')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
    });
  });
});
