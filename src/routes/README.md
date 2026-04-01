# Routes Module — Routing Layer

This module implements the **Routing Layer** of the four-layer Express.js modular architecture. It defines the HTTP routing surface for the application using Express Router, providing the route handlers that are mounted by the Application Layer (`src/app.js`) via `app.use('/', mainRoutes)`. When an incoming HTTP request reaches the Express application, it flows through this layer to determine the appropriate response.

The Routing Layer employs two key design patterns:

- **Express Router Pattern** — Route handlers are defined on isolated `express.Router()` instances, keeping endpoint logic decoupled from application assembly
- **Barrel Pattern** — Route modules are aggregated through a single index export (`src/routes/index.js`), enabling the Application Layer to import all routes with one `require()` call

## Available Routes

| Method | Path | Response Body | Trailing Newline | Body Length | Status Code | Content-Type |
|--------|------|---------------|------------------|-------------|-------------|--------------|
| `GET` | `/` | `Hello, World!\n` | Yes | 14 characters | `200` | `text/html; charset=utf-8` |
| `GET` | `/evening` | `Good evening` | No | 12 characters | `200` | `text/html; charset=utf-8` |

All undefined routes and unsupported HTTP methods (e.g., `POST /`, `PUT /evening`, `DELETE /`) return HTTP `404` via Express's default handler. No custom error-handling middleware is used.

## Files

**`index.js`** — Barrel Pattern Aggregator  
Route barrel aggregator implementing the Barrel Pattern for centralized route imports. This file uses `require('./main.routes')` to import the main route module and re-exports it as a named export via `module.exports = { mainRoutes }`. This allows the Application Layer (`src/app.js`) to import all route modules with a single destructured `require()` statement:

```javascript
const { mainRoutes } = require('./routes');
```

**`main.routes.js`** — Express Router Handlers  
Route handler implementations using Express Router. This file creates an isolated router instance via `const router = express.Router()`, then defines `GET` handlers using `router.get()` method calls:

- `router.get('/', (req, res) => { res.send('Hello, World!\n'); })` — Root route returning the greeting with a trailing newline
- `router.get('/evening', (req, res) => { res.send('Good evening'); })` — Evening route returning the greeting without a trailing newline

The router instance is exported via `module.exports = router` for consumption by the barrel aggregator.

## Express Router Pattern

The Routing Layer uses the **Express Router** pattern to define modular, mountable route handlers. This pattern isolates route definitions from the Express application instance, promoting separation of concerns and testability.

**How it works:**

1. **Create a Router instance** — Call `express.Router()` to create a standalone routing object that behaves like a mini Express application
2. **Define handlers** — Attach HTTP method handlers to the router using `router.get()`, `router.post()`, etc., with a path and callback function `(req, res) => { ... }`
3. **Send responses** — Use `res.send()` within each handler to return the response body (Express automatically sets `Content-Type: text/html; charset=utf-8` for string responses)
4. **Export the router** — Export the configured router via `module.exports = router` so it can be imported and mounted by the Application Layer

**Example pattern from `main.routes.js`:**

```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

module.exports = router;
```

## Adding New Routes

To add new routes to this application following the Express Router pattern:

1. **For related routes in an existing module**: Add new `router.get()` (or `router.post()`, `router.put()`, `router.delete()`) handlers directly to `main.routes.js`, following the same Express Router pattern as the existing route definitions.

2. **For a new route group**: Create a new file (e.g., `api.routes.js`) with its own `express.Router()` instance, define handlers, and export the router. Then register it in the barrel aggregator (`index.js`) and mount it in the Application Layer (`src/app.js`):

   ```javascript
   // api.routes.js — new route module
   const express = require('express');
   const router = express.Router();

   router.get('/status', (req, res) => {
     res.send('OK');
   });

   module.exports = router;
   ```

   ```javascript
   // index.js — updated barrel aggregator
   const mainRoutes = require('./main.routes');
   const apiRoutes = require('./api.routes');

   module.exports = { mainRoutes, apiRoutes };
   ```

   ```javascript
   // src/app.js — mount the new routes
   const { mainRoutes, apiRoutes } = require('./routes');
   app.use('/', mainRoutes);
   app.use('/api', apiRoutes);
   ```

After adding routes, ensure you mount them in `src/app.js` via `app.use()` if they are in a new route module. All route modules use CommonJS (`require`/`module.exports`) — no ESM `import`/`export` syntax.
