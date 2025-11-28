# hao-backprop-test
test project for backprop integration. Do not touch!

---

## Security Configuration

This application implements comprehensive security controls to protect against common web application vulnerabilities. This section documents all security features, configuration options, and verification procedures.

### Security Features Overview

The application includes the following security controls:

| Security Feature | Package | Purpose |
|-----------------|---------|---------|
| **HTTP Security Headers** | `helmet@8.1.0` | Sets 15+ security headers including Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and removes X-Powered-By header |
| **CORS Protection** | `cors@2.8.5` | Implements Cross-Origin Resource Sharing policy with explicit origin whitelisting |
| **Rate Limiting** | `express-rate-limit@8.2.1` | Protects against DoS attacks, brute force attempts, and API abuse by limiting requests per IP |
| **Input Validation** | `express-validator@7.3.1` | Validates and sanitizes all user-supplied input to prevent injection attacks |
| **HTTPS Support** | Node.js `https` module | Enables encrypted communication using TLS/SSL certificates |
| **Error Handling** | Custom middleware | Production-safe error responses that prevent information disclosure |

#### Security Headers Provided by Helmet.js

- `Content-Security-Policy` - Prevents XSS attacks by controlling resource loading
- `Cross-Origin-Opener-Policy` - Isolates browsing context from cross-origin documents
- `Cross-Origin-Resource-Policy` - Controls cross-origin resource access
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: SAMEORIGIN` - Protects against clickjacking attacks
- `X-XSS-Protection` - Enables browser XSS filtering
- `Strict-Transport-Security` - Enforces HTTPS connections (when enabled)
- `X-Powered-By` header is **removed** to prevent server fingerprinting

---

### Environment Configuration

The application uses environment variables for security configuration. Create a `.env` file based on `.env.example` with the following variables:

#### Server Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` | Yes |
| `PORT` | HTTP server port | `3000` | Yes |
| `HTTPS_PORT` | HTTPS server port | `443` | No (required for HTTPS) |

#### SSL/TLS Configuration

| Variable | Description | Default | Required for HTTPS |
|----------|-------------|---------|-------------------|
| `SSL_KEY_PATH` | Path to SSL private key file | `./certs/server.key` | Yes |
| `SSL_CERT_PATH` | Path to SSL certificate file | `./certs/server.cert` | Yes |

#### CORS Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `false` (no cross-origin) | Yes (for CORS) |

**Example CORS configuration:**
```
ALLOWED_ORIGINS=https://example.com,https://app.example.com,http://localhost:3000
```

#### Rate Limiting Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RATE_LIMIT_WINDOW_MS` | Time window for rate limiting (milliseconds) | `900000` (15 minutes) | No |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum requests per IP per window | `100` | No |

#### Example .env File

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HTTPS_PORT=443

# SSL Configuration (for HTTPS)
SSL_KEY_PATH=./certs/server.key
SSL_CERT_PATH=./certs/server.cert

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

### SSL Certificate Setup

#### Development Environment (Self-Signed Certificate)

For local development, generate a self-signed certificate using OpenSSL:

```bash
# Create the certs directory if it doesn't exist
mkdir -p certs

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key \
  -out certs/server.cert \
  -subj "/CN=localhost"
```

**Note:** Self-signed certificates will trigger browser security warnings. This is expected for development environments.

#### Certificate File Permissions

Ensure proper file permissions for certificate files:

```bash
# Set restrictive permissions on private key
chmod 600 certs/server.key

# Certificate can be world-readable
chmod 644 certs/server.cert
```

---

### Security Verification

Use the following commands and procedures to verify that security controls are functioning correctly.

#### 1. Verify Security Headers

Check that Helmet.js security headers are present in responses:

```bash
# Get response headers
curl -I http://localhost:3000/

# Expected headers to verify:
# - Content-Security-Policy
# - Cross-Origin-Opener-Policy
# - Cross-Origin-Resource-Policy
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: SAMEORIGIN
```

#### 2. Verify X-Powered-By Removed

Confirm that server fingerprinting header is removed:

```bash
# Should return empty (no X-Powered-By header)
curl -I http://localhost:3000/ 2>/dev/null | grep -i "x-powered-by"

# If the above returns nothing, the header is properly removed
```

#### 3. Verify Rate Limiting

Test that rate limiting is active by exceeding the request threshold:

```bash
# Send requests exceeding the limit (default: 100 requests per 15 minutes)
for i in {1..101}; do 
  echo "Request $i: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)"
done

# Expected: Requests after threshold should return HTTP 429 (Too Many Requests)
```

Check rate limit headers in response:

```bash
# View rate limit headers
curl -I http://localhost:3000/ 2>/dev/null | grep -i "ratelimit"

# Expected headers:
# - RateLimit-Limit: 100
# - RateLimit-Remaining: <remaining requests>
# - RateLimit-Reset: <reset timestamp>
```

#### 4. Verify CORS Policy

Test cross-origin request handling:

```bash
# Test request from unauthorized origin (should be blocked)
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:3000/ -v

# Test request from allowed origin (should include CORS headers)
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:3000/ -v

# Look for Access-Control-Allow-Origin header in allowed origin response
```

#### 5. Verify Dependency Security

Run npm audit to check for vulnerabilities:

```bash
# Check for known vulnerabilities
npm audit

# Expected output: "found 0 vulnerabilities"
```

#### 6. Verify HTTPS (if configured)

Test HTTPS connection:

```bash
# Test HTTPS endpoint (use -k for self-signed certificates)
curl -k https://localhost:443/

# Verify certificate details
openssl s_client -connect localhost:443 -showcerts
```

---

### Production Deployment Notes

#### SSL Certificate Requirements

For production deployments, you **must** use a valid SSL certificate from a trusted Certificate Authority (CA):

1. **Obtain a Valid Certificate**
   - Use a trusted CA such as Let's Encrypt (free), DigiCert, or Comodo
   - Let's Encrypt is recommended for its automation capabilities via Certbot

2. **Let's Encrypt Setup Example**
   ```bash
   # Install Certbot
   sudo apt-get update
   sudo apt-get install certbot

   # Obtain certificate (standalone mode)
   sudo certbot certonly --standalone -d yourdomain.com

   # Certificates are stored in:
   # /etc/letsencrypt/live/yourdomain.com/privkey.pem
   # /etc/letsencrypt/live/yourdomain.com/fullchain.pem
   ```

3. **Update Environment Variables**
   ```env
   SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   ```

#### Production Security Checklist

Before deploying to production, verify the following:

- [ ] `NODE_ENV` is set to `production`
- [ ] Valid SSL certificate from trusted CA is installed
- [ ] `ALLOWED_ORIGINS` contains only trusted domains (no wildcards)
- [ ] Rate limiting thresholds are appropriate for expected traffic
- [ ] All security headers present (verify with `curl -I`)
- [ ] `X-Powered-By` header is removed
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] Error responses do not expose stack traces
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)

#### Recommended Rate Limit Tuning

Adjust rate limiting based on your traffic patterns:

| Traffic Type | Window (ms) | Max Requests | Rationale |
|-------------|-------------|--------------|-----------|
| API (low traffic) | 900000 (15 min) | 100 | Default conservative setting |
| API (moderate) | 900000 (15 min) | 500 | Standard API usage |
| API (high traffic) | 60000 (1 min) | 100 | Shorter window, same density |
| Web application | 900000 (15 min) | 1000 | Higher limit for web browsing |

#### Security Monitoring

In production, implement logging and monitoring for:

- Rate limit violations (429 responses)
- CORS policy violations
- Invalid input attempts (400 responses)
- SSL certificate expiration warnings

---

### Post-Implementation Verification Checklist

After implementing security controls, verify the following:

- [ ] All security headers present in responses (verify with `curl -I`)
- [ ] X-Powered-By header removed
- [ ] Rate limiting active (verify 429 response after threshold)
- [ ] CORS policy enforced (verify cross-origin blocking)
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] HTTPS server functional (if certificates configured)
- [ ] Error responses do not expose stack traces
- [ ] All existing endpoints functional (`/` and `/evening`)
- [ ] README updated with security documentation (this document)

---

## Additional Resources

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [express-rate-limit Documentation](https://www.npmjs.com/package/express-rate-limit)
- [cors Package Documentation](https://www.npmjs.com/package/cors)
- [express-validator Documentation](https://express-validator.github.io/)
