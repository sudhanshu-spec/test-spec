const express = require('express');

const hostname = '127.0.0.1';
const port = 3000;

const app = express();

// Track active connections for graceful shutdown
const connections = new Set();

// Security: Disable X-Powered-By header to reduce fingerprinting
app.disable('x-powered-by');

// Middleware: Parse JSON request bodies with size limit for security
app.use(express.json({ limit: '10kb' }));

// Middleware: Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Middleware: Set security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware: Request timeout to prevent slowloris attacks
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// Routes with error handling
app.get('/', (req, res, next) => {
  try {
    res.send('Hello, World!\n');
  } catch (err) {
    // Pass errors to error handling middleware
    next(err);
  }
});

app.get('/evening', (req, res, next) => {
  try {
    res.send('Good evening');
  } catch (err) {
    // Pass errors to error handling middleware
    next(err);
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
// Must be defined after all routes and middleware
app.use((err, req, res, next) => {
  // Log error for debugging (in production, use proper logging)
  console.error('Error occurred:', err.message);
  console.error('Stack:', err.stack);
  
  // Send appropriate error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;
  
  res.status(statusCode).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server and handle startup errors
const server = app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
}).on('error', (err) => {
  // Handle server startup errors (e.g., port already in use)
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

// Track connections for graceful shutdown
server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => {
    connections.delete(conn);
  });
});

// Graceful shutdown handler
const shutdown = async () => {
  console.log('\nShutdown signal received. Starting graceful shutdown...');
  
  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      process.exit(1);
    }
    console.log('HTTP server closed');
  });
  
  // Force close remaining connections after timeout
  setTimeout(() => {
    console.log('Forcing shutdown after timeout');
    connections.forEach((conn) => conn.destroy());
    process.exit(0);
  }, 10000); // 10 seconds grace period
  
  // Close all active connections gracefully
  connections.forEach((conn) => {
    if (!conn.destroyed) {
      conn.end();
    }
  });
  
  // Additional cleanup: Close database connections, etc.
  // Example: if using a database
  // if (dbConnection) {
  //   await dbConnection.close();
  //   console.log('Database connection closed');
  // }
  
  console.log('Graceful shutdown complete');
  process.exit(0);
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Export for testing
module.exports = { app, server, shutdown };
