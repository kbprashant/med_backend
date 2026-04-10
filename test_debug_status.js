/**
 * Debug test for status evaluation
 */

const { evaluateParameterStatus, parseReferenceRange, evaluateNumericStatus } = require('./utils/statusEvaluator');

// Simple test case
const testParam = {
  parameter: 'Fasting Glucose',
  value: '138',
  unit: 'mg/dL',
  referenceRange: '70-110'
};

console.log('🧪 Debugging Status Evaluation\n');
console.log('Test Parameter:', JSON.stringify(testParam, null, 2));
console.log('');

// Step 1: Parse reference range
const parsedRange = parseReferenceRange(testParam.referenceRange);
console.log('Step 1 - Parsed Reference Range:', JSON.stringify(parsedRange, null, 2));

// Step 2: Parse numeric value
const numericValue = parseFloat(testParam.value);
console.log('Step 2 - Numeric Value:', numericValue);
console.log('   Is numeric?', !isNaN(numericValue));

// Step 3: Evaluate numeric status
if (parsedRange && !isNaN(numericValue)) {
  const status = evaluateNumericStatus(numericValue, parsedRange);
  console.log('Step 3 - evaluateNumericStatus result:', status);
}

// Step 4: Full evaluation
const finalStatus = evaluateParameterStatus(testParam);
console.log('Step 4 - evaluateParameterStatus result:', finalStatus);

if (finalStatus === 'HIGH') {
  console.log('\n✅ PASS: Status is correctly HIGH for value 138 (range 70-110)');
} else {
  console.log(`\n❌ FAIL: Status is ${finalStatus}, expected HIGH`);
}
