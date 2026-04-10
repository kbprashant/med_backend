/**
 * Test Lipid Profile extraction with actual OCR from Flutter
 */

const reportProcessingService = require('./services/reportProcessingService');

const lipidOCR = `DRLOGY PATHOLOGY LAB  01234567R9 | 09: 2345678
Accurate | Caring | nstant  drlogypathlab@drlogy.com
1c5 139, SMART VISION COMPLEX, HEALTHCARE RCAD, 02POSITE EALTHCARE COMPLEX. MUMBAI 681578
www.drlogy.com
Yashvi M. Patel Sample Collected At:
Age:21 Years 125, Shiv complex, SG Rcad, Mumbai
Sex T en.ale Sample Collected By: M: Suresh  Regislered an: 32:31 PM 02 Det, 2X
Ref. By: Dr. Hiren Shah  Collecled on: 33:11 PA 02 Dcu, 2X
UHID: 556  Reported on: 34:35 PM J2 Dec, 2X
LIPID PROFILE
Investigation Result Reference Value  Unit
Sampłe Type Serum(2 ml) TAT 1 day (Normal: -3 days)
Chalesteral Total
Speut'upl rely 300.DO High e 200.00  mg/dL
Triglycerides 250.00 High < 150.00  mg/dL
HDL Chalesterol
50.00 Nomal > 40.00  mg/dL
LDL Chalesterot 200.00 Very High  mg dL
L.alc,lal cd
VLDL Chalesteral
50.0D Hig < 30.00  mg/dL
Caloulaled
Non-HDL Cholesterol 250.D0 High < 130,0[)  mg/dL
CalcJlated
NLA- 2014 Total HDL Cholestero LL Trigtycerides
ECOMMENDATI 3slerg Chiesterol (mgdL)
(mg/dL)
Gp: inal :150
onve ptin al
1-179
Bo`;

async function testLipidExtraction() {
  console.log('\n🧪 TESTING LIPID PROFILE EXTRACTION\n');
  console.log('='.repeat(80));
  
  const result = await reportProcessingService.runSmartExtraction(lipidOCR);
  
  console.log(`\n📊 Extraction Results:`);
  console.log(`   Report Type: ${result.reportType}`);
  console.log(`   Parameters Found: ${result.parameters.length}`);
  console.log(`   Confidence: ${result.averageConfidence}\n`);
  
  console.log('📋 Extracted Parameters:');
  console.log('-'.repeat(80));
  
  result.parameters.forEach((param, i) => {
    const name = param.displayName || param.parameter;
    const value = param.value;
    const unit = param.unit || '';
    const code = param.code || 'N/A';
    
    console.log(`${(i + 1).toString().padStart(2)}. ${name.padEnd(30)} ${String(value).padStart(8)} ${unit.padEnd(10)} [${code}]`);
  });
  
  console.log('\n' + '='.repeat(80));
  
  // Expected values from OCR
  const expected = [
    { param: 'Total Cholesterol', value: 300 },
    { param: 'Triglycerides', value: 250 },
    { param: 'HDL Cholesterol', value: 50 },
    { param: 'LDL Cholesterol', value: 200 },
    { param: 'VLDL Cholesterol', value: 50 },
    { param: 'Non-HDL Cholesterol', value: 250 },
  ];
  
  console.log(`\n✅ Expected vs Extracted:`);
  
  let correct = 0;
  let issues = [];
  
  for (const exp of expected) {
    const found = result.parameters.find(p => {
      const name = (p.displayName || p.parameter || '').toLowerCase();
      const expectedName = exp.param.toLowerCase();
      // Exact match only
      return name === expectedName;
    });
    
    if (!found) {
      console.log(`   ❌ ${exp.param}: NOT FOUND (expected ${exp.value})`);
      issues.push(`${exp.param}: NOT FOUND`);
    } else if (Math.abs(parseFloat(found.value) - exp.value) > 0.01) {
      console.log(`   ❌ ${exp.param}: WRONG (got ${found.value}, expected ${exp.value})`);
      issues.push(`${exp.param}: ${found.value} → ${exp.value}`);
    } else {
      console.log(`   ✅ ${exp.param}: ${found.value} mg/dL`);
      correct++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Summary: ${correct}/${expected.length} correct`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️  Issues: ${issues.length}`);
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('\n✅ ALL LIPID PARAMETERS EXTRACTED CORRECTLY!');
  }
}

testLipidExtraction().catch(console.error);
