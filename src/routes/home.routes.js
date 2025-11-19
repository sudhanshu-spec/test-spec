// Home route handler
// Responsibilities: Define GET / endpoint

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

module.exports = router;
