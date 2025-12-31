# Hello World Express Server

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.1.0-blue)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple, lightweight Express.js server demonstrating basic HTTP routing with two endpoints. This project serves as an educational example for learning Express.js fundamentals.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Code Explanation](#code-explanation)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Express.js 5.x** - Latest version with async error handling support
- **Two REST Endpoints** - Simple GET endpoints demonstrating routing
- **Minimal Dependencies** - Clean, lightweight implementation
- **Well-Documented** - Comprehensive JSDoc comments and inline explanations

## Prerequisites

Before running this project, ensure you have the following installed:

| Requirement | Minimum Version | Recommended | Check Command |
|-------------|-----------------|-------------|---------------|
| Node.js | v18.0.0 | v20.x LTS | `node --version` |
| npm | v8.0.0 | v10.x | `npm --version` |

### Verify Installation

```bash
# Check Node.js version (must be 18+)
node --version

# Check npm version
npm --version
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hello_world
```

### 2. Install Dependencies

```bash
# Install all project dependencies
npm install

# Verify Express.js is installed
npm list express
# Expected output: express@5.1.0
```

### 3. Verify Installation

```bash
# Check for security vulnerabilities
npm audit

# Fix any vulnerabilities (if found)
npm audit fix
```

## Running the Server

### Development Mode

```bash
# Using npm script
npm start

# Or directly with Node.js
node server.js
```

**Expected Output:**
```
Server running at http://127.0.0.1:3000/
```

### Testing the Endpoints

Open a new terminal and test the endpoints:

```bash
# Test root endpoint
curl http://127.0.0.1:3000/
# Expected: Hello, World!

# Test evening endpoint
curl http://127.0.0.1:3000/evening
# Expected: Good evening
```

### Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## API Documentation

### Base URL

```
http://127.0.0.1:3000
```

### Endpoints

#### GET /

Returns a greeting message.

| Property | Value |
|----------|-------|
| **URL** | `/` |
| **Method** | `GET` |
| **Content-Type** | `text/html; charset=utf-8` |
| **Success Response** | `200 OK` |

**Request Example:**
```bash
curl -X GET http://127.0.0.1:3000/
```

**Response:**
```
Hello, World!
```

---

#### GET /evening

Returns an evening greeting message.

| Property | Value |
|----------|-------|
| **URL** | `/evening` |
| **Method** | `GET` |
| **Content-Type** | `text/html; charset=utf-8` |
| **Success Response** | `200 OK` |

**Request Example:**
```bash
curl -X GET http://127.0.0.1:3000/evening
```

**Response:**
```
Good evening
```

---

### Error Responses

For undefined routes, Express returns a default 404 response:

```bash
curl http://127.0.0.1:3000/undefined
# Response: Cannot GET /undefined (404 Not Found)
```

## Project Structure

```
hello_world/
├── server.js           # Main application entry point
├── package.json        # NPM manifest and dependencies
├── package-lock.json   # Dependency lockfile for reproducible builds
├── .gitignore          # Git ignore patterns
├── README.md           # This documentation file
└── node_modules/       # Installed dependencies (generated)
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Express application with route handlers |
| `package.json` | Project configuration, scripts, and dependencies |
| `package-lock.json` | Locked dependency versions for consistent installs |
| `.gitignore` | Prevents node_modules and env files from being committed |

## Code Explanation

### server.js - Line by Line

```javascript
/**
 * Import Express.js framework
 * Express provides routing, middleware, and HTTP utilities
 */
const express = require('express');

/**
 * Configuration constants
 * hostname: '127.0.0.1' binds to localhost only
 * port: 3000 is the standard Node.js development port
 */
const hostname = '127.0.0.1';
const port = 3000;

/**
 * Create Express application instance
 * The app object handles all routing and middleware
 */
const app = express();

/**
 * Root route handler
 * app.get() registers a handler for HTTP GET requests
 * '/' matches the root path
 * The callback receives (request, response) objects
 * res.send() sends the response and sets appropriate headers
 */
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * Same pattern as root, but matches '/evening' path
 */
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

/**
 * Start the server
 * app.listen() binds to the specified port and hostname
 * The callback runs once the server is listening
 */
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
```

### Key Concepts

1. **Express Application Factory**: `express()` creates an application instance
2. **Route Handlers**: `app.get(path, handler)` defines GET endpoint behavior
3. **Request/Response**: Express wraps Node.js objects with additional methods
4. **res.send()**: Automatically sets Content-Type and Content-Length headers

## Deployment Guide

### Local Development

The default configuration binds to `127.0.0.1` (localhost), which is suitable for development.

### Production Deployment

For production deployment, consider these modifications:

#### 1. Environment Variables

```javascript
// server.js - Production configuration
const hostname = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3000;
```

#### 2. Docker Deployment

Create a `Dockerfile`:

```dockerfile
# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY server.js .

# Expose port
EXPOSE 3000

# Set non-root user for security
USER node

# Start the application
CMD ["node", "server.js"]
```

Build and run:

```bash
# Build Docker image
docker build -t hello-world-express .

# Run container
docker run -p 3000:3000 hello-world-express
```

#### 3. Process Manager (PM2)

For production Node.js applications, use PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start server.js --name hello-world

# Enable startup script
pm2 startup

# Save process list
pm2 save
```

#### 4. Reverse Proxy (Nginx)

For production, place Nginx in front of Node.js:

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Recommendations

For production deployments, consider adding:

1. **Helmet.js** - Security headers
   ```bash
   npm install helmet
   ```

2. **Rate Limiting** - Prevent abuse
   ```bash
   npm install express-rate-limit
   ```

3. **HTTPS** - Use TLS certificates via reverse proxy

4. **Environment Variables** - Never hardcode secrets

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Error: listen EADDRINUSE: address already in use :::3000

# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 node server.js
```

#### Module Not Found

```bash
# Error: Cannot find module 'express'

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Permission Denied

```bash
# Error: EACCES permission denied

# Don't use sudo - fix npm permissions instead
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

#### Node.js Version Too Old

```bash
# Error: express requires Node.js 18+

# Check version
node --version

# Install Node.js 20 LTS using nvm
nvm install 20
nvm use 20
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use ES6+ JavaScript features
- Add JSDoc comments for all functions
- Follow Express.js best practices
- Test all endpoints before submitting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Start the server |
| `npm test` | Run tests (not configured) |
| `curl http://127.0.0.1:3000/` | Test root endpoint |
| `curl http://127.0.0.1:3000/evening` | Test evening endpoint |

**Author:** hxu  
**Version:** 1.0.0
