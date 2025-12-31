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
└── src/                         # Application source root
    ├── app.js                   # Express application factory
    ├── config/                  # Configuration module
    │   └── index.js             # Environment variable management
    └── routes/                  # Routing surface
        ├── index.js             # Route aggregator (barrel pattern)
        └── main.routes.js       # Route handlers implementation
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

### Server Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |

### Security Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `CORS_ORIGIN` | `''` (disabled) | Comma-separated list of allowed CORS origins. Leave empty to disable CORS. |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Rate limit window duration in milliseconds. |
| `RATE_LIMIT_MAX` | `100` | Maximum number of requests per IP within the rate limit window. |
| `HTTPS_ENABLED` | `'false'` | Enable HTTPS/TLS server. Set to `'true'` to enable. |
| `TLS_CERT_PATH` | `''` | Path to the TLS certificate file (required when HTTPS is enabled). |
| `TLS_KEY_PATH` | `''` | Path to the TLS private key file (required when HTTPS is enabled). |

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

This application implements comprehensive security hardening using industry-standard middleware and best practices.

### Security Middleware Stack

The following security middleware is applied in order:

```
Request → helmet → cors → express.json → rateLimit → routes → Response
```

1. **Helmet.js** - Security HTTP headers (applied first)
2. **CORS** - Cross-Origin Resource Sharing policy
3. **Body Parser** - Request body parsing with limits
4. **Rate Limiter** - Request rate limiting per IP
5. **Routes** - Application routes with input validation

### Security Best Practices Applied

- **OWASP Security Headers**: All recommended HTTP security headers are set via helmet
- **Defense in Depth**: Multiple layers of security (headers, rate limiting, validation)
- **Input Validation**: All user input is validated and sanitized
- **Transport Security**: HSTS headers enforce HTTPS connections
- **Rate Limiting**: Protects against brute-force and denial-of-service attacks

## Security Headers

The application automatically sets the following security HTTP headers via [Helmet.js](https://helmetjs.github.io/):

| Header | Purpose | Default Value |
|--------|---------|---------------|
| `Content-Security-Policy` | Prevents XSS attacks by controlling which resources can be loaded | `default-src 'self'` |
| `Strict-Transport-Security` | Forces HTTPS connections (HSTS) | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | Prevents MIME type sniffing | `nosniff` |
| `X-Frame-Options` | Prevents clickjacking by controlling iframe embedding | `SAMEORIGIN` |
| `X-DNS-Prefetch-Control` | Controls browser DNS prefetching | `off` |
| `X-Download-Options` | Prevents IE from executing downloads | `noopen` |
| `X-Permitted-Cross-Domain-Policies` | Controls Adobe Flash/PDF cross-domain access | `none` |
| `Referrer-Policy` | Controls Referer header information | `no-referrer` |

### Verify Security Headers

Check that security headers are present in HTTP responses:

```bash
curl -I http://127.0.0.1:3000/ 2>/dev/null | grep -E "^(Content-Security-Policy|X-Frame-Options|Strict-Transport-Security|X-Content-Type-Options)"
```

**Expected output:**
```
Content-Security-Policy: default-src 'self';...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

## Rate Limiting

The application implements rate limiting to protect against brute-force attacks and denial-of-service (DoS) attempts.

### Default Configuration

| Setting | Default Value | Description |
|---------|---------------|-------------|
| Window | 15 minutes (900000 ms) | Time window for request counting |
| Max Requests | 100 | Maximum requests per IP per window |
| Headers | draft-8 | Rate limit headers standard |

### Rate Limit Response

When the rate limit is exceeded, the server responds with:

- **Status Code:** `429 Too Many Requests`
- **Body:** `{ "error": "Too many requests" }`
- **Headers:**
  - `RateLimit-Limit`: Maximum requests allowed
  - `RateLimit-Remaining`: Remaining requests in current window
  - `RateLimit-Reset`: Time until window resets (seconds)

### Verify Rate Limiting

Test that rate limiting is working:

```bash
# Send 105 requests (exceeds default limit of 100)
for i in $(seq 1 105); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/)
  echo "Request $i: HTTP $STATUS"
done
```

**Expected:** Requests 1-100 return `200`, requests 101+ return `429`.

### Custom Rate Limits

Override default rate limits using environment variables:

```bash
# Allow 200 requests per 30 minutes
RATE_LIMIT_MAX=200 RATE_LIMIT_WINDOW_MS=1800000 npm start

# Strict rate limiting: 50 requests per 5 minutes
RATE_LIMIT_MAX=50 RATE_LIMIT_WINDOW_MS=300000 npm start
```

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured to control which domains can access the API.

### Default Behavior

By default, CORS is **disabled** (no `CORS_ORIGIN` set). This means:
- Same-origin requests work normally
- Cross-origin requests from browsers will be blocked

### Enabling CORS

Enable CORS by setting the `CORS_ORIGIN` environment variable:

```bash
# Allow a single origin
CORS_ORIGIN=https://example.com npm start

# Allow multiple origins (comma-separated)
CORS_ORIGIN=https://app.example.com,https://admin.example.com npm start

# Allow all origins (NOT recommended for production)
CORS_ORIGIN=* npm start
```

### CORS Response Headers

When CORS is enabled, the following headers are set for allowed origins:

| Header | Value | Description |
|--------|-------|-------------|
| `Access-Control-Allow-Origin` | Configured origin | Specifies which origin can access resources |
| `Access-Control-Allow-Methods` | `GET,POST,PUT,DELETE,OPTIONS` | Allowed HTTP methods |
| `Access-Control-Allow-Headers` | `Content-Type,Authorization` | Allowed request headers |
| `Access-Control-Allow-Credentials` | `true` | Allows cookies/credentials |

### Verify CORS Configuration

Test CORS policy enforcement:

```bash
# Test with allowed origin (should include Access-Control-Allow-Origin)
curl -H "Origin: https://example.com" -I http://127.0.0.1:3000/

# Test with unauthorized origin (should NOT include Access-Control-Allow-Origin)
curl -H "Origin: https://malicious-site.com" -I http://127.0.0.1:3000/
```

## Input Validation

The application uses [express-validator](https://express-validator.github.io/) for input validation and sanitization.

### Validation Features

- **Query Parameter Sanitization**: All query parameters are sanitized to prevent injection attacks
- **Type Validation**: Input types (string, number, boolean) are validated
- **Error Responses**: Invalid inputs return `400 Bad Request` with descriptive error messages

### Error Response Format

When validation fails, the server responds with:

```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Invalid value",
      "path": "paramName",
      "location": "query"
    }
  ]
}
```

## HTTPS/TLS Configuration

The application supports HTTPS for secure transport layer encryption.

### Enabling HTTPS

1. Obtain TLS certificate and private key files
2. Set environment variables:

```bash
HTTPS_ENABLED=true \
TLS_CERT_PATH=/path/to/certificate.crt \
TLS_KEY_PATH=/path/to/private.key \
npm start
```

**Expected output:**
```
Server running at https://127.0.0.1:3000/
```

### Development with Self-Signed Certificate

For local development, generate a self-signed certificate:

```bash
# Generate self-signed certificate (development only)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

# Start server with self-signed cert
HTTPS_ENABLED=true TLS_CERT_PATH=./cert.pem TLS_KEY_PATH=./key.pem npm start
```

> **Warning:** Self-signed certificates should only be used for development. Use certificates from a trusted Certificate Authority (CA) for production deployments.

### HSTS (HTTP Strict Transport Security)

When HTTPS is enabled, the server automatically sets HSTS headers via helmet:

- **max-age**: 31536000 seconds (1 year)
- **includeSubDomains**: Applied to all subdomains
- **preload**: Eligible for browser preload lists

This instructs browsers to only communicate over HTTPS for the configured duration.

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `helmet` | ^8.1.0 | Security HTTP headers middleware - sets 13 security headers by default |
| `express-rate-limit` | ^8.2.1 | Rate limiting middleware to protect against brute-force and DoS attacks |
| `cors` | ^2.8.5 | CORS (Cross-Origin Resource Sharing) middleware for controlled cross-origin access |
| `express-validator` | ^7.3.1 | Input validation and sanitization middleware using validator.js |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify express installation
npm ls express
# Expected: express@5.1.0

# Verify security packages
npm ls helmet express-rate-limit cors express-validator
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server |

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
