// Import Express.js v5.1.0 web framework - provides routing, middleware, and HTTP utilities
const express = require('express');

// Bind to localhost (127.0.0.1) for local development - restricts access to same machine for security
// For production deployment, consider using '0.0.0.0' to accept external connections
const hostname = '127.0.0.1';
// Port 3000 is a common convention for Node.js development servers
// Future enhancement: support PORT environment variable for flexible deployment
const port = 3000;

// Initialize Express application instance - creates a middleware-ready app for routing and request handling
const app = express();

// Root endpoint (GET /) - serves as welcome message and integration test target
// Returns plain text "Hello, World!" with intentional trailing newline for Backprop validation
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

// Secondary endpoint (GET /evening) - demonstrates Express routing with multiple routes
// Returns simple plain text response without trailing newline
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

// Start HTTP server and bind to configured hostname and port
// Callback executes when server is ready to accept incoming requests
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
