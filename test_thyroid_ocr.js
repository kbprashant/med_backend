/**
 * Test Thyroid Report OCR Extraction
 */

const smartExtractor = require('./services/smartMedicalExtractor');

const ocrText = `Sex : Male
Yash M. Patel
Age: 21 Years
PID:555
DRLOGY PATHOLOGY LAB
Investigation
CLI
T3, TOTAL, SERUM
rSH
105 -108, SMART VISION COMPLEX, HEALTHCARE ROAD, OPPOSITE HEALTHCARE COMPLEX. MUMBAI -689578
T4, TOTAL, SERUM
CLIE
Accurate | Caring | Instant
Note
Thanks for Reference
Sample Collected At:
125, Shivam Bungalow, S G Road,
Mumbai
THYROID PROFILE, TOTAL
13.60
Medical Lab Technician
(DMLT, BMLT)
Ref. By: Dr. Hiren Shah
Result
10.10
217.40
High
High
Hiah
80.00 - 200.00
***End of Report****
Reference Value
4.50 -12.50
Dr. Payal Shah
L0123456789 | 0912345678
drlogypathlab@drlogy.com
0,40- 4.00
(MD, Pathologist)
Registered on: 02:31 PM 02 Dec. 2X
Collected on: 03:11 PM 02 Dec, 2X
Reported on: 04:35 PM 02 Dec, 2X
1. TSH levels are subject to circadian variation, reaching peak levels between 2 4.a.m. and at a minimum between
6-10 pm. The variation is of the order of 50%. hence time of the day has influence on the measured serum TSH
concentra`;

console.log('='.repeat(80));
console.log('🧪 TESTING THYROID REPORT EXTRACTION');
console.log('='.repeat(80));
console.log('\n📄 OCR Text:');
console.log(ocrText);
console.log('\n' + '='.repeat(80));

const result = smartExtractor.extract(ocrText);

console.log('\n' + '='.repeat(80));
console.log('📊 EXTRACTION RESULTS');
console.log('='.repeat(80));
console.log(`✅ Success: ${result.success}`);
console.log(`📋 Parameters Found: ${result.parameters ? result.parameters.length : 0}`);

if (result.parameters && result.parameters.length > 0) {
  console.log('\n📝 Extracted Parameters:');
  result.parameters.forEach((param, idx) => {
    console.log(`   ${idx + 1}. ${param.parameter}: ${param.value} ${param.unit || ''}`);
  });
} else {
  console.log(`\n❌ ${result.message || 'No parameters extracted'}`);
}

console.log('\n' + '='.repeat(80));
