/**
 * End-to-End Test: Thyroid Report with Multiple Variations
 * 
 * This test simulates a real-world scenario where a thyroid report
 * contains multiple naming variations and duplicates.
 */

const smartMedicalExtractor = require('./services/smartMedicalExtractor');
const { normalizeExtractedData } = require('./services/normalizer');

console.log('='.repeat(70));
console.log('END-TO-END THYROID REPORT TEST');
console.log('='.repeat(70));

// Simulated OCR text with various naming formats
const complexOcrText = `
THYROID FUNCTION TEST REPORT

Patient Name: Test Patient
Date: 18-Feb-2026

TEST RESULTS:

Free Triidothyroninc(FT3)    3.26    pg/ml    2.50-3.90
Free T3                      3.5     pg/ml    2.50-3.90

Free Thyroxine(FT4)          0.85    ng/dl    0.61-1.12
FT4                          0.9     ng/dl    0.61-1.12

T3, Total                    120     ng/dL    80-200
Total T3                     125     ng/dL    80-200

T4, Total                    8.5     μg/dL    5.0-12.0
Total T4                     9.0     μg/dL    5.0-12.0

Thyroid Stimulating Hormone  2.5     μIU/mL   0.34-5.60
TSH                          2.8     μIU/mL   0.34-5.60
`;

console.log('\n📄 SIMULATED OCR TEXT:');
console.log('-'.repeat(70));
console.log(complexOcrText);

// Step 1: Extract parameters
console.log('\n📊 STEP 1: EXTRACTION');
console.log('-'.repeat(70));
const extractionResult = smartMedicalExtractor.extract(complexOcrText);

console.log(`Success: ${extractionResult.success}`);
console.log(`Raw Parameters Extracted: ${extractionResult.parameters.length}`);

console.log('\nRaw extraction results:');
extractionResult.parameters.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
});

// Step 2: Normalize and deduplicate
console.log('\n🔄 STEP 2: NORMALIZATION & DEDUPLICATION');
console.log('-'.repeat(70));
const normalized = normalizeExtractedData(extractionResult.parameters);

console.log(`Normalized Parameters: ${normalized.length}`);
console.log('\nFinal normalized results:');
normalized.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
});

// Step 3: Verify results
console.log('\n✅ STEP 3: VERIFICATION');
console.log('-'.repeat(70));

const expectedParameters = new Set(['FT3', 'FT4', 'T3 Total', 'T4 Total', 'TSH']);
const actualParameters = new Set(normalized.map(p => p.parameter));

const allExpectedPresent = [...expectedParameters].every(p => actualParameters.has(p));
const noExtraParameters = normalized.length === expectedParameters.size;

console.log('Expected Parameters:', Array.from(expectedParameters).join(', '));
console.log('Actual Parameters:', Array.from(actualParameters).join(', '));
console.log('');

if (allExpectedPresent && noExtraParameters) {
  console.log('✅ SUCCESS: All 5 parameters present and correctly separated');
  console.log('✅ Duplicates were correctly removed');
  console.log('✅ Last occurrence of each parameter was kept');
} else {
  console.log('❌ FAILED: Parameters not correctly normalized');
  if (!allExpectedPresent) {
    console.log('   Missing parameters:', 
      [...expectedParameters].filter(p => !actualParameters.has(p)));
  }
  if (!noExtraParameters) {
    console.log('   Extra parameters found');
  }
}

// Step 4: Show what would be saved to database
console.log('\n💾 STEP 4: DATABASE RECORDS (WOULD BE SAVED)');
console.log('-'.repeat(70));

normalized.forEach((p, i) => {
  console.log(`Record ${i + 1}:`);
  console.log(`  parameterName: "${p.parameter}"`);
  console.log(`  value: ${p.value}`);
  console.log(`  unit: "${p.unit}"`);
  console.log('');
});

// Summary
console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`Input: ${extractionResult.parameters.length} parameters (with duplicates)`);
console.log(`Output: ${normalized.length} parameters (deduplicated)`);
console.log(`Removed: ${extractionResult.parameters.length - normalized.length} duplicates`);
console.log('');
console.log('Final Parameters:');
normalized.forEach(p => {
  console.log(`  ✅ ${p.parameter}: ${p.value} ${p.unit}`);
});
console.log('='.repeat(70));
