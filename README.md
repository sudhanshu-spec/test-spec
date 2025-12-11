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
├── server.js                    # Entry point - HTTP/HTTPS server binding
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
└── src/                         # Application source root
    ├── app.js                   # Express application factory with security middleware
    ├── config/                  # Configuration module
    │   └── index.js             # Environment variable management (server + security config)
    ├── middleware/              # Middleware modules
    │   └── security.js          # Security middleware configuration (helmet, cors, rate-limit)
    └── routes/                  # Routing surface
        ├── index.js             # Route aggregator (barrel pattern)
        └── main.routes.js       # Route handlers implementation
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that creates HTTP/HTTPS server and binds it to the configured host/port |
| `src/app.js` | Express application factory - creates configured Express app with security middleware and routes |
| `src/config/index.js` | Configuration module - exports server, security, and HTTPS settings from environment variables |
| `src/middleware/security.js` | Security middleware - exports configured helmet, cors, and rate-limit middleware |
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
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window duration in milliseconds (default: 15 minutes). |
| `RATE_LIMIT_MAX` | `100` | Maximum number of requests per window per IP address. |
| `CORS_ORIGINS` | `'*'` | Allowed CORS origins. Use comma-separated list for multiple origins. |

### HTTPS Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HTTPS_ENABLED` | `'false'` | Set to `'true'` to enable HTTPS mode with TLS encryption. |
| `SSL_KEY_PATH` | `undefined` | Path to the SSL private key file (PEM format). Required when HTTPS is enabled. |
| `SSL_CERT_PATH` | `undefined` | Path to the SSL certificate file (PEM format). Required when HTTPS is enabled. |

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

**Enable HTTPS (with self-signed certificates):**
```bash
# Generate self-signed certificates for development
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"

# Start server with HTTPS
HTTPS_ENABLED=true SSL_KEY_PATH=./certs/key.pem SSL_CERT_PATH=./certs/cert.pem npm start
# Binds to https://127.0.0.1:3000/
```

**Production HTTPS:**
```bash
HTTPS_ENABLED=true SSL_KEY_PATH=/etc/ssl/private/key.pem SSL_CERT_PATH=/etc/ssl/certs/cert.pem PORT=443 NODE_ENV=production npm start
```

**Custom rate limiting:**
```bash
RATE_LIMIT_WINDOW_MS=60000 RATE_LIMIT_MAX=50 npm start
# Limits to 50 requests per minute per IP
```

**Restrict CORS origins:**
```bash
CORS_ORIGINS="https://example.com,https://app.example.com" npm start
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

## Security

This application includes comprehensive security middleware for production-ready deployments.

### Security Headers (Helmet)

Helmet.js sets the following security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Configurable | Prevents XSS and data injection attacks |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents cross-origin reads |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information |
| `Strict-Transport-Security` | Production only | Enforces HTTPS (in production) |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-DNS-Prefetch-Control` | `off` | Controls DNS prefetching |
| `X-Download-Options` | `noopen` | Prevents IE from executing downloads |
| `X-Permitted-Cross-Domain-Policies` | `none` | Controls Adobe Flash/PDF policies |

Additionally, the `X-Powered-By` header is removed to prevent framework fingerprinting.

### Rate Limiting

Rate limiting prevents DDoS and brute-force attacks:

- **Default:** 100 requests per 15 minutes per IP address
- **Response:** HTTP 429 Too Many Requests when exceeded
- **Headers:** Draft-8 compliant RateLimit headers

### CORS

Cross-Origin Resource Sharing is configurable:

- **Development:** Allows all origins (`*`) by default
- **Production:** Configure `CORS_ORIGINS` for specific origins

### Verifying Security Headers

```bash
curl -I http://127.0.0.1:3000/
# Check for security headers in response
```

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `helmet` | ^8.1.0 | Security headers middleware (11+ headers) |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| `express-rate-limit` | ^8.2.1 | Rate limiting middleware for DDoS protection |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify installation
npm ls express helmet cors express-rate-limit
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
