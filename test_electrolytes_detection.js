/**
 * Test Electrolytes Detection
 */

const { detectReportType } = require('./services/strictExtractionService');

const electrolyteOCR = `DRLOGY PATHOLOGY LAB
ELECTROLYTES
Investigation Result Reference Value Unit
Sample Type Serum (2 ml)
ELECTROLYTES
Indirect ISE
Sodium 136.00 - 145.00 mEq/L
Potassium 3.50-5.10 mEq/L
Chloride 98.00 - 107.00 mEq/L
Bicarbonate 22.00 - 28.00 mEq/L
Calcium 8.60-10.20 mg/dL
Magnesium 1.80-2.30 mg/dL`;

console.log('\n🧪 Testing Electrolytes Detection\n');
console.log('OCR Text:');
console.log('─'.repeat(70));
console.log(electrolyteOCR);
console.log('─'.repeat(70));

const detectedType = detectReportType(electrolyteOCR);

console.log('\n📊 Detection Result:');
console.log(`   Detected Type: ${detectedType}`);
console.log(`   Expected: ELECTROLYTES`);
console.log(`   Status: ${detectedType === 'ELECTROLYTES' ? '✅ PASS' : '❌ FAIL'}`);

if (detectedType !== 'ELECTROLYTES') {
  console.log('\n❌ DETECTION FAILED!');
  console.log('   The report contains "ELECTROLYTES" keyword but was detected as:', detectedType);
  process.exit(1);
} else {
  console.log('\n✅ DETECTION SUCCESSFUL!');
  console.log('   Electrolytes reports are now correctly classified.');
  process.exit(0);
}
