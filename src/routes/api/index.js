/**
 * API Route Aggregator Module
 *
 * This module assembles the JSON API from its four domain routers and exports
 * the single Router that src/app.js mounts at '/api'. It owns no route, no path
 * prefix, no middleware and no terminal handler: every endpoint literal lives in
 * the domain router that implements it, the cross-cutting middleware (CORS, the
 * JSON body parser, authentication on the protected groups) is registered in
 * src/app.js or inside the router that needs it, and a path this aggregator does
 * not answer falls through to the '/api'-scoped 404 and error handler that
 * src/app.js registers after it.
 *
 * Usage in src/app.js:
 *   const { apiRoutes } = require('./routes');
 *   app.use('/api', apiRoutes);
 *
 * @module src/routes/api
 */

const express = require('express');

const authRoutes = require('./auth.routes');
const menuRoutes = require('./menu.routes');
const ordersRoutes = require('./orders.routes');
const reservationsRoutes = require('./reservations.routes');

const apiRoutes = express.Router();

// Menu is the only router mounted at the API root: it owns both '/categories'
// and '/menu-items'. Orders and reservations carry their own router-level
// authentication guard, so no guard is mounted here, where it would also cover
// the public auth and menu paths.
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/', menuRoutes);
apiRoutes.use('/orders', ordersRoutes);
apiRoutes.use('/reservations', reservationsRoutes);

module.exports = apiRoutes;
