# hao-backprop-test

A Node.js tutorial server demonstrating Express.js integration with multiple HTTP endpoints.

> **Note**: This is a test project for backprop integration.

## Prerequisites

Before running this application, ensure you have the following installed:

| Requirement | Minimum Version | Recommended Version |
|-------------|-----------------|---------------------|
| Node.js | 18.x | 20.19.x (LTS) |
| npm | 8.x | 10.8.x |

### Verify Installation

```bash
node --version
# Expected: v20.x.x or higher

npm --version
# Expected: 10.x.x or higher
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd hao-backprop-test
```

2. Install dependencies:

```bash
npm install
```

This will install Express.js (^5.1.0) and all required dependencies.

## Usage

### Start the Server

Run the server with default configuration:

```bash
npm start
```

**Expected output:**
```
Server running at http://127.0.0.1:3000/
```

### Custom Configuration

Override default settings using environment variables:

```bash
# Custom host and port
HOST=0.0.0.0 PORT=8080 npm start

# Production mode
NODE_ENV=production npm start

# Combined configuration
HOST=0.0.0.0 PORT=8080 NODE_ENV=production npm start
```

## API Reference

This server exposes two HTTP GET endpoints:

### GET `/`

Returns a greeting message.

**Request:**
```bash
curl -s http://127.0.0.1:3000/
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** `Hello, World!\n` (14 characters, includes trailing newline)

**Example:**
```bash
curl -s http://127.0.0.1:3000/
# Output: Hello, World!
```

### GET `/evening`

Returns an evening greeting message.

**Request:**
```bash
curl -s http://127.0.0.1:3000/evening
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** `Good evening` (12 characters, no trailing newline)

**Example:**
```bash
curl -s http://127.0.0.1:3000/evening
# Output: Good evening
```

### Health Check

Verify both endpoints are operational:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
```

## Project Structure

```
hao-backprop-test/
├── server.js                    # Entry point - HTTP server binding
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── jest.config.js               # Jest test framework configuration
├── src/                         # Application source root
│   ├── app.js                   # Express application factory
│   ├── config/                  # Configuration module
│   │   └── index.js             # Environment variable management
│   └── routes/                  # Routing surface
│       ├── index.js             # Route aggregator (barrel pattern)
│       └── main.routes.js       # Route handlers implementation
└── tests/                       # Test suite root
    ├── unit/                    # Isolated module tests
    │   ├── config.test.js       # Configuration module tests
    │   └── routes.test.js       # Route handler tests
    ├── integration/             # HTTP endpoint tests
    │   └── endpoints.test.js    # API endpoint contract tests
    └── lifecycle/               # Server lifecycle tests
        └── server.test.js       # Startup/shutdown tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app and binds it to the configured host/port |
| `src/app.js` | Express application factory - creates and exports configured Express app with mounted routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env }` from environment variables |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports |
| `src/routes/main.routes.js` | Route handlers - implements GET `/` and GET `/evening` endpoints |

## Environment Variables

The application supports the following environment variables for configuration:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |

### Configuration Examples

**Development (default):**
```bash
npm start
# Binds to http://127.0.0.1:3000/
```

**Production deployment:**
```bash
HOST=0.0.0.0 PORT=80 NODE_ENV=production npm start
# Binds to http://0.0.0.0:80/
```

**Custom port:**
```bash
PORT=8080 npm start
# Binds to http://127.0.0.1:8080/
```

## Architecture

This project implements a **Layered Monolithic Architecture** using Express.js 5.x, designed for maintainability, testability, and clear separation of concerns. The architecture follows enterprise-grade patterns while remaining simple enough for tutorial purposes.

### Layered Architecture Overview

The application is organized into four distinct layers, each with a specific responsibility:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ENTRY POINT LAYER                            │
│                          server.js                                  │
│              HTTP server binding and startup logging                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     APPLICATION CORE LAYER                          │
│                        src/app.js                                   │
│         Express factory pattern - creates app without binding       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
┌──────────────────────────┐    ┌──────────────────────────────────────┐
│   CONFIGURATION LAYER    │    │          ROUTING LAYER               │
│   src/config/index.js    │    │         src/routes/                  │
│  Twelve-Factor App       │    │  ├── index.js (Barrel pattern)       │
│  environment config      │    │  └── main.routes.js (Handlers)       │
└──────────────────────────┘    └──────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| **Entry Point Layer** | `server.js` | HTTP server binding via `app.listen()`, port configuration from config module, startup logging with server URL |
| **Application Core Layer** | `src/app.js` | Express application factory creation, route mounting via `app.use()`, middleware configuration, exports unconfigured app for testing |
| **Configuration Layer** | `src/config/index.js` | Environment variable parsing (`HOST`, `PORT`, `NODE_ENV`), sensible default values, configuration object export |
| **Routing Layer** | `src/routes/` | Route aggregation via barrel pattern, endpoint handler implementation, HTTP method and path declarations |

### Request Flow Architecture

The following diagram illustrates how HTTP requests flow through the layered architecture:

```
                                    ┌─────────────────┐
                                    │     Client      │
                                    │  HTTP Request   │
                                    └────────┬────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ENTRY POINT LAYER: server.js                                       │
│  ─────────────────────────────                                      │
│  • Imports Express app from src/app.js                              │
│  • Imports configuration from src/config/index.js                   │
│  • Binds HTTP server to configured host:port                        │
│  • Logs startup message with server URL                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  APPLICATION CORE LAYER: src/app.js                                 │
│  ────────────────────────────────                                   │
│  • Creates Express application instance                             │
│  • Mounts routes from src/routes/                                   │
│  • Exports app WITHOUT starting server (Factory Pattern)            │
│  • Enables unit testing without HTTP binding overhead               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ROUTING LAYER: src/routes/                                         │
│  ────────────────────────────                                       │
│  • index.js: Barrel pattern aggregator for route exports            │
│  • main.routes.js: Implements GET / and GET /evening handlers       │
│  • Uses Express Router for declarative route definitions            │
│  • Returns HTTP responses with appropriate status codes             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Client      │
                    │  HTTP Response  │
                    └─────────────────┘
```

**Simplified Request Flow:**
```
Client → server.js → Express App (src/app.js) → Router (src/routes/) → Response
                           ↑
                     Configuration
                   (src/config/index.js)
```

### Separation of Concerns

This architecture enforces strict separation between HTTP binding and application logic:

| Concern | Location | Description |
|---------|----------|-------------|
| **HTTP Server Binding** | `server.js` | Only file that calls `app.listen()`. Responsible for binding the Express app to a network port. |
| **Application Logic** | `src/app.js` | Creates and configures Express app WITHOUT starting the server. Exports the app instance for testing. |
| **Configuration** | `src/config/index.js` | Centralizes all environment-driven configuration. No business logic. |
| **Route Handling** | `src/routes/` | Contains all endpoint definitions and response logic. Decoupled from server lifecycle. |

**Key Benefits of This Separation:**
- **Testability**: `src/app.js` exports the Express app without starting a server, allowing unit tests to use `supertest` without binding to a port
- **Flexibility**: Server binding configuration (host, port) is separate from application logic
- **Maintainability**: Each layer has a single responsibility, making code easier to understand and modify
- **Scalability**: New routes can be added without touching server binding logic

### Design Patterns Used

| Pattern | Implementation | Purpose |
|---------|----------------|---------|
| **Factory Pattern** | `src/app.js` | Exports a configured Express app without starting the server, enabling unit testing without HTTP binding overhead |
| **Barrel Pattern** | `src/routes/index.js` | Aggregates route exports for clean imports and easy expansion of route modules |
| **Twelve-Factor App** | `src/config/index.js` | Configuration externalized to environment variables with sensible defaults |
| **CommonJS Modules** | All `.js` files | Uses `require`/`module.exports` for native Node.js compatibility without transpilation |

### Module Dependency Graph

```
server.js
    ├── requires → src/app.js
    │                  └── requires → src/routes/index.js
    │                                      └── requires → src/routes/main.routes.js
    └── requires → src/config/index.js
```

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify express installation
npm ls express
# Expected: express@5.1.0
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server |
| `test` | `jest` | Run the complete test suite |
| `test:watch` | `jest --watch` | Run tests in watch mode for development |
| `test:coverage` | `jest --coverage` | Run tests and generate coverage report |
| `test:ci` | `jest --ci --coverage` | Run tests optimized for CI/CD environments |

## Testing

This project includes a comprehensive test suite built with **Jest 30.x** and **Supertest** for HTTP endpoint testing.

### Test Execution Commands

| Purpose | Command | Description |
|---------|---------|-------------|
| Run all tests | `npm test` | Execute the complete test suite |
| Watch mode | `npm run test:watch` | Re-run tests automatically on file changes |
| Coverage report | `npm run test:coverage` | Generate detailed code coverage metrics |
| CI execution | `npm run test:ci` | Optimized execution for CI/CD pipelines |
| Single file | `npx jest tests/unit/config.test.js` | Run a specific test file |
| Pattern match | `npx jest --testPathPatterns="config"` | Run tests matching a pattern |

### Test Structure

The test suite is organized into three categories based on test scope, following best practices for Express.js application testing:

```
tests/
├── unit/                    # Isolated module tests
│   ├── config.test.js       # Configuration defaults and parsing
│   └── routes.test.js       # Route handler exports verification
├── integration/             # HTTP endpoint tests
│   └── endpoints.test.js    # API contract tests using Supertest
└── lifecycle/               # Server lifecycle tests
    └── server.test.js       # Startup and shutdown behavior
```

| Directory | Purpose | Test Approach |
|-----------|---------|---------------|
| `tests/unit/` | Test isolated modules without HTTP | Direct module imports with Jest assertions |
| `tests/integration/` | Test HTTP endpoint responses | Supertest requests against the Express app |
| `tests/lifecycle/` | Test server startup/shutdown | Mock-based lifecycle verification |

### Test Suite Documentation

Each test file serves a specific purpose in validating the Express.js application:

#### `tests/unit/config.test.js` - Configuration Module Tests

Tests the configuration layer (`src/config/index.js`) in isolation:

| Test Case | Description |
|-----------|-------------|
| Default values | Verifies `HOST='127.0.0.1'`, `PORT=3000`, `NODE_ENV='development'` when no env vars set |
| Environment variable parsing | Tests that `HOST`, `PORT`, `NODE_ENV` environment variables are correctly read |
| Port integer conversion | Ensures `PORT` is parsed as integer via `parseInt()` |
| Invalid port handling | Tests behavior when `PORT` is non-numeric |
| Configuration object structure | Validates exported object contains `{ host, port, env }` |

#### `tests/unit/routes.test.js` - Route Handler Tests

Tests the routing layer exports and structure:

| Test Case | Description |
|-----------|-------------|
| Router export validation | Verifies `main.routes.js` exports an Express Router instance |
| Route aggregator exports | Tests that `routes/index.js` correctly re-exports `mainRoutes` |
| Handler function existence | Confirms route handlers are properly defined |

#### `tests/integration/endpoints.test.js` - HTTP Endpoint Tests

Tests the complete HTTP request/response cycle using Supertest:

| Test Case | Description |
|-----------|-------------|
| `GET /` success | Returns `200 OK` with body `Hello, World!\n` |
| `GET /` content-type | Response has `Content-Type: text/html; charset=utf-8` |
| `GET /evening` success | Returns `200 OK` with body `Good evening` |
| `GET /evening` content-type | Response has `Content-Type: text/html; charset=utf-8` |
| Unknown route handling | `GET /invalid` returns `404 Not Found` |
| Method not allowed | `POST /`, `PUT /evening`, `DELETE /` return `404` |
| Response body exact match | Validates character-for-character response content |

#### `tests/lifecycle/server.test.js` - Server Lifecycle Tests

Tests server startup and shutdown behavior:

| Test Case | Description |
|-----------|-------------|
| Server startup | Verifies `app.listen()` is called with correct host and port |
| Startup logging | Confirms server logs URL on successful startup |
| Graceful shutdown | Tests server can be stopped without errors |
| Configuration integration | Validates server uses config module for host/port |
| Error handling | Tests behavior when port is already in use |

### Coverage Targets

The project enforces the following code coverage thresholds:

| Coverage Metric | Target | Description |
|-----------------|--------|-------------|
| Line Coverage | ≥ 80% | Percentage of code lines executed by tests |
| Branch Coverage | ≥ 75% | Percentage of conditional branches tested |
| Function Coverage | ≥ 90% | Percentage of functions called by tests |
| Statement Coverage | ≥ 80% | Percentage of statements executed by tests |

**Generate and view coverage report:**
```bash
npm run test:coverage
# Coverage report generated in ./coverage/
# Open ./coverage/lcov-report/index.html for detailed HTML report
```

### Test Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | JavaScript testing framework and test runner |
| `supertest` | ^7.1.4 | HTTP assertion library for Express endpoint testing |

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Error: listen EADDRINUSE: address already in use
# Solution: Use a different port
PORT=3001 npm start
```

**Permission denied on port 80:**
```bash
# Error: listen EACCES: permission denied
# Solution: Use a port above 1024 or run with elevated privileges
PORT=8080 npm start
```

**Module not found:**
```bash
# Error: Cannot find module 'express'
# Solution: Install dependencies
npm install
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating Node.js server development with Express.js framework.*
