# Routes Module

This module defines the HTTP routing surface for the application. It provides the route handlers that get mounted by the Express app in `src/app.js`. When a request comes in, it flows through here to determine what response to send back.

## Available Routes

| Route | Method | Response |
|-------|--------|----------|
| `/` | GET | `Hello, World!\n` (with trailing newline) |
| `/evening` | GET | `Good evening` (no trailing newline) |

## Files

**index.js**  
Route aggregator using the barrel pattern. This file imports all route modules and exports a `configureRoutes(app)` function that mounts all route handlers on the Express application. `src/app.js` calls `configureRoutes(app)` to register all routes in one step.

**main.routes.js**  
Route handler implementations using Express Router. This is where the actual GET handlers for `/` and `/evening` are defined. Each handler sends back a plain text response.

## Adding New Routes

To add new routes to this application:

1. **For related routes**: Add new handlers directly to `main.routes.js` using the same pattern as the existing routes.

2. **For a new route group**: Create a new file (e.g., `api.routes.js`), define your handlers there, then mount it inside the `configureRoutes` function in `index.js`:
   ```javascript
   // In index.js — add new router mounts inside configureRoutes:
   const apiRouter = require('./api.routes');

   function configureRoutes(app) {
     app.use('/', mainRouter);
     app.use('/api', apiRouter);  // New route group
   }
   ```

After adding routes, just add the new `app.use()` call inside `configureRoutes` in `index.js`. No changes to `src/app.js` are needed.
