# Routes Module

This module defines the HTTP routing surface for the application. It provides the route handlers that get mounted by the Express app in `src/app.js`. When a request comes in, it flows through here to determine what response to send back.

## Available Routes

| Route | Method | Status | Content-Type | Response Body | Length |
|-------|--------|--------|--------------|---------------|--------|
| `/` | GET | 200 | `text/html; charset=utf-8` | `'Hello, World!\n'` (includes trailing `\n` newline) | 14 characters |
| `/evening` | GET | 200 | `text/html; charset=utf-8` | `'Good evening'` (no trailing newline) | 12 characters |

Both endpoints use `res.send()` which sets the `Content-Type` header to `text/html; charset=utf-8` by default when passed a string argument. Response body strings must match exactly as documented above — no embellishment or modification is permitted.

### Unmatched Routes

Routes that do not match any registered handler are handled by Express's built-in 404 mechanism:

- **Undefined paths** (e.g., `GET /foo`, `GET /bar/baz`) return **HTTP 404** via Express default handling.
- **Unsupported methods** on defined paths (e.g., `POST /`, `PUT /evening`, `DELETE /`, `PATCH /evening`) also return **HTTP 404**.
- **No custom error middleware** is used or permitted. All error responses rely exclusively on Express's default behavior to keep the tutorial scope focused.

## Files

**index.js**  
Route aggregator using the barrel pattern. This file imports all route modules and re-exports them in a single object. The barrel export shape is `{ mainRoutes }` — an object with a named property, **not** a default export. Consumers must destructure the import:

```javascript
const { mainRoutes } = require('./routes');
```

The property name `mainRoutes` must be preserved exactly as shown to avoid breaking existing imports in `src/app.js` and any other consumers that depend on this contract.

**main.routes.js**  
Route handler implementations using Express Router. This is where the actual GET handlers for `/` and `/evening` are defined. Each handler sends back a plain text response.

## Adding New Routes

To add new routes to this application:

1. **For related routes**: Add new handlers directly to `main.routes.js` using the same pattern as the existing routes.

2. **For a new route group**: Create a new file (e.g., `api.routes.js`), define your handlers there, then export the router through `index.js`:
   ```javascript
   // In api.routes.js
   'use strict';
   const express = require('express');
   const router = express.Router();
   router.get('/example', (req, res) => { res.send('Example'); });
   module.exports = router;
   ```
   ```javascript
   // In index.js
   const apiRoutes = require('./api.routes');
   module.exports = { mainRoutes, apiRoutes };
   ```

3. **Mount in the app**: After adding a new route file and exporting it through `index.js`, mount it in `src/app.js` using `app.use()`.

### Architectural Rules for Route Handlers

When writing route handlers, observe the following rules to maintain the project's separation of concerns:

- **No configuration logic in handlers.** Route handlers must not read environment variables or import configuration modules directly. Configuration is the responsibility of `server.js` and `src/config/index.js`.
- **Side-effect-free on import.** All route modules must be safe to `require()` without triggering side effects (no server binding, no database connections, no file I/O at module scope). This ensures test suites can import modules in isolation.
- **Consistent export pattern.** Every new route file must export its router instance directly via `module.exports = router`, matching the pattern used in `main.routes.js`.
