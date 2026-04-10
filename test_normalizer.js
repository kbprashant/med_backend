/**
 * Test script for medical parameter and unit normalization
 * 
 * Demonstrates how normalization handles different lab formats
 * and removes duplicates
 */

const {
  normalizeUnit,
  normalizeParameter,
  normalizeExtractedData
} = require('./services/normalizer');

console.log('\n' + '='.repeat(70));
console.log('🧪 NORMALIZATION TEST SUITE');
console.log('='.repeat(70));

// Test 1: Unit Normalization
console.log('\n📏 TEST 1: Unit Normalization');
console.log('-'.repeat(70));

const unitTests = [
  'mg/dl',
  'mgdl',
  'mg / dl',
  'mmol/l',
  'mmofhg',
  'mm of hg',
  'mmhg',
  'permin',
  'per / min',
  'per/minute',
  'g/dl',
  '%',
  'percent'
];

unitTests.forEach(unit => {
  const normalized = normalizeUnit(unit);
  console.log(`  "${unit}" → "${normalized}"`);
});

// Test 2: Parameter Normalization
console.log('\n🏷️  TEST 2: Parameter Normalization');
console.log('-'.repeat(70));

const parameterTests = [
  'Blood sugar Fasting',
  'Glucose Fasting',
  'Glucose Fasting Plasma',
  'FBS',
  'Blood sugar Post Prandial',
  'Glucose PP Plasma',
  'PPBS',
  'Systolic',
  'Blood Pressure Systolic',
  'Diastolic',
  'BP Diastolic',
  'Pulse',
  'Heart Rate',
  'Hemoglobin',
  'HB',
  'Total Cholesterol',
  'Cholesterol',
  'HDL',
  'LDL'
];

parameterTests.forEach(param => {
  const normalized = normalizeParameter(param);
  console.log(`  "${param}" → "${normalized}"`);
});

// Test 3: Full Extraction Normalization with Duplicates
console.log('\n🔄 TEST 3: Full Extraction with Duplicate Removal');
console.log('-'.repeat(70));

// Simulated extraction result with duplicates and different formats
const extractedData = [
  { parameter: 'Blood sugar Fasting', value: 138, unit: 'mg/dl', status: 'HIGH' },
  { parameter: 'Blood sugar Post Prandial', value: 254, unit: 'mg/dl', status: 'HIGH' },
  { parameter: 'Systolic', value: 155, unit: 'mmofhg', status: 'HIGH' },
  { parameter: 'Diastolic', value: 98, unit: 'mmofhg', status: 'HIGH' },
  { parameter: 'Pulse', value: 85, unit: 'permin', status: 'NORMAL' },
  
  // Duplicates with different formats (these should be merged)
  { parameter: 'Glucose Fasting Plasma', value: 124, unit: 'mg/dL', status: 'HIGH' },
  { parameter: 'Glucose PP Plasma', value: 174, unit: 'mg/dL', status: 'HIGH' }
];

console.log('\n📥 Input: ' + extractedData.length + ' parameters (with duplicates)');
extractedData.forEach((item, idx) => {
  console.log(`  ${idx + 1}. ${item.parameter}: ${item.value} ${item.unit} [${item.status}]`);
});

const normalizedData = normalizeExtractedData(extractedData);

console.log('\n📤 Output: ' + normalizedData.length + ' unique parameters');
normalizedData.forEach((item, idx) => {
  console.log(`  ${idx + 1}. ${item.parameter}: ${item.value} ${item.unit} [${item.status}]`);
});

console.log('\n✅ Normalization Summary:');
console.log(`   • Raw parameters: ${extractedData.length}`);
console.log(`   • After deduplication: ${normalizedData.length}`);
console.log(`   • Duplicates removed: ${extractedData.length - normalizedData.length}`);

// Test 4: Real-world scenario from the screenshots
console.log('\n📋 TEST 4: Real-world Scenario (Your Blood Glucose Reports)');
console.log('-'.repeat(70));

const realWorldData = [
  // Report 1 - KKC Lab format
  { parameter: 'Blood sugar (Fasting)', value: 138, unit: 'mg/dl' },
  { parameter: 'Blood sugar (Post Prandial)', value: 254, unit: 'mg/dl' },
  { parameter: 'Blood Pressure ( BP)', value: '155/98', unit: 'mm of Hg' },
  { parameter: 'Pulse', value: 85, unit: 'per/mint' },
  
  // Report 2 - Hyderabad Diagnostics format
  { parameter: 'Glucose Fasting (Plasma)', value: 124, unit: 'mg/dl' },
  { parameter: 'Glucose PP (Plasma)', value: 174, unit: 'mg/dl' }
];

console.log('\n📥 Input from 2 different lab formats:');
realWorldData.forEach((item, idx) => {
  console.log(`  ${idx + 1}. ${item.parameter}: ${item.value} ${item.unit}`);
});

const normalizedRealWorld = normalizeExtractedData(realWorldData);

console.log('\n📤 Normalized output:');
normalizedRealWorld.forEach((item, idx) => {
  console.log(`  ${idx + 1}. ${item.parameter}: ${item.value} ${item.unit}`);
});

console.log('\n✅ Benefits:');
console.log('   • Consistent parameter names across different lab formats');
console.log('   • Standardized units (mg/dL, mm Hg, per/min)');
console.log('   • Duplicates removed - each parameter appears only once');
console.log('   • Ready for database storage with clean, searchable names');

// Test 5: Edge Cases
console.log('\n⚠️  TEST 5: Edge Cases & Unknown Parameters');
console.log('-'.repeat(70));

const edgeCases = [
  { parameter: 'Some Unknown Test', value: 42, unit: 'xyz' },
  { parameter: '', value: 100, unit: 'mg/dl' },
  { parameter: 'Vitamin D', value: 35, unit: 'ng/ml' },
  { parameter: 'Blood sugar Fasting', value: null, unit: 'mg/dl' }
];

console.log('\n📥 Input with edge cases:');
edgeCases.forEach((item, idx) => {
  console.log(`  ${idx + 1}. "${item.parameter}": ${item.value} ${item.unit}`);
});

const normalizedEdges = normalizeExtractedData(edgeCases);

console.log('\n📤 Normalized edge cases:');
normalizedEdges.forEach((item, idx) => {
  console.log(`  ${idx + 1}. "${item.parameter}": ${item.value} ${item.unit}`);
});

console.log('\n✅ Edge case handling:');
console.log('   • Unknown parameters preserved with cleaned names');
console.log('   • Unknown units preserved (system is extensible)');
console.log('   • Empty parameters handled gracefully');
console.log('   • Null values handled appropriately');

console.log('\n' + '='.repeat(70));
console.log('✅ ALL TESTS COMPLETED');
console.log('='.repeat(70));
