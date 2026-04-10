/**
 * Test URINE_ROUTINE Extraction
 * 
 * Tests:
 * 1. Report type detection for urine reports
 * 2. Numeric validation for numeric urine parameters
 * 3. Qualitative values for qualitative parameters
 * 4. OCR value normalization (6.C → 6.0, O → 0, l → 1)
 */

const { extractWithStrictValidation, detectReportType } = require('./services/strictExtractionService');

console.log('\n========================================');
console.log('🧪 URINE EXTRACTION TEST');
console.log('========================================\n');

// Test 1: Report Type Detection
console.log('TEST 1: Report Type Detection\n');

const testOcrTexts = [
  'URINE EXAMINATION ROUTINE',
  'URINE ROUTINE',
  'Routine Urine Examination',
  'URINE R/E',
  'Complete Blood Count'  // Should NOT match
];

testOcrTexts.forEach(text => {
  const type = detectReportType(text);
  const expected = text.toLowerCase().includes('blood') ? 'CBC' : 'URINE_ROUTINE';
  const status = type === expected ? '✅' : '❌';
  console.log(`${status} "${text}" → ${type}`);
});

// Test 2: Numeric Validation with OCR Normalization
console.log('\n\nTEST 2: Numeric Parameter Extraction + OCR Normalization\n');

const urineOcrText = `
URINE EXAMINATION ROUTINE

PARAMETER         RESULT      UNIT       REFERENCE
Volume            15O         ml         -
Ph                6.C                    5.0-8.0
Specific Gravity  l.O2O                  1.010-1.025
Protein           Negative               Negative
Glucose           Negative               Negative
Ketone            Negative               Negative
Blood             Negative               Negative
Nitrite           Negative               Negative
Urobilinogen      Normal                 Normal
Bilirubin         Negative               Negative
Leukocyte         Negative               Negative
`;

const result = extractWithStrictValidation(urineOcrText);

console.log(`Report Type: ${result.reportType}`);
console.log(`Success: ${result.success}`);
console.log(`\nExtracted Parameters (${result.parameters.length}):`);

result.parameters.forEach(param => {
  console.log(`  ✅ ${param.parameter}: ${param.value} ${param.unit || ''}`);
});

if (result.rejected && result.rejected.length > 0) {
  console.log(`\nRejected Parameters (${result.rejected.length}):`);
  result.rejected.forEach(param => {
    console.log(`  ❌ ${param.parameter}: "${param.rejectedValue}" - ${param.reason}`);
  });
}

// Test 3: Verify OCR Normalization
console.log('\n\nTEST 3: OCR Normalization Verification\n');

const expectedNormalizations = {
  'Volume': '150',        // 15O → 150 (O → 0)
  'Ph': '6.0',           // 6.C → 6.0 → 6 (validator accepts both)
  'Specific Gravity': '1.02'  // l.O2O → 1.020 → 1.02 (trailing zero removed)
};

let normalizedCorrectly = true;

result.parameters.forEach(param => {
  if (expectedNormalizations[param.parameter]) {
    const expected = expectedNormalizations[param.parameter];
    // Accept both with and without trailing zeros (6.0 === 6, 1.020 === 1.02)
    const match = param.value === expected || parseFloat(param.value) === parseFloat(expected);
    if (match) {
      console.log(`✅ ${param.parameter}: "${param.value}" - Normalized correctly (from OCR artifacts)`);
    } else {
      console.log(`❌ ${param.parameter}: Expected "${expected}", Got "${param.value}"`);
      normalizedCorrectly = false;
    }
  }
});

// Test 4: Verify Qualitative Parameters Accepted
console.log('\n\nTEST 4: Qualitative Parameters\n');

const qualParams = result.parameters.filter(p => 
  ['Protein', 'Glucose', 'Ketone', 'Blood', 'Nitrite', 'Urobilinogen', 'Bilirubin', 'Leukocyte'].includes(p.parameter)
);

console.log(`Qualitative parameters extracted: ${qualParams.length}`);
qualParams.forEach(param => {
  console.log(`  ✅ ${param.parameter}: ${param.value}`);
});

// Summary
console.log('\n========================================');
console.log('📊 TEST SUMMARY');
console.log('========================================');
console.log(`Report Type: ${result.reportType === 'URINE_ROUTINE' ? '✅ URINE_ROUTINE' : '❌ ' + result.reportType}`);
console.log(`Numeric Params Extracted: ${result.parameters.filter(p => ['Volume', 'Ph', 'Specific Gravity'].includes(p.parameter)).length}/3`);
console.log(`Qualitative Params Extracted: ${qualParams.length}`);
console.log(`OCR Normalization: ${normalizedCorrectly ? '✅ Working' : '❌ Failed'}`);
console.log(`Rejected (garbage): ${result.rejected.length}`);
console.log('========================================\n');
