/**
 * Test Blood Sugar Extraction with Garbled Parameter Names
 * 
 * This tests the fix for extracting both Fasting and Postprandial glucose
 * even when the parameter names are garbled by OCR.
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

// OCR text from user's logs showing garbled parameter name
const userOcrText = `: Co CE EEE EE
; pre exdg A OTTARWD ayia), adr aruda ND Suds revgy mTBET Qendga@ pn.
4 aGrfuwir :30.17 Pp
1 \\ KKC LAB
® +Opp.Govt.Hospital, TNHB, Perumalpattu,Veppampattu-602024
| Email : kkclab21@gmail.com | ® Cell : +91 8939 789 467
SID NO : 01282 DATE : 13-07-2025
JPATIENT NAME: Aurora SEX . Female
REF. BY : Self AGE : 56 Yrs
TEST RESULT UNITS REFERENCE RANGE
BIO-CHEMISTRY
mpd RICOD8GE ting) 138 mg/d] 70-110
Blood sugar (Post Prandial) 254 mg/d 80 - 140
§
§
| —~——— End of Report. ———
E
pr : Lab pe
THE CREATEST WEALTHB HEALTH |`;

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  Testing Blood Sugar Extraction with Garbled Parameter Names  ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📄 OCR Text:');
console.log('─'.repeat(70));
console.log(userOcrText);
console.log('─'.repeat(70));

console.log('\n🔬 Expected Parameters:');
console.log('   1. Fasting Glucose: 138 mg/d (ref: 70-110) - GARBLED NAME');
console.log('   2. Postprandial Glucose: 254 mg/d (ref: 80-140) - CLEAR NAME\n');

// Run extraction
const result = extractWithStrictValidation(userOcrText, 'BLOOD_SUGAR');

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
    console.log(`   ${index + 1}. ${param.parameter}`);
    console.log(`      Value: ${param.value} ${param.unit || ''}`);
    if (param.referenceRange) {
      console.log(`      Reference: ${param.referenceRange}`);
    }
    if (param.status) {
      console.log(`      Status: ${param.status}`);
    }
    console.log(`      Method: ${param.extractionMethod}`);
    console.log('');
  });
}

// Verify both parameters were extracted
console.log('\n🧪 TEST VALIDATION:\n');

const hasFasting = result.parameters.some(p => 
  p.parameter.toLowerCase().includes('fasting')
);
const hasPostprandial = result.parameters.some(p => 
  p.parameter.toLowerCase().includes('postprandial') || 
  p.parameter.toLowerCase().includes('post prandial')
);

if (hasFasting && hasPostprandial) {
  console.log('   ✅ SUCCESS: Both parameters extracted!');
  console.log('   ✅ Fasting Glucose: Found');
  console.log('   ✅ Postprandial Glucose: Found');
} else {
  console.log('   ❌ FAILURE: Missing parameters');
  console.log(`   ${hasFasting ? '✅' : '❌'} Fasting Glucose: ${hasFasting ? 'Found' : 'NOT FOUND'}`);
  console.log(`   ${hasPostprandial ? '✅' : '❌'} Postprandial Glucose: ${hasPostprandial ? 'Found' : 'NOT FOUND'}`);
}

// Check values
const fastingParam = result.parameters.find(p => p.parameter.toLowerCase().includes('fasting'));
const postprandialParam = result.parameters.find(p => 
  p.parameter.toLowerCase().includes('postprandial') || 
  p.parameter.toLowerCase().includes('post prandial')
);

if (fastingParam) {
  const fastingValue = parseFloat(fastingParam.value);
  if (fastingValue === 138) {
    console.log('   ✅ Fasting value correct: 138');
  } else {
    console.log(`   ❌ Fasting value incorrect: ${fastingValue} (expected 138)`);
  }
}

if (postprandialParam) {
  const ppValue = parseFloat(postprandialParam.value);
  if (ppValue === 254) {
    console.log('   ✅ Postprandial value correct: 254');
  } else {
    console.log(`   ❌ Postprandial value incorrect: ${ppValue} (expected 254)`);
  }
}

console.log('\n' + '═'.repeat(70) + '\n');
