/**
 * Extraction Routes
 * 
 * API routes for schema-based report extraction
 * Handles OCR analysis, parameter extraction, and report saving
 */

const express = require('express');
const router = express.Router();
const extractionController = require('../controllers/extractionController');
const authenticate = require('../middleware/authenticate');

/**
 * POST /api/extraction/analyze
 * Analyze OCR text and extract parameters
 * Protected route - requires authentication
 */
router.post('/analyze', authenticate, extractionController.analyzeReport);

/**
 * POST /api/extraction/confirm-save
 * Save analyzed report to database
 * Protected route - requires authentication
 */
router.post('/confirm-save', authenticate, extractionController.confirmAndSave);

/**
 * POST /api/extraction/manual-save
 * Manually save report with user-entered data
 * Protected route - requires authentication
 */
router.post('/manual-save', authenticate, extractionController.manualSave);

module.exports = router;
