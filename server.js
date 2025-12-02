/**
 * HTTP Server Entry Point
 * 
 * This file serves as the entry point for the Express application.
 * It imports the configured Express app from src/app.js and starts
 * the HTTP server using configuration from src/config.
 * 
 * Startup: npm start or node server.js
 * 
 * @module server
 */

const app = require('./src/app');
const config = require('./src/config');

app.listen(config.port, config.host, () => {
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
