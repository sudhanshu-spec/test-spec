const express = require('express');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

const app = express();

// Disable X-Powered-By header to prevent server technology disclosure (OWASP recommendation)
app.disable('x-powered-by');

// Security headers middleware — applied to ALL responses for consistent protection.
// Uses manual header setting to avoid adding external dependencies (helmet) and
// preserve the project's minimalist single-dependency architecture.
app.use((req, res, next) => {
  // Prevent MIME-type sniffing attacks (e.g., treating a text file as executable script)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking by disallowing iframe embedding of this application
  res.setHeader('X-Frame-Options', 'DENY');
  // Restrict resource loading to same-origin; allow inline styles for JS-driven height animations
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'"
  );
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

app.get('/evening', (req, res) => {
  res.send('Good evening');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
