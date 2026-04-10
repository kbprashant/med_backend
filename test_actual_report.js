/**
 * Test with actual user's report OCR text
 */

const smartMedicalExtractor = require('./services/smartMedicalExtractor');

const actualOCRText = `SID NO
REF. BY
PATIENT NAME: Aurora
BIO-CHEMISTRY
TEST
Time
: 01282
Blood sugar(Fasting)
Sys
Blood sugar (Post Prandial)
Dia
.Opp.Govt.Hospital,TNHB, Perumalpattu,Veppampattu-602024
Email : kkclab21@gmail.com | Cell : +91 8939 789 467
:Self
Blood Pressure ( BP)
Pul
KKC LAB
RESULT
138
254
10:35 Am
155
98
85
End of Report.
UNITS
mg/dl
mg/dl
mm of Hg
mm of Hg
GTGyuluur 30,17
Per/mint
Working Hours :7.00 am -8.30 pm
THE GREATTAT WEAL III IS HEALTH
DATE
SEX
AGE
REFERENCE RANGE
70-110
80- 140
Lab Incharge
13-07-2025
Female
56 Yrs
`;

console.log('🧪 TESTING WITH ACTUAL USER REPORT\n');
console.log('='.repeat(70));
console.log('Expected values:');
console.log('  - Blood sugar (Fasting): 138 mg/dl');
console.log('  - Blood sugar (Post Prandial): 254 mg/dl');
console.log('  - Blood Pressure Sys: 155 mm of Hg');
console.log('  - Blood Pressure Dia: 98 mm of Hg');
console.log('  - Blood Pressure Pul: 85 mm of Hg');
console.log('='.repeat(70));

const result = smartMedicalExtractor.extract(actualOCRText);

console.log('\n' + '='.repeat(70));
console.log('📊 EXTRACTION RESULTS');
console.log('='.repeat(70));
console.log(`Success: ${result.success}`);
console.log(`Parameters Found: ${result.parameters.length}\n`);

result.parameters.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
});

console.log('\n✅ Test completed!\n');
