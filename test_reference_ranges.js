/**
 * Test the reference ranges service
 */

const { determineStatus, getReferenceRangeText } = require('./services/referenceRanges');

console.log('\n' + '='.repeat(70));
console.log('🧪 TESTING REFERENCE RANGES SERVICE');
console.log('='.repeat(70));

// Test cases from your reports
const testCases = [
  { parameter: 'Fasting Glucose', value: 124, unit: 'mg/dL' },
  { parameter: 'Fasting Glucose', value: 138, unit: 'mg/dL' },
  { parameter: 'Postprandial Glucose', value: 174, unit: 'mg/dL' },
  { parameter: 'Postprandial Glucose', value: 254, unit: 'mg/dL' },
  { parameter: 'Blood Pressure Systolic', value: 155, unit: 'mm Hg' },
  { parameter: 'Blood Pressure Diastolic', value: 98, unit: 'mm Hg' },
  { parameter: 'Pulse', value: 85, unit: 'per/min' },
];

console.log('\n📊 Test Results:\n');

for (const test of testCases) {
  const status = determineStatus(test.parameter, test.value, test.unit);
  const refRange = getReferenceRangeText(test.parameter);
  
  const statusIcon = status === 'NORMAL' ? '✅' : status.includes('HIGH') ? '🔴' : '🔵';
  
  console.log(`${statusIcon} ${test.parameter}: ${test.value} ${test.unit}`);
  console.log(`   Status: ${status}`);
  console.log(`   Reference Range: ${refRange}`);
  console.log();
}

console.log('='.repeat(70));
console.log('✅ ALL TESTS COMPLETE');
console.log('='.repeat(70));
