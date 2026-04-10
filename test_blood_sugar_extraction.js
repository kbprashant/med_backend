/**
 * Test blood sugar extraction with the actual OCR text from the user's report
 * This verifies that the fix correctly extracts:
 * - Fasting Blood Sugar: 184 mg/dL
 * - Post Prandial Blood Sugar: 318 mg/dL
 * 
 * And DOES NOT extract:
 * - 153 (from "No, 153" address)
 * - 605004 (postal code)
 * - 413 (phone area code)
 * - 9001 (ISO certification)
 */

const SmartMedicalExtractor = require('./services/smartMedicalExtractor');

// Actual OCR text from the blood sugar report
const ocrText = `Shri Sai Diagnostics And Poly Clinic
Certified ISO 9001: 2015 (Medical Laboratory)
Blood Glucose and Lipid Profile
Mudalyarpet, S Puducherry - 605004
Patient Details
Name: Test Patient
Date: 12/01/2023
Report Details
TEST
Fasting Blood Sugar
Post Prandial Blood Sugar
VALUE
184
318
NORMAL RANGE
75-110
100-140
Lab Address:
No, 153, Main Road
Mudalyarpet, Puducherry 605004
Phone: 0413-1234567
ISO 9001:2015 Certified`;

const smartExtractor = require('./services/smartMedicalExtractor');

console.log('='.repeat(70));
console.log('🧪 TESTING BLOOD SUGAR EXTRACTION');
console.log('='.repeat(70));
console.log('\nOCR Text:');
console.log(ocrText);
console.log('\n' + '='.repeat(70));

const result = smartExtractor.extract(ocrText);

console.log('\n' + '='.repeat(70));
console.log('📊 EXTRACTION RESULTS');
console.log('='.repeat(70));

if (result.success) {
  console.log(`✅ Extraction successful!`);
  console.log(`📝 Parameters extracted: ${result.parameters.length}`);
  console.log('\nExtracted Parameters:');
  
  result.parameters.forEach((param, idx) => {
    console.log(`\n${idx + 1}. ${param.parameter}`);
    console.log(`   Value: ${param.value}`);
    console.log(`   Unit: ${param.unit || 'N/A'}`);
    console.log(`   Status: ${param.status || 'N/A'}`);
  });
  
  // Validate expected results
  console.log('\n' + '='.repeat(70));
  console.log('✅ VALIDATION');
  console.log('='.repeat(70));
  
  // Check for Fasting Blood Sugar
  const fastingTest = result.parameters.find(p => 
    /fasting\s*(blood)?\s*sugar|fasting\s*glucose/i.test(p.parameter)
  );
  
  if (fastingTest) {
    if (fastingTest.value === 184 || fastingTest.value === '184') {
      console.log('✅ Fasting Blood Sugar: CORRECT (184)');
    } else {
      console.log(`❌ Fasting Blood Sugar: WRONG (got ${fastingTest.value}, expected 184)`);
    }
  } else {
    console.log('❌ Fasting Blood Sugar: NOT FOUND');
  }
  
  // Check for Post Prandial
  const ppTest = result.parameters.find(p => 
    /post\s*prandial|pp|ppbs/i.test(p.parameter)
  );
  
  if (ppTest) {
    if (ppTest.value === 318 || ppTest.value === '318') {
      console.log('✅ Post Prandial Blood Sugar: CORRECT (318)');
    } else {
      console.log(`❌ Post Prandial Blood Sugar: WRONG (got ${ppTest.value}, expected 318)`);
    }
  } else {
    console.log('❌ Post Prandial Blood Sugar: NOT FOUND');
  }
  
  // Check for wrong values (should NOT be extracted)
  const wrongValues = [153, 605004, 413, 9001, '153', '605004', '413', '9001'];
  const foundWrongValues = result.parameters.filter(p => 
    wrongValues.includes(p.value) || wrongValues.includes(String(p.value))
  );
  
  if (foundWrongValues.length > 0) {
    console.log('\n❌ FOUND INCORRECT VALUES:');
    foundWrongValues.forEach(p => {
      console.log(`   ❌ ${p.parameter}: ${p.value} (should not have been extracted)`);
    });
  } else {
    console.log('✅ No incorrect values extracted (153, 605004, 413, 9001)');
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  if (fastingTest && ppTest && 
      (fastingTest.value == 184) && 
      (ppTest.value == 318) && 
      foundWrongValues.length === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review extraction logic');
  }
  
} else {
  console.log(`❌ Extraction failed: ${result.message}`);
}

console.log('='.repeat(70));
