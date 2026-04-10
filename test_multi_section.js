const { extractMultipleReports } = require('./services/strictExtractionService');

const testOCR = `Visit Number: 23618502691 Registered 12-04-2018 10:36:06
Patient Name: Collected 12-04-2018 10:36:19
Age / Sex: Year / Male 34 Authenticated 12-04-2018 13:01:16
TEST NAME RESULT PREVIOUS UNIT BIOLOGICAL
RESULT REFERENCE INTERVALS
Liver Function Tests
SGPT (ALT) 14 U/L 0-41
SGOT (AST) 16 U/L 0-40
Lipid Profile
Serum Total Cholesterol 152 mg/dL Normal: Up to 200
Serum Triglycerides 100 mg/dL 0-150
HDL Cholesterol 43 mg/dL 40 - 60
LDL Cholesterol 89 mg/dL 0-100
VLDL Cholesterol 20 mg/dL 0-30
Thyroid Function Tests
TT3 L 73 ng/dl 80 - 200
TT4 6.2 ug/dl 5.1-14.1
TSH 0.88 ulU/ml 0.55-4.78
Free T3 2.7 pg/ml 2-44
Free T4 1.3 ng/dl 08-138`;

console.log('🧪 Testing Multi-Section Extraction\n');
console.log('='.repeat(70));

const results = extractMultipleReports(testOCR);

console.log('\n' + '='.repeat(70));
console.log(`\n📊 RESULTS: ${results.length} report section(s) detected\n`);

results.forEach((result, index) => {
  console.log(`Section ${index + 1}:`);
  console.log(`  Type: ${result.reportType}`);
  console.log(`  Parameters: ${result.parameters.length}`);
  result.parameters.forEach(p => {
    console.log(`    - ${p.parameter}: ${p.value} ${p.unit}`);
  });
  console.log('');
});

console.log('='.repeat(70));
