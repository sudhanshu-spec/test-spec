# Configuration Module

This module centralizes all application configuration, following the [Twelve-Factor App](https://12factor.net/config) methodology. All runtime configuration is externalized to environment variables — no hardcoded deployment parameters exist in source code. The module reads environment variables at startup and provides sensible defaults, so your app works out of the box while remaining easy to configure for different environments.

## Twelve-Factor Compliance

The Twelve-Factor App methodology requires strict separation of configuration from code. Configuration varies between deployments (development, staging, production), but code does not. By externalizing all runtime parameters to environment variables:

- **Portability:** The same codebase runs in any environment without code changes.
- **Security:** Deployment-specific values (hostnames, ports) are never committed to version control.
- **Simplicity:** Operators can reconfigure the application without rebuilding or redeploying code.

This module enforces this principle by reading exclusively from `process.env` and providing safe fallback defaults for local development.

## Environment Variable Contracts

| Variable   | Type     | Default         | Description              |
|------------|----------|-----------------|--------------------------|
| `HOST`     | `string` | `'127.0.0.1'`   | Server binding address   |
| `PORT`     | `number` | `3000`          | Server port number       |
| `NODE_ENV` | `string` | `'development'` | Application environment  |

All variables are optional. When omitted, the module falls back to the documented defaults.

## Safe Defaults

When environment variables are missing or unset, the module applies safe defaults suitable for local development:

- **`HOST`** → `'127.0.0.1'` — Binds to the loopback interface only, preventing unintended network exposure.
- **`PORT`** → `3000` — A conventional development port that avoids conflicts with privileged ports (below 1024).
- **`NODE_ENV`** → `'development'` — Signals development mode to Express and other environment-aware libraries.

These defaults ensure the server starts correctly with zero configuration, following the principle of least surprise.

## How It Works

The module synchronously reads environment variables when you `require()` it — no async operations, so configuration is available immediately.

- **HOST:** Uses the `process.env.HOST || '127.0.0.1'` pattern. If `HOST` is set, its string value is used directly; otherwise, the default `'127.0.0.1'` is applied.
- **PORT:** Parsed as an integer with explicit radix-10: `parseInt(process.env.PORT, 10) || 3000`. The `parseInt` function is called with radix `10` to prevent octal or hexadecimal interpretation. If `process.env.PORT` is undefined, empty, or non-numeric (e.g., `PORT=abc`, `PORT=''`), `parseInt` returns `NaN`, and the `||` operator causes a fallback to the default value `3000`.
- **NODE_ENV:** Uses the `process.env.NODE_ENV || 'development'` pattern. Falls back to `'development'` if `NODE_ENV` is not set.

### Port Parsing Behavior

The `PORT` variable receives special handling because it must be a valid integer for `app.listen()`:

1. `process.env.PORT` is read as a string (all environment variables are strings).
2. `parseInt(value, 10)` parses the string with an explicit radix of 10 (decimal).
3. If the string is a valid decimal integer (e.g., `'8080'`), the parsed number is used.
4. If the string is empty (`''`), non-numeric (`'abc'`), or undefined, `parseInt` returns `NaN`.
5. Since `NaN` is falsy, the `||` operator selects the default value `3000`.

This ensures the exported `port` property is always a valid integer, regardless of what the environment provides.

## Export Contract

The module exports a plain JavaScript object with the following shape:

```javascript
{
  host: string,  // Server binding address
  port: number,  // Server port number (always a valid integer)
  env: string    // Application environment name
}
```

This object is the public API contract that `server.js` and test suites depend on. The property names (`host`, `port`, `env`) must remain stable — renaming or removing any property is a breaking change.

## Architectural Constraints

This module adheres to the following architectural rules:

- **Separation of Concerns:** The configuration module must NOT contain route logic, middleware setup, or any Express-specific code. It is responsible solely for reading and exporting environment-derived settings.
- **No Side Effects on Import:** The module is synchronous and deterministic. Calling `require()` on this module does not start servers, open connections, write to the filesystem, or produce any observable side effects. This guarantees safe import by test suites and other consumers.
- **Immutable Shape:** The exported object shape `{ host, port, env }` is fixed. Consumers may depend on these exact property names without defensive checks.

## Usage

```javascript
const config = require('./config');
console.log(config.host, config.port, config.env);

// Or destructure from project root:
const { host, port, env } = require('./src/config');
```

## Override Examples

Set environment variables before starting the server to override defaults:

```bash
HOST=0.0.0.0 PORT=8080 NODE_ENV=production node server.js
```
