# Project Guide: Express.js Production Enhancement

## 1. Executive Summary

This project enhances an existing minimal Express.js HTTP server into a production-ready application with enterprise-grade middleware, structured logging, health monitoring, and PM2 deployment support.

**Completion: 56 hours completed out of 68 total hours = 82.4% complete.**

All 21 in-scope files have been implemented, validated, and committed. The test suite (105 tests across 7 suites) passes with 100% statement, function, and line coverage. All runtime endpoints are verified. The remaining 12 hours of work consist of production deployment preparation tasks requiring human intervention.

### Key Achievements
- Full middleware pipeline: Helmet, CORS, body parsers, Morgan request logging, centralized error handling
- Winston structured logging with console and file transports, Morgan stream integration
- Health check endpoint (`GET /health`) for PM2 and load balancer monitoring
- PM2 ecosystem configuration with cluster mode support
- dotenv-based environment configuration with expanded properties
- Graceful shutdown signal handling (SIGTERM/SIGINT)
- Comprehensive test suite exceeding all coverage thresholds
- Backward compatibility maintained for all existing endpoints

### Critical Unresolved Issues
- 2 npm audit vulnerabilities: `qs` (high severity DoS), `pm2` (low severity ReDoS)
- Production `.env` file needs to be created from `.env.example` with real deployment values
- PM2 cluster mode requires verification in target production environment

---

## 2. Validation Results Summary

### 2.1 Dependencies — 100% Success
All 9 packages installed successfully with zero conflicts:

| Package | Version | Type | Status |
|---------|---------|------|--------|
| express | 5.1.0 | production | ✅ Installed |
| cors | 2.8.6 | production | ✅ Installed |
| dotenv | 17.2.4 | production | ✅ Installed |
| helmet | 8.1.0 | production | ✅ Installed |
| morgan | 1.10.1 | production | ✅ Installed |
| winston | 3.19.0 | production | ✅ Installed |
| jest | 30.2.0 | dev | ✅ Installed |
| pm2 | 6.0.14 | dev | ✅ Installed |
| supertest | 7.1.4 | dev | ✅ Installed |

### 2.2 Compilation — 100% Success
All 21 in-scope files load and execute without errors. All CommonJS module chains resolve correctly.

### 2.3 Tests — 100% Success (105/105)

| Test Suite | Tests | Status |
|-----------|-------|--------|
| tests/unit/config.test.js | 28 | ✅ Pass |
| tests/unit/routes.test.js | 10 | ✅ Pass |
| tests/unit/logger.test.js | 21 | ✅ Pass |
| tests/unit/middleware.test.js | 14 | ✅ Pass |
| tests/integration/endpoints.test.js | 18 | ✅ Pass |
| tests/integration/health.test.js | 6 | ✅ Pass |
| tests/lifecycle/server.test.js | 8 | ✅ Pass |
| **Total** | **105** | **✅ All Pass** |

**Coverage Results:**

| Metric | Achieved | Threshold | Status |
|--------|----------|-----------|--------|
| Statements | 100% | 80% | ✅ Exceeded |
| Branches | 94.11% | 75% | ✅ Exceeded |
| Functions | 100% | 90% | ✅ Exceeded |
| Lines | 100% | 80% | ✅ Exceeded |

### 2.4 Runtime — 100% Success

| Endpoint | Status | Response | Headers |
|----------|--------|----------|---------|
| GET / | 200 | `Hello, World!\n` | Helmet + CORS ✅ |
| GET /evening | 200 | `Good evening` | Helmet + CORS ✅ |
| GET /health | 200 | `{status:"ok", uptime, timestamp}` | Helmet + CORS ✅ |
| GET /nonexistent | 404 | JSON error response | Helmet + CORS ✅ |

Security headers confirmed: Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Cross-Origin-Opener-Policy, Referrer-Policy.

### 2.5 Fixes Applied During Validation
- **dotenv mock fix** (commit 25a1559): Resolved Jest out-of-scope variable reference error by switching from `jest.mock` to `jest.doMock` in config tests
- **Health routes mounting fix** (commit e79954c): Ensured healthRoutes were properly mounted in the Express middleware pipeline in `src/app.js`

---

## 3. Project Hours Breakdown

### 3.1 Completed Hours Calculation (56 hours)

| Category | Component | Hours |
|----------|-----------|-------|
| **Source Code** | Config enhancement (config/index.js + dotenv) | 2h |
| | Winston logger (src/utils/logger.js) | 3h |
| | Morgan middleware (morgan.middleware.js) | 2h |
| | Error middleware (error.middleware.js) | 3h |
| | Health routes (health.routes.js) | 1.5h |
| | Route aggregator (routes/index.js) | 0.5h |
| | App factory middleware pipeline (app.js) | 4h |
| | Server enhancement with Winston + shutdown (server.js) | 3h |
| **Subtotal Source** | | **19h** |
| **Configuration** | PM2 ecosystem config (ecosystem.config.js) | 2h |
| | Environment template (.env.example) | 1h |
| | Package.json updates (deps + scripts) | 1h |
| | Jest config update (coverage paths) | 0.5h |
| | Gitignore update (new exclusions) | 0.5h |
| **Subtotal Config** | | **5h** |
| **Testing** | Unit tests — config (219 lines, 28 tests) | 4h |
| | Unit tests — routes (130 lines, 10 tests) | 2.5h |
| | Unit tests — logger (174 lines, 21 tests) | 3.5h |
| | Unit tests — middleware (193 lines, 14 tests) | 4h |
| | Integration tests — endpoints (170 lines, 18 tests) | 3.5h |
| | Integration tests — health (60 lines, 6 tests) | 1.5h |
| | Lifecycle tests — server (298 lines, 8 tests) | 5h |
| **Subtotal Testing** | | **24h** |
| **Documentation** | README.md comprehensive update (654 lines) | 4h |
| **Subtotal Docs** | | **4h** |
| **Validation** | Bug fixes, debugging, validation iterations | 4h |
| **Subtotal Validation** | | **4h** |
| **TOTAL COMPLETED** | | **56h** |

### 3.2 Remaining Hours Calculation (12 hours)

| # | Task | Base Hours | Multiplier | Final Hours |
|---|------|-----------|------------|-------------|
| 1 | Resolve npm audit vulnerabilities (qs high, pm2 low) | 2h | 1.5× uncertainty | 3h |
| 2 | Create production .env with deployment values | 0.5h | 2× environment testing | 1h |
| 3 | Verify PM2 cluster mode in production environment | 2h | 1.5× infrastructure unknowns | 3h |
| 4 | Configure log rotation for production log files | 1h | 1.5× operational setup | 1.5h |
| 5 | Conduct code review of all 21 changed files | 3h | 1.15× compliance | 3.5h |
| | **TOTAL REMAINING** | | | **12h** |

### 3.3 Completion Calculation

- **Completed**: 56 hours
- **Remaining**: 12 hours
- **Total**: 56 + 12 = 68 hours
- **Completion**: 56 / 68 = **82.4%**

```mermaid
pie title Project Hours Breakdown
    "Completed Work" : 56
    "Remaining Work" : 12
```

---

## 4. Detailed Task Table for Human Developers

| # | Task | Description | Action Steps | Hours | Priority | Severity |
|---|------|-------------|-------------|-------|----------|----------|
| 1 | Resolve npm audit vulnerabilities | `qs` (high severity DoS via arrayLimit bypass) and `pm2` (low severity ReDoS) flagged by `npm audit` | 1. Run `npm audit` to confirm current status. 2. Run `npm audit fix` to resolve qs vulnerability. 3. For pm2 ReDoS (no fix available), evaluate risk acceptance or alternative process manager. 4. Re-run `npm audit` to confirm resolution. | 3h | High | High |
| 2 | Create production .env file | Application requires a `.env` file with real deployment values for production hosting | 1. Copy `.env.example` to `.env`. 2. Set `HOST=0.0.0.0` for production binding. 3. Set `PORT` to production port. 4. Set `NODE_ENV=production`. 5. Set `LOG_LEVEL=info` or `warn`. 6. Set `CORS_ORIGIN` to specific allowed origin(s). 7. Verify server starts with production config. | 1h | High | Medium |
| 3 | Verify PM2 cluster mode deployment | PM2 ecosystem config needs validation in the actual production/staging environment | 1. Run `npx pm2 start ecosystem.config.js --env production`. 2. Verify 2 cluster instances launch with `npx pm2 list`. 3. Test graceful restart with `npx pm2 reload hello_world`. 4. Verify log files created in `logs/` directory. 5. Test health endpoint returns OK from each instance. 6. Stop with `npx pm2 delete hello_world`. | 3h | Medium | Medium |
| 4 | Configure log rotation for production | Winston writes to `logs/error.log` and `logs/combined.log` indefinitely; rotation needed to prevent disk exhaustion | 1. Option A: Install `winston-daily-rotate-file` and update `src/utils/logger.js` transports. Option B: Configure OS-level logrotate for `logs/*.log`. 2. Set retention policy (e.g., 14 days or 100MB max). 3. Test rotation behavior under load. 4. Update README.md with log management instructions. | 1.5h | Medium | Low |
| 5 | Conduct code review of all changes | Human peer review required for all 21 changed files before production merge | 1. Review middleware pipeline order in `src/app.js` for security correctness. 2. Review error middleware for information leakage in edge cases. 3. Verify Winston logger config meets organizational logging standards. 4. Review test coverage for edge cases. 5. Verify graceful shutdown handlers in `server.js`. 6. Approve or request changes. | 3.5h | Medium | Medium |
| | **TOTAL REMAINING** | | | **12h** | | |

---

## 5. Development Guide

### 5.1 System Prerequisites

| Software | Required Version | Verification Command |
|----------|-----------------|---------------------|
| Node.js | >= 18.x (20.x LTS recommended) | `node --version` |
| npm | >= 8.x (10.x recommended) | `npm --version` |
| Git | Any recent version | `git --version` |

### 5.2 Environment Setup

```bash
# 1. Clone the repository and switch to the feature branch
git clone <repository-url>
cd hao-backprop-test
git checkout blitzy-2d7d60c6-1832-414f-ab5a-e98c69ea1211

# 2. Verify Node.js version
node --version
# Expected: v18.x.x or v20.x.x or higher
```

### 5.3 Dependency Installation

```bash
# Install all production and development dependencies
npm install
```

**Expected output**: All 9 packages installed (express, cors, dotenv, helmet, morgan, winston, jest, pm2, supertest) with no errors.

**Verify installation**:
```bash
npm ls --depth=0
```

Expected: All packages listed without `MISSING` or `INVALID` markers.

### 5.4 Environment Configuration

```bash
# Create environment file from template
cp .env.example .env

# Edit with your preferred values (defaults work for development)
# Supported variables:
#   HOST=127.0.0.1    (server binding address)
#   PORT=3000          (server port)
#   NODE_ENV=development  (environment: development, production, test)
#   LOG_LEVEL=info     (Winston level: error, warn, info, http, debug)
#   CORS_ORIGIN=*      (allowed CORS origin)
```

### 5.5 Running Tests

```bash
# Run all tests (non-interactive, CI mode)
CI=true npx jest --watchAll=false --ci --verbose

# Run tests with coverage report
npx jest --coverage

# Run specific test suite
npx jest tests/unit/logger.test.js
npx jest tests/integration/health.test.js
```

**Expected output**: 7 test suites, 105 tests passing. Coverage: 100% statements, 94.11% branches, 100% functions, 100% lines.

### 5.6 Application Startup

```bash
# Development mode
npm start
# or
npm run start:dev

# Expected output:
# info: Server running at http://127.0.0.1:3000/
```

### 5.7 Verification Steps

Once the server is running, verify all endpoints:

```bash
# Test root endpoint (should return "Hello, World!\n")
curl -s http://127.0.0.1:3000/

# Test evening endpoint (should return "Good evening")
curl -s http://127.0.0.1:3000/evening

# Test health endpoint (should return JSON with status, uptime, timestamp)
curl -s http://127.0.0.1:3000/health

# Test 404 handling (should return JSON error)
curl -s http://127.0.0.1:3000/nonexistent

# Verify security headers
curl -sI http://127.0.0.1:3000/ | grep -E "(Content-Security|X-Frame|Strict-Transport|Access-Control)"
```

### 5.8 PM2 Production Deployment

```bash
# Start with PM2 in production mode (cluster with 2 instances)
npm run start:prod
# or directly:
npx pm2 start ecosystem.config.js --env production

# Monitor processes
npx pm2 list
npx pm2 monit

# View logs
npx pm2 logs hello_world

# Graceful restart
npx pm2 reload hello_world

# Stop all instances
npx pm2 delete hello_world
```

### 5.9 Project Structure

```
hao-backprop-test/
├── server.js                          # HTTP server entry point (Winston logger, graceful shutdown)
├── ecosystem.config.js                # PM2 cluster mode configuration
├── package.json                       # Dependencies and scripts
├── jest.config.js                     # Test configuration with coverage thresholds
├── .env.example                       # Environment variable template
├── .gitignore                         # Git exclusions (.env, logs/, PM2 files)
├── README.md                          # Comprehensive project documentation
├── src/
│   ├── app.js                         # Express app factory with middleware pipeline
│   ├── config/
│   │   └── index.js                   # dotenv-based configuration (host, port, env, logLevel, corsOrigin)
│   ├── middleware/
│   │   ├── morgan.middleware.js       # Morgan HTTP logger → Winston stream
│   │   └── error.middleware.js        # 404 handler + centralized error handler
│   ├── routes/
│   │   ├── index.js                   # Route aggregator (barrel export)
│   │   ├── main.routes.js             # GET /, GET /evening
│   │   └── health.routes.js           # GET /health
│   └── utils/
│       └── logger.js                  # Winston logger (console + file transports)
├── tests/
│   ├── unit/
│   │   ├── config.test.js             # Config module tests (28 tests)
│   │   ├── routes.test.js             # Route structure tests (10 tests)
│   │   ├── logger.test.js             # Logger utility tests (21 tests)
│   │   └── middleware.test.js         # Middleware tests (14 tests)
│   ├── integration/
│   │   ├── endpoints.test.js          # HTTP endpoint + middleware tests (18 tests)
│   │   └── health.test.js             # Health endpoint tests (6 tests)
│   └── lifecycle/
│       └── server.test.js             # Server startup/shutdown tests (8 tests)
└── logs/                              # Winston log output (gitignored)
    ├── error.log
    └── combined.log
```

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk | Severity | Likelihood | Impact | Mitigation |
|------|----------|-----------|--------|------------|
| `qs` dependency DoS vulnerability (high severity) | High | Medium | Service degradation under attack | Run `npm audit fix`; monitor Express team for upstream fix |
| `pm2` ReDoS vulnerability (low severity) | Low | Low | Minor process manager impact | Accept risk for dev dependency; evaluate alternatives for production |
| Winston file transports may fill disk without rotation | Medium | High | Disk exhaustion in production | Configure log rotation (Task #4 in task table) |
| Express 5.x is relatively new; middleware compatibility edge cases | Low | Low | Potential middleware misbehavior | All middleware tested and verified; 105 tests provide regression safety |

### 6.2 Security Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| CORS set to `*` (allow all) by default | Medium | Set `CORS_ORIGIN` to specific domain(s) in production .env |
| Stack traces exposed in non-production error responses | Low | Error middleware already suppresses stack in production mode |
| `.env` file could be accidentally committed | Low | `.gitignore` includes `.env`; `.env.example` serves as safe template |

### 6.3 Operational Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No log rotation configured | Medium | Implement winston-daily-rotate-file or OS logrotate (Task #4) |
| PM2 cluster mode untested in target environment | Medium | Verify in staging before production deployment (Task #3) |
| No external monitoring or alerting integration | Low | Out of scope per Agent Action Plan; health endpoint available for integration |

### 6.4 Integration Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No CI/CD pipeline configured | Medium | Out of scope; test commands documented for pipeline integration |
| No containerization (Docker) | Low | Out of scope; PM2 serves as process manager per requirements |
| No reverse proxy configuration | Low | Application expects TLS termination at proxy layer; documented in README |

---

## 7. Git Change Summary

- **Branch**: `blitzy-2d7d60c6-1832-414f-ab5a-e98c69ea1211`
- **Commits**: 78 total (18 implementation-specific)
- **Files changed**: 22 source files (excluding package-lock.json and blitzy docs)
- **Lines added**: 2,600
- **Lines removed**: 13
- **Working tree**: Clean, all changes committed

### Files Implemented (21 in-scope)

| File | Action | Lines |
|------|--------|-------|
| src/app.js | Updated | 96 |
| src/config/index.js | Updated | 59 |
| src/utils/logger.js | Created | 76 |
| src/middleware/morgan.middleware.js | Created | 38 |
| src/middleware/error.middleware.js | Created | 75 |
| src/routes/health.routes.js | Created | 37 |
| src/routes/index.js | Updated | 22 |
| server.js | Updated | 90 |
| ecosystem.config.js | Created | 70 |
| .env.example | Created | 53 |
| package.json | Updated | 19 changes |
| jest.config.js | Updated | 29 |
| .gitignore | Updated | 29 |
| README.md | Updated | 654 |
| tests/unit/config.test.js | Updated | 219 |
| tests/unit/routes.test.js | Updated | 130 |
| tests/unit/logger.test.js | Created | 174 |
| tests/unit/middleware.test.js | Created | 193 |
| tests/integration/endpoints.test.js | Updated | 170 |
| tests/integration/health.test.js | Created | 60 |
| tests/lifecycle/server.test.js | Updated | 298 |
