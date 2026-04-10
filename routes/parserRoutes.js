/**
 * Medical Report Parser API Routes
 * 
 * Endpoints:
 * - POST /api/parser/parse - Parse medical report OCR text
 * - POST /api/parser/detect - Detect report type only
 * - GET /api/parser/report-types - Get available report types
 * - GET /api/parser/report-types/:type - Get info for specific report type
 */

const express = require('express');
const router = express.Router();
const parser = require('../services/medicalReportParser');

/**
 * POST /api/parser/parse
 * Parse medical report OCR text
 * 
 * Request body:
 * {
 *   "ocrText": "raw OCR text from lab report"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "reportType": "GLUCOSE",
 *   "reportTypeName": "Blood Glucose Test",
 *   "reportDate": "13-07-2025",
 *   "totalParameters": 2,
 *   "extractedParameters": 2,
 *   "parameters": [
 *     {
 *       "parameter": "Fasting Glucose",
 *       "value": 138,
 *       "unit": "mg/dL",
 *       "status": "High",
 *       "referenceRange": "70-100",
 *       "extractionMethod": "line_search"
 *     }
 *   ]
 * }
 */
router.post('/parse', (req, res) => {
  try {
    const { ocrText } = req.body;

    // Validation
    if (!ocrText || typeof ocrText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'OCR text is required and must be a string'
      });
    }

    if (ocrText.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'OCR text is too short'
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📋 Parser API Request');
    console.log(`${'='.repeat(60)}`);
    console.log(`OCR Text Length: ${ocrText.length} characters`);

    // Parse the report
    const result = parser.parseReport(ocrText);

    // Check for errors
    if (!result.success) {
      return res.status(422).json(result);
    }

    // Success response
    console.log(`✅ Successfully parsed ${result.reportType} with ${result.extractedParameters}/${result.totalParameters} parameters`);
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error in parser API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during parsing',
      message: error.message
    });
  }
});

/**
 * POST /api/parser/detect
 * Detect report type from OCR text only
 * 
 * Request body:
 * {
 *   "ocrText": "raw OCR text"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "reportType": "GLUCOSE",
 *   "reportTypeName": "Blood Glucose Test"
 * }
 */
router.post('/detect', (req, res) => {
  try {
    const { ocrText } = req.body;

    if (!ocrText || typeof ocrText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'OCR text is required'
      });
    }

    const reportTypeDetector = require('../services/reportTypeDetector');
    const reportType = reportTypeDetector.detectReportType(ocrText);

    if (!reportType) {
      return res.status(404).json({
        success: false,
        error: 'Could not detect report type from OCR text'
      });
    }

    const info = reportTypeDetector.getReportTypeInfo(reportType);

    return res.status(200).json({
      success: true,
      reportType: reportType,
      reportTypeName: info.name,
      parameterCount: info.parameterCount
    });

  } catch (error) {
    console.error('❌ Error detecting report type:', error);
    return res.status(500).json({
      success: false,
      error: 'Error detecting report type'
    });
  }
});

/**
 * GET /api/parser/report-types
 * Get all available report types
 * 
 * Response:
 * {
 *   "success": true,
 *   "reportTypes": ["GLUCOSE", "KFT", "CBC", "LFT", "LIPID", "THYROID", "BLOOD_PRESSURE"]
 * }
 */
router.get('/report-types', (req, res) => {
  try {
    const reportTypes = parser.getAvailableReportTypes();

    return res.status(200).json({
      success: true,
      count: reportTypes.length,
      reportTypes: reportTypes
    });

  } catch (error) {
    console.error('❌ Error getting report types:', error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving report types'
    });
  }
});

/**
 * GET /api/parser/report-types/:type
 * Get information for a specific report type
 * 
 * Response:
 * {
 *   "success": true,
 *   "reportType": {
 *     "code": "GLUCOSE",
 *     "name": "Blood Glucose Test",
 *     "parameterCount": 2,
 *     "keywords": ["glucose", "blood sugar", "fasting"],
 *     "parameters": [...]
 *   }
 * }
 */
router.get('/report-types/:type', (req, res) => {
  try {
    const { type } = req.params;
    const info = parser.getReportTypeInfo(type.toUpperCase());

    if (!info) {
      return res.status(404).json({
        success: false,
        error: `Report type '${type}' not found`
      });
    }

    return res.status(200).json({
      success: true,
      reportType: info
    });

  } catch (error) {
    console.error('❌ Error getting report type info:', error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving report type information'
    });
  }
});

module.exports = router;
