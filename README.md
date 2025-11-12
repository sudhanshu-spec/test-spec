# Hello World Express.js Application

A professionally structured Express.js web application demonstrating modern Node.js development practices with modular architecture, comprehensive documentation, and production-ready code organization.

## Features

- **Modular Architecture**: Three-layer architecture with separation of concerns (routes, application, configuration)
- **Express.js 5.1.0**: Built on the latest stable Express.js framework
- **JSDoc Documentation**: Comprehensive inline documentation with type annotations
- **Environment Configuration**: Support for environment-specific settings
- **Production-Ready**: Clean code structure following industry best practices

## Technology Stack

- **Runtime**: Node.js v20.19.5
- **Framework**: Express.js 5.1.0
- **Package Manager**: npm v10.8.2
- **Module System**: CommonJS (require/module.exports)

## Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js**: v20.19.5 or higher
  ```bash
  node --version
  ```

- **npm**: v10.8.2 or higher
  ```bash
  npm --version
  ```

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hao-backprop-test
```

### 2. Install Dependencies

```bash
npm ci
```

This installs Express.js 5.1.0 and all transitive dependencies (69 packages total) using the locked versions from `package-lock.json`.

### 3. Verify Installation

```bash
node -c server.js
```

This validates the JavaScript syntax without executing the application.

## API Documentation

### Available Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/` | Root endpoint returning greeting message | `"Hello, World!\n"` |
| GET | `/evening` | Evening greeting endpoint | `"Good evening"` |

### Endpoint Details

#### GET /

Returns a friendly greeting message.

**Request:**
```bash
curl http://localhost:3000/
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

Hello, World!
```

**Status Code**: 200 OK

#### GET /evening

Returns an evening greeting message.

**Request:**
```bash
curl http://localhost:3000/evening
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

Good evening
```

**Status Code**: 200 OK

### Error Handling

**404 Not Found** - Returned for undefined routes:
```bash
curl http://localhost:3000/undefined
# Response: Cannot GET /undefined
```

## Development

### Running the Application

Start the development server:

```bash
npm start
```

Or use the dev alias:

```bash
npm run dev
```

Both commands start the Express server on `http://127.0.0.1:3000/`

**Expected Output:**
```
Server running at http://127.0.0.1:3000/
```

### Available npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Start the production server |
| `dev` | `node server.js` | Start the development server (alias) |
| `test` | `echo "Error: no test specified" && exit 1` | Placeholder for test command |

### Environment Variables

The application supports the following environment variables:

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
```

Access at: `http://127.0.0.1:3000/`

### Heroku Deployment

1. Create a Heroku app:
```bash
heroku create your-app-name
```

2. Deploy:
```bash
git push heroku main
```

3. Open the application:
```bash
heroku open
```

**Note**: Heroku automatically sets the `PORT` environment variable.

### AWS EC2 Deployment

1. Connect to your EC2 instance:
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

2. Install Node.js v20.19.5:
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

3. Clone and setup:
```bash
git clone <repository-url>
cd hao-backprop-test
npm ci
```

4. Run with PM2 (recommended):
```bash
npm install -g pm2
pm2 start server.js --name hello-world
pm2 save
pm2 startup
```

### Docker Deployment

Create a `Dockerfile`:

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
docker build -t hello-world-app .
docker run -p 3000:3000 hello-world-app
```

## Project Structure

```
/
├── .gitignore                          # Git exclusion patterns
├── README.md                           # This documentation file
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

### Architecture Explanation

**Three-Layer Architecture:**

1. **Configuration Layer** (`src/config/`)
   - Centralizes server settings
   - Supports environment variable overrides
   - Provides default values

2. **Application Layer** (`src/app.js`)
   - Creates and configures Express instance
   - Registers middleware
   - Mounts route modules

3. **Routing Layer** (`src/routes/`)
   - Defines HTTP endpoints
   - Implements request handlers
   - Uses Express Router for modularity

4. **Entry Point** (`server.js`)
   - Minimal orchestration file
   - Imports configured app
   - Starts HTTP server

## Troubleshooting

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**: Kill the process using port 3000 or use a different port:
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=8080 npm start
```

### Module Not Found

**Error**: `Cannot find module './src/app'`

**Solution**: Ensure all source files exist:
```bash
ls -la src/
ls -la src/config/
ls -la src/routes/
```

### Dependencies Not Installed

**Error**: `Cannot find module 'express'`

**Solution**: Install dependencies:
```bash
npm ci
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

### Commit Message Convention

Use conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions or updates
- `chore:` - Maintenance tasks

## License

MIT License - see LICENSE file for details

## Author

**hxu**

---

**Project**: hao-backprop-test  
**Version**: 1.0.0  
**Last Updated**: 2024
