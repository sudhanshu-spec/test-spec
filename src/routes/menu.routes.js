'use strict';

/**
 * Menu Routes Module
 * 
 * This module defines the menu-related API endpoints using Express Router.
 * Provides endpoints for browsing and retrieving burger menu items as part
 * of the online ordering feature.
 * 
 * Route contracts:
 * - GET '/' returns list of all menu items
 * - GET '/:id' returns details for a single menu item by ID
 * 
 * @module src/routes/menu.routes
 */

const express = require('express');

const router = express.Router();

/**
 * List all menu items handler
 * Returns an array of all available menu items
 * 
 * @function listMenuItems
 * @route GET /
 * @returns {Object} JSON response with array of menu items
 */
function listMenuItems(req, res) {
  // Return list of menu items
  // In production, this would fetch from database/service
  res.status(200).json({
    success: true,
    message: 'Menu items retrieved successfully',
    data: []
  });
}

/**
 * Get single menu item details handler
 * Returns detailed information for a specific menu item by its ID
 * 
 * @function getMenuItemById
 * @route GET /:id
 * @param {string} req.params.id - The menu item identifier
 * @returns {Object} JSON response with menu item details
 */
function getMenuItemById(req, res) {
  const { id } = req.params;
  
  // Validate ID parameter
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Menu item ID is required',
      data: null
    });
  }
  
  // Return menu item details
  // In production, this would fetch from database/service
  res.status(200).json({
    success: true,
    message: 'Menu item retrieved successfully',
    data: {
      id: id,
      name: null,
      description: null,
      price: null,
      category: null,
      imageUrl: null,
      available: true
    }
  });
}

/**
 * Route definitions
 * 
 * IMPORTANT: Route ordering matters - the list route (GET /) must be defined
 * BEFORE the detail route (GET /:id) to ensure proper route matching.
 * Express matches routes in order of definition, so placing /:id first would
 * incorrectly match '/' as an id value.
 */

// GET / - List all menu items (must be first)
router.get('/', listMenuItems);

// GET /:id - Get single menu item details
router.get('/:id', getMenuItemById);

module.exports = router;
