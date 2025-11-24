# hao-backprop-test

A minimal Express.js API server designed for Backprop integration testing and demonstration purposes. This project showcases a clean, production-ready Express.js 5.1.0 implementation with RESTful endpoints and minimal dependencies.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [References](#references)

## Features

- **Express.js 5.1.0 Framework** - Modern web framework with robust routing and middleware architecture
- **RESTful API Endpoints** - Two GET endpoints demonstrating Express routing patterns
- **Minimal Dependencies** - Single external dependency (Express.js) for maintainability
- **Production-Ready** - Zero security vulnerabilities, clean dependency tree
- **CommonJS Module Pattern** - Standard Node.js module system for broad compatibility
- **Lightweight Design** - 19 lines of application code, optimized for clarity and learning

## Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** v20.19.5 or higher ([Download Node.js](https://nodejs.org/))
- **npm** v10.8.2 or higher (included with Node.js)

**Tested Operating Systems:**
- Linux (Ubuntu 20.04+, Debian 11+)
- macOS (10.15+)
- Windows (10/11 with WSL2 recommended)

**Verify Installation:**

```bash
node --version  # Should output v20.19.5 or higher
npm --version   # Should output v10.8.2 or higher
```

## Installation

Follow these steps to set up the application locally:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hao-backprop-test
```

### 2. Install Dependencies

```bash
npm install
```

**Expected Output:**
```
added 68 packages, and audited 69 packages in 2s

12 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

The installation includes:
- **express@5.1.0** - Web application framework
- **68 transitive dependencies** - Express.js dependency tree (4.3MB total)

### 3. Verify Installation

```bash
npm list express
```

**Expected Output:**
```
hello_world@1.0.0
└── express@5.1.0
```

## Configuration

The application supports environment variable configuration for deployment flexibility.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | No | N/A | JWT signing secret for future authentication features (placeholder - not currently used) |
| `PORT` | No | 3000 | Server port (future enhancement - currently hardcoded to 3000) |
| `NODE_ENV` | No | development | Runtime environment (development, production, test) |

### Configuration Methods

#### Option 1: Environment Variables (Recommended for Production)

```bash
export JWT_SECRET="your-secret-key-here"
export NODE_ENV="production"
npm start
```

#### Option 2: .env File (Development)

Create a `.env` file in the project root:

```env
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

**Note:** The application does not currently implement `.env` file loading. To enable this, install `dotenv`:

```bash
npm install dotenv
```

Then add to `server.js` before other code:
```javascript
require('dotenv').config();
```

### Security Considerations

- **JWT_SECRET**: Keep this value secure and never commit it to version control
- **Production Deployment**: Always set `NODE_ENV=production` for performance optimizations
- **Environment Files**: Add `.env` to `.gitignore` (already configured)

## Usage

### Starting the Server

```bash
npm start
```

**Expected Output:**
```
Server running at http://127.0.0.1:3000/
```

The server binds to `127.0.0.1` (localhost) on port `3000` and is ready to accept HTTP requests.

### Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

### Running in Development Mode

For development with automatic restarts on file changes, install `nodemon`:

```bash
npm install --save-dev nodemon
```

Add to `package.json` scripts:
```json
"dev": "nodemon server.js"
```

Then run:
```bash
npm run dev
```

## API Reference

The application exposes two RESTful endpoints for demonstration purposes.

### Endpoint 1: Root Welcome

Returns a welcome message.

**Request:**
```http
GET / HTTP/1.1
Host: 127.0.0.1:3000
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 14

Hello, World!
```

**Example using curl:**
```bash
curl http://127.0.0.1:3000/
```

**Expected Output:**
```
Hello, World!
```

**Note:** The response includes a trailing newline character (`\n`).

---

### Endpoint 2: Evening Greeting

Returns an evening greeting message.

**Request:**
```http
GET /evening HTTP/1.1
Host: 127.0.0.1:3000
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 12

Good evening
```

**Example using curl:**
```bash
curl http://127.0.0.1:3000/evening
```

**Expected Output:**
```
Good evening
```

---

### Error Handling

**404 Not Found** - Unmatched Routes

When accessing a route that doesn't exist, Express returns a default 404 response.

**Request:**
```bash
curl http://127.0.0.1:3000/nonexistent
```

**Response:**
```
Cannot GET /nonexistent
```

**HTTP Status:** 404 Not Found

## Project Structure

```
hao-backprop-test/
├── server.js                        # Application entrypoint - Express server with route definitions
├── package.json                     # npm manifest - dependencies, scripts, metadata
├── package-lock.json                # Dependency lockfile - ensures reproducible installations
├── .gitignore                       # Git ignore patterns - excludes node_modules, logs, etc.
├── README.md                        # Project documentation (this file)
│
├── blitzy/                          # Blitzy platform artifacts and documentation
│   └── documentation/               # Comprehensive technical documentation
│       ├── Project Guide.md         # Migration assessment report and validation procedures
│       └── Technical Specifications.md  # Complete technical specifications and design decisions
│
└── node_modules/                    # npm dependencies (68 packages) - excluded from version control
```

### Key Files

| File | Purpose | Modify? |
|------|---------|---------|
| `server.js` | Core application logic with Express routing | Yes - main development file |
| `package.json` | Dependency declarations and npm scripts | Yes - when adding dependencies |
| `package-lock.json` | Dependency version lockfile | No - auto-generated by npm |
| `.gitignore` | Version control exclusions | Rarely - only for new ignore patterns |
| `README.md` | Project documentation | Yes - keep updated with changes |

### Directory Purposes

- **`blitzy/`**: Contains Blitzy platform integration testing artifacts and comprehensive project documentation
- **`blitzy/documentation/`**: Houses detailed migration reports, technical specifications, and validation evidence
- **`node_modules/`**: Auto-generated directory containing all npm dependencies (excluded from Git)

## Development

### Code Syntax Validation

Validate JavaScript syntax without executing the code:

```bash
node -c server.js
```

No output indicates successful validation.

### Dependency Management

**View Dependency Tree:**
```bash
npm list
```

**Check for Outdated Packages:**
```bash
npm outdated
```

**Update Dependencies:**
```bash
npm update
```

**Security Audit:**
```bash
npm audit
```

**Fix Security Issues:**
```bash
npm audit fix
```

### Code Style Guidelines

- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for strings
- **Semicolons**: Required at statement end
- **Module System**: CommonJS (`require`/`module.exports`)
- **Naming**: camelCase for variables and functions

### Adding New Routes

To add a new endpoint, add a route handler in `server.js`:

```javascript
app.get('/your-route', (req, res) => {
  res.send('Your response');
});
```

**Supported HTTP Methods:**
- `app.get()` - GET requests
- `app.post()` - POST requests
- `app.put()` - PUT requests
- `app.delete()` - DELETE requests
- `app.patch()` - PATCH requests

## Testing

### Manual Endpoint Testing

The application can be tested manually using curl commands or a web browser.

#### Test 1: Server Startup

```bash
npm start
```

**Expected:** Console output showing `Server running at http://127.0.0.1:3000/`

#### Test 2: Root Endpoint (/)

```bash
curl http://127.0.0.1:3000/
```

**Expected Output:** `Hello, World!` (with newline)

#### Test 3: Evening Endpoint (/evening)

```bash
curl http://127.0.0.1:3000/evening
```

**Expected Output:** `Good evening`

#### Test 4: 404 Handling

```bash
curl http://127.0.0.1:3000/nonexistent
```

**Expected Output:** `Cannot GET /nonexistent`

#### Test 5: HTTP Method Validation

```bash
curl -X POST http://127.0.0.1:3000/
```

**Expected Output:** `Cannot POST /` (404 response)

### Browser Testing

Open a web browser and navigate to:
- http://127.0.0.1:3000/ (should display "Hello, World!")
- http://127.0.0.1:3000/evening (should display "Good evening")

### Integration Testing

This application serves as a test project for Backprop integration. Refer to `blitzy/documentation/Project Guide.md` for comprehensive validation procedures and acceptance criteria.

## Deployment

### Environment Preparation

Before deploying to production:

1. **Configure Environment Variables**

```bash
export NODE_ENV=production
export JWT_SECRET="your-secure-secret-key"
# Future: export PORT=3000 (currently hardcoded)
```

2. **Install Production Dependencies Only**

```bash
npm ci --production
```

The `npm ci` command performs a clean install using `package-lock.json` for reproducibility.

### Server Binding Considerations

**Current Configuration:**
- **Hostname:** `127.0.0.1` (localhost only - not accessible externally)
- **Port:** `3000` (hardcoded in server.js)

**Production Recommendations:**

For external access, modify `server.js` line 3:

```javascript
// Current (localhost only):
const hostname = '127.0.0.1';

// Production (all interfaces):
const hostname = '0.0.0.0';

// Or use environment variable:
const hostname = process.env.HOST || '0.0.0.0';
```

### Process Management

Use a process manager to ensure the application runs reliably:

#### Option 1: PM2 (Recommended)

```bash
npm install -g pm2
pm2 start server.js --name hao-backprop-test
pm2 save
pm2 startup
```

#### Option 2: systemd (Linux)

Create `/etc/systemd/system/hao-backprop-test.service`:

```ini
[Unit]
Description=Hao Backprop Test API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/hao-backprop-test
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable hao-backprop-test
sudo systemctl start hao-backprop-test
```

### Deployment Checklist

- [ ] Environment variables configured (JWT_SECRET, NODE_ENV)
- [ ] Production dependencies installed (`npm ci --production`)
- [ ] Server hostname set to `0.0.0.0` for external access
- [ ] Process manager configured (PM2 or systemd)
- [ ] Firewall rules allow traffic on port 3000
- [ ] Application logs monitored
- [ ] Health checks configured

## Troubleshooting

### Issue: Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
```

**Solution:**

Find and kill the process using port 3000:

```bash
# Linux/macOS:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or change the port in `server.js`:
```javascript
const port = 3001; // Use different port
```

---

### Issue: Module Not Found

**Symptom:**
```
Error: Cannot find module 'express'
```

**Solution:**

Install dependencies:
```bash
npm install
```

Verify installation:
```bash
npm list express
```

---

### Issue: npm install Fails

**Symptom:**
```
npm ERR! network timeout
```

**Solutions:**

1. **Clear npm cache:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

2. **Use different registry:**
```bash
npm config set registry https://registry.npmjs.org/
npm install
```

3. **Check Node.js version:**
```bash
node --version  # Must be 18.0.0 or higher for Express 5.x
```

---

### Issue: Connection Refused

**Symptom:**
```
curl: (7) Failed to connect to 127.0.0.1 port 3000: Connection refused
```

**Solution:**

1. Verify server is running:
```bash
npm start
```

2. Check server output for startup message:
```
Server running at http://127.0.0.1:3000/
```

3. Verify port and hostname match your curl command

---

### Issue: Cannot Access Server Externally

**Symptom:**
Server works on localhost but not from other machines.

**Solution:**

Change hostname binding in `server.js`:
```javascript
const hostname = '0.0.0.0'; // Listen on all network interfaces
```

## Architecture

### Technology Stack

- **Runtime:** Node.js v20.19.5 (LTS)
- **Framework:** Express.js 5.1.0
- **Module System:** CommonJS (require/module.exports)
- **Package Manager:** npm v10.8.2

### Design Philosophy

This application follows a **minimalist architecture** optimized for:

1. **Educational Value** - Clear, readable code demonstrating Express.js fundamentals
2. **Tutorial Simplicity** - Single-file design reduces cognitive overhead
3. **Production Readiness** - Zero vulnerabilities, clean dependency tree
4. **Integration Testing** - Serves as validation target for Backprop integration

### Framework Rationale

**Why Express.js 5.1.0?**

- **Industry Standard** - Most widely adopted Node.js web framework
- **Mature Ecosystem** - 68 battle-tested dependencies with active maintenance
- **Routing Simplicity** - Declarative route definitions vs. manual request parsing
- **Middleware Architecture** - Extensible request/response pipeline for future features
- **LTS Support** - Long-term stability and security updates

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         Client (Browser / curl / API)           │
└───────────────────┬─────────────────────────────┘
                    │ HTTP Request
                    ▼
┌─────────────────────────────────────────────────┐
│          Express.js Application (app)           │
│  ┌─────────────────────────────────────────┐   │
│  │         Router Middleware Layer         │   │
│  │  ┌────────────┐      ┌──────────────┐  │   │
│  │  │  GET /     │      │ GET /evening │  │   │
│  │  │  Handler   │      │   Handler    │  │   │
│  │  └────────────┘      └──────────────┘  │   │
│  └─────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────┘
                    │ HTTP Response
                    ▼
┌─────────────────────────────────────────────────┐
│         Response (text/html, status 200)        │
└─────────────────────────────────────────────────┘
```

### Single-File Design Decisions

**Advantages:**
- ✅ Zero cognitive overhead - all code visible in one file
- ✅ Rapid prototyping and learning
- ✅ Simple deployment - no build steps or module resolution
- ✅ Easy debugging - no cross-file stack traces

**When to Refactor:**
- ❌ Route count exceeds 10-15 endpoints
- ❌ Business logic becomes complex (>100 lines per handler)
- ❌ Need database integration or external services
- ❌ Shared middleware or utilities emerge

## References

### Comprehensive Documentation

For detailed technical specifications and validation procedures, refer to:

- **[Project Guide](blitzy/documentation/Project%20Guide.md)** - Migration assessment report with validation evidence and testing procedures
- **[Technical Specifications](blitzy/documentation/Technical%20Specifications.md)** - Complete technical contract with design decisions and implementation details

### External Resources

- **[Express.js 5.x Documentation](https://expressjs.com/en/5x/api.html)** - Official framework reference
- **[Node.js Documentation](https://nodejs.org/docs/latest-v20.x/api/)** - Node.js v20 API reference
- **[npm Documentation](https://docs.npmjs.com/)** - Package management guide

### Support and Maintenance

- **Project Repository:** <repository-url>
- **Issue Tracking:** <issues-url>
- **Author:** hxu
- **License:** MIT

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Status:** Production-Ready ✅
