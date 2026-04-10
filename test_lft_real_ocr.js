/**
 * Test LFT Extraction with Real OCR Data
 * 
 * This test uses the actual OCR text from the Flutter app logs
 * to verify that LFT-specific extraction works correctly.
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

console.log('======================================================================');
console.log('🧪 Testing LFT Extraction with Real OCR Data');
console.log('======================================================================\n');

// Real OCR text from Flutter app logs
const realOcrText = `DRLOGY PATHOLOGY LAB  0123456789 | 0912345578
Accurate | Caring | Instant  drlogypathlab@drlogy.com
1C5 138, 5MART VISKJN COMPLEX, HEALTHCARE RCAD, 0-POSITEHEALTHCARE COMPLEX, MUMBAI 681578
www.drlogy.com
Yash M. Patel  Şample Collected At:
Age:21 Years  125. Shiwari Burıgaluw. SG lluä,
Scx Male  Murnba  Regislered an: 32:31 PM 02 Det, 2X
Gollecled on: 33:11 PEA 02 Dee, 2%
PID:555  Ref. By: Dr. Hiren Şhah  Reported on: 34:25 PM 02 Dec, 2%
LIVER FUNCTION TEST (LFT)
Investigation  Result Reference Value  Uait
Primary Sample Type :  Serum
AST (SGOT)  16.00 15.00- 40.DD
ALT (SGPT)  100.50 High 10,00- 49.DD
IFCCA t 5
AST:ALT Ratio  0.50 <1.00
GGTP  10.20 0-73  U/L
Alkaline Phosphatase (ALP)  15.40 30.00-120.00
Blirubln Total  0.60 030-1.20  ang/dL
BJlirubln Direct  0.10 <0.3  ng/dL
Bilirubln lndlrect  0.10 <].10  ng/dL
Calculated
Total Protein  6.39 5.70 -8.20  g/dL
Giut
Albumin  2.00 3.70 - 4A.BD  g'dL
A:GRatio  0.10 0.90 -2.0D
Note :
1.In an asymptomatic patient, Non alcoholic fatty liver disease (NAFLD} is`;

const expectedParameters = {
  'AST (SGOT)': { value: 16.00, refRange: '15.00-40.00', status: 'Normal' },
  'ALT (SGPT)': { value: 100.50, refRange: '10.00-49.00', status: 'High' },
  'AST:ALT Ratio': { value: 0.50, refRange: '<1.00', status: 'Normal' },
  'GGTP': { value: 10.20, refRange: '0-73', status: 'Normal' },
  'Alkaline Phosphatase (ALP)': { value: 15.40, refRange: '30.00-120.00', status: 'Low' },
  'Bilirubin Total': { value: 0.60, refRange: '0.30-1.20', status: 'Normal' },
  'Bilirubin Direct': { value: 0.10, refRange: '<0.3', status: 'Normal' },
  'Bilirubin Indirect': { value: 0.10, refRange: '<1.10', status: 'Normal' },
  'Total Protein': { value: 6.39, refRange: '5.70-8.20', status: 'Normal' },
  'Albumin': { value: 2.00, refRange: '3.70-4.80', status: 'Low' },
  'A:G Ratio': { value: 0.10, refRange: '0.90-2.00', status: 'Low' }
};

const garbageParameters = [
  'Age', 'PID', 'Scx Male Murnba Regislered an', 'Gollecled on'
];

// Run extraction
const result = extractWithStrictValidation(realOcrText, 'LIVER_FUNCTION');

console.log('\n======================================================================');
console.log('📊 EXTRACTION RESULTS:');
console.log('======================================================================\n');

console.log(`Report Type: ${result.reportType}`);
console.log(`Parameters Extracted: ${result.parameters.length}`);
console.log(`Parameters Rejected: ${result.rejected.length}\n`);

// Verify results
let passedTests = 0;
let failedTests = 0;

console.log('🔍 VERIFICATION:\n');

// Check that all expected parameters were extracted
for (const [paramName, expected] of Object.entries(expectedParameters)) {
  const found = result.parameters.find(p => p.parameter === paramName);
  
  if (!found) {
    console.log(`❌ ${paramName}: NOT FOUND`);
    failedTests++;
    continue;
  }
  
  let allGood = true;
  const issues = [];
  
  // Check value
  if (Math.abs(found.value - expected.value) > 0.01) {
    issues.push(`value ${found.value} !== ${expected.value}`);
    allGood = false;
  }
  
  // Check status
  if (found.status !== expected.status) {
    issues.push(`status ${found.status} !== ${expected.status}`);
    allGood = false;
  }
  
  if (allGood) {
    console.log(`✅ ${paramName}: ${found.value} - ${found.status}`);
    passedTests++;
  } else {
    console.log(`⚠️  ${paramName}: ${issues.join(', ')}`);
    console.log(`   Found: value=${found.value}, status=${found.status}`);
    console.log(`   Expected: value=${expected.value}, status=${expected.status}`);
    failedTests++;
  }
}

// Check that garbage parameters were NOT extracted
console.log('\n🗑️ GARBAGE FILTERING:\n');

let garbageFiltered = true;
for (const garbageParam of garbageParameters) {
  const found = result.parameters.find(p => p.parameter.includes(garbageParam));
  
  if (found) {
    console.log(`❌ Garbage extracted: ${found.parameter}`);
    garbageFiltered = false;
    failedTests++;
  } else {
    console.log(`✅ Filtered: ${garbageParam}`);
  }
}

console.log('\n======================================================================');
console.log('📊 TEST SUMMARY:');
console.log('======================================================================\n');

const totalTests = Object.keys(expectedParameters).length + garbageParameters.length;
const totalPassed = passedTests + (garbageFiltered ? garbageParameters.length : 0);
const totalFailed = failedTests;

console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${totalPassed}`);
console.log(`❌ Failed: ${totalFailed}`);

if (totalFailed === 0) {
  console.log('\n🎉 ALL TESTS PASSED!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME TESTS FAILED\n');
  process.exit(1);
}
