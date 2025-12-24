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
├── jest.config.js               # Jest test runner configuration
├── .gitignore                   # Git ignore patterns
├── src/                         # Application source root
│   ├── app.js                   # Express application factory
│   ├── config/                  # Configuration module
│   │   └── index.js             # Environment variable management
│   └── routes/                  # Routing surface
│       ├── index.js             # Route aggregator (barrel pattern)
│       └── main.routes.js       # Route handlers implementation
└── tests/                       # Test suite root
    ├── setup.js                 # Global test setup configuration
    ├── unit/                    # Unit tests (isolated component testing)
    │   ├── config.test.js       # Configuration module tests
    │   ├── app.test.js          # Express app factory tests
    │   ├── routes.test.js       # Route handler unit tests
    │   └── routes-barrel.test.js # Routes barrel export tests
    ├── integration/             # Integration tests (HTTP endpoint testing)
    │   ├── server.test.js       # Server lifecycle tests
    │   ├── endpoints.test.js    # HTTP endpoint tests
    │   └── error-handling.test.js # Error handling tests
    └── fixtures/                # Test data fixtures
        ├── config.fixtures.js   # Configuration test data
        └── response.fixtures.js # Expected response fixtures
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app and binds it to the configured host/port |
| `jest.config.js` | Jest configuration file - test patterns, coverage settings, and module paths |
| `src/app.js` | Express application factory - creates and exports configured Express app with mounted routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env }` from environment variables |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports |
| `src/routes/main.routes.js` | Route handlers - implements GET `/` and GET `/evening` endpoints |
| `tests/setup.js` | Global test setup - environment utilities and common test helpers |
| `tests/unit/*.test.js` | Unit tests for isolated component testing |
| `tests/integration/*.test.js` | Integration tests for HTTP endpoint and lifecycle testing |
| `tests/fixtures/*.js` | Test fixture data for consistent test scenarios |

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

This project follows a modular Express.js architecture with separation of concerns:

```
Request Flow:
Client → server.js → Express App (src/app.js) → Router (src/routes/) → Response
                           ↑
                     Configuration
                   (src/config/index.js)
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` aggregates route exports for clean imports
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | 29.7.0 | JavaScript testing framework with built-in assertions, mocking, and coverage |
| `supertest` | 7.0.0 | HTTP assertions library for testing Express applications without starting server |

### Dependency Installation

```bash
# Install all dependencies (including devDependencies)
npm install

# Verify express installation
npm ls express
# Expected: express@5.1.0

# Verify test dependencies
npm ls jest supertest
# Expected: jest@29.7.0, supertest@7.0.0
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server |
| `test` | `jest` | Runs all tests using Jest test runner |
| `test:coverage` | `jest --coverage` | Runs tests with code coverage report generation |
| `test:watch` | `jest --watch` | Runs tests in watch mode for development |

## Testing

This project includes a comprehensive test suite using Jest and supertest for HTTP testing.

### Testing Framework

| Tool | Version | Purpose |
|------|---------|---------|
| Jest | 29.7.0 | JavaScript testing framework with built-in assertions, mocking, and coverage |
| supertest | 7.0.0 | HTTP assertions library for testing Express applications without starting server |

### Test Directory Structure

```
tests/
├── setup.js                     # Global Jest setup and test utilities
├── unit/                        # Unit tests (isolated component testing)
│   ├── config.test.js           # Configuration module tests
│   ├── app.test.js              # Express app factory tests
│   ├── routes.test.js           # Route handler unit tests
│   └── routes-barrel.test.js    # Routes barrel export tests
├── integration/                 # Integration tests (HTTP endpoint testing)
│   ├── server.test.js           # Server lifecycle tests
│   ├── endpoints.test.js        # HTTP endpoint tests
│   └── error-handling.test.js   # Error handling tests
└── fixtures/                    # Test data fixtures
    ├── config.fixtures.js       # Configuration test data
    └── response.fixtures.js     # Expected response fixtures
```

### Running Tests

**Run all tests:**
```bash
npm test
```

**Run tests with coverage report:**
```bash
npm run test:coverage
```

**Run tests in watch mode (development):**
```bash
npm run test:watch
```

**Run specific test file:**
```bash
npx jest tests/unit/config.test.js
```

**Run tests matching pattern:**
```bash
npx jest --testPathPattern="config"
```

### Coverage Targets

This project maintains the following minimum coverage thresholds:

| Metric | Target | Description |
|--------|--------|-------------|
| Line Coverage | ≥85% | Percentage of code lines executed by tests |
| Branch Coverage | ≥80% | Percentage of conditional branches tested |
| Function Coverage | ≥90% | Percentage of functions called by tests |
| Statement Coverage | ≥85% | Percentage of statements executed by tests |

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`:
- Console summary displayed after test run
- HTML report available at `coverage/lcov-report/index.html`
- LCOV report for CI/CD integration at `coverage/lcov.info`

### Test Categories

**Unit Tests** (`tests/unit/`):
- Test isolated components without external dependencies
- Mock dependencies to ensure pure unit testing
- Focus on function behavior and return values

**Integration Tests** (`tests/integration/`):
- Test HTTP endpoints using supertest
- Validate request/response cycles
- Test error handling and edge cases

**Test Fixtures** (`tests/fixtures/`):
- Reusable test data for consistent test scenarios
- Configuration variants for testing different environments
- Expected response data for validation

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
