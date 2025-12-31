# Hello World Express Server

A minimal Express.js web server demonstrating basic HTTP routing with two GET endpoints. This project serves as a tutorial example for learning Node.js and Express.js fundamentals.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Express Version](https://img.shields.io/badge/express-5.1.0-blue)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Code Explanation](#code-explanation)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🚀 Express.js 5.1.0 web framework
- 📡 Two HTTP GET endpoints
- 📝 Comprehensive JSDoc documentation
- 🔧 Simple configuration
- 📦 Minimal dependencies

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Minimum Version | Recommended | Check Command |
|-------------|-----------------|-------------|---------------|
| Node.js | 18.0.0 | 20.x LTS | `node --version` |
| npm | 8.0.0 | 10.x | `npm --version` |

### Verifying Prerequisites

```bash
# Check Node.js version
node --version
# Expected output: v18.x.x or v20.x.x

# Check npm version
npm --version
# Expected output: 8.x.x or 10.x.x or 11.x.x
```

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd hello_world
```

### Step 2: Install Dependencies

```bash
npm install
```

This command installs Express.js and its 68 transitive dependencies as defined in `package.json`.

### Step 3: Verify Installation

```bash
# Check Express is installed
npm list express
# Expected: express@5.1.0
```

## Quick Start

### Starting the Server

```bash
# Using npm script (recommended)
npm start

# Or directly with Node.js
node server.js
```

### Expected Output

```
Server running at http://127.0.0.1:3000/
```

### Testing the Endpoints

Open a new terminal and run:

```bash
# Test the root endpoint
curl http://127.0.0.1:3000/
# Output: Hello, World!

# Test the evening endpoint
curl http://127.0.0.1:3000/evening
# Output: Good evening
```

Or open your browser and navigate to:
- http://127.0.0.1:3000/ - See "Hello, World!"
- http://127.0.0.1:3000/evening - See "Good evening"

## API Documentation

### Endpoints Overview

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| GET | `/` | Root endpoint | `Hello, World!\n` |
| GET | `/evening` | Evening greeting | `Good evening` |

### GET /

Returns a "Hello, World!" greeting.

**Request:**
```http
GET / HTTP/1.1
Host: 127.0.0.1:3000
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 14

Hello, World!
```

**Example with curl:**
```bash
curl -i http://127.0.0.1:3000/
```

### GET /evening

Returns a "Good evening" greeting.

**Request:**
```http
GET /evening HTTP/1.1
Host: 127.0.0.1:3000
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 12

Good evening
```

**Example with curl:**
```bash
curl -i http://127.0.0.1:3000/evening
```

### Error Responses

For undefined routes, Express returns a 404 response:

```http
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html>
<head><title>Not Found</title></head>
<body>Cannot GET /undefined-path</body>
</html>
```

## Project Structure

```
hello_world/
├── server.js           # Main application entry point
├── package.json        # Project manifest and dependencies
├── package-lock.json   # Dependency lock file
├── .gitignore          # Git ignore patterns
├── README.md           # This documentation file
└── blitzy/
    └── documentation/  # Technical specifications
        ├── Project Guide.md
        └── Technical Specifications.md
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Express application with route handlers |
| `package.json` | npm manifest defining project metadata and dependencies |
| `package-lock.json` | Lockfile ensuring reproducible dependency installation |
| `.gitignore` | Excludes node_modules, .env files, logs from version control |

## Code Explanation

### server.js Walkthrough

The server implementation follows Express.js best practices:

#### 1. Import Express Framework

```javascript
const express = require('express');
```
- Uses CommonJS `require()` syntax
- Imports the Express.js module from node_modules

#### 2. Configuration Constants

```javascript
const hostname = '127.0.0.1';
const port = 3000;
```
- `hostname`: The IP address to bind to (localhost only)
- `port`: The TCP port to listen on (3000 is standard for development)

#### 3. Create Express Application

```javascript
const app = express();
```
- Calls the Express factory function
- Returns an Express application instance
- This `app` object is used to configure routes and middleware

#### 4. Define Route Handlers

```javascript
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});
```
- `app.get(path, handler)`: Registers a GET route
- `req`: Express Request object with request details
- `res`: Express Response object for sending responses
- `res.send()`: Sends the response body and sets appropriate headers

#### 5. Start the Server

```javascript
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
```
- Binds to the specified hostname and port
- Callback fires when server is ready to accept connections
- Logs startup message for confirmation

## Configuration

### Current Configuration (Hardcoded)

| Setting | Value | Description |
|---------|-------|-------------|
| Hostname | `127.0.0.1` | Localhost only binding |
| Port | `3000` | HTTP listening port |

### Environment-Based Configuration (Recommended for Production)

To make the server configurable via environment variables, modify `server.js`:

```javascript
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;
```

Then start with:
```bash
PORT=8080 HOST=0.0.0.0 npm start
```

### Available Environment Variables

| Variable | Description | Current Usage |
|----------|-------------|---------------|
| `DB` | Database connection string | Not used |
| `DB_HOST` | Database host | Not used |
| `Host` | Server host override | Not used |

## Development

### Development Workflow

1. **Make changes** to `server.js`
2. **Stop the server** (Ctrl+C)
3. **Restart**: `npm start`
4. **Test endpoints**: `curl http://127.0.0.1:3000/`

### Adding New Endpoints

To add a new endpoint, add a route handler in `server.js`:

```javascript
/**
 * @name GET /morning
 * @description Morning greeting endpoint
 */
app.get('/morning', (req, res) => {
  res.send('Good morning');
});
```

### Code Style

This project follows these conventions:
- **Module format**: CommonJS (`require`/`module.exports`)
- **Semicolons**: Yes
- **Quotes**: Single quotes for strings
- **Indentation**: 2 spaces

## Testing

### Manual Testing

```bash
# Start the server
npm start &

# Test root endpoint
curl http://127.0.0.1:3000/
# Expected: Hello, World!

# Test evening endpoint
curl http://127.0.0.1:3000/evening
# Expected: Good evening

# Stop the server
pkill -f "node server.js"
```

### Automated Testing Script

Create `test.sh`:

```bash
#!/bin/bash
set -e

# Start server in background
node server.js &
SERVER_PID=$!
sleep 2

# Test endpoints
HELLO=$(curl -s http://127.0.0.1:3000/)
EVENING=$(curl -s http://127.0.0.1:3000/evening)

# Validate responses
if [ "$HELLO" = "Hello, World!" ]; then
    echo "✓ Root endpoint OK"
else
    echo "✗ Root endpoint FAILED"
    exit 1
fi

if [ "$EVENING" = "Good evening" ]; then
    echo "✓ Evening endpoint OK"
else
    echo "✗ Evening endpoint FAILED"
    exit 1
fi

# Cleanup
kill $SERVER_PID
echo "All tests passed!"
```

Run with: `chmod +x test.sh && ./test.sh`

## Deployment Guide

### Option 1: Traditional Server Deployment

#### Prerequisites
- Linux server with Node.js 18+ installed
- SSH access to the server

#### Deployment Steps

1. **Transfer files to server:**
```bash
scp -r ./* user@server:/opt/hello_world/
```

2. **Install dependencies on server:**
```bash
ssh user@server
cd /opt/hello_world
npm install --production
```

3. **Start with PM2 (Process Manager):**
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name hello-world

# Configure auto-restart on reboot
pm2 startup
pm2 save
```

4. **Configure reverse proxy (Nginx):**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: Docker Deployment

#### Create Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY server.js ./

# Expose port
EXPOSE 3000

# Set environment
ENV HOST=0.0.0.0
ENV PORT=3000

# Start application
CMD ["node", "server.js"]
```

#### Build and Run

```bash
# Build image
docker build -t hello-world-express .

# Run container
docker run -d -p 3000:3000 --name hello-app hello-world-express

# Check logs
docker logs hello-app
```

### Option 3: Cloud Platform Deployment

#### Heroku

```bash
# Create Procfile
echo "web: node server.js" > Procfile

# Deploy
heroku create
git push heroku main
```

**Note:** Modify `server.js` to use `process.env.PORT` for Heroku.

#### AWS Elastic Beanstalk

1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init`
3. Create environment: `eb create production`
4. Deploy: `eb deploy`

#### Railway/Render

Connect your GitHub repository and configure:
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Production Checklist

- [ ] Use environment variables for configuration
- [ ] Change hostname to `0.0.0.0` for external access
- [ ] Add HTTPS/TLS (via reverse proxy or cloud provider)
- [ ] Implement health check endpoint (`/health`)
- [ ] Add request logging middleware
- [ ] Configure process manager (PM2/systemd)
- [ ] Set up monitoring and alerting
- [ ] Configure firewall rules

## Troubleshooting

### Common Issues

#### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 node server.js
```

#### Module Not Found

**Error:** `Error: Cannot find module 'express'`

**Solution:**
```bash
# Install dependencies
npm install
```

#### Permission Denied (Ports < 1024)

**Error:** `Error: listen EACCES: permission denied 0.0.0.0:80`

**Solution:**
```bash
# Use port 3000+ or run with sudo (not recommended)
# Better: Use reverse proxy (Nginx) to forward port 80 to 3000
```

#### Connection Refused

**Error:** Browser shows "Connection refused"

**Solution:**
1. Verify server is running: `ps aux | grep node`
2. Check the correct URL: `http://127.0.0.1:3000/`
3. Ensure firewall allows connections

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-endpoint`
3. Make your changes
4. Commit: `git commit -m "Add new endpoint"`
5. Push: `git push origin feature/new-endpoint`
6. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 hxu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Quick Reference

```bash
# Install
npm install

# Start
npm start

# Test endpoints
curl http://127.0.0.1:3000/        # Hello, World!
curl http://127.0.0.1:3000/evening # Good evening
```

**Questions?** Open an issue in the repository.
