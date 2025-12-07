"""
Flask Application Configuration Module

This module provides the Flask application factory function that creates
and configures the Flask app instance. It separates application configuration
from HTTP server initialization (which remains in run.py), enabling unit
testing without starting the actual server.

Design pattern: Application Factory pattern - creates configured Flask app

Usage:
    from src.app import create_app
    app = create_app()

Part of the Node.js/Express to Python/Flask migration project.
"""

from flask import Flask
from src.routes import main_bp


def create_app():
    """
    Flask application factory function.
    
    Creates and configures a Flask application instance with all necessary
    blueprints registered. This pattern enables:
    - Importing the app without starting the server
    - Configuration injection for testing
    - Multiple application instances if needed
    
    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Mount main routes Blueprint at root path
    # This preserves the original route paths:
    # - GET '/' -> main_bp handles this
    # - GET '/evening' -> main_bp handles this
    # Replaces: app.use('/', mainRoutes);
    app.register_blueprint(main_bp)
    
    return app
