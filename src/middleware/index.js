/**
 * @fileoverview Middleware Pipeline Aggregator — Express Middleware Orchestrator
 *
 * This module orchestrates the Express middleware pipeline, registering
 * security, parsing, and logging middleware in the correct order before
 * route handlers execute. It exports a single applyMiddleware(app) function
 * that is consumed by src/app.js to centrally apply all middleware to the
 * Express application instance.
 *
 * Middleware ordering (critical for security and correctness):
 * 1. helmet() — Security headers applied first to protect all responses
 * 2. cors({ origin }) — CORS policy applied early for preflight handling
 * 3. express.json() — JSON body parsing for POST/PUT/PATCH requests
 * 4. express.urlencoded({ extended: true }) — URL-encoded body parsing
 * 5. requestLogger (Morgan) — Logs all incoming requests after body parsing
 *
 * @module src/middleware
 */

'use strict';

const helmet = require('helmet');
const cors = require('cors');
const express = require('express');
const config = require('../config');
const { requestLogger } = require('./requestLogger');

/**
 * Applies all middleware to the Express application in the correct order
 * 
 * @param {import('express').Application} app - Express application instance
 * @returns {void}
 */
function applyMiddleware(app) {
  // 1. Security headers - protect all responses
  app.use(helmet());

  // 2. CORS - handle cross-origin requests and preflight
  app.use(cors({ origin: config.corsOrigin }));

  // 3. JSON body parsing for POST/PUT/PATCH requests
  app.use(express.json());

  // 4. URL-encoded body parsing for form submissions
  app.use(express.urlencoded({ extended: true }));

  // 5. HTTP request logging via Morgan → Winston
  app.use(requestLogger);
}

module.exports = {
  applyMiddleware
};
