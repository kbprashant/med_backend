/**
 * Test Lipid Profile Extraction with Reference Value Issue
 * 
 * Tests the fix for extracting actual result values vs reference values
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

// OCR text from user's logs
const lipidOcrText = `DRLOGY PATHOLOGY LAB «. mzuserso | 0s12use7s
® Accurate | Caring | Instant driogypathlab@drlogy.com
1C5 108, SMART VISION COMPLEX, HEALTHCARE RCAD, OPPOSITE HEALTHCARE COMPLEX. MUMBAI 689578
ANN www.drlogy.com
Yashvi M. Patel rpg Sample Collected A | RAAMN AIT
. oF =A 0 5 TY eer le ye . ath
Age $21 Years LTR ed 125, Shiv complex, SG Road, Mumbai Registered on: 02:31 PM 02 Dec, 2X
Sex Female AA Sample Collected By: tr Suresh Collected on: 23.11 PM 02 Dec, 2X
UHID : 556 of rl ) Ref. By: Dr. Hiren Shah Reported on: 04:35 PM 02 Dec, 2X
LIPID PROFILE
Investigation Result Reference Value Unit
Sample Type Serum (2 mi) TAT: 1day (Normal: 1-3 days)
Cholesterol Total i Pn < 200.00 mg/dL
Specl-aplclumetry
Triglycerides Loe TTI < 150.00 mg/dL
Sprobzapbameiry
HDL Cholesterol NT J > 40.00 mg/dL
LDL Cholesterol 0 oie, < 100.00 mg/dL
Calealated
VLDL Cholesterol Jy [atin < 30.00 mg/dL
Calcilated
Non-HDL Cholesterol TIENTS ed < 130.00 mg/dL
L alcylate`;

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     Testing Lipid Profile Extraction - Reference vs Result    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📄 OCR Text Analysis:');
console.log('─'.repeat(70));
console.log('Expected Pattern: Parameter [Result] [</>] [Reference] Unit\n');
console.log('1. Total Cholesterol: "i Pn" (garbled) < 200.00 mg/dL');
console.log('2. Triglycerides: "Loe TTI" (garbled) < 150.00 mg/dL');
console.log('3. HDL Cholesterol: "NT J" (garbled) > 40.00 mg/dL');
console.log('4. LDL Cholesterol: "0 oie," (0 is valid!) < 100.00 mg/dL');
console.log('5. VLDL Cholesterol: "Jy [atin" (garbled) < 30.00 mg/dL');
console.log('6. Non-HDL Cholesterol: "TIENTS ed" (garbled) < 130.00 mg/dL');
console.log('─'.repeat(70) + '\n');

// Run extraction
const result = extractWithStrictValidation(lipidOcrText, 'LIPID_PROFILE');

console.log('\n');
console.log('═'.repeat(70));
console.log('📊 EXTRACTION RESULTS');
console.log('═'.repeat(70));

console.log(`\n✅ Success: ${result.success}`);
console.log(`📋 Report Type: ${result.reportType}`);
console.log(`🔢 Parameters Found: ${result.parameters.length}`);

if (result.parameters.length > 0) {
  console.log('\n📝 Extracted Parameters:\n');
  result.parameters.forEach((param, index) => {
    const isReferenceValue = checkIfReferenceValue(param.parameter, param.value);
    const emoji = isReferenceValue ? '❌' : '✅';
    console.log(`   ${index + 1}. ${emoji} ${param.parameter}`);
    console.log(`      Value: ${param.value} ${param.unit || ''}`);
    if (isReferenceValue) {
      console.log(`      ⚠️  WARNING: This looks like a reference value!`);
    }
    console.log('');
  });
}

if (result.rejected && result.rejected.length > 0) {
  console.log('\n🗑️  Rejected Parameters:\n');
  result.rejected.forEach((param, index) => {
    console.log(`   ${index + 1}. ${param.parameter}`);
    console.log(`      Rejected Value: ${param.rejectedValue}`);
    console.log(`      Reason: ${param.reason}`);
    console.log('');
  });
}

// Analysis
console.log('\n═'.repeat(70));
console.log('🧪 VALIDATION');
console.log('═'.repeat(70) + '\n');

// Check if extracting reference values
const commonReferenceValues = [200, 150, 40, 100, 30, 130];
let extractingReferences = 0;
let extractingResults = 0;

result.parameters.forEach(param => {
  const val = parseFloat(param.value);
  if (commonReferenceValues.includes(val)) {
    console.log(`❌ ${param.parameter}: ${val} appears to be a reference value`);
    extractingReferences++;
  } else {
    console.log(`✅ ${param.parameter}: ${val} appears to be an actual result`);
    extractingResults++;
  }
});

console.log('\n' + '─'.repeat(70));
if (extractingReferences === 0) {
  console.log('✅ TEST PASSED: Not extracting reference values as results!');
} else {
  console.log(`❌ TEST FAILED: ${extractingReferences} parameters appear to be reference values`);
  console.log(`   Expected: Actual result values or report flagged for manual entry`);
  console.log(`   Got: Reference values extracted as results`);
}

// Special check for LDL = 0 (valid result)
const ldl = result.parameters.find(p => p.parameter.toLowerCase().includes('ldl') && !p.parameter.toLowerCase().includes('vldl'));
if (ldl && parseFloat(ldl.value) === 0) {
  console.log(`✅ LDL Cholesterol correctly extracted as 0`);
} else if (ldl) {
  console.log(`❌ LDL Cholesterol: ${ldl.value} (expected 0)`);
}

console.log('\n' + '═'.repeat(70) + '\n');

function checkIfReferenceValue(paramName, value) {
  const numValue = parseFloat(value);
  const referenceMap = {
    'total cholesterol': [200, 240],
    'triglycerides': [150, 200],
    'hdl cholesterol': [40, 35, 60],
    'ldl cholesterol': [100, 130, 160],
    'vldl cholesterol': [30, 40],
    'non-hdl cholesterol': [130, 160]
  };
  
  for (const [param, refs] of Object.entries(referenceMap)) {
    if (paramName.toLowerCase().includes(param)) {
      return refs.includes(numValue);
    }
  }
  return false;
}
