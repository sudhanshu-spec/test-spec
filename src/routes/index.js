// Central route registration
// Responsibilities: Import all route modules, combine into single router

const express = require('express');
const router = express.Router();

const homeRoutes = require('./home.routes');
const eveningRoutes = require('./evening.routes');

// Mount route modules
router.use('/', homeRoutes);
router.use('/evening', eveningRoutes);

module.exports = router;
