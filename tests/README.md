# Tests

This directory contains the automated test suite for the Express.js application, built with [Jest](https://jestjs.io/) (`^30.2.0` testing framework) and [Supertest](https://github.com/ladjs/supertest) (`^7.1.4` HTTP assertions). The suite comprises **41 tests across 4 suites** organized in a three-layer structure — unit tests, integration tests, and lifecycle tests — providing comprehensive coverage of the Express.js modular architecture.

## Test Categories

### tests/unit/

Unit tests verify module contracts and internal logic without making HTTP requests.

- **config.test.js** (15 tests) — Tests configuration module defaults (`127.0.0.1`, `3000`, `development`), environment variable parsing, custom overrides, edge cases (invalid/empty PORT, whitespace, decimals), type checking, and configuration object structure using `jest.resetModules()` for fresh evaluation
- **routes.test.js** (7 tests) — Tests Express Router export, `router.stack` structure, two GET handlers for `/` and `/evening`, method definitions, handler functions, and path ordering

### tests/integration/

HTTP integration tests verify actual API endpoint behavior using Supertest against the Express app without requiring a live server.

- **endpoints.test.js** (14 tests) — Tests HTTP responses for `GET /` (200, `'Hello, World!\n'`), `GET /evening` (200, `'Good evening'`), Content-Type `text/html; charset=utf-8` headers, 404 error handling for undefined routes and unsupported methods (POST/PUT/DELETE), and edge cases (query parameters, double slash paths)

### tests/lifecycle/

Server startup and shutdown behavior tests verify the Express application lifecycle.

- **server.test.js** (5 tests) — Tests server binding to host/port via `app.listen()`, startup logging format `Server running at http://host:port/`, custom configuration values, graceful shutdown via `server.close()`, and EADDRINUSE error handling using `jest.doMock()` isolation

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode with coverage and default reporters
npm run test:ci
```

## Testing Stack

- **[Jest](https://jestjs.io/)** (`^30.2.0`) — Testing framework providing test runner, assertion library, module mocking (`jest.doMock()`, `jest.resetModules()`), and coverage reporting
- **[Supertest](https://github.com/ladjs/supertest)** (`^7.1.4`) — HTTP assertions library enabling integration testing of the Express app without binding to a live server

## Coverage Requirements

The project enforces minimum coverage thresholds to maintain code quality. Tests must meet these requirements to pass:

| Metric     | Threshold |
|------------|-----------|
| Branches   | 75%       |
| Functions  | 90%       |
| Lines      | 80%       |
| Statements | 80%       |

These thresholds are configured in `jest.config.js` and enforced during CI runs. Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.

## Total Test Count

The complete test suite comprises **41 tests** distributed across **4 suites**:

| Suite | File | Tests |
|-------|------|-------|
| Integration | `tests/integration/endpoints.test.js` | 14 |
| Unit (Config) | `tests/unit/config.test.js` | 15 |
| Unit (Routes) | `tests/unit/routes.test.js` | 7 |
| Lifecycle | `tests/lifecycle/server.test.js` | 5 |
| **Total** | | **41** |
