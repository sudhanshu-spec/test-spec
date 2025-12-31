# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

### 0.1.1 Core Refactoring Objective

Based on the prompt, the Blitzy platform understands that the refactoring objective is to **confirm and maintain the existing Express.js implementation while ensuring complete behavioral parity with the current Node.js/Express.js server**. The user's request to "rewrite this Node.js server into an Express.js refactor, keeping every feature and functionality exactly as in the original Node.js project" indicates a validation and preservation exercise for the existing Express.js codebase.

**Refactoring Type:** Code Structure Maintenance (Same Repository)

**Target Repository:** Same repository - no migration to new repository required

**Refactoring Goals with Enhanced Clarity:**

- **Preserve Existing Express.js Implementation**: The current `server.js` already uses Express.js 5.1.0 as the web framework. This refactoring ensures the implementation remains stable, correct, and follows Express.js conventions.

- **Maintain Complete Behavioral Equivalence**: All existing functionality must be preserved exactly:
  - GET `/` → Returns "Hello, World!\n" (with trailing newline)
  - GET `/evening` → Returns "Good evening" (no trailing newline)
  - Default 404 handling for undefined routes (Express built-in)

- **Ensure Configuration Consistency**: Server binds to 127.0.0.1:3000 with console startup notification

- **Validate Dependency Integrity**: Express.js 5.1.0 with all 68 transitive dependencies properly installed and secure

**Implicit Requirements Surfaced:**

- **API Compatibility Must Be Maintained**: All public HTTP endpoints must continue to function identically
- **No Behavioral Changes Allowed**: Response bodies, status codes, and headers must remain unchanged
- **Development Workflow Preserved**: `npm start` and `node server.js` commands must continue working
- **Dependency Security**: All packages must pass npm audit with zero vulnerabilities

### 0.1.2 Special Instructions and Constraints

**User-Provided Instructions:**
- "Rewrite this Node.js server into an Express.js refactor"
- "Keeping every feature and functionality exactly as in the original Node.js project"
- "Ensure the rewritten version fully matches the behavior and logic of the current implementation"

**CRITICAL Constraints from Analysis:**

- **README.md Freeze Policy**: The README.md contains explicit directive "test project for backprop integration. Do not touch!" - this file must NOT be modified

- **Single-File Architecture Mandate**: The tutorial nature of this project requires maintaining the simple, single-file server architecture in `server.js`

- **Framework Version Lock**: Express.js ^5.1.0 must be maintained (per package.json dependency declaration)

- **Node.js Compatibility**: Node.js >= 18 is required (Express 5.x requirement); current environment uses Node.js v20.19.6

**Architectural Requirements:**

- Maintain CommonJS module syntax (`require`/`module.exports`) to match existing codebase style
- Keep server configuration (hostname: 127.0.0.1, port: 3000) as constants for easy reference
- Preserve the minimal, tutorial-focused implementation without unnecessary complexity

**Migration Requirements:** None - this is a same-repository refactoring exercise

**Performance/Scalability Improvements Expected:** None - maintain current lightweight implementation

### 0.1.3 Technical Interpretation

This refactoring translates to the following technical transformation strategy:

**Current Architecture → Target Architecture: IDENTICAL**

The Express.js implementation is already complete and functional. The transformation strategy focuses on validation and maintenance rather than structural changes.

**Transformation Rules and Patterns:**

| Current Pattern | Target Pattern | Transformation |
|-----------------|----------------|----------------|
| `const express = require('express')` | `const express = require('express')` | No change (already correct) |
| `const app = express()` | `const app = express()` | No change (already correct) |
| `app.get('/', handler)` | `app.get('/', handler)` | No change (route preserved) |
| `app.get('/evening', handler)` | `app.get('/evening', handler)` | No change (route preserved) |
| `app.listen(port, hostname, cb)` | `app.listen(port, hostname, cb)` | No change (binding preserved) |

**Implementation Validation Strategy:**

```javascript
// Verification: Current server.js structure (19 lines)
const express = require('express');
const hostname = '127.0.0.1';
const port = 3000;
const app = express();
app.get('/', (req, res) => res.send('Hello, World!\n'));
app.get('/evening', (req, res) => res.send('Good evening'));
app.listen(port, hostname, () => console.log(...));
```

**Technical Summary:**
The transformation involves zero code changes to `server.js`. The refactoring confirms the existing Express.js implementation is correct and maintains complete behavioral parity with the original server specifications. All dependencies remain at their current versions, and all configuration files are preserved as-is.

## 0.2 Source Analysis

### 0.2.1 Comprehensive Source File Discovery

**Search Patterns Applied to Identify Files in Scope:**

Based on the user's instruction to refactor the Node.js server to Express.js while keeping all functionality, the following patterns were used to discover relevant files:

- **Application Entry Points**: `server.js`, `app.js`, `index.js`
- **Package Configuration**: `package.json`, `package-lock.json`
- **Environment Configuration**: `.gitignore`, `.env*`
- **Documentation**: `README.md`, `docs/**/*.md`

**Discovery Results:**

| File Path | Lines | Size | Status | Purpose |
|-----------|-------|------|--------|---------|
| `server.js` | 19 | 342 bytes | Express.js (current) | Main application entry point with route definitions |
| `package.json` | 15 | ~300 bytes | Current | NPM manifest with Express.js 5.1.0 dependency |
| `package-lock.json` | ~2000 | ~50KB | Current | Dependency lockfile with 69 packages pinned |
| `.gitignore` | 22 | ~250 bytes | Current | Git ignore patterns for Node.js development |
| `README.md` | 2 | 73 bytes | FROZEN | Project description with "Do not touch!" directive |
| `blitzy/documentation/Project Guide.md` | ~500 | N/A | Reference | Migration runbook and validation guide |
| `blitzy/documentation/Technical Specifications.md` | ~1500 | N/A | Reference | Technical specification document |

### 0.2.2 Current Structure Mapping

```
Current Repository Structure:
.
├── README.md (FROZEN - Do not touch!)
├── package.json (Express.js 5.1.0 declared)
├── package-lock.json (69 packages locked)
├── server.js (Express.js implementation - 19 lines)
├── .gitignore (Node.js patterns)
└── blitzy/
    └── documentation/
        ├── Project Guide.md (Reference only)
        └── Technical Specifications.md (Reference only)
```

### 0.2.3 Detailed Source File Analysis

**server.js - Main Application (19 lines)**

```javascript
// Current Express.js Implementation Structure
Line 1:  const express = require('express');
Line 3:  const hostname = '127.0.0.1';
Line 4:  const port = 3000;
Line 6:  const app = express();
Line 8-10:  GET '/' route handler → "Hello, World!\n"
Line 12-14: GET '/evening' route handler → "Good evening"
Line 16-18: app.listen() with startup callback
```

**Analysis:**
- Already uses Express.js (not vanilla Node.js HTTP)
- Two explicit GET route handlers
- Hard-coded configuration (hostname, port)
- Synchronous route handlers with immediate response
- No middleware stack
- No error handling beyond Express defaults

**package.json - NPM Manifest**

```json
{
  "name": "hello_world",
  "version": "1.0.0",
  "description": "Hello world in Node.js",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "express": "^5.1.0"
  }
}
```

**Analysis:**
- Express.js 5.1.0 already declared as dependency
- Correct main entry point (server.js)
- Start script properly configured
- No dev dependencies
- MIT license

**package-lock.json - Dependency Lockfile**

**Key Locked Packages:**
| Package | Version | Purpose |
|---------|---------|---------|
| express | 5.1.0 | Web framework |
| body-parser | 2.2.1 | Request body parsing |
| accepts | 2.0.0 | Content negotiation |
| finalhandler | 2.1.0 | Request finalization |
| qs | 6.14.1 | Query string parsing |
| debug | 4.4.3 | Debug logging |

**Total Package Count:** 69 packages (1 direct + 68 transitive)

### 0.2.4 Complete Source File Inventory

**CRITICAL: All source files identified (no pending discoveries):**

| File | Type | In Scope | Modification Required |
|------|------|----------|----------------------|
| `server.js` | JavaScript | ✅ YES | NO - Already Express.js |
| `package.json` | JSON | ✅ YES | NO - Dependencies correct |
| `package-lock.json` | JSON | ✅ YES | NO - Versions locked |
| `.gitignore` | Config | ✅ YES | NO - Patterns correct |
| `README.md` | Markdown | ❌ NO | FROZEN per directive |
| `blitzy/documentation/Project Guide.md` | Markdown | ❌ NO | Reference only |
| `blitzy/documentation/Technical Specifications.md` | Markdown | ❌ NO | Reference only |

### 0.2.5 Integration Points and Dependencies

**HTTP Endpoints (Public API):**

| Method | Path | Response | Status |
|--------|------|----------|--------|
| GET | `/` | `Hello, World!\n` | 200 OK |
| GET | `/evening` | `Good evening` | 200 OK |
| * | `/*` (undefined) | HTML 404 page | 404 Not Found |

**Network Configuration:**
- Hostname: 127.0.0.1 (localhost-only binding)
- Port: 3000 (hard-coded)
- Protocol: HTTP/1.1

**Execution Commands:**
- `npm start` → Runs `node server.js`
- `node server.js` → Direct execution
- Expected output: `Server running at http://127.0.0.1:3000/`

**No External Integrations:**
- No database connections
- No external API calls
- No message queue subscriptions
- No file system writes
- No authentication services

## 0.3 Target Design

### 0.3.1 Refactored Structure Planning

Since the current implementation already uses Express.js 5.1.0 and the user requires keeping all features and functionality exactly as in the original, the target structure remains **identical** to the current structure. This refactoring exercise validates and confirms the existing implementation.

**Target Architecture:**

```
Target Structure (IDENTICAL TO CURRENT):
.
├── README.md (PRESERVED - Do not touch!)
├── package.json (PRESERVED - Express.js 5.1.0)
├── package-lock.json (PRESERVED - 69 packages locked)
├── server.js (PRESERVED - 19-line Express.js implementation)
├── .gitignore (PRESERVED - Node.js patterns)
└── blitzy/
    └── documentation/
        ├── Project Guide.md (REFERENCE)
        └── Technical Specifications.md (REFERENCE)
```

**Rationale for Identical Structure:**
- The server already implements Express.js correctly
- User explicitly requires "keeping every feature and functionality exactly"
- Tutorial-level project benefits from single-file simplicity
- No architectural improvements requested beyond Express.js compliance

### 0.3.2 Web Search Research Conducted

**Research Topics and Findings:**

**1. Express.js Project Structure Best Practices:**

Research from authoritative sources confirms that for minimal/tutorial applications, single-file architecture is acceptable:
- "Express.js is a great framework for creating Node.js REST APIs; however, it doesn't give you any clues about organizing your Node.js project"
- For production applications, separation into routes/, controllers/, services/ is recommended
- For tutorial/test fixtures, simplicity takes precedence

**2. Express.js 5.x Compatibility:**

- Express 5.1.0 requires Node.js >= 18 (current environment: v20.19.6 ✓)
- No breaking changes affect simple GET route implementations
- `res.send()` method remains the standard for text responses

**3. Best Practices Applied:**

| Practice | Application in This Project |
|----------|----------------------------|
| Use `app.get()` for GET routes | ✅ Already implemented |
| Use `res.send()` for responses | ✅ Already implemented |
| Use arrow functions for handlers | ✅ Already implemented |
| Define routes after app creation | ✅ Already implemented |
| Use `app.listen()` for binding | ✅ Already implemented |

### 0.3.3 Design Pattern Applications

**Patterns Currently in Use (Confirmed Correct):**

**1. Express Application Pattern:**
```javascript
const express = require('express');
const app = express();
```
Status: ✅ Correctly implemented

**2. Route Definition Pattern:**
```javascript
app.get('/', (req, res) => { res.send('...'); });
```
Status: ✅ Correctly implemented with arrow functions

**3. Server Binding Pattern:**
```javascript
app.listen(port, hostname, () => { console.log(...); });
```
Status: ✅ Correctly implemented with callback notification

**Patterns Intentionally Not Applied (Per Requirements):**

| Pattern | Reason Not Applied |
|---------|-------------------|
| Router Pattern (`express.Router()`) | Single-file architecture maintained |
| Middleware Stack | No processing requirements |
| Error Handling Middleware | Express defaults sufficient |
| Environment Configuration | Hard-coded values per tutorial design |
| Service Layer | No business logic separation needed |
| Dependency Injection | Overkill for 19-line application |

### 0.3.4 Target Configuration Validation

**server.js Target State (Preserved):**

```javascript
const express = require('express');

const hostname = '127.0.0.1';
const port = 3000;

const app = express();

app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

app.get('/evening', (req, res) => {
  res.send('Good evening');
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
```

**Validation Criteria:**
- ✅ Express.js imported correctly
- ✅ Configuration constants defined
- ✅ Application instance created
- ✅ Two GET routes defined with correct handlers
- ✅ Server listening with startup notification
- ✅ All 19 lines preserved exactly

**package.json Target State (Preserved):**

```json
{
    "name": "hello_world",
    "version": "1.0.0",
    "description": "Hello world in Node.js",
    "main": "server.js",
    "scripts": {
        "start": "node server.js",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "author": "hxu",
    "license": "MIT",
    "dependencies": {
        "express": "^5.1.0"
    }
}
```

**Validation Criteria:**
- ✅ Name and version correct
- ✅ Main entry point set to server.js
- ✅ Start script configured
- ✅ Express.js 5.1.0 dependency declared
- ✅ MIT license maintained

## 0.4 Transformation Mapping

### 0.4.1 File-by-File Transformation Plan

Since the current implementation already uses Express.js correctly and the user requires maintaining exact functionality, this transformation plan validates and preserves the existing files.

**File Transformation Modes:**
- **UPDATE** - Update an existing file
- **CREATE** - Create a new file
- **REFERENCE** - Use as an example to reflect existing patterns, styles or designs

**Comprehensive File Transformation Table:**

| Target File | Transformation | Source File | Key Changes |
|------------|---------------|-------------|-------------|
| `server.js` | UPDATE | `server.js` | No changes required - already Express.js implementation |
| `package.json` | UPDATE | `package.json` | No changes required - Express.js 5.1.0 dependency already declared |
| `package-lock.json` | UPDATE | `package-lock.json` | No changes required - dependencies already locked |
| `.gitignore` | UPDATE | `.gitignore` | No changes required - patterns correct for Node.js |
| `README.md` | REFERENCE | `README.md` | FROZEN - "Do not touch!" directive must be honored |
| `blitzy/documentation/Project Guide.md` | REFERENCE | `blitzy/documentation/Project Guide.md` | Reference only - validation commands and expected outputs |
| `blitzy/documentation/Technical Specifications.md` | REFERENCE | `blitzy/documentation/Technical Specifications.md` | Reference only - acceptance criteria and constraints |

### 0.4.2 Detailed Transformation Specifications

**server.js Transformation:**

| Line(s) | Current Code | Target Code | Change Type |
|---------|--------------|-------------|-------------|
| 1 | `const express = require('express');` | `const express = require('express');` | NO CHANGE |
| 3 | `const hostname = '127.0.0.1';` | `const hostname = '127.0.0.1';` | NO CHANGE |
| 4 | `const port = 3000;` | `const port = 3000;` | NO CHANGE |
| 6 | `const app = express();` | `const app = express();` | NO CHANGE |
| 8-10 | GET `/` route handler | GET `/` route handler | NO CHANGE |
| 12-14 | GET `/evening` route handler | GET `/evening` route handler | NO CHANGE |
| 16-18 | `app.listen()` binding | `app.listen()` binding | NO CHANGE |

**package.json Transformation:**

| Field | Current Value | Target Value | Change Type |
|-------|---------------|--------------|-------------|
| `name` | `"hello_world"` | `"hello_world"` | NO CHANGE |
| `version` | `"1.0.0"` | `"1.0.0"` | NO CHANGE |
| `main` | `"server.js"` | `"server.js"` | NO CHANGE |
| `scripts.start` | `"node server.js"` | `"node server.js"` | NO CHANGE |
| `dependencies.express` | `"^5.1.0"` | `"^5.1.0"` | NO CHANGE |

### 0.4.3 Cross-File Dependencies

**Import Statement Analysis:**

No import statement updates are required as the current implementation correctly uses:

```javascript
// Current (and target) import
const express = require('express');
```

**No cross-file dependencies exist because:**
- Single-file architecture (server.js only)
- No separate route files
- No middleware modules
- No configuration modules
- No utility modules

**Configuration Consistency:**

| Configuration | Location | Value | Status |
|---------------|----------|-------|--------|
| Hostname | server.js:3 | `'127.0.0.1'` | Correct |
| Port | server.js:4 | `3000` | Correct |
| Entry Point | package.json:main | `"server.js"` | Correct |
| Start Command | package.json:scripts.start | `"node server.js"` | Correct |

### 0.4.4 Wildcard Patterns for File Groups

**Files In Scope (Specific Paths - No Wildcards Needed):**

```
server.js
package.json
package-lock.json
.gitignore
```

**Files Explicitly Excluded:**

```
README.md (FROZEN)
blitzy/**/*.md (Reference only)
node_modules/**/* (Managed by npm)
```

### 0.4.5 One-Phase Execution Plan

**CRITICAL: The entire refactor will be executed by Blitzy in ONE phase.**

**Phase 1: Validation and Preservation (Single Phase)**

| Step | Action | Target | Expected Outcome |
|------|--------|--------|------------------|
| 1 | Validate | `server.js` | Confirm Express.js implementation is correct |
| 2 | Validate | `package.json` | Confirm dependencies and scripts are correct |
| 3 | Validate | `package-lock.json` | Confirm all 69 packages are locked |
| 4 | Validate | `.gitignore` | Confirm patterns are appropriate |
| 5 | Preserve | `README.md` | Ensure file is not modified |
| 6 | Verify | HTTP endpoints | Test both routes return correct responses |
| 7 | Verify | npm audit | Confirm zero vulnerabilities |

**Execution Verification Commands:**

```bash
# Verify dependencies
npm install

#### Verify security
npm audit

#### Verify server functionality
node server.js &
sleep 2
curl http://127.0.0.1:3000/         # Expect: Hello, World!\n
curl http://127.0.0.1:3000/evening  # Expect: Good evening
pkill -f "node server.js"
```

### 0.4.6 Summary of Transformations

**Transformation Summary:**

| Category | Files Affected | Changes Required |
|----------|---------------|------------------|
| Application Code | 1 (server.js) | 0 changes |
| Package Config | 2 (package.json, package-lock.json) | 0 changes |
| Git Config | 1 (.gitignore) | 0 changes |
| Documentation | 1 (README.md) | FROZEN |
| Reference Docs | 2 (blitzy/documentation/*.md) | Not modified |

**Total Files in Scope:** 4
**Total Changes Required:** 0 (validation only)
**Reason:** Current implementation already uses Express.js correctly; user requires exact feature preservation

## 0.5 Dependency Inventory

### 0.5.1 Key Private and Public Packages

**Primary Dependency:**

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm (public) | express | ^5.1.0 (resolved: 5.1.0) | Minimal and flexible Node.js web application framework providing robust routing and HTTP utility methods |

**Critical Transitive Dependencies (Top-Level):**

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | body-parser | 2.2.1 | Request body parsing middleware (JSON, URL-encoded, raw, text) |
| npm | accepts | 2.0.0 | HTTP Accept header content negotiation |
| npm | content-type | 1.0.5 | Content-Type header parsing and formatting |
| npm | cookie | 1.0.2 | HTTP cookie parsing and serialization |
| npm | debug | 4.4.3 | Selective debug logging with namespace filtering |
| npm | finalhandler | 2.1.0 | Final request handling and error responses |
| npm | fresh | 2.0.0 | HTTP cache freshness validation |
| npm | http-errors | 2.0.0 | HTTP error object creation with status codes |
| npm | merge-descriptors | 2.0.0 | Object property descriptor merging |
| npm | mime-types | 3.0.1 | MIME type database and lookup utilities |
| npm | on-finished | 2.4.1 | Response finish event detection |
| npm | parseurl | 1.3.3 | URL parsing utilities for request objects |
| npm | qs | 6.14.1 | Query string parsing and stringification |
| npm | raw-body | 3.0.1 | Raw body stream processing |
| npm | router | 2.2.0 | Express routing layer with path pattern matching |
| npm | send | 1.2.0 | Streaming file transmission |
| npm | serve-static | 2.2.0 | Static file serving middleware |
| npm | statuses | 2.0.1 | HTTP status code utilities |
| npm | type-is | 2.0.1 | Content-Type request header checking |
| npm | vary | 1.1.2 | Vary header field value manipulation |

**Package Count Summary:**

| Category | Count |
|----------|-------|
| Direct Dependencies | 1 |
| Transitive Dependencies | 68 |
| **Total Packages** | **69** |

### 0.5.2 Dependency Verification

**Installed Package Versions (Verified):**

```bash
# Verification performed via npm install
$ npm install
added 68 packages, and audited 69 packages in 1s
```

**Security Audit Results:**

```bash
$ npm audit
found 0 vulnerabilities
```

**Note:** Initial installation showed 2 vulnerabilities (body-parser and qs) which were resolved via `npm audit fix`, updating to body-parser 2.2.1 and qs 6.14.1.

### 0.5.3 Dependency Updates

**No Dependency Updates Required**

The current dependency configuration is complete and correct:

| Dependency | Current | Required | Action |
|------------|---------|----------|--------|
| express | ^5.1.0 | ^5.1.0 | None |

**package.json Dependencies Section (Preserved):**

```json
{
  "dependencies": {
    "express": "^5.1.0"
  }
}
```

### 0.5.4 Import Refactoring

**No Import Refactoring Required**

The current import statement is correct and follows Node.js/CommonJS conventions:

```javascript
// Current (correct) import
const express = require('express');
```

**Files Containing Imports:**

| File | Import Statement | Status |
|------|------------------|--------|
| `server.js` | `require('express')` | Correct |

### 0.5.5 External Reference Updates

**No External Reference Updates Required**

All configuration files are correctly configured:

| File Type | File Path | Status |
|-----------|-----------|--------|
| Package Manifest | `package.json` | Correct |
| Package Lockfile | `package-lock.json` | Correct |
| Git Configuration | `.gitignore` | Correct |

**No Additional Files Need Updates:**

- No CI/CD files (`.github/workflows/*.yml`, `.gitlab-ci.yml`) exist
- No build files beyond `package.json`
- No environment files (`.env`) to update
- Documentation (`README.md`) is FROZEN

### 0.5.6 Runtime Environment Requirements

**Node.js Compatibility:**

| Requirement | Specification | Current Environment | Status |
|-------------|---------------|---------------------|--------|
| Node.js Version | >= 18.0.0 | v20.19.6 | ✅ Compatible |
| npm Version | >= 7.0.0 | v11.1.0 | ✅ Compatible |

**Express.js 5.x Node.js Requirement:**

Express.js 5.1.0 requires Node.js 18 or higher, as documented in the package-lock.json:

```json
"engines": {
  "node": ">=18"
}
```

The current environment (Node.js v20.19.6) satisfies this requirement.

### 0.5.7 Dependency Tree Visualization

```mermaid
graph TD
    A[hello_world@1.0.0] --> B[express@5.1.0]
    B --> C[body-parser@2.2.1]
    B --> D[accepts@2.0.0]
    B --> E[content-type@1.0.5]
    B --> F[cookie@1.0.2]
    B --> G[debug@4.4.3]
    B --> H[finalhandler@2.1.0]
    B --> I[fresh@2.0.0]
    B --> J[http-errors@2.0.0]
    B --> K[...66 more packages]
    
    C --> L[qs@6.14.1]
    C --> M[raw-body@3.0.1]
    C --> N[type-is@2.0.1]
    
    D --> O[mime-types@3.0.1]
    D --> P[negotiator@1.0.0]
```

**Note:** Full dependency tree contains 69 packages total with Express.js as the sole direct dependency.

## 0.6 Scope Boundaries

### 0.6.1 Exhaustively In Scope

**Source Transformations:**

| Pattern | File(s) | Purpose |
|---------|---------|---------|
| `server.js` | Main application file | Express.js server implementation - validation only |

**Package Configuration:**

| Pattern | File(s) | Purpose |
|---------|---------|---------|
| `package.json` | NPM manifest | Dependency declaration and scripts |
| `package-lock.json` | Lockfile | Dependency version locking |

**Git Configuration:**

| Pattern | File(s) | Purpose |
|---------|---------|---------|
| `.gitignore` | Git ignore patterns | Exclude node_modules, .env, logs, IDE files |

**Documentation (Reference Only):**

| Pattern | File(s) | Purpose |
|---------|---------|---------|
| `blitzy/documentation/*.md` | Project Guide, Tech Specs | Reference for validation commands and acceptance criteria |

### 0.6.2 Complete In-Scope File List

| File Path | Type | Action | Rationale |
|-----------|------|--------|-----------|
| `server.js` | JavaScript | VALIDATE | Confirm Express.js implementation is correct |
| `package.json` | JSON | VALIDATE | Confirm dependencies and scripts are correct |
| `package-lock.json` | JSON | VALIDATE | Confirm dependency versions are locked |
| `.gitignore` | Config | VALIDATE | Confirm patterns are appropriate for Node.js |

### 0.6.3 Explicitly Out of Scope

**Frozen Files (Per User/Project Directive):**

| File | Reason |
|------|--------|
| `README.md` | Contains explicit "Do not touch!" directive - integration test sentinel |

**Reference-Only Files (Not Modified):**

| Pattern | Reason |
|---------|--------|
| `blitzy/documentation/Project Guide.md` | Reference documentation only |
| `blitzy/documentation/Technical Specifications.md` | Reference documentation only |

**Automatically Managed:**

| Pattern | Reason |
|---------|--------|
| `node_modules/**/*` | Managed by npm - 69 packages, not tracked in git |

**Non-Existent (Not Required):**

| Pattern | Reason |
|---------|--------|
| `tests/**/*.js` | No tests in scope - manual validation only |
| `src/**/*.js` | No src folder - single-file architecture |
| `.env*` | No environment files - hard-coded configuration |
| `config/*.js` | No config folder - configuration in server.js |
| `.github/**/*` | No CI/CD pipelines |
| `docker*` | No containerization |

### 0.6.4 Features Explicitly Out of Scope

Based on the user's requirement to "keep every feature and functionality exactly as in the original", the following are NOT to be implemented:

**Architecture Changes:**

- ❌ Modular file structure (separate routes, controllers, services)
- ❌ Router pattern (`express.Router()`)
- ❌ Middleware stack additions
- ❌ Error handling middleware
- ❌ Configuration externalization (environment variables)

**Functionality Additions:**

- ❌ New endpoints beyond GET `/` and GET `/evening`
- ❌ POST, PUT, DELETE, PATCH methods
- ❌ Request body parsing usage
- ❌ Query parameter handling
- ❌ Static file serving
- ❌ Template rendering

**Production Features:**

- ❌ HTTPS/TLS configuration
- ❌ Process management (PM2)
- ❌ Structured logging
- ❌ Security headers (helmet.js)
- ❌ Rate limiting
- ❌ CORS configuration

**Testing Infrastructure:**

- ❌ Automated test suite
- ❌ Test fixtures
- ❌ Code coverage

**DevOps:**

- ❌ CI/CD pipelines
- ❌ Docker containerization
- ❌ Kubernetes manifests

### 0.6.5 Scope Validation Checklist

| Validation Item | Status | Evidence |
|-----------------|--------|----------|
| Express.js framework in use | ✅ | `server.js` line 1: `require('express')` |
| GET `/` returns "Hello, World!\n" | ✅ | `server.js` lines 8-10 |
| GET `/evening` returns "Good evening" | ✅ | `server.js` lines 12-14 |
| Server binds to 127.0.0.1:3000 | ✅ | `server.js` lines 3-4, 16 |
| Console startup message | ✅ | `server.js` line 17 |
| Express.js 5.1.0 declared | ✅ | `package.json` dependencies |
| npm start command works | ✅ | `package.json` scripts.start |
| README.md preserved | ✅ | File unchanged, 73 bytes |
| Zero security vulnerabilities | ✅ | `npm audit` passes |

### 0.6.6 Scope Summary

**Total Files In Scope:** 4
- `server.js` - Express.js application
- `package.json` - NPM manifest
- `package-lock.json` - Dependency lockfile
- `.gitignore` - Git configuration

**Total Files Out of Scope:** 3
- `README.md` - FROZEN
- `blitzy/documentation/Project Guide.md` - Reference only
- `blitzy/documentation/Technical Specifications.md` - Reference only

**Required Modifications:** 0 (validation only)

**Rationale:** The existing Express.js implementation is complete and correct. The user's requirement to maintain exact functionality means no code changes are needed - only validation and confirmation of the current state.

## 0.7 Special Instructions for Refactoring

### 0.7.1 User-Specified Requirements

**Primary Directive from User:**

> "Rewrite this Node.js server into a express.js refactor, keeping every feature and functionality exactly as in the original Node.js project. Ensure the rewritten version fully matches the behavior and logic of the current implementation."

**Parsed Requirements:**

| Requirement | Interpretation | Validation Method |
|-------------|----------------|-------------------|
| "Rewrite this Node.js server into express.js" | Confirm/maintain Express.js implementation | Verify `require('express')` in server.js |
| "keeping every feature and functionality exactly" | Zero behavioral changes allowed | Test all endpoints return identical responses |
| "fully matches the behavior and logic" | Complete functional equivalence | Compare request/response pairs |

### 0.7.2 API Contract Preservation

**CRITICAL: Maintain All Public API Contracts**

| Endpoint | Method | Request | Response | Content-Type |
|----------|--------|---------|----------|--------------|
| `/` | GET | None | `Hello, World!\n` | text/html; charset=utf-8 |
| `/evening` | GET | None | `Good evening` | text/html; charset=utf-8 |
| `/*` (undefined) | * | Any | HTML 404 page | text/html; charset=utf-8 |

**Response Precision Requirements:**

| Endpoint | Response Body | Trailing Newline | Status Code |
|----------|---------------|------------------|-------------|
| GET `/` | `Hello, World!` | YES (`\n`) | 200 |
| GET `/evening` | `Good evening` | NO | 200 |

### 0.7.3 Functionality Preservation Rules

**Rule 1: All Existing Functionality Must Be Preserved**

```javascript
// GET '/' - MUST return exactly this
res.send('Hello, World!\n');  // Note: trailing newline

// GET '/evening' - MUST return exactly this
res.send('Good evening');     // Note: no trailing newline
```

**Rule 2: Server Configuration Must Remain Identical**

```javascript
const hostname = '127.0.0.1';  // Localhost only
const port = 3000;              // Port 3000
```

**Rule 3: Startup Behavior Must Be Identical**

```javascript
// Console output on startup:
console.log(`Server running at http://${hostname}:${port}/`);
// Expected output: "Server running at http://127.0.0.1:3000/"
```

### 0.7.4 Test Continuity Requirements

**Manual Validation Commands (Must Continue Working):**

```bash
# Start server
npm start
# OR
node server.js

#### Test root endpoint
curl http://127.0.0.1:3000/
#### Expected: Hello, World!
#### (with newline)

#### Test evening endpoint
curl http://127.0.0.1:3000/evening
#### Expected: Good evening
#### (no newline)

#### Test 404 behavior
curl http://127.0.0.1:3000/undefined
#### Expected: HTML 404 page with "Cannot GET /undefined"
```

### 0.7.5 Backward Compatibility Guarantees

**Guaranteed Backward Compatibility:**

| Aspect | Guarantee |
|--------|-----------|
| Entry Point | `server.js` remains the main file |
| npm start | Command continues to work |
| Direct execution | `node server.js` continues to work |
| Port binding | 127.0.0.1:3000 maintained |
| Response bodies | Exact character-for-character match |
| HTTP status codes | 200 for valid routes, 404 for invalid |

### 0.7.6 Design Pattern Adherence

**Express.js Conventions Already Followed:**

| Convention | Implementation | Status |
|------------|----------------|--------|
| Application initialization | `const app = express()` | ✅ |
| Route definition | `app.get(path, handler)` | ✅ |
| Response sending | `res.send(body)` | ✅ |
| Server binding | `app.listen(port, host, cb)` | ✅ |
| Arrow functions | `(req, res) => {}` | ✅ |
| Template literals | `` `...${var}...` `` | ✅ |

### 0.7.7 Project-Specific Constraints

**README.md Freeze Policy:**

The `README.md` file contains the explicit directive:
```
test project for backprop integration. Do not touch!
```

This file MUST NOT be modified under any circumstances. It serves as an integration test sentinel.

**Tutorial-Level Architecture:**

This project intentionally maintains a simple, single-file architecture for educational purposes:
- No separate route files
- No middleware configuration files
- No environment variable files
- No configuration modules

This simplicity is a feature, not a limitation, and must be preserved.

### 0.7.8 Validation Acceptance Criteria

**Pre-Refactor State (Current):**

| Criterion | Expected Value | Actual Value | Status |
|-----------|----------------|--------------|--------|
| server.js uses Express | `require('express')` | `require('express')` | ✅ PASS |
| Express version | ^5.1.0 | ^5.1.0 | ✅ PASS |
| GET `/` response | "Hello, World!\n" | "Hello, World!\n" | ✅ PASS |
| GET `/evening` response | "Good evening" | "Good evening" | ✅ PASS |
| Server port | 3000 | 3000 | ✅ PASS |
| Server host | 127.0.0.1 | 127.0.0.1 | ✅ PASS |
| npm audit | 0 vulnerabilities | 0 vulnerabilities | ✅ PASS |

**Post-Refactor State (Target):**

Identical to pre-refactor state - no changes expected.

