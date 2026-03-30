# Tests

This directory contains the automated test suite for the application, built with [Jest](https://jestjs.io/) (testing framework) and [Supertest](https://github.com/ladjs/supertest) (HTTP assertions). The test suite uses a three-layer approach covering unit tests, integration tests, and lifecycle tests to ensure comprehensive coverage of the application.

## Test Categories

### tests/unit/

Unit tests verify module contracts and internal logic without making HTTP requests.

- **config.test.js** - Tests the configuration module defaults, environment variable parsing, type checking, and edge cases (like invalid port values)
- **routes.test.js** - Tests the Express router structure, route definitions, and handler registration

### tests/integration/

HTTP integration tests verify actual API endpoint behavior using Supertest against the Express app.

- **endpoints.test.js** - Tests HTTP responses for `GET /` and `GET /evening`, including status codes, response bodies, Content-Type headers, and error handling for invalid routes

### tests/lifecycle/

Server startup and shutdown behavior tests verify the application lifecycle.

- **server.test.js** - Tests server binding to host/port, startup logging, custom configuration handling, graceful shutdown support, and error handling (like EADDRINUSE)

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

## Coverage Requirements

The project enforces minimum coverage thresholds to maintain code quality. Tests must meet these requirements to pass:

| Metric     | Threshold |
|------------|-----------|
| Branches   | 75%       |
| Functions  | 90%       |
| Lines      | 80%       |
| Statements | 80%       |

These thresholds are configured in `jest.config.js` and enforced during CI runs. Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.
