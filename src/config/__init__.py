"""
Configuration Management Module

This module centralizes all application configuration values with environment
variable support following the Twelve-Factor App methodology for configuration
externalization.

Default values preserve backward compatibility with original server.js implementation:
- host: '127.0.0.1' (from original server.js line 3)
- port: 3000 (from original server.js line 4)

Environment variable overrides:
- HOST: Override default host binding
- PORT: Override default port number
- FLASK_ENV: Set application environment (development, production, test)

Usage:
    from src.config import config
    print(config['host'])  # '127.0.0.1'
    print(config['port'])  # 3000
    print(config['env'])   # 'development'

Part of the Node.js/Express to Python/Flask migration project.
"""

import os

# Configuration dictionary exported for use by other modules
config = {
    # Server host binding address
    # Default: '127.0.0.1'
    'host': os.environ.get('HOST', '127.0.0.1'),
    
    # Server port number
    # Default: 3000 (NOT Flask's default 5000, to match original Node.js behavior)
    'port': int(os.environ.get('PORT', 3000)),
    
    # Application environment
    # Default: 'development'
    # Note: Uses FLASK_ENV instead of NODE_ENV per Flask convention
    'env': os.environ.get('FLASK_ENV', 'development')
}
