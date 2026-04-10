/**
 * Test Full Blood Sugar Extraction Flow
 * 
 * This tests the complete flow from extraction → normalization → API response
 * to identify where the Fasting Glucose parameter is being lost.
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');
const reportProcessingService = require('./services/reportProcessingService');
const { normalizeExtractedData } = require('./services/normalizer');

// OCR text from user's logs
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

async function testFullFlow() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Testing Full Blood Sugar Extraction Flow              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // STEP 1: Direct Strict Extraction
  console.log('STEP 1: Direct Strict Extraction');
  console.log('─'.repeat(70));
  const strictResult = extractWithStrictValidation(userOcrText, 'BLOOD_SUGAR');
  console.log(`\n✅ Strict Extraction Complete`);
  console.log(`   Parameters: ${strictResult.parameters.length}`);
  strictResult.parameters.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
  });

  // STEP 2: Run Smart Extraction (as API does)
  console.log('\n\nSTEP 2: Smart Extraction (via reportProcessingService)');
  console.log('─'.repeat(70));
  const smartResult = await reportProcessingService.runSmartExtraction(userOcrText);
  console.log(`\n✅ Smart Extraction Complete`);
  console.log(`   Version: ${smartResult.extractionVersion}`);
  console.log(`   Report Type: ${smartResult.reportType}`);
  console.log(`   Parameters: ${smartResult.parameters.length}`);
  smartResult.parameters.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
    if (p.referenceRange) console.log(`      Ref: ${p.referenceRange}`);
  });

  // STEP 3: Normalization (as API does)
  console.log('\n\nSTEP 3: Normalization (via normalizeExtractedData)');
  console.log('─'.repeat(70));
  console.log(`\nBEFORE Normalization:`);
  smartResult.parameters.forEach((p, i) => {
    console.log(`   ${i + 1}. "${p.parameter}" = ${p.value}`);
  });
  
  const normalizedParams = normalizeExtractedData(smartResult.parameters);
  
  console.log(`\nAFTER Normalization:`);
  console.log(`   Count: ${normalizedParams.length}`);
  normalizedParams.forEach((p, i) => {
    console.log(`   ${i + 1}. "${p.parameter}" = ${p.value}`);
  });

  // FINAL VERIFICATION
  console.log('\n\n' + '═'.repeat(70));
  console.log('FINAL VERIFICATION');
  console.log('═'.repeat(70));

  const hasFasting = normalizedParams.some(p => 
    p.parameter.toLowerCase().includes('fasting')
  );
  const hasPostprandial = normalizedParams.some(p => 
    p.parameter.toLowerCase().includes('postprandial') || 
    p.parameter.toLowerCase().includes('post prandial')
  );

  if (hasFasting && hasPostprandial && normalizedParams.length === 2) {
    console.log('\n✅ TEST PASSED: Both parameters present after normalization!');
    console.log('   ✅ Fasting Glucose: Found');
    console.log('   ✅ Postprandial Glucose: Found');
    console.log('   ✅ Count correct: 2 parameters');
  } else {
    console.log('\n❌ TEST FAILED: Parameters lost during normalization!');
    console.log(`   ${hasFasting ? '✅' : '❌'} Fasting Glucose`);
    console.log(`   ${hasPostprandial ? '✅' : '❌'} Postprandial Glucose`);
    console.log(`   ${normalizedParams.length === 2 ? '✅' : '❌'} Count (expected 2, got ${normalizedParams.length})`);
    
    console.log('\n🔍 DEBUGGING INFO:');
    console.log('   Parameters after normalization:');
    normalizedParams.forEach(p => {
      console.log(`      - "${p.parameter}" (${p.value})`);
    });
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

testFullFlow().catch(console.error);
