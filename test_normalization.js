const { normalizeParameter } = require('./services/normalizer');

console.log('========== TESTING PARAMETER NORMALIZATION ==========\n');

const testCases = [
  'Chalesteral Total',
  'VLDL Chalesteral',
  'HDL Chalesterol',
  'LDL Chalesterot',
  'Non-HDL Cholesterol',
  'Triglycerides'
];

testCases.forEach(param => {
  const normalized = normalizeParameter(param);
  const status = normalized === param ? '❌ NOT NORMALIZED' : '✅ NORMALIZED';
  console.log(`${status}`);
  console.log(`  Input:  "${param}"`);
  console.log(`  Output: "${normalized}"\n`);
});
