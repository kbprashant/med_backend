/**
 * INTEGRATION GUIDE - STRICT EXTRACTION SYSTEM
 * 
 * Shows how to integrate the strict extraction system with existing code
 */

const { extractWithStrictValidation, extractWithFallback } = require('./services/strictExtractionService');

// ========================================
// EXAMPLE 1: Basic Integration
// ========================================

async function processBloodSugarReport(ocrText) {
  console.log('Processing Blood Sugar Report...\n');
  
  // Extract with strict validation
  const result = extractWithStrictValidation(ocrText, 'BLOOD_SUGAR');
  
  if (result.success) {
    console.log(`✅ Extracted ${result.parameters.length} parameters`);
    
    // Convert to database format
    const dbRecords = result.parameters.map(param => ({
      testName: 'Blood Sugar Test',
      parameterName: param.parameter,
      value: String(param.value),
      unit: param.unit,
      status: determineStatus(param.parameter, param.value),
    }));
    
    return dbRecords;
  } else {
    console.log(`❌ Extraction failed: ${result.message}`);
    return [];
  }
}

// ========================================
// EXAMPLE 2: Integration with Controller
// ========================================

// In reportController.js
async function uploadReport(req, res) {
  const { ocrText, testType } = req.body;
  
  try {
    // Use strict extraction
    const extractionResult = extractWithStrictValidation(ocrText, testType);
    
    if (!extractionResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to extract parameters from report',
        rejected: extractionResult.rejected
      });
    }
    
    // Save to database
    const savedResults = await saveTestResults(
      extractionResult.parameters,
      req.user.id,
      testType
    );
    
    res.json({
      success: true,
      message: `Extracted ${extractionResult.parameters.length} parameters`,
      results: savedResults,
      rejected: extractionResult.rejected // Show what was rejected
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}

// ========================================
// EXAMPLE 3: With Fallback to Legacy Extractor
// ========================================

const SmartMedicalExtractor = require('./services/smartMedicalExtractor');
const legacyExtractor = new SmartMedicalExtractor();

async function extractWithBothMethods(ocrText, reportType) {
  console.log('Trying STRICT extraction first...\n');
  
  // Try strict extraction with fallback
  const result = extractWithFallback(
    ocrText,
    reportType,
    (text) => {
      console.log('Falling back to LEGACY extractor...\n');
      return legacyExtractor.extract(text);
    }
  );
  
  console.log(`Extraction method used: ${result.extractionMethod || 'strict'}`);
  
  return result;
}

// ========================================
// EXAMPLE 4: Validation Layer Only
// ========================================

const { validateOnly } = require('./services/strictExtractionService');

async function validateExistingResults(testResults, reportType) {
  console.log('Validating existing test results...\n');
  
  // Validate already extracted results
  const validated = validateOnly(testResults, reportType);
  
  console.log(`Valid: ${validated.parameters.length}`);
  console.log(`Rejected: ${validated.rejected.length}`);
  
  // Log rejected items for review
  if (validated.rejected.length > 0) {
    console.log('\n⚠️  Some results were rejected:');
    for (const rejected of validated.rejected) {
      console.log(`   - ${rejected.parameter}: "${rejected.rejectedValue}"`);
      console.log(`     Reason: ${rejected.reason}`);
    }
  }
  
  return validated.parameters;
}

// ========================================
// EXAMPLE 5: Real-Time Validation During Upload
// ========================================

async function validateDuringUpload(req, res) {
  const { ocrText, manualResults } = req.body;
  
  // If user provided manual results, validate them
  if (manualResults && manualResults.length > 0) {
    const validated = validateOnly(manualResults);
    
    if (validated.rejected.length > 0) {
      // Send back validation errors
      return res.status(400).json({
        success: false,
        message: 'Some values are invalid',
        errors: validated.rejected.map(r => ({
          parameter: r.parameter,
          value: r.rejectedValue,
          reason: r.reason
        }))
      });
    }
    
    // All valid, proceed to save
    await saveTestResults(validated.parameters);
    
    return res.json({
      success: true,
      message: 'Results validated and saved'
    });
  }
  
  // Otherwise, extract from OCR text
  const extracted = extractWithStrictValidation(ocrText);
  
  // Return results for user confirmation
  res.json({
    success: true,
    preview: extracted.parameters,
    rejected: extracted.rejected,
    message: 'Please review extracted values before saving'
  });
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function determineStatus(parameterName, value) {
  // Reference ranges
  const ranges = {
    'Fasting Blood Sugar': { min: 70, max: 100 },
    'Post Prandial Glucose': { min: 80, max: 140 },
    'HbA1c': { min: 0, max: 5.7 },
  };
  
  const range = ranges[parameterName];
  if (!range) return 'NORMAL';
  
  if (value < range.min) return 'LOW';
  if (value > range.max) return 'HIGH';
  return 'NORMAL';
}

async function saveTestResults(parameters, userId, testType) {
  // Save to database (example)
  const records = parameters.map(param => ({
    userId,
    testType,
    parameterName: param.parameter,
    value: String(param.value),
    unit: param.unit,
    status: determineStatus(param.parameter, param.value),
    createdAt: new Date()
  }));
  
  // await db.testResults.insertMany(records);
  
  return records;
}

// ========================================
// EXPORT
// ========================================

module.exports = {
  processBloodSugarReport,
  uploadReport,
  extractWithBothMethods,
  validateExistingResults,
  validateDuringUpload,
};
