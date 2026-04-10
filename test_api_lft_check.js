/**
 * Test LFT API endpoint extraction logic
 */

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

// Simulate the extraction without API call
const reportProcessingService = require('./services/reportProcessingService');

async function testLFTAPI() {
  console.log('\n🧪 TESTING LFT API EXTRACTION LOGIC (Without HTTP Call)\n');
  console.log('='.repeat(80));
  
  // Step 1: Smart Extraction (same as API)
  console.log('\n📊 Step 1: Smart Extraction...');
  const smartExtractionResult = await reportProcessingService.runSmartExtraction(lftOCR);

  console.log(`\n✅ Smart Extraction Result:`);
  console.log(`   Version Used: ${smartExtractionResult.extractionVersion}`);
  console.log(`   Report Type: ${smartExtractionResult.reportType}`);
  console.log(`   Parameters Found: ${smartExtractionResult.parameters.length}`);
  console.log(`   Average Confidence: ${smartExtractionResult.averageConfidence.toFixed(2)}`);

  console.log('\n📋 Raw parameters before normalization:');
  smartExtractionResult.parameters.forEach((param, i) => {
    console.log(`   ${i + 1}. ${param.parameter || param.displayName}: ${param.value} ${param.unit} (code: ${param.code})`);
  });

  // Step 2: Normalization (same as API)
  console.log('\n📊 Step 2: Normalizing data...');
  const { normalizeExtractedData } = require('./services/normalizer');
  const finalParameters = normalizeExtractedData(smartExtractionResult.parameters);

  console.log(`\n✅ After normalization: ${finalParameters.length} parameters`);
  console.log('\n📋 Final parameters (sent to Flutter):');
  finalParameters.forEach((param, i) => {
    console.log(`   ${i + 1}. ${param.parameter || param.displayName}: ${param.value} ${param.unit} (code: ${param.code})`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   Raw extraction: ${smartExtractionResult.parameters.length} parameters`);
  console.log(`   After normalization: ${finalParameters.length} parameters`);
  
  // Validate specific values
  const ast = finalParameters.find(p => p.code === 'AST');
  const astAltRatio = finalParameters.find(p => p.code === 'AST_ALT_RATIO');
  const alt = finalParameters.find(p => p.code === 'ALT');
  
  console.log('\n🔍 Critical Parameters:');
  if (ast) {
    const astCorrect = Math.abs(ast.value - 16) < 0.01;
    console.log(`   ${astCorrect ? '✅' : '❌'} AST (SGOT): ${ast.value} (expected 16.00)`);
  } else {
    console.log(`   ❌ AST (SGOT): NOT FOUND`);
  }
  
  if (alt) {
    const altCorrect = Math.abs(alt.value - 100.5) < 0.01;
    console.log(`   ${altCorrect ? '✅' : '❌'} ALT (SGPT): ${alt.value} (expected 100.50)`);
  } else {
    console.log(`   ❌ ALT (SGPT): NOT FOUND`);
  }
  
  if (astAltRatio) {
    const ratioCorrect = Math.abs(astAltRatio.value - 0.5) < 0.01;
    console.log(`   ${ratioCorrect ? '✅' : '❌'} AST/ALT Ratio: ${astAltRatio.value} (expected 0.50)`);
  } else {
    console.log(`   ❌ AST/ALT Ratio: NOT FOUND`);
  }
  
  if (smartExtractionResult.parameters.length > finalParameters.length) {
    console.log(`\n⚠️  LOST ${smartExtractionResult.parameters.length - finalParameters.length} PARAMETERS DURING NORMALIZATION!`);
  }
}

testLFTAPI().catch(console.error);
