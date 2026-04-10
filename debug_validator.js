/**
 * Debug test for qualitative validator
 */

const { isValidQualitativeValue } = require('./services/strictValidator');

const testValues = [
  'SLIGHTLY TURBID CLEAR',
  'SLIGHTLY TURBID',
  'YELLOW PALE YELLOW',
  'YELLOW',
  'NEGATIVE',
  '++',
  'NORMAL',
  'CLEAR'
];

console.log('Testing qualitative validation:\n');

for (const value of testValues) {
  const isValid = isValidQualitativeValue(value);
  console.log(`${isValid ? '✅' : '❌'} "${value}"`);
}
