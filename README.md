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

This will install Express.js (^5.1.0) and all required dependencies.

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

## API Reference

This server exposes two HTTP GET endpoints:

### GET `/`

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

### GET `/evening`

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

### Health Check

Verify both endpoints are operational:

```bash
curl -s http://127.0.0.1:3000/ && echo " - Root OK"
curl -s http://127.0.0.1:3000/evening && echo " - Evening OK"
```

## Project Structure

```
hao-backprop-test/
├── server.js                    # Entry point - HTTP server binding
├── package.json                 # npm manifest and dependencies
├── package-lock.json            # Dependency lockfile
├── README.md                    # Project documentation (this file)
├── .gitignore                   # Git ignore patterns
├── jest.config.js               # Jest test framework configuration
├── src/                         # Backend application source root
│   ├── app.js                   # Express application factory
│   ├── config/                  # Configuration module
│   │   └── index.js             # Environment variable management
│   └── routes/                  # Routing surface
│       ├── index.js             # Route aggregator (barrel pattern)
│       └── main.routes.js       # Route handlers implementation
├── tests/                       # Backend test suite root
│   ├── unit/                    # Isolated module tests
│   │   ├── config.test.js       # Configuration module tests
│   │   └── routes.test.js       # Route handler tests
│   ├── integration/             # HTTP endpoint tests
│   │   └── endpoints.test.js    # API endpoint contract tests
│   └── lifecycle/               # Server lifecycle tests
│       └── server.test.js       # Startup/shutdown tests
└── client/                      # Frontend application (Vite + React + TypeScript)
    ├── vitest.config.ts         # Vitest test framework configuration
    ├── tsconfig.json            # TypeScript configuration
    ├── package.json             # Frontend dependencies and scripts
    └── src/                     # Frontend source root
        ├── __tests__/           # Global test infrastructure
        │   ├── setup.ts         # Global test setup (Testing Library, jsdom)
        │   ├── mocks/           # MSW mock handlers
        │   │   ├── server.ts    # MSW server configuration
        │   │   └── handlers/    # API mock handlers by feature
        │   │       ├── auth.ts      # Authentication API mocks
        │   │       ├── menu.ts      # Menu API mocks
        │   │       ├── orders.ts    # Orders API mocks
        │   │       └── bookings.ts  # Bookings API mocks
        │   ├── fixtures/        # Test data fixtures
        │   │   ├── users.ts         # User test data
        │   │   ├── menuItems.ts     # Menu item fixtures
        │   │   ├── orders.ts        # Order fixtures
        │   │   └── bookings.ts      # Booking fixtures
        │   ├── utils/           # Test utility functions
        │   │   ├── render.tsx       # Custom render with providers
        │   │   └── testUtils.ts     # Shared test utilities
        │   └── integration/     # Integration test suites
        │       ├── auth.integration.test.tsx      # Auth flow tests
        │       ├── ordering.integration.test.tsx  # Order flow tests
        │       └── booking.integration.test.tsx   # Booking flow tests
        ├── features/            # Feature modules with co-located tests
        │   ├── auth/__tests__/          # Authentication component tests
        │   ├── menu/__tests__/          # Menu component tests
        │   ├── cart/__tests__/          # Cart component tests
        │   ├── booking/__tests__/       # Booking component tests
        │   └── order/__tests__/         # Order component tests
        ├── components/__tests__/        # Shared component tests
        ├── api/__tests__/               # API client tests
        ├── hooks/__tests__/             # Custom hook tests
        └── utils/__tests__/             # Utility function tests
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Entry point that imports the Express app and binds it to the configured host/port |
| `src/app.js` | Express application factory - creates and exports configured Express app with mounted routes |
| `src/config/index.js` | Configuration module - exports `{ host, port, env }` from environment variables |
| `src/routes/index.js` | Route aggregator using barrel pattern - centralizes route exports |
| `src/routes/main.routes.js` | Route handlers - implements GET `/` and GET `/evening` endpoints |

## Environment Variables

The application supports the following environment variables for configuration:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `HOST` | `'127.0.0.1'` | Server binding address. Use `0.0.0.0` to accept connections from any interface. |
| `PORT` | `3000` | Server binding port number. |
| `NODE_ENV` | `'development'` | Application environment mode (`development`, `production`, `test`). |

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

## Architecture

This project follows a modular Express.js architecture with separation of concerns:

```
Request Flow:
Client → server.js → Express App (src/app.js) → Router (src/routes/) → Response
                           ↑
                     Configuration
                   (src/config/index.js)
```

### Design Patterns Used

- **Factory Pattern**: `src/app.js` exports a configured Express app without starting the server, enabling testability
- **Barrel Pattern**: `src/routes/index.js` aggregates route exports for clean imports
- **CommonJS Modules**: Uses `require`/`module.exports` for Node.js compatibility
- **Twelve-Factor App**: Configuration externalized to environment variables

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web framework providing HTTP handling, routing, and middleware |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Verify express installation
npm ls express
# Expected: express@5.1.0
```

## Scripts

### Backend Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Starts the HTTP server |
| `test` | `jest` | Run the complete backend test suite |
| `test:watch` | `jest --watch` | Run backend tests in watch mode for development |
| `test:coverage` | `jest --coverage` | Run backend tests and generate coverage report |
| `test:ci` | `jest --ci --coverage` | Run backend tests optimized for CI/CD environments |

### Frontend Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `test:client` | `cd client && npm test` | Run all frontend tests (Vitest) |
| `test:client:watch` | `cd client && npm run test:watch` | Run frontend tests in watch mode |
| `test:client:coverage` | `cd client && npm run test:coverage` | Run frontend tests with coverage report |
| `test:client:ui` | `cd client && npm run test:ui` | Open Vitest UI for interactive testing |

### Combined Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `test:all` | `npm test && npm run test:client` | Run both backend and frontend test suites |
| `coverage:all` | `npm run test:coverage && npm run test:client:coverage` | Generate combined coverage reports |

## Testing

This project includes a comprehensive dual-framework test suite:
- **Backend Testing**: Jest 30.x with Supertest for HTTP endpoint testing
- **Frontend Testing**: Vitest 4.x with React Testing Library for component testing

---

### Backend Testing (Jest)

The backend test suite is built with **Jest 30.x** and **Supertest** for HTTP endpoint testing.

#### Backend Test Execution Commands

| Purpose | Command | Description |
|---------|---------|-------------|
| Run all backend tests | `npm test` | Execute the complete backend test suite |
| Watch mode | `npm run test:watch` | Re-run tests automatically on file changes |
| Coverage report | `npm run test:coverage` | Generate detailed code coverage metrics |
| CI execution | `npm run test:ci` | Optimized execution for CI/CD pipelines |
| Single file | `npx jest tests/unit/config.test.js` | Run a specific test file |
| Pattern match | `npx jest --testPathPatterns="config"` | Run tests matching a pattern |

#### Backend Test Structure

```
tests/
├── unit/                    # Isolated module tests
│   ├── config.test.js       # Configuration defaults and parsing
│   └── routes.test.js       # Route handler exports verification
├── integration/             # HTTP endpoint tests
│   └── endpoints.test.js    # API contract tests using Supertest
└── lifecycle/               # Server lifecycle tests
    └── server.test.js       # Startup and shutdown behavior
```

| Directory | Purpose | Test Approach |
|-----------|---------|---------------|
| `tests/unit/` | Test isolated modules without HTTP | Direct module imports with Jest assertions |
| `tests/integration/` | Test HTTP endpoint responses | Supertest requests against the Express app |
| `tests/lifecycle/` | Test server startup/shutdown | Mock-based lifecycle verification |

#### Backend Coverage Targets

| Coverage Metric | Target | Description |
|-----------------|--------|-------------|
| Line Coverage | ≥ 80% | Percentage of code lines executed by tests |
| Branch Coverage | ≥ 75% | Percentage of conditional branches tested |
| Function Coverage | ≥ 90% | Percentage of functions called by tests |
| Statement Coverage | ≥ 80% | Percentage of statements executed by tests |

**Generate and view backend coverage report:**
```bash
npm run test:coverage
# Coverage report generated in ./coverage/
# Open ./coverage/lcov-report/index.html for detailed HTML report
```

#### Backend Test Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | JavaScript testing framework and test runner |
| `supertest` | ^7.1.4 | HTTP assertion library for Express endpoint testing |

---

### Frontend Testing (Vitest)

The frontend test suite is built with **Vitest 4.x**, **React Testing Library**, and **MSW** for comprehensive component and integration testing.

#### Frontend Testing Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | 4.0.16 | Testing framework optimized for Vite projects with native ESM support |
| `@vitest/coverage-v8` | 4.0.16 | V8-based code coverage for accurate metrics |
| `@vitest/ui` | 4.0.16 | Browser-based interactive test UI |
| `@testing-library/react` | 16.1.0 | React component testing utilities with user-centric approach |
| `@testing-library/dom` | 10.4.0 | DOM testing utilities (peer dependency for RTL 16+) |
| `@testing-library/user-event` | 14.5.2 | Realistic user interaction simulation |
| `@testing-library/jest-dom` | 6.6.3 | Custom DOM matchers for enhanced assertions |
| `jsdom` | 25.0.1 | DOM environment simulation for Node.js |
| `msw` | 2.7.0 | Mock Service Worker for API request interception |

#### Frontend Test Execution Commands

| Purpose | Command | Description |
|---------|---------|-------------|
| Run all frontend tests | `npm run test:client` | Execute the complete frontend test suite |
| Run directly | `cd client && npm test` | Run frontend tests from client directory |
| Watch mode | `cd client && npm run test:watch` | Re-run tests automatically on file changes |
| Coverage report | `npm run test:client:coverage` | Generate frontend coverage metrics |
| Interactive UI | `cd client && npm run test:ui` | Open Vitest UI in browser |
| Single file | `cd client && npx vitest run src/features/auth/__tests__/LoginForm.test.tsx` | Run a specific test file |
| Pattern match | `cd client && npx vitest run --grep "login"` | Run tests matching a pattern |
| Directory tests | `cd client && npx vitest run src/features/cart/` | Run all tests in a directory |

#### Frontend Test Structure

```
client/src/
├── __tests__/                           # Global test infrastructure
│   ├── setup.ts                         # Global test setup and configuration
│   ├── mocks/                           # MSW mock handlers
│   │   ├── server.ts                    # MSW server configuration
│   │   └── handlers/                    # API mock handlers by feature
│   ├── fixtures/                        # Reusable test data
│   └── utils/                           # Test utility functions
│       ├── render.tsx                   # Custom render with providers
│       └── testUtils.ts                 # Shared test helpers
├── features/
│   ├── auth/__tests__/                  # Authentication tests
│   │   ├── LoginForm.test.tsx           # Login form unit tests
│   │   ├── RegisterForm.test.tsx        # Registration form tests
│   │   ├── AuthContext.test.tsx         # Auth state management tests
│   │   └── ProtectedRoute.test.tsx      # Route protection tests
│   ├── menu/__tests__/                  # Menu feature tests
│   ├── cart/__tests__/                  # Cart feature tests
│   ├── booking/__tests__/               # Booking feature tests
│   └── order/__tests__/                 # Order feature tests
├── components/__tests__/                # Shared component tests
├── api/__tests__/                       # API client tests
├── hooks/__tests__/                     # Custom hook tests
└── utils/__tests__/                     # Utility function tests
```

| Directory | Purpose | Test Approach |
|-----------|---------|---------------|
| `client/src/__tests__/` | Global test infrastructure | Setup, mocks, fixtures, utilities |
| `client/src/features/**/__tests__/` | Feature component tests | React Testing Library with Vitest |
| `client/src/components/__tests__/` | Shared component tests | Unit tests for reusable components |
| `client/src/api/__tests__/` | API client tests | MSW-based request/response testing |
| `client/src/hooks/__tests__/` | Custom hook tests | Isolated hook testing |
| `client/src/utils/__tests__/` | Utility function tests | Pure function unit tests |

#### Frontend Coverage Targets

| Coverage Metric | Target | Description |
|-----------------|--------|-------------|
| Branch Coverage | ≥ 80% | Percentage of conditional branches tested |
| Function Coverage | ≥ 85% | Percentage of functions called by tests |
| Line Coverage | ≥ 85% | Percentage of code lines executed by tests |
| Statement Coverage | ≥ 85% | Percentage of statements executed by tests |

**Critical Path Coverage Requirements:**
- Authentication components: 100% coverage
- Cart state management: 100% coverage
- API client functions: 100% coverage
- Utility/validation functions: 100% coverage
- Order checkout flow: 90%+ coverage

**Generate and view frontend coverage report:**
```bash
npm run test:client:coverage
# Coverage report generated in ./client/coverage/
# Open ./client/coverage/lcov-report/index.html for detailed HTML report
```

#### MSW (Mock Service Worker) API Mocking

The frontend tests use MSW for intercepting and mocking API requests:

```typescript
// Example: Authentication mock handler
import { http, HttpResponse } from 'msw';

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({ token: 'mock-jwt-token', user: { id: '1', email } });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),
];
```

**Mock Handler Categories:**
- `auth.ts` - Login, logout, registration, token refresh
- `menu.ts` - Menu items, categories, search
- `orders.ts` - Order creation, history, status updates
- `bookings.ts` - Reservation creation, availability, cancellation

#### Custom Test Utilities

**Custom Render with Providers:**
```typescript
// client/src/__tests__/utils/render.tsx
import { render } from '@testing-library/react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { CartProvider } from '@/features/cart/CartContext';
import { BrowserRouter } from 'react-router-dom';

export function renderWithProviders(ui: React.ReactElement, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    ),
    ...options,
  });
}
```

---

### Combined Test Execution

Run both frontend and backend tests together:

```bash
# Run all tests (backend + frontend)
npm run test:all

# Generate combined coverage reports
npm run coverage:all
```

### Test Quality Guidelines

**All tests should follow these principles:**

1. **AAA Pattern**: Arrange, Act, Assert structure for clarity
2. **Single Responsibility**: Each test verifies one behavior
3. **Isolation**: Tests run independently without shared state
4. **Descriptive Naming**: Test names explain expected behavior
5. **User-Centric**: Test user-facing behavior, not implementation details

**Frontend Test Pattern Example:**
```typescript
describe('LoginForm', () => {
  beforeEach(() => {
    // Reset mocks before each test
  });

  afterEach(() => {
    cleanup();
  });

  describe('when user submits valid credentials', () => {
    it('should redirect to dashboard on successful login', async () => {
      // Arrange: Set up mocks and render component
      // Act: Simulate user interactions
      // Assert: Verify expected behavior
    });
  });
});
```

## Troubleshooting

### Common Server Issues

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

### Common Backend Testing Issues

**Jest tests hanging or timing out:**
```bash
# Error: Jest did not exit one second after the test run has completed
# Solution: Ensure all async operations complete and mocks are properly cleared
npm test -- --detectOpenHandles
```

**Coverage thresholds not met:**
```bash
# Error: Coverage threshold for X not met
# Solution: Add more tests or adjust thresholds in jest.config.js
npm run test:coverage -- --verbose
```

### Common Frontend Testing Issues

**Vitest tests failing with module resolution errors:**
```bash
# Error: Cannot find module '@/components/...'
# Solution: Ensure tsconfig paths are correctly configured in vitest.config.ts
cd client && npx vitest --config vitest.config.ts
```

**React Testing Library "act" warnings:**
```typescript
// Warning: An update to Component inside a test was not wrapped in act(...)
// Solution: Use waitFor or findBy queries for async operations
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

**MSW handlers not intercepting requests:**
```typescript
// Issue: API calls not being mocked during tests
// Solution: Ensure MSW server is started before tests and handlers are registered

// In setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**jsdom environment issues:**
```bash
# Error: ReferenceError: document is not defined
# Solution: Ensure vitest.config.ts has jsdom environment configured
# In vitest.config.ts:
# test: { environment: 'jsdom' }
```

**Tests passing locally but failing in CI:**
```bash
# Issue: Timing-related test failures in CI
# Solution: Use explicit waits and avoid hardcoded timeouts
# Run with similar CI conditions locally:
CI=true npm run test:client
```

**User event interactions not working:**
```typescript
// Issue: userEvent.click() not triggering expected behavior
// Solution: Ensure userEvent is properly set up
import userEvent from '@testing-library/user-event';

it('should handle click', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);
  await user.click(screen.getByRole('button'));
  // assertions...
});
```

**Vitest watch mode not detecting changes:**
```bash
# Issue: Tests not re-running when files change
# Solution: Check file watching limits on Linux
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Coverage report showing 0% for some files:**
```bash
# Issue: Files not included in coverage report
# Solution: Check include/exclude patterns in vitest.config.ts
# Ensure source files are properly imported in tests
cd client && npx vitest run --coverage --reporter=verbose
```

**Testing Library queries not finding elements:**
```typescript
// Issue: getByRole/getByText not finding expected elements
// Solution: Use screen.debug() to inspect current DOM state
import { screen } from '@testing-library/react';

render(<MyComponent />);
screen.debug(); // Prints current DOM to console

// Use more specific queries or check element accessibility
screen.getByRole('button', { name: /submit/i });
```

### Debug Mode Testing

**Run frontend tests in debug mode:**
```bash
# Start Vitest in debug mode
cd client && npx vitest --inspect-brk --single-thread

# In another terminal, attach debugger (VS Code, Chrome DevTools, etc.)
```

**Run backend tests in debug mode:**
```bash
# Start Jest in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## License

This project is licensed under the MIT License.

## Author

hao-backprop-test contributors

---

*This is a tutorial project demonstrating Node.js server development with Express.js framework.*
