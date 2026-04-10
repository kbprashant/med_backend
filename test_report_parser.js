/**
 * Test Report Parser API
 * 
 * Tests the new category-based parameter extraction system
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/reports';

// Sample OCR text from a blood test report
const sampleBloodReport = `
COMPLETE BLOOD COUNT (CBC) REPORT

Patient Name: John Doe
Date: 2024-02-15

TEST RESULTS:

Hemoglobin: 14.5 g/dl
WBC: 7500 cells/cumm
RBC: 5.2 million/cumm
Platelet: 250000 cells/cumm
Hematocrit: 42 %
MCV: 85 fl
MCH: 28 pg
MCHC: 33 g/dl
Neutrophils: 60 %
Lymphocytes: 30 %
Monocytes: 5 %
Eosinophils: 3 %
Basophils: 2 %
ESR: 12 mm/hr
`;

// Sample OCR text from a lipid profile report
const sampleLipidReport = `
LIPID PROFILE

Patient: Jane Smith
Test Date: 2024-02-15

Results:
Total Cholesterol: 210 mg/dl
HDL Cholesterol: 45 mg/dl
LDL Cholesterol: 135 mg/dl
Triglycerides: 150 mg/dl
VLDL: 30 mg/dl
Cholesterol/HDL Ratio: 4.7
`;

// Sample OCR text from a thyroid test report
const sampleThyroidReport = `
THYROID FUNCTION TEST

Patient Details:
Name: Robert Johnson
Date: 2024-02-15

Test Parameters:
TSH: 2.5 uIU/ml
T3: 120 ng/dl
T4: 8.5 ug/dl
Free T3: 3.2 pg/ml
Free T4: 1.4 ng/dl
`;

async function testParseReport(category, ocrText, testName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testName}`);
  console.log(`Category: ${category}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    // Since we need authentication, we'll just test with a mock token
    // In production, you'd get this from login
    const response = await axios.post(
      `${BASE_URL}/parse`,
      {
        category: category,
        ocrText: ocrText
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Note: This will fail without a valid token
          // For testing without auth, temporarily remove authenticate middleware
          'Authorization': 'Bearer test-token'
        },
        validateStatus: () => true // Accept any status code
      }
    );
    
    console.log(`\nStatus: ${response.status}`);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.extractedResults) {
      console.log(`\n✅ Successfully extracted ${response.data.extractedResults.length} parameters:`);
      response.data.extractedResults.forEach(param => {
        console.log(`   • ${param.parameter}: ${param.value}${param.unit ? ' ' + param.unit : ''}`);
      });
    } else {
      console.log(`\n⚠️ ${response.data.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

async function testGetCategories() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Testing: Get Available Categories');
  console.log(`${'='.repeat(60)}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/categories`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      validateStatus: () => true
    });
    
    console.log(`\nStatus: ${response.status}`);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testHealthCheck() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Testing: Health Check');
  console.log(`${'='.repeat(60)}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    
    console.log(`\nStatus: ${response.status}`);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testInvalidCategory() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Testing: Invalid Category');
  console.log(`${'='.repeat(60)}`);
  
  try {
    const response = await axios.post(
      `${BASE_URL}/parse`,
      {
        category: 'invalid_category',
        ocrText: 'Some text'
      },
      {
        headers: {
          'Authorization': 'Bearer test-token'
        },
        validateStatus: () => true
      }
    );
    
    console.log(`\nStatus: ${response.status}`);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runAllTests() {
  console.log('\n🧪 TESTING REPORT PARSER API');
  console.log('================================\n');
  
  // Test health check (no auth required)
  await testHealthCheck();
  
  // Test get categories
  await testGetCategories();
  
  // Test blood report
  await testParseReport('blood', sampleBloodReport, 'Blood Test (CBC)');
  
  // Test lipid report
  await testParseReport('lipid', sampleLipidReport, 'Lipid Profile');
  
  // Test thyroid report
  await testParseReport('thyroid', sampleThyroidReport, 'Thyroid Function Test');
  
  // Test invalid category
  await testInvalidCategory();
  
  console.log('\n\n✅ All tests completed!');
  console.log('\nNOTE: Tests with authentication will fail without a valid token.');
  console.log('To test fully, either:');
  console.log('  1. Login and get a valid JWT token');
  console.log('  2. Temporarily remove authenticate middleware for testing');
}

// Run tests
runAllTests().catch(console.error);
