/**
 * Test Smart Medical Extractor
 * 
 * Verifies the proximity-based extraction with various report formats
 */

const smartMedicalExtractor = require('./services/smartMedicalExtractor');

console.log('🧪 TESTING SMART MEDICAL EXTRACTOR\n');
console.log('='.repeat(70));

// Test 1: CBC Report (Mixed Format)
const cbcText = `
CRYSTAL DATA INC.
COMPLETE BLOOD COUNT (CBC) REPORT

Patient Name: John Doe
Age: 45 years
Date: 15/02/2026
Lab No: 12345

TEST RESULTS:

Hemoglobin: 18 g/dL
RBC Count: 6 million/µL
WBC Count: 8500 cells/µL
Platelet Count: 150000 cells/µL
Hematocrit: 45 %
MCV (Mean Corpuscular Volume): 72 fL
MCH (Mean Corpuscular Hemoglobin): 28 pg
MCHC: 32 g/dL

Reference Ranges:
Hemoglobin: 13-17 g/dL
RBC: 4.5-5.5 million/µL
WBC: 4000-11000 cells/µL
Platelets: 150000-450000 cells/µL
`;

console.log('\n📋 TEST 1: CBC Report (Mixed Format)');
console.log('='.repeat(70));
const result1 = smartMedicalExtractor.extract(cbcText);
console.log(`Result: ${result1.success ? 'SUCCESS' : 'FAILED'}`);
console.log(`Parameters Found: ${result1.parameters.length}`);
result1.parameters.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
});

// Test 2: Vertical Format
const verticalText = `
MEDICAL TEST REPORT

Glucose
132 mg/dL

Cholesterol
195 mg/dL

Triglycerides
168 mg/dL

HDL
48 mg/dL

LDL
110 mg/dL
`;

console.log('\n\n📋 TEST 2: Vertical Format Report');
console.log('='.repeat(70));
const result2 = smartMedicalExtractor.extract(verticalText);
console.log(`Result: ${result2.success ? 'SUCCESS' : 'FAILED'}`);
console.log(`Parameters Found: ${result2.parameters.length}`);
result2.parameters.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
});

// Test 3: Horizontal Table Format
const tableText = `
TEST NAME          RESULT       UNIT       REFERENCE
Glucose            110          mg/dL      70-100
HbA1c              6.2          %          <5.7
Insulin            8.5          µIU/mL     2-25
Creatinine         1.1          mg/dL      0.7-1.3
`;

console.log('\n\n📋 TEST 3: Horizontal Table Format');
console.log('='.repeat(70));
const result3 = smartMedicalExtractor.extract(tableText);
console.log(`Result: ${result3.success ? 'SUCCESS' : 'FAILED'}`);
console.log(`Parameters Found: ${result3.parameters.length}`);
result3.parameters.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
});

// Test 4: Broken/Misaligned Format
const brokenText = `
Lab Report - 16/02/2026

Hemoglobin
measured at 15.2
g/dL

WBC 
7200 cells/µL

Platelet
count is 245000
cells/µL
`;

console.log('\n\n📋 TEST 4: Broken/Misaligned Format');
console.log('='.repeat(70));
const result4 = smartMedicalExtractor.extract(brokenText);
console.log(`Result: ${result4.success ? 'SUCCESS' : 'FAILED'}`);
console.log(`Parameters Found: ${result4.parameters.length}`);
result4.parameters.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
});

// Summary
console.log('\n\n' + '='.repeat(70));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(70));
console.log(`Test 1 (CBC): ${result1.parameters.length} parameters`);
console.log(`Test 2 (Vertical): ${result2.parameters.length} parameters`);
console.log(`Test 3 (Table): ${result3.parameters.length} parameters`);
console.log(`Test 4 (Broken): ${result4.parameters.length} parameters`);
console.log('\n✅ All tests completed!\n');
