/**
 * Express.js Server Entry Point
 * Initializes and starts the Express application server
 * @module server
 */

const app = require('./src/app');
const config = require('./src/config/server.config');

/**
 * Start the Express server
 * @function
 */
app.listen(config.port, config.hostname, () => {
  console.log(`Server running at http://${config.hostname}:${config.port}/`);
});
