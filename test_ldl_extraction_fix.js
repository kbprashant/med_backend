/**
 * Test script to verify LDL 200 mg/dL extraction fix
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

// Sample OCR text from the actual user report
const testOcrText = `DRLOGY PATHOLOGY LAB

LIPID PROFILE

Investigation Result Reference Value Unit

Cholesterol Total 300.00 High < 200.00 mg/dL

Triglycerides 250.00 High <150.00 mg/dL

HDL Cholesterol 50.00 Normal >40.00 mg/dL

LDL Cholesterol 200.00 VeryHigh  <100.00 mg/dL

VLDL Cholesterol 50.00 High <30.00 mg/dL

Non-HDL Cholesterol 250.00 High < 130.00 mg/dL`;

console.log('\n🧪 Testing LDL Extraction Fix');
console.log('='.repeat(70));

const result = extractWithStrictValidation(testOcrText);

console.log('\n✅ Extraction Result:');
console.log(`   Report Type: ${result.reportType}`);
console.log(`   Parameters Found: ${result.parameters.length}`);

console.log('\n📊 Extracted Parameters:');
result.parameters.forEach(param => {
  const isLDL = param.parameter.includes('LDL') && !param.parameter.includes('VLDL');
  const marker = isLDL ? '🎯 ' : '   ';
  console.log(`${marker}${param.parameter}: ${param.value} ${param.unit}`);
  
  if (isLDL) {
    if (param.value === '200' || param.value === '200.00') {
      console.log('   ✅ CORRECT! LDL value is 200 (was previously incorrectly extracted as 50)');
    } else {
      console.log(`   ❌ WRONG! LDL should be 200, but got ${param.value}`);
    }
  }
});

console.log('\n' + '='.repeat(70));
process.exit(0);
