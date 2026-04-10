/**
 * Test Blood Glucose Extraction
 * 
 * Test the improved smartMedicalExtractor with actual blood glucose report OCR text
 */

const smartMedicalExtractor = require('./services/smartMedicalExtractor');

// Actual OCR text from the blood glucose report
const ocrText = `HYDERABAD
DIAGNOSTICS
Patient Name : P. VENKATESWARLU
Age / Gender : 60 years / Male
Mobile No.:
Source : DIRECT
Test Description
Glucose Fasting (Plasma)
Interpretation :
Glucose PP (Plasma)
Interpretation :
Hyderabad Diagnostics
Value(s)
124
sSR LANDMARK, Rd Number 4, Alkapur Townshp.
Manikonda Jagir, Telangana 50o0B9.
+91 996 661 1717
Scan to Validate
A postprandial glucose reading of 141-199 mgidl indicates prediabetes.
A postprandial reading over 200 mgidl indicates diabetes.
Blood Glucose Level (Fasting & Post Prandial )
Fasting Blood Sugar more than 126 mg/dl on more than one occasion can indicate Diabetes Mellitus.
174
Reference Range
60- 110
hyder abaddiagnostics@gmal.com
Referral : SELF
90-140
*"END OF REPORT*
Collection Time : May 07, 2023, 11:52 a.m.
Reporting Time : May 07, 2023, 07:11 p.m.
Sample ID
LAB REPORT
www.hyderabaddiagnostics.com
Unit(s)
mgidl
mg'dl
FREE HOME
SAMPLE COLLECTION`;

console.log('🧪 Testing Blood Glucose Extraction\n');
console.log('Expected Results:');
console.log('  - Glucose Fasting: 124 mg/dL (Reference: 60-110)');
console.log('  - Glucose PP: 174 mg/dL (Reference: 90-140)');
console.log('\n' + '='.repeat(70) + '\n');

// Check if structured report is detected
console.log('🔍 Checking for structured format...');
const hasTestColumn = /(TEST|Test\s+Description)/i.test(ocrText);
const hasResultColumn = /(RESULT|Value\s*\(\s*s\s*\))/i.test(ocrText);
const hasUnitsColumn = /(UNITS?|Unit\s*\(\s*s\s*\))/i.test(ocrText);
console.log(`  Test Column: ${hasTestColumn ? '✅' : '❌'}`);
console.log(`  Result Column: ${hasResultColumn ? '✅' : '❌'}`);
console.log(`  Units Column: ${hasUnitsColumn ? '✅' : '❌'}`);
console.log(`  Structured Report: ${hasTestColumn && hasResultColumn && hasUnitsColumn ? '✅ YES' : '❌ NO'}`);
console.log('');

// Run extraction
const result = smartMedicalExtractor.extract(ocrText);

console.log('\n' + '='.repeat(70));
console.log('📊 EXTRACTION RESULTS');
console.log('='.repeat(70));

if (result.success) {
  console.log(`✅ Success: ${result.parameters.length} parameters extracted\n`);
  
  result.parameters.forEach((param, index) => {
    console.log(`${index + 1}. ${param.parameter}`);
    console.log(`   Value: ${param.value} ${param.unit}`);
    if (param.confidence !== undefined) {
      console.log(`   Confidence: ${param.confidence}`);
    }
    console.log('');
  });
  
  // Check if we got the expected parameters
  const hasFasting = result.parameters.some(p => 
    /glucose.*fasting|fasting.*glucose/i.test(p.parameter)
  );
  const hasPP = result.parameters.some(p => 
    /glucose.*pp|pp.*glucose|post.*prandial/i.test(p.parameter)
  );
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ VALIDATION');
  console.log('='.repeat(70));
  console.log(`Fasting Glucose Found: ${hasFasting ? '✅ YES' : '❌ NO'}`);
  console.log(`Post Prandial (PP) Glucose Found: ${hasPP ? '✅ YES' : '❌ NO'}`);
  
  if (!hasFasting || !hasPP) {
    console.log('\n⚠️ WARNING: Not all expected parameters were found!');
  }
} else {
  console.log(`❌ Extraction failed: ${result.message}`);
}
