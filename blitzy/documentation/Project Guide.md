# Project Guide: Express.js Production-Grade Enhancement

## Executive Summary

This project enhances a minimal Express.js "Hello, World" HTTP server into a production-grade application with middleware, structured logging, environment configuration, expanded routing, and PM2 deployment readiness.

**Completion: 63 hours completed out of 75 total hours = 84% complete.**

All planned source code, configuration, test, and documentation files have been implemented and validated. The codebase compiles cleanly, all 170 tests pass with 100% coverage, and the application runs correctly with all endpoints, security headers, and graceful shutdown verified. The remaining 12 hours consist of human-judgment tasks required for production deployment — environment configuration, security policy review, PM2 deployment testing, log rotation, and peer code review.

### Key Metrics
| Metric | Value |
|--------|-------|
| Total Commits | 24 |
| Files Created | 12 |
| Files Updated | 12 |
| Lines Added | 3,691 (excl. package-lock.json) |
| Test Suites | 8 passed / 8 total |
| Tests | 170 passed / 170 total |
| Code Coverage | 100% (Statements, Branches, Functions, Lines) |
| Compilation | 13/13 source files clean |
| Runtime | All 4 endpoints verified |

---

## Validation Results Summary

### Final Validator Outcomes

All 5 production-readiness gates **PASSED**:

| Gate | Description | Result |
|------|-------------|--------|
| Gate 1 | Test Pass Rate | ✅ 170/170 tests passing (100%) |
| Gate 2 | Application Runtime | ✅ Server starts, all endpoints respond correctly |
| Gate 3 | Zero Unresolved Errors | ✅ All source files compile cleanly, zero warnings |
| Gate 4 | In-Scope File Validation | ✅ All 24 planned files present and working |
| Gate 5 | Dependency Verification | ✅ All 9 dependencies importable and correct versions |

### Compilation Results

All 13 source and configuration files pass `node -c` syntax validation:
- `server.js` ✓
- `src/app.js` ✓
- `src/config/index.js` ✓
- `src/utils/logger.js` ✓
- `src/middleware/index.js` ✓
- `src/middleware/requestLogger.js` ✓
- `src/middleware/errorHandler.js` ✓
- `src/routes/index.js` ✓
- `src/routes/main.routes.js` ✓
- `src/routes/health.routes.js` ✓
- `src/routes/api.routes.js` ✓
- `ecosystem.config.js` ✓
- `jest.config.js` ✓

### Test Results

```
Test Suites: 8 passed, 8 total (100%)
Tests:       170 passed, 170 total (100%)
Coverage:    100% Statements | 100% Branches | 100% Functions | 100% Lines
```

All files at 100% coverage:
| File | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| server.js | 100% | 100% | 100% | 100% |
| src/app.js | 100% | 100% | 100% | 100% |
| src/config/index.js | 100% | 100% | 100% | 100% |
| src/utils/logger.js | 100% | 100% | 100% | 100% |
| src/middleware/errorHandler.js | 100% | 100% | 100% | 100% |
| src/middleware/index.js | 100% | 100% | 100% | 100% |
| src/middleware/requestLogger.js | 100% | 100% | 100% | 100% |
| src/routes/api.routes.js | 100% | 100% | 100% | 100% |
| src/routes/health.routes.js | 100% | 100% | 100% | 100% |
| src/routes/index.js | 100% | 100% | 100% | 100% |
| src/routes/main.routes.js | 100% | 100% | 100% | 100% |

### Runtime Validation

Application started via `node server.js` and all endpoints verified:
| Endpoint | Status | Response | Verified |
|----------|--------|----------|----------|
| `GET /` | 200 | `Hello, World!\n` | ✅ Backward compatible |
| `GET /evening` | 200 | `Good evening` | ✅ Backward compatible |
| `GET /health` | 200 | `{"status":"ok","uptime":...}` | ✅ New endpoint |
| `GET /api/status` | 200 | `{"status":"running","environment":"development"}` | ✅ New endpoint |

Additional runtime checks:
- Helmet security headers present (CSP, COOP, CORP, X-Content-Type-Options) ✅
- CORS `Access-Control-Allow-Origin: *` header present ✅
- `X-Powered-By` header removed by Helmet ✅
- Graceful shutdown (SIGTERM/SIGINT) working correctly ✅
- Winston structured logging active ✅

### Fixes Applied During Validation

| Fix | Commit | Description |
|-----|--------|-------------|
| 1 | `d1e9bff` | Removed `ecosystem.config.js` from `.gitignore` — PM2 config should be version-controlled |
| 2 | `d1e9bff` | Added `coverage/` to `.gitignore` — Jest coverage artifacts should not be tracked |

### Dependency Status

All 9 dependencies verified at correct versions:
| Package | Version | Type | Status |
|---------|---------|------|--------|
| express | 5.1.0 | production | ✅ |
| cors | 2.8.6 | production | ✅ |
| dotenv | 17.2.4 | production | ✅ |
| helmet | 8.1.0 | production | ✅ |
| morgan | 1.10.1 | production | ✅ |
| winston | 3.19.0 | production | ✅ |
| jest | 30.2.0 | dev | ✅ |
| pm2 | 6.0.14 | dev | ✅ |
| supertest | 7.2.2 | dev | ✅ |

NPM audit: 2 advisories (1 low severity ReDoS in pm2, 1 moderate body-parser DoS — fixable with `npm audit fix`).

---

## Hours Breakdown and Completion Calculation

### Completed Hours: 63h

| Category | Component | Lines | Hours |
|----------|-----------|-------|-------|
| **Source Code** | Winston Logger (`src/utils/logger.js`) | 256 | 6h |
| | Middleware Pipeline (`src/middleware/*` — 3 files) | 204 | 8h |
| | Routes (`src/routes/health.routes.js`, `api.routes.js`, barrel update) | 99 | 2.5h |
| | Application Integration (`app.js`, `server.js`, `config/index.js`) | 221 | 6h |
| **Configuration** | `ecosystem.config.js`, `.env.example`, `package.json`, `jest.config.js`, `.gitignore` | 196 | 3.5h |
| **Tests** | 8 test files (4 new, 4 updated) | 2,119 | 29h |
| **Documentation** | `README.md` (comprehensive update) | 615 | 4h |
| **Bug Fixes & Validation** | Test assertion fixes, .gitignore corrections, dependency verification, runtime testing | — | 4h |
| | **Total Completed** | **3,691** | **63h** |

### Remaining Hours: 12h

| Task | Hours | Priority | Confidence |
|------|-------|----------|------------|
| Production `.env` configuration with real values | 1h | High | High |
| Helmet CSP policy customization for production | 2h | Medium | Medium |
| CORS origin restriction for production domain | 1h | Medium | High |
| PM2 cluster deployment testing on target infrastructure | 3h | Medium | Medium |
| Log rotation configuration for Winston file transports | 1.5h | Medium | High |
| Peer code review of all new modules | 2.5h | Medium | High |
| Production documentation review and signoff | 1h | Low | High |
| **Total Remaining** | **12h** | | |

*Note: Remaining hours include enterprise multipliers (1.15× compliance + 1.25× uncertainty buffer) applied proportionally across tasks.*

### Completion Calculation

```
Completed:  63 hours
Remaining:  12 hours
Total:      75 hours
Completion: 63 / 75 = 84%
```

```mermaid
pie title Project Hours Breakdown
    "Completed Work" : 63
    "Remaining Work" : 12
```

---

## Detailed Human Task List

The following tasks require human judgment and cannot be automated. Total remaining: **12 hours**.

| # | Task | Description | Action Steps | Hours | Priority | Severity |
|---|------|-------------|--------------|-------|----------|----------|
| 1 | Production Environment Configuration | Create `.env` file with production-specific values (secrets, domain, ports) | 1. Copy `.env.example` to `.env` 2. Set `HOST=0.0.0.0` for external access 3. Set `PORT` to production port 4. Set `NODE_ENV=production` 5. Set `LOG_LEVEL=info` or `warn` 6. Set `CORS_ORIGIN` to actual domain | 1h | High | High |
| 2 | Helmet CSP Policy Customization | Review and customize Content-Security-Policy headers for the specific production deployment context | 1. Review default Helmet CSP directives 2. Identify required script-src, style-src, img-src domains 3. Configure Helmet options in `src/middleware/index.js` if defaults are too restrictive 4. Test with production frontend | 2h | Medium | Medium |
| 3 | CORS Origin Restriction | Configure restrictive CORS origin for production instead of wildcard `*` | 1. Determine production frontend domain(s) 2. Set `CORS_ORIGIN` in production `.env` to specific domain 3. Test cross-origin requests from allowed and disallowed origins | 1h | Medium | Medium |
| 4 | PM2 Cluster Deployment Testing | Test PM2 cluster-mode deployment on the actual production infrastructure | 1. Install PM2 globally on production server: `npm install -g pm2` 2. Deploy application to production server 3. Run `pm2 start ecosystem.config.js --env production` 4. Verify cluster instances spawned (one per CPU) 5. Test zero-downtime reload: `pm2 reload ecosystem.config.js` 6. Verify graceful shutdown: `pm2 stop ecosystem.config.js` 7. Set up PM2 startup script: `pm2 startup` | 3h | Medium | Medium |
| 5 | Log Rotation Configuration | Configure log rotation for Winston file transports to prevent unbounded disk usage in production | 1. Install `winston-daily-rotate-file` package 2. Configure rotation in `src/utils/logger.js` (max size, max files, date pattern) 3. Alternatively, configure OS-level logrotate for `logs/*.log` 4. Test rotation triggers correctly | 1.5h | Medium | Low |
| 6 | Peer Code Review | Senior engineer review of all new modules for code quality, security, and architectural alignment | 1. Review middleware pipeline ordering and configuration 2. Review Winston logger transport configuration 3. Review error handler sanitization logic 4. Review graceful shutdown implementation 5. Review test coverage adequacy for edge cases 6. Approve or request changes | 2.5h | Medium | Medium |
| 7 | Production Documentation Signoff | Final review of README and deployment documentation accuracy | 1. Verify all commands in README work on production OS 2. Verify environment variable documentation matches actual config 3. Verify PM2 deployment instructions are accurate 4. Sign off documentation for production release | 1h | Low | Low |
| | **Total Remaining Hours** | | | **12h** | | |

---

## Development Guide

### System Prerequisites

| Requirement | Version | Verification Command |
|-------------|---------|---------------------|
| Node.js | >= 18.x (tested with v20.20.0) | `node --version` |
| npm | >= 9.x (tested with v11.1.0) | `npm --version` |
| Operating System | Linux, macOS, or Windows | — |

### Environment Setup

#### 1. Clone and Enter the Repository

```bash
git clone <repository-url>
cd hello_world
```

#### 2. Install Dependencies

```bash
npm install
```

**Expected output:** All 9 packages installed (6 production + 3 dev dependencies). Verify with:

```bash
npm ls --depth=0
```

Expected packages: `cors@2.8.6`, `dotenv@17.2.4`, `express@5.1.0`, `helmet@8.1.0`, `morgan@1.10.1`, `winston@3.19.0`, `jest@30.2.0`, `pm2@6.0.14`, `supertest@7.2.2`.

#### 3. Configure Environment Variables (Optional)

The application runs with sensible defaults without a `.env` file. To customize:

```bash
cp .env.example .env
# Edit .env with your preferred values
```

Default values (used when no `.env` file is present):
| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Server bind address |
| `PORT` | `3000` | Server listen port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Winston log level (error/warn/info/http/debug) |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |

### Running the Application

#### Development Mode

```bash
npm start
# or equivalently:
npm run start:dev
```

**Expected output:**
```
Server running at http://127.0.0.1:3000/
```

#### Production Mode (without PM2)

```bash
npm run start:prod
```

#### Production Mode (with PM2)

```bash
# Install PM2 globally (if not already)
npm install -g pm2

# Start in cluster mode
npm run pm2:start
# or: pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# Zero-downtime reload
pm2 reload ecosystem.config.js

# Stop all instances
npm run pm2:stop
```

### Verification Steps

#### 1. Verify Server is Running

```bash
curl http://127.0.0.1:3000/
```
**Expected:** `Hello, World!` (with trailing newline)

#### 2. Verify All Endpoints

```bash
# Root endpoint
curl -s http://127.0.0.1:3000/
# Expected: Hello, World!

# Evening endpoint
curl -s http://127.0.0.1:3000/evening
# Expected: Good evening

# Health check
curl -s http://127.0.0.1:3000/health | python3 -m json.tool
# Expected: {"status": "ok", "uptime": <number>}

# API status
curl -s http://127.0.0.1:3000/api/status | python3 -m json.tool
# Expected: {"status": "running", "environment": "development"}
```

#### 3. Verify Security Headers

```bash
curl -sI http://127.0.0.1:3000/ | grep -iE '(content-security|x-content-type|x-powered|access-control)'
```
**Expected:**
- `Content-Security-Policy: ...` (Helmet)
- `X-Content-Type-Options: nosniff` (Helmet)
- `Access-Control-Allow-Origin: *` (CORS)
- No `X-Powered-By` header (removed by Helmet)

### Running Tests

```bash
# Run all tests
npx jest --watchAll=false --ci

# Run tests with coverage report
npx jest --watchAll=false --ci --coverage

# Run specific test suite
npx jest tests/unit/logger.test.js --watchAll=false

# Run in CI mode
npm run test:ci
```

**Expected test output:**
```
Test Suites: 8 passed, 8 total
Tests:       170 passed, 170 total
Coverage:    100% Statements | 100% Branches | 100% Functions | 100% Lines
```

### Project Structure

```
/ (project root)
├── server.js                          # Entry point — dotenv, Winston, graceful shutdown
├── ecosystem.config.js                # PM2 cluster-mode configuration
├── package.json                       # Dependencies and scripts
├── jest.config.js                     # Test configuration (100% coverage)
├── .env.example                       # Environment variable template
├── .gitignore                         # Git exclusions
├── README.md                          # Comprehensive documentation
├── src/
│   ├── app.js                         # App Factory — middleware + routes
│   ├── config/
│   │   └── index.js                   # 12-Factor environment config
│   ├── middleware/
│   │   ├── index.js                   # Middleware pipeline orchestrator
│   │   ├── requestLogger.js           # Morgan → Winston stream integration
│   │   └── errorHandler.js            # Centralized JSON error handler
│   ├── routes/
│   │   ├── index.js                   # Barrel exports (main, health, api)
│   │   ├── main.routes.js             # GET / and GET /evening
│   │   ├── health.routes.js           # GET /health (liveness probe)
│   │   └── api.routes.js              # GET /api/status
│   └── utils/
│       └── logger.js                  # Winston structured logger
└── tests/
    ├── unit/
    │   ├── config.test.js             # Config property tests (21 tests)
    │   ├── routes.test.js             # Main route definition tests
    │   ├── logger.test.js             # Winston logger tests
    │   ├── middleware.test.js          # Middleware pipeline tests
    │   ├── health-routes.test.js      # Health route tests
    │   └── api-routes.test.js         # API route tests
    ├── integration/
    │   └── endpoints.test.js          # HTTP endpoint tests via Supertest
    └── lifecycle/
        └── server.test.js             # Server lifecycle and shutdown tests
```

### Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| `EADDRINUSE` on startup | Port 3000 already in use | Set `PORT=3001` in `.env` or kill the existing process |
| Tests fail with timeout | Server not closing cleanly | Ensure `--watchAll=false` flag is used |
| `Cannot find module 'dotenv'` | Dependencies not installed | Run `npm install` |
| Log files not created | `logs/` directory permissions | Winston creates `logs/` automatically; check write permissions |
| PM2 command not found | PM2 not installed globally | Run `npm install -g pm2` |

---

## Risk Assessment

### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Winston file transports without log rotation could exhaust disk space | Medium | High (in production) | Configure `winston-daily-rotate-file` or OS-level logrotate before deploying to production |
| Express 5.x is still at v5.1.0 (relatively new major version) | Low | Low | All middleware verified compatible; monitor Express 5 release notes for breaking changes |
| Jest 30 is at alpha/beta stage (v30.2.0) | Low | Low | Tests run reliably; pin version in package-lock.json for stability |

### Security Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| CORS wildcard (`*`) allows any origin in default configuration | Medium | Medium | Set `CORS_ORIGIN` to specific production domain before deploying |
| Helmet defaults may be too permissive or restrictive for specific use case | Low | Medium | Review CSP directives against production frontend requirements |
| PM2 has a known low-severity ReDoS vulnerability (GHSA-x5gf-qvw8-r2rm) | Low | Low | PM2 is a dev dependency; in production, install globally from a trusted source; monitor for patch release |
| body-parser moderate DoS vulnerability (GHSA-wqch-xfxh-vrr4) | Medium | Low | Run `npm audit fix` to apply available patch |

### Operational Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| No CI/CD pipeline configured (out of scope per AAP) | Medium | N/A | Set up GitHub Actions or equivalent before production release |
| No HTTPS/TLS (out of scope per AAP) | High | N/A | Deploy behind a reverse proxy (nginx, AWS ALB) with TLS termination |
| No rate limiting middleware | Medium | Medium | Consider adding `express-rate-limit` for production API endpoints |
| No health check monitoring/alerting | Medium | Medium | Connect `/health` endpoint to load balancer health checks and uptime monitoring |

### Integration Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| PM2 cluster mode not tested on target production hardware | Medium | Medium | Test cluster spawning, zero-downtime reload, and memory limits on actual deployment target |
| `.env` file with production secrets must be managed securely | High | Medium | Use secret management (Vault, AWS SSM, etc.) instead of `.env` files in production |

---

## Implementation Completeness by Feature

| Feature (from AAP) | Status | Evidence |
|---------------------|--------|----------|
| Middleware pipeline (helmet, cors, body parsers, morgan) | ✅ Complete | `src/middleware/index.js` applies all 5 middleware in correct order; verified via runtime headers |
| Health-check endpoint (`GET /health`) | ✅ Complete | `src/routes/health.routes.js` returns JSON status with uptime; integration tests pass |
| API route namespace (`GET /api/status`) | ✅ Complete | `src/routes/api.routes.js` returns JSON status with environment; integration tests pass |
| Winston structured logging | ✅ Complete | `src/utils/logger.js` with console + file transports, custom levels, environment-aware config; 100% tested |
| Morgan → Winston stream integration | ✅ Complete | `src/middleware/requestLogger.js` pipes HTTP logs to Winston at 'http' level |
| Centralized error handler | ✅ Complete | `src/middleware/errorHandler.js` with production message sanitization; registered after routes |
| dotenv environment configuration | ✅ Complete | `require('dotenv').config()` as first statement in `server.js`; `.env.example` template created |
| Extended config (logLevel, corsOrigin) | ✅ Complete | `src/config/index.js` exports both new properties with defaults; 21 config tests pass |
| Graceful shutdown (SIGTERM/SIGINT) | ✅ Complete | `server.js` has both signal handlers calling `server.close()`; lifecycle tests verify |
| PM2 ecosystem configuration | ✅ Complete | `ecosystem.config.js` with cluster mode, env blocks, log paths, kill_timeout |
| PM2 npm scripts | ✅ Complete | `pm2:start` and `pm2:stop` scripts in `package.json` |
| Updated .gitignore | ✅ Complete | `.env`, `logs/`, `*.log`, `coverage/` patterns present |
| Updated README | ✅ Complete | 615 lines covering middleware, logging, PM2, environment config, new endpoints |
| Backward compatibility | ✅ Complete | `GET /` returns `"Hello, World!\n"` and `GET /evening` returns `"Good evening"` — identical to original |
| 100% test coverage maintained | ✅ Complete | 170 tests, 100% coverage across all metrics |
| CommonJS module syntax | ✅ Complete | All files use `require`/`module.exports` consistently |
| JSDoc annotations | ✅ Complete | All files include `@fileoverview`, `@param`, `@returns` documentation |
| App Factory pattern preserved | ✅ Complete | `src/app.js` exports configured app without calling `listen()` |

---

## NPM Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `npm start` | `node server.js` | Start server (default development) |
| `npm run start:dev` | `node server.js` | Start server in development |
| `npm run start:prod` | `NODE_ENV=production node server.js` | Start server in production mode |
| `npm test` | `jest` | Run test suite |
| `npm run test:watch` | `jest --watch` | Run tests in watch mode |
| `npm run test:coverage` | `jest --coverage` | Run tests with coverage report |
| `npm run test:ci` | `jest --ci --coverage --reporters=default` | CI mode with coverage |
| `npm run pm2:start` | `pm2 start ecosystem.config.js` | Start with PM2 cluster mode |
| `npm run pm2:stop` | `pm2 stop ecosystem.config.js` | Stop PM2-managed instances |
