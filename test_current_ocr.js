const medicalReportParser = require('./services/medicalReportParser');

const ocrText = `SID NO
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
Lab Inch`;

console.log('🧪 Testing parser with current OCR text...\n');

const result = medicalReportParser.parseReport(ocrText);

console.log('\n📊 Parser Result:');
console.log(`  Report Type: ${result.reportType} (${result.reportTypeName})`);
console.log(`  Extracted: ${result.extractedParameters}/${result.totalParameters} parameters`);
console.log(`  Success: ${result.success}\n`);

if (result.parameters && result.parameters.length > 0) {
  console.log('✅ Extracted Parameters:');
  result.parameters.forEach((param, index) => {
    console.log(`  ${index + 1}. ${param.name}: ${param.value} ${param.unit}`);
    console.log(`     Status: ${param.status}`);
    console.log(`     Reference: ${param.referenceRange}\n`);
  });
} else {
  console.log('❌ No parameters extracted!');
}
