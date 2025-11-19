// Minimal entry point following Express.js best practices
// Responsibilities: Require app, start server, handle process errors

const app = require('./src/app');
const config = require('./src/config/server.config');

const server = app.listen(config.port, config.hostname, () => {
  console.log(`Server running at http://${config.hostname}:${config.port}/`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = server;
