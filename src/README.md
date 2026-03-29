# src - Application Source

This directory contains the application core — the Express app factory that creates and configures the Express application instance. It handles all app-level setup (middleware, routes) without dealing with server binding, keeping concerns cleanly separated. This decoupling of app creation in `src/app.js` from server binding in `server.js` enables Supertest-based integration testing by allowing tests to import the configured app directly without starting an HTTP server.

## Key Files

- **app.js** — The Express application factory. Creates the app instance, mounts the main routes at the root path (`/`), and exports the configured app for use elsewhere.

## Architecture

The module uses a factory pattern for better testability:

1. `app.js` creates and exports the Express app but does **not** call `app.listen()`
2. `server.js` (in the project root) imports the app and binds it to a host and port
3. This separation allows unit tests to import and test the app without starting a real HTTP server

## Module Dependency Graph

The following shows how modules import one another through the `require()` chain:

- **`server.js`** imports `src/app` (Express Application) and `src/config` (host, port, env)
- **`src/app.js`** imports `express` (npm package v5.1.0) and `./routes` (barrel index)
- **`src/routes/index.js`** imports `./main.routes` and re-exports `{ mainRoutes }`
- **`src/routes/main.routes.js`** imports `express` and creates an `express.Router()` with GET handlers
- **`src/config/index.js`** reads `process.env` for `HOST`, `PORT`, and `NODE_ENV` with deterministic defaults

## Module Relationships

| Module | Role |
|--------|------|
| `server.js` | Imports the app and binds it to the configured host/port |
| `config/` | Provides environment-based configuration (host, port, env) |
| `routes/` | Provides the `mainRoutes` router, mounted at the root path |

For project-level documentation, see the root [README.md](../README.md).
