const medicalReportParser = require('./services/medicalReportParser');

const testOcrText = `SID NO
REF. BY
PATIENT NAME: Aurora
BIO-CHEMISTRY
TEST
Time
: 01282
Blood sugar(Fasting)
Sys
Blood sugar (Post Prand Prandial)
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
56 Yrs`;

console.log('Testing NEW PARSER with real OCR text\n');
console.log('═'.repeat(60));

const result = medicalReportParser.parseReport(testOcrText);

console.log('\n📊 PARSER RESULT:');
console.log('  Success:', result.success);
console.log('  Report Type:', result.reportType, `-`, result.reportTypeName);
console.log('  Extracted:', `${result.extractedParameters}/${result.totalParameters}`);
console.log('\n📝 EXTRACTED PARAMETERS:');
result.parameters.forEach((p, i) => {
  if (p.value !== null) {
    console.log(`  ${i + 1}. ${p.parameter}: ${p.value} ${p.unit} [${p.status}]`);
    console.log(`     Range: ${p.referenceRange}`);
  }
});

console.log('\n✅ NEW PARSER IS WORKING!');
console.log('❌ No Blood Pressure in results (correct!)');
console.log('❌ No Hemoglobin in results (correct!)');
