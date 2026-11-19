# hao-backprop-test

A Node.js application built on Express.js: three frozen tutorial greeting routes, a JSON API for a burger restaurant (accounts and sessions, menu browsing, ordering and table reservations) under `/api`, and a separate Vite + TypeScript single-page client in `client/`.

> **Note**: This is a test project for backprop integration.

## Prerequisites

Before running this application, ensure you have the following installed:

| Requirement | Minimum Version | Recommended Version |
|-------------|-----------------|---------------------|
| Node.js | 20.19.x | 20.19.x (LTS) |
| npm | 8.x | 10.8.x |

The client's Vite 8 build requires Node.js `^20.19.0 || >=22.12.0` and Vitest 4 requires `^20.0.0 || ^22.0.0 || >=24.0.0`, both declared in `client/package-lock.json`, so Node.js 20.19.x is the minimum this project supports. The delivered verification ran on Node.js v22.23.5 with npm 11.21.0 — a runtime both engine ranges accept.

`jq`, any recent release, is needed only by the Example Session below: the walkthrough pipes the registration response through `jq` to capture the token, and no other step uses it.

### Verify Installation

```bash
node --version
# Expected: v20.19.x, or a later version both engine ranges accept

npm --version
# Expected: 10.x.x or higher
```

## Installation

The repository carries two packages: the CommonJS server at the root and the client in `client/`. Each is installed from its own manifest.

1. Clone the repository:

```bash
git clone <repository-url>
cd hao-backprop-test
```

2. Install the server dependencies:

```bash
npm install
```

This installs Express.js (^5.1.0), `better-sqlite3` (^11.10.0) and `cors` (^2.8.5), plus the Jest and Supertest development dependencies.

3. Install the client dependencies:

```bash
cd client
npm install
```

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

### Seed the Menu

The SQLite database file is created on first use, the schema is applied idempotently and the menu is seeded automatically while the `categories` table is empty, so a fresh checkout has a browsable menu without a separate step. To apply the schema and the seed explicitly:

```bash
npm run seed
# Menu seed complete: rows inserted on this run; 6 categories, 14 menu items.
```

### Start the Client

The client is a separate package with its own dev server, so start the server first: the dev and preview servers proxy `/api` to `http://127.0.0.1:3000`.

```bash
cd client
npm run dev
# Vite dev server on http://localhost:5173/
```

`cd client && npm run preview` serves the production build on `http://localhost:4173/` with the same proxy.

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

## API Reference

Every `/api` response carries a JSON body except `POST /api/auth/logout`, which answers `204` with no body, and the `OPTIONS` requests the CORS middleware terminates before any routing; the three tutorial routes and unmatched paths outside `/api` are not JSON. Money is always an integer number of cents — `price_cents`, `unit_price_cents`, `line_total_cents` and `total_cents` — so no floating-point currency value is ever sent or accepted.

### Tutorial Routes

These three routes are frozen: method, status, content type and body do not change.

| Method | Path | Status | Content-Type | Body |
|--------|------|--------|--------------|------|
| `GET` | `/` | 200 OK | `text/html; charset=utf-8` | `Hello, World!\n` (14 characters, includes the trailing newline) |
| `GET` | `/evening` | 200 OK | `text/html; charset=utf-8` | `Good evening` (12 characters, no trailing newline) |
| `GET` | `/good-evening` | 200 OK | `text/plain; charset=utf-8` | `Good evening` (12 characters, no trailing newline) |

Any other method registered on those paths, and any path outside `/api` that matches no route, is answered with Express's own 404 — except an `OPTIONS` request, which the app-wide CORS middleware answers with `204` and no body before any routing happens.

#### GET `/`

Returns a greeting message.

**Request:**
```bash
curl -s http://127.0.0.1:3000/
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** `Hello, World!\n` (14 characters, includes trailing newline)

**Example:**
```bash
curl -s http://127.0.0.1:3000/
# Output: Hello, World!
```

#### GET `/evening`

Returns an evening greeting message.

**Request:**
```bash
curl -s http://127.0.0.1:3000/evening
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/html; charset=utf-8
- **Body:** `Good evening` (12 characters, no trailing newline)

**Example:**
```bash
curl -s http://127.0.0.1:3000/evening
# Output: Good evening
```

#### GET `/good-evening`

Returns the same greeting as plain text.

**Request:**
```bash
curl -s -i http://127.0.0.1:3000/good-evening
```

**Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/plain; charset=utf-8
- **Body:** `Good evening` (12 characters, no trailing newline)

**Example:**
```bash
curl -s http://127.0.0.1:3000/good-evening
# Output: Good evening
```

### Health Check

Verify all three routes are operational:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
curl -s http://127.0.0.1:3000/good-evening && echo " - Good evening OK"
```

### JSON API

The JSON API is mounted under `/api` and holds exactly twelve endpoints: accounts and sessions, the menu, ordering and table reservations.

| Method | Path | Auth | Success | Errors |
|--------|------|------|---------|--------|
| `POST` | `/api/auth/register` | Public | 201 `{user:{id,name,email,created_at}, token}` | 400 `VALIDATION_ERROR`, 409 `EMAIL_ALREADY_REGISTERED` |
| `POST` | `/api/auth/login` | Public | 200 `{user, token}` | 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS` |
| `GET` | `/api/auth/session` | Bearer | 200 `{user}` | 401 `TOKEN_REQUIRED`, `TOKEN_INVALID`, `TOKEN_EXPIRED` |
| `POST` | `/api/auth/logout` | Bearer | 204, no body — the presented token is revoked | 401 `TOKEN_REQUIRED`, `TOKEN_INVALID`, `TOKEN_EXPIRED` |
| `GET` | `/api/categories` | Public | 200 `{categories:[{id,name,slug,display_order}]}`, ordered by `display_order` | — |
| `GET` | `/api/menu-items?category=<slug>` | Public | 200 `{items:[item]}` for that category, or every available item without the query | 404 `CATEGORY_NOT_FOUND` for an unknown slug |
| `GET` | `/api/menu-items/:id` | Public | 200 `{item}` | 400 `VALIDATION_ERROR` for an id that is not a UUID, 404 `MENU_ITEM_NOT_FOUND` |
| `POST` | `/api/orders` | Bearer | 201 `{order}` | 400 `VALIDATION_ERROR`, 404 `MENU_ITEM_NOT_FOUND`, 409 `MENU_ITEM_UNAVAILABLE` |
| `GET` | `/api/orders` | Bearer | 200 `{orders:[order]}` for the calling user only, newest first | — |
| `GET` | `/api/orders/:id` | Bearer | 200 `{order}` | 400 `VALIDATION_ERROR`, 404 `ORDER_NOT_FOUND` — also for an order held by another user |
| `POST` | `/api/reservations` | Bearer | 201 `{reservation}` | 400 `VALIDATION_ERROR`, 409 `RESERVATION_CONFLICT` |
| `GET` | `/api/reservations` | Bearer | 200 `{reservations:[reservation]}` for the calling user only, ordered by date then time | — |

An empty collection — no categories, no items in a category, no orders, no reservations — is a normal result answered with 200 and an empty array, never an error.

#### Request Bodies

- `POST /api/auth/register` accepts `{name, email, password}`: a name of 1 to 80 characters, an email address, and a password of at least 8 characters and at most 72 bytes.
- `POST /api/auth/login` accepts `{email, password}`.
- `POST /api/orders` accepts `{items:[{menu_item_id, quantity}], notes?}`: at least one line, every `menu_item_id` a UUID and every `quantity` an integer from 1 to 20. Only the item id and the quantity are read from a line — a price sent by the client is ignored, and every amount on the stored order is computed from the menu item inside the order transaction.
- `POST /api/reservations` accepts `{reservation_date, reservation_time, party_size, notes?}`: a date as `YYYY-MM-DD`, a time as `HH:MM` on a half-hour slot, and a whole-number party size.

#### Response Shapes

- `item` — `{id, name, description, price_cents, image_url, is_available, category:{id,name,slug}}`
- `order` — `{id, status, total_cents, notes, created_at, lines:[{id, menu_item_id, name, quantity, unit_price_cents, line_total_cents}]}`
- `reservation` — `{id, reservation_date, reservation_time, party_size, status, notes, created_at}`

#### Authentication

`register` and `login` answer with a `token`: 64 hexadecimal characters, sent on every protected request as `Authorization: Bearer <token>`. The server stores only the token's SHA-256 hash, so the raw value is never written to the database and cannot be recovered from it. A token lives for `TOKEN_TTL_HOURS` (24 by default), and `logout` revokes the presented token rather than deleting it.

Passwords are hashed with `crypto.scrypt` against a per-user 16-byte salt. No response ever contains `password_hash`, `password_salt` or `token_hash`.

#### Error Envelope

Every failure is answered with one shape:

```json
{"error": {"code": "<CODE>", "message": "<human readable>", "details": [{"field": "<name>", "issue": "<text>"}]}}
```

`details` is present only for a validation failure, where it carries one `{field, issue}` entry per failing rule. It is omitted entirely for every other error.

#### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_ERROR` | 400 | A documented input rule failed; `details` names each failing field. |
| `INVALID_CREDENTIALS` | 401 | The login email is unknown or the password is wrong — the two are indistinguishable. |
| `TOKEN_REQUIRED` | 401 | A protected route was called without an `Authorization: Bearer` header. |
| `TOKEN_INVALID` | 401 | The presented token is unknown or has been revoked. |
| `TOKEN_EXPIRED` | 401 | The presented token is past its expiry. |
| `EMAIL_ALREADY_REGISTERED` | 409 | The registration email already exists, compared case-insensitively. |
| `CATEGORY_NOT_FOUND` | 404 | The menu filter slug names no known category. |
| `MENU_ITEM_NOT_FOUND` | 404 | The item id names no known item, in a read or in an order line. |
| `MENU_ITEM_UNAVAILABLE` | 409 | An order line references an item that is not available. |
| `ORDER_NOT_FOUND` | 404 | The order id is unknown or is not held by the caller. |
| `RESERVATION_CONFLICT` | 409 | The caller already holds a reservation for that date and time. |
| `ROUTE_NOT_FOUND` | 404 | The path matches no route under `/api`. |
| `INTERNAL_ERROR` | 500 | An unhandled failure; the stack is logged server-side and never returned. |

`ROUTE_NOT_FOUND` and the error envelope apply to `/api` only. A path outside `/api` — `/invalid`, `/hello-world` — keeps Express's own 404 page, exactly as it does today; an `OPTIONS` request is the one exception, answered `204` with no body by the app-wide CORS middleware before any routing happens.

#### Reservation Rules

A booking is validated in one fixed order and the first failing rule decides the response:

| Step | Rule | Failure |
|------|------|---------|
| 1 | Shape — every field present, a `YYYY-MM-DD` date, an `HH:MM` time, a whole-number party size | 400 `VALIDATION_ERROR` |
| 2 | The requested date and time are not in the past | 400 `VALIDATION_ERROR`, `issue: reservation_datetime_in_past` |
| 3 | The time is a 30-minute slot inside the service window of 17:00 to 22:00, whose last seating is 21:30 | 400 `VALIDATION_ERROR`, `issue: reservation_time_outside_service_hours` |
| 4 | Party size between 1 and 12 | 400 `VALIDATION_ERROR` |
| 5 | The date lies within 90 days of today | 400 `VALIDATION_ERROR` |
| 6 | The caller holds no other reservation for that date and time | 409 `RESERVATION_CONFLICT` |

Times are compared in the server's local timezone and the horizon is counted in calendar days. `SERVICE_OPEN_TIME`, `SERVICE_CLOSE_TIME`, `MAX_PARTY_SIZE` and `RESERVATION_HORIZON_DAYS` move steps 3 to 5.

#### Example Session

```bash
# Create an account and keep the token (needs jq — see Prerequisites)
TOKEN=$(curl -s -X POST http://127.0.0.1:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"correct-horse"}' \
  | jq -r '.token')

# Browse the menu
curl -s http://127.0.0.1:3000/api/categories
curl -s 'http://127.0.0.1:3000/api/menu-items?category=classics'

# Place an order: prices come from the menu, never from the request
curl -s -X POST http://127.0.0.1:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"menu_item_id":"<uuid>","quantity":2}],"notes":"No pickles"}'

# Book a table. The API refuses any date in the past or more than 90 days
# ahead (the horizon documented above), so book a week from today.
BOOKING_DATE=$(date -d '+7 days' +%Y-%m-%d 2>/dev/null || date -v+7d +%Y-%m-%d)
curl -s -X POST http://127.0.0.1:3000/api/reservations \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"reservation_date\":\"$BOOKING_DATE\",\"reservation_time\":\"19:30\",\"party_size\":2}"
```

## Project Structure

The repository carries two packages: a CommonJS Node.js server at its root and a Vite + TypeScript client in `client/`.

```
hao-backprop-test/
├── server.js                    # Entry point - the only place a socket is opened
├── package.json                 # Root manifest: dependencies and server scripts
├── package-lock.json            # Dependency lockfile
├── jest.config.js               # Jest configuration and coverage thresholds
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── src/                         # Server source root (CommonJS)
│   ├── app.js                   # Express application factory - registers the six-stage pipeline
│   ├── errors.js                # AppError and the one error-code-to-status table
│   ├── config/
│   │   └── index.js             # The only reader of process.env
│   ├── routes/
│   │   ├── index.js             # Route aggregator (barrel pattern): { mainRoutes, apiRoutes }
│   │   ├── main.routes.js       # The three frozen tutorial routes
│   │   └── api/                 # JSON API routers
│   │       ├── index.js         # Aggregator: /auth, / (menu), /orders, /reservations
│   │       ├── auth.routes.js   # register, login, session, logout
│   │       ├── menu.routes.js   # categories, menu-items, menu-items/:id
│   │       ├── orders.routes.js # place, list and read orders
│   │       └── reservations.routes.js  # book and list reservations
│   ├── middleware/
│   │   ├── authenticate.js      # Authorization: Bearer -> req.user
│   │   ├── not-found.js         # ROUTE_NOT_FOUND for unmatched /api paths
│   │   └── error-handler.js     # The single JSON error envelope
│   ├── services/                # Business rules: auth, menu, order, reservation
│   ├── repositories/            # SQL: users, tokens, categories, items, orders, reservations
│   └── db/
│       ├── index.js             # Lazy memoised connection, pragmas, schema, closeDb()
│       ├── schema.sql           # Seven tables and four indexes, applied idempotently
│       └── seed.js              # Menu reference data; also the `npm run seed` entry point
├── data/
│   └── app.db                   # SQLite database, created on first use and gitignored
├── client/                      # Single-page client (Vite 8 + React 19 + TypeScript)
│   ├── package.json             # Client manifest (ES modules) and scripts
│   ├── tsconfig.json            # Strict TypeScript configuration
│   ├── vite.config.ts           # Dev and preview servers, /api proxy, Vitest setup
│   ├── index.html               # Vite entry document
│   └── src/
│       ├── main.tsx             # Composition root: providers and the route table
│       ├── api/                 # Typed fetch client, contract types, money formatting
│       ├── state/               # Session and cart providers
│       ├── components/          # Layout, protected route, form controls, menu card
│       ├── views/               # Screen components behind the route table
│       ├── styles/              # Design tokens and responsive layout rules
│       ├── test/                # jsdom test setup
│       └── __tests__/           # Vitest suites
└── tests/                       # Server test suite root
    ├── unit/                    # Isolated module tests
    ├── integration/             # HTTP contracts, repositories, schema, end-to-end flow
    └── lifecycle/               # Server startup and shutdown behaviour
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app and binds it to the configured host/port - reports a failed bind (non-zero exit when started as `node server.js`), closes the HTTP server and the database on `SIGTERM`/`SIGINT`, and is the only place a socket is opened |
| `src/app.js` | Express application factory - registers CORS, the JSON body parser, the tutorial router, the API router and the two API-scoped terminal handlers; exports the app and never listens |
| `src/errors.js` | Error vocabulary - the `AppError` class and the single table pairing each of the thirteen codes with its HTTP status |
| `src/config/index.js` | Configuration module - the only reader of `process.env`; exports the ten settings every other module reads |
| `src/routes/index.js` | Route aggregator using barrel pattern - exports `{ mainRoutes, apiRoutes }` |
| `src/routes/main.routes.js` | The three frozen tutorial routes: GET `/`, GET `/evening` and GET `/good-evening` |
| `src/routes/api/index.js` | API aggregator - mounts the four domain routers under `/api` and owns no route of its own |
| `src/db/index.js` | Database owner - opens one memoised connection on first use, applies the pragmas and `schema.sql`, seeds an empty menu, and closes it through `closeDb()` |

## Environment Variables

Every setting is read in exactly one place, `src/config/index.js`; no other module reads `process.env`.

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |
| `DB_FILE` | `'data/app.db'` | SQLite database file, resolved against the working directory. |
| `CORS_ORIGIN` | `'http://localhost:5173'` | The single browser origin allowed to call the API. |
| `TOKEN_TTL_HOURS` | `24` | Lifetime of a session token, in hours. |
| `SERVICE_OPEN_TIME` | `'17:00'` | Reservation service window opening time, as `HH:MM`. |
| `SERVICE_CLOSE_TIME` | `'22:00'` | Reservation service window closing time, as `HH:MM`; the last seating is one 30-minute slot earlier. |
| `MAX_PARTY_SIZE` | `12` | Largest party size a single reservation may book. |
| `RESERVATION_HORIZON_DAYS` | `90` | How many days ahead a reservation may be booked. |

The database file and its parent directory are created on first use, `schema.sql` is applied idempotently on every open, and the menu is seeded automatically while the `categories` table is empty — no separate setup step is required.

### Configuration Examples

**Development (default):**
```bash
npm start
# Binds to http://127.0.0.1:3000/
```

**Production deployment:**
```bash
HOST=0.0.0.0 PORT=80 NODE_ENV=production npm start
# Binds to http://0.0.0.0:80/
```

**Custom port:**
```bash
PORT=8080 npm start
# Binds to http://127.0.0.1:8080/
```

**Custom database and reservation window:**
```bash
DB_FILE=/var/lib/burger/app.db SERVICE_OPEN_TIME=12:00 SERVICE_CLOSE_TIME=23:00 npm start
# Stores the database outside the checkout; the last seating moves to 22:30
```

## Architecture

The server is a layered Express.js application: HTTP concerns stay in the routers, business rules in the services, SQL in the repositories and the connection in `src/db/`.

```
Request Flow:
Browser client (Vite dev server or preview)
  │
  ▼
1. CORS ─────────── one configured origin; GET and POST; Content-Type, Authorization
2. express.json() ─ JSON body parser
3. Route match ──── mainRoutes at '/' first, then apiRoutes at '/api'
4. authenticate ─── Bearer token → req.user (protected API groups only)
5. Handler ──────── router → service → repository → SQLite
6. Error handler ── the JSON envelope, and the /api 404, mounted under '/api'
                    Configuration: src/config/index.js
```

The order of those stages is the contract. The tutorial routes resolve in stage 3 exactly as they do without the API, and `src/middleware/not-found.js` and `src/middleware/error-handler.js` are mounted under `/api` only, so a path outside that mount point keeps Express's own 404 (the CORS middleware's `OPTIONS` answer being the one exception).

Three boundaries are deliberate:

- **`src/app.js` never listens.** It exports the configured app, while `server.js` is the only place a socket is opened: it binds the configured host and port, reports a failed bind with a diagnostic naming the address and the error (setting a non-zero exit code when started as `node server.js`), and closes the HTTP server and the database on `SIGTERM` or `SIGINT`. That split keeps the app usable from Supertest and from any other in-process caller.
- **Express never serves the client.** The client's build is produced and served by Vite, and the only path the two share is `/api`, proxied by the Vite dev and preview servers to the Express origin. A static handler or a catch-all here would compete with the frozen `GET /`.
- **The cart is client state only.** It is held in React state in `client/src/state/cart.tsx` and cleared when an order is confirmed or the session ends. There is no cart table and no cart endpoint: an order is written only when the cart's Place Order action posts to `/api/orders`.

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Service and Repository Layers**: business rules live in `src/services/`, SQL only in `src/repositories/`
- **Dependency Injection**: every service is built by a `create<Domain>Service({...})` factory that receives its repositories by name — plus, where it needs them, its configuration and its clock — as arguments: `createAuthService({users, tokens, config, now})`, `createMenuService({categories, items})`, `createOrderService({orders, now})` and `createReservationService({reservations, config, now})`, so the clock and the repositories are replaced in tests
- **Barrel Pattern**: `src/routes/index.js` and `src/routes/api/index.js` aggregate route exports for clean imports
- **CommonJS on the server, ES modules in the client**: `require`/`module.exports` in the root package, `import`/`export` in `client/`; no file mixes the two
- **Twelve-Factor App**: Configuration externalized to environment variables, read in `src/config/index.js` only

## Dependencies

### Server Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |
| `better-sqlite3` | ^11.10.0 | Synchronous SQLite driver - the only module that opens the database |
| `cors` | ^2.8.5 | CORS middleware, configured with the single allowed origin and the `GET`/`POST` methods |

### Server Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | Test runner and assertion library for the server suite |
| `supertest` | ^7.1.4 | HTTP assertions against the exported Express app |

### Client Dependencies

All of these live in `client/package.json`.

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.0.0 | Component runtime |
| `react-dom` | ^19.0.0 | DOM renderer |
| `react-router-dom` | ^7.0.0 | Client-side routing for the screen table |
| `vite` | ^8.0.0 | Dev server, production build and `/api` proxy |
| `@vitejs/plugin-react` | ^6.3.0 | React support inside the Vite build |
| `typescript` | ^5.4.0 | Type checking under `strict` |
| `vitest` | ^4.1.0 | Test runner for the client suite |
| `jsdom` | ^26.0.0 | DOM environment the client tests run in |
| `@testing-library/react` | ^16.0.0 | Component rendering and queries |
| `@testing-library/user-event` | ^14.0.0 | Realistic interaction in the client tests |

### Dependency Installation

```bash
# Install the server dependencies
npm install

# Verify express installation
npm ls express
# Expected: express@5.1.0

# Install the client dependencies
cd client && npm install
```

No library is added for hashing, tokens, validation, sessions or HTTP calls: `node:crypto` covers UUID generation, `scrypt` hashing and token minting, the `auth_tokens` table holds sessions, hand-written validators — in the routers, plus the booking rules in `src/services/reservation.service.js` — check every request body and path parameter, `express.json()` parses bodies, and the client uses the browser's `fetch`.

## Scripts

The server scripts run from the repository root; the client scripts run inside `client/`.

### Server Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server |
| `seed` | `node src/db/seed.js` | Applies the schema and seeds the menu when it is still empty |
| `test` | `jest` | Run the complete test suite |
| `test:watch` | `jest --watch` | Run tests in watch mode for development |
| `test:coverage` | `jest --coverage` | Run tests and generate coverage report |
| `test:ci` | `jest --ci --coverage --reporters=default` | Run tests optimized for CI/CD environments |

### Client Scripts

Run these from inside `client/`:

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Dev server on `http://localhost:5173/`, proxying `/api` to `http://127.0.0.1:3000` |
| `build` | `tsc --noEmit && vite build` | Type check, then build the production bundle into `client/dist/` |
| `preview` | `vite preview` | Serves the production build on `http://localhost:4173/` with the same `/api` proxy |
| `typecheck` | `tsc --noEmit` | Type check the client only, under `strict` |
| `test` | `vitest run` | Run the client test suite once |

The client is installed and run from its own package. Both of its servers proxy `/api` to `http://127.0.0.1:3000`, so start the server before the client.

## Testing

This project includes a comprehensive test suite built with **Jest 30.x** and **Supertest** for the server, and with **Vitest** and **Testing Library** for the client.

### Test Execution Commands

| Purpose | Command | Description |
|---------|---------|-------------|
| Run all tests | `npm test` | Execute the complete server test suite |
| Watch mode | `npm run test:watch` | Re-run tests automatically on file changes |
| Coverage report | `npm run test:coverage` | Generate detailed code coverage metrics |
| CI execution | `npm run test:ci` | Optimized execution for CI/CD pipelines |
| Single file | `npx jest tests/unit/config.test.js` | Run a specific test file |
| Pattern match | `npx jest --testPathPatterns="config"` | Run tests matching a pattern |
| Client suite | `cd client && npm test` | Run the client tests once (`vitest run`, never watch mode) |
| Client type check | `cd client && npm run typecheck` | Type check the client under `strict` |

A subset run needs `--coverage=false` — for example `npx jest tests/unit --coverage=false` — because the global coverage thresholds below make any partial run exit non-zero even when every test in it passes.

### Test Structure

The server suite is organized into three categories based on test scope, and the client suite lives in its own package:

```
tests/
├── unit/                    # Isolated module tests
├── integration/             # HTTP contracts, persistence and the end-to-end flow
└── lifecycle/               # Server lifecycle tests

client/src/__tests__/        # Client state, routing and component tests (Vitest + jsdom)
```

- `tests/unit/` — configuration defaults and parsing, the tutorial router shape, the error vocabulary, the Bearer-token guard, the API not-found handler, the four services (`auth.service`, `menu.service`, `order.service`, `reservation.service`) against stubbed repositories, the 200-line module-size guard (`module-size`) and the entry point's listen-error and shutdown paths (`server-entry`).
- `tests/integration/` — the tutorial route contracts, the API contract suites (`api-auth`, `api-menu`, `api-orders`, `api-reservations`, `api-contract`), the four domain routers over a real pipeline (`api-routers`), the six repositories, the database connection (`db-connection`), the error envelope (`error-handler`), the schema, the end-to-end flow `e2e-flow` (register, login, browse the menu, place an order, book a table), read latency (`latency`) and module reachability (`reachability`).
- `tests/lifecycle/` — server startup and shutdown behaviour.
- `client/src/__tests__/` — cart state, the typed API client and its 401 handling, form validation, protected routes, the layout, module reachability (`reachability`) and the jsdom test bootstrap (`test-setup`).

| Directory | Purpose | Test Approach |
|-----------|---------|---------------|
| `tests/unit/` | Test isolated modules without HTTP | Direct module imports with Jest assertions |
| `tests/integration/` | Test HTTP endpoint responses and persistence | Supertest requests against the Express app; the suites that exercise persistence run on their own temporary database file, and the suites that need none open no database at all |
| `tests/lifecycle/` | Test server startup/shutdown | Mock-based lifecycle verification |
| `client/src/__tests__/` | Test client behaviour | Vitest with Testing Library in a jsdom environment |

### Coverage Targets

The project enforces the following code coverage thresholds:

| Coverage Metric | Target | Description |
|-----------------|--------|-------------|
| Line Coverage | ≥ 80% | Percentage of code lines executed by tests |
| Branch Coverage | ≥ 75% | Percentage of conditional branches tested |
| Function Coverage | ≥ 90% | Percentage of functions called by tests |
| Statement Coverage | ≥ 80% | Percentage of statements executed by tests |

**Generate and view coverage report:**
```bash
npm run test:coverage
# Coverage report generated in ./coverage/
# Open ./coverage/lcov-report/index.html for detailed HTML report
```

### Test Dependencies

Server suite, from the root manifest:

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | JavaScript testing framework and test runner |
| `supertest` | ^7.1.4 | HTTP assertion library for Express endpoint testing |

Client suite, from `client/package.json`:

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^4.1.0 | Client test runner (`vitest run`) |
| `jsdom` | ^26.0.0 | DOM environment the client tests run in |
| `@testing-library/react` | ^16.0.0 | Component rendering and queries |
| `@testing-library/user-event` | ^14.0.0 | Realistic interaction in component tests |

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

**Database cannot be opened:**
```bash
# Error: SqliteError: unable to open database file
# Solution: point DB_FILE at a writable location; the parent directory is created
# automatically, its permissions are not
DB_FILE=/tmp/app.db npm start
```

**Client cannot reach the API:**
```bash
# The Vite dev and preview servers proxy /api to http://127.0.0.1:3000
# Solution: start the server first, or change the proxy target in client/vite.config.ts
npm start
cd client && npm run dev
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating Node.js server development with Express.js framework.*
