/*
 * ═══════════════════════════════════════════════════════════════════
 * NORMALIZATION QUICK REFERENCE
 * ═══════════════════════════════════════════════════════════════════
 */

// ──────────────────────────────────────────────────────────────────
// IMPORT
// ──────────────────────────────────────────────────────────────────

const { 
  normalizeUnit,          // Individual unit normalization
  normalizeParameter,     // Individual parameter normalization
  removeDuplicates,       // Remove duplicate parameters
  normalizeExtractedData  // ⭐ Main function (use this)
} = require('./services/normalizer');

// ──────────────────────────────────────────────────────────────────
// BASIC USAGE (In API Controller)
// ──────────────────────────────────────────────────────────────────

// After extraction
const result = smartMedicalExtractor.extract(ocrText);

// Apply normalization ✨
const normalized = normalizeExtractedData(result.parameters);

// Save to database
for (const param of normalized) {
  // param.parameter is now standardized
  // param.unit is now standardized
}

// ──────────────────────────────────────────────────────────────────
// PARAMETER NORMALIZATION EXAMPLES
// ──────────────────────────────────────────────────────────────────

normalizeParameter('Blood sugar Fasting')      → 'Fasting Glucose'
normalizeParameter('Glucose Fasting Plasma')   → 'Fasting Glucose'
normalizeParameter('FBS')                      → 'Fasting Glucose'

normalizeParameter('Blood sugar Post Prandial') → 'Postprandial Glucose'
normalizeParameter('Glucose PP Plasma')         → 'Postprandial Glucose'
normalizeParameter('PPBS')                      → 'Postprandial Glucose'

normalizeParameter('Systolic')                  → 'Blood Pressure Systolic'
normalizeParameter('Diastolic')                 → 'Blood Pressure Diastolic'

normalizeParameter('Pulse')                     → 'Pulse'
normalizeParameter('Heart Rate')                → 'Pulse'

normalizeParameter('Hemoglobin')                → 'Hemoglobin'
normalizeParameter('HB')                        → 'Hemoglobin'

normalizeParameter('Total Cholesterol')         → 'Total Cholesterol'
normalizeParameter('HDL')                       → 'HDL Cholesterol'
normalizeParameter('LDL')                       → 'LDL Cholesterol'

// ──────────────────────────────────────────────────────────────────
// UNIT NORMALIZATION EXAMPLES
// ──────────────────────────────────────────────────────────────────

normalizeUnit('mg/dl')      → 'mg/dL'
normalizeUnit('mgdl')       → 'mg/dL'
normalizeUnit('mg / dl')    → 'mg/dL'

normalizeUnit('mmofhg')     → 'mm Hg'
normalizeUnit('mm of hg')   → 'mm Hg'
normalizeUnit('mmhg')       → 'mm Hg'

normalizeUnit('permin')     → 'per/min'
normalizeUnit('per/minute') → 'per/min'
normalizeUnit('bpm')        → 'per/min'

normalizeUnit('g/dl')       → 'g/dL'
normalizeUnit('percent')    → '%'
normalizeUnit('mmol/l')     → 'mmol/L'

// ──────────────────────────────────────────────────────────────────
// COMPLETE EXAMPLE
// ──────────────────────────────────────────────────────────────────

// Input: Raw extraction from 2 different lab formats
const rawData = [
  { parameter: 'Blood sugar Fasting', value: 138, unit: 'mg/dl', status: 'HIGH' },
  { parameter: 'Systolic', value: 155, unit: 'mmofhg', status: 'HIGH' },
  { parameter: 'Pulse', value: 85, unit: 'permin', status: 'NORMAL' },
  
  // Duplicates from another lab
  { parameter: 'Glucose Fasting Plasma', value: 124, unit: 'mg/dL', status: 'HIGH' },
  { parameter: 'Blood Pressure Systolic', value: 150, unit: 'mm Hg', status: 'HIGH' }
];

// Apply normalization
const normalized = normalizeExtractedData(rawData);

// Output: Clean, deduplicated data
[
  { parameter: 'Fasting Glucose', value: 124, unit: 'mg/dL', status: 'HIGH' },
  { parameter: 'Blood Pressure Systolic', value: 150, unit: 'mm Hg', status: 'HIGH' },
  { parameter: 'Pulse', value: 85, unit: 'per/min', status: 'NORMAL' }
]

// ──────────────────────────────────────────────────────────────────
// ADDING NEW PARAMETER MAPPING
// ──────────────────────────────────────────────────────────────────

// Edit services/normalizer.js
// Add to parameterMappings array:

{
  patterns: [
    /vitamin\s+b12/i,
    /vit\s+b12/i,
    /cobalamin/i
  ],
  standard: 'Vitamin B12'
}

// ──────────────────────────────────────────────────────────────────
// ADDING NEW UNIT MAPPING
// ──────────────────────────────────────────────────────────────────

// Edit services/normalizer.js
// Add to unitMappings array:

{
  patterns: [
    /pg\s*\/\s*ml$/i,
    /pgml$/i
  ],
  standard: 'pg/mL'
}

// ──────────────────────────────────────────────────────────────────
// CATEGORY COVERAGE
// ──────────────────────────────────────────────────────────────────

✅ Glucose Tests (Fasting, PP, Random, HbA1c)
✅ Blood Pressure (Systolic, Diastolic)
✅ Vital Signs (Pulse, Temperature, Respiratory Rate)
✅ CBC (Hemoglobin, RBC, WBC, Platelets, Hematocrit)
✅ Lipid Profile (Total Cholesterol, HDL, LDL, Triglycerides)
✅ Kidney Function (BUN, Creatinine, Uric Acid)
✅ Liver Function (AST, ALT, Bilirubin)
✅ Thyroid (TSH, T3, T4)
✅ Unknown parameters (preserved with cleaned name)

// ──────────────────────────────────────────────────────────────────
// TESTING
// ──────────────────────────────────────────────────────────────────

// Run test suite
node test_normalizer.js

// Run usage examples
node example_usage.js

// ──────────────────────────────────────────────────────────────────
// FILES
// ──────────────────────────────────────────────────────────────────

services/normalizer.js           - Core normalization functions
controllers/extractionController.js - Integration (already done)
test_normalizer.js               - Test suite
example_usage.js                 - Usage examples
NORMALIZATION_README.md          - Complete documentation

// ──────────────────────────────────────────────────────────────────
// BENEFITS
// ──────────────────────────────────────────────────────────────────

✅ Eliminates duplicate parameters from different labs
✅ Standardizes unit formatting
✅ Simplifies database queries
✅ Enables cross-lab trend analysis
✅ Production-ready error handling
✅ Extensible for new parameters
✅ "Last occurrence wins" for duplicates

/*
 * ═══════════════════════════════════════════════════════════════════
 * END OF QUICK REFERENCE
 * ═══════════════════════════════════════════════════════════════════
 */
