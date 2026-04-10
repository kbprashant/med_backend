/**
 * Direct test of determineStatus function in extractionController
 * Tests the status evaluation logic without HTTP/auth complexity
 */

const { evaluateParameterStatus } = require('./utils/statusEvaluator');
const testDefinitionService = require('./services/testDefinitionService');

// Test cases matching the user's scenario
const testCases = [
  {
    parameterName: 'Fasting Glucose',
    value: '138',
    unit: 'mg/dL',
    referenceRange: '70-110',
    expected: 'HIGH'
  },
  {
    parameterName: 'Post Prandial Glucose',
    value: '254',
    unit: 'mg/dL',
    referenceRange: '<140',
    expected: 'HIGH'
  },
  {
    parameterName: 'HbA1c',
    value: '7.2',
    unit: '%',
    referenceRange: '4.0-5.7',
    expected: 'HIGH'
  },
  {
    parameterName: 'Fasting Glucose',
    value: '95',
    unit: 'mg/dL',
    referenceRange: '70-110',
    expected: 'NORMAL'
  },
  {
    parameterName: 'Post Prandial Glucose',
    value: '125',
    unit: 'mg/dL',
    referenceRange: '<140',
    expected: 'NORMAL'
  },
  {
    parameterName: 'Fasting Glucose',
    value: '65',
    unit: 'mg/dL',
    referenceRange: '70-110',
    expected: 'LOW'
  }
];

/**
 * Simulate the determineStatus function from extractionController
 */
function determineStatus(param) {
  let referenceRange = param.referenceRange;
  
  // If no reference range, try to get from master data
  if (!referenceRange && param.parameterName) {
    const testDef = testDefinitionService.findByTestName(param.parameterName);
    if (testDef) {
      // Find matching parameter definition
      const paramDef = testDef.parameters.find(p => 
        p.name.toLowerCase() === param.parameterName.toLowerCase()
      );
      if (paramDef && paramDef.normalRange) {
        referenceRange = paramDef.normalRange;
      }
    }
  }
  
  // Use universal status evaluator
  return evaluateParameterStatus(
    param.value,
    referenceRange,
    param.unit
  );
}

console.log('🧪 Testing Status Evaluation Logic\n');
console.log('='.repeat(80));

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.parameterName}`);
  console.log(`  Value: ${testCase.value} ${testCase.unit}`);
  console.log(`  Reference Range: ${testCase.referenceRange}`);
  
  const result = determineStatus({
    parameter: testCase.parameterName,  // Changed from parameterName to parameter
    value: testCase.value,
    unit: testCase.unit,
    referenceRange: testCase.referenceRange
  });
  
  const passed = result === testCase.expected;
  
  if (passed) {
    console.log(`  ✅ PASS: Status = ${result} (expected ${testCase.expected})`);
    passCount++;
  } else {
    console.log(`  ❌ FAIL: Status = ${result} (expected ${testCase.expected})`);
    failCount++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed out of ${testCases.length} tests`);

if (failCount === 0) {
  console.log('\n✅ All tests passed! Status evaluation is working correctly.\n');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review the status evaluation logic.\n');
  process.exit(1);
}
