// Server configuration with environment variable support
// Responsibilities: Centralize configuration, enable environment overrides

module.exports = {
  hostname: process.env.HOST || '127.0.0.1',
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development'
};
