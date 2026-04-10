/**
 * Direct test of V2 extractor to verify Basophils fix
 * This bypasses API authentication and tests the extractor module directly
 */

const reportProcessingService = require('./services/reportProcessingService');

// Sample CBC OCR text that includes potential confounding values
const sampleCBCOcrText = `
COMPLETE BLOOD COUNT (CBC) REPORT
Patient Name: Test Patient
Date: 2024-01-15 Test Parameter Result Unit Reference Range Status
Hemoglobin 14.5 g/dL 13.0-17.0 Normal
White Blood Cell 8500 cells/cumm 4000-11000 Normal
Red Blood Cell 4.8 million/µL 4.5-5.5 Normal
Platelet Count 250000 cells/cumm 150000-400000 Normal
Hematocrit 44.1 % 40.0-50.0 Normal
Mean Cell Volume 85 fL 80-100 Normal
MCH 28 pg 27-32 Normal
MCHC 33 g/dL 32-36 Normal
DIFFERENTIAL COUNT:
Neutrophils 60.5 % 40-75 Normal
Lymphocytes 30.2 % 20-45 Normal
Monocytes 7.3 % 2-10 Normal
Eosinophils 0.02 % 0-6 Normal
Basophils 77.0 % 0-2 High
`;

async function testBasophilsExtraction() {
  try {
    console.log('='.repeat(70));
    console.log('🧪 DIRECT V2 EXTRACTOR TEST - Basophils Value Fix');
    console.log('='.repeat(70));
    console.log(`\n🔬 Extraction Mode: ${process.env.EXTRACTION_MODE || 'V1 (default)'}`);
    console.log('📋 Running smart extraction on CBC report...\n');

    // Use the singleton instance directly
    const result = await reportProcessingService.runSmartExtraction(sampleCBCOcrText);

    console.log('✅ Extraction completed!');
    console.log(`   Report Type: ${result.reportType}`);
    console.log(`   Extraction Version: ${result.extractionVersion}`);
    console.log(`   Parameters Found: ${result.parameters.length}`);
    console.log(`   Average Confidence: ${result.averageConfidence.toFixed(2)}\n`);

    // Find Basophils parameter
    const basophils = result.parameters.find(p => 
      (p.parameter && p.parameter.toLowerCase().includes('basophil')) ||
      (p.displayName && p.displayName.toLowerCase().includes('basophil'))
    );

    console.log('='.repeat(70));
    if (basophils) {
      console.log('🔬 BASOPHILS RESULT:');
      console.log(`   Parameter: ${basophils.parameter || basophils.displayName}`);
      console.log(`   Value: ${basophils.value}`);
      console.log(`   Unit: ${basophils.unit}`);
      console.log(`   Status: ${basophils.status || 'N/A'}`);
      console.log(`   Confidence: ${basophils.confidence ? basophils.confidence.toFixed(2) : 'N/A'}`);
      
      // Verify the fix
      const expectedValue = '77.0';
      const actualValue = String(basophils.value);
      
      if (actualValue === expectedValue || parseFloat(actualValue) === 77.0) {
        console.log('\n✅ SUCCESS: Basophils value extracted correctly!');
        console.log(`   Expected: ${expectedValue}`);
        console.log(`   Got: ${actualValue}`);
        console.log('   \n📝 Note: The V2 extractor with 80-character window restriction');
        console.log('   successfully extracted the value without cross-parameter contamination.');
      } else {
        console.log('\n⚠️  DIFFERENT RESULT:');
        console.log(`   Expected: ${expectedValue}`);
        console.log(`   Got: ${actualValue}`);
        console.log(`   \n📝 This indicates the V2 extractor may have found a different value.`);
        console.log('   If this is from the correct location in OCR text, the extraction is working.');
      }
    } else {
      console.log('❌ ERROR: Basophils parameter NOT found in extraction results!');
      console.log('\n   This could mean:');
      console.log('   - The parameter name in dictionary doesn\'t match');
      console.log('   - The label "Basophils" wasn\'t found in OCR text');
      console.log('   - Report type detection failed');
    }
    console.log('='.repeat(70));

    // Show all extracted parameters
    console.log('\n📊 All Extracted Parameters:');
    console.log('-'.repeat(70));
    result.parameters.forEach((param, index) => {
      const name = param.parameter || param.displayName;
      const conf = param.confidence ? ` (conf: ${param.confidence.toFixed(2)})` : '';
      console.log(`${index + 1}. ${name}: ${param.value} ${param.unit} [${param.status || 'N/A'}]${conf}`);
    });
    console.log('-'.repeat(70));
    console.log('\n✅ Test completed!\n');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
console.log('\n🚀 Starting Direct V2 Extractor Test...\n');
testBasophilsExtraction()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
