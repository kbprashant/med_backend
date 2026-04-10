/**
 * Test with manually corrected OCR text that includes the actual values
 * Based on the image provided
 */

const reportProcessingService = require('./services/reportProcessingService');

// OCR text with manually added values from the image
const correctedCBCOcrText = `Dr Lal PathLabs
L44-LPL YAMUNA NAGAR
67 A/L Model Town Yamuna Nagar
Phone: 01722-220084,85
YAMUNA NAGAR

Name: Mr. SURINDER VERMA
Lab No.: 272960218
Age: 47 Years
Gender: Male
A/c Status: P
Ref By: SELF
Collected: 29-Oct-2019 12:37 PM
Received: 29-Oct-2019 12:37 PM
Reported: 28-Oct-2019 02:16 PM
Report Status: Final

Test Name                                Results     Units           Bio. Ref. Interval

COMPLETE BLOOD COUNT (CBC)
(Electrical Impedence, Photometric)

Hemoglobin                               14.30       g/dL            13.00 - 17.00
(Photometry)

Packed Cell Volume (PCV)                 40.80       %               40.00 - 50.00
(Calculated)

RBC Count                                4.41        mill/mm3        4.50 - 5.50
(Electrical Impendence)

MCV                                      92.00       fL              80.00 - 100.00
(Electrical Impendence)

MCH                                      32.50       pg              27.00 - 32.00
(Calculated)

MCHC                                     35.10       g/dL            32.00 - 35.00
(Calculated)

Red Cell Distribution Width (RDW)        13.50       %               11.50 - 14.50
(Electrical Impendence)

Total Leukocyte Count (TLC)              2.30        thou/mm3        4.00 - 10.00
(Electrical Impendence)

Differential Leucocyte Count (DLC)(VCS Technology)
Segmented Neutrophils                    40.90       %               40.00 - 80.00
Lymphocytes                              52.40       %               20.00 - 40.00
Monocytes                                5.30        %               2.00 - 10.00
Eosinophils                              0.70        %               1.00 - 6.00
Basophils                                0.70        %               < 2.00

Absolute Leucocyte Count (Calculated)
Neutrophils                              0.94        thou/mm3        2.00 - 7.00
Lymphocytes                              1.21        thou/mm3        1.00 - 3.00
Monocytes                                0.12        thou/mm3        0.20 - 1.00
Eosinophils                              0.02        thou/mm3        0.02 - 0.50
Basophils                                0.02        thou/mm3        0.01 - 0.10

Platelet Count                           77.0        thou/mm3        150.00 - 450.00
(Electrical Impendence)

Platelets cross checked manually.
MPV (Mean Platelet Volume)               10.00       fL              6.50 - 12.00
(Electrical Impedence)`;

async function testCorrectedOCR() {
  try {
    console.log('='.repeat(70));
    console.log('🧪 TESTING WITH CORRECTED OCR TEXT (Values Included)');
    console.log('='.repeat(70));
    console.log(`\n🔬 Extraction Mode: ${process.env.EXTRACTION_MODE || 'V1 (default)'}`);
    console.log(`📋 OCR Text Length: ${correctedCBCOcrText.length} characters\n`);

    const result = await reportProcessingService.runSmartExtraction(correctedCBCOcrText);

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

      // Find Basophils
      const basophilsDLC = result.parameters.find(p => {
        const name = (p.parameter || p.displayName).toLowerCase();
        return name.includes('basophil') && !name.includes('absolute');
      });

      const basophilsAbsolute = result.parameters.find(p => {
        const name = (p.parameter || p.displayName).toLowerCase();
        return name.includes('basophil') && name.includes('absolute');
      });

      console.log('\n🔬 BASOPHILS VERIFICATION:');
      console.log('-'.repeat(70));
      if (basophilsDLC) {
        console.log(`Basophils (DLC): ${basophilsDLC.value} ${basophilsDLC.unit} [${basophilsDLC.status}]`);
        console.log(`   Expected: 0.70% (from image)`);
        console.log(`   Got: ${basophilsDLC.value}${basophilsDLC.unit}`);
        console.log(`   Match: ${basophilsDLC.value == 0.70 || basophilsDLC.value == 0.7 ? '✅ YES' : '❌ NO'}`);
      }
      if (basophilsAbsolute) {
        console.log(`\nBasophils (Absolute): ${basophilsAbsolute.value} ${basophilsAbsolute.unit} [${basophilsAbsolute.status}]`);
        console.log(`   Expected: 0.02 thou/mm3 (from image)`);
        console.log(`   Got: ${basophilsAbsolute.value} ${basophilsAbsolute.unit}`);
        console.log(`   Match: ${basophilsAbsolute.value == 0.02 ? '✅ YES' : '❌ NO'}`);
      }
      console.log('-'.repeat(70));
    } else {
      console.log('❌ NO PARAMETERS EXTRACTED!');
    }

    console.log('\n✅ Test completed!\n');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

console.log('\n🚀 Starting Corrected OCR Test...\n');
testCorrectedOCR()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
