/**
 * Blood Sugar Processor - Quick Reference & Integration Guide
 */

// ═══════════════════════════════════════════════════════════════════════════
// QUICK IMPORT
// ═══════════════════════════════════════════════════════════════════════════

const {
  processBloodSugarReport,    // Main function ⭐
  getReportSummary,           // Get statistics
  getInterpretation,          // Medical interpretation
  validateReport,             // Validate completeness
  exportReport                // Export in different formats
} = require('./services/bloodSugarProcessor');

// ═══════════════════════════════════════════════════════════════════════════
// BASIC USAGE (30 seconds)
// ═══════════════════════════════════════════════════════════════════════════

const data = [
  { parameter: 'Fasting Glucose', value: 138, unit: 'mg/dl' },
  { parameter: 'HbA1c', value: 6.8, unit: '%' }
];

const report = processBloodSugarReport(data);

console.log(report.fasting_glucose);
// { name: 'Fasting Glucose', value: 138, unit: 'mg/dL', status: 'High', confidence: 100 }

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORTED PARAMETERS & VARIATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Fasting Glucose → fasting_glucose
'Fasting Glucose'
'Blood sugar Fasting'
'Glucose Fasting'
'FBS'
'FPG'
'Glucose Fasting Plasma'

// Postprandial Glucose → postprandial_glucose
'Postprandial Glucose'
'Post Prandial'
'PP Glucose'
'PPBS'
'2hr Glucose'
'Post meal'

// Random Glucose → random_glucose
'Random Glucose'
'RBS'
'Random Blood Sugar'

// HbA1c → hba1c
'HbA1c'
'HB A1C'
'A1C'
'Glycated Hemoglobin'

// ═══════════════════════════════════════════════════════════════════════════
// REFERENCE RANGES
// ═══════════════════════════════════════════════════════════════════════════

/*
Fasting Glucose:
  Low:    < 70 mg/dL
  Normal: 70-99 mg/dL
  High:   ≥ 100 mg/dL

Postprandial Glucose:
  Low:    < 70 mg/dL
  Normal: 70-139 mg/dL
  High:   ≥ 140 mg/dL

Random Glucose:
  Low:    < 70 mg/dL
  Normal: 70-139 mg/dL
  High:   ≥ 140 mg/dL

HbA1c:
  Low:         < 4.0%
  Normal:      4.0-5.6%
  Prediabetes: 5.7-6.4%
  High:        ≥ 6.5%
*/

// ═══════════════════════════════════════════════════════════════════════════
// COMMON PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

// Pattern 1: Process and get summary
const report1 = processBloodSugarReport(data);
const summary = getReportSummary(report1);
console.log(`Detected: ${summary.detected}/${summary.totalParameters}`);

// Pattern 2: Get only detected parameters
const compact = exportReport(report1, 'compact');
// Returns only parameters with non-null values

// Pattern 3: Medical interpretation
const interpretation = getInterpretation(report1);
console.log(interpretation);

// Pattern 4: Validate before saving
const validation = validateReport(report1, ['fasting_glucose']);
if (validation.isValid) {
  // Save to database
}

// Pattern 5: Full medical report
const medical = exportReport(report1, 'medical');
console.log(medical.interpretation);

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION WITH YOUR SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const smartMedicalExtractor = require('./services/smartMedicalExtractor');
const { normalizeExtractedData } = require('./services/normalizer');

async function processOCRReport(ocrText) {
  // Step 1: Extract parameters
  const extracted = smartMedicalExtractor.extract(ocrText);
  
  // Step 2: Normalize
  const normalized = normalizeExtractedData(extracted.parameters);
  
  // Step 3: Process as blood sugar report
  const bloodSugar = processBloodSugarReport(normalized);
  
  // Step 4: Get summary and interpretation
  const summary = getReportSummary(bloodSugar);
  const interpretation = getInterpretation(bloodSugar);
  
  return {
    report: bloodSugar,
    summary,
    interpretation
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REAL-WORLD EXAMPLES (From Your Reports)
// ═══════════════════════════════════════════════════════════════════════════

// Example 1: Your actual blood glucose report
const yourReport1 = processBloodSugarReport([
  { parameter: 'Glucose Fasting Plasma', value: 124, unit: 'mg/dL' },
  { parameter: 'Glucose PP Plasma', value: 174, unit: 'mg/dL' }
]);

console.log(yourReport1.fasting_glucose);
// { name: 'Fasting Glucose', value: 124, unit: 'mg/dL', status: 'High', confidence: 100 }

console.log(yourReport1.postprandial_glucose);
// { name: 'Postprandial Glucose', value: 174, unit: 'mg/dL', status: 'High', confidence: 100 }

// Example 2: KKC Lab format
const yourReport2 = processBloodSugarReport([
  { parameter: 'Blood sugar (Fasting)', value: 138, unit: 'mg/dl' },
  { parameter: 'Blood sugar (Post Prandial)', value: 254, unit: 'mg/dl' }
]);

// Both map to standard keys automatically

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

const exampleOutput = {
  fasting_glucose: {
    name: 'Fasting Glucose',
    value: 138,              // number | null
    unit: 'mg/dL',           // standardized
    status: 'High',          // 'Low' | 'Normal' | 'High' | null
    confidence: 100          // 0-100 | null
  },
  postprandial_glucose: {
    name: 'Postprandial Glucose',
    value: null,
    unit: 'mg/dL',
    status: null,
    confidence: null
  },
  random_glucose: { /* ... */ },
  hba1c: { /* ... */ }
};

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

const exampleSummary = {
  totalParameters: 4,
  detected: 2,
  missing: 2,
  normal: 0,
  abnormal: 2,
  low: 0,
  high: 2,
  prediabetes: 0,
  averageConfidence: 100,
  parameters: {
    detected: ['Fasting Glucose', 'Postprandial Glucose'],
    missing: ['Random Glucose', 'HbA1c'],
    abnormal: [
      { name: 'Fasting Glucose', status: 'High' },
      { name: 'Postprandial Glucose', status: 'High' }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FORMATS
// ═══════════════════════════════════════════════════════════════════════════

const report = processBloodSugarReport(data);

// 1. JSON (full structure)
const jsonFormat = exportReport(report, 'json');
// All 4 parameters, detected and null

// 2. Compact (only detected)
const compactFormat = exportReport(report, 'compact');
// Only parameters with values

// 3. Summary (statistics)
const summaryFormat = exportReport(report, 'summary');
// { totalParameters, detected, missing, abnormal, etc. }

// 4. Medical (comprehensive)
const medicalFormat = exportReport(report, 'medical');
// { report, summary, interpretation }

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const validationResult = validateReport(report, ['fasting_glucose']);
/*
{
  isValid: true,
  errors: [],           // Missing required parameters
  warnings: []          // Low confidence values
}
*/

// ═══════════════════════════════════════════════════════════════════════════
// EDGE CASES HANDLED
// ═══════════════════════════════════════════════════════════════════════════

const edgeCases = processBloodSugarReport([
  { parameter: 'FBS', value: null, unit: 'mg/dl' },           // Null value → handled
  { parameter: 'HbA1c', value: '5.8', unit: '%' },            // String → parsed
  { parameter: '', value: 100, unit: 'mg/dl' },               // Empty name → ignored
  { parameter: 'Unknown Test', value: 50, unit: 'xyz' },      // Unknown → ignored
  { parameter: 'Blood Pressure', value: 120, unit: 'mm Hg' }  // Not blood sugar → ignored
]);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE SCORING
// ═══════════════════════════════════════════════════════════════════════════

/*
Confidence is calculated based on:
- Exact match (100): "Fasting Glucose"
- Partial match (80): "Glucose Fasting"  
- Fuzzy match (60): "FBS"
- Valid unit (+20): "mg/dL" matches expected
- Numeric value (+10): Valid number present

Total: 0-100
*/

// ═══════════════════════════════════════════════════════════════════════════
// TESTING
// ═══════════════════════════════════════════════════════════════════════════

// Run comprehensive tests
// node test_blood_sugar_processor.js

// Tests cover:
// ✓ Complete reports (all 4 parameters)
// ✓ Partial reports (missing parameters)
// ✓ Real-world data (your actual reports)
// ✓ Lab variations (FBS, PPBS, etc.)
// ✓ Edge cases (null, strings, unknown)
// ✓ Validation
// ✓ All status types
// ✓ Export formats

// ═══════════════════════════════════════════════════════════════════════════
// EXTENDING FOR NEW REPORT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/*
To add Lipid Profile:

1. Create: services/reportTemplates/lipidProfileTemplate.js
2. Define: total_cholesterol, hdl, ldl, triglycerides
3. Add match patterns and ranges
4. Create: services/lipidProfileProcessor.js
5. Use same architecture as bloodSugarProcessor
*/

// ═══════════════════════════════════════════════════════════════════════════
// END OF QUICK REFERENCE
// ═══════════════════════════════════════════════════════════════════════════
