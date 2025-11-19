// Minimal entry point following Express.js best practices
// Responsibilities: Require app, start server, handle process errors

const app = require('./src/app');
const config = require('./src/config/server.config');

const server = app.listen(config.port, config.hostname, () => {
  console.log(`Server running at http://${config.hostname}:${config.port}/`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
  });
});

module.exports = server;
