# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

### 0.1.1 Core Refactoring Objective

Based on the prompt, the Blitzy platform understands that the refactoring objective is to **ensure the Node.js server is properly structured using Express.js patterns** while keeping every feature and functionality exactly as in the original implementation. 

**Critical Observation**: Upon comprehensive analysis of the repository, the Blitzy platform has identified that **the project is already built with Express.js 5.1.0**. The current implementation follows modern Express.js best practices including:

- Factory pattern in `src/app.js` for application instantiation
- Barrel pattern in `src/routes/index.js` for route aggregation  
- Twelve-Factor App methodology in `src/config/index.js` for configuration
- Separation of concerns between server binding (`server.js`) and application logic (`src/app.js`)

| Attribute | Assessment |
|-----------|------------|
| **Refactoring Type** | Code structure validation and documentation |
| **Target Repository** | Same repository (in-place validation) |
| **Framework Migration** | Not required - Express.js ^5.1.0 already implemented |
| **Architecture Status** | Modular Express.js architecture already in place |

**Interpreted Refactoring Goals:**

- Validate that the Express.js implementation is complete and correct
- Ensure all original functionality is preserved (GET `/`, GET `/evening`)
- Confirm the modular architecture follows best practices
- Document the existing Express.js patterns for maintainability

### 0.1.2 Implicit Requirements

The platform has surfaced the following implicit requirements that must be maintained:

| Implicit Requirement | Description | Verification Method |
|---------------------|-------------|---------------------|
| API Backward Compatibility | All existing endpoints must return identical responses | Endpoint testing with exact response validation |
| Response Fidelity | Exact response strings including whitespace characters | `GET /` returns `'Hello, World!\n'` (with newline), `GET /evening` returns `'Good evening'` (no newline) |
| Configuration Compatibility | Environment variable behavior must be preserved | HOST, PORT, NODE_ENV overrides function identically |
| Module Export Contracts | All module.exports shapes must remain unchanged | `app`, `{ host, port, env }`, `{ mainRoutes }`, `router` |
| CommonJS Module Format | Must continue using `require`/`module.exports` | No ESM migration |
| Default Binding | Server binds to `127.0.0.1:3000` by default | Startup log verification |

### 0.1.3 Special Instructions and Constraints

**User Example (Preserved Exactly):**
> "Rewrite this Node.js server into a express.js refactor, keeping every feature and functionality exactly as in the original Node.js project. Ensure the rewritten version fully matches the behavior and logic of the current implementation."

**Critical Constraints:**

- **Preserve All Public Interfaces**: The Express.js application export, configuration export, and route exports must maintain their exact shapes
- **Exact Response Preservation**: Response strings must match character-for-character, including trailing whitespace
- **No Behavioral Changes**: The server startup, request handling, and response generation must function identically
- **CommonJS Retention**: Continue using Node.js CommonJS module system (`require`/`module.exports`)

### 0.1.4 Technical Interpretation

This refactoring translates to the following technical validation strategy:

**Current Architecture (Already Express.js):**

```
Request Flow:
Client → server.js → Express App (src/app.js) → Router (src/routes/) → Response
                            ↑
                      Configuration
                    (src/config/index.js)
```

**Design Patterns Already Implemented:**

| Pattern | Location | Implementation Status |
|---------|----------|----------------------|
| Factory Pattern | `src/app.js` | ✅ Express app created without server binding |
| Barrel Pattern | `src/routes/index.js` | ✅ Centralized route exports |
| Twelve-Factor App | `src/config/index.js` | ✅ Environment variable configuration |
| Separation of Concerns | `server.js` vs `src/app.js` | ✅ Server binding separated from app logic |

**Transformation Rules:**
Since the project already implements Express.js correctly, the transformation approach is validation-focused:

- **UPDATE Mode**: Review and validate existing files for correctness
- **No CREATE Mode Required**: No new files need to be created
- **REFERENCE Mode**: Use existing patterns as reference for documentation

## 0.2 Source Analysis

### 0.2.1 Comprehensive Source File Discovery

The following search patterns were used to identify ALL files in the Express.js implementation:

**Discovery Patterns Applied:**
- Root level files: `*.js`, `*.json`, `*.md`
- Source directory: `src/**/*.js`
- Configuration: `src/config/*.js`
- Routes: `src/routes/*.js`

**Current Structure Mapping:**

```
hello_world/
├── .gitignore                          # Git ignore patterns (22 lines)
├── README.md                           # Project documentation (264 lines)
├── package.json                        # npm manifest with express ^5.1.0
├── package-lock.json                   # Dependency lockfile (deterministic builds)
├── server.js                           # Entry point - HTTP server binding (66 lines)
└── src/                                # Application source root
    ├── app.js                          # Express application factory (28 lines)
    ├── config/                         # Configuration module
    │   └── index.js                    # Environment variable management (42 lines)
    └── routes/                         # Routing surface
        ├── index.js                    # Route aggregator barrel (20 lines)
        └── main.routes.js              # Route handlers (42 lines)
```

### 0.2.2 Complete Source File Inventory

| File Path | Purpose | Lines | Module Export | Key API Usage |
|-----------|---------|-------|---------------|---------------|
| `server.js` | Entry point, HTTP server binding | 66 | N/A (entry point) | `app.listen(config.port, config.host, callback)` |
| `src/app.js` | Express application factory | 28 | `module.exports = app` | `express()`, `app.use('/', mainRoutes)` |
| `src/config/index.js` | Configuration management | 42 | `module.exports = { host, port, env }` | `process.env.*`, `parseInt()` |
| `src/routes/index.js` | Route aggregator (barrel) | 20 | `module.exports = { mainRoutes }` | `require('./main.routes')` |
| `src/routes/main.routes.js` | Route handlers | 42 | `module.exports = router` | `express.Router()`, `router.get()`, `res.send()` |
| `package.json` | npm manifest | 15 | N/A (JSON) | Scripts, dependencies |
| `package-lock.json` | Dependency lockfile | N/A | N/A (JSON) | Resolved versions, integrity hashes |
| `README.md` | Project documentation | 264 | N/A (Markdown) | Installation, API reference |
| `.gitignore` | Git ignore patterns | 22 | N/A | Exclude patterns |

### 0.2.3 Source File Details

**server.js (Entry Point):**
- Imports: `./src/app`, `./src/config`
- API: `app.listen(config.port, config.host, callback)`
- Output: Console log `"Server running at http://{host}:{port}/"`
- Design: Separates HTTP binding from application configuration

**src/app.js (Application Factory):**
- Imports: `express`, `./routes`
- API: `express()`, `app.use('/', mainRoutes)`
- Export: Configured Express Application instance
- Design: Factory pattern for testability

**src/config/index.js (Configuration):**
- Environment Variables: `HOST`, `PORT`, `NODE_ENV`
- Defaults: `'127.0.0.1'`, `3000`, `'development'`
- Export Shape: `{ host: string, port: number, env: string }`
- Design: Twelve-Factor App methodology

**src/routes/index.js (Route Aggregator):**
- Imports: `./main.routes`
- Export Shape: `{ mainRoutes }`
- Design: Barrel pattern for clean imports

**src/routes/main.routes.js (Route Handlers):**
- Imports: `express`
- API: `express.Router()`, `router.get(path, handler)`
- Endpoints: `GET /` → `'Hello, World!\n'`, `GET /evening` → `'Good evening'`
- Export: Express Router instance

### 0.2.4 Express.js API Usage Patterns

| Express API | File | Usage Pattern |
|-------------|------|---------------|
| `express()` | `src/app.js:17` | Application instantiation |
| `express.Router()` | `src/routes/main.routes.js:17` | Router creation |
| `app.use()` | `src/app.js:25` | Middleware/route mounting |
| `router.get()` | `src/routes/main.routes.js:26,37` | GET endpoint registration |
| `res.send()` | `src/routes/main.routes.js:27,38` | Response transmission |
| `app.listen()` | `server.js:62` | HTTP server binding |

### 0.2.5 Excluded Patterns (Not in Scope)

| Pattern | Location | Rationale |
|---------|----------|-----------|
| `node_modules/**/*` | Root | External dependencies (npm managed) |
| `blitzy/**/*` | Root | Documentation artifacts only |
| `.git/**/*` | Root | Git internal files |
| `*.log` | Any | Runtime log files |
| `.env`, `.env.local` | Root | Environment secrets |
| `.vscode/`, `.idea/` | Root | IDE configuration |

## 0.3 Target Design

### 0.3.1 Refactored Structure Planning

Since the project already implements Express.js with a proper modular architecture, the target structure remains **identical to the current structure**. The refactoring objective is **validation and preservation** rather than transformation.

**Target Architecture (Current = Target):**

```
hello_world/
├── .gitignore                          # Unchanged - Git ignore patterns
├── README.md                           # Unchanged - Project documentation
├── package.json                        # Unchanged - express ^5.1.0 declared
├── package-lock.json                   # Unchanged - Deterministic dependency lockfile
├── server.js                           # Unchanged - Entry point with app.listen()
└── src/                                # Application source root
    ├── app.js                          # Unchanged - Express application factory
    ├── config/                         # Configuration module directory
    │   └── index.js                    # Unchanged - Environment configuration
    └── routes/                         # Routing surface
        ├── index.js                    # Unchanged - Route aggregator barrel
        └── main.routes.js              # Unchanged - Route handlers
```

**Architecture Compliance Status:**

| Architectural Pattern | Expected | Actual | Status |
|----------------------|----------|--------|--------|
| Entry Point Separation | `server.js` separate from app | `server.js` imports `src/app.js` | ✅ Compliant |
| Application Factory | `src/app.js` exports configured app | `module.exports = app` | ✅ Compliant |
| Route Modularization | Routes in dedicated directory | `src/routes/*.js` | ✅ Compliant |
| Barrel Pattern | Single import point for routes | `src/routes/index.js` exports `{ mainRoutes }` | ✅ Compliant |
| Configuration Externalization | Env vars with defaults | `src/config/index.js` | ✅ Compliant |
| CommonJS Modules | `require`/`module.exports` | All files use CommonJS | ✅ Compliant |

### 0.3.2 Web Search Research Conducted

Best practices research confirms the current implementation follows Express.js conventions:

**Modular Architecture Best Practices:**
- Separate `server.js` from `app.js` to enable unit testing without HTTP binding
- Use `express.Router()` to modularize routes
- Centralize configuration in a dedicated module
- Apply the barrel pattern for clean imports

**Express.js 5.x Specific Patterns:**
- Express 5.1.0 maintains backward compatibility with Express 4.x patterns
- `app.listen()` and `express.Router()` APIs remain unchanged
- `res.send()` continues to be the standard response method

**Twelve-Factor App Alignment:**
- Configuration through environment variables (HOST, PORT, NODE_ENV)
- Sensible defaults for development environment
- No hardcoded values in source code

### 0.3.3 Design Pattern Applications

The following design patterns are already correctly implemented in the target:

**Factory Pattern (src/app.js):**
```javascript
const app = express();
app.use('/', mainRoutes);
module.exports = app;  // Export configured app, don't start server
```
- Purpose: Enables importing the app for testing without starting the HTTP server
- Consumer: `server.js` imports and calls `app.listen()`

**Barrel Pattern (src/routes/index.js):**
```javascript
const mainRoutes = require('./main.routes');
module.exports = { mainRoutes };
```
- Purpose: Single import point for all routes
- Consumer: `src/app.js` destructures `{ mainRoutes }`

**Router Pattern (src/routes/main.routes.js):**
```javascript
const router = express.Router();
router.get('/', (req, res) => { ... });
module.exports = router;
```
- Purpose: Encapsulates related routes in a modular unit
- Consumer: Mounted via `app.use('/', mainRoutes)`

**Configuration Object Pattern (src/config/index.js):**
```javascript
module.exports = {
  host: process.env.HOST || '127.0.0.1',
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development'
};
```
- Purpose: Centralized, externalized configuration
- Consumer: `server.js` uses `config.port` and `config.host`

### 0.3.4 File-Level Design Decisions

| File | Design Decision | Rationale |
|------|-----------------|-----------|
| `server.js` | Entry point only | Separation of concerns; app can be imported for testing |
| `src/app.js` | No `app.listen()` call | Factory pattern; enables multiple consumers |
| `src/config/index.js` | Synchronous export | Simple, predictable module loading |
| `src/routes/index.js` | Named export `{ mainRoutes }` | Explicit, discoverable API |
| `src/routes/main.routes.js` | Default export (router) | Standard Express.js Router pattern |

### 0.3.5 Endpoint Contract Preservation

| Endpoint | Method | Response | Content-Type | Status |
|----------|--------|----------|--------------|--------|
| `/` | GET | `'Hello, World!\n'` (14 chars, includes `\n`) | `text/html; charset=utf-8` | 200 OK |
| `/evening` | GET | `'Good evening'` (12 chars, no `\n`) | `text/html; charset=utf-8` | 200 OK |

**Response Verification Commands:**
```bash
# Root endpoint with exact response
curl -s http://127.0.0.1:3000/
# Expected: Hello, World!

#### Evening endpoint with exact response
curl -s http://127.0.0.1:3000/evening
#### Expected: Good evening
```

## 0.4 Transformation Mapping

### 0.4.1 File-by-File Transformation Plan

Since the project already implements Express.js correctly, the transformation mode is **UPDATE (validation)** for all files. No files require creation or major structural changes.

| Target File | Transformation | Source File | Key Changes |
|-------------|---------------|-------------|-------------|
| `server.js` | UPDATE | `server.js` | Validate entry point logic, ensure `app.listen()` with correct parameters |
| `src/app.js` | UPDATE | `src/app.js` | Validate Express application factory pattern, confirm route mounting |
| `src/config/index.js` | UPDATE | `src/config/index.js` | Validate environment variable handling, confirm defaults |
| `src/routes/index.js` | UPDATE | `src/routes/index.js` | Validate barrel pattern export, confirm `{ mainRoutes }` shape |
| `src/routes/main.routes.js` | UPDATE | `src/routes/main.routes.js` | Validate router creation, confirm exact response strings |
| `package.json` | UPDATE | `package.json` | Validate express ^5.1.0 dependency declaration |
| `package-lock.json` | UPDATE | `package-lock.json` | Validate resolved express@5.1.0 and transitive dependencies |
| `README.md` | UPDATE | `README.md` | Validate documentation accuracy against implementation |
| `.gitignore` | UPDATE | `.gitignore` | Validate ignore patterns include node_modules, .env, logs |

### 0.4.2 Detailed File Transformation Specifications

**server.js - Entry Point Validation:**
- Verify `require('./src/app')` imports the Express application
- Verify `require('./src/config')` imports the configuration object
- Verify `app.listen(config.port, config.host, callback)` binds correctly
- Verify callback logs `Server running at http://${config.host}:${config.port}/`

**src/app.js - Application Factory Validation:**
- Verify `require('express')` imports Express framework
- Verify `require('./routes')` destructures `{ mainRoutes }`
- Verify `app = express()` creates application instance
- Verify `app.use('/', mainRoutes)` mounts routes at root path
- Verify `module.exports = app` exports the configured application

**src/config/index.js - Configuration Validation:**
- Verify `host` defaults to `'127.0.0.1'` when `process.env.HOST` undefined
- Verify `port` defaults to `3000` when `process.env.PORT` undefined
- Verify `port` uses `parseInt(process.env.PORT, 10)` for type coercion
- Verify `env` defaults to `'development'` when `process.env.NODE_ENV` undefined
- Verify export shape is `{ host, port, env }`

**src/routes/index.js - Barrel Pattern Validation:**
- Verify `require('./main.routes')` imports the router
- Verify `module.exports = { mainRoutes }` provides named export

**src/routes/main.routes.js - Route Handler Validation:**
- Verify `require('express')` imports Express
- Verify `router = express.Router()` creates router instance
- Verify `router.get('/', handler)` registers root endpoint
- Verify root handler responds with `'Hello, World!\n'` (exact string with newline)
- Verify `router.get('/evening', handler)` registers evening endpoint
- Verify evening handler responds with `'Good evening'` (exact string without newline)
- Verify `module.exports = router` exports the router instance

### 0.4.3 Cross-File Dependencies

**Import Statement Map:**

| Consumer File | Import Statement | Provider File | Exported Shape |
|---------------|------------------|---------------|----------------|
| `server.js` | `require('./src/app')` | `src/app.js` | Express Application |
| `server.js` | `require('./src/config')` | `src/config/index.js` | `{ host, port, env }` |
| `src/app.js` | `require('express')` | `node_modules/express` | Express module |
| `src/app.js` | `require('./routes')` | `src/routes/index.js` | `{ mainRoutes }` |
| `src/routes/index.js` | `require('./main.routes')` | `src/routes/main.routes.js` | Router instance |
| `src/routes/main.routes.js` | `require('express')` | `node_modules/express` | Express module |

**Dependency Graph:**

```mermaid
flowchart TD
    subgraph Entry["Entry Layer"]
        SERVER[server.js]
    end
    
    subgraph Application["Application Layer"]
        APP[src/app.js]
        CONFIG[src/config/index.js]
    end
    
    subgraph Routes["Routing Layer"]
        BARREL[src/routes/index.js]
        MAIN[src/routes/main.routes.js]
    end
    
    subgraph External["External Dependencies"]
        EXPRESS[express@5.1.0]
    end
    
    SERVER -->|require| APP
    SERVER -->|require| CONFIG
    APP -->|require| EXPRESS
    APP -->|destructure mainRoutes| BARREL
    BARREL -->|require| MAIN
    MAIN -->|require| EXPRESS
```

### 0.4.4 Configuration Update Validation

**Environment Variable Handling:**

| Variable | File | Default | Type Coercion |
|----------|------|---------|---------------|
| `HOST` | `src/config/index.js` | `'127.0.0.1'` | None (string) |
| `PORT` | `src/config/index.js` | `3000` | `parseInt(value, 10)` |
| `NODE_ENV` | `src/config/index.js` | `'development'` | None (string) |

### 0.4.5 Wildcard Patterns (In Scope)

All files in scope use specific paths rather than wildcards due to the small, well-defined project structure:

| Pattern | Matched Files | Scope |
|---------|---------------|-------|
| `src/**/*.js` | `src/app.js`, `src/config/index.js`, `src/routes/index.js`, `src/routes/main.routes.js` | In Scope |
| `*.js` (root) | `server.js` | In Scope |
| `*.json` (root) | `package.json`, `package-lock.json` | In Scope |
| `*.md` (root) | `README.md` | In Scope |

### 0.4.6 One-Phase Execution

**CRITICAL**: The entire validation will be executed by Blitzy in **ONE phase**. All files are included in a single validation pass:

**Phase 1 - Complete Validation:**
- `server.js` - Entry point validation
- `src/app.js` - Application factory validation
- `src/config/index.js` - Configuration validation
- `src/routes/index.js` - Barrel pattern validation
- `src/routes/main.routes.js` - Route handler validation
- `package.json` - Dependency declaration validation
- `package-lock.json` - Lockfile integrity validation
- `README.md` - Documentation accuracy validation
- `.gitignore` - Ignore pattern validation

No multi-phase splitting is required as the project scope is contained and all files can be processed together.

## 0.5 Dependency Inventory

### 0.5.1 Key Private and Public Packages

**Runtime Dependencies (from package.json):**

| Registry | Package Name | Declared Version | Resolved Version | Purpose |
|----------|--------------|------------------|------------------|---------|
| npm | `express` | `^5.1.0` | `5.1.0` | Web framework providing HTTP handling, routing, and middleware |

**Transitive Dependencies (from package-lock.json - Express 5.1.0):**

Express 5.1.0 brings 67 transitive dependencies. Key transitive packages include:

| Package | Version | Purpose |
|---------|---------|---------|
| `router` | 2.2.0 | Express routing engine |
| `body-parser` | 2.2.0 | Request body parsing middleware |
| `content-disposition` | 1.0.0 | Content-Disposition header handling |
| `cookie` | 0.7.2 | Cookie parsing |
| `debug` | 4.4.0 | Debug logging utility |
| `depd` | 2.0.0 | Deprecation warnings |
| `encodeurl` | 2.0.0 | URL encoding |
| `escape-html` | 1.0.3 | HTML escaping |
| `etag` | 1.8.1 | ETag generation |
| `finalhandler` | 2.1.0 | Final request handler |
| `fresh` | 2.0.0 | HTTP response freshness checking |
| `http-errors` | 2.0.0 | HTTP error creation |
| `merge-descriptors` | 2.0.0 | Object descriptor merging |
| `mime-types` | 3.0.1 | MIME type handling |
| `on-finished` | 2.4.1 | Request finish detection |
| `parseurl` | 1.3.3 | URL parsing |
| `qs` | 6.14.0 | Query string parsing |
| `safe-buffer` | 5.2.1 | Buffer safety utilities |
| `send` | 1.2.0 | Static file serving |
| `serve-static` | 2.2.0 | Static file middleware |
| `statuses` | 2.0.1 | HTTP status codes |
| `type-is` | 2.0.1 | Content-Type checking |
| `vary` | 1.1.2 | Vary header handling |

### 0.5.2 Development Dependencies

The project currently declares **no development dependencies** in `package.json`. The following are recommended for future enhancement:

| Package | Recommended Version | Purpose | Status |
|---------|---------------------|---------|--------|
| `jest` | `^29.7.0` | Testing framework | Not installed (recommended) |
| `supertest` | `^6.3.4` | HTTP assertion library | Not installed (recommended) |
| `eslint` | `^8.57.0` | Code linting | Not installed (recommended) |

### 0.5.3 Node.js Runtime Requirements

| Requirement | Minimum Version | Recommended Version | Rationale |
|-------------|-----------------|---------------------|-----------|
| Node.js | 18.x | 20.19.x LTS | Express 5.x compatibility, LTS support |
| npm | 8.x | 10.8.x | Package management, lockfile v3 support |

**Version Verification Commands:**
```bash
# Verify Node.js version
node --version
# Expected: v20.x.x or higher

#### Verify npm version
npm --version
#### Expected: 10.x.x or higher

#### Verify Express installation
npm ls express
#### Expected: express@5.1.0
```

### 0.5.4 Dependency Updates (Validation Focus)

Since this is a validation refactor, no dependency updates are required. The focus is on verifying correct usage:

**Import Validation Patterns:**

| File Pattern | Expected Import | Validation |
|--------------|-----------------|------------|
| `src/app.js` | `require('express')` | Express module import |
| `src/app.js` | `require('./routes')` | Routes barrel import with destructuring |
| `src/routes/main.routes.js` | `require('express')` | Express module for Router |
| `src/routes/index.js` | `require('./main.routes')` | Main routes import |
| `server.js` | `require('./src/app')` | Application factory import |
| `server.js` | `require('./src/config')` | Configuration import |

### 0.5.5 Package.json Script Validation

| Script | Command | Purpose | Status |
|--------|---------|---------|--------|
| `start` | `node server.js` | Start the HTTP server | ✅ Correct |
| `test` | `echo "Error: no test specified" && exit 1` | Placeholder test script | ⚠️ No tests implemented |

### 0.5.6 External Reference Updates

The following files may reference Express.js patterns and should be validated for accuracy:

| File Type | Pattern | Validation Focus |
|-----------|---------|------------------|
| `README.md` | Documentation | Express version references, API examples |
| `package.json` | Manifest | Dependency declaration accuracy |
| `package-lock.json` | Lockfile | Resolved versions, integrity hashes |

### 0.5.7 Dependency Installation Verification

**Installation Commands:**
```bash
# Clean install from lockfile (CI/CD)
npm ci

#### Standard install (development)
npm install

#### Audit for vulnerabilities
npm audit
```

**Expected Installation Output:**
- 67 packages installed (Express + transitive dependencies)
- No security vulnerabilities
- Lockfile integrity verified

## 0.6 Scope Boundaries

### 0.6.1 Exhaustively In Scope

**Source File Validations (with trailing patterns):**

| Pattern | Matched Files | Validation Focus |
|---------|---------------|------------------|
| `server.js` | Entry point | `app.listen()` binding, config usage, startup logging |
| `src/app.js` | Application factory | Express instantiation, route mounting, module export |
| `src/config/*.js` | `src/config/index.js` | Environment variable handling, defaults, export shape |
| `src/routes/*.js` | `src/routes/index.js`, `src/routes/main.routes.js` | Barrel pattern, Router creation, endpoint handlers |

**Configuration File Validations:**

| Pattern | Matched Files | Validation Focus |
|---------|---------------|------------------|
| `package.json` | npm manifest | Express ^5.1.0 declaration, scripts, metadata |
| `package-lock.json` | Dependency lockfile | Resolved versions, integrity hashes |
| `.gitignore` | Git ignore patterns | node_modules/, .env, logs exclusions |

**Documentation Validations:**

| Pattern | Matched Files | Validation Focus |
|---------|---------------|------------------|
| `README.md` | Project documentation | Installation instructions, API reference accuracy |

**Endpoint Validations:**

| Endpoint | Method | Expected Response | Content-Type |
|----------|--------|-------------------|--------------|
| `/` | GET | `'Hello, World!\n'` | `text/html; charset=utf-8` |
| `/evening` | GET | `'Good evening'` | `text/html; charset=utf-8` |

**Module Export Contract Validations:**

| Module | Export Shape | Consumer |
|--------|--------------|----------|
| `src/app.js` | `module.exports = app` (Express Application) | `server.js` |
| `src/config/index.js` | `module.exports = { host, port, env }` | `server.js` |
| `src/routes/index.js` | `module.exports = { mainRoutes }` | `src/app.js` |
| `src/routes/main.routes.js` | `module.exports = router` (Express Router) | `src/routes/index.js` |

**Environment Variable Validations:**

| Variable | Default Value | Type | Consumer |
|----------|---------------|------|----------|
| `HOST` | `'127.0.0.1'` | string | `src/config/index.js` |
| `PORT` | `3000` | number | `src/config/index.js` |
| `NODE_ENV` | `'development'` | string | `src/config/index.js` |

### 0.6.2 Explicitly Out of Scope

**Excluded by User Request:**

| Exclusion | Rationale |
|-----------|-----------|
| New endpoint creation | User requires "keeping every feature and functionality exactly as in the original" |
| Behavioral changes | User requires "fully matches the behavior and logic of the current implementation" |
| Architecture modification | Current Express.js architecture is already correct |

**Excluded by Project Constraints:**

| Exclusion | Rationale |
|-----------|-----------|
| ES Modules migration | CommonJS specified for compatibility |
| TypeScript conversion | JavaScript specified |
| Additional HTTP methods (POST, PUT, DELETE) | Not specified in original implementation |
| Database integration | Not present in original implementation |
| Authentication/Authorization | Not present in original implementation |
| Additional middleware | Not present in original implementation |
| WebSocket support | Not present in original implementation |
| Static file serving | Not present in original implementation |
| Template rendering | Plain text responses only in original |

**Excluded File Patterns:**

| Pattern | Rationale |
|---------|-----------|
| `node_modules/**/*` | External dependencies managed by npm |
| `blitzy/**/*` | Documentation artifacts only, not runtime code |
| `.git/**/*` | Git internal files |
| `*.log` | Runtime log files |
| `.env`, `.env.local` | Environment-specific secrets |
| `.vscode/**/*`, `.idea/**/*` | IDE configuration files |
| `*.swp`, `*.swo` | Editor swap files |

**Excluded Enhancements:**

| Enhancement | Rationale |
|-------------|-----------|
| Unit tests with Jest | Enhancement for future iteration |
| CI/CD pipeline | Enhancement for future iteration |
| Security middleware (helmet) | Enhancement for future iteration |
| Error handling middleware | Enhancement for future iteration |
| Logging middleware | Enhancement for future iteration |
| Response caching | Not needed for simple greeting responses |
| Compression middleware | Not needed for small text responses |
| Clustering/load balancing | Out of scope for tutorial project |
| Rate limiting | Enhancement for future iteration |

### 0.6.3 Boundary Validation Matrix

| Category | In Scope | Out of Scope |
|----------|----------|--------------|
| **Files** | `server.js`, `src/**/*.js`, `package.json`, `package-lock.json`, `README.md`, `.gitignore` | `node_modules/**`, `blitzy/**`, `.git/**`, `*.log`, `.env*` |
| **Endpoints** | `GET /`, `GET /evening` | Any new endpoints |
| **Responses** | Exact string preservation | Response modifications |
| **Configuration** | HOST, PORT, NODE_ENV | Additional env vars |
| **Dependencies** | `express ^5.1.0` | New dependencies |
| **Architecture** | Current modular structure | Architecture changes |
| **Module System** | CommonJS | ES Modules |
| **Language** | JavaScript | TypeScript |

### 0.6.4 Scope Verification Checklist

| Verification | Command/Check | Expected Result |
|--------------|---------------|-----------------|
| Server starts | `npm start` | "Server running at http://127.0.0.1:3000/" |
| Root endpoint | `curl -s http://127.0.0.1:3000/` | "Hello, World!" (with newline) |
| Evening endpoint | `curl -s http://127.0.0.1:3000/evening` | "Good evening" (no newline) |
| Express version | `npm ls express` | `express@5.1.0` |
| No vulnerabilities | `npm audit` | 0 vulnerabilities |
| Config defaults | Start without env vars | Binds to 127.0.0.1:3000 |
| Config override | `PORT=8080 npm start` | Binds to 127.0.0.1:8080 |

## 0.7 Special Instructions for Refactoring

### 0.7.1 User-Specified Requirements (Preserved Exactly)

**Original User Request:**
> "Rewrite this Node.js server into a express.js refactor, keeping every feature and functionality exactly as in the original Node.js project. Ensure the rewritten version fully matches the behavior and logic of the current implementation."

### 0.7.2 Refactoring-Specific Constraints

Based on the user's explicit requirements, the following constraints must be strictly enforced:

**Behavioral Preservation:**

| Constraint | Requirement | Validation |
|------------|-------------|------------|
| Response Fidelity | Exact string preservation including whitespace | `GET /` returns `'Hello, World!\n'`, `GET /evening` returns `'Good evening'` |
| Status Codes | HTTP 200 OK for successful requests | Response status code validation |
| Content-Type | `text/html; charset=utf-8` (Express default) | Header verification |
| Configuration | Environment variable behavior unchanged | HOST, PORT, NODE_ENV override testing |
| Startup | Identical startup behavior and logging | Console output verification |

**Architectural Preservation:**

| Constraint | Requirement | Current Implementation |
|------------|-------------|------------------------|
| Module System | CommonJS (`require`/`module.exports`) | Already implemented correctly |
| Application Factory | App creation separated from server binding | `src/app.js` exports configured app |
| Route Modularity | Routes in dedicated directory with barrel | `src/routes/index.js` and `src/routes/main.routes.js` |
| Configuration Centralization | Config in dedicated module with defaults | `src/config/index.js` |

**Export Shape Contracts:**

| Module | Required Export Shape | Must Not Change |
|--------|----------------------|-----------------|
| `src/app.js` | `module.exports = app` | Export type (Express Application) |
| `src/config/index.js` | `module.exports = { host, port, env }` | Property names, value types |
| `src/routes/index.js` | `module.exports = { mainRoutes }` | Property name `mainRoutes` |
| `src/routes/main.routes.js` | `module.exports = router` | Export type (Express Router) |

### 0.7.3 Design Pattern Compliance

The following patterns must be maintained as implemented:

**Factory Pattern (src/app.js):**
- Express application is created and configured
- Routes are mounted via `app.use()`
- Application is exported without calling `listen()`
- Server binding responsibility is in `server.js`

**Barrel Pattern (src/routes/index.js):**
- Aggregates route exports into single import point
- Uses named exports for discoverability
- Enables future route additions without modifying consumers

**Twelve-Factor App (src/config/index.js):**
- Configuration read from environment at startup
- Sensible defaults for development
- No configuration in code (externalized)

### 0.7.4 Testing Requirements

While no tests are currently implemented, any future tests must validate:

| Test Category | Validation Target | Example Assertion |
|---------------|-------------------|-------------------|
| Unit - Config | Default values | `expect(config.port).toBe(3000)` |
| Unit - Config | Environment override | `process.env.PORT = '8080'; expect(config.port).toBe(8080)` |
| Integration - Endpoints | Root response | `GET / → 'Hello, World!\n'` |
| Integration - Endpoints | Evening response | `GET /evening → 'Good evening'` |
| Integration - Server | Startup | Server listens on configured host:port |

### 0.7.5 Backward Compatibility Guarantees

| Guarantee | Description | Enforcement |
|-----------|-------------|-------------|
| API Stability | Endpoints `/` and `/evening` respond identically | Exact response string matching |
| Configuration Stability | HOST, PORT, NODE_ENV override behavior unchanged | Environment variable testing |
| Import Stability | `require('./src/app')` returns Express Application | Module export validation |
| Startup Stability | `npm start` produces identical startup behavior | Console output verification |

### 0.7.6 Validation Acceptance Criteria

The refactoring validation is complete when all of the following pass:

| Criterion | Validation Method | Expected Result |
|-----------|-------------------|-----------------|
| Server starts | `npm start` | No errors, startup log displayed |
| Root endpoint works | `curl http://127.0.0.1:3000/` | `Hello, World!` with newline |
| Evening endpoint works | `curl http://127.0.0.1:3000/evening` | `Good evening` without newline |
| Express version correct | `npm ls express` | `express@5.1.0` |
| Config defaults work | Start without env vars | Binds to 127.0.0.1:3000 |
| Config override works | `PORT=8080 npm start` | Binds to 127.0.0.1:8080 |
| No vulnerabilities | `npm audit` | 0 vulnerabilities |
| Module exports valid | Node.js require checks | All modules load without error |

### 0.7.7 Documentation Accuracy

The following documentation must accurately reflect the implementation:

| Document | Required Accuracy | Validation |
|----------|-------------------|------------|
| `README.md` | Installation steps, API reference, environment variables | Manual verification |
| Inline JSDoc | Module descriptions, parameter types, return types | Code review |
| Code comments | Accurate descriptions of functionality | Code review |

