"""
Flask Application Factory Module

This module provides the Flask application factory function that creates
and configures the Flask app instance. It separates application configuration
from HTTP server initialization (which remains in run.py), enabling unit
testing without starting the actual server.

Design Pattern: Application Factory Pattern
    - Creates configured Flask app via create_app() function
    - Mirrors the design pattern from the original Express app factory (src/app.js)
    - Enables configuration injection for testing scenarios
    - Allows importing the app without starting the HTTP server

Original Node.js/Express Implementation (src/app.js):
    const express = require('express');
    const { mainRoutes } = require('./routes');
    const app = express();
    app.use('/', mainRoutes);
    module.exports = app;

Python/Flask Transformation:
    - require('express') → from flask import Flask
    - require('./routes') → from src.routes import main_bp
    - express() → Flask(__name__)
    - app.use('/', routes) → app.register_blueprint(main_bp)
    - module.exports = app → return app from create_app()

Usage:
    from src.app import create_app
    app = create_app()

Part of the Node.js/Express to Python/Flask migration project.
Maintains 100% feature parity with the original implementation.
"""

from flask import Flask
from src.routes import main_bp


def create_app():
    """
    Flask application factory function.
    
    Creates and configures a Flask application instance with all necessary
    blueprints registered. This factory pattern enables:
    
    1. Testability: Import the app without starting the HTTP server
    2. Configuration Injection: Pass different configs for testing vs production
    3. Multiple Instances: Create multiple app instances if needed
    
    The function mirrors the original Express app factory behavior:
    - Creates a new Flask/Express application instance
    - Mounts all route handlers at their configured paths
    - Returns the configured application without starting the server
    
    Blueprint Registration:
        main_bp is registered at the root path (no URL prefix), preserving
        the original route structure:
        - GET '/'        → Returns 'Hello, World!\\n'
        - GET '/evening' → Returns 'Good evening'
    
    Returns:
        Flask: A fully configured Flask application instance ready to handle
               HTTP requests. The app can be started by calling app.run()
               or by using a WSGI server.
    
    Example:
        >>> from src.app import create_app
        >>> app = create_app()
        >>> # For testing
        >>> client = app.test_client()
        >>> response = client.get('/')
        >>> # For running
        >>> app.run(host='127.0.0.1', port=3000)
    """
    # Create new Flask application instance
    # Flask(__name__) sets up the application with the correct import name
    # This replaces: const app = express();
    app = Flask(__name__)
    
    # Register the main Blueprint at the root path
    # No URL prefix is specified, so routes are mounted at their defined paths:
    # - GET '/' is accessible at '/'
    # - GET '/evening' is accessible at '/evening'
    # This replaces: app.use('/', mainRoutes);
    app.register_blueprint(main_bp)
    
    # Return the configured application instance
    # This replaces: module.exports = app;
    # The app is ready but not yet listening for HTTP connections
    return app
