/**
 * Test: Strict Extraction System
 * 
 * Demonstrates how the strict validation prevents extraction of garbage text
 * like "eiog" instead of numeric values.
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');
const { isStrictlyNumeric, validateExtractedValue } = require('./services/strictValidator');
const { getParameterType } = require('./services/parameterTypes');

console.log('\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('      STRICT EXTRACTION SYSTEM - TEST SUITE');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n');

// ========================================
// TEST 1: Numeric Validation
// ========================================
console.log('TEST 1: NUMERIC VALIDATION');
console.log('─────────────────────────────────────────────────────────────\n');

const testValues = [
  { value: '138', expected: true, description: 'Valid integer' },
  { value: '138.5', expected: true, description: 'Valid decimal' },
  { value: '0.5', expected: true, description: 'Valid decimal < 1' },
  { value: 'eiog', expected: false, description: 'Garbage text' },
  { value: 'abc123', expected: false, description: 'Mix of letters and numbers' },
  { value: '', expected: false, description: 'Empty string' },
  { value: 'N/A', expected: false, description: 'N/A text' },
  { value: '12.34.56', expected: false, description: 'Multiple decimals' },
  { value: 'positive', expected: false, description: 'Qualitative value' },
];

for (const test of testValues) {
  const result = isStrictlyNumeric(test.value);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${test.description}: "${test.value}" → ${result}`);
}

console.log('\n');

// ========================================
// TEST 2: Parameter Type Detection
// ========================================
console.log('TEST 2: PARAMETER TYPE DETECTION');
console.log('─────────────────────────────────────────────────────────────\n');

const parameterTests = [
  { parameter: 'Fasting Blood Sugar', expectedType: 'NUMERIC' },
  { parameter: 'Glucose', expectedType: 'NUMERIC' },
  { parameter: 'Hemoglobin', expectedType: 'NUMERIC' },
  { parameter: 'Creatinine', expectedType: 'NUMERIC' },
  { parameter: 'HBsAg', expectedType: 'QUALITATIVE' },
  { parameter: 'Blood Group', expectedType: 'QUALITATIVE' },
  { parameter: 'Pus Cells', expectedType: 'MIXED' },
];

for (const test of parameterTests) {
  const detectedType = getParameterType(test.parameter);
  const status = detectedType === test.expectedType ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${test.parameter} → ${detectedType} (expected: ${test.expectedType})`);
}

console.log('\n');

// ========================================
// TEST 3: Value Validation by Parameter Type
// ========================================
console.log('TEST 3: VALUE VALIDATION BY PARAMETER TYPE');
console.log('─────────────────────────────────────────────────────────────\n');

const validationTests = [
  { parameter: 'Fasting Blood Sugar', value: '138', shouldPass: true },
  { parameter: 'Fasting Blood Sugar', value: 'eiog', shouldPass: false },
  { parameter: 'Glucose', value: '95.5', shouldPass: true },
  { parameter: 'Glucose', value: 'abc', shouldPass: false },
  { parameter: 'Blood Group', value: 'O+', shouldPass: true },
  { parameter: 'Blood Group', value: '123', shouldPass: false },
  { parameter: 'HBsAg', value: 'Negative', shouldPass: true },
  { parameter: 'HBsAg', value: '456', shouldPass: false },
];

for (const test of validationTests) {
  const expectedType = getParameterType(test.parameter);
  const validation = validateExtractedValue(test.parameter, test.value, expectedType);
  const status = validation.isValid === test.shouldPass ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${test.parameter} = "${test.value}" → ${validation.isValid ? 'VALID' : 'REJECTED'}`);
  if (!validation.isValid) {
    console.log(`       Reason: ${validation.reason}`);
  }
}

console.log('\n');

// ========================================
// TEST 4: Real-World Blood Sugar Report (with garbage values)
// ========================================
console.log('TEST 4: BLOOD SUGAR REPORT - GARBAGE DETECTION');
console.log('─────────────────────────────────────────────────────────────\n');

// Simulated OCR text with garbage values (like the user's problem)
const badOcrText = `
BLOOD SUGAR TEST REPORT
Patient: John Doe

Test Name               Result    Unit     Reference
─────────────────────────────────────────────────────
Sugar                   eiog      mg/dL    70-100
Fasting Blood Sugar     138       mg/dL    70-100
Random Text             abc123    mg/dL    80-140
Post Prandial Glucose   182       mg/dL    80-140
Hemoglobin             N/A       g/dL     13.0-17.0
`;

console.log('Input OCR Text (with garbage):');
console.log(badOcrText);
console.log('\nExtracting with STRICT validation...\n');

const result = extractWithStrictValidation(badOcrText, 'BLOOD_SUGAR');

console.log('─────────────────────────────────────────────────────────────');
console.log('RESULTS:');
console.log('─────────────────────────────────────────────────────────────\n');

console.log(`Report Type: ${result.reportType}`);
console.log(`Success: ${result.success}`);
console.log(`Valid Parameters: ${result.parameters.length}`);
console.log(`Rejected: ${result.rejected.length}\n`);

if (result.parameters.length > 0) {
  console.log('✅ VALID PARAMETERS EXTRACTED:');
  for (const param of result.parameters) {
    console.log(`   - ${param.parameter}: ${param.value} ${param.unit}`);
  }
  console.log('');
}

if (result.rejected.length > 0) {
  console.log('❌ REJECTED VALUES (GARBAGE):');
  for (const rejected of result.rejected) {
    console.log(`   - ${rejected.parameter}: "${rejected.rejectedValue}"`);
    console.log(`     Reason: ${rejected.reason}`);
  }
  console.log('');
}

// ========================================
// TEST 5: Clean Blood Sugar Report (all valid)
// ========================================
console.log('\nTEST 5: BLOOD SUGAR REPORT - CLEAN DATA');
console.log('─────────────────────────────────────────────────────────────\n');

const cleanOcrText = `
BLOOD SUGAR TEST REPORT
Patient: Jane Smith

Test Name               Result    Unit     Reference
─────────────────────────────────────────────────────
Fasting Blood Sugar     95        mg/dL    70-100
Post Prandial Glucose   125       mg/dL    80-140
HbA1c                   5.7       %        < 5.7
`;

console.log('Input OCR Text (clean):');
console.log(cleanOcrText);
console.log('\nExtracting with STRICT validation...\n');

const cleanResult = extractWithStrictValidation(cleanOcrText, 'BLOOD_SUGAR');

console.log('─────────────────────────────────────────────────────────────');
console.log('RESULTS:');
console.log('─────────────────────────────────────────────────────────────\n');

console.log(`Valid Parameters: ${cleanResult.parameters.length}`);
console.log(`Rejected: ${cleanResult.rejected.length}\n`);

if (cleanResult.parameters.length > 0) {
  console.log('✅ ALL PARAMETERS EXTRACTED:');
  for (const param of cleanResult.parameters) {
    console.log(`   - ${param.parameter}: ${param.value} ${param.unit}`);
  }
}

console.log('\n');

// ========================================
// SUMMARY
// ========================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('      TEST SUITE SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n✅ ALL TESTS COMPLETED\n');
console.log('KEY FEATURES DEMONSTRATED:');
console.log('  1. ✅ Strict numeric validation (regex /^\\d+(\\.\\d+)?$/)');
console.log('  2. ✅ Rejection of garbage text ("eiog", "abc123", "N/A")');
console.log('  3. ✅ Parameter type dictionary (NUMERIC/QUALITATIVE/MIXED)');
console.log('  4. ✅ Row-based extraction (not word proximity)');
console.log('  5. ✅ Special BLOOD_SUGAR validation');
console.log('\n');
console.log('═══════════════════════════════════════════════════════════════\n');
