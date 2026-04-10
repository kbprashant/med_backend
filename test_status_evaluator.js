/**
 * Test Universal Status Evaluator
 * 
 * Verifies that status evaluation works correctly for all test types
 * and various reference range formats
 */

const { evaluateParameterStatus } = require('./utils/statusEvaluator');

console.log('🧪 Testing Universal Status Evaluator\n');
console.log('='.repeat(70));

// Test cases
const testCases = [
  // Blood Sugar Tests
  {
    name: '1. Blood Sugar - HIGH (138 in range 70-110)',
    param: {
      parameter: 'Fasting Glucose',
      value: '138',
      unit: 'mg/dL',
      referenceRange: '70-110'
    },
    expected: 'HIGH'
  },
  {
    name: '2. Blood Sugar - HIGH (254 with <140 reference)',
    param: {
      parameter: 'Post Prandial Glucose',
      value: '254',
      unit: 'mg/dL',
      referenceRange: '<140'
    },
    expected: 'HIGH'
  },
  {
    name: '3. Blood Sugar - NORMAL (95 in range 70-110)',
    param: {
      parameter: 'Fasting Glucose',
      value: '95',
      unit: 'mg/dL',
      referenceRange: '70-110'
    },
    expected: 'NORMAL'
  },
  
  // LFT Tests
  {
    name: '4. LFT - HIGH (ALT 100 in range 10-49)',
    param: {
      parameter: 'ALT',
      value: '100',
      unit: 'U/L',
      referenceRange: '10-49'
    },
    expected: 'HIGH'
  },
  {
    name: '5. LFT - NORMAL (ALT 30 in range 10-49)',
    param: {
      parameter: 'ALT',
      value: '30',
      unit: 'U/L',
      referenceRange: '10-49'
    },
    expected: 'NORMAL'
  },
  
  // Kidney Function Tests
  {
    name: '6. KFT - LOW (Creatinine 0.6 in range 0.7-1.2)',
    param: {
      parameter: 'Creatinine',
      value: '0.6',
      unit: 'mg/dL',
      referenceRange: '0.7-1.2'
    },
    expected: 'LOW'
  },
  {
    name: '7. KFT - HIGH (Creatinine 1.5 in range 0.7-1.2)',
    param: {
      parameter: 'Creatinine',
      value: '1.5',
      unit: 'mg/dL',
      referenceRange: '0.7-1.2'
    },
    expected: 'HIGH'
  },
  
  // CBC Tests
  {
    name: '8. CBC - LOW (Hemoglobin 10.5 in range 12-17)',
    param: {
      parameter: 'Hemoglobin',
      value: '10.5',
      unit: 'g/dL',
      referenceRange: '12-17'
    },
    expected: 'LOW'
  },
  {
    name: '9. CBC - NORMAL (Hemoglobin 14.2 in range 12-17)',
    param: {
      parameter: 'Hemoglobin',
      value: '14.2',
      unit: 'g/dL',
      referenceRange: '12-17'
    },
    expected: 'NORMAL'
  },
  
  // Urine Tests - Qualitative
  {
    name: '10. Urine - ABNORMAL (Glucose ++ with NEGATIVE reference)',
    param: {
      parameter: 'Urine Glucose',
      value: '++',
      unit: '',
      referenceRange: 'NEGATIVE'
    },
    expected: 'ABNORMAL'
  },
  {
    name: '11. Urine - NORMAL (Glucose NEGATIVE with NEGATIVE reference)',
    param: {
      parameter: 'Urine Glucose',
      value: 'NEGATIVE',
      unit: '',
      referenceRange: 'NEGATIVE'
    },
    expected: 'NORMAL'
  },
  {
    name: '12. Urine - NORMAL (Color YELLOW with YELLOW reference)',
    param: {
      parameter: 'Colour',
      value: 'YELLOW',
      unit: '',
      referenceRange: 'YELLOW'
    },
    expected: 'NORMAL'
  },
  {
    name: '13. Urine - ABNORMAL (Color RED with YELLOW reference)',
    param: {
      parameter: 'Colour',
      value: 'RED',
      unit: '',
      referenceRange: 'YELLOW'
    },
    expected: 'ABNORMAL'
  },
  
  // Edge Cases
  {
    name: '14. No reference range - defaults to NORMAL',
    param: {
      parameter: 'Some Test',
      value: '150',
      unit: 'mg/dL',
      referenceRange: ''
    },
    expected: 'NORMAL'
  },
  {
    name: '15. Pre-computed status preserved',
    param: {
      parameter: 'Pre-computed Test',
      value: '150',
      unit: 'mg/dL',
      referenceRange: '70-110',
      status: 'HIGH'
    },
    expected: 'HIGH'
  },
  {
    name: '16. Reference with spaces (70 - 110)',
    param: {
      parameter: 'Test with spaces',
      value: '150',
      unit: 'mg/dL',
      referenceRange: '70 - 110'
    },
    expected: 'HIGH'
  },
  {
    name: '17. Less-or-equal format (<=5)',
    param: {
      parameter: 'Test <=',
      value: '7',
      unit: 'mg/dL',
      referenceRange: '<=5'
    },
    expected: 'HIGH'
  },
  {
    name: '18. Greater-than format (>200)',
    param: {
      parameter: 'Test >',
      value: '180',
      unit: 'mg/dL',
      referenceRange: '>200'
    },
    expected: 'LOW'
  },
];

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log(`  Input: ${testCase.param.parameter} = ${testCase.param.value} ${testCase.param.unit}`);
  console.log(`  Reference: ${testCase.param.referenceRange || '(none)'}`);
  
  const result = evaluateParameterStatus(testCase.param);
  const success = result === testCase.expected;
  
  if (success) {
    console.log(`  ✅ Result: ${result} (Expected: ${testCase.expected})`);
    passed++;
  } else {
    console.log(`  ❌ Result: ${result} (Expected: ${testCase.expected})`);
    failed++;
  }
});

// Summary
console.log('\n' + '='.repeat(70));
console.log('📊 Test Summary');
console.log('='.repeat(70));
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);
console.log('='.repeat(70));

if (failed === 0) {
  console.log('\n🎉 All tests passed! Status evaluation is working correctly.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.\n');
  process.exit(1);
}
