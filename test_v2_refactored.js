/**
 * Test script for Smart Medical Extractor V2 - Refactored Version
 * 
 * Demonstrates improvements:
 * 1. Comma-separated number handling (2,50,000)
 * 2. Improved status determination with nested normalRange
 * 3. 80-character search window
 * 4. expectedUnits fallback
 * 5. extractionVersion field
 */

const smartMedicalExtractorV2 = require('./services/smartMedicalExtractorV2');

// Test samples showcasing improvements
const testSamples = {
  commaNumbers: `
    COMPLETE BLOOD COUNT (CBC)
    Patient: Test Patient
    Date: 23-02-2026
    
    WBC Count: 7,500 cells/µL
    Platelet Count: 2,50,000 cells/µL
    RBC Count: 4.5 mill/mm3
    Hemoglobin: 13.5 g/dL
  `,
  
  largeNumbers: `
    COMPLETE BLOOD COUNT
    Date: 23-02-2026
    
    Total WBC: 8500 cells/µL
    Platelet: 250000 cells/mm3
    RBC: 4800000 cells/µL
  `,
  
  windowRestriction: `
    LIPID PROFILE TEST
    Patient Name: John Doe
    Age: 45 years
    Date: 23-02-2026
    
    Total Cholesterol: 180 mg/dL
    Reference Range: 100-200
    Collected: 23-02-2026
    
    Triglycerides: 120 mg/dL
    Normal Range: 50-150
    
    HDL Cholesterol: 55 mg/dL
    Reference: 40-60
  `
};

async function runTests() {
  console.log('🧪 Testing Smart Medical Extractor V2 - Refactored\n');
  console.log('='.repeat(80));
  
  // Test 1: Comma-separated numbers
  console.log('\n📋 TEST 1: Comma-Separated Numbers (Indian format 2,50,000)');
  console.log('Expected: Should parse 2,50,000 as 250000\n');
  
  try {
    const result1 = await smartMedicalExtractorV2(testSamples.commaNumbers);
    
    console.log('\n✅ RESULT:');
    console.log('Report Type:', result1.reportType);
    console.log('Extraction Version:', result1.extractionVersion);
    console.log('Parameters:', result1.parameters.length);
    
    result1.parameters.forEach(param => {
      console.log(`  - ${param.displayName}: ${param.value} ${param.unit}`);
      if (param.displayName.toLowerCase().includes('platelet')) {
        console.log(`    🎯 Platelet value parsed correctly: ${param.value === 250000 ? '✓' : '✗'}`);
      }
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test 2: Large numbers without commas
  console.log('\n📋 TEST 2: Large Numbers Without Commas');
  console.log('Expected: Should handle values like 250000, 4800000\n');
  
  try {
    const result2 = await smartMedicalExtractorV2(testSamples.largeNumbers);
    
    console.log('\n✅ RESULT:');
    console.log('Report Type:', result2.reportType);
    console.log('Extraction Version:', result2.extractionVersion);
    console.log('Parameters:');
    
    result2.parameters.forEach(param => {
      console.log(`  - ${param.displayName}: ${param.value} ${param.unit}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test 3: 80-character search window
  console.log('\n📋 TEST 3: 80-Character Search Window Restriction');
  console.log('Expected: Should not pick up values from other parameters\n');
  
  try {
    const result3 = await smartMedicalExtractorV2(testSamples.windowRestriction);
    
    console.log('\n✅ RESULT:');
    console.log('Report Type:', result3.reportType);
    console.log('Extraction Version:', result3.extractionVersion);
    console.log('Parameters:');
    
    result3.parameters.forEach(param => {
      console.log(`  - ${param.displayName}: ${param.value} ${param.unit} [${param.status}]`);
    });
    
    console.log('\n🎯 Verification:');
    console.log('  - Each parameter should have its correct value');
    console.log('  - Total Cholesterol: 180 (not 200 from reference range)');
    console.log('  - Triglycerides: 120 (not 150 from normal range)');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test 4: Verify extractionVersion field
  console.log('\n📋 TEST 4: Extraction Version Field');
  console.log('Expected: All results should have extractionVersion: "V2"\n');
  
  const allResults = await Promise.all([
    smartMedicalExtractorV2(testSamples.commaNumbers),
    smartMedicalExtractorV2(testSamples.largeNumbers),
    smartMedicalExtractorV2(testSamples.windowRestriction)
  ]);
  
  console.log('✅ RESULT:');
  allResults.forEach((result, index) => {
    console.log(`  Test ${index + 1}: extractionVersion = "${result.extractionVersion}" ${result.extractionVersion === 'V2' ? '✓' : '✗'}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ All tests completed!\n');
}

// Run tests
runTests().catch(console.error);
