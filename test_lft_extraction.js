/**
 * Test LFT extraction with actual OCR from Flutter
 */

const reportProcessingService = require('./services/reportProcessingService');

const lftOCR = `DRLOGY PATHOLOGY LAB  0123456789 | 0912345578
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

async function testLFTExtraction() {
  console.log('\n🧪 TESTING LFT EXTRACTION\n');
  console.log('='.repeat(80));
  
  const result = await reportProcessingService.runSmartExtraction(lftOCR);
  
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
    { param: 'AST (SGOT)', value: 16.00 },
    { param: 'ALT (SGPT)', value: 100.50 },  // ❌ Currently extracting as 0
    { param: 'AST:ALT Ratio', value: 0.50 },
    { param: 'GGTP', value: 10.20 },  // ❌ Missing
    { param: 'Alkaline Phosphatase', value: 15.40 },
    { param: 'Bilirubin Total', value: 0.60 },  // ❌ Missing
    { param: 'Bilirubin Direct', value: 0.10 },  // ❌ Missing
    { param: 'Bilirubin Indirect', value: 0.10 },  // ❌ Missing
    { param: 'Total Protein', value: 6.39 },
    { param: 'Albumin', value: 2.00 },
    { param: 'A:G Ratio', value: 0.10 },  // ❌ Missing
  ];
  
  console.log(`\n❌ MISSING/WRONG PARAMETERS:`);
  
  let issues = 0;
  for (const exp of expected) {
    const found = result.parameters.find(p => {
      const name = (p.displayName || p.parameter || '').toLowerCase();
      return name.includes(exp.param.toLowerCase().split(' ')[0]);
    });
    
    if (!found) {
      console.log(`   ❌ ${exp.param}: NOT FOUND (expected ${exp.value})`);
      issues++;
    } else if (Math.abs(parseFloat(found.value) - exp.value) > 0.01) {
      console.log(`   ❌ ${exp.param}: WRONG VALUE (got ${found.value}, expected ${exp.value})`);
      issues++;
    }
  }
  
  if (issues === 0) {
    console.log(`   ✅ All parameters extracted correctly!`);
  } else {
    console.log(`\n📊 Summary: ${result.parameters.length} extracted, ${expected.length} expected, ${issues} issues`);
  }
}

testLFTExtraction().catch(console.error);
