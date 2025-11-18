# hao-backprop-test
test project for backprop integration. Do not touch!

## Testing

This project uses Jest and SuperTest for comprehensive unit testing of the Express.js server application.

### Running Tests

Run all tests:
```bash
npm test
```

Watch mode (auto-rerun on file changes):
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

Verbose output:
```bash
npm run test:verbose
```

### Test Coverage

Current coverage targets:
- Statements: 95%+
- Branches: 90%+
- Functions: 100%
- Lines: 95%+

View coverage reports in `coverage/lcov-report/index.html`

### What's Tested

- ✓ HTTP response content and status codes
- ✓ Response headers (Content-Type, Content-Length, X-Powered-By)
- ✓ Server lifecycle (startup, shutdown, multiple instances)
- ✓ Error handling (404 responses, unsupported methods)
- ✓ Edge cases (concurrent requests, case-insensitive routes, query parameters)
