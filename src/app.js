'use strict';

const express = require('express');
const { mainRoutes } = require('./routes');

const app = express();

app.use('/', mainRoutes);

module.exports = app;
