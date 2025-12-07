"""
Main Application Routes Module

This module defines the main GET route handlers using Flask Blueprint.
Routes are migrated from original src/routes/main.routes.js with exact
behavioral preservation.

Route contracts preserved (character-for-character):
- GET '/' returns 'Hello, World!\n' (14 characters, with trailing newline)
- GET '/evening' returns 'Good evening' (12 characters, no trailing newline)

Usage:
    from src.routes.main import main_bp
    app.register_blueprint(main_bp)

Part of the Node.js/Express to Python/Flask migration project.
"""

from flask import Blueprint

# Create Blueprint for main routes
# Replaces: const router = express.Router();
main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """
    Root route handler.
    
    Responds with 'Hello, World!\n' - exact match to original server.js line 9
    and src/routes/main.routes.js line 27.
    
    Returns:
        str: 'Hello, World!\n' (with trailing newline)
    """
    return 'Hello, World!\n'


@main_bp.route('/evening')
def evening():
    """
    Evening route handler.
    
    Responds with 'Good evening' - exact match to original server.js line 13
    and src/routes/main.routes.js line 38.
    
    Returns:
        str: 'Good evening' (no trailing newline)
    """
    return 'Good evening'
