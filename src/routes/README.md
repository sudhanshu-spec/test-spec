# Routes Module

This module defines the HTTP routing surface for the application. It provides the route handlers that get mounted by the Express app in `src/app.js`. When a request comes in, it flows through here to determine what response to send back.

## Available Routes

| Route | Method | Response |
|-------|--------|----------|
| `/` | GET | `Hello, World!\n` (with trailing newline) |
| `/evening` | GET | `Good evening` (no trailing newline) |
| `/health` | GET | JSON: `{ status: 'ok', uptime: <seconds>, timestamp: <ms> }` |

## Files

**index.js**  
Route aggregator using the barrel pattern. This file imports all route modules and re-exports them in a single object. It exports `{ mainRoutes, healthRoutes }` so that `src/app.js` can import everything with one clean statement.

**main.routes.js**  
Route handler implementations using Express Router. This is where the actual GET handlers for `/` and `/evening` are defined. Each handler sends back a plain text response.

**health.routes.js**  
Health check endpoint using Express Router. Defines GET /health that returns a JSON response with application status ('ok'), process uptime in seconds, and current timestamp in milliseconds. Used by PM2 and load balancers for production readiness probing.

## Adding New Routes

To add new routes to this application:

1. **For related routes**: Add new handlers directly to `main.routes.js` using the same pattern as the existing routes.

2. **For a new route group**: Create a new file (e.g., `api.routes.js`), define your handlers there, then export the router through `index.js`:
   ```javascript
   // In index.js
   const apiRoutes = require('./api.routes');
   module.exports = { mainRoutes, apiRoutes };
   ```

After adding routes, remember to mount them in `src/app.js` if they're in a new file.
