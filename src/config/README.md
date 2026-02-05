# Configuration Module

This module centralizes all application configuration, following the Twelve-Factor App methodology. It reads environment variables at startup and provides sensible defaults, so your app works out of the box while remaining easy to configure for different environments.

## Environment Variables

| Variable   | Default         | Description              |
|------------|-----------------|--------------------------|
| `HOST`     | `'127.0.0.1'`   | Server binding address   |
| `PORT`     | `3000`          | Server port number       |
| `NODE_ENV` | `'development'` | Application environment  |

## How It Works

The module synchronously reads environment variables when you `require()` it—no async operations, so configuration is available immediately.

- Uses the `process.env.HOST || '127.0.0.1'` pattern for string defaults
- Parses PORT as an integer with explicit radix 10: `parseInt(process.env.PORT, 10) || 3000`
- Falls back to `'development'` if NODE_ENV isn't set

## Usage

```javascript
const config = require('./config');
console.log(config.host, config.port, config.env);

// Or destructure from project root:
const { host, port, env } = require('./src/config');
```

Set environment variables before starting the server to override defaults:

```bash
HOST=0.0.0.0 PORT=8080 NODE_ENV=production node server.js
```
