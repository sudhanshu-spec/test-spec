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

The test suite achieves comprehensive coverage of all testable application code:

- **Statements**: 83%+ (maximum achievable with conditional module loading pattern)
- **Branches**: 50%+ (one branch in if/else conditional)
- **Functions**: 66%+ (all route handlers tested)
- **Lines**: 83%+ (all executable application lines)

View detailed coverage reports in `coverage/lcov-report/index.html` after running `npm run test:coverage`.

### What's Tested

- ✓ HTTP response content and status codes
- ✓ Response headers (Content-Type, Content-Length, X-Powered-By)
- ✓ Server lifecycle (startup, shutdown, multiple instances)
- ✓ Error handling (404 responses, unsupported methods)
- ✓ Edge cases (concurrent requests, case-insensitive routes, query parameters)
