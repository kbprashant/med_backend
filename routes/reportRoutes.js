/**
 * Report Routes
 * 
 * API routes for medical report parsing
 * Clean, RESTful implementation
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticate = require('../middleware/authenticate');

/**
 * GET /api/reports
 * Get all reports for the authenticated user
 * Protected route - requires authentication
 */
router.get('/', authenticate, reportController.getAllReports);

/**
 * GET /api/reports/tests/history
 * Get test history for a specific test (for charts/graphs)
 * Protected route - requires authentication
 */
router.get('/tests/history', authenticate, reportController.getTestHistory);

/**
 * GET /api/reports/:id
 * Get a specific report by ID
 * Protected route - requires authentication
 */
router.get('/:id', authenticate, reportController.getReportById);

/**
 * DELETE /api/reports/:id
 * Delete a specific report
 * Protected route - requires authentication
 */
router.delete('/:id', authenticate, reportController.deleteReport);

/**
 * POST /api/reports/parse
 * Parse OCR text and extract parameters based on category
 * Protected route - requires authentication
 */
router.post('/parse', authenticate, reportController.parseReport);

/**
 * POST /api/reports/image-report
 * Upload an image report without OCR processing
 * Protected route - requires authentication
 * Multipart form data with file upload
 */
router.post('/image-report', authenticate, reportController.upload.single('file'), reportController.uploadImageReport);

/**
 * GET /api/reports/categories
 * Get list of all available report categories
 * Protected route - requires authentication
 */
router.get('/categories', authenticate, reportController.getCategories);

/**
 * GET /api/reports/health
 * Health check endpoint for report parsing service
 * Public route - no authentication required
 */
router.get('/health', reportController.healthCheck);

module.exports = router;
