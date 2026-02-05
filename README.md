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
├── server.js                    # Entry point - HTTP server binding (with HTTPS support)
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── jest.config.js               # Jest test framework configuration
├── src/                         # Application source root
│   ├── app.js                   # Express application factory
│   ├── config/                  # Configuration module
│   │   └── index.js             # Environment variable management
│   ├── middleware/              # Security and utility middleware
│   │   ├── index.js             # Middleware exports aggregator
│   │   ├── security.js          # Security middleware (helmet, cors, rate-limit)
│   │   └── validation.js        # Input validation middleware (express-validator)
│   └── routes/                  # Routing surface
│       ├── index.js             # Route aggregator (barrel pattern)
│       └── main.routes.js       # Route handlers implementation
└── tests/                       # Test suite root
    ├── unit/                    # Isolated module tests
    │   ├── config.test.js       # Configuration module tests
    │   ├── middleware.test.js   # Security middleware tests
    │   └── routes.test.js       # Route handler tests
    ├── integration/             # HTTP endpoint tests
    │   ├── endpoints.test.js    # API endpoint contract tests
    │   └── security.test.js     # Security header and rate limiting tests
    └── lifecycle/               # Server lifecycle tests
        └── server.test.js       # Startup/shutdown tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app and binds it to the configured host/port with optional HTTPS support |
| `src/app.js` | Express application factory - creates and exports configured Express app with security middleware and routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env }` and security settings from environment variables |
| `src/middleware/index.js` | Middleware exports aggregator - centralizes middleware imports using barrel pattern |
| `src/middleware/security.js` | Security middleware configuration - helmet, CORS, and rate limiting setup |
| `src/middleware/validation.js` | Input validation middleware using express-validator for request sanitization |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports |
| `src/routes/main.routes.js` | Route handlers - implements GET `/` and GET `/evening` endpoints |

## Environment Variables

The application supports the following environment variables for configuration:

### Core Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |

### Security Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limiting window duration in milliseconds (default: 15 minutes). |
| `RATE_LIMIT_MAX` | `100` | Maximum number of requests allowed per IP within the rate limit window. |
| `CORS_ALLOWED_ORIGINS` | `'*'` | Comma-separated list of allowed CORS origins. Use `*` for development only. |
| `HTTPS_ENABLED` | `false` | Enable HTTPS server with TLS/SSL encryption. |
| `SSL_KEY_PATH` | `'./certs/server.key'` | Path to SSL private key file (required when HTTPS is enabled). |
| `SSL_CERT_PATH` | `'./certs/server.cert'` | Path to SSL certificate file (required when HTTPS is enabled). |

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

## Security Configuration

This application implements a comprehensive security middleware stack following OWASP Express.js security best practices.

### Security Middleware Overview

The security middleware pipeline processes requests in the following order:

```
Request → Rate Limiter → CORS → Helmet → Body Parser → Routes → Response
```

| Middleware | Package | Purpose |
|------------|---------|---------|
| Rate Limiter | `express-rate-limit` | Prevents DoS attacks by limiting request frequency per IP |
| CORS | `cors` | Controls cross-origin resource sharing with configurable policies |
| Helmet | `helmet` | Sets 12+ HTTP security headers for protection against common attacks |
| Body Parser | `express.json/urlencoded` | Parses request bodies for validation |
| Validation | `express-validator` | Sanitizes and validates incoming request data |

### Security Headers

The application uses **helmet.js** to automatically set the following security headers on all responses:

| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | Prevents XSS attacks by controlling resource loading sources |
| `Cross-Origin-Opener-Policy` | Isolates browsing context for cross-origin documents |
| `Cross-Origin-Resource-Policy` | Controls cross-origin resource loading |
| `Origin-Agent-Cluster` | Improves isolation between origins |
| `Referrer-Policy` | Controls information sent in the Referer header |
| `Strict-Transport-Security` | Forces HTTPS connections (HSTS) |
| `X-Content-Type-Options` | Prevents MIME type sniffing (`nosniff`) |
| `X-DNS-Prefetch-Control` | Controls DNS prefetching behavior |
| `X-Download-Options` | Prevents IE from executing downloads in site context |
| `X-Frame-Options` | Prevents clickjacking attacks (`SAMEORIGIN`) |
| `X-Permitted-Cross-Domain-Policies` | Controls Adobe cross-domain policies |
| `X-Powered-By` | **Removed** - Hides Express.js fingerprint |

**Verify security headers:**
```bash
curl -I http://127.0.0.1:3000/
# Expected: Security headers present in response
```

### Rate Limiting

Rate limiting protects against denial-of-service (DoS) attacks by limiting the number of requests from a single IP address.

**Default Configuration:**
- **Window:** 15 minutes (`RATE_LIMIT_WINDOW_MS=900000`)
- **Max Requests:** 100 per window (`RATE_LIMIT_MAX=100`)
- **Response:** HTTP 429 (Too Many Requests) when limit exceeded

**Rate Limit Headers in Response:**
| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Maximum requests allowed in window |
| `RateLimit-Remaining` | Requests remaining in current window |
| `RateLimit-Reset` | Unix timestamp when window resets |

**Customize rate limits via environment variables:**
```bash
# Stricter limits for production
RATE_LIMIT_WINDOW_MS=300000 RATE_LIMIT_MAX=50 npm start
# 50 requests per 5 minutes

# Relaxed limits for development
RATE_LIMIT_WINDOW_MS=900000 RATE_LIMIT_MAX=500 npm start
# 500 requests per 15 minutes
```

**Test rate limiting:**
```bash
# Send 110 requests rapidly (exceeds default limit of 100)
for i in {1..110}; do 
  curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
done
# Expected: 429 responses after 100 requests
```

### CORS Policy

Cross-Origin Resource Sharing (CORS) controls which origins can access the API.

**Environment-Specific Behavior:**

| Environment | CORS Policy | Configuration |
|-------------|-------------|---------------|
| Development | Allow all origins (`*`) | Default permissive for local development |
| Production | Whitelist only | Set `CORS_ALLOWED_ORIGINS` to allowed domains |

**Configure allowed origins:**
```bash
# Development (default - all origins allowed)
npm start

# Production (restrict to specific origins)
CORS_ALLOWED_ORIGINS=https://example.com,https://app.example.com npm start

# Multiple origins (comma-separated)
NODE_ENV=production CORS_ALLOWED_ORIGINS=https://frontend.com,https://admin.com npm start
```

**CORS Response Headers:**
| Header | Value |
|--------|-------|
| `Access-Control-Allow-Origin` | Allowed origin or `*` |
| `Access-Control-Allow-Methods` | `GET, POST, PUT, DELETE, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, Authorization` |
| `Access-Control-Allow-Credentials` | `true` |
| `Access-Control-Max-Age` | `86400` (24 hours) |

### HTTPS Support

The application supports optional TLS/SSL encryption for secure communications.

**Enable HTTPS:**
```bash
# With self-signed certificates (development only)
HTTPS_ENABLED=true SSL_KEY_PATH=./certs/server.key SSL_CERT_PATH=./certs/server.cert npm start

# Server will start with HTTPS
# Output: Server running at https://127.0.0.1:3000/
```

**Generate self-signed certificates (development only):**
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/server.key -out certs/server.cert -days 365 -nodes -subj "/CN=localhost"
```

**HTTPS Configuration Notes:**
- HTTPS is **optional** - the server falls back to HTTP if certificates are unavailable
- For **production**, use a reverse proxy (nginx, Apache) for TLS termination
- Self-signed certificates are for **development only** - browsers will show security warnings
- Certificate files should **not** be committed to version control

**Verify HTTPS:**
```bash
# Test HTTPS connection (ignore self-signed cert warning)
curl -k https://127.0.0.1:3000/
# Output: Hello, World!
```

### Input Validation

The application includes input validation middleware using **express-validator** to sanitize and validate incoming request data.

**Validation Features:**
- Request body sanitization
- Parameter validation
- Query string validation
- Custom validation rules
- Automatic error response formatting

**Validation Error Response:**
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Invalid value",
      "path": "fieldName",
      "location": "body"
    }
  ]
}
```

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `helmet` | ^8.1.0 | Security middleware that sets 12+ HTTP security headers |
| `express-rate-limit` | ^8.2.1 | Rate limiting middleware for DoS protection |
| `cors` | ^2.8.5 | CORS middleware for cross-origin resource sharing control |
| `express-validator` | ^7.3.1 | Input validation and sanitization middleware |

### Security Package Details

| Package | Security Benefit | Configuration Location |
|---------|-----------------|----------------------|
| `helmet` | Prevents XSS, clickjacking, MIME sniffing attacks | `src/middleware/security.js` |
| `express-rate-limit` | Blocks DoS attacks by limiting request frequency | `src/middleware/security.js` |
| `cors` | Controls cross-origin access to API | `src/middleware/security.js` |
| `express-validator` | Prevents injection attacks via input sanitization | `src/middleware/validation.js` |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify express installation
npm ls express
# Expected: express@5.1.0

# Verify security packages
npm ls helmet express-rate-limit cors express-validator
# Expected: All security packages installed
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

*This is a tutorial project demonstrating Node.js server development with Express.js framework.*
