const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const { securityConfig, corsOptions, limiterConfig } = require('./middleware/security');

const hostname = '127.0.0.1';
const port = 3000;
const httpsPort = 3443;

const app = express();

// Security Middleware Stack (order matters for optimal protection)
// 1. Helmet: Sets security-related HTTP headers
app.use(helmet(securityConfig));

// 2. CORS: Controls cross-origin resource sharing
app.use(cors(corsOptions));

// 3. Body Parser: Parses incoming JSON request bodies
app.use(express.json());

// 4. Rate Limiting: Prevents DoS attacks and API abuse
app.use(rateLimit(limiterConfig));

// Application Routes (existing functionality preserved)
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

app.get('/evening', (req, res) => {
  res.send('Good evening');
});

// HTTP Server (backward compatibility)
app.listen(port, hostname, () => {
  console.log(`HTTP Server running at http://${hostname}:${port}/`);
});

// HTTPS Server (development environment with self-signed certificates)
if (process.env.NODE_ENV !== 'production') {
  try {
    const httpsOptions = {
      key: fs.readFileSync('./config/ssl/key.pem'),
      cert: fs.readFileSync('./config/ssl/cert.pem')
    };
    
    https.createServer(httpsOptions, app).listen(httpsPort, hostname, () => {
      console.log(`HTTPS Server running at https://${hostname}:${httpsPort}/`);
    });
  } catch (error) {
    console.log('HTTPS server not started: SSL certificates not found.');
    console.log('Run: cd config/ssl && bash generate-cert.sh');
  }
}
