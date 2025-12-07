"""
HTTP Server Entry Point

This file serves as the application entry point only, responsible for
starting the HTTP server. Flask application configuration and routes
are separated into their respective modules per Flask best practices.

This separation enables:
- Unit testing the Flask app without starting the HTTP server
- Clean separation of concerns
- Environment-based configuration

Entry point: python run.py

Part of the Node.js/Express to Python/Flask migration project.
"""

from src.app import create_app
from src.config import config

# Create the Flask application using the factory pattern
app = create_app()

if __name__ == '__main__':
    # Print startup message matching original Node.js format exactly
    # Original: console.log(`Server running at http://${config.host}:${config.port}/`);
    print(f"Server running at http://{config['host']}:{config['port']}/")
    
    # Start the Flask development server
    # Replaces: app.listen(config.port, config.host, callback);
    app.run(host=config['host'], port=config['port'])
