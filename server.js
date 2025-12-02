const express = require('express');

const hostname = '127.0.0.1';
const port = 3000;

const app = express();

app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

app.get('/evening', (req, res) => {
  res.send('Good evening');
});

// Conditional server startup for testability
// When running directly (node server.js), the server starts on the configured host:port
// When imported as a module (require('./server')), returns app without starting server
if (require.main === module) {
  app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
}

// Export the Express app for testing with supertest
module.exports = app;
