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

## Deployment Guide

This section consolidates deployment information for running the Hello World Tutorial Server in various environments.

### Deployment Overview

The application supports multiple deployment configurations through environment variables. The server can be configured for local development, production deployment, or custom network binding scenarios.

| Deployment Mode | HOST | PORT | NODE_ENV | Use Case |
|-----------------|------|------|----------|----------|
| Development (default) | `127.0.0.1` | `3000` | `development` | Local development and testing |
| Production | `0.0.0.0` | `80` or `443` | `production` | Production server deployment |
| Custom | User-defined | User-defined | User-defined | Custom network configurations |

### Development Mode

For local development, the server runs with default settings:

```bash
# Start with default configuration
npm start
```

**Default Configuration:**
- **HOST:** `127.0.0.1` (localhost only, not accessible from other machines)
- **PORT:** `3000`
- **NODE_ENV:** `development`

**Expected Output:**
```
Server running at http://127.0.0.1:3000/
```

**Verify Endpoints:**
```bash
curl -s http://127.0.0.1:3000/
# Output: Hello, World!

curl -s http://127.0.0.1:3000/evening
# Output: Good evening
```

### Production Mode

For production deployment, configure the server to accept external connections:

```bash
# Production deployment with external access
HOST=0.0.0.0 PORT=80 NODE_ENV=production npm start
```

**Production Configuration:**
- **HOST:** `0.0.0.0` (accepts connections from any network interface)
- **PORT:** `80` (standard HTTP port) or `443` (with reverse proxy for HTTPS)
- **NODE_ENV:** `production`

**Expected Output:**
```
Server running at http://0.0.0.0:80/
```

> **Note:** Binding to port 80 or 443 typically requires elevated privileges (root/sudo) or using a reverse proxy like nginx.

**Alternative Production Configuration (non-privileged port):**
```bash
HOST=0.0.0.0 PORT=8080 NODE_ENV=production npm start
```

### Custom Network Binding

Configure custom host and port settings for specific deployment scenarios:

**Custom Port (localhost):**
```bash
PORT=8080 npm start
# Binds to http://127.0.0.1:8080/
```

**Custom Host (all interfaces):**
```bash
HOST=0.0.0.0 npm start
# Binds to http://0.0.0.0:3000/
```

**Combined Custom Configuration:**
```bash
HOST=0.0.0.0 PORT=8080 NODE_ENV=production npm start
# Binds to http://0.0.0.0:8080/
```

**Specific Interface Binding:**
```bash
HOST=192.168.1.100 PORT=3000 npm start
# Binds to http://192.168.1.100:3000/
```

### Process Management

For production deployments, use a process manager to ensure the application stays running and automatically restarts on failure.

**Using PM2 (recommended):**

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
HOST=0.0.0.0 PORT=80 NODE_ENV=production pm2 start server.js --name "hello-world-server"

# View running processes
pm2 list

# View logs
pm2 logs hello-world-server

# Restart the application
pm2 restart hello-world-server

# Stop the application
pm2 stop hello-world-server

# Enable startup on system boot
pm2 startup
pm2 save
```

**Using systemd (Linux):**

Create a systemd service file at `/etc/systemd/system/hello-world.service`:

```ini
[Unit]
Description=Hello World Tutorial Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/hao-backprop-test
Environment=HOST=0.0.0.0
Environment=PORT=8080
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Manage the service:**
```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Start the service
sudo systemctl start hello-world

# Enable auto-start on boot
sudo systemctl enable hello-world

# Check status
sudo systemctl status hello-world

# View logs
sudo journalctl -u hello-world -f
```

### Health Checks

Verify deployment success by testing the application endpoints:

**Basic Health Check:**
```bash
curl -s http://127.0.0.1:3000/
# Expected: Hello, World!
```

**Comprehensive Health Check Script:**
```bash
#!/bin/bash
# health-check.sh - Verify all endpoints are operational

HOST="${1:-127.0.0.1}"
PORT="${2:-3000}"
BASE_URL="http://${HOST}:${PORT}"

echo "Checking server at ${BASE_URL}..."

# Check root endpoint
ROOT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/")
if [ "$ROOT_RESPONSE" = "200" ]; then
    echo "✓ GET / - OK (HTTP 200)"
else
    echo "✗ GET / - FAILED (HTTP $ROOT_RESPONSE)"
    exit 1
fi

# Check evening endpoint
EVENING_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/evening")
if [ "$EVENING_RESPONSE" = "200" ]; then
    echo "✓ GET /evening - OK (HTTP 200)"
else
    echo "✗ GET /evening - FAILED (HTTP $EVENING_RESPONSE)"
    exit 1
fi

echo "All health checks passed!"
```

**Usage:**
```bash
chmod +x health-check.sh
./health-check.sh                    # Check localhost:3000
./health-check.sh 0.0.0.0 8080       # Check custom host:port
```

**Response Content Verification:**
```bash
# Verify exact response content
curl -s http://127.0.0.1:3000/ | grep -q "Hello, World!" && echo "Root endpoint OK"
curl -s http://127.0.0.1:3000/evening | grep -q "Good evening" && echo "Evening endpoint OK"
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating Node.js server development with Express.js framework.*
