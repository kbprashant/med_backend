/**
 * Test: Verify STRICT extraction with real OCR text from user's log
 * 
 * This OCR text had the problem:
 * - ".Blood.sugareiog)" was being extracted as "Sugar: eiog"
 * - Should extract: "Fasting Blood Sugar: 138 mg/dl"
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

// Real OCR text from user's Flutter log
const realOcrText = `sT@gwr :30.17
KKC LAB
.0pp.Govt.Hospital,TNHB, Perumalpattu, Veppampattu-602024
Emall : kkclab21@gmall.com | ) Cell : +91 8939 789 467
SID NO  01282
DATE  : 13-07-2025
PATIENT NAME: Aurora  : Female
SEX
REF, BY  :Setf
AGE  :56 Yrs
TEST  RESULT  UNITS  REFERENCE RANGE
BIO-CHEMSTRY
.Blood.sugareiog)
138  mg/dl  70 -- 110
Blood sugar (Post Prandial)  254  mg/d!  80- 140
Blood Pressuref BP)
10:35 Am
Time
Sys  155  mm of Hg
Dia  98  mm of Hg
Pul  85  Per/mint
End of Report
Lab Incharge
Worklg Hours:7.00 am -8.30 pm
THE GREA TEST WEALTH IS HEALTH
`;

console.log('\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  REAL-WORLD TEST: User\'s Blood Sugar Report with Garbage OCR');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n');

console.log('📋 OCR TEXT (with garbage):');
console.log('─────────────────────────────────────────────────────────────');
console.log(realOcrText);
console.log('─────────────────────────────────────────────────────────────\n');

console.log('🔍 EXTRACTING with STRICT validation...\n');

const result = extractWithStrictValidation(realOcrText);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  EXTRACTION RESULTS');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`Report Type: ${result.reportType}`);
console.log(`Success: ${result.success}`);
console.log(`Total Valid Parameters: ${result.parameters.length}`);
console.log(`Total Rejected: ${result.rejected.length}\n`);

if (result.parameters.length > 0) {
  console.log('✅ VALID PARAMETERS EXTRACTED:');
  console.log('─────────────────────────────────────────────────────────────');
  result.parameters.forEach(param => {
    console.log(`   ✓ ${param.parameter}: ${param.value} ${param.unit}`);
  });
  console.log('');
}

if (result.rejected.length > 0) {
  console.log('❌ REJECTED (GARBAGE VALUES):');
  console.log('─────────────────────────────────────────────────────────────');
  result.rejected.forEach(rejected => {
    console.log(`   ✗ ${rejected.parameter}: "${rejected.rejectedValue}"`);
    console.log(`     Reason: ${rejected.reason}`);
  });
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VERDICT');
console.log('═══════════════════════════════════════════════════════════════\n');

// Check if we got the correct values
const hasFastingGlucose = result.parameters.some(p => 
  p.parameter.toLowerCase().includes('blood sugar') && p.value === 138
);
const hasPostPrandial = result.parameters.some(p => 
  p.parameter.toLowerCase().includes('post prandial') && p.value === 254
);
const rejectedGarbage = result.rejected.some(r => 
  r.rejectedValue.includes('eiog')
);

if (hasFastingGlucose && hasPostPrandial) {
  console.log('✅ SUCCESS! Extracted correct numeric values:');
  console.log('   - Fasting Blood Sugar: 138 mg/dl ✓');
  console.log('   - Post Prandial Glucose: 254 mg/dl ✓');
} else {
  console.log('⚠️  Warning: Did not extract all expected values');
  if (!hasFastingGlucose) console.log('   - Missing: Fasting Blood Sugar (138)');
  if (!hasPostPrandial) console.log('   - Missing: Post Prandial (254)');
}

if (rejectedGarbage || result.parameters.every(p => p.value !== 'eiog')) {
  console.log('✅ SUCCESS! Rejected garbage text "eiog" ✓');
} else {
  console.log('❌ FAILED: Still extracting garbage "eiog"');
}

console.log('\n');
console.log('═══════════════════════════════════════════════════════════════\n');
