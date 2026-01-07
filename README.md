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

This will install Express.js (^5.1.0), EJS (^3.1.10), and all required dependencies.

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

## UI Routes

The application serves rendered HTML pages at the following endpoints:

### GET `/`

Returns an HTML page with the "Hello, World!" greeting.

**Request:**
```bash
curl -s http://127.0.0.1:3000/
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** Rendered HTML page with greeting, navigation, and styled layout

**Example:**
```bash
curl -s http://127.0.0.1:3000/ | head -5
# Output: <!DOCTYPE html>
#         <html lang="en">
#         ...
```

### GET `/evening`

Returns an HTML page with a themed "Good evening" greeting.

**Request:**
```bash
curl -s http://127.0.0.1:3000/evening
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** Rendered HTML page with evening theme styling

**Example:**
```bash
curl -s http://127.0.0.1:3000/evening | head -5
# Output: <!DOCTYPE html>
#         <html lang="en">
#         ...
```

## API Reference

> **⚠️ Migration Notice:** The original `/` and `/evening` endpoints now serve HTML pages. API consumers requiring plain text responses should use the `/api/*` namespace. See the migration table below.

### API Migration Table

| Original Endpoint | New API Endpoint | Response Type |
|-------------------|------------------|---------------|
| `GET /` | `GET /api/` | Plain text |
| `GET /evening` | `GET /api/evening` | Plain text |

### GET `/api/`

Returns a plain text greeting message.

**Request:**
```bash
curl -s http://127.0.0.1:3000/api/
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** `Hello, World!\n` (14 characters, includes trailing newline)

**Example:**
```bash
curl -s http://127.0.0.1:3000/api/
# Output: Hello, World!
```

### GET `/api/evening`

Returns a plain text evening greeting message.

**Request:**
```bash
curl -s http://127.0.0.1:3000/api/evening
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** `Good evening` (12 characters, no trailing newline)

**Example:**
```bash
curl -s http://127.0.0.1:3000/api/evening
# Output: Good evening
```

### Health Check

Verify all endpoints are operational:

```bash
# UI Routes (HTML responses)
curl -s http://127.0.0.1:3000/ | grep -q "Hello" && echo "UI Root OK"
curl -s http://127.0.0.1:3000/evening | grep -q "evening" && echo "UI Evening OK"

# API Routes (plain text responses)
curl -s http://127.0.0.1:3000/api/ && echo " - API Root OK"
curl -s http://127.0.0.1:3000/api/evening && echo " - API Evening OK"
```

## Project Structure

```
hao-backprop-test/
├── server.js                    # Entry point - HTTP server binding
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── .env.example                 # Environment variable template
├── public/                      # Static assets directory
│   ├── css/
│   │   ├── styles.css          # Main stylesheet
│   │   └── evening.css         # Evening theme styles
│   ├── js/
│   │   └── main.js             # Client-side JavaScript
│   └── images/
│       └── .gitkeep            # Directory placeholder
├── views/                       # EJS template files
│   ├── layout.ejs              # Base HTML layout template
│   ├── index.ejs               # Home page template
│   ├── evening.ejs             # Evening page template
│   └── partials/
│       ├── header.ejs          # Reusable navigation header
│       └── footer.ejs          # Reusable page footer
└── src/                         # Application source root
    ├── app.js                   # Express application factory
    ├── config/                  # Configuration module
    │   └── index.js             # Environment variable management
    └── routes/                  # Routing surface
        ├── index.js             # Route aggregator (barrel pattern)
        ├── main.routes.js       # API route handlers (plain text)
        └── ui.routes.js         # UI route handlers (HTML pages)
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app and binds it to the configured host/port |
| `src/app.js` | Express application factory - creates and exports configured Express app with view engine, static middleware, and mounted routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env, viewsDir, publicDir }` from environment variables |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports |
| `src/routes/main.routes.js` | API route handlers - implements GET `/api/` and GET `/api/evening` endpoints (plain text) |
| `src/routes/ui.routes.js` | UI route handlers - implements GET `/` and GET `/evening` endpoints (HTML pages) |

### View Templates

| File | Purpose |
|------|---------|
| `views/layout.ejs` | Base HTML structure with head, CSS/JS includes, and body wrapper |
| `views/index.ejs` | Home page template extending layout, displays "Hello, World!" greeting |
| `views/evening.ejs` | Evening page template extending layout, displays themed "Good evening" greeting |
| `views/partials/header.ejs` | Reusable navigation header with links to Home and Evening pages |
| `views/partials/footer.ejs` | Reusable footer with copyright and project info |

### Static Assets

| File | Purpose |
|------|---------|
| `public/css/styles.css` | Base styles including reset, typography, layout, and navigation |
| `public/css/evening.css` | Evening theme styles with dark background and night colors |
| `public/js/main.js` | Client-side JavaScript for interactive functionality |

## Environment Variables

The application supports the following environment variables for configuration:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `VIEWS_DIR` | `'./views'` | Custom views directory path for EJS templates. |
| `PUBLIC_DIR` | `'./public'` | Custom public assets directory path for static files (CSS, JS, images). |

### Configuration Examples

**Development (default):**
```bash
npm start
# Binds to http://127.0.0.1:3000/
# Uses ./views for templates
# Uses ./public for static assets
```

**Production deployment:**
```bash
HOST=0.0.0.0 PORT=80 NODE_ENV=production npm start
# Binds to http://0.0.0.0:80/
# Template caching enabled in production
```

**Custom port:**
```bash
PORT=8080 npm start
# Binds to http://127.0.0.1:8080/
```

**Custom views and assets directories:**
```bash
VIEWS_DIR=/app/templates PUBLIC_DIR=/app/static npm start
# Uses custom paths for views and static assets
```

## Architecture

This project follows a modular Express.js architecture with separation of concerns:

```
Request Flow:

UI Routes (HTML):
Client → server.js → Express App → Static Middleware → UI Router → EJS Engine → HTML Response
                                                              ↓
                                                         views/*.ejs

API Routes (Plain Text):
Client → server.js → Express App → API Router → Text Response

                           ↑
                     Configuration
                   (src/config/index.js)
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` aggregates route exports for clean imports
- **Template Inheritance**: `views/layout.ejs` provides reusable HTML structure for all pages
- **Partials Pattern**: `views/partials/*.ejs` provide reusable UI components (header, footer)
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `ejs` | ^3.1.10 | Template engine for server-side HTML rendering |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify express installation
npm ls express
# Expected: express@5.1.0

# Verify EJS installation
npm ls ejs
# Expected: ejs@3.1.10
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

*This is a tutorial project demonstrating full-stack Node.js development with Express.js framework and EJS templating.*
