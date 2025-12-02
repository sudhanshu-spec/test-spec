/**
 * HTTP Server Entry Point
 * 
 * This file serves as the application entry point only, responsible for
 * starting the HTTP server. Express application configuration and routes
 * are separated into their respective modules per Express.js best practices.
 * 
 * This separation enables:
 * - Unit testing the Express app without starting the HTTP server
 * - Clean separation of concerns
 * - Environment-based configuration
 * 
 * Entry point: npm start -> node server.js
 * 
 * @module server
 */

const app = require('./src/app');
const config = require('./src/config');

app.listen(config.port, config.host, () => {
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
