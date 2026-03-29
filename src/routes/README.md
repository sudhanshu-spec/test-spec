# Routes Module

This module defines the HTTP routing surface for the application. It provides the route handlers that get mounted by the Express app in `src/app.js`. When a request comes in, it flows through here to determine what response to send back.

## Available Routes

| Route | Method | Response | Length |
|-------|--------|----------|--------|
| `/` | GET | `Hello, World!\n` (with trailing newline) | 14 chars |
| `/evening` | GET | `Good evening` (no trailing newline) | 12 chars |

Both endpoints return HTTP `200 OK` with `Content-Type: text/html; charset=utf-8`. Any undefined route or unsupported HTTP method returns HTTP `404`. Query parameters appended to valid routes do not alter the response body or status code.

## Files

**index.js**  
Route aggregator using the barrel pattern. This file imports all route modules and re-exports them in a single object. It exports `{ mainRoutes }` so that `src/app.js` can import everything with one clean destructured import (e.g., `const { mainRoutes } = require('./routes')`).

**main.routes.js**  
Express Router implementation using `express.Router()`. This is where the actual GET handlers for `/` and `/evening` are defined. Each handler uses `res.send()` to deliver plain text responses with the exact response bodies documented in the Available Routes table above.

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

## Exports

| File | Export Shape | Description |
|------|-------------|-------------|
| `index.js` | `{ mainRoutes }` object | Barrel export aggregating all route modules for destructured import |
| `main.routes.js` | `express.Router` instance | Router with GET handlers mounted at `/` and `/evening` |

## Response Semantics and Test Compatibility

The exact response bodies defined in the Available Routes table are contractual — they are validated by both integration and unit test suites:

- **Integration tests (Supertest):** Validate the full HTTP response cycle by issuing requests against the Express app and asserting exact response bodies, status codes (`200` for defined routes, `404` for undefined routes and unsupported methods), and `Content-Type` headers (`text/html; charset=utf-8`).
- **Unit tests (router.stack inspection):** Validate the Express Router structure by inspecting `router.stack` to confirm route count, registered paths (`/` and `/evening`), HTTP methods (GET), handler function presence, and route ordering.

Any modification to response strings, route paths, or handler structure must maintain compatibility with both test approaches to ensure all 41 tests continue to pass.
