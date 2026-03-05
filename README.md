# hao-backprop-test

A Node.js tutorial server demonstrating how to integrate Express.js as the formal HTTP framework — replacing the raw Node.js `http` module — to serve multiple HTTP endpoints.

> **Note**: This is a test project for backprop integration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Code Walkthrough](#code-walkthrough)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)
- [License](#license)

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

## Setup Instructions

Follow these steps to get the project running from scratch on a new machine.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd hao-backprop-test
```

### Step 2: Install Dependencies

Install all production and development dependencies declared in `package.json`:

```bash
npm install
```

This command reads `package.json`, resolves the dependency tree, downloads all packages to `node_modules/`, and generates or updates `package-lock.json`. The key packages installed are:

| Package | Type | Purpose |
|---------|------|---------|
| `express` (^5.1.0) | Production | HTTP framework for routing and request handling |
| `jest` (^30.2.0) | Development | Testing framework and test runner |
| `supertest` (^7.1.4) | Development | HTTP assertion library for endpoint testing |

For reproducible installs in CI or shared environments, use `npm ci` instead — it installs the exact versions locked in `package-lock.json`:

```bash
npm ci
```

### Step 3: Verify the Installation

Confirm that all key packages are correctly installed:

```bash
npm ls express jest supertest
```

Expected output shows the three packages and their resolved versions.

### Step 4: Run the Test Suite

Verify that everything is working correctly by running the full test suite:

```bash
npm test
```

You should see all 41 tests pass across 4 test suites with 100% code coverage.

### Step 5: Start the Server

```bash
npm start
```

Expected output:

```
Server running at http://127.0.0.1:3000/
```

### Step 6: Verify the Endpoints

Open a new terminal and test both endpoints:

```bash
# Test the root endpoint
curl http://127.0.0.1:3000/
# Expected: Hello, World!

# Test the evening endpoint
curl http://127.0.0.1:3000/evening
# Expected: Good evening
```

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

## API Documentation

This server exposes two HTTP GET endpoints. Both return plain text responses with `text/html; charset=utf-8` content type (the Express default when `res.send()` receives a string argument).

### Endpoints Summary

| Method | Path | Status | Response Body | Content-Type |
|--------|------|--------|---------------|--------------|
| GET | `/` | 200 | `Hello, World!\n` (14 chars, trailing newline) | `text/html; charset=utf-8` |
| GET | `/evening` | 200 | `Good evening` (12 chars, no trailing newline) | `text/html; charset=utf-8` |
| Any | Any unmatched | 404 | Express default 404 page | `text/html; charset=utf-8` |

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

**Example with headers:**
```bash
curl -v http://127.0.0.1:3000/
# < HTTP/1.1 200 OK
# < Content-Type: text/html; charset=utf-8
# < Content-Length: 14
# <
# Hello, World!
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

**Example with headers:**
```bash
curl -v http://127.0.0.1:3000/evening
# < HTTP/1.1 200 OK
# < Content-Type: text/html; charset=utf-8
# < Content-Length: 12
# <
# Good evening
```

### Health Check

Verify both endpoints are operational:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
```

### Unmatched Routes (404)

Requests to undefined routes or unsupported HTTP methods return a `404` status via Express default handling. No custom error middleware is used.

**Undefined route:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/unknown
# Output: 404
```

**Unsupported HTTP method on a defined route:**
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3000/
# Output: 404
```

### Query Parameter Handling

Both endpoints accept and ignore query parameters — the response body is unaffected:

```bash
curl -s "http://127.0.0.1:3000/?foo=bar"
# Output: Hello, World!

curl -s "http://127.0.0.1:3000/evening?time=late"
# Output: Good evening
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
| `src/app.js` | Express application factory — creates and exports configured Express app with mounted routes |
| `src/config/index.js` | Configuration module — exports `{ host, port, env }` from environment variables |
| `src/routes/index.js` | Route aggregator using barrel pattern — centralizes route exports |
| `src/routes/main.routes.js` | Route handlers — implements GET `/` and GET `/evening` endpoints |

## Code Walkthrough

This section provides an inline explanation of how the application code works, walking through each file in the order they are loaded at runtime.

### server.js — Entry Point

`server.js` is the file that Node.js executes when you run `npm start` (or `node server.js`). Its job is simple: import the configured Express app and bind it to a network interface so it can receive HTTP requests.

```javascript
'use strict';
```
The `'use strict'` directive enables JavaScript strict mode, which catches common coding mistakes (like using undeclared variables) and prevents certain unsafe actions. Every source file in this project begins with this directive.

```javascript
const app = require('./src/app');
```
This line imports the Express application instance from the app factory. When Node.js executes `require('./src/app')`, it runs `src/app.js`, which creates an Express app, mounts all route handlers onto it, and returns the fully configured app object. Crucially, the factory does **not** call `app.listen()` — that responsibility belongs here in `server.js`. This separation is what allows test suites to import the app without starting a live server.

```javascript
const config = require('./src/config');
```
This imports the configuration module, which reads environment variables (`HOST`, `PORT`, `NODE_ENV`) and provides fallback defaults. The returned object has the shape `{ host: string, port: number, env: string }`.

```javascript
app.listen(config.port, config.host, () => {
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
```
This is where the server actually starts. `app.listen()` creates an underlying `http.Server`, binds it to the specified port and host, and begins accepting TCP connections. The callback function fires once the server is ready, logging a confirmation message with the full URL.

### src/app.js — Express Application Factory

This module creates and configures the Express application. It follows the **Factory pattern**: it builds the app and returns it, but never starts the server.

```javascript
const express = require('express');
```
Imports the Express framework from `node_modules`. The `express` function is a top-level factory that creates a new Express application instance when called.

```javascript
const { mainRoutes } = require('./routes');
```
Imports the route handlers through the barrel aggregator (`src/routes/index.js`). The destructuring syntax `{ mainRoutes }` extracts the `mainRoutes` property from the exported object. This barrel pattern means `app.js` only needs one import statement regardless of how many route files exist.

```javascript
const app = express();
```
Creates a new Express application instance. This object has methods for routing HTTP requests (`app.get()`, `app.post()`), mounting middleware (`app.use()`), and starting the server (`app.listen()`).

```javascript
app.use('/', mainRoutes);
```
Mounts the route handlers at the root path (`/`). Every request to the server will be checked against the routes defined in `mainRoutes`. Because the mount path is `/`, route paths in `mainRoutes` are used as-is (e.g., `router.get('/evening')` responds to `GET /evening`).

```javascript
module.exports = app;
```
Exports the configured app instance so that `server.js` can import it and call `app.listen()`, and test files can import it and pass it to Supertest.

### src/config/index.js — Configuration Module

This module centralizes all runtime configuration, following the Twelve-Factor App methodology of externalizing config to environment variables.

```javascript
host: process.env.HOST || '127.0.0.1',
```
Reads the `HOST` environment variable. If it is set (e.g., `HOST=0.0.0.0`), that value is used. If it is not set (or is an empty string), the `||` operator selects the default `'127.0.0.1'` (loopback address, accessible only from the local machine).

```javascript
port: parseInt(process.env.PORT, 10) || 3000,
```
Reads the `PORT` environment variable and parses it as a base-10 integer. The explicit radix `10` in `parseInt(value, 10)` prevents accidental octal or hexadecimal interpretation. If `PORT` is not set, empty, or non-numeric (like `'abc'`), `parseInt` returns `NaN`, and the `||` operator falls back to `3000`.

```javascript
env: process.env.NODE_ENV || 'development'
```
Reads the `NODE_ENV` environment variable. If not set, defaults to `'development'`. This value is commonly used by frameworks like Express to adjust behavior (e.g., error detail in responses).

### src/routes/main.routes.js — Route Handlers

This is where the HTTP endpoint handlers are defined using the Express Router.

```javascript
const router = express.Router();
```
Creates an Express Router instance — a mini-application that can register route handlers independently. The router is later mounted onto the main app via `app.use('/', router)` in `src/app.js`.

```javascript
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});
```
Registers a handler for `GET /` requests. When a GET request arrives at the root path, Express calls this callback with the request (`req`) and response (`res`) objects. `res.send('Hello, World!\n')` sends the string as the response body with a 200 status code and `text/html; charset=utf-8` content type (Express defaults for string arguments).

```javascript
router.get('/evening', (req, res) => {
  res.send('Good evening');
});
```
Registers a handler for `GET /evening` requests. Same pattern as above — responds with the string `'Good evening'` (no trailing newline).

### src/routes/index.js — Barrel Aggregator

```javascript
const mainRoutes = require('./main.routes');
module.exports = { mainRoutes };
```
This file imports the router from `main.routes.js` and re-exports it as a named property in an object. This **barrel pattern** provides a single entry point for all route modules. If you add more route files later, you import them here and add them to the exported object — consumers like `src/app.js` never need to know about individual route files.

## Environment Variables

The application supports the following environment variables for configuration:

| Variable | Default Value | Type | Description |
|----------|---------------|------|-------------|
| `HOST` | `'127.0.0.1'` | `string` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | `number` | Server binding port number. Parsed as a base-10 integer. |
| `NODE_ENV` | `'development'` | `string` | Application environment mode (`development`, `production`, `test`). |

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
- **Separation of Concerns**: Each module has a single responsibility — routes, config, app assembly, and server binding are all isolated

### Module Loading Order

When you run `node server.js`, Node.js resolves the `require()` calls in this order:

1. `server.js` loads → requires `./src/app`
2. `src/app.js` loads → requires `express` and `./routes`
3. `src/routes/index.js` loads → requires `./main.routes`
4. `src/routes/main.routes.js` loads → requires `express`, creates Router, defines routes, exports
5. `src/routes/index.js` finishes → exports `{ mainRoutes }`
6. `src/app.js` finishes → creates Express app, mounts routes, exports `app`
7. `server.js` continues → requires `./src/config`
8. `src/config/index.js` loads → reads `process.env`, exports `{ host, port, env }`
9. `server.js` finishes → calls `app.listen()` with config values

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | JavaScript testing framework and test runner |
| `supertest` | ^7.1.4 | HTTP assertion library for Express endpoint testing |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Install exact versions from lockfile (CI-recommended)
npm ci

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

## Deployment Guide

This section covers how to deploy the application in different environments, from local development to production servers.

### Local Development

For day-to-day development, use the default configuration:

```bash
# Install dependencies
npm install

# Start the server
npm start
# Server running at http://127.0.0.1:3000/
```

The default binding to `127.0.0.1` ensures the server is only accessible from your local machine, which is the safest option during development.

### Production Deployment

For production environments, configure the server to accept external connections and use an appropriate port:

```bash
# Set environment variables for production
export HOST=0.0.0.0
export PORT=80
export NODE_ENV=production

# Install production dependencies only (skip devDependencies)
npm ci --omit=dev

# Start the server
node server.js
```

**Key production considerations:**

| Setting | Development | Production |
|---------|-------------|------------|
| `HOST` | `127.0.0.1` (loopback only) | `0.0.0.0` (all interfaces) |
| `PORT` | `3000` (unprivileged) | `80` or `443` (standard HTTP/HTTPS) |
| `NODE_ENV` | `development` | `production` |
| Dependencies | All (`npm install`) | Production only (`npm ci --omit=dev`) |

### Deploying with a Process Manager

For production reliability, use a process manager like PM2 to keep the server running, handle crashes, and manage logs:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
HOST=0.0.0.0 PORT=80 NODE_ENV=production pm2 start server.js --name hello-world

# View running processes
pm2 list

# View logs
pm2 logs hello-world

# Restart the application
pm2 restart hello-world

# Stop the application
pm2 stop hello-world
```

### Deploying Behind a Reverse Proxy

In production, it is common to place the Node.js server behind a reverse proxy like Nginx. The proxy handles TLS termination, static asset serving, and load balancing, while your Node.js app focuses on application logic.

**Example Nginx configuration:**

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

When deploying behind a reverse proxy, keep the Node.js server bound to `127.0.0.1` (the default) so it only accepts connections from the proxy, not directly from the internet.

### Deploying with Docker

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source
COPY server.js ./
COPY src/ ./src/

# Expose the application port
EXPOSE 3000

# Set production environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]
```

Build and run:

```bash
# Build the Docker image
docker build -t hello-world-server .

# Run the container
docker run -d -p 3000:3000 --name hello-world hello-world-server

# Verify the server is running
curl http://localhost:3000/
# Output: Hello, World!

# View logs
docker logs hello-world

# Stop and remove the container
docker stop hello-world && docker rm hello-world
```

### Deploying to Cloud Platforms

Most cloud platforms (Heroku, Railway, Render, DigitalOcean App Platform) automatically detect Node.js applications via `package.json` and run the `start` script. Ensure the following:

1. **`HOST` should be `0.0.0.0`** — Cloud platforms assign a dynamic port and expect the app to listen on all interfaces.
2. **`PORT` is provided by the platform** — Most platforms set the `PORT` environment variable automatically. The config module reads this value, so no code changes are needed.
3. **`npm start` must work** — The `start` script in `package.json` runs `node server.js`, which is what the platform will execute.

Example for a platform that sets `PORT` automatically:

```bash
# The platform sets PORT=8080 (or similar)
# Your app reads it via process.env.PORT and binds correctly
# No code changes needed — the config module handles this
```

### Pre-Deployment Checklist

Before deploying to any environment, verify:

- [ ] All tests pass: `npm test`
- [ ] Coverage meets thresholds: `npm run test:coverage`
- [ ] Dependencies are up to date: `npm audit`
- [ ] `package-lock.json` is committed (ensures reproducible installs)
- [ ] Environment variables are configured for the target environment
- [ ] The `start` script works: `npm start` (then Ctrl+C to stop)

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Error: listen EADDRINUSE: address already in use
# Solution: Use a different port
PORT=3001 npm start

# Or find and kill the process using the port
lsof -i :3000
kill -9 <PID>
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

**Tests failing after changes:**
```bash
# Run tests with verbose output to identify failures
npx jest --verbose

# Run a specific test file for focused debugging
npx jest tests/integration/endpoints.test.js --verbose
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating Node.js server development with Express.js framework.*
