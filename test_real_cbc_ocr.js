/**
 * Test V2 extractor with real OCR text from the uploaded CBC report
 */

const reportProcessingService = require('./services/reportProcessingService');

// Actual OCR text from the app logs
const realCBCOcrText = `DrLal PathLabs
L44-LPL YAMUNA NAGAR
Phone: 01722.990amuna Nagar
YAMUNA NAGAR
Name
Lab No.
Alc Status
Test Name
Hemoglobin
(Photometry)
cOMPLETE BLOOD COUNT (CBC)
|(Electrical Impedence, Photometric)
(Calculated)
Packed Cell Volume (PCV)
RBC Count
MCV
(Electrical Impendence)
MCH
(Electrical Impendence)
(Calculated)
MCHC
(Caiculated)
(Electrical Impendence)
Red Cell Distribution Width (RDw)
Total Leukocyte Count (TLC)
(Electrical Impendence)
Lymphocytes
Mr. SURINDER VERMA
Segmented Neutrophils
Monocytes
272960218
Eosinophils
Basophils
Neutrophils
Lymphocytes
Monocytes
Absolute Leucocyte Count (Calculated)
Eosinophils
Basophils
Platelet Count
Age
(Electrical Impendence)
Ref By
Ditferential Leucocyte Count (DLC)(VCS Technology)
MPV (Mean Platelet Volume)
Page 1 of 2
Platelets cross checked manually.
(Electrical Impedence)
If test results are alarming or unexpected,
Regd. Oftice/Nationat Reference Lab: Dr La Pachcabs Ltd., Biock E, Sect`;

async function testRealOCR() {
  try {
    console.log('='.repeat(70));
    console.log('🧪 TESTING REAL OCR TEXT FROM CBC REPORT');
    console.log('='.repeat(70));
    console.log(`\n🔬 Extraction Mode: ${process.env.EXTRACTION_MODE || 'V1 (default)'}`);
    console.log(`📋 OCR Text Length: ${realCBCOcrText.length} characters\n`);

    // Run extraction
    const result = await reportProcessingService.runSmartExtraction(realCBCOcrText);

    console.log('\n✅ Extraction completed!');
    console.log(`   Report Type: ${result.reportType}`);
    console.log(`   Extraction Version: ${result.extractionVersion}`);
    console.log(`   Parameters Found: ${result.parameters.length}`);
    console.log(`   Average Confidence: ${result.averageConfidence.toFixed(2)}\n`);

    if (result.parameters.length > 0) {
      console.log('📊 Extracted Parameters:');
      console.log('-'.repeat(70));
      result.parameters.forEach((param, index) => {
        const name = param.parameter || param.displayName;
        const conf = param.confidence ? ` (conf: ${param.confidence.toFixed(2)})` : '';
        console.log(`${index + 1}. ${name}: ${param.value} ${param.unit} [${param.status || 'N/A'}]${conf}`);
      });
      console.log('-'.repeat(70));
    } else {
      console.log('❌ NO PARAMETERS EXTRACTED!');
      console.log('\n🔍 Diagnostic Info:');
      console.log('   OCR Text Preview:');
      console.log('   ' + '-'.repeat(68));
      console.log('   ' + realCBCOcrText.substring(0, 500));
      console.log('   ...');
      console.log('   ' + '-'.repeat(68));
    }

    console.log('\n✅ Test completed!\n');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
console.log('\n🚀 Starting Real OCR Test...\n');
testRealOCR()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
