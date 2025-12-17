'use strict';

const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

router.get('/evening', (req, res) => {
  res.send('Good evening');
});

module.exports = router;
