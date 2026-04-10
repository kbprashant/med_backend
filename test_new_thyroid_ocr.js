/**
 * Test script for debugging new thyroid OCR extraction
 */

const smartMedicalExtractor = require('./services/smartMedicalExtractor');

const ocrText = `Name
Lab No.
Ref By
Collected
DrLal PathLabs
Alc Status
Collected at
Ms. ANKITA
390677380
Method
Note
SELF
TRIIODOTHYRONINE (T3 )
20/3/2023 12:26:00PM
Method : CMIA
P
TOTAL THYROXINE (T4)
nuREY NUBSING METERNITY NURSING HOME
TELIPARA ROAD BILASPUR- 495001 Bilaspur
BILASPUR
Method :CMIA
THYROID STIM
2nd
3rd
TIMULATING HORMONE (TSH)
1, TSHI
evels are s
Interpretatlon
PREGNANCY
1st Trimester
Trimester
Trimester
84
8.2
3.0
0.100
0.200`;

console.log('\n' + '='.repeat(70));
console.log('🧪 Testing New Thyroid Report OCR Extraction');
console.log('='.repeat(70));

console.log('\n📄 OCR Text Lines:');
const lines = ocrText.split('\n');
lines.forEach((line, idx) => {
  console.log(`  ${idx.toString().padStart(3, ' ')}: "${line}"`);
});

console.log('\n🔍 Running SmartMedicalExtractor...\n');
const result = smartMedicalExtractor.extract(ocrText);

console.log('\n' + '='.repeat(70));
console.log('📊 EXTRACTION RESULT');
console.log('='.repeat(70));
console.log(`Success: ${result.success}`);
console.log(`Parameters Found: ${result.parameters ? result.parameters.length : 0}`);
console.log(`Message: ${result.message || 'N/A'}`);

if (result.parameters && result.parameters.length > 0) {
  console.log('\n✅ Extracted Parameters:');
  result.parameters.forEach((param, idx) => {
    console.log(`\n  ${idx + 1}. ${param.parameter}`);
    console.log(`     Value: ${param.value} ${param.unit || ''}`);
    console.log(`     Range: ${param.normalMin || 'N/A'} - ${param.normalMax || 'N/A'}`);
    console.log(`     Status: ${param.status || 'N/A'}`);
  });
} else {
  console.log('\n❌ No parameters extracted');
}

console.log('\n' + '='.repeat(70));
