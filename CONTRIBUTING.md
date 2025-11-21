# Contributing to hao-backprop-test

Thank you for your interest in contributing to this Express.js web server project! This guide will help you get started with development and ensure consistent code quality across contributions.

## Table of Contents

- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Documentation Standards](#documentation-standards)
- [Commit Message Conventions](#commit-message-conventions)
- [Testing Procedures](#testing-procedures)
- [Pull Request Process](#pull-request-process)
- [Questions and Support](#questions-and-support)

## Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.0.0 or higher (tested on v20.19.5)
- **npm**: Version 7.0.0 or higher (tested on v10.8.2)
- **git**: For version control

Verify your installations:

```bash
node --version
npm --version
git --version
```

### Installation Steps

1. **Fork and Clone the Repository**

   ```bash
   git clone https://github.com/your-username/hao-backprop-test.git
   cd hao-backprop-test
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

   This will install Express.js 5.1.0 and all required dependencies.

3. **Configure Environment Variables**

   Copy the environment template and customize it:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set appropriate values for:
   - `JWT_SECRET`: Your secure JWT secret key
   - `PORT`: Server port (optional, defaults to 3000)
   - `NODE_ENV`: Environment mode (development, production, test)

4. **Verify Your Setup**

   Start the development server:

   ```bash
   npm start
   ```

   You should see: `Server running at http://127.0.0.1:3000/`

   Test the endpoints:

   ```bash
   curl http://127.0.0.1:3000/
   # Expected: Hello, World!

   curl http://127.0.0.1:3000/evening
   # Expected: Good evening
   ```

### Common Setup Issues

- **Port Already in Use**: If port 3000 is occupied, set a different port in your `.env` file
- **Module Not Found**: Run `npm install` to ensure all dependencies are installed
- **Permission Errors**: Use `sudo` only if necessary; prefer using Node version managers (nvm, n)

## Code Style Guidelines

We follow consistent coding standards to maintain readability and quality:

### JavaScript Style

- **Module System**: CommonJS (`require`/`module.exports`)
- **Syntax**: ES6+ features where appropriate
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for strings
- **Semicolons**: Required at statement ends

### Naming Conventions

- **Variables and Functions**: `camelCase` (e.g., `getUserData`, `serverPort`)
- **Constants**: `camelCase` or `SCREAMING_SNAKE_CASE` for true constants (e.g., `hostname`, `MAX_CONNECTIONS`)
- **Classes**: `PascalCase` (e.g., `UserController`, `DatabaseManager`)

### Comment Requirements

- **JSDoc Comments**: Required for all functions and modules
- **Inline Comments**: Use for complex logic that isn't immediately obvious
- **Comment Ratio**: Aim for 20-30% comment-to-code ratio
- **Clarity**: Explain *why*, not *what* (code shows what, comments explain reasoning)

## Documentation Standards

All code contributions must include proper documentation:

### JSDoc Format

Every function must have JSDoc comments with these tags:

```javascript
/**
 * Description of what the function does
 * @param {Type} paramName - Parameter description
 * @returns {Type} Description of return value
 * @example
 * // Example usage
 * functionName(exampleParam);
 */
```

### Route Handler Documentation

Express route handlers should follow this pattern (Source: server.js:8-10):

```javascript
/**
 * Root endpoint returning a greeting message
 * @route GET /
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {string} Plain text greeting: "Hello, World!\n"
 * @example
 * // Test with curl:
 * // curl http://127.0.0.1:3000/
 * // Expected output: Hello, World!
 */
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});
```

### Documentation Updates

When adding new features:

1. **Update JSDoc comments** in source code
2. **Update README.md** with new API endpoints or features
3. **Update this CONTRIBUTING.md** if changing development workflow
4. **Add examples** demonstrating the new functionality

## Commit Message Conventions

We follow conventional commit message format for clear version history:

### Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Commit Types

- **feat**: New feature (e.g., `feat(api): add new /evening endpoint`)
- **fix**: Bug fix (e.g., `fix(server): correct port binding issue`)
- **docs**: Documentation changes (e.g., `docs(readme): update API examples`)
- **style**: Code style changes (formatting, semicolons) (e.g., `style(server): fix indentation`)
- **refactor**: Code refactoring without feature changes (e.g., `refactor(routes): extract handler functions`)
- **test**: Adding or updating tests (e.g., `test(api): add endpoint validation tests`)
- **chore**: Maintenance tasks (e.g., `chore(deps): update express to 5.1.1`)

### Examples

```bash
feat(api): add user authentication endpoint
fix(middleware): handle undefined request body
docs(contributing): add commit message guidelines
```

## Testing Procedures

Before submitting your changes, ensure everything works correctly:

### Manual Testing

1. **Syntax Validation**

   ```bash
   node -c server.js
   ```

   Should complete silently with no errors.

2. **Server Startup**

   ```bash
   npm start
   ```

   Verify the server starts and displays: `Server running at http://127.0.0.1:3000/`

3. **Endpoint Verification**

   Test all endpoints with curl:

   ```bash
   # Test root endpoint
   curl http://127.0.0.1:3000/
   # Expected: Hello, World!

   # Test evening endpoint
   curl http://127.0.0.1:3000/evening
   # Expected: Good evening

   # Test 404 handling
   curl http://127.0.0.1:3000/nonexistent
   # Expected: 404 error
   ```

### Endpoint Verification Checklist

- [ ] All existing endpoints return correct responses
- [ ] New endpoints are accessible and return expected data
- [ ] Error handling works for invalid routes
- [ ] Server starts without errors or warnings
- [ ] Environment variables are properly loaded

### Future: Automated Testing

We plan to implement automated testing with Jest or Mocha. Until then, thorough manual testing is required.

## Pull Request Process

Follow these steps to contribute your changes:

1. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

   Use descriptive branch names (e.g., `feature/add-user-endpoint`, `fix/port-configuration`)

2. **Make Your Changes**

   - Write clean, well-documented code
   - Follow all style guidelines above
   - Add JSDoc comments for all new functions
   - Test your changes thoroughly

3. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "feat(api): add new endpoint for user data"
   ```

   Follow commit message conventions (see above)

4. **Update Documentation**

   - Update README.md if adding new features or endpoints
   - Update JSDoc comments in source files
   - Add usage examples where appropriate

5. **Test All Endpoints**

   Run through the complete testing checklist to ensure nothing is broken

6. **Push Your Branch**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Submit a Pull Request**

   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Provide a clear description of your changes
   - Reference any related issues (e.g., "Fixes #123")

8. **Code Review**

   - Maintainers will review your code
   - Address any requested changes
   - Update your PR with additional commits if needed

9. **Merge**

   Once approved, your PR will be merged into the main branch

### PR Requirements

Your pull request must:

- [ ] Pass all manual testing checks
- [ ] Include proper documentation
- [ ] Follow code style guidelines
- [ ] Have clear commit messages
- [ ] Include examples for new features
- [ ] Not break existing functionality

## Questions and Support

### Getting Help

If you have questions or need assistance:

- **Documentation**: Check the [README.md](./README.md) for project overview and API documentation
- **Issues**: Search existing issues on GitHub to see if your question has been answered
- **New Issues**: Open a new issue with the "question" label for help

### Reporting Bugs

When reporting bugs, please include:

- Node.js and npm versions
- Operating system
- Steps to reproduce the issue
- Expected vs actual behavior
- Error messages or logs

### Suggesting Features

We welcome feature suggestions! Please:

- Open an issue with the "enhancement" label
- Describe the feature and its use case
- Explain why it would benefit the project

### Code of Conduct

Be respectful, constructive, and professional in all interactions. We're building a welcoming community for all contributors.

---

Thank you for contributing to hao-backprop-test! Your efforts help improve this project for everyone.
