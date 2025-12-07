"""
Route Blueprint Exports Module

This module aggregates all route Blueprints for clean, centralized imports.
It serves as the central route registry, allowing src/app.py to import
all routes with a single import statement.

This file replaces the Node.js CommonJS barrel pattern from src/routes/index.js:
    Original: const mainRoutes = require('./main.routes');
              module.exports = { mainRoutes };
    
    Python:   from src.routes.main import main_bp
              (Blueprint auto-available via Python import system)

Usage in src/app.py:
    from src.routes import main_bp
    app.register_blueprint(main_bp)

Exported Blueprints:
    main_bp: Flask Blueprint containing main route handlers
             - GET '/' -> 'Hello, World!\n'
             - GET '/evening' -> 'Good evening'

Part of the Node.js/Express to Python/Flask migration project.
"""

from src.routes.main import main_bp

# Expose main_bp for import by consumers (src/app.py)
# This replaces the CommonJS pattern: module.exports = { mainRoutes };
# Python's import system automatically handles the export when the symbol
# is defined at module level. The __all__ list explicitly declares the
# public API of this package.
__all__ = ['main_bp']
