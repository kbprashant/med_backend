/**
 * Test script for Smart Medical Extractor V2
 * 
 * Demonstrates the production-ready V2 extractor with different report types
 */

const smartMedicalExtractorV2 = require('./services/smartMedicalExtractorV2');

// Sample OCR text samples for different report types
const sampleReports = {
  thyroid: `
    THYROID PROFILE TEST REPORT
    Patient Name: John Doe
    Date: 23-02-2026
    
    T3 (Triiodothyronine): 1.2 ng/mL
    T4 (Thyroxine): 8.5 µg/dL
    TSH: 2.5 mIU/L
  `,
  
  lipid: `
    LIPID PROFILE
    Patient: Jane Smith
    Date: 23-02-2026
    
    Total Cholesterol: 180 mg/dL
    Triglycerides: 120 mg/dL
    HDL Cholesterol: 55 mg/dL
    LDL Cholesterol: 100 mg/dL
    VLDL Cholesterol: 25 mg/dL
  `,
  
  glucose: `
    BLOOD GLUCOSE TEST
    Patient: Bob Johnson
    Date: 23-02-2026
    
    Fasting Blood Glucose: 95 mg/dL
    HbA1c: 5.6 %
  `,
  
  cbc: `
    COMPLETE BLOOD COUNT (CBC)
    Patient: Alice Brown
    Date: 23-02-2026
    
    Hemoglobin: 13.5 g/dL
    RBC Count: 4.5 mill/mm3
    WBC Count: 7500 cells/µL
    Platelet Count: 250000 cells/µL
  `
};

async function testExtractor() {
  console.log('🧪 Testing Smart Medical Extractor V2\n');
  console.log('='.repeat(80));
  
  for (const [reportName, ocrText] of Object.entries(sampleReports)) {
    console.log(`\n📋 Testing ${reportName.toUpperCase()} report...\n`);
    
    try {
      const result = await smartMedicalExtractorV2(ocrText);
      
      console.log('\n📊 EXTRACTION RESULT:');
      console.log('Report Type:', result.reportType);
      console.log('Parameters Extracted:', result.parameters.length);
      console.log('Average Confidence:', result.averageConfidence.toFixed(2));
      console.log('\nParameters:');
      
      result.parameters.forEach(param => {
        console.log(`  - ${param.displayName}: ${param.value} ${param.unit} [${param.status}]`);
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ All tests completed!\n');
}

// Run tests
testExtractor().catch(console.error);
