/**
 * Test script for Lipid Profile Reference Value Detection
 * Tests the new reference value filtering logic
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

// User's OCR text from the Flutter app (with reference values only)
const ocrTextWithReferences = `DRLOGY PATHOLOGY LAB  01234567R9 | 09: 2345678
Accurate | Caring | nstant  drlogypathlab@drlogy.com
1c5 138, 5MART VISKJN COPLEX, HE4LTHCARE ROAD, 0-POSITE4EALTHCARE COMPLEX, MUMEAI 651578
www.drlogy.com
Yashvi M. Patel Sample Collected At:
Age:21 Years 125, Shiy complex, SG Rcad, tAumbai
Scx Ienale Sample Collected By: Mı Suresh  Regislered on: 32:31 PM 02 Det, 2X
Collecled on: 33:11 PEA 02 Dcu, 2%
UHID: 556 Ref. By: Dr. Hiren Shah  Repprted on: 34:35 PM J2 Dec, 2X
LIPID PROFILE
Investigation Result Reference Value  Unit
Sampłe Type Serum(2 ml) TAT 1 dlay (Normal: 1 -3 days)
Chalesteral Total
: 200.00  mg/dL
Speulupl ureli
Triglycerides < 150.00  mg/dL
HDL Chalesterol
> 40.00  mg/dL
LDL Chalesterol c 100 n  rngidL
L.alc,lal cd
VLDL Chạlesteral
<30.00  mgdL
Caloulated
Non-HDL Cholesterol < 130,0[)  mg/dL
Calcslated`;

console.log('========================================');
console.log('TESTING LIPID PROFILE REFERENCE VALUE DETECTION');
console.log('========================================\n');

console.log('📄 OCR Text (First 500 chars):');
console.log(ocrTextWithReferences.substring(0, 500) + '...\n');

const result = extractWithStrictValidation(ocrTextWithReferences, 'LIPID_PROFILE');

console.log('\n========================================');
console.log('FINAL RESULT:');
console.log('========================================');
console.log(`Success: ${result.success}`);
console.log(`Report Type: ${result.reportType}`);
console.log(`Parameters Extracted: ${result.parameters.length}`);
console.log(`Requires Manual Entry: ${result.requiresManualEntry || false}`);
console.log(`Message: ${result.message}`);

if (result.parameters.length > 0) {
  console.log('\n📊 Extracted Parameters:');
  result.parameters.forEach(param => {
    console.log(`   - ${param.parameter}: ${param.value} ${param.unit}`);
  });
} else {
  console.log('\n✅ Correctly rejected reference-only extraction!');
  console.log('   User will be prompted to enter values manually.');
}

if (result.rejected && result.rejected.length > 0) {
  console.log('\n❌ Rejected Values:');
  result.rejected.forEach(rejected => {
    console.log(`   - ${rejected.parameter}: "${rejected.rejectedValue}" - ${rejected.reason}`);
  });
}

console.log('\n========================================\n');
