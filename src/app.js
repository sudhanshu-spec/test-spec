// Express application initialization and configuration
// Responsibilities: Create app instance, configure middleware, mount routes

const express = require('express');
const routes = require('./routes');

const app = express();

// Future middleware can be added here:
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

// Mount all routes
app.use('/', routes);

// Export app without calling listen() for testability
module.exports = app;
