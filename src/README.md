# src — Express.js Application Source Modules

This directory contains the **Application Layer** of the Express.js four-layer modular architecture. It houses the Express application factory, route definitions, and environment-driven configuration — everything needed to assemble and configure the Express application instance without binding it to an HTTP server.

The four-layer architecture separates concerns across the codebase:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Entry Layer** | `server.js` (project root) | HTTP server binding — sole module calling `app.listen()` |
| **Application Layer** | `src/app.js` | Express app assembly — creates instance, mounts routes, exports app |
| **Routing Layer** | `src/routes/` | Endpoint definitions via Express `Router` with Barrel Pattern aggregation |
| **Configuration Layer** | `src/config/` | Twelve-Factor App environment-driven settings with fallback defaults |

## Directory Structure

```
src/
├── app.js                  Application Factory (Express instance creation and route mounting)
├── config/
│   ├── index.js            Twelve-Factor configuration module ({ host, port, env })
│   └── README.md           Configuration module documentation
└── routes/
    ├── index.js            Barrel Pattern aggregator (centralized route re-export)
    ├── main.routes.js      Express Router handlers (GET / and GET /evening)
    └── README.md           Routing module documentation
```

## Key Files

- **`app.js`** — The **Application Factory**. Creates an Express instance via `express()`, mounts the main route middleware at the root path via `app.use('/', mainRoutes)`, and exports the fully configured application. Critically, it does **not** call `app.listen()` — that responsibility belongs exclusively to `server.js` in the Entry Layer.

- **`config/index.js`** — The **Configuration Layer** module. Follows the Twelve-Factor App methodology by reading `HOST`, `PORT`, and `NODE_ENV` from `process.env` with hardcoded fallback defaults (`'127.0.0.1'`, `3000`, `'development'`). Exports a synchronously-evaluated object `{ host, port, env }`. `PORT` is parsed via `parseInt(value, 10)` with radix-10 enforcement.

- **`routes/index.js`** — The **Barrel Pattern** aggregator. Imports `main.routes.js` and re-exports it as `{ mainRoutes }`, enabling `src/app.js` to import all route modules with a single `require('./routes')` call. This pattern supports scalable route management as new route modules are added.

- **`routes/main.routes.js`** — The **Express Router** handler module. Creates a router via `express.Router()`, defines `router.get('/')` (returns `'Hello, World!\n'`) and `router.get('/evening')` (returns `'Good evening'`) using `res.send()`, and exports the configured router instance.

## Architecture

### Factory Pattern

The module uses the **Factory Pattern** to maximize testability and enforce separation of concerns:

1. `app.js` creates and exports the Express application but does **not** call `app.listen()`
2. `server.js` (in the project root) imports the pre-configured app and binds it to a host and port via `app.listen(config.port, config.host, callback)`
3. This decoupling allows integration tests to import the app directly and run HTTP assertions via **Supertest** (`request(app).get(...)`) without starting a live HTTP server or occupying a network port

### Barrel Pattern

Route modules are aggregated through `src/routes/index.js`, which serves as the central route registry:

```js
const { mainRoutes } = require('./routes');
app.use('/', mainRoutes);
```

This single import point simplifies the application layer and makes adding new route modules straightforward — new routes are registered in the barrel file and automatically available to `app.js`.

### Twelve-Factor Configuration

`src/config/index.js` externalizes all configuration via environment variables, following the Twelve-Factor App methodology:

| Variable | Default | Type | Description |
|----------|---------|------|-------------|
| `HOST` | `'127.0.0.1'` | `string` | Server host binding address |
| `PORT` | `3000` | `number` | Server port number (parsed with `parseInt(value, 10)`) |
| `NODE_ENV` | `'development'` | `string` | Application environment identifier |

### CommonJS Module System

All source files use the **CommonJS** module system (`require()` / `module.exports`) throughout. No ES Module (`import` / `export`) syntax is used. This ensures compatibility with Node.js's default module resolution and the existing test infrastructure.

## Module Relationships

| Module | Layer | Role | Imports | Exports |
|--------|-------|------|---------|---------|
| `server.js` | Entry | Binds Express app to HTTP interface via `app.listen()` | `src/app`, `src/config` | — |
| `src/app.js` | Application | Creates Express instance, mounts routes | `express`, `src/routes` | Configured `app` |
| `src/config/index.js` | Configuration | Provides environment-based configuration | (reads `process.env`) | `{ host, port, env }` |
| `src/routes/index.js` | Routing (Barrel) | Aggregates and re-exports route modules | `./main.routes` | `{ mainRoutes }` |
| `src/routes/main.routes.js` | Routing (Handler) | Defines `GET /` and `GET /evening` endpoints | `express` (for `Router`) | Router instance |

## Testing with the Factory Pattern

Because `src/app.js` exports the Express application without calling `listen()`, tests can exercise the full HTTP contract without starting a live server:

```js
const request = require('supertest');
const app = require('../../src/app');

// Integration test — no server binding required
await request(app).get('/').expect(200);
```

This pattern enables Supertest to inject requests directly into the Express middleware pipeline, providing fast, isolated, and deterministic integration tests across all 14 endpoint contract assertions.

For project-level documentation, see the root [README.md](../README.md).
