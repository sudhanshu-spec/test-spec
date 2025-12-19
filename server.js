/**
 * server.js - Express Server Startup
 * 
 * This module is responsible for starting the Express server on the configured
 * host and port. The Express application configuration and route definitions
 * are imported from app.js, allowing for better testability.
 * 
 * The server binds to 127.0.0.1:3000 by default and logs a startup message
 * to the console when ready to accept connections.
 * 
 * For testing purposes, import app.js directly instead of this file to avoid
 * automatic server startup.
 */

const app = require('./app');

// Server configuration constants
const hostname = '127.0.0.1';
const port = 3000;

// Start the Express server and listen for incoming connections
// The callback function logs a message confirming server startup
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
