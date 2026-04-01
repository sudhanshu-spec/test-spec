# Configuration Module

This module serves as the **Configuration Layer** of the Express.js four-layer architecture (Entry → Application → Routing → Configuration). Following the [Twelve-Factor App](https://12factor.net/config) methodology for configuration externalization, it reads environment variables at startup and provides sensible defaults, so the application works out of the box while remaining easy to configure for different environments.

## Environment Variables

| Variable   | Default         | Description              |
|------------|-----------------|--------------------------|
| `HOST`     | `'127.0.0.1'`   | Server binding address   |
| `PORT`     | `3000`          | Server port number       |
| `NODE_ENV` | `'development'` | Application environment  |

## How It Works

- **Synchronous evaluation on first `require()`** — Configuration values are computed immediately when the module is first loaded. There are no async operations, so the exported config object is available the instant `require()` returns.
- **Node.js module caching** — After the initial `require()`, Node.js caches the module. All subsequent consumers receive the same config object, ensuring consistent configuration across the entire application.
- **PORT parsing** — Uses `parseInt(process.env.PORT, 10)` with explicit radix-10 enforcement. If `process.env.PORT` is invalid, empty, or unset, the logical OR fallback yields the default `3000`. Decimal strings such as `"3000.5"` are truncated to the integer portion (`3000`) by `parseInt`.
- **String defaults via logical OR** — `process.env.HOST || '127.0.0.1'` and `process.env.NODE_ENV || 'development'` provide fallback values when the corresponding environment variables are not set.
- **CommonJS module system** — The module uses `module.exports` to expose the configuration object. No ESM `import`/`export` syntax is used.

## Usage

From within the `src/` directory (e.g., in `src/app.js` or other source modules):

```javascript
const config = require('./config');
console.log(config.host, config.port, config.env);
```

From the project root (e.g., in `server.js`, the Entry Layer):

```javascript
const config = require('./src/config');
app.listen(config.port, config.host, () => {
  console.log(`Server running at http://${config.host}:${config.port}/`);
});
```

Set environment variables before starting the server to override defaults:

```bash
HOST=0.0.0.0 PORT=8080 NODE_ENV=production node server.js
```

## Cross-File Dependencies

This configuration module is referenced by the following files across the project:

| Consumer File | Import Pattern | Purpose |
|---------------|---------------|---------|
| `server.js` | `const config = require('./src/config')` | Provides `host`, `port`, and `env` for Express app binding and startup logging |
| `tests/lifecycle/server.test.js` | `jest.doMock('../../src/config', ...)` | Mocks configuration values to isolate server lifecycle tests from real environment |
| `tests/unit/config.test.js` | `require('../../src/config')` (with `jest.resetModules()`) | Directly tests default values, environment variable overrides, and edge cases |
