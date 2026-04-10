/**
 * Test Status Passthrough Fix
 * Verify that Urine Glucose ++ is marked as "Abnormal"
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');
const reportProcessingService = require('./services/reportProcessingService');

const testOcr = `URINE EXAMINATION ROUTINE
Chemical Examination
Urine Glucose  ++  NEGATIVE
Urine Protein  NEGATIVE  NEGATIVE
Blood  TRACE  NEGATIVE
Ketone  +  NEGATIVE`;

async function test() {
  console.log('='.repeat(70));
  console.log('🧪 Testing Urine Qualitative Status Classification');
  console.log('='.repeat(70));
  
  // Step 1: Direct extraction (should have status)
  console.log('\n1️⃣ Direct STRICT Extraction:');
  const directResult = extractWithStrictValidation(testOcr);
  console.log(`   Parameters: ${directResult.parameters.length}`);
  directResult.parameters.forEach(p => {
    console.log(`   ${p.parameter}: ${p.value} - Status: ${p.status || 'MISSING'}`);
  });
  
  // Step 2: Through reportProcessingService (should preserve status)
  console.log('\n2️⃣ Through reportProcessingService.runStrictExtraction:');
  const serviceResult = await reportProcessingService.runStrictExtraction(testOcr);
  console.log(`   Parameters: ${serviceResult.parameters.length}`);
  serviceResult.parameters.forEach(p => {
    console.log(`   ${p.parameter}: ${p.value} - Status: ${p.status || 'MISSING'}`);
  });
  
  // Verify fix
  const glucoseParam = serviceResult.parameters.find(p => p.parameter === 'Urine Glucose');
  const proteinParam = serviceResult.parameters.find(p => p.parameter === 'Urine Protein');
  const bloodParam = serviceResult.parameters.find(p => p.parameter === 'Blood');
  const ketoneParam = serviceResult.parameters.find(p => p.parameter === 'Ketone');
  
  console.log('\n========================================');
  console.log('✅ VERIFICATION:');
  console.log('========================================');
  
  let allPassed = true;
  
  if (glucoseParam) {
    const glucoseOk = glucoseParam.status === 'Abnormal';
    allPassed = allPassed && glucoseOk;
    console.log(`Glucose "++": ${glucoseParam.status} ${glucoseOk ? '✅' : '❌'}`);
    console.log(`   Expected: Abnormal`);
    console.log(`   Got: ${glucoseParam.status}`);
  }
  
  if (proteinParam) {
    const proteinOk = proteinParam.status === 'Normal';
    allPassed = allPassed && proteinOk;
    console.log(`\nProtein "NEGATIVE": ${proteinParam.status} ${proteinOk ? '✅' : '❌'}`);
    console.log(`   Expected: Normal`);
    console.log(`   Got: ${proteinParam.status}`);
  }
  
  if (bloodParam) {
    const bloodOk = bloodParam.status === 'Borderline';
    allPassed = allPassed && bloodOk;
    console.log(`\nBlood "TRACE": ${bloodParam.status} ${bloodOk ? '✅' : '❌'}`);
    console.log(`   Expected: Borderline`);
    console.log(`   Got: ${bloodParam.status}`);
  }
  
  if (ketoneParam) {
    const ketoneOk = ketoneParam.status === 'Abnormal';
    allPassed = allPassed && ketoneOk;
    console.log(`\nKetone "+": ${ketoneParam.status} ${ketoneOk ? '✅' : '❌'}`);
    console.log(`   Expected: Abnormal`);
    console.log(`   Got: ${ketoneParam.status}`);
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('❌ SOME TESTS FAILED!');
    process.exit(1);
  }
  
  console.log('='.repeat(70));
}

test().then(() => {
  console.log('\n✅ Test complete\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
