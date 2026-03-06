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
Application module loaded successfully
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

### Error Responses

Unrecognized routes and server errors return structured JSON responses instead of default Express text.

**404 Not Found** — returned for any path that does not match a defined route:

```json
{
  "error": {
    "status": 404,
    "message": "Not Found",
    "path": "/unknown-path"
  }
}
```

**Example:**
```bash
curl -s http://127.0.0.1:3000/nonexistent
# {"error":{"status":404,"message":"Not Found","path":"/nonexistent"}}
```

**500 Internal Server Error** — returned for unhandled runtime errors:

```json
{
  "error": {
    "status": 500,
    "message": "Internal Server Error"
  }
}
```

In development mode (`NODE_ENV=development`), the response includes a `stack` property with the error stack trace for debugging:

```json
{
  "error": {
    "status": 500,
    "message": "Something went wrong",
    "stack": "Error: Something went wrong\n    at ..."
  }
}
```

> **Production Safety:** When `NODE_ENV=production`, stack traces and internal error details are never exposed to clients. Only the HTTP status code and a safe error message are returned.

## Project Structure

```
hao-backprop-test/
├── server.js                    # Entry point - HTTP server binding and lifecycle
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── src/                         # Application source root
│   ├── app.js                   # Express application factory
│   ├── config/                  # Configuration module
│   │   └── index.js             # Environment variable management
│   ├── middleware/               # Error handling middleware
│   │   ├── index.js             # Middleware barrel export
│   │   ├── errorHandler.js      # Centralized error handler
│   │   └── notFoundHandler.js   # 404 catch-all handler
│   └── routes/                  # Routing surface
│       ├── index.js             # Route aggregator (barrel pattern)
│       └── main.routes.js       # Route handlers implementation
└── tests/                       # Test suite
    ├── server.test.js           # Server lifecycle and shutdown tests
    └── middleware/              # Middleware tests
        ├── errorHandler.test.js # Error handler tests
        └── notFoundHandler.test.js # 404 handler tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app, binds it to the configured host/port, and manages graceful shutdown |
| `src/app.js` | Express application factory - creates and exports configured Express app with mounted routes and middleware |
| `src/config/index.js` | Configuration module - exports `{ host, port, env, shutdownTimeout, requestTimeout }` from environment variables |
| `src/middleware/index.js` | Middleware barrel export - centralizes middleware exports |
| `src/middleware/errorHandler.js` | Centralized error handler - returns structured JSON error responses, suppresses stack traces in production |
| `src/middleware/notFoundHandler.js` | 404 catch-all handler - intercepts unmatched routes with structured JSON responses |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports |
| `src/routes/main.routes.js` | Route handlers - implements GET `/` and GET `/evening` endpoints |
| `tests/server.test.js` | Server lifecycle tests - covers graceful shutdown, process error handlers, and startup errors |
| `tests/middleware/errorHandler.test.js` | Error handler tests - validates structured responses, status codes, and production mode behavior |
| `tests/middleware/notFoundHandler.test.js` | 404 handler tests - validates unknown path handling and response structure |

## Environment Variables

The application supports the following environment variables for configuration:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `SHUTDOWN_TIMEOUT` | `5000` (ms) | Maximum wait time for graceful shutdown before force-killing the process. |
| `REQUEST_TIMEOUT` | `30000` (ms) | HTTP request timeout to prevent hung connections. |

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
                           ↑                          ↓ (no match)
                     Configuration              404 Handler
                   (src/config/index.js)             ↓ (error)
                                              Error Handler → Error Response
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` and `src/middleware/index.js` aggregate module exports for clean imports
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables
- **Centralized Error Handling**: Error middleware catches all unhandled errors and produces structured JSON responses
- **Graceful Shutdown**: Server responds to OS signals with controlled shutdown and connection draining

### Graceful Shutdown

The server implements graceful shutdown to ensure reliability during deployments, container orchestration, and process management.

**Signal Handling:**

When the server receives a `SIGTERM` or `SIGINT` signal, it performs a controlled shutdown sequence:

1. Logs the received signal
2. Stops accepting new connections
3. Waits for in-flight requests to complete
4. Exits the process with code `0`

If in-flight requests do not complete within the configured timeout, the process is force-killed with exit code `1`.

**Configuration:**

The shutdown timeout is controlled by the `SHUTDOWN_TIMEOUT` environment variable (default: `5000` ms):

```bash
# Set a 10-second shutdown timeout
SHUTDOWN_TIMEOUT=10000 npm start
```

**Idempotent Shutdown:**

The shutdown handler is guarded against duplicate invocations. Sending multiple `SIGTERM` signals in rapid succession will not trigger multiple shutdown sequences.

### Process Error Handling

The server registers process-level error handlers as safety nets for unrecoverable errors:

- **`uncaughtException`**: Catches synchronous errors that escape all `try/catch` blocks. Logs the error and initiates a graceful shutdown.
- **`unhandledRejection`**: Catches Promise rejections that are not handled by a `.catch()` handler. Logs the error and initiates a graceful shutdown.

These handlers are registered before the server starts listening, ensuring coverage of errors during initialization.

> **Exit Codes:** The process exits with code `0` on successful shutdown and code `1` on error-induced shutdown, following standard POSIX conventions.

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^29.7.0 | JavaScript testing framework |

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
| `test` | `jest --watchAll=false` | Runs the test suite |

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
