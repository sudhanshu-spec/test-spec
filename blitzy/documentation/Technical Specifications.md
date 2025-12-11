# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

Based on the user's requirements, the Blitzy platform understands that the security enhancements to implement are a multi-faceted security hardening initiative for an Express.js 5.x Node.js application.

### 0.1.1 Core Security Objective

**Security Vulnerability Category:** Configuration weakness combined with missing security controls

**Severity Level:** Medium to High - The application currently lacks essential security middleware and headers that are standard for production-ready Express.js applications.

**User Requirement (verbatim):**
> "Implement security headers, input validation, rate limiting, and HTTPS support. Update dependencies, add helmet.js for security middleware, and configure proper CORS policies."

**Technical Interpretation:**
The Blitzy platform understands that this security enhancement translates to the following technical fix strategy:

- To implement security headers, we will add helmet.js middleware that automatically sets 11+ security-related HTTP headers
- To implement input validation, we will add request body/query parameter validation middleware
- To implement rate limiting, we will add express-rate-limit middleware to prevent DDoS and brute-force attacks
- To enable HTTPS support, we will configure the server to support TLS/SSL with proper certificate handling
- To update dependencies, we will add helmet, express-rate-limit, and cors packages
- To configure CORS policies, we will add the cors middleware with appropriate origin restrictions

### 0.1.2 Implicit Security Requirements Identified

Based on the explicit requirements, the following implicit needs have been surfaced:

- **Backward Compatibility:** The existing `/` and `/evening` GET endpoints must continue functioning identically
- **Zero Downtime:** Changes should not require architectural restructuring
- **Environment Flexibility:** Security configurations should respect NODE_ENV for development vs production behavior
- **Localhost Development:** HTTPS and strict CSP should be configurable for local development scenarios
- **No Breaking Changes:** The current API contract must be preserved

### 0.1.3 Technical Interpretation

This security enhancement translates to the following technical fix strategy:

| Requirement | Technical Implementation |
|------------|-------------------------|
| Security headers | Add `helmet@8.1.0` middleware to `src/app.js` |
| Input validation | Add `express-validator` or custom validation middleware (minimal for current static endpoints) |
| Rate limiting | Add `express-rate-limit@8.2.1` middleware with configurable limits |
| HTTPS support | Modify `server.js` to conditionally create HTTPS server using Node.js `https` module |
| Dependency updates | Add `helmet`, `express-rate-limit`, `cors` to `package.json` |
| CORS policies | Add `cors@2.8.5` middleware with whitelist-based origin configuration |

**User Understanding Level:** Explicit specification - The user has specified exact packages (helmet.js) and security measures (rate limiting, HTTPS, CORS), indicating expert-level awareness of Express.js security requirements.

## 0.2 Vulnerability Research and Analysis

### 0.2.1 Initial Assessment

The security-related information extracted from the user's requirements:

- **CVE Numbers Mentioned:** None explicitly mentioned
- **Vulnerability Names:** None explicitly mentioned
- **Affected Packages:** Express.js 5.1.0 (current dependency)
- **Symptoms Described:** Missing security headers, no rate limiting, no CORS configuration, no HTTPS
- **Security Advisories Referenced:** None explicitly referenced

### 0.2.2 Research Findings

**Web Research Conducted:**

| Topic | Source | Key Finding |
|-------|--------|-------------|
| helmet.js | npm registry | Latest stable version 8.1.0, provides 11+ security headers |
| express-rate-limit | npm registry | Latest stable version 8.2.1, supports draft-8 rate limit headers |
| cors | npm registry, expressjs.com | Latest stable version 2.8.5, official Express.js middleware |
| HTTPS in Express | Node.js TLS documentation | Uses native `https.createServer()` with certificate options |
| Express security best practices | expressjs.com | Recommends helmet, rate limiting, and secure cookies |

**Research reveals that:**

- Helmet.js v8.1.0 sets the following headers by default: Content-Security-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, Origin-Agent-Cluster, Referrer-Policy, Strict-Transport-Security, X-Content-Type-Options, X-DNS-Prefetch-Control, X-Download-Options, X-Frame-Options, X-Permitted-Cross-Domain-Policies
- Helmet removes X-Powered-By header (which leaks Express framework info)
- Express-rate-limit v8.2.1 supports modern standardHeaders (draft-8) for RateLimit header compliance
- The cors package v2.8.5 is the official Express.js CORS middleware with 21,000+ dependents

### 0.2.3 Vulnerability Classification

| Aspect | Classification |
|--------|---------------|
| Vulnerability Type | Missing Security Controls (Configuration Weakness) |
| Attack Vector | Network |
| Exploitability | High - Endpoints are publicly accessible |
| Impact | Confidentiality (information leakage via headers), Availability (no rate limiting allows DDoS) |
| Root Cause | Default Express.js configuration lacks security middleware; application was built as tutorial without production hardening |

### 0.2.4 Current Security Gaps

Based on repository analysis, the following security gaps exist:

| Gap | Current State | Risk |
|-----|--------------|------|
| Security Headers | None configured | Information disclosure, XSS vectors |
| Rate Limiting | None configured | DDoS susceptibility, brute-force attacks |
| CORS | Not configured | Cross-origin access unrestricted |
| HTTPS | HTTP only | Data transmission not encrypted |
| X-Powered-By | Express default (exposed) | Framework fingerprinting |
| Input Validation | Not applicable | Static responses only - minimal risk |

### 0.2.5 Official Security Advisories Reviewed

- **Express.js Security Best Practices:** expressjs.com/en/advanced/best-practice-security.html - Recommends helmet, TLS, rate limiting
- **Helmet.js Documentation:** helmetjs.github.io - Default configuration guidance
- **OWASP Secure Headers Project:** OWASP guidelines for HTTP security headers
- **MDN Web Security Guidelines:** Developer guidance on Content-Security-Policy and CORS

## 0.3 Security Scope Analysis

### 0.3.1 Affected Component Discovery

An exhaustive repository search identified all files affected by the security enhancements:

**Dependency Manifests:**
- `package.json` - Requires new security dependencies
- `package-lock.json` - Will be regenerated with new dependencies

**Source Files Requiring Security Integration:**
- `src/app.js` - Express app factory, requires middleware integration
- `server.js` - Entry point, requires HTTPS server configuration

**Configuration Files:**
- `src/config/index.js` - Requires new security-related environment variables

**Files NOT Affected (Static, No Changes Required):**
- `src/routes/main.routes.js` - Static GET handlers, no input to validate
- `src/routes/index.js` - Barrel export, no changes needed
- `README.md` - Documentation updates optional but recommended
- `.gitignore` - Already excludes sensitive files

**Discovery Summary:** Security enhancements affect 4 primary files across 2 directories.

### 0.3.2 Root Cause Identification

The identified security gaps exist due to:

- **Component:** `src/app.js` - Express application factory
- **Root Cause:** Application was created as a tutorial/demonstration without production security middleware
- **Evidence:** File contains only route mounting with no middleware configuration:

```javascript
// Current state - no security middleware
app.use('/', routes);
```

### 0.3.3 Vulnerability Propagation Trace

| Level | Component | Impact |
|-------|-----------|--------|
| Direct | `src/app.js` | Missing security middleware registration |
| Direct | `server.js` | HTTP-only server, no TLS support |
| Indirect | All HTTP responses | Missing security headers |
| Configuration | `src/config/index.js` | No security-related settings |

### 0.3.4 Current State Assessment

**Current Dependency Versions:**
- express@5.1.0 (locked in package-lock.json)

**Missing Security Dependencies:**
- helmet (not installed)
- express-rate-limit (not installed)
- cors (not installed)

**Current Configuration:**
- `HOST`: 127.0.0.1 (localhost binding - secure default)
- `PORT`: 3000 (standard development port)
- `NODE_ENV`: development (no production hardening)

**Scope of Exposure:**
- Currently: Internal only (localhost binding by default)
- Potential: Public-facing if HOST is overridden to 0.0.0.0

### 0.3.5 Search Patterns Employed

| Pattern | Files Found | Purpose |
|---------|------------|---------|
| `express()` usage | `src/app.js` | Identify app initialization points |
| `app.use` calls | `src/app.js` | Identify middleware registration points |
| `.listen()` calls | `server.js` | Identify server binding configuration |
| `process.env` | `src/config/index.js` | Identify configuration injection points |
| HTTP/HTTPS modules | `server.js` | Identify protocol handling |

## 0.4 Version Compatibility Research

### 0.4.1 Secure Version Identification

Based on web research, the following secure package versions are recommended:

| Package | Current | Recommended | Rationale |
|---------|---------|-------------|-----------|
| helmet | Not installed | ^8.1.0 | Latest stable, full Express 5.x compatibility |
| express-rate-limit | Not installed | ^8.2.1 | Latest stable, supports draft-8 headers |
| cors | Not installed | ^2.8.5 | Stable release, official Express middleware |
| express | ^5.1.0 | ^5.1.0 | Already on latest, no update needed |

### 0.4.2 Compatibility Verification

**Node.js Compatibility:**

| Package | Min Node.js | Project Node.js | Compatible |
|---------|-------------|-----------------|------------|
| helmet@8.1.0 | 18.0.0 | 20.19.x | ✓ Yes |
| express-rate-limit@8.2.1 | 18.0.0 | 20.19.x | ✓ Yes |
| cors@2.8.5 | 0.10.0 | 20.19.x | ✓ Yes |
| express@5.1.0 | 18.0.0 | 20.19.x | ✓ Yes |

**Express Version Compatibility:**

| Package | Express 5.x Support | Notes |
|---------|---------------------|-------|
| helmet@8.1.0 | ✓ Full support | Standard middleware pattern |
| express-rate-limit@8.2.1 | ✓ Full support | Uses standard middleware signature |
| cors@2.8.5 | ✓ Full support | Official Express.js middleware |

### 0.4.3 Dependency Chain Analysis

**Direct Dependencies to Add:**
- helmet@^8.1.0
- express-rate-limit@^8.2.1
- cors@^2.8.5

**Transitive Dependencies:**

| Package | Transitive Deps | Impact |
|---------|-----------------|--------|
| helmet | 0 | Zero additional dependencies |
| express-rate-limit | 0 | Zero additional dependencies |
| cors | 2 (object-assign, vary) | Minimal footprint |

**No Version Conflicts Detected:** All packages are compatible with Express 5.x and Node.js 20.x.

### 0.4.4 Breaking Changes Analysis

| Package | Breaking Changes in Upgrade | Impact on Project |
|---------|----------------------------|-------------------|
| helmet@8.x | CSP `upgrade-insecure-requests` enabled by default | May affect local development on HTTP |
| express-rate-limit@8.x | `max` renamed to `limit` | N/A (new installation) |
| cors@2.8.5 | None (stable API) | N/A (new installation) |

**Mitigation for helmet CSP:** Configure `contentSecurityPolicy.directives.upgradeInsecureRequests` conditionally based on NODE_ENV.

### 0.4.5 Alternative Packages Considered

| Alternative | Why Not Selected |
|-------------|------------------|
| `lusca` | Less maintained than helmet, fewer headers |
| `rate-limiter-flexible` | More complex, overkill for simple use case |
| `@koa/cors` | Koa framework specific, not Express compatible |

**Conclusion:** The recommended packages (helmet, express-rate-limit, cors) are the industry-standard choices for Express.js security with minimal dependency footprint and full Express 5.x compatibility.

## 0.5 Security Fix Design

### 0.5.1 Minimal Fix Strategy

**Principle Applied:** Apply the smallest possible changes that completely address all security requirements while maintaining backward compatibility.

**Fix Approach:** Combination of dependency additions and code modifications

### 0.5.2 Security Middleware Integration

**Helmet.js Integration:**

To implement security headers, add helmet middleware to `src/app.js`:

```javascript
app.use(helmet());
```

This single line provides 11+ security headers with secure defaults.

**Rate Limiting Integration:**

To implement rate limiting, add express-rate-limit middleware with configurable limits:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100
});
```

**CORS Configuration:**

To configure CORS policies, add cors middleware with origin restrictions:

```javascript
app.use(cors({ origin: corsOrigins }));
```

### 0.5.3 HTTPS Support Configuration

**Server Modification Strategy:**

To enable HTTPS support, modify `server.js` to conditionally create an HTTPS server when certificates are provided:

```javascript
const server = useHttps 
  ? https.createServer(credentials, app)
  : http.createServer(app);
```

**Certificate Configuration:** Add environment variables for SSL_KEY_PATH and SSL_CERT_PATH.

### 0.5.4 Configuration Enhancements

**New Environment Variables Required:**

| Variable | Purpose | Default |
|----------|---------|---------|
| RATE_LIMIT_WINDOW_MS | Rate limit window duration | 900000 (15 min) |
| RATE_LIMIT_MAX | Max requests per window | 100 |
| CORS_ORIGINS | Allowed CORS origins | * (development) |
| SSL_KEY_PATH | Path to SSL private key | undefined |
| SSL_CERT_PATH | Path to SSL certificate | undefined |
| HTTPS_ENABLED | Enable HTTPS mode | false |

### 0.5.5 Security Improvement Validation

| Security Control | How It Eliminates Vulnerability |
|-----------------|--------------------------------|
| Helmet | Sets CSP, HSTS, X-Frame-Options, removes X-Powered-By |
| Rate Limiting | Prevents DDoS and brute-force by limiting requests per IP |
| CORS | Restricts cross-origin requests to allowed domains |
| HTTPS | Encrypts all data in transit |
| Input Validation | Minimal scope - current endpoints return static strings |

### 0.5.6 Rollback Plan

If security enhancements cause issues:

- **Immediate:** Disable individual middleware by commenting out `app.use()` calls
- **Helmet issues:** Pass `{ contentSecurityPolicy: false }` to disable strict CSP
- **Rate limiting issues:** Increase `limit` or remove limiter middleware
- **CORS issues:** Set `origin: '*'` to allow all origins
- **HTTPS issues:** Set `HTTPS_ENABLED=false` to revert to HTTP

### 0.5.7 Middleware Order Strategy

Security middleware must be registered in the correct order:

```
1. helmet (first - sets security headers)
2. cors (second - handles preflight)
3. rateLimit (third - applies to all routes)
4. routes (last - business logic)
```

This order ensures security controls are applied before request processing.

## 0.6 File Transformation Mapping

### 0.6.1 Complete File Transformation Map

**Transformation Modes:**
- **UPDATE** - Modify existing file to add security controls
- **CREATE** - Create new file for security functionality
- **REFERENCE** - Use as pattern/example for implementation

| Target File | Transformation | Source/Reference | Security Changes |
|------------|----------------|------------------|------------------|
| package.json | UPDATE | package.json | Add helmet@^8.1.0, express-rate-limit@^8.2.1, cors@^2.8.5 dependencies |
| package-lock.json | UPDATE | (auto-generated) | Regenerated by npm install |
| src/app.js | UPDATE | src/app.js | Add helmet, cors, rate-limit middleware imports and app.use() calls |
| src/config/index.js | UPDATE | src/config/index.js | Add security configuration variables (RATE_LIMIT_*, CORS_*, SSL_*) |
| server.js | UPDATE | server.js | Add conditional HTTPS server creation with TLS certificate support |
| src/middleware/security.js | CREATE | src/app.js | Extract security middleware configuration to dedicated module |
| README.md | UPDATE | README.md | Add security configuration documentation |

### 0.6.2 Code Change Specifications

**File: src/app.js**

| Aspect | Specification |
|--------|--------------|
| Lines Affected | Lines 1-10 (imports), Lines 12-20 (middleware setup) |
| Before State | No security middleware, only route mounting |
| After State | Helmet, CORS, and rate-limit middleware applied before routes |
| Security Improvement | All 11+ helmet headers, CORS restrictions, DDoS protection |

**File: server.js**

| Aspect | Specification |
|--------|--------------|
| Lines Affected | Lines 1-5 (imports), Lines 10-25 (server creation) |
| Before State | HTTP-only server using `app.listen()` |
| After State | Conditional HTTP/HTTPS server based on configuration |
| Security Improvement | TLS encryption for all traffic when enabled |

**File: src/config/index.js**

| Aspect | Specification |
|--------|--------------|
| Lines Affected | Lines 5-20 (new exports) |
| Before State | Exports only host, port, env |
| After State | Exports security configuration (rateLimitWindow, rateLimitMax, corsOrigins, etc.) |
| Security Improvement | Centralized security configuration management |

### 0.6.3 New File Specifications

**File: src/middleware/security.js (CREATE)**

| Aspect | Specification |
|--------|--------------|
| Purpose | Centralize security middleware configuration |
| Contents | Configured helmet, cors, and rate-limit middleware exports |
| Pattern Reference | Express middleware factory pattern from src/app.js |
| Dependencies | helmet, cors, express-rate-limit |

### 0.6.4 Configuration Change Specifications

**File: package.json**

| Setting | Current Value | New Value | Rationale |
|---------|--------------|-----------|-----------|
| dependencies.helmet | undefined | ^8.1.0 | Security headers middleware |
| dependencies.express-rate-limit | undefined | ^8.2.1 | Rate limiting middleware |
| dependencies.cors | undefined | ^2.8.5 | CORS handling middleware |

**File: src/config/index.js**

| Setting | Current Value | New Value | Rationale |
|---------|--------------|-----------|-----------|
| rateLimitWindowMs | undefined | 15 * 60 * 1000 | 15-minute rate limit window |
| rateLimitMax | undefined | 100 | 100 requests per window |
| corsOrigins | undefined | process.env.CORS_ORIGINS | Configurable CORS whitelist |
| httpsEnabled | undefined | process.env.HTTPS_ENABLED | HTTPS toggle |
| sslKeyPath | undefined | process.env.SSL_KEY_PATH | SSL private key path |
| sslCertPath | undefined | process.env.SSL_CERT_PATH | SSL certificate path |

### 0.6.5 File Impact Summary

| Category | Files Affected | Change Type |
|----------|---------------|-------------|
| Dependencies | 2 | UPDATE (package.json, package-lock.json) |
| Application Code | 2 | UPDATE (src/app.js, server.js) |
| Configuration | 1 | UPDATE (src/config/index.js) |
| New Modules | 1 | CREATE (src/middleware/security.js) |
| Documentation | 1 | UPDATE (README.md) |
| **Total** | **7** | 6 UPDATE, 1 CREATE |

## 0.7 Dependency Inventory

### 0.7.1 Security Packages to Install

| Registry | Package Name | Current | Install Version | Purpose | Weekly Downloads |
|----------|--------------|---------|-----------------|---------|------------------|
| npm | helmet | Not installed | ^8.1.0 | Security headers middleware | 5.9M+ |
| npm | express-rate-limit | Not installed | ^8.2.1 | Rate limiting middleware | 1.7M+ |
| npm | cors | Not installed | ^2.8.5 | CORS handling middleware | 10M+ |

### 0.7.2 Existing Dependencies (No Update Required)

| Registry | Package Name | Current | Target | Status |
|----------|--------------|---------|--------|--------|
| npm | express | ^5.1.0 | ^5.1.0 | ✓ Current |

### 0.7.3 Dependency Chain Analysis

**Direct Dependencies to Add:** 3 packages

**Transitive Dependencies Impact:**

| Package | Direct Deps | Transitive Deps | Total New Packages |
|---------|-------------|-----------------|-------------------|
| helmet | 0 | 0 | 1 |
| express-rate-limit | 0 | 0 | 1 |
| cors | 2 | 0 | 3 |
| **Total** | **2** | **0** | **5** |

**cors transitive dependencies:**
- `object-assign@4.1.1` - Object property assignment utility
- `vary@1.1.2` - HTTP Vary header utility

### 0.7.4 Package Installation Commands

```bash
npm install helmet@^8.1.0 express-rate-limit@^8.2.1 cors@^2.8.5
```

**Expected package.json changes:**

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "express-rate-limit": "^8.2.1",
    "helmet": "^8.1.0"
  }
}
```

### 0.7.5 Import Statement Updates

**File: src/app.js**

| Import Type | Current | After |
|-------------|---------|-------|
| helmet | Not imported | `const helmet = require('helmet');` |
| cors | Not imported | `const cors = require('cors');` |
| rateLimit | Not imported | `const { rateLimit } = require('express-rate-limit');` |

**File: server.js**

| Import Type | Current | After |
|-------------|---------|-------|
| https | Not imported | `const https = require('https');` |
| fs | Not imported | `const fs = require('fs');` |

### 0.7.6 Development vs Production Dependencies

All security packages are **production dependencies** (not devDependencies) because they must be present at runtime:

| Package | Dependency Type | Rationale |
|---------|----------------|-----------|
| helmet | dependencies | Required at runtime for security headers |
| express-rate-limit | dependencies | Required at runtime for request throttling |
| cors | dependencies | Required at runtime for CORS handling |

### 0.7.7 Security Advisory Status

| Package | Known Vulnerabilities | Last Security Update |
|---------|----------------------|---------------------|
| helmet@8.1.0 | None | March 2024 |
| express-rate-limit@8.2.1 | None | November 2024 |
| cors@2.8.5 | None | 2018 (stable) |
| express@5.1.0 | None | 2024 |

**Audit Command:**
```bash
npm audit
```

Expected result: 0 vulnerabilities after installation.

## 0.8 Impact Analysis and Testing Strategy

### 0.8.1 Security Testing Requirements

**Vulnerability Regression Tests:**

| Test Scenario | Expected Outcome | Verification Method |
|--------------|------------------|---------------------|
| Security headers present | Response includes helmet headers | curl -I inspection |
| X-Powered-By removed | Header not in response | curl -I inspection |
| Rate limiting active | 429 after exceeding limit | Rapid request test |
| CORS blocking | Unauthorized origins rejected | Cross-origin request |
| HTTPS working | TLS handshake successful | openssl s_client |

**Attack Scenarios to Test:**

| Attack Type | Test Method | Expected Defense |
|-------------|-------------|------------------|
| DDoS simulation | Send 100+ requests rapidly | Rate limiter returns 429 |
| XSS via headers | Check CSP header presence | CSP blocks inline scripts |
| Clickjacking | Check X-Frame-Options | DENY prevents framing |
| MIME sniffing | Check X-Content-Type-Options | nosniff prevents sniffing |
| Protocol downgrade | Test HSTS header | Strict-Transport-Security present |

### 0.8.2 Security-Specific Test Cases

**New Test Files to Create:**

| Test File | Purpose | Test Cases |
|-----------|---------|------------|
| tests/security/headers.test.js | Verify security headers | 11+ header presence tests |
| tests/security/rate-limit.test.js | Verify rate limiting | Threshold and reset tests |
| tests/security/cors.test.js | Verify CORS policies | Origin whitelist tests |

### 0.8.3 Manual Verification Steps

**Security Headers Verification:**

```bash
curl -I http://127.0.0.1:3000/
```

Expected headers in response:
- Content-Security-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy
- Origin-Agent-Cluster
- Referrer-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- X-DNS-Prefetch-Control
- X-Download-Options
- X-Frame-Options
- X-Permitted-Cross-Domain-Policies

**Rate Limiting Verification:**

```bash
for i in {1..105}; do curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/; echo; done | tail -10
```

Expected: First 100 return 200, remaining return 429.

**CORS Verification:**

```bash
curl -H "Origin: http://evil.com" -I http://127.0.0.1:3000/
```

Expected: No Access-Control-Allow-Origin header for unauthorized origins.

### 0.8.4 Automated Security Scanning

**Recommended Tools:**

| Tool | Command | Purpose |
|------|---------|---------|
| npm audit | `npm audit` | Dependency vulnerability scan |
| helmet-csp-header | Manual inspection | CSP header validation |
| OWASP ZAP | ZAP scan | Automated security testing |
| SSL Labs | ssllabs.com/ssltest | TLS configuration check |

### 0.8.5 Existing Test Suite Verification

**Tests to Run Post-Implementation:**

```bash
npm test
```

Current test suite: Minimal (echo command only in package.json)

**Recommendation:** Create actual test suite for security validation.

### 0.8.6 Impact Assessment

**Direct Security Improvements:**

| Improvement | Metric |
|-------------|--------|
| Security headers | 11+ headers added |
| DDoS protection | 100 req/15min limit |
| Information leakage | X-Powered-By removed |
| Cross-origin security | CORS whitelist enforced |

**Side Effects Assessment:**

| Area | Impact | Mitigation |
|------|--------|------------|
| CSP in development | May block local resources | Disable upgrade-insecure-requests in dev |
| Rate limiting | May affect load testing | Increase limit for test environment |
| CORS | May break legitimate integrations | Configure CORS_ORIGINS properly |
| HTTPS | Requires certificates | Use self-signed certs for development |

**No Breaking Changes to Public API:** Both GET endpoints (/, /evening) continue to function identically with enhanced security headers.

## 0.9 Scope Boundaries

### 0.9.1 Exhaustively In Scope

**Dependency Manifests:**
- `package.json` - Add security dependencies
- `package-lock.json` - Regenerate with new dependencies

**Source Files with Security Integration:**
- `src/app.js` - Add security middleware (helmet, cors, rate-limit)
- `server.js` - Add HTTPS server support
- `src/config/index.js` - Add security configuration exports

**New Files to Create:**
- `src/middleware/security.js` - Centralized security middleware configuration

**Configuration Patterns:**
- `src/config/*.js` - Environment variable management
- `.env.example` - Security-related environment variables (if created)

**Documentation Updates:**
- `README.md` - Security configuration documentation section

**Infrastructure Files (if HTTPS certificates needed):**
- `certs/` - Directory for SSL certificates (optional, development)
- `.gitignore` - Ensure certs/ and *.pem are excluded

### 0.9.2 Explicitly Out of Scope

**Feature Additions Unrelated to Security:**
- New API endpoints
- Database integration
- Authentication/authorization (not requested)
- Session management

**Performance Optimizations Not Required for Security:**
- Compression middleware
- Caching layers
- CDN configuration

**Code Refactoring Beyond Security Requirements:**
- Converting CommonJS to ES Modules
- TypeScript migration
- Code style changes

**Non-Vulnerable Dependencies:**
- express@5.1.0 - Already secure, no update needed

**Style or Formatting Changes:**
- Linting configuration
- Prettier formatting
- Code comments (beyond security documentation)

**Test Infrastructure (unless for security validation):**
- General unit testing framework
- Integration test setup
- CI/CD pipeline changes

**Items Explicitly Excluded by User:**
- None specified

### 0.9.3 Conditional Scope

**Included Only If Required:**

| Item | Condition | Included If |
|------|-----------|-------------|
| SSL certificate generation | HTTPS enabled | Self-signed certs for development |
| .env file creation | Environment config needed | If not using shell environment |
| Security test suite | Testing requested | If comprehensive validation needed |

### 0.9.4 Scope Decision Matrix

| Category | In Scope | Out of Scope |
|----------|----------|--------------|
| **Dependencies** | helmet, express-rate-limit, cors | Other middleware packages |
| **Source Code** | app.js, server.js, config/index.js | route handlers, business logic |
| **Configuration** | Security env vars | Non-security configuration |
| **Documentation** | Security section in README | General documentation overhaul |
| **Testing** | Security verification | Full test suite creation |
| **Infrastructure** | HTTPS server setup | Container/deployment changes |

### 0.9.5 Boundary Enforcement

**Criteria for Including Additional Files:**

A file is only in scope if it:
1. Directly requires security middleware integration, OR
2. Provides configuration for security features, OR
3. Enables HTTPS/TLS functionality, OR
4. Documents security configuration

**Criteria for Excluding Files:**

A file is out of scope if it:
1. Contains only business logic (routes returning static strings)
2. Is unrelated to HTTP security
3. Would require changes beyond the stated security requirements

## 0.10 Execution Parameters

### 0.10.1 Security Verification Commands

**Dependency Installation:**

```bash
cd /tmp/blitzy/test-spec/blitzy0c2547c18
npm install helmet@^8.1.0 express-rate-limit@^8.2.1 cors@^2.8.5
```

**Dependency Vulnerability Scan:**

```bash
npm audit
```

**Security Header Verification:**

```bash
curl -I http://127.0.0.1:3000/
```

**Rate Limit Testing:**

```bash
for i in $(seq 1 105); do 
  curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
done | sort | uniq -c
```

**CORS Testing:**

```bash
curl -H "Origin: http://unauthorized.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     -I http://127.0.0.1:3000/
```

### 0.10.2 Application Startup Commands

**Development Mode (HTTP):**

```bash
NODE_ENV=development npm start
```

**Production Mode (HTTP):**

```bash
NODE_ENV=production HOST=0.0.0.0 PORT=8080 npm start
```

**Production Mode (HTTPS):**

```bash
NODE_ENV=production \
  HTTPS_ENABLED=true \
  SSL_KEY_PATH=./certs/key.pem \
  SSL_CERT_PATH=./certs/cert.pem \
  HOST=0.0.0.0 \
  PORT=443 \
  npm start
```

### 0.10.3 Self-Signed Certificate Generation (Development)

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 \
  -nodes \
  -subj "/CN=localhost"
```

### 0.10.4 Full Test Suite Execution

```bash
npm test
```

**Expected Result:** All tests pass (once test suite is created).

### 0.10.5 Security Documentation References

| Resource | URL | Purpose |
|----------|-----|---------|
| Helmet.js Docs | helmetjs.github.io | Security header configuration |
| Express Rate Limit | express-rate-limit.mintlify.app | Rate limiting options |
| CORS Package | npmjs.com/package/cors | CORS configuration |
| Express Security | expressjs.com/en/advanced/best-practice-security.html | Best practices |
| OWASP Headers | owasp.org/www-project-secure-headers | Header guidelines |
| Node.js HTTPS | nodejs.org/api/https.html | TLS configuration |

### 0.10.6 Implementation Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Priority | Security fix first, minimal disruption second | User requirement |
| Backward Compatibility | Must maintain | Existing clients depend on current API |
| Deployment | Immediate after implementation | No coordination required |
| Breaking Changes | Not acceptable | Tutorial application with potential users |

### 0.10.7 Environment Variable Reference

| Variable | Type | Default | Required |
|----------|------|---------|----------|
| HOST | string | 127.0.0.1 | No |
| PORT | number | 3000 | No |
| NODE_ENV | string | development | No |
| RATE_LIMIT_WINDOW_MS | number | 900000 | No |
| RATE_LIMIT_MAX | number | 100 | No |
| CORS_ORIGINS | string | * | No |
| HTTPS_ENABLED | boolean | false | No |
| SSL_KEY_PATH | string | undefined | If HTTPS_ENABLED=true |
| SSL_CERT_PATH | string | undefined | If HTTPS_ENABLED=true |

### 0.10.8 Verification Checklist

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Dependencies installed | `npm ls` | helmet, express-rate-limit, cors listed |
| No vulnerabilities | `npm audit` | 0 vulnerabilities |
| Server starts | `npm start` | "Server running" message |
| Headers present | `curl -I localhost:3000` | Security headers in response |
| Rate limiting works | Rapid curl loop | 429 after limit exceeded |
| CORS enforced | Cross-origin curl | Blocked for unauthorized origins |

## 0.11 Special Instructions

### 0.11.1 User-Specified Security Requirements

Based on the user's requirements, the following special instructions are emphasized:

**Explicit Requirements from User:**

| Requirement | Implementation Priority | Notes |
|------------|------------------------|-------|
| Security headers | High | Use helmet.js as specified |
| Input validation | Medium | Minimal for static endpoints |
| Rate limiting | High | Implement with express-rate-limit |
| HTTPS support | High | Conditional server configuration |
| Update dependencies | High | Add new security packages |
| helmet.js for security middleware | High | Explicitly named by user |
| Configure proper CORS policies | High | Implement with cors package |

### 0.11.2 Change Scope Directives

**Interpreted from User Intent:**

- **ONLY make changes necessary for security fix:** All changes relate directly to implementing security headers, rate limiting, CORS, HTTPS, or installing the required dependencies
- **Do not refactor unrelated code:** Route handlers remain unchanged (they only return static strings)
- **Do not update non-vulnerable dependencies:** Express 5.1.0 is current and secure
- **Preserve all existing functionality:** Both endpoints (/, /evening) continue to work identically

### 0.11.3 Development vs Production Considerations

| Environment | Helmet CSP | Rate Limiting | CORS | HTTPS |
|-------------|-----------|---------------|------|-------|
| Development | Relaxed (disable upgrade-insecure-requests) | Higher limits or disabled | Allow localhost origins | Optional (HTTP acceptable) |
| Production | Strict defaults | 100 req/15min | Whitelist only | Required |

**Implementation Note:** Use NODE_ENV to conditionally configure security middleware strictness.

### 0.11.4 Secrets Management

**Certificate Files:**
- SSL private keys and certificates should NEVER be committed to version control
- Add `*.pem` and `certs/` to `.gitignore`
- Use environment variables to specify certificate paths

**Environment Variables:**
- Security-sensitive values (CORS origins) should be provided via environment, not hardcoded
- Document required variables in README.md

### 0.11.5 Compliance Considerations

While no specific compliance standards were mentioned, the security enhancements align with:

| Standard | Relevant Controls |
|----------|-------------------|
| OWASP Top 10 | A03:2021 Injection (CSP), A05:2021 Security Misconfiguration (headers) |
| PCI-DSS | Req 4.1 (HTTPS for transmission), Req 6.5 (secure coding) |
| SOC 2 | CC6.1 (logical access), CC6.7 (transmission security) |

### 0.11.6 Breaking Changes Advisory

**No Breaking Changes Expected:**

| Change | Breaking? | Mitigation |
|--------|-----------|------------|
| Security headers added | No | Headers are additive |
| Rate limiting enabled | Potentially | Configurable limits |
| CORS restrictions | Potentially | Whitelist configuration |
| HTTPS option | No | Opt-in via environment variable |

**If Issues Arise:**

- Rate limiting can be disabled by removing middleware
- CORS can be set to `origin: '*'` for full permissiveness
- CSP can be disabled via `helmet({ contentSecurityPolicy: false })`

### 0.11.7 Implementation Order Recommendation

| Order | Task | Reason |
|-------|------|--------|
| 1 | Install dependencies | Required before code changes |
| 2 | Update src/config/index.js | Configuration must exist before use |
| 3 | Create src/middleware/security.js | Centralize security configuration |
| 4 | Update src/app.js | Apply security middleware |
| 5 | Update server.js | Add HTTPS support |
| 6 | Update README.md | Document security configuration |
| 7 | Test all endpoints | Verify no regressions |
| 8 | Run security verification | Confirm all security controls active |

### 0.11.8 Post-Implementation Verification

After implementation, verify:

- [ ] `npm audit` shows 0 vulnerabilities
- [ ] `curl -I` shows all helmet security headers
- [ ] Rate limiting returns 429 after threshold
- [ ] CORS blocks unauthorized origins
- [ ] HTTPS works when certificates provided
- [ ] Both endpoints return expected responses
- [ ] No X-Powered-By header in responses

