# Burger Website - Frontend Testing Guide

Frontend testing documentation for the Burger Website application, providing comprehensive guidance for writing, running, and maintaining frontend tests.

> **Note**: This project uses a dual-framework testing approach: **Jest** for backend tests and **Vitest** for frontend tests.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Test Organization](#test-organization)
- [Test Commands](#test-commands)
- [Coverage Targets](#coverage-targets)
- [Writing Tests](#writing-tests)
- [Mocking Guidelines](#mocking-guidelines)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Burger Website frontend uses **Vitest** as its testing framework, chosen for its native integration with Vite and excellent TypeScript support. This provides:

- **Fast execution**: Native ESM support and Vite's transformation pipeline
- **Jest-compatible API**: Familiar syntax for developers experienced with Jest
- **TypeScript first**: Built-in TypeScript support without additional configuration
- **Isolated tests**: Each test file runs in isolation for predictable results

### Dual-Framework Architecture

| Layer | Framework | Purpose | Configuration |
|-------|-----------|---------|---------------|
| Frontend | Vitest 4.0.16 | React component, hook, and utility testing | `client/vitest.config.ts` |
| Backend | Jest 30.2.0 | Express API and server lifecycle testing | `jest.config.js` (root) |

This separation ensures optimal tooling for each layer:
- Frontend tests benefit from Vite's fast HMR and native ESM
- Backend tests use Jest's mature Node.js testing capabilities

## Testing Stack

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | 4.0.16 | Test runner and assertion library for Vite projects |
| `@vitest/coverage-v8` | 4.0.16 | V8-based code coverage collection |
| `@vitest/ui` | 4.0.16 | Browser-based test UI for visual debugging |

### Component Testing

| Package | Version | Purpose |
|---------|---------|---------|
| `@testing-library/react` | 16.1.0 | React component testing utilities |
| `@testing-library/dom` | 10.4.0 | DOM testing utilities (peer dependency) |
| `@testing-library/user-event` | 14.5.2 | User interaction simulation |
| `@testing-library/jest-dom` | 6.6.3 | Custom DOM matchers for assertions |

### Environment and Mocking

| Package | Version | Purpose |
|---------|---------|---------|
| `jsdom` | 25.0.1 | DOM environment simulation in Node.js |
| `msw` | 2.7.0 | Mock Service Worker for API mocking |

## Prerequisites

Before running frontend tests, ensure you have:

| Requirement | Minimum Version | Recommended Version |
|-------------|-----------------|---------------------|
| Node.js | 18.x | 20.19.x (LTS) |
| npm | 9.x | 10.8.x |

### Verify Installation

```bash
node --version
# Expected: v20.x.x or higher

npm --version
# Expected: 10.x.x or higher
```

## Installation

Install all frontend testing dependencies:

```bash
cd client
npm install
```

Or install testing dependencies specifically:

```bash
cd client
npm install --save-dev vitest@4.0.16 @vitest/coverage-v8@4.0.16 @vitest/ui@4.0.16
npm install --save-dev @testing-library/react@16.1.0 @testing-library/dom@10.4.0
npm install --save-dev @testing-library/user-event@14.5.2 @testing-library/jest-dom@6.6.3
npm install --save-dev jsdom@25.0.1 msw@2.7.0
```

## Test Organization

The frontend test suite follows a structured organization aligned with the source code architecture:

```
client/src/
├── __tests__/                           # Shared test infrastructure
│   ├── setup.ts                         # Global test setup
│   ├── fixtures/                        # Test data factories
│   │   ├── users.ts                     # User test data
│   │   ├── menuItems.ts                 # Menu item fixtures
│   │   ├── orders.ts                    # Order test data
│   │   └── bookings.ts                  # Booking fixtures
│   ├── mocks/                           # Mock implementations
│   │   ├── server.ts                    # MSW server configuration
│   │   └── handlers/                    # API mock handlers
│   │       ├── auth.ts                  # Auth endpoint mocks
│   │       ├── menu.ts                  # Menu endpoint mocks
│   │       ├── orders.ts                # Order endpoint mocks
│   │       └── bookings.ts              # Booking endpoint mocks
│   ├── utils/                           # Test utilities
│   │   ├── render.tsx                   # Custom render with providers
│   │   └── testUtils.ts                 # Shared test helpers
│   └── integration/                     # Integration tests
│       ├── auth.integration.test.tsx    # Auth flow tests
│       ├── ordering.integration.test.tsx # Order flow tests
│       └── booking.integration.test.tsx  # Booking flow tests
│
├── features/                            # Feature-specific tests (co-located)
│   ├── auth/__tests__/                  # Authentication tests
│   │   ├── LoginForm.test.tsx
│   │   ├── RegisterForm.test.tsx
│   │   ├── AuthContext.test.tsx
│   │   ├── useAuth.test.tsx
│   │   └── ProtectedRoute.test.tsx
│   ├── menu/__tests__/                  # Menu tests
│   │   ├── MenuList.test.tsx
│   │   ├── MenuItemCard.test.tsx
│   │   ├── MenuCategory.test.tsx
│   │   └── useMenu.test.tsx
│   ├── cart/__tests__/                  # Cart tests
│   │   ├── Cart.test.tsx
│   │   ├── CartItem.test.tsx
│   │   ├── CartContext.test.tsx
│   │   ├── useCart.test.tsx
│   │   └── CartSummary.test.tsx
│   ├── booking/__tests__/               # Booking tests
│   │   ├── BookingForm.test.tsx
│   │   ├── DatePicker.test.tsx
│   │   ├── TimePicker.test.tsx
│   │   ├── BookingConfirmation.test.tsx
│   │   └── useBooking.test.tsx
│   └── order/__tests__/                 # Order tests
│       ├── Checkout.test.tsx
│       ├── OrderSummary.test.tsx
│       ├── PaymentForm.test.tsx
│       ├── OrderConfirmation.test.tsx
│       └── useOrder.test.tsx
│
├── api/__tests__/                       # API client tests
│   ├── client.test.ts
│   ├── auth.test.ts
│   ├── menu.test.ts
│   ├── orders.test.ts
│   └── bookings.test.ts
│
├── hooks/__tests__/                     # Custom hook tests
│   ├── useLocalStorage.test.ts
│   └── useDebounce.test.ts
│
├── utils/__tests__/                     # Utility function tests
│   ├── formatters.test.ts
│   └── validators.test.ts
│
└── components/__tests__/                # Shared component tests
    ├── Button.test.tsx
    ├── Input.test.tsx
    ├── Modal.test.tsx
    └── Toast.test.tsx
```

### Directory Purposes

| Directory | Purpose | Test Approach |
|-----------|---------|---------------|
| `src/__tests__/` | Test infrastructure and shared utilities | Setup, fixtures, mocks |
| `src/__tests__/integration/` | Cross-feature integration tests | User flow simulation |
| `src/features/**/__tests__/` | Feature component tests | Unit and integration |
| `src/api/__tests__/` | API client tests | Mock API responses |
| `src/hooks/__tests__/` | Custom hook tests | Hook behavior verification |
| `src/utils/__tests__/` | Utility function tests | Pure function testing |
| `src/components/__tests__/` | Shared UI component tests | Rendering and interaction |

## Test Commands

### Running Tests

| Command | Purpose | Description |
|---------|---------|-------------|
| `npm test` | Run all tests | Execute the complete frontend test suite |
| `npm run test:watch` | Watch mode | Re-run tests on file changes |
| `npm run test:coverage` | Coverage report | Generate detailed coverage metrics |
| `npm run test:ui` | Browser UI | Open interactive test browser interface |

### Command Examples

**Run all tests once:**
```bash
cd client
npm test
```

**Run tests in watch mode during development:**
```bash
npm run test:watch
```

**Generate and view coverage report:**
```bash
npm run test:coverage
# Coverage report generated in ./coverage/
# Open ./coverage/index.html for detailed HTML report
```

**Open browser-based test UI:**
```bash
npm run test:ui
# Opens at http://localhost:51204/__vitest__/
```

### Single File/Pattern Execution

**Run a specific test file:**
```bash
npx vitest run src/features/auth/__tests__/LoginForm.test.tsx
```

**Run tests matching a pattern:**
```bash
npx vitest run --grep "login"
```

**Run tests in a specific directory:**
```bash
npx vitest run src/features/cart/
```

**Run a single test by name:**
```bash
npx vitest run -t "should display login form"
```

### Debug Mode

**Run tests with Node.js debugger:**
```bash
npx vitest --inspect-brk --single-thread
```

**Run with verbose output:**
```bash
npx vitest run --reporter=verbose
```

## Coverage Targets

The frontend test suite enforces the following coverage thresholds:

| Coverage Metric | Minimum Target | Description |
|-----------------|----------------|-------------|
| Branches | ≥ 80% | Percentage of conditional branches tested |
| Functions | ≥ 85% | Percentage of functions called by tests |
| Lines | ≥ 85% | Percentage of code lines executed |
| Statements | ≥ 85% | Percentage of statements executed |

### Per-Module Coverage Priorities

| Module | Target | Rationale |
|--------|--------|-----------|
| `src/utils/validators.ts` | 100% | Security-critical input validation |
| `src/features/cart/CartContext.tsx` | 100% | Core state management |
| `src/api/client.ts` | 100% | All API interactions |
| `src/features/auth/AuthContext.tsx` | 100% | Security-critical auth state |
| `src/features/auth/LoginForm.tsx` | 90% | Primary user entry point |
| `src/features/order/Checkout.tsx` | 90% | Revenue-critical flow |
| `src/features/booking/BookingForm.tsx` | 90% | Core business feature |

### Viewing Coverage Reports

```bash
# Generate coverage
npm run test:coverage

# Coverage files location
client/coverage/
├── index.html           # HTML coverage browser
├── lcov.info            # LCOV format for CI tools
└── coverage-summary.json # JSON summary
```

## Writing Tests

All tests should follow the **AAA Pattern** (Arrange, Act, Assert) for clarity and maintainability.

### Component Test Template

```typescript
/**
 * @fileoverview Tests for ComponentName
 * @module tests/features/feature/ComponentName
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  // Setup before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Cleanup after each test
  afterEach(() => {
    cleanup();
  });

  describe('when rendered with default props', () => {
    it('should display expected content', () => {
      // Arrange
      const props = { title: 'Test Title' };

      // Act
      render(<ComponentName {...props} />);

      // Assert
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });

  describe('when user interacts', () => {
    it('should respond appropriately', async () => {
      // Arrange
      const user = userEvent.setup();
      const onClickMock = vi.fn();
      render(<ComponentName onClick={onClickMock} />);

      // Act
      await user.click(screen.getByRole('button'));

      // Assert
      expect(onClickMock).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Hook Test Template

```typescript
/**
 * @fileoverview Tests for useCustomHook
 * @module tests/hooks/useCustomHook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCustomHook } from './useCustomHook';

describe('useCustomHook', () => {
  it('should return initial state', () => {
    // Arrange & Act
    const { result } = renderHook(() => useCustomHook());

    // Assert
    expect(result.current.value).toBe(0);
  });

  it('should update state when action is called', () => {
    // Arrange
    const { result } = renderHook(() => useCustomHook());

    // Act
    act(() => {
      result.current.increment();
    });

    // Assert
    expect(result.current.value).toBe(1);
  });
});
```

### Async Test Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AsyncComponent } from './AsyncComponent';

describe('AsyncComponent', () => {
  it('should display data after loading', async () => {
    // Arrange
    render(<AsyncComponent />);

    // Act & Assert - wait for async content
    await waitFor(() => {
      expect(screen.getByText('Loaded Data')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    // Arrange & Act
    render(<AsyncComponent />);

    // Assert
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Testing Library Query Priority

Use queries in this priority order for better test maintainability:

| Priority | Query Type | When to Use |
|----------|------------|-------------|
| 1 | `getByRole` | Interactive elements (buttons, inputs, links) |
| 2 | `getByLabelText` | Form inputs with labels |
| 3 | `getByPlaceholderText` | Inputs with placeholder text |
| 4 | `getByText` | Non-interactive text content |
| 5 | `getByDisplayValue` | Current input values |
| 6 | `getByAltText` | Images with alt text |
| 7 | `getByTestId` | Last resort for complex scenarios |

**Example:**
```typescript
// ✅ GOOD - queries by role and accessible name
const submitButton = screen.getByRole('button', { name: /submit/i });
const emailInput = screen.getByLabelText('Email');

// ❌ AVOID - test ID couples to implementation
const button = screen.getByTestId('submit-btn');
```

## Mocking Guidelines

### MSW (Mock Service Worker) Setup

MSW intercepts network requests at the network level, providing realistic API mocking.

**Setting up the MSW server:**

```typescript
// src/__tests__/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**Global test setup:**

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => server.close());
```

### Creating API Mock Handlers

```typescript
// src/__tests__/mocks/handlers/auth.ts
import { http, HttpResponse } from 'msw';

export const authHandlers = [
  // Successful login
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        token: 'mock-jwt-token',
      });
    }
    
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Logout
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),
];
```

### Overriding Handlers for Specific Tests

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../../__tests__/mocks/server';

describe('LoginForm error handling', () => {
  it('should display error message on server error', async () => {
    // Override handler for this test
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );

    // Test error handling
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
```

### Mocking Modules with Vitest

```typescript
import { vi, describe, it, expect } from 'vitest';

// Mock an entire module
vi.mock('./apiClient', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
}));

// Mock specific exports
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

## Best Practices

### Test Isolation

```typescript
// ✅ GOOD - each test is independent
describe('Cart', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });
});
```

### Assertion Quality

```typescript
// ✅ GOOD - specific, semantic assertions
expect(screen.getByRole('button')).toBeDisabled();
expect(screen.getByText('Error')).toHaveClass('error-message');

// ❌ AVOID - vague assertions
expect(element).toBeTruthy();
expect(array.length).toBe(3); // Use toHaveLength instead
```

### Async Testing

```typescript
// ✅ GOOD - use findBy* for async elements
const message = await screen.findByText('Success');

// ✅ GOOD - use waitFor for state changes
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
});

// ❌ AVOID - manual timeouts
await new Promise(r => setTimeout(r, 1000)); // Don't do this
```

### Test Naming

```typescript
// ✅ GOOD - describes behavior, not implementation
it('should display error message when login fails')
it('should redirect to dashboard after successful login')

// ❌ AVOID - describes implementation details
it('should call setError with error message')
it('should set loading state to false')
```

## Troubleshooting

### Common Issues and Solutions

---

**Issue: "Cannot find module" errors**

```
Error: Cannot find module '@/components/Button'
```

**Solution:** Ensure path aliases are configured in both `tsconfig.json` and `vitest.config.ts`:

```typescript
// vitest.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

---

**Issue: "document is not defined"**

```
ReferenceError: document is not defined
```

**Solution:** Ensure jsdom environment is configured:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

---

**Issue: Tests timing out**

```
Error: Test timed out in 5000ms
```

**Solution:** Increase timeout for slow tests or check for unresolved promises:

```typescript
// For a specific test
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout

// Or globally in vitest.config.ts
test: {
  testTimeout: 10000,
}
```

---

**Issue: MSW not intercepting requests**

**Solution:** Ensure MSW server is properly started in setup file:

```typescript
// src/__tests__/setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

**Issue: "cleanup" errors or state leaking between tests**

**Solution:** Ensure cleanup runs after each test:

```typescript
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});
```

---

**Issue: React act() warnings**

```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Solution:** Wrap state updates in `act()` or use `waitFor`:

```typescript
// For hook tests
import { act } from '@testing-library/react';

act(() => {
  result.current.updateState();
});

// For component tests - prefer waitFor
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

---

**Issue: "Not wrapped in act(...)" with user events**

**Solution:** Use `userEvent.setup()` and await interactions:

```typescript
// ✅ GOOD
const user = userEvent.setup();
await user.click(button);

// ❌ AVOID
userEvent.click(button); // Missing await
```

---

**Issue: Coverage not meeting thresholds**

```
ERROR: Coverage for branches (75%) does not meet threshold (80%)
```

**Solution:** 
1. Run `npm run test:coverage` to generate detailed report
2. Open `coverage/index.html` to identify uncovered code
3. Add tests for uncovered branches and functions
4. Focus on edge cases and error handling paths

---

**Issue: Tests pass locally but fail in CI**

**Solution:** Ensure consistent environment:

```bash
# Run tests with CI flag
CI=true npm test

# Or set in vitest.config.ts
test: {
  env: {
    CI: 'true',
  },
}
```

---

### Debug Tips

**Run tests in sequence for debugging:**
```bash
npx vitest run --no-threads
```

**Enable verbose logging:**
```bash
DEBUG=vitest:* npx vitest run
```

**Run with browser-based debugger:**
```bash
npm run test:ui
```

**Add debug output in tests:**
```typescript
import { screen } from '@testing-library/react';

// Print current DOM state
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));
```

---

## Related Documentation

- [Root README](../README.md) - Project overview and backend testing
- [Vitest Documentation](https://vitest.dev/) - Official Vitest docs
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/) - React Testing Library
- [MSW Documentation](https://mswjs.io/docs/) - Mock Service Worker

---

*This documentation covers the frontend testing infrastructure for the Burger Website application. For backend testing (Jest), refer to the root README.md.*
