# hao-backprop-test

An Express.js web application built on Express 5.1.0, demonstrating modern framework architecture patterns including the Factory Pattern, Router Pattern, and Barrel Pattern with multiple HTTP endpoints.

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
├── server.js                    # Entry point — Express app binding to host:port
├── package.json                 # npm manifest — express@^5.1.0, jest@^30.2.0, supertest@^7.1.4
├── package-lock.json            # Lockfile — deterministic dependency resolution
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore — node_modules, coverage, .env, logs
├── jest.config.js               # Jest config — node environment, coverage thresholds
├── src/                         # Application source root
│   ├── app.js                   # Express application factory (Factory Pattern)
│   ├── config/                  # Configuration layer
│   │   └── index.js             # Twelve-Factor env config — exports {host, port, env}
│   └── routes/                  # Express routing surface
│       ├── index.js             # Route barrel — re-exports {mainRoutes} (Barrel Pattern)
│       └── main.routes.js       # Express Router — GET / and GET /evening (Router Pattern)
└── tests/                       # Jest test suite root
    ├── unit/                    # Module contract tests
    │   ├── config.test.js       # Config defaults, custom values, edge cases
    │   └── routes.test.js       # Router export shape, route verification
    ├── integration/             # HTTP endpoint tests
    │   └── endpoints.test.js    # Supertest-based API contract tests
    └── lifecycle/               # Server lifecycle tests
        └── server.test.js       # Binding, logging, shutdown, error handling
```

### File Descriptions

| File | Purpose | Design Pattern |
|------|---------|----------------|
| `server.js` | Entry point — imports the Express app and binds it to the configured host/port | Separation of Concerns |
| `src/app.js` | Creates and configures the Express app with route mounting via `app.use('/', mainRoutes)` | Factory Pattern |
| `src/config/index.js` | Synchronously exports `{ host, port, env }` from environment variables with safe defaults | Twelve-Factor Config |
| `src/routes/index.js` | Aggregates and re-exports route modules as `{ mainRoutes }` for clean imports | Barrel Pattern |
| `src/routes/main.routes.js` | Implements GET `/` and GET `/evening` endpoint handlers using `express.Router()` | Router Pattern |

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

This project follows a layered Express.js architecture with clear separation of concerns across four distinct layers:

```
Request Flow:
Client → server.js → Express App (src/app.js) → Router (src/routes/) → Response
              ↑              ↑
              |        Route Barrel
              |     (src/routes/index.js)
              |
        Configuration
      (src/config/index.js)
```

```
Layer Diagram:
┌─────────────────────────────────────────────────────┐
│  Entry Point Layer          server.js                │
│  app.listen(port, host, callback)                    │
├─────────────────────────────────────────────────────┤
│  Application Layer          src/app.js               │
│  express() + app.use('/', router)                    │
├─────────────────────────────────────────────────────┤
│  Routing Layer              src/routes/              │
│  express.Router() + barrel exports                   │
├─────────────────────────────────────────────────────┤
│  Configuration Layer        src/config/index.js      │
│  Twelve-Factor env config with defaults              │
└─────────────────────────────────────────────────────┘
```

### Design Patterns Used

| Pattern | Location | Description |
|---------|----------|-------------|
| **Factory Pattern** | `src/app.js` | Creates and exports a configured Express app without calling `listen()`, enabling Supertest-based testing |
| **Router Pattern** | `src/routes/main.routes.js` | Uses `express.Router()` to define route handlers separately from the app, enabling modular route composition |
| **Barrel Pattern** | `src/routes/index.js` | Aggregates route modules into a single import surface for clean `require()` calls |
| **Separation of Concerns** | `server.js` vs `src/app.js` | Server binding is isolated from app configuration, enabling independent testing and deployment |
| **Twelve-Factor Config** | `src/config/index.js` | Configuration externalized to environment variables (`HOST`, `PORT`, `NODE_ENV`) with safe defaults |
| **CommonJS Modules** | All `*.js` files | Consistent `require()`/`module.exports` pattern across the entire codebase |

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

The test suite is organized into three categories based on test scope:

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

*This is a tutorial project demonstrating Express.js web application development with modern framework architecture patterns.*
