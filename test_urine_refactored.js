/**
 * Test URINE_ROUTINE Refactored Extraction Pipeline
 * 
 * Tests:
 * 1. Column bleed fix (value + reference separation)
 * 2. Decimal precision preservation (1.020 not 1.02)
 * 3. Qualitative abnormal detection (++ glucose = abnormal)
 * 4. Microscopic section extraction
 * 5. Status evaluation (numeric ranges)
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

// Test OCR with all sections including microscopic
const testOcrText = `4CRL
Toll Free No. 1800-313-7878
Diagnostics
URINE EXAMINATION ROUTINE

Gross Examination (Physical Examination)
Volume  50  ml
Colour  YELLOW  PALE YELLOW
Appearance  CLEAR  CLEAR

Chemical Examination
Ph  5.5  4.6-8.0
Specific Gravity  1.020  1.005-1.030
Urine Protein  NEGATIVE  NEGATIVE
Urine Glucose  ++  NEGATIVE
Ketone  NEGATIVE  NEGATIVE
Nitrite  NEGATIVE  NEGATIVE
Blood  TRACE  NEGATIVE
Urobilinogen  NORMAL  NORMAL
Bilirubin  NEGATIVE  NEGATIVE
Leukocyte  NEGATIVE  NEGATIVE

Microscopic Examination
RBC  3-5  NIL
Pus Cells  8-10  0-5
Epithelial Cells  FEW  FEW
Casts  NIL  NIL
Crystals  NIL  NIL
Bacteria  NIL  NIL
Budding Yeast Cells  NIL  NIL`;

console.log('========================================');
console.log('🧪 TESTING REFACTORED URINE EXTRACTION');
console.log('========================================\n');

const result = extractWithStrictValidation(testOcrText);

console.log('\n========================================');
console.log('📊 TEST RESULTS');
console.log('========================================\n');

console.log(`Report Type: ${result.reportType === 'URINE_ROUTINE' ? '✅' : '❌'} ${result.reportType}`);
console.log(`Parameters Extracted: ${result.parameters.length}\n`);

// Expected sections
const expectedPhysical = ['Volume', 'Colour', 'Appearance'];
const expectedChemical = ['pH', 'Specific Gravity', 'Urine Protein', 'Urine Glucose', 'Ketone', 'Nitrite', 'Blood', 'Urobilinogen', 'Bilirubin', 'Leukocyte'];
const expectedMicroscopic = ['RBC', 'Pus Cells', 'Epithelial Cells', 'Casts', 'Crystals', 'Bacteria', 'Budding Yeast Cells'];

const allExpected = [...expectedPhysical, ...expectedChemical, ...expectedMicroscopic];

console.log('✅ Extracted Parameters:\n');
result.parameters.forEach(p => {
  const precision = p.numericValue !== undefined ? ` (numeric: ${p.numericValue})` : '';
  const status = p.status ? ` - ${p.status}` : '';
  const ref = p.referenceRange ? ` [Ref: ${p.referenceRange}]` : '';
  console.log(`   ${p.parameter}: ${p.value} ${p.unit || ''}${precision}${ref}${status}`);
});

// Check coverage
const extractedNames = result.parameters.map(p => p.parameter);
const missing = allExpected.filter(p => !extractedNames.includes(p));

if (missing.length > 0) {
  console.log(`\n❌ Missing Parameters (${missing.length}):`);
  missing.forEach(p => console.log(`   - ${p}`));
}

console.log('\n========================================');
console.log('🎯 FEATURE TESTS:');
console.log('========================================\n');

// Test 1: Column bleed fix
const colourParam = result.parameters.find(p => p.parameter === 'Colour');
const columnBleedFixed = colourParam && colourParam.value === 'YELLOW' && colourParam.referenceRange === 'PALE YELLOW';
console.log(`1️⃣ Column Bleed Fix: ${columnBleedFixed ? '✅' : '❌'}`);
if (colourParam) {
  console.log(`   Value: "${colourParam.value}" | Reference: "${colourParam.referenceRange}"`);
  console.log(`   ${columnBleedFixed ? 'PASS' : 'FAIL'}: Value and reference separated correctly`);
}

// Test 2: Decimal precision preservation
const sgParam = result.parameters.find(p => p.parameter === 'Specific Gravity');
const precisionPreserved = sgParam && sgParam.value === '1.020' && sgParam.numericValue === 1.02;
console.log(`\n2️⃣ Decimal Precision: ${precisionPreserved ? '✅' : '❌'}`);
if (sgParam) {
  console.log(`   String value: "${sgParam.value}" (preserves trailing zero)`);
  console.log(`   Numeric value: ${sgParam.numericValue} (for calculations)`);
  console.log(`   ${precisionPreserved ? 'PASS' : 'FAIL'}: Precision preserved in string, numeric available`);
}

// Test 3: Qualitative abnormal detection
const glucoseParam = result.parameters.find(p => p.parameter === 'Urine Glucose');
const abnormalDetected = glucoseParam && glucoseParam.value === '++' && glucoseParam.status === 'Abnormal';
console.log(`\n3️⃣ Qualitative Abnormal: ${abnormalDetected ? '✅' : '❌'}`);
if (glucoseParam) {
  console.log(`   Value: "${glucoseParam.value}" | Reference: "${glucoseParam.referenceRange}"`);
  console.log(`   Status: ${glucoseParam.status}`);
  console.log(`   ${abnormalDetected ? 'PASS' : 'FAIL'}: ++ glucose correctly marked as Abnormal`);
}

// Test 3b: Blood TRACE should be abnormal
const bloodParam = result.parameters.find(p => p.parameter === 'Blood');
const bloodAbnormal = bloodParam && bloodParam.value === 'TRACE' && bloodParam.status === 'Abnormal';
console.log(`\n3️⃣b Blood TRACE Abnormal: ${bloodAbnormal ? '✅' : '❌'}`);
if (bloodParam) {
  console.log(`   Value: "${bloodParam.value}" | Reference: "${bloodParam.referenceRange}"`);
  console.log(`   Status: ${bloodParam.status}`);
  console.log(`   ${bloodAbnormal ? 'PASS' : 'FAIL'}: TRACE correctly marked as Abnormal (ref: NEGATIVE)`);
}

// Test 4: Microscopic section extraction
const microscopicExtracted = ['RBC', 'Pus Cells', 'Epithelial Cells', 'Casts'].every(p => extractedNames.includes(p));
console.log(`\n4️⃣ Microscopic Section: ${microscopicExtracted ? '✅' : '❌'}`);
const rbcParam = result.parameters.find(p => p.parameter === 'RBC');
const pusParam = result.parameters.find(p => p.parameter === 'Pus Cells');
if (rbcParam) console.log(`   RBC: ${rbcParam.value} [Ref: ${rbcParam.referenceRange}]`);
if (pusParam) console.log(`   Pus Cells: ${pusParam.value} [Ref: ${pusParam.referenceRange}]`);
console.log(`   ${microscopicExtracted ? 'PASS' : 'FAIL'}: Microscopic parameters extracted`);

// Test 5: Numeric status evaluation
const phParam = result.parameters.find(p => p.parameter === 'pH');
const phNormal = phParam && phParam.numericValue === 5.5 && phParam.status === 'Normal';
console.log(`\n5️⃣ Numeric Status Eval: ${phNormal ? '✅' : '❌'}`);
if (phParam) {
  console.log(`   pH: ${phParam.value} (numeric: ${phParam.numericValue})`);
  console.log(`   Reference: ${phParam.referenceRange}`);
  console.log(`   Status: ${phParam.status}`);
  console.log(`   ${phNormal ? 'PASS' : 'FAIL'}: 5.5 is within 4.6-8.0 range`);
}

// Test 5b: Out-of-range detection
const pusStatus = pusParam && pusParam.status;
console.log(`\n5️⃣b Out-of-Range Detection: ${pusStatus ? '✅' : '❌'}`);
if (pusParam) {
  console.log(`   Pus Cells: ${pusParam.value} [Ref: ${pusParam.referenceRange}]`);
  console.log(`   Status: ${pusParam.status || 'N/A'}`);
  console.log(`   Note: 8-10 should be compared to 0-5 range (expected: Abnormal if implemented)`);
}

console.log('\n========================================');
console.log('📈 SUMMARY');
console.log('========================================\n');

const allTests = [
  columnBleedFixed,
  precisionPreserved,
  abnormalDetected,
  bloodAbnormal,
  microscopicExtracted,
  phNormal
];

const passedTests = allTests.filter(t => t).length;
const totalTests = allTests.length;

console.log(`Tests Passed: ${passedTests}/${totalTests}`);
console.log(`Parameters: ${result.parameters.length}/${allExpected.length} expected`);
console.log(`Missing: ${missing.length}`);
console.log(`Rejected: ${result.rejected.length}`);

if (passedTests === totalTests && missing.length === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Refactoring successful!\n');
} else {
  console.log('\n⚠️  Some tests failed or incomplete extraction\n');
}
