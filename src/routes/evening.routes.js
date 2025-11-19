// Evening route handler
// Responsibilities: Define GET /evening endpoint

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Good evening');
});

module.exports = router;
