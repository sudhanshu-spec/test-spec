# src — Application Source

This directory contains the application core — the Express application factory, environment-driven configuration, and HTTP route definitions. Every module under `src/` is designed to be **side-effect-free on import**, meaning any file can be safely `require()`-ed by tests or other consumers without triggering network listeners, file I/O, or observable state changes.

## Key Files and Directories

| Path | Purpose |
|------|---------|
| `app.js` | Express application factory — creates the app, mounts routes, and exports the configured instance |
| `config/index.js` | Configuration module — exports `{ host, port, env }` from environment variables with safe defaults |
| `routes/index.js` | Route barrel aggregator — re-exports `mainRoutes` for centralized import |
| `routes/main.routes.js` | Route handler definitions — Express Router with `GET /` and `GET /evening` handlers |

## Architecture

### Factory Pattern

`src/app.js` follows the **Factory pattern**: it instantiates an Express application, wires middleware and routes, and exports the fully configured `app` object — but it **never** calls `app.listen()`. Server binding is exclusively the responsibility of the project-root `server.js`.

This deliberate separation provides two key benefits:

1. **Testability** — Integration tests (using Supertest) can `require` the app and issue HTTP assertions against it without spawning a live server or occupying a network port.
2. **Separation of Concerns** — Application assembly (middleware, route mounting) lives in the factory, while infrastructure concerns (host, port, process lifecycle) live in the entry point. Each module has a single, well-defined responsibility.

### No Side Effects on Import

All modules under `src/` are **side-effect-free** when `require()`-ed. Importing any source file will never:

- Start an HTTP server or bind to a network port
- Write to the file system or stdout
- Mutate global state beyond Node.js module caching

This guarantee allows test suites, REPL sessions, and other tooling to safely load any `src/` module without unintended consequences.

## Module Relationships

### Dependency Chain

The application bootstrap follows a clear, linear dependency chain:

```
server.js
├── requires src/app.js          (the configured Express application)
│   ├── requires express         (npm package)
│   └── requires src/routes/index.js   (barrel aggregator)
│       └── requires src/routes/main.routes.js  (route handlers)
│           └── requires express (Router constructor)
└── requires src/config/index.js (host, port, env configuration)
```

### Module Roles

| Module | Role | Depends On |
|--------|------|------------|
| `server.js` | Imports the app and config, binds the app to the configured host/port, manages process lifecycle | `src/app.js`, `src/config/index.js` |
| `src/app.js` | Creates the Express instance, mounts all route modules at their respective paths | `express`, `src/routes/index.js` |
| `src/routes/index.js` | Barrel aggregator — re-exports `mainRoutes` from `main.routes.js` | `src/routes/main.routes.js` |
| `src/routes/main.routes.js` | Defines the Express Router with `GET /` and `GET /evening` handlers | `express` |
| `src/config/index.js` | Reads `process.env` and exports `{ host, port, env }` with fallback defaults | Node.js `process.env` |

## Design Patterns

### Barrel Export Pattern

`src/routes/index.js` acts as a **barrel aggregator** — it imports route modules from the `routes/` directory and re-exports them through a single, centralized entry point:

```js
const mainRoutes = require('./main.routes');
module.exports = { mainRoutes };
```

Consumers (such as `src/app.js`) destructure this barrel import rather than reaching into individual route files directly. This pattern provides a stable public API for the routing layer: internal route files can be split, renamed, or reorganized without affecting any external consumer, as long as the barrel's export shape (`{ mainRoutes }`) is preserved.

### Twelve-Factor Configuration

`src/config/index.js` follows the [Twelve-Factor App](https://12factor.net/config) methodology by **externalizing all runtime configuration to environment variables**. The module reads `process.env` values synchronously on first `require()` and exports a frozen configuration object:

| Export Key | Environment Variable | Default Value | Notes |
|------------|---------------------|---------------|-------|
| `host` | `HOST` | `'127.0.0.1'` | Loopback address for local development |
| `port` | `PORT` | `3000` | Parsed via `parseInt(value, 10)` with radix-10 |
| `env` | `NODE_ENV` | `'development'` | Runtime environment identifier |

No configuration values are hardcoded in application source files. Deployment targets override behavior exclusively through environment variables.

### Separation of Concerns

Each layer in the `src/` architecture has a single, focused responsibility. The following boundaries are strictly enforced:

| Layer | Responsible For | Must NOT Contain |
|-------|----------------|------------------|
| **Route handlers** (`routes/main.routes.js`) | HTTP method/path registration, response generation | Configuration logic, server binding, middleware registration |
| **Configuration** (`config/index.js`) | Environment variable parsing, default values | Route definitions, Express app references, server lifecycle |
| **Application factory** (`src/app.js`) | Express instantiation, middleware wiring, route mounting | `app.listen()` calls, host/port configuration, process management |
| **Server entry point** (`server.js`) | Network binding, startup logging, graceful shutdown | Route definitions, middleware setup, configuration parsing |

This separation ensures that each module can be tested, maintained, and evolved independently.

---

For project-level documentation, prerequisites, API reference, and test instructions, see the root [README.md](../README.md).
