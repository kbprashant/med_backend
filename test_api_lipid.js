/**
 * Test Lipid Profile API endpoint
 */

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

// Simulate the extraction without API call
const reportProcessingService = require('./services/reportProcessingService');

async function testAPILogic() {
  console.log('\n🧪 TESTING API EXTRACTION LOGIC (Without HTTP Call)\n');
  console.log('='.repeat(80));
  
  // Step 1: Smart Extraction (same as API)
  console.log('\n📊 Step 1: Smart Extraction...');
  const smartExtractionResult = await reportProcessingService.runSmartExtraction(lipidOCR);

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
  
  if (smartExtractionResult.parameters.length > finalParameters.length) {
    console.log(`\n⚠️  LOST ${smartExtractionResult.parameters.length - finalParameters.length} PARAMETERS DURING NORMALIZATION!`);
  }
}

testAPILogic().catch(console.error);
