"""
Route Aggregator Module

This module aggregates all route Blueprints for clean, centralized imports.
It serves as the central route registry, allowing src/app.py to import
all routes with a single import statement.

Usage in src/app.py:
    from src.routes import main_bp
    app.register_blueprint(main_bp)

Part of the Node.js/Express to Python/Flask migration project.
"""

from src.routes.main import main_bp

# Expose main_bp for import by src/app.py
# Replaces: module.exports = { mainRoutes };
__all__ = ['main_bp']
