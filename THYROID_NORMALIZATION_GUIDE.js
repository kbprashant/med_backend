/**
 * THYROID PARAMETER NORMALIZATION - IMPLEMENTATION GUIDE
 * 
 * This document explains the thyroid parameter normalization system
 * and how it's integrated into the medical extraction pipeline.
 */

/**
 * ========================================================================
 * 1. OVERVIEW
 * ========================================================================
 * 
 * The thyroid normalization system handles these 5 SEPARATE parameters:
 * 
 * 1. FT3 (Free T3)
 * 2. FT4 (Free T4)
 * 3. T3 Total
 * 4. T4 Total
 * 5. TSH (Thyroid Stimulating Hormone)
 * 
 * Key Design Principles:
 * - FT3 and T3 Total are DIFFERENT parameters (not merged)
 * - FT4 and T4 Total are DIFFERENT parameters (not merged)
 * - Naming variations are normalized to standard names
 * - Duplicates within same report are prevented
 * - Values are NEVER modified, only parameter names
 */

/**
 * ========================================================================
 * 2. NORMALIZATION FUNCTION
 * ========================================================================
 */

const { normalizeThyroidParameter } = require('./services/normalizer');

// Example usage:
console.log(normalizeThyroidParameter('Free T3'));          // → 'FT3'
console.log(normalizeThyroidParameter('T3, Total'));        // → 'T3 Total'
console.log(normalizeThyroidParameter('Free Thyroxine'));   // → 'FT4'
console.log(normalizeThyroidParameter('T4, Total'));        // → 'T4 Total'
console.log(normalizeThyroidParameter('Thyroid Stimulating Hormone')); // → 'TSH'

/**
 * ========================================================================
 * 3. SUPPORTED VARIATIONS
 * ========================================================================
 */

const VARIATIONS = {
  'FT3': [
    'FT3',
    'ft3',
    'Free T3',
    'free t3',
    'Free Triidothyronine',
    'Free Triidothyroninc',      // OCR typo
    'Free Triidothyroninc(FT3)'  // With parentheses
  ],
  
  'FT4': [
    'FT4',
    'ft4',
    'Free T4',
    'free t4',
    'Free Thyroxine',
    'Free Thyroxinc',            // OCR typo
    'Free Thyroxine(FT4)'        // With parentheses
  ],
  
  'T3 Total': [
    'T3 Total',
    't3 total',
    'T3, Total',
    'Total T3',
    'total t3',
    'Triiodothyronine Total',
    'Total Triiodothyronine'
  ],
  
  'T4 Total': [
    'T4 Total',
    't4 total',
    'T4, Total',
    'Total T4',
    'total t4',
    'Thyroxine Total',
    'Total Thyroxine'
  ],
  
  'TSH': [
    'TSH',
    'tsh',
    'Thyroid Stimulating Hormone',
    'thyroid stimulating hormone',
    'Thyroid Stimulating'
  ]
};

/**
 * ========================================================================
 * 4. INTEGRATION INTO EXTRACTION PIPELINE
 * ========================================================================
 */

const { normalizeExtractedData } = require('./services/normalizer');
const smartMedicalExtractor = require('./services/smartMedicalExtractor');

async function extractThyroidReport(ocrText) {
  // Step 1: Extract parameters from OCR text
  const extractionResult = smartMedicalExtractor.extract(ocrText);
  
  if (!extractionResult.success) {
    return {
      success: false,
      message: 'Extraction failed'
    };
  }
  
  // Step 2: Normalize and deduplicate
  // This automatically:
  // - Normalizes parameter names (FT3, FT4, T3 Total, T4 Total, TSH)
  // - Removes duplicates (keeps last occurrence)
  // - Normalizes units
  const normalizedParameters = normalizeExtractedData(extractionResult.parameters);
  
  // Step 3: Return normalized results
  return {
    success: true,
    parameters: normalizedParameters
  };
}

/**
 * ========================================================================
 * 5. DUPLICATE PREVENTION
 * ========================================================================
 */

// Example: Report contains duplicate entries with different naming
const rawExtraction = [
  { parameter: 'Free T3', value: 3.26, unit: 'pg/ml' },
  { parameter: 'FT3', value: 3.5, unit: 'pg/ml' },           // DUPLICATE - will be removed
  { parameter: 'T3, Total', value: 120, unit: 'ng/dL' },
  { parameter: 'Total T3', value: 125, unit: 'ng/dL' }       // DUPLICATE - will be removed
];

// After normalization:
const normalized = normalizeExtractedData(rawExtraction);
// Result: [
//   { parameter: 'FT3', value: 3.5, unit: 'pg/ml' },        // Last occurrence kept
//   { parameter: 'T3 Total', value: 125, unit: 'ng/dL' }   // Last occurrence kept
// ]

/**
 * ========================================================================
 * 6. DATABASE INTEGRATION
 * ========================================================================
 */

async function saveThyroidReport(userId, reportDate, ocrText) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  // Extract and normalize
  const extracted = await extractThyroidReport(ocrText);
  
  if (!extracted.success) {
    throw new Error('Extraction failed');
  }
  
  // Create report
  const report = await prisma.report.create({
    data: {
      userId: userId,
      testType: 'Thyroid Function Test',
      reportDate: reportDate,
      category: 'Lab Reports',
      subcategory: 'Thyroid Tests',
      ocrText: ocrText
    }
  });
  
  // Save each normalized parameter
  // Duplicates are already prevented by normalizeExtractedData()
  for (const param of extracted.parameters) {
    await prisma.testResult.create({
      data: {
        reportId: report.id,
        parameterName: param.parameter,  // Already normalized (FT3, FT4, T3 Total, etc.)
        value: param.value.toString(),
        unit: param.unit,
        status: calculateStatus(param.parameter, param.value)
      }
    });
  }
  
  return report;
}

/**
 * ========================================================================
 * 7. STATUS CALCULATION (HELPER)
 * ========================================================================
 */

function calculateStatus(parameter, value) {
  const ranges = {
    'FT3': { min: 2.0, max: 4.4 },
    'FT4': { min: 0.9, max: 1.7 },
    'T3 Total': { min: 80, max: 200 },
    'T4 Total': { min: 5.0, max: 12.0 },
    'TSH': { min: 0.4, max: 4.0 }
  };
  
  const range = ranges[parameter];
  if (!range) return 'NORMAL';
  
  const numValue = parseFloat(value);
  if (numValue < range.min) return 'LOW';
  if (numValue > range.max) return 'HIGH';
  return 'NORMAL';
}

/**
 * ========================================================================
 * 8. COMPLETE EXAMPLE
 * ========================================================================
 */

async function completeExample() {
  const ocrText = `
    Free Triidothyroninc(FT3): 3.26 pg/ml
    Free Thyroxine(FT4): 0.85 ng/dl
    Thyroid Stimulating Hormone: 0.78 uIU/ml
    T3, Total: 120 ng/dL
    T4, Total: 8.5 μg/dL
  `;
  
  // Extract
  const result = smartMedicalExtractor.extract(ocrText);
  console.log('Raw extraction:', result.parameters);
  
  // Normalize
  const normalized = normalizeExtractedData(result.parameters);
  console.log('Normalized:', normalized);
  
  // Expected output:
  // [
  //   { parameter: 'FT3', value: 3.26, unit: 'pg/ml' },
  //   { parameter: 'FT4', value: 0.85, unit: 'ng/dl' },
  //   { parameter: 'TSH', value: 0.78, unit: 'uIU/ml' },
  //   { parameter: 'T3 Total', value: 120, unit: 'ng/dL' },
  //   { parameter: 'T4 Total', value: 8.5, unit: 'μg/dL' }
  // ]
}

/**
 * ========================================================================
 * 9. TESTING
 * ========================================================================
 */

// Run comprehensive tests:
// $ node test_thyroid_normalization.js

// Test with actual reports:
// $ node test_thyroid_normalized.js

/**
 * ========================================================================
 * 10. API USAGE (extractionController.js)
 * ========================================================================
 */

// The extraction controller already uses normalizeExtractedData()
// in the analyzeReport function:

/*
const extractionResult = smartMedicalExtractor.extract(ocrText);
const finalParameters = normalizeExtractedData(extractionResult.parameters);

return res.status(200).json({
  success: true,
  parameters: finalParameters,  // Already normalized and deduplicated
  ...
});
*/

module.exports = {
  extractThyroidReport,
  saveThyroidReport,
  calculateStatus,
  VARIATIONS
};
