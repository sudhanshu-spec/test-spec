# hao-backprop-test
test project for backprop integration. Do not touch!

## Authentication

This project includes JWT-based user authentication with public registration and login endpoints, and a protected logout endpoint.

### Endpoints

#### POST /auth/register (Public)

Register a new user account. No authentication required.

**Request Body:**

```json
{
  "username": "string (min 3 characters)",
  "email": "valid email address",
  "password": "string (min 8 characters)"
}
```

**Success Response (201):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  }
}
```

A `Set-Cookie` header containing an HttpOnly JWT token is included in the response.

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Validation errors (invalid email, short password, short username) |
| 409 | Email already exists |

---

#### POST /auth/login (Public)

Authenticate an existing user. No authentication required.

**Request Body:**

```json
{
  "email": "valid email address",
  "password": "string"
}
```

**Success Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  }
}
```

A `Set-Cookie` header containing an HttpOnly JWT token is included in the response.

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Validation errors (invalid email, missing password) |
| 401 | Invalid credentials |

---

#### POST /auth/logout (Authenticated)

Log out the current user. Requires a valid JWT cookie.

**Request Body:** None required.

**Success Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

The JWT cookie is cleared from the response.

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Not authenticated (missing or invalid JWT) |

---

### Setup

1. Copy the environment template and configure your values:

   ```bash
   cp .env.example .env
   ```

2. Set the following environment variables in your `.env` file:

   | Variable | Description | Default |
   |----------|-------------|---------|
   | `JWT_SECRET` | Secret key used to sign JWT tokens | *(required — no default)* |
   | `JWT_EXPIRATION` | Token expiration duration | `1h` |
   | `BCRYPT_SALT_ROUNDS` | Number of bcrypt hashing rounds | `10` |

3. Install all dependencies:

   ```bash
   npm install
   ```

   This installs the authentication dependencies: `bcryptjs`, `jsonwebtoken`, and `cookie-parser`.

4. Start the server:

   ```bash
   npm start
   ```

### Architecture

- **JWT-based stateless authentication:** User sessions are managed via signed JSON Web Tokens. No server-side session storage is required.
- **Password hashing:** All passwords are securely hashed using `bcryptjs` with configurable salt rounds before storage. Plain-text passwords are never persisted.
- **Secure cookie storage:** JWT tokens are stored in `HttpOnly`, `Secure`, and `SameSite=strict` cookies to prevent XSS and CSRF attacks.
- **In-memory user storage:** User data is stored in an in-memory data structure. The architecture is designed for straightforward replacement with a persistent database in the future.
- **Input validation:** All authentication inputs are validated and sanitized using `express-validator` middleware chains before reaching the controller layer.
- **Error message opacity:** Authentication error responses use generic messages (e.g., "Invalid credentials") to avoid revealing whether a specific email exists in the system.
