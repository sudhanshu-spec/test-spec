/**
 * Express Router providing application routes
 * @module routes/index
 * @requires express
 */

const express = require('express');
const router = express.Router();

/**
 * GET / - Root endpoint returning greeting message
 * @name getRootEndpoint
 * @function
 * @memberof module:routes/index
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {void}
 * @example
 * // GET http://localhost:3000/
 * // Response: 200 OK
 * // Content-Type: text/html; charset=utf-8
 * // Body: "Hello, World!\n"
 */
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * GET /evening - Evening greeting endpoint
 * @name getEveningEndpoint
 * @function
 * @memberof module:routes/index
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {void}
 * @example
 * // GET http://localhost:3000/evening
 * // Response: 200 OK
 * // Content-Type: text/html; charset=utf-8
 * // Body: "Good evening"
 */
router.get('/evening', (req, res) => {
  res.send('Good evening');
});

module.exports = router;
