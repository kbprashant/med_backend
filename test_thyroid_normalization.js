/**
 * Test Thyroid Parameter Normalization
 * 
 * Verifies that thyroid parameters are correctly normalized and kept separate:
 * - FT3, FT4, T3 Total, T4 Total, TSH should all be DIFFERENT
 * - Various naming formats should normalize to standard names
 * - Duplicates should be prevented
 */

const { normalizeThyroidParameter, normalizeExtractedData } = require('./services/normalizer');

console.log('='.repeat(70));
console.log('THYROID PARAMETER NORMALIZATION TEST');
console.log('='.repeat(70));

// Test cases for different thyroid parameter variations
const testCases = [
  // FT3 variations
  { input: 'FT3', expected: 'FT3' },
  { input: 'ft3', expected: 'FT3' },
  { input: 'Free T3', expected: 'FT3' },
  { input: 'free t3', expected: 'FT3' },
  { input: 'Free Triidothyronine', expected: 'FT3' },
  { input: 'Free Triidothyroninc(FT3)', expected: 'FT3' },
  
  // FT4 variations
  { input: 'FT4', expected: 'FT4' },
  { input: 'ft4', expected: 'FT4' },
  { input: 'Free T4', expected: 'FT4' },
  { input: 'free t4', expected: 'FT4' },
  { input: 'Free Thyroxine', expected: 'FT4' },
  { input: 'Free Thyroxine(FT4)', expected: 'FT4' },
  
  // T3 Total variations
  { input: 'T3 Total', expected: 'T3 Total' },
  { input: 't3 total', expected: 'T3 Total' },
  { input: 'T3, Total', expected: 'T3 Total' },
  { input: 'Total T3', expected: 'T3 Total' },
  { input: 'total t3', expected: 'T3 Total' },
  { input: 'Triiodothyronine Total', expected: 'T3 Total' },
  
  // T4 Total variations
  { input: 'T4 Total', expected: 'T4 Total' },
  { input: 't4 total', expected: 'T4 Total' },
  { input: 'T4, Total', expected: 'T4 Total' },
  { input: 'Total T4', expected: 'T4 Total' },
  { input: 'total t4', expected: 'T4 Total' },
  { input: 'Thyroxine Total', expected: 'T4 Total' },
  
  // TSH variations
  { input: 'TSH', expected: 'TSH' },
  { input: 'tsh', expected: 'TSH' },
  { input: 'Thyroid Stimulating Hormone', expected: 'TSH' },
  { input: 'thyroid stimulating hormone', expected: 'TSH' },
  
  // Plain T3 and T4 (should remain separate)
  { input: 'T3', expected: 'T3' },
  { input: 't3', expected: 'T3' },
  { input: 'T4', expected: 'T4' },
  { input: 't4', expected: 'T4' }
];

console.log('\n1. INDIVIDUAL PARAMETER NORMALIZATION:');
console.log('-'.repeat(70));

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = normalizeThyroidParameter(test.input);
  const status = result === test.expected ? '✅' : '❌';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
    console.log(`${status} "${test.input}" → "${result}" (expected: "${test.expected}")`);
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

// Test that different parameters remain separate
console.log('\n2. VERIFYING PARAMETERS REMAIN SEPARATE:');
console.log('-'.repeat(70));

const separateParameters = [
  { name: 'FT3', value: 1.5 },
  { name: 'FT4', value: 2.0 },
  { name: 'T3 Total', value: 100 },
  { name: 'T4 Total', value: 8.0 },
  { name: 'TSH', value: 2.5 }
];

const normalized = normalizeExtractedData(separateParameters.map(p => ({
  parameter: p.name,
  value: p.value,
  unit: 'ng/dL'
})));

console.log(`Input: ${separateParameters.length} parameters`);
console.log(`Output: ${normalized.length} parameters`);

if (normalized.length === 5) {
  console.log('✅ All 5 parameters kept separate');
} else {
  console.log(`❌ Parameters were merged! Expected 5, got ${normalized.length}`);
}

console.log('\nNormalized parameters:');
normalized.forEach(p => {
  console.log(`  - ${p.parameter}: ${p.value} ${p.unit}`);
});

// Test duplicate prevention within same report
console.log('\n3. DUPLICATE PREVENTION TEST:');
console.log('-'.repeat(70));

const duplicateTest = [
  { parameter: 'FT3', value: 3.26, unit: 'pg/ml' },
  { parameter: 'Free T3', value: 3.5, unit: 'pg/ml' },  // Duplicate - should be merged
  { parameter: 'FT4', value: 0.85, unit: 'ng/dl' },
  { parameter: 'Free T4', value: 0.9, unit: 'ng/dl' },  // Duplicate - should be merged
  { parameter: 'TSH', value: 0.78, unit: 'uIU/ml' },
  { parameter: 'T3, Total', value: 120, unit: 'ng/dL' },
  { parameter: 'Total T3', value: 125, unit: 'ng/dL' }  // Duplicate - should be merged
];

const deduped = normalizeExtractedData(duplicateTest);

console.log(`Input: ${duplicateTest.length} parameters (including duplicates)`);
console.log(`Output: ${deduped.length} parameters (after deduplication)`);

if (deduped.length === 4) {
  console.log('✅ Duplicates correctly removed (expected 4: FT3, FT4, TSH, T3 Total)');
} else {
  console.log(`❌ Deduplication failed! Expected 4, got ${deduped.length}`);
}

console.log('\nFinal deduplicated parameters:');
deduped.forEach(p => {
  console.log(`  - ${p.parameter}: ${p.value} ${p.unit}`);
});

// Test that FT3 and T3 Total are NOT merged
console.log('\n4. VERIFY FT3 vs T3 TOTAL NOT MERGED:');
console.log('-'.repeat(70));

const mixedTest = [
  { parameter: 'Free T3', value: 3.5, unit: 'pg/ml' },
  { parameter: 'T3, Total', value: 120, unit: 'ng/dL' }
];

const mixedResult = normalizeExtractedData(mixedTest);

console.log(`Input: FT3 and T3 Total`);
console.log(`Output: ${mixedResult.length} parameters`);

if (mixedResult.length === 2) {
  console.log('✅ FT3 and T3 Total kept separate');
  console.log(`  - ${mixedResult[0].parameter}: ${mixedResult[0].value} ${mixedResult[0].unit}`);
  console.log(`  - ${mixedResult[1].parameter}: ${mixedResult[1].value} ${mixedResult[1].unit}`);
} else {
  console.log('❌ FT3 and T3 Total were incorrectly merged!');
}

console.log('\n' + '='.repeat(70));
console.log('TEST COMPLETE');
console.log('='.repeat(70));
