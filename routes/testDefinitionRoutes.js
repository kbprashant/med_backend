/**
 * Test Definitions API Routes
 * Provides endpoints to access master test definition data
 */

const express = require('express');
const router = express.Router();
const testDefinitionService = require('../services/testDefinitionService');

/**
 * GET /api/test-definitions
 * Get all test definitions
 */
router.get('/', (req, res) => {
  try {
    const definitions = testDefinitionService.getAll();
    res.json({
      success: true,
      count: definitions.length,
      data: definitions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/test-definitions/categories
 * Get all unique test categories
 */
router.get('/categories', (req, res) => {
  try {
    const categories = testDefinitionService.getAllCategories();
    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/test-definitions/category/:categoryName
 * Get all tests in a specific category
 */
router.get('/category/:categoryName', (req, res) => {
  try {
    const { categoryName } = req.params;
    const tests = testDefinitionService.getByCategory(categoryName);
    res.json({
      success: true,
      category: categoryName,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/test-definitions/:testId
 * Get a specific test definition by test ID
 */
router.get('/:testId', (req, res) => {
  try {
    const { testId } = req.params;
    const definition = testDefinitionService.getByTestId(testId);
    
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `Test definition not found: ${testId}`,
      });
    }
    
    res.json({
      success: true,
      data: definition,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/test-definitions/search
 * Search for test definitions by name
 * Body: { "testName": "hemoglobin" }
 */
router.post('/search', (req, res) => {
  try {
    const { testName } = req.body;
    
    if (!testName) {
      return res.status(400).json({
        success: false,
        error: 'testName is required',
      });
    }
    
    const definition = testDefinitionService.findByTestName(testName);
    
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `Test definition not found: ${testName}`,
      });
    }
    
    res.json({
      success: true,
      data: definition,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/test-definitions/validate
 * Validate and enrich a test result
 * Body: { "testName": "Hemoglobin", "value": 14.5, "gender": "male" }
 */
router.post('/validate', (req, res) => {
  try {
    const { testName, value, gender } = req.body;
    
    if (!testName || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'testName and value are required',
      });
    }
    
    const enriched = testDefinitionService.enrichTestResult(
      { testName, value },
      gender
    );
    
    res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/test-definitions/stats/summary
 * Get summary statistics about test definitions
 */
router.get('/stats/summary', (req, res) => {
  try {
    const categories = testDefinitionService.getAllCategories();
    const categoryStats = categories.map(cat => ({
      category: cat,
      count: testDefinitionService.getByCategory(cat).length,
    }));
    
    res.json({
      success: true,
      data: {
        totalTests: testDefinitionService.getCount(),
        totalCategories: categories.length,
        categories: categoryStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
