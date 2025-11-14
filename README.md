# Express.js Hello World Application

A professionally structured Express.js application demonstrating best practices for code organization, maintainability, and scalability. This project showcases a modular three-layer architecture with comprehensive documentation and production-ready patterns.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **Modular Architecture**: Three-layer separation of concerns (routes, application, configuration)
- **Express.js 5.1.0**: Latest stable version of the Express framework
- **Comprehensive JSDoc**: Inline documentation with type annotations for all functions
- **Environment Configuration**: Support for environment variables (HOST, PORT)
- **Production-Ready**: Enterprise-grade code structure and patterns
- **Zero Dependencies**: Minimal footprint with only Express.js as a dependency

## Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js**: v20.19.5 or higher
- **npm**: v10.8.2 or higher

You can verify your installations with:

```bash
node --version
npm --version
```

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hao-backprop-test
```

### 2. Install Dependencies

Use `npm ci` for a clean, deterministic installation:

```bash
npm ci
```

Alternatively, you can use:

```bash
npm install
```

### 3. Verify Installation

Check that all dependencies are installed correctly:

```bash
npm list --depth=0
```

You should see `express@5.1.0` listed.

### 4. Start the Server

```bash
npm start
```

You should see:

```
Server running at http://127.0.0.1:3000/
```

### 5. Test the Application

Open your browser or use curl:

```bash
curl http://localhost:3000/
# Output: Hello, World!

curl http://localhost:3000/evening
# Output: Good evening
```

## API Documentation

The application provides two simple HTTP endpoints:

### Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/` | Root endpoint returning a greeting | `"Hello, World!\n"` |
| GET | `/evening` | Evening greeting endpoint | `"Good evening"` |

### GET /

Returns a hello world greeting message.

**Request:**

```bash
curl -i http://localhost:3000/
```

**Response:**

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 14

Hello, World!
```

**Response Body:** `"Hello, World!\n"` (includes trailing newline)

**Status Code:** `200 OK`

### GET /evening

Returns an evening greeting message.

**Request:**

```bash
curl -i http://localhost:3000/evening
```

**Response:**

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 12

Good evening
```

**Response Body:** `"Good evening"` (no trailing newline)

**Status Code:** `200 OK`

### Error Responses

**404 Not Found** - For undefined routes:

```bash
curl -i http://localhost:3000/undefined
# HTTP/1.1 404 Not Found
```

## Development

### Running the Development Server

Start the server in development mode:

```bash
npm start
```

Or use the dev alias:

```bash
npm run dev
```

### Available npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Start the production server |
| `dev` | `node server.js` | Start the development server (alias) |
| `test` | `echo "Error: no test specified" && exit 1` | Placeholder for future tests |

### Environment Variables

Configure the server using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Server hostname/IP address |
| `PORT` | `3000` | Server port number |

**Example:**

```bash
HOST=0.0.0.0 PORT=8080 npm start
```

## Deployment

### Local Deployment

The application runs locally by default:

```bash
npm start
# Server running at http://127.0.0.1:3000/
```

### Heroku Deployment

1. Create a Heroku app:

```bash
heroku create your-app-name
```

2. Heroku automatically detects the `package.json` and uses `npm start`

3. Deploy:

```bash
git push heroku main
```

4. Open your app:

```bash
heroku open
```

**Note:** Heroku sets the `PORT` environment variable automatically.

### AWS EC2 Deployment

1. SSH into your EC2 instance

2. Install Node.js v20.19.5:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Clone and setup:

```bash
git clone <repository-url>
cd hao-backprop-test
npm ci
```

4. Run with PM2 (process manager):

```bash
sudo npm install -g pm2
pm2 start server.js --name express-app
pm2 save
pm2 startup
```

### Docker Deployment

Create a `Dockerfile` (not included in this repository):

```dockerfile
FROM node:20.19.5-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t express-hello-world .
docker run -p 3000:3000 express-hello-world
```

## Project Structure

The application follows a modular three-layer architecture:

```
/
├── .gitignore                          # Git exclusion patterns
├── README.md                           # This file
├── package.json                        # NPM package manifest
├── package-lock.json                   # Deterministic dependency lock
├── server.js                           # Application entry point
└── src/
    ├── app.js                          # Express application configuration
    ├── config/
    │   └── server.config.js            # Server configuration constants
    └── routes/
        └── index.routes.js             # Route definitions and handlers
```

### File Responsibilities

- **`server.js`**: Minimal entry point that imports the configured app and starts the HTTP server
- **`src/app.js`**: Creates and configures the Express application instance, mounts routes
- **`src/config/server.config.js`**: Centralized configuration with environment variable support
- **`src/routes/index.routes.js`**: Route definitions with comprehensive JSDoc documentation

### Architecture Benefits

- **Separation of Concerns**: Each file has a single, clear responsibility
- **Testability**: Modules can be tested independently
- **Maintainability**: Easy to locate and modify specific functionality
- **Scalability**: Simple to add new routes, middleware, or configuration

## Contributing

Contributions are welcome! Please follow these guidelines:

### Code Style

- Follow existing code structure and patterns
- Add JSDoc comments for all functions
- Use meaningful variable and function names
- Maintain consistent indentation (2 spaces)

### Commit Messages

Use conventional commit format:

```
<type>: <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Example:**

```
feat: add new endpoint for user greetings

Implements GET /user/:name endpoint that returns personalized greeting

Closes #123
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:** Change the port using environment variable:

```bash
PORT=8080 npm start
```

Or find and kill the process using port 3000:

```bash
# On Linux/macOS
lsof -ti:3000 | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Module Not Found

**Error:** `Error: Cannot find module './src/app'`

**Solution:** Ensure all files are in correct locations and run:

```bash
npm ci
```

### Node Version Mismatch

**Error:** Incompatibility warnings during `npm install`

**Solution:** Use Node.js v20.19.5:

```bash
# Using nvm (Node Version Manager)
nvm install 20.19.5
nvm use 20.19.5
```

### Dependencies Not Installing

**Solution:** Clear npm cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2024

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

## Author

**hxu**

---

**Note**: This is a refactored version of the original hao-backprop-test project, now following Express.js best practices with modular architecture and comprehensive documentation.
